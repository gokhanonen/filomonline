import { Injectable, NotFoundException } from "@nestjs/common";
import { ContractKind, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateContractTemplateDto,
  RenderContractDto,
  UpdateContractTemplateDto,
} from "./dto/contract-template.dto";
import {
  DEFAULT_RENTAL_CONTRACT_HTML,
  DEFAULT_SALES_CONTRACT_HTML,
} from "./default-templates";
import { softDeleteData } from "../prisma/soft-delete";
import { StorageService } from "../storage/storage.service";
import {
  ContractContext,
  ContractLayout,
  ContractParty,
  DEFAULT_LAYOUTS,
  fmtDay,
  fmtTl,
  isLayout,
  penaltyText,
  renderLayout,
  sampleContext,
} from "./contract-layout";

const FUEL_TR: Record<string, string> = { BENZIN: "Benzin", DIZEL: "Dizel", LPG: "LPG", ELEKTRIK: "Elektrik", HIBRIT: "Hibrit" };
const LAYOUT_NAMES: Record<ContractKind, string> = {
  SALES: "Standart Araç Satış Sözleşmesi",
  PURCHASE: "Standart Araç Alış Sözleşmesi",
  RENTAL: "Standart Araç Kiralama Sözleşmesi",
};

@Injectable()
export class ContractTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(tenantId: string, type?: ContractKind) {
    await this.ensureLayoutDefaults(tenantId);
    let templates = await this.prisma.contractTemplate.findMany({
      where: {
        tenantId,
        ...(type ? { type } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    // Eğer tenant için hiç şablon yoksa varsayılanları oluştur
    if (templates.length === 0) {
      await this.seedDefaults(tenantId);
      templates = await this.prisma.contractTemplate.findMany({
        where: {
          tenantId,
          ...(type ? { type } : {}),
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
    }

    return templates;
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException("Sözleşme şablonu bulunamadı");
    }
    return template;
  }

  async create(tenantId: string, dto: CreateContractTemplateDto) {
    if (dto.isDefault) {
      await this.prisma.contractTemplate.updateMany({
        where: { tenantId, type: dto.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.contractTemplate.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        content: dto.content,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateContractTemplateDto) {
    const existing = await this.findOne(tenantId, id);

    if (dto.isDefault && dto.type) {
      await this.prisma.contractTemplate.updateMany({
        where: { tenantId, type: dto.type, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.contractTemplate.update({
      where: { id: existing.id },
      data: {
        ...dto,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.contractTemplate.update({ where: { id }, data: softDeleteData() });
    return { success: true };
  }

  async render(tenantId: string, companyId: string, dto: RenderContractDto): Promise<{ html: string; title: string }> {
    // 1. Şablonu Bul
    let template = dto.templateId
      ? await this.prisma.contractTemplate.findFirst({
          where: { id: dto.templateId, tenantId },
        })
      : await this.prisma.contractTemplate.findFirst({
          where: { tenantId, type: dto.contractType, isDefault: true },
        });

    // Yeni düzen (yapılandırılmış şablon) — şablon yoksa da varsayılan düzen kullanılır
    if (!template?.content || isLayout(template.content)) {
      const layout = template?.content ? (JSON.parse(template.content) as ContractLayout) : DEFAULT_LAYOUTS[dto.contractType];
      const { ctx, title } = await this.buildContext(dto.contractType, dto.contractId, companyId);
      return { html: renderLayout(dto.contractType, layout, ctx), title };
    }

    let htmlTemplate = template?.content;
    if (!htmlTemplate) {
      htmlTemplate =
        dto.contractType === ContractKind.SALES
          ? DEFAULT_SALES_CONTRACT_HTML
          : DEFAULT_RENTAL_CONTRACT_HTML;
    }

    // 2. Firma Bilgilerini Getir
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const fmtMoney = (val?: number | string | Prisma.Decimal | null) => {
      if (val === null || val === undefined) return "0,00 ₺";
      return (
        Number(val).toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " ₺"
      );
    };

    const fmtDate = (d?: Date | string | null) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("tr-TR");
    };

    const replacements: Record<string, string> = {
      "{{firma_unvan}}": company?.name || "TURGUT AUTO FİLO ARAÇ KİRALAMA TİC. LTD. ŞTİ.",
      "{{firma_vergi_no}}": company?.taxNumber || "8700692728",
      "{{firma_vergi_dairesi}}": company?.taxOffice || "Güneşli",
      "{{firma_adres}}": company?.address || "İstoç Oto Ticaret Merkezi A1 Blok No:49-50 Bağcılar / İSTANBUL",
      "{{firma_telefon}}": company?.phone || "0212 659 34 21",
      "{{bugunun_tarihi}}": fmtDate(new Date()),
    };

    let title = "Sözleşme";

    // 3. Sözleşme Tipine Göre Değişkenleri Doldur
    if (dto.contractType === ContractKind.SALES) {
      const contract = await this.prisma.salesContract.findFirst({
        where: { id: dto.contractId, companyId },
        include: {
          installments: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!contract) {
        throw new NotFoundException("Satış sözleşmesi bulunamadı");
      }

      title = `Satış Sözleşmesi — ${contract.documentNo}`;

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: contract.vehicleId },
      });

      const totalInst = contract.installments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0,
      );
      const grandTotal = Number(contract.grandTotal || contract.price);
      const downPayment = Math.max(0, grandTotal - totalInst);

      let installmentsHtml = "";
      if (contract.installments.length > 0) {
        installmentsHtml = `
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 1px solid #000;">
                <th style="padding: 4px; text-align: left; border: 1px solid #d1d5db;">Taksit No</th>
                <th style="padding: 4px; text-align: left; border: 1px solid #d1d5db;">Vade Tarihi</th>
                <th style="padding: 4px; text-align: right; border: 1px solid #d1d5db;">Tutar</th>
                <th style="padding: 4px; text-align: left; border: 1px solid #d1d5db;">Ödeme Türü</th>
              </tr>
            </thead>
            <tbody>
              ${contract.installments
                .map(
                  (inst, i) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 4px; border: 1px solid #d1d5db;">${i + 1}. Taksit</td>
                  <td style="padding: 4px; border: 1px solid #d1d5db;">${fmtDate(inst.date)}</td>
                  <td style="padding: 4px; text-align: right; font-weight: bold; border: 1px solid #d1d5db;">${fmtMoney(inst.amount)}</td>
                  <td style="padding: 4px; border: 1px solid #d1d5db;">${inst.type || "SENET / HAVALE"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
      } else {
        installmentsHtml = `<p style="font-size: 11px; font-style: italic; color: #4b5563; margin-top: 4px;">Peşin satış (Taksit planı bulunmuyor).</p>`;
      }

      Object.assign(replacements, {
        "{{sozlesme_no}}": contract.documentNo || "—",
        "{{sozlesme_tarihi}}": fmtDate(contract.contractDate),
        "{{gecerlilik_tarihi}}": fmtDate(contract.validUntil) || fmtDate(contract.contractDate),
        "{{musteri_adi}}": contract.customerName || "—",
        "{{musteri_tc_vkn}}": contract.customerTaxNumber || contract.customerIdentityNumber || "—",
        "{{musteri_adres}}": [contract.customerAddress, contract.customerDistrict, contract.customerCity].filter(Boolean).join(" / ") || "—",
        "{{musteri_telefon}}": contract.customerPhone || "—",
        "{{plaka}}": vehicle?.plate || "—",
        "{{marka_model}}": [vehicle?.brandName, vehicle?.modelName].filter(Boolean).join(" ") || "—",
        "{{yil}}": vehicle?.year ? String(vehicle.year) : "—",
        "{{sasi_no}}": vehicle?.chassisNo || "—",
        "{{motor_no}}": vehicle?.engineNo || "—",
        "{{renk}}": vehicle?.colorName || "—",
        "{{toplam_tutar}}": fmtMoney(grandTotal),
        "{{alinan_pesinat}}": fmtMoney(downPayment),
        "{{kalan_bakiye}}": fmtMoney(totalInst),
        "{{odeme_tablosu}}": installmentsHtml,
      });
    } else {
      // RENTAL
      const contract = await this.prisma.rentalContract.findFirst({
        where: { id: dto.contractId, companyId },
      });

      if (!contract) {
        throw new NotFoundException("Kira sözleşmesi bulunamadı");
      }

      title = `Kira Sözleşmesi — ${contract.documentNo || contract.customerName}`;

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: contract.vehicleId },
      });

      const drivers = Array.isArray(contract.drivers)
        ? (contract.drivers as string[]).join(", ")
        : "—";

      Object.assign(replacements, {
        "{{sozlesme_no}}": contract.documentNo || "—",
        "{{sozlesme_tarihi}}": fmtDate(contract.contractDate),
        "{{musteri_adi}}": contract.customerName || "—",
        "{{musteri_tc_vkn}}": contract.customerTcTaxNo || "—",
        "{{musteri_adres}}": contract.customerAddress || "—",
        "{{musteri_telefon}}": contract.customerPhone || "—",
        "{{plaka}}": vehicle?.plate || "—",
        "{{marka_model}}": [vehicle?.brandName, vehicle?.modelName].filter(Boolean).join(" ") || "—",
        "{{yil}}": vehicle?.year ? String(vehicle.year) : "—",
        "{{sasi_no}}": vehicle?.chassisNo || "—",
        "{{motor_no}}": vehicle?.engineNo || "—",
        "{{renk}}": vehicle?.colorName || "—",
        "{{kira_suresi_ay}}": String(contract.durationMonths || 12),
        "{{km_limiti}}": Number(contract.kmLimit || 0).toLocaleString("tr-TR"),
        "{{tutar}}": fmtMoney(contract.monthlyPrice),
        "{{suruculer}}": drivers || "Belirtilmemiş",
      });
    }

    // 4. Placeholder Değiştirme
    let renderedHtml = htmlTemplate;
    for (const [key, val] of Object.entries(replacements)) {
      renderedHtml = renderedHtml.split(key).join(val);
    }

    return { html: renderedHtml, title };
  }

  /** Düzenleyici canlı önizleme: kaydedilmemiş düzen + örnek veri */
  async preview(companyId: string, type: ContractKind, layout: ContractLayout) {
    return { html: renderLayout(type, { ...DEFAULT_LAYOUTS[type], ...layout, kind: "layout", version: 1 }, sampleContext(type, await this.companyParty(companyId))) };
  }

  defaultLayout(type: ContractKind) {
    if (!DEFAULT_LAYOUTS[type]) throw new NotFoundException("Geçersiz sözleşme türü");
    return DEFAULT_LAYOUTS[type];
  }

  /** Her sözleşme türü için yeni düzende bir varsayılan şablon bulunur (eski HTML şablonlar silinmez) */
  private async ensureLayoutDefaults(tenantId: string) {
    for (const type of Object.keys(DEFAULT_LAYOUTS) as ContractKind[]) {
      const existing = await this.prisma.contractTemplate.findMany({ where: { tenantId, type }, select: { id: true, content: true } });
      if (existing.some((t) => isLayout(t.content))) continue;
      await this.prisma.$transaction([
        this.prisma.contractTemplate.updateMany({ where: { tenantId, type }, data: { isDefault: false } }),
        this.prisma.contractTemplate.create({
          data: { tenantId, type, name: LAYOUT_NAMES[type], content: JSON.stringify(DEFAULT_LAYOUTS[type]), isDefault: true },
        }),
      ]);
    }
  }

  private async companyParty(companyId: string): Promise<ContractContext["company"]> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId } });
    const logoUrl = c?.logoUrl && !c.logoUrl.startsWith("http") ? await this.storage.presignDownload(c.logoUrl).catch(() => null) : c?.logoUrl;
    return {
      title: c?.legalName || c?.name || "",
      address: c?.address,
      phone: c?.phone,
      email: c?.email,
      website: c?.website,
      taxOffice: c?.taxOffice,
      taxNo: c?.taxNumber,
      mersisNo: c?.mersisNo,
      tradeRegistryNo: c?.tradeRegistryNo,
      logoUrl,
    };
  }

  private vehicleBlock(v: { plate: string; engineNo: string | null; brandName: string | null; chassisNo: string | null; modelName: string | null; registrationModel: string | null; fuelType: string | null; colorName: string | null } | null) {
    return {
      plate: v?.plate ?? "",
      engineNo: v?.engineNo ?? "",
      brand: v?.brandName ?? "",
      chassisNo: v?.chassisNo ?? "",
      model: v?.registrationModel || v?.modelName || "",
      fuel: v?.fuelType ? FUEL_TR[v.fuelType] ?? v.fuelType : "",
      color: v?.colorName ?? "",
    };
  }

  /** Yeni düzen için sözleşme verisi (satış: SalesContract, alış: aracın alış bilgileri, kira: RentalContract) */
  private async buildContext(type: ContractKind, contractId: string, companyId: string): Promise<{ ctx: ContractContext; title: string }> {
    const company = await this.companyParty(companyId);
    const common = { printDate: fmtDay(new Date()), company };

    if (type === ContractKind.SALES) {
      const c = await this.prisma.salesContract.findFirst({ where: { id: contractId, companyId }, include: { installments: { orderBy: { sortOrder: "asc" } } } });
      if (!c) throw new NotFoundException("Satış sözleşmesi bulunamadı");
      const v = await this.prisma.vehicle.findFirst({ where: { id: c.vehicleId, companyId } });
      const total = Number(c.grandTotal || c.price);
      const instTotal = c.installments.reduce((s, i) => s + Number(i.amount), 0);
      const buyer: ContractParty = {
        title: c.customerName,
        address: c.customerAddress,
        phone: c.customerPhone,
        district: c.customerDistrict,
        city: c.customerCity,
        taxOffice: c.customerTaxOffice,
        taxNo: c.customerTaxNumber || c.customerIdentityNumber,
      };
      const vehicle = this.vehicleBlock(v);
      return {
        title: `Satış Sözleşmesi — ${c.documentNo}`,
        ctx: {
          ...common,
          seller: company,
          buyer,
          vehicle,
          money: {
            total,
            downPayment: Math.max(0, total - instTotal),
            remaining: instTotal,
            installments: c.installments.map((i) => ({ date: fmtDay(i.date), amount: Number(i.amount), type: i.type })),
          },
          paymentNotes: c.paymentNotes,
          vars: this.vars(vehicle, company.title, buyer.title, {
            sozlesme_tarihi: fmtDay(c.contractDate),
            teslim_tarihi: fmtDay(c.deliveryDate ?? c.contractDate),
            toplam_tutar: fmtTl(total),
            pesin_odeme: fmtTl(Math.max(0, total - instTotal)),
            kalan_bakiye: fmtTl(instTotal),
            cezai_sart: penaltyText(Number(c.penaltyClause ?? 0)),
          }),
        },
      };
    }

    if (type === ContractKind.PURCHASE) {
      const v = await this.prisma.vehicle.findFirst({ where: { id: contractId, companyId }, include: { installments: { orderBy: { date: "asc" } } } });
      if (!v) throw new NotFoundException("Araç bulunamadı");
      const supplier = v.supplierId ? await this.prisma.account.findFirst({ where: { id: v.supplierId, companyId } }) : null;
      const total = Number(v.purchasePrice ?? v.purchaseNotaryPrice ?? 0);
      const instTotal = v.installments.reduce((s, i) => s + Number(i.amount), 0);
      const down = v.purchaseDownPayment != null ? Number(v.purchaseDownPayment) : Math.max(0, total - instTotal);
      const seller: ContractParty = supplier
        ? { title: supplier.name, address: supplier.address, phone: supplier.phone, district: supplier.district, city: supplier.city, taxOffice: supplier.taxOffice, taxNo: supplier.taxNumber || supplier.tckn }
        : { title: v.purchasedFrom ?? "" };
      const vehicle = this.vehicleBlock(v);
      const date = v.purchaseDate ?? v.createdAt;
      return {
        title: `Alış Sözleşmesi — ${v.plate}`,
        ctx: {
          ...common,
          seller,
          buyer: company,
          vehicle,
          money: {
            total,
            downPayment: down,
            remaining: Math.max(0, total - down),
            installments: v.installments.map((i) => ({ date: fmtDay(i.date), amount: Number(i.amount), type: i.type })),
          },
          paymentNotes: v.purchasePaymentNotes,
          vars: this.vars(vehicle, seller.title, company.title, {
            sozlesme_tarihi: fmtDay(date),
            teslim_tarihi: fmtDay(date),
            toplam_tutar: fmtTl(total),
            pesin_odeme: fmtTl(down),
            kalan_bakiye: fmtTl(Math.max(0, total - down)),
            cezai_sart: penaltyText(null),
          }),
        },
      };
    }

    const c = await this.prisma.rentalContract.findFirst({ where: { id: contractId, companyId } });
    if (!c) throw new NotFoundException("Kira sözleşmesi bulunamadı");
    const v = await this.prisma.vehicle.findFirst({ where: { id: c.vehicleId, companyId } });
    const drivers = Array.isArray(c.drivers) ? (c.drivers as string[]).join(", ") : "Belirtilmemiş";
    const buyer: ContractParty = { title: c.customerName, address: c.customerAddress, phone: c.customerPhone, taxNo: c.customerTcTaxNo };
    const vehicle = this.vehicleBlock(v);
    const months = Number(c.durationMonths || 12);
    const km = Number(c.kmLimit || 0);
    const monthly = Number(c.monthlyPrice || 0);
    return {
      title: `Kira Sözleşmesi — ${c.documentNo || c.customerName}`,
      ctx: {
        ...common,
        seller: company,
        buyer,
        vehicle,
        rental: { startDate: fmtDay(c.contractDate), months, kmLimit: km, monthly, drivers },
        vars: this.vars(vehicle, company.title, buyer.title, {
          sozlesme_tarihi: fmtDay(c.contractDate),
          baslangic_tarihi: fmtDay(c.contractDate),
          kira_suresi_ay: String(months),
          km_limiti: km.toLocaleString("tr-TR"),
          tutar: fmtTl(monthly),
          suruculer: drivers,
          cezai_sart: penaltyText(null),
        }),
      },
    };
  }

  private vars(vehicle: { plate: string; brand: string; model: string }, seller: string, buyer: string, extra: Record<string, string>) {
    return { plaka: vehicle.plate, marka_model: [vehicle.brand, vehicle.model].filter(Boolean).join(" "), satici_unvan: seller, alici_unvan: buyer, ...extra };
  }

  private async seedDefaults(tenantId: string) {
    await this.prisma.contractTemplate.createMany({
      data: [
        {
          tenantId,
          type: ContractKind.SALES,
          name: "Standart Araç Satış & Kapora Sözleşmesi",
          content: DEFAULT_SALES_CONTRACT_HTML,
          isDefault: true,
        },
        {
          tenantId,
          type: ContractKind.RENTAL,
          name: "Uzun Dönem Araç Kiralama Sözleşmesi",
          content: DEFAULT_RENTAL_CONTRACT_HTML,
          isDefault: true,
        },
      ],
    });
  }
}
