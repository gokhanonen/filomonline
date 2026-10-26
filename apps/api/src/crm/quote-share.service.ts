import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LeadStatus, Prisma, QuoteOptionType, QuoteStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { StorageService } from "../storage/storage.service";
import { MailService } from "../mail/mail.service";
import { quoteEmail } from "./quote-email";
import { AuthUser } from "../auth/auth.types";
import { resolveOption } from "./quote-calc";
import { QuickQuoteDto, QuoteEmailDto, QuoteRespondDto } from "./dto/quick-quote.dto";

const OPTION_LABEL: Record<QuoteOptionType, string> = {
  CASH: "Peşin",
  LOAN: "Kredili",
  TRADE_IN: "Takaslı",
  INSTALLMENT: "Senetli / Taksitli",
};
const EARLY_STAGES: LeadStatus[] = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.TEST_DRIVE];
const fmtTl = (n: number) => `${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;

/** 256 bit rastgele, URL güvenli (43 karakter) */
const newToken = () => randomBytes(32).toString("base64url");

const quoteInclude = {
  options: { orderBy: { sortOrder: "asc" } },
  lead: { select: { id: true, fullName: true, phone: true, email: true } },
  vehicle: { select: { id: true, plate: true, brandName: true, modelName: true, year: true, listPrice: true, status: true } },
} satisfies Prisma.LeadQuoteInclude;

/**
 * Hızlı teklif + müşteriye özel paylaşım linki.
 * Link kapanır: araç satılınca, teklif süresi dolunca, teklif reddedilince ya da elle iptal edilince.
 */
@Injectable()
export class QuoteShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  /** Müşteriye giden linklerin kökü (web uygulaması) */
  private webOrigin() {
    return (process.env.WEB_URL || process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173").replace(/\/+$/, "");
  }

  private async nextQuoteNumber(companyId: string) {
    const prefix = `TKL-${new Date().getFullYear()}-`;
    const last = await this.prisma.leadQuote.findFirst({
      where: { companyId, quoteNumber: { startsWith: prefix } },
      orderBy: { quoteNumber: "desc" },
      select: { quoteNumber: true },
    });
    const n = last ? Number(last.quoteNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(n + 1).padStart(4, "0")}`;
  }

  async quickQuote(companyId: string, user: AuthUser, dto: QuickQuoteDto) {
    if (!dto.leadId && !dto.newLead) throw new BadRequestException("Potansiyel müşteri seçin ya da yeni ekleyin");
    if (!dto.options.length) throw new BadRequestException("En az bir ödeme seçeneği ekleyin");
    const validUntil = new Date(`${dto.validUntil.slice(0, 10)}T23:59:59`);
    if (validUntil < new Date()) throw new BadRequestException("Geçerlilik tarihi geçmiş olamaz");

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException("Araç bulunamadı");
    if (vehicle.status === "SATILDI") throw new BadRequestException("Satılmış araç için teklif verilemez");

    const userName = (await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }))?.name;
    const listPrice = Number(vehicle.listPrice ?? 0);

    const quote = await this.prisma.$transaction(async (tx) => {
      let leadId = dto.leadId;
      if (leadId) {
        const ok = await tx.lead.count({ where: { id: leadId, companyId } });
        if (!ok) throw new BadRequestException("Geçersiz potansiyel müşteri");
      } else {
        const lead = await tx.lead.create({
          data: {
            companyId,
            fullName: dto.newLead!.fullName.trim(),
            phone: dto.newLead!.phone?.trim() || null,
            email: dto.newLead!.email?.trim() || null,
            source: "WALK_IN",
            assignedUserId: user.id,
          },
        });
        leadId = lead.id;
      }
      // Araç, potansiyelin ilgilendiği araçlara eklenir
      const linked = await tx.leadInterestedVehicle.count({ where: { leadId, vehicleId: vehicle.id } });
      if (!linked) await tx.leadInterestedVehicle.create({ data: { leadId, vehicleId: vehicle.id } });

      const created = await tx.leadQuote.create({
        data: {
          companyId,
          leadId,
          vehicleId: vehicle.id,
          quoteNumber: await this.nextQuoteNumber(companyId),
          vehiclePrice: listPrice || dto.offeredPrice,
          offeredPrice: dto.offeredPrice,
          discountAmount: listPrice > dto.offeredPrice ? listPrice - dto.offeredPrice : 0,
          paymentType: dto.options.map((o) => o.label || OPTION_LABEL[o.type]).join(" / "),
          validUntil,
          terms: dto.terms,
          notes: dto.notes,
          status: dto.share ? QuoteStatus.SENT : QuoteStatus.DRAFT,
          shareToken: dto.share ? newToken() : null,
          createdById: user.id,
          options: {
            create: dto.options.map((o, i) => {
              const { monthly } = resolveOption(o);
              return {
                type: o.type,
                label: o.label || OPTION_LABEL[o.type],
                price: o.price,
                downPayment: o.downPayment ?? null,
                tradeInValue: o.tradeInValue ?? null,
                tradeInNote: o.tradeInNote ?? null,
                installmentCount: o.installmentCount ?? null,
                monthlyPayment: monthly ?? null,
                interestRate: o.interestRate ?? null,
                note: o.note ?? null,
                sortOrder: i,
              };
            }),
          },
        },
        include: quoteInclude,
      });

      const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId } });
      if (EARLY_STAGES.includes(lead.status)) {
        await tx.lead.update({ where: { id: leadId }, data: { status: LeadStatus.QUOTE_SENT } });
      }
      await tx.leadActivity.create({
        data: {
          leadId,
          userId: user.id,
          userName,
          type: "QUOTE",
          title: `Teklif Hazırlandı (${created.quoteNumber})`,
          content: `${vehicle.plate} için ${fmtTl(dto.offeredPrice)} teklif · ${created.paymentType}`,
        },
      });
      return created;
    });

    void this.activity.log({
      companyId,
      userId: user.id,
      type: "LEAD_UPDATE",
      title: `Teklif: ${quote.lead.fullName}`,
      description: `${vehicle.plate} ${vehicle.brandName ?? ""} ${vehicle.modelName ?? ""} için ${fmtTl(dto.offeredPrice)} teklif hazırlandı`,
      entityType: "lead",
      entityId: quote.leadId,
      link: "/crm/leads",
    });
    return this.serialize(quote);
  }

  async get(companyId: string, id: string) {
    const q = await this.prisma.leadQuote.findFirst({ where: { id, companyId, deletedAt: null }, include: quoteInclude });
    if (!q) throw new NotFoundException("Teklif bulunamadı");
    return this.serialize(q);
  }

  /** Link oluştur / iptal edilmişse yenisini ver (eski link ölü kalır) */
  async share(companyId: string, id: string) {
    const q = await this.prisma.leadQuote.findFirst({ where: { id, companyId, deletedAt: null }, include: { vehicle: { select: { status: true } } } });
    if (!q) throw new NotFoundException("Teklif bulunamadı");
    if (q.vehicle.status === "SATILDI") throw new BadRequestException("Araç satıldığı için teklif paylaşılamaz");
    const updated = await this.prisma.leadQuote.update({
      where: { id },
      data: {
        ...(q.shareToken && !q.shareRevokedAt ? {} : { shareToken: newToken(), shareRevokedAt: null }),
        ...(q.status === QuoteStatus.DRAFT ? { status: QuoteStatus.SENT } : {}),
      },
      include: quoteInclude,
    });
    return this.serialize(updated);
  }

  /** Teklif linkini platform SMTP hesabından müşteriye e-postayla gönderir (link yoksa oluşturur) */
  async sendEmail(companyId: string, user: AuthUser, id: string, dto: QuoteEmailDto) {
    const shared = await this.share(companyId, id);
    const to = dto.to?.trim() || shared.lead.email;
    if (!to) throw new BadRequestException("Potansiyelin e-posta adresi yok; gönderilecek adresi yazın.");

    const [company, sender] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true, phone: true, email: true, address: true } }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } }),
    ]);
    const v = shared.vehicle;
    const vehicleTitle = [v.brandName, v.modelName, v.year].filter(Boolean).join(" ");
    const mail = quoteEmail({
      customerName: shared.lead.fullName,
      quoteNumber: shared.quoteNumber,
      vehicleTitle,
      plate: v.plate,
      offeredPrice: shared.offeredPrice,
      options: shared.options,
      validUntil: shared.validUntil,
      link: `${this.webOrigin()}${shared.sharePath}`,
      company: { name: company?.name ?? "", phone: company?.phone ?? null, email: company?.email ?? null, address: company?.address ?? null },
      senderName: sender?.name ?? null,
    });
    // Müşteri yanıtlarsa satış danışmanına (yoksa firmaya) gider
    await this.mail.send({ to, ...mail, fromName: company?.name, replyTo: sender?.email ?? company?.email });

    // Potansiyelde e-posta yoksa yazılan adresi kaydet
    if (!shared.lead.email) {
      await this.prisma.lead.update({ where: { id: shared.lead.id }, data: { email: to } });
    }
    await this.prisma.leadActivity.create({
      data: { leadId: shared.lead.id, userId: user.id, type: "QUOTE", title: "Teklif e-postayla gönderildi", content: `${shared.quoteNumber} → ${to}` },
    });
    void this.activity.log({
      companyId,
      userId: user.id,
      type: "LEAD_UPDATE",
      title: `Teklif e-postası: ${shared.lead.fullName}`,
      description: `${shared.quoteNumber} numaralı teklif ${to} adresine gönderildi`,
      entityType: "lead",
      entityId: shared.lead.id,
      link: "/crm/leads",
    });
    return { ...(await this.get(companyId, id)), emailedTo: to };
  }

  async revoke(companyId: string, id: string) {
    const q = await this.prisma.leadQuote.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!q) throw new NotFoundException("Teklif bulunamadı");
    const updated = await this.prisma.leadQuote.update({ where: { id }, data: { shareRevokedAt: new Date() }, include: quoteInclude });
    return this.serialize(updated);
  }

  private serialize(q: Prisma.LeadQuoteGetPayload<{ include: typeof quoteInclude }>) {
    const linkActive = Boolean(q.shareToken && !q.shareRevokedAt);
    return {
      ...q,
      vehiclePrice: Number(q.vehiclePrice),
      offeredPrice: Number(q.offeredPrice),
      discountAmount: Number(q.discountAmount ?? 0),
      shareToken: linkActive ? q.shareToken : null,
      sharePath: linkActive ? `/q/${q.shareToken}` : null,
      vehicle: { ...q.vehicle, listPrice: q.vehicle.listPrice !== null ? Number(q.vehicle.listPrice) : null },
      options: q.options.map((o) => ({
        ...o,
        price: Number(o.price),
        downPayment: o.downPayment !== null ? Number(o.downPayment) : null,
        tradeInValue: o.tradeInValue !== null ? Number(o.tradeInValue) : null,
        monthlyPayment: o.monthlyPayment !== null ? Number(o.monthlyPayment) : null,
        interestRate: o.interestRate !== null ? Number(o.interestRate) : null,
      })),
    };
  }

  // =========================================================
  // Herkese açık (giriş gerektirmez)
  // =========================================================

  private async loadPublic(token: string) {
    if (!token || token.length < 32) throw new NotFoundException("Teklif bulunamadı");
    const q = await this.prisma.leadQuote.findUnique({
      where: { shareToken: token },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        lead: { select: { id: true, fullName: true, assignedUserId: true, deletedAt: true } },
        vehicle: { include: { photos: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!q) throw new NotFoundException("Teklif bulunamadı");
    return q;
  }

  /** Link ölü mü? Sebebiyle birlikte döner */
  private deadReason(q: Awaited<ReturnType<QuoteShareService["loadPublic"]>>) {
    if (q.shareRevokedAt || q.deletedAt || q.lead.deletedAt || q.vehicle.deletedAt) return { reason: "REVOKED", message: "Bu teklif bağlantısı kapatılmıştır." };
    if (q.vehicle.status === "SATILDI") return { reason: "SOLD", message: "Bu araç satılmıştır; teklif artık geçerli değildir." };
    if (q.status === QuoteStatus.REJECTED) return { reason: "CLOSED", message: "Bu teklif kapatılmıştır." };
    if (q.status === QuoteStatus.EXPIRED || (q.validUntil && q.validUntil < new Date())) {
      return { reason: "EXPIRED", message: "Bu teklifin geçerlilik süresi dolmuştur." };
    }
    return null;
  }

  private async company(companyId: string) {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, legalName: true, phone: true, email: true, address: true, logoUrl: true },
    });
    if (!c) return null;
    const logoUrl = c.logoUrl && !c.logoUrl.startsWith("http") ? await this.storage.presignDownload(c.logoUrl).catch(() => null) : c.logoUrl;
    return { ...c, logoUrl };
  }

  async publicView(token: string) {
    const q = await this.loadPublic(token);
    const company = await this.company(q.companyId);
    const dead = this.deadReason(q);
    const v = q.vehicle;
    const vehicleSummary = { brandName: v.brandName, modelName: v.modelName, year: v.year };
    if (dead) {
      if (dead.reason === "EXPIRED" && q.status !== QuoteStatus.EXPIRED && q.status !== QuoteStatus.ACCEPTED) {
        void this.prisma.leadQuote.update({ where: { id: q.id }, data: { status: QuoteStatus.EXPIRED } }).catch(() => void 0);
      }
      return { status: "disabled" as const, ...dead, quoteNumber: q.quoteNumber, vehicle: vehicleSummary, company };
    }

    // Görüntülenme sayacı; ilk açılışta satış ekibine bildirim
    const firstView = q.viewCount === 0;
    void this.prisma.leadQuote.update({ where: { id: q.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } }).catch(() => void 0);
    if (firstView) {
      void this.prisma.leadActivity
        .create({ data: { leadId: q.leadId, type: "NOTE", title: "Müşteri teklifi açtı", content: `${q.quoteNumber} numaralı teklif bağlantısı ilk kez görüntülendi.` } })
        .catch(() => void 0);
      void this.activity.log({
        companyId: q.companyId,
        type: "LEAD_UPDATE",
        title: `${q.lead.fullName} teklifi açtı`,
        description: `${q.quoteNumber} · ${v.plate}`,
        entityType: "lead",
        entityId: q.leadId,
        link: "/crm/leads",
      });
    }

    const photos = await Promise.all(
      v.photos.slice(0, 12).map(async (p) => ({
        id: p.id,
        category: p.category,
        url: p.url ?? (p.fileKey ? await this.storage.presignDownload(p.fileKey).catch(() => null) : null),
        thumbUrl: p.thumbUrl ?? (p.thumbKey ? await this.storage.presignDownload(p.thumbKey).catch(() => null) : null),
      })),
    );
    const salesRep = q.createdById ?? q.lead.assignedUserId;
    const rep = salesRep ? await this.prisma.user.findUnique({ where: { id: salesRep }, select: { name: true, phone: true, email: true } }) : null;

    return {
      status: "active" as const,
      quote: {
        number: q.quoteNumber,
        createdAt: q.createdAt,
        validUntil: q.validUntil,
        vehiclePrice: Number(q.vehiclePrice),
        offeredPrice: Number(q.offeredPrice),
        discountAmount: Number(q.discountAmount ?? 0),
        terms: q.terms,
        customerResponse: q.customerResponse,
        customerRespondedAt: q.customerRespondedAt,
        options: q.options.map((o) => ({
          type: o.type,
          label: o.label,
          price: Number(o.price),
          downPayment: o.downPayment !== null ? Number(o.downPayment) : null,
          tradeInValue: o.tradeInValue !== null ? Number(o.tradeInValue) : null,
          tradeInNote: o.tradeInNote,
          installmentCount: o.installmentCount,
          monthlyPayment: o.monthlyPayment !== null ? Number(o.monthlyPayment) : null,
          interestRate: o.interestRate !== null ? Number(o.interestRate) : null,
          note: o.note,
        })),
      },
      customer: { firstName: q.lead.fullName.split(" ")[0] },
      vehicle: {
        ...vehicleSummary,
        plate: v.plate,
        km: v.km,
        fuelType: v.fuelType,
        transmission: v.transmission,
        colorName: v.colorName,
        engineVolume: v.engineVolume,
        horsePower: v.horsePower,
        listPrice: v.listPrice !== null ? Number(v.listPrice) : null,
        photos,
      },
      company,
      salesRep: rep,
    };
  }

  async respond(token: string, dto: QuoteRespondDto) {
    const q = await this.loadPublic(token);
    const dead = this.deadReason(q);
    if (dead) throw new BadRequestException(dead.message);
    const accepted = dto.response === "ACCEPTED";
    await this.prisma.$transaction([
      this.prisma.leadQuote.update({
        where: { id: q.id },
        data: { customerResponse: dto.response, customerRespondedAt: new Date(), ...(accepted ? { status: QuoteStatus.ACCEPTED } : {}) },
      }),
      this.prisma.leadActivity.create({
        data: {
          leadId: q.leadId,
          type: accepted ? "QUOTE" : "CALL",
          title: accepted ? `Müşteri teklifi kabul etti (${q.quoteNumber})` : `Müşteri aranmak istiyor (${q.quoteNumber})`,
          content: dto.message?.trim() || null,
        },
      }),
      ...(accepted ? [this.prisma.lead.update({ where: { id: q.leadId }, data: { status: LeadStatus.NEGOTIATION } })] : []),
    ]);
    void this.activity.log({
      companyId: q.companyId,
      type: "LEAD_UPDATE",
      title: accepted ? `${q.lead.fullName} teklifi kabul etti` : `${q.lead.fullName} aranmak istiyor`,
      description: `${q.quoteNumber} · ${q.vehicle.plate}${dto.message ? ` — ${dto.message}` : ""}`,
      entityType: "lead",
      entityId: q.leadId,
      link: "/crm/leads",
    });
    return { success: true, response: dto.response };
  }
}
