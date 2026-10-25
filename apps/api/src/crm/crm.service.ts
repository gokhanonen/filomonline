import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { ClaudeService } from "../ai/claude.service";
import {
  ConvertLeadDto,
  CreateLeadActivityDto,
  CreateLeadDto,
  CreateQuoteDto,
  CreateTestDriveDto,
  GenerateAiMessageDto,
  QueryLeadsDto,
  UpdateLeadDto,
  UpdateQuoteDto,
  UpdateTestDriveDto,
} from "./dto/crm.dto";
import { LeadStatus, QuoteStatus, TestDriveStatus } from "@prisma/client";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly claude: ClaudeService,
  ) {}

  private async getUserName(userId?: string): Promise<string | undefined> {
    if (!userId) return undefined;
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return u?.name;
  }

  // =========================================================================
  // LEAD (Potansiyel Müşteri)
  // =========================================================================

  async listLeads(companyId: string, q?: QueryLeadsDto) {
    const where: any = { companyId };

    if (q?.status) {
      where.status = q.status;
    }
    if (q?.source) {
      where.source = q.source;
    }
    if (q?.vehicleId) {
      where.interestedVehicles = {
        some: { vehicleId: q.vehicleId },
      };
    }
    if (q?.search?.trim()) {
      const term = q.search.trim();
      where.OR = [
        { fullName: { contains: term } },
        { phone: { contains: term } },
        { email: { contains: term } },
        { notes: { contains: term } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        interestedVehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brandName: true,
                modelName: true,
                year: true,
                km: true,
                saleAmount: true,
                photos: {
                  take: 1,
                  select: { url: true, thumbUrl: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            testDrives: true,
            quotes: true,
            activities: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLead(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        interestedVehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brandName: true,
                modelName: true,
                year: true,
                km: true,
                fuelType: true,
                transmission: true,
                saleAmount: true,
                status: true,
                photos: {
                  take: 3,
                  select: { id: true, url: true, thumbUrl: true, category: true },
                },
              },
            },
          },
        },
        testDrives: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brandName: true,
                modelName: true,
                year: true,
              },
            },
          },
          orderBy: { scheduledAt: "desc" },
        },
        quotes: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brandName: true,
                modelName: true,
                year: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException("Potansiyel alıcı kaydı bulunamadı.");
    }

    return lead;
  }

  async createLead(
    companyId: string,
    userId: string,
    dto: CreateLeadDto,
  ) {
    const userName = await this.getUserName(userId);
    const { interestedVehicleIds, ...data } = dto;

    const lead = await this.prisma.lead.create({
      data: {
        ...data,
        companyId,
        assignedUserId: dto.assignedUserId || userId,
        interestedVehicles: interestedVehicleIds?.length
          ? {
              create: interestedVehicleIds.map((vId) => ({
                vehicleId: vId,
              })),
            }
          : undefined,
        activities: {
          create: {
            userId,
            userName,
            type: "NOTE",
            title: "Potansiyel Oluşturuldu",
            content: `Potansiyel alıcı sisteme kaydedildi. Kaynak: ${dto.source || "Doğrudan Ziyaret"}`,
          },
        },
      },
      include: {
        interestedVehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brandName: true,
                modelName: true,
              },
            },
          },
        },
      },
    });

    // Global bildirim
    await this.activity.log({
      companyId,
      type: "LEAD_NEW",
      title: "Yeni Potansiyel Alıcı",
      description: `${lead.fullName} sisteme potansiyel müşteri olarak eklendi.`,
      entityType: "lead",
      entityId: lead.id,
      userId,
      userName,
      link: `/crm/leads?id=${lead.id}`,
    });

    return lead;
  }

  async updateLead(
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateLeadDto,
  ) {
    const userName = await this.getUserName(userId);
    const existing = await this.getLead(companyId, id);

    const { interestedVehicleIds, ...data } = dto;

    // Durum değişikliği takibi
    if (dto.status && dto.status !== existing.status) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: id,
          userId,
          userName,
          type: "STATUS_CHANGE",
          title: "Aşama Güncellendi",
          content: `Aşama "${existing.status}" durumundan "${dto.status}" durumuna taşındı.${dto.lostReason ? ` Sebep: ${dto.lostReason}` : ""}`,
        },
      });
    }

    // İlgilenilen araçlar güncellemesi
    if (interestedVehicleIds !== undefined) {
      await this.prisma.leadInterestedVehicle.deleteMany({
        where: { leadId: id },
      });
      if (interestedVehicleIds.length > 0) {
        await this.prisma.leadInterestedVehicle.createMany({
          data: interestedVehicleIds.map((vId) => ({
            leadId: id,
            vehicleId: vId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data,
      include: {
        interestedVehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brandName: true,
                modelName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  async deleteLead(companyId: string, id: string) {
    await this.getLead(companyId, id);
    await this.prisma.lead.delete({ where: { id } });
    return { success: true };
  }

  async addInterestedVehicle(
    companyId: string,
    leadId: string,
    vehicleId: string,
    notes?: string,
  ) {
    await this.getLead(companyId, leadId);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException("Araç bulunamadı.");
    }

    const interest = await this.prisma.leadInterestedVehicle.upsert({
      where: {
        leadId_vehicleId: { leadId, vehicleId },
      },
      create: { leadId, vehicleId, notes },
      update: { notes },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: "NOTE",
        title: "İlgilenilen Araç Eklendi",
        content: `${vehicle.plate} (${vehicle.brandName} ${vehicle.modelName}) potansiyelin ilgi listesine eklendi.`,
      },
    });

    return interest;
  }

  async removeInterestedVehicle(
    companyId: string,
    leadId: string,
    vehicleId: string,
  ) {
    await this.getLead(companyId, leadId);
    await this.prisma.leadInterestedVehicle.deleteMany({
      where: { leadId, vehicleId },
    });
    return { success: true };
  }

  // =========================================================================
  // DENEME SÜRÜŞÜ & RANDEVU (Test Drive)
  // =========================================================================

  async listTestDrives(
    companyId: string,
    q?: { status?: TestDriveStatus; leadId?: string; vehicleId?: string },
  ) {
    const where: any = { companyId };
    if (q?.status) where.status = q.status;
    if (q?.leadId) where.leadId = q.leadId;
    if (q?.vehicleId) where.vehicleId = q.vehicleId;

    return this.prisma.leadTestDrive.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plate: true,
            brandName: true,
            modelName: true,
            year: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });
  }

  async createTestDrive(
    companyId: string,
    userId: string,
    dto: CreateTestDriveDto,
  ) {
    const userName = await this.getUserName(userId);
    const lead = await this.getLead(companyId, dto.leadId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException("Araç bulunamadı.");
    }

    const testDrive = await this.prisma.leadTestDrive.create({
      data: {
        companyId,
        leadId: dto.leadId,
        vehicleId: dto.vehicleId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes || 30,
        driverLicenseNo: dto.driverLicenseNo,
        assignedUserId: dto.assignedUserId || userId,
        feedbackNotes: dto.feedbackNotes,
      },
      include: {
        vehicle: {
          select: { plate: true, brandName: true, modelName: true },
        },
        lead: {
          select: { fullName: true, phone: true },
        },
      },
    });

    // Lead durumunu otomatik güncelle (eğer henüz yeni veya görüşüldü ise)
    if (lead.status === LeadStatus.NEW || lead.status === LeadStatus.CONTACTED) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: { status: LeadStatus.TEST_DRIVE },
      });
    }

    // Aktivite kaydı
    await this.prisma.leadActivity.create({
      data: {
        leadId: dto.leadId,
        userId,
        userName,
        type: "TEST_DRIVE",
        title: "Deneme Sürüşü Randevusu Planlandı",
        content: `${vehicle.plate} (${vehicle.brandName} ${vehicle.modelName}) için ${new Date(dto.scheduledAt).toLocaleString("tr-TR")} tarihine deneme sürüşü planlandı.`,
      },
    });

    // Global bildirim
    await this.activity.log({
      companyId,
      type: "TEST_DRIVE_SCHEDULED",
      title: "Deneme Sürüşü Randevusu",
      description: `${lead.fullName} için ${vehicle.plate} ile deneme sürüşü randevusu planlandı.`,
      entityType: "lead",
      entityId: lead.id,
      userId,
      userName,
      link: `/crm/leads?id=${lead.id}`,
    });

    return testDrive;
  }

  async updateTestDrive(
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateTestDriveDto,
  ) {
    const userName = await this.getUserName(userId);
    const existing = await this.prisma.leadTestDrive.findFirst({
      where: { id, companyId },
      include: { vehicle: true, lead: true },
    });
    if (!existing) {
      throw new NotFoundException("Deneme sürüşü randevusu bulunamadı.");
    }

    const updated = await this.prisma.leadTestDrive.update({
      where: { id },
      data: {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
        driverLicenseNo: dto.driverLicenseNo,
        status: dto.status,
        assignedUserId: dto.assignedUserId,
        feedbackRating: dto.feedbackRating,
        feedbackNotes: dto.feedbackNotes,
      },
    });

    if (dto.status === TestDriveStatus.COMPLETED && existing.status !== TestDriveStatus.COMPLETED) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: existing.leadId,
          userId,
          userName,
          type: "TEST_DRIVE",
          title: "Deneme Sürüşü Tamamlandı",
          content: `Test sürüşü başarıyla yapıldı.${dto.feedbackNotes ? ` Not: ${dto.feedbackNotes}` : ""}${dto.feedbackRating ? ` (Puan: ${dto.feedbackRating}/5)` : ""}`,
        },
      });
    }

    return updated;
  }

  async deleteTestDrive(companyId: string, id: string) {
    const existing = await this.prisma.leadTestDrive.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Randevu bulunamadı.");
    await this.prisma.leadTestDrive.delete({ where: { id } });
    return { success: true };
  }

  // =========================================================================
  // TEKLİF (Lead Quotes)
  // =========================================================================

  async listQuotes(companyId: string, q?: { status?: QuoteStatus; leadId?: string }) {
    const where: any = { companyId };
    if (q?.status) where.status = q.status;
    if (q?.leadId) where.leadId = q.leadId;

    return this.prisma.leadQuote.findMany({
      where,
      include: {
        lead: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        vehicle: {
          select: { id: true, plate: true, brandName: true, modelName: true, year: true, km: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createQuote(
    companyId: string,
    userId: string,
    dto: CreateQuoteDto,
  ) {
    const userName = await this.getUserName(userId);
    const lead = await this.getLead(companyId, dto.leadId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) throw new NotFoundException("Araç bulunamadı.");

    const count = await this.prisma.leadQuote.count({ where: { companyId } });
    const year = new Date().getFullYear();
    const quoteNumber = `TKL-${year}-${String(count + 1).padStart(4, "0")}`;

    const quote = await this.prisma.leadQuote.create({
      data: {
        companyId,
        leadId: dto.leadId,
        vehicleId: dto.vehicleId,
        quoteNumber,
        vehiclePrice: dto.vehiclePrice,
        offeredPrice: dto.offeredPrice,
        discountAmount: dto.discountAmount || 0,
        paymentType: dto.paymentType,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        terms: dto.terms,
        notes: dto.notes,
        status: QuoteStatus.DRAFT,
      },
      include: {
        vehicle: {
          select: { plate: true, brandName: true, modelName: true, year: true },
        },
      },
    });

    // Lead durumunu otomatik TEKLIF_VERILDI aşamasına al
    if (
      lead.status === LeadStatus.NEW ||
      lead.status === LeadStatus.CONTACTED ||
      lead.status === LeadStatus.TEST_DRIVE
    ) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: { status: LeadStatus.QUOTE_SENT },
      });
    }

    // Aktivite
    await this.prisma.leadActivity.create({
      data: {
        leadId: dto.leadId,
        userId,
        userName,
        type: "QUOTE",
        title: `Teklif Hazırlandı (${quoteNumber})`,
        content: `${vehicle.plate} için ${Number(dto.offeredPrice).toLocaleString("tr-TR")} TL teklif hazırlandı.${dto.paymentType ? ` Ödeme Türü: ${dto.paymentType}` : ""}`,
      },
    });

    return quote;
  }

  async updateQuote(
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateQuoteDto,
  ) {
    const userName = await this.getUserName(userId);
    const existing = await this.prisma.leadQuote.findFirst({
      where: { id, companyId },
      include: { lead: true, vehicle: true },
    });
    if (!existing) throw new NotFoundException("Teklif bulunamadı.");

    const updated = await this.prisma.leadQuote.update({
      where: { id },
      data: {
        vehiclePrice: dto.vehiclePrice,
        offeredPrice: dto.offeredPrice,
        discountAmount: dto.discountAmount,
        paymentType: dto.paymentType,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        status: dto.status,
        terms: dto.terms,
        notes: dto.notes,
      },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: existing.leadId,
          userId,
          userName,
          type: "QUOTE",
          title: `Teklif Durumu: ${dto.status}`,
          content: `${existing.quoteNumber} nolu teklif "${dto.status}" durumuna güncellendi.`,
        },
      });
    }

    return updated;
  }

  async deleteQuote(companyId: string, id: string) {
    const existing = await this.prisma.leadQuote.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Teklif bulunamadı.");
    await this.prisma.leadQuote.delete({ where: { id } });
    return { success: true };
  }

  // =========================================================================
  // AKTİVİTE & İLETİŞİM GEÇMİŞİ
  // =========================================================================

  async addActivity(
    companyId: string,
    leadId: string,
    userId: string,
    dto: CreateLeadActivityDto,
  ) {
    const userName = await this.getUserName(userId);
    await this.getLead(companyId, leadId);

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        userName,
        type: dto.type,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  // =========================================================================
  // MÜŞTERİYE (CARİ) DÖNÜŞTÜR (Conversion)
  // =========================================================================

  async convertToCustomer(
    companyId: string,
    leadId: string,
    userId: string,
    dto: ConvertLeadDto,
  ) {
    const userName = await this.getUserName(userId);
    const lead = await this.getLead(companyId, leadId);

    if (lead.status === LeadStatus.CONVERTED || lead.convertedAccountId) {
      throw new BadRequestException("Bu potansiyel zaten müşteriye (cariye) dönüştürülmüştür.");
    }

    // Yeni Account (Cari) oluştur
    const account = await this.prisma.account.create({
      data: {
        companyId,
        type: "CUSTOMER",
        entityType: (dto.entityType as any) || "INDIVIDUAL",
        name: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        taxOffice: dto.taxOffice,
        taxNumber: dto.taxNumber,
        tckn: dto.tckn,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        isPotential: false,
        isActive: true,
      },
    });

    // Lead'i güncelle
    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONVERTED,
        convertedAccountId: account.id,
        convertedAt: new Date(),
      },
    });

    // Aktivite ekle
    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        userName,
        type: "CONVERTED",
        title: "Potansiyel Müşteriye Dönüştürüldü 🎉",
        content: `Potansiyel alıcı başarıyla Cari Müşteri olarak sisteme kaydedildi. Cari ID: ${account.id}`,
      },
    });

    // Global Bildirim
    await this.activity.log({
      companyId,
      type: "LEAD_CONVERTED",
      title: "Müşteri Kazanıldı!",
      description: `${lead.fullName} başarıyla cari müşteriye dönüştürüldü.`,
      entityType: "account",
      entityId: account.id,
      userId,
      userName,
      link: `/accounts?id=${account.id}`,
    });

    return {
      lead: updatedLead,
      account,
    };
  }

  // =========================================================================
  // CLAUDE AI İLE TEKLİF & MESAJ TASLAĞI OLUŞTURMA
  // =========================================================================

  async generateAiMessage(companyId: string, dto: GenerateAiMessageDto) {
    const lead = await this.getLead(companyId, dto.leadId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) throw new NotFoundException("Araç bulunamadı.");

    let quoteInfo = "";
    if (dto.quoteId) {
      const q = await this.prisma.leadQuote.findFirst({
        where: { id: dto.quoteId, companyId },
      });
      if (q) {
        quoteInfo = `Teklif Edilen Fiyat: ${Number(q.offeredPrice).toLocaleString("tr-TR")} TL, Ödeme Şekli: ${q.paymentType || "Nakit/Görüşülecek"}`;
      }
    }

    const prompt = `
Sen FilomOnline sisteminde çalışan profesyonel ve müşteri odaklı bir otomotiv satış danışmanısın.
Potansiyel Müşteri Bilgileri:
- Ad Soyad: ${lead.fullName}
- Telefon: ${lead.phone || "Belirtilmemiş"}

İlgilendiği Araç:
- Plaka: ${vehicle.plate}
- Marka / Model: ${vehicle.brandName || ""} ${vehicle.modelName || ""}
- Yıl: ${vehicle.year || ""}
- Kilometre: ${vehicle.km ? `${vehicle.km} km` : "Belirtilmemiş"}
- Yakıt / Vites: ${vehicle.fuelType || ""} / ${vehicle.transmission || ""}
- Liste Fiyatı: ${vehicle.saleAmount ? `${Number(vehicle.saleAmount).toLocaleString("tr-TR")} TL` : ""}
${quoteInfo ? `- Teklif Özeti: ${quoteInfo}` : ""}

Görev:
Müşteriye WhatsApp veya SMS üzerinden gönderilecek;
1. Araç hakkında heyecan verici, profesyonel ve net bir özet sunan,
2. Deneme sürüşü ve kahve ikramı daveti içeren,
3. Samimi ama saygılı bir teklif & bilgilendirme mesajı hazırla.
Sadece mesaj metnini yaz, başında veya sonunda gereksiz açıklama ekleme.
`;

    const aiRes = await this.claude.sendMessage({
      prompt,
      system: "Sen Türkiye'deki seçkin galeriler için çalışan profesyonel bir otomotiv satış ve müşteri ilişkileri uzmanısın.",
      maxTokens: 500,
    });

    return {
      message: aiRes.text,
      model: aiRes.model,
      latencyMs: aiRes.latencyMs,
    };
  }
}
