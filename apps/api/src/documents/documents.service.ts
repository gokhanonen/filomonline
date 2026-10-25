import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ActivityService } from "../activity/activity.service";
import { CreateDocumentDto, QueryDocumentsDto } from "./dto/document.dto";
import {
  CreateDocumentCategoryDto,
  CreateDocumentTypeDto,
  UpdateDocumentCategoryDto,
  UpdateDocumentTypeDto,
} from "./dto/document-meta.dto";
import { DemoVehicleDocContext } from "./demo-document-generator";

/** Varsayılan evrak yapısı ("Varsayılanları Yükle") */
export const DEFAULT_DOCUMENT_STRUCTURE: {
  value: string;
  label: string;
  module: string;
  types: [string, string][];
}[] = [
  {
    value: "arac",
    label: "Araç Evrakları",
    module: "VEHICLE",
    types: [
      ["ruhsat", "Ruhsat"],
      ["trafik_sigortasi", "Trafik Sigortası"],
      ["kasko", "Kasko"],
      ["muayene", "Araç Muayene Belgesi"],
      ["ekspertiz", "Ekspertiz Raporu"],
      ["noter_alis", "Noter Alış Evrakı"],
      ["noter_satis", "Noter Satış Evrakı"],
      ["k_belgesi", "K Belgesi"],
      ["sigorta", "Sigorta Poliçesi"],
      ["diger", "Diğer"],
    ],
  },
  {
    value: "musteri",
    label: "Müşteri Evrakları",
    module: "CUSTOMER,VEHICLE",
    types: [
      ["kimlik", "Kimlik Fotokopisi"],
      ["ehliyet", "Sürücü Belgesi / Ehliyet"],
      ["vekaletname", "Vekaletname"],
      ["vergi_levhasi", "Vergi Levhası"],
      ["imza_sirkuleri", "İmza Sirküleri"],
      ["faaliyet_belgesi", "Faaliyet Belgesi"],
    ],
  },
  {
    value: "sozlesme",
    label: "Sözleşmeler",
    module: "CONTRACT,VEHICLE",
    types: [
      ["satis_sozlesmesi", "Satış Sözleşmesi"],
      ["kira_sozlesmesi", "Kira Sözleşmesi"],
      ["teslim_tutanagi", "Araç Teslim Tutanağı"],
      ["rezerve_protokolu", "Opsiyon / Kapora Protokolü"],
    ],
  },
  {
    value: "fatura",
    label: "Fatura & Ödeme",
    module: "INVOICE,VEHICLE",
    types: [
      ["alis_faturasi", "Alış Faturası"],
      ["satis_faturasi", "Satış Faturası"],
      ["banka_dekontu", "Banka Dekontu"],
      ["gider_pusulasi", "Gider Pusulası"],
    ],
  },
];

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
  ) {}

  /** Kategori + tipleri (dropdown için, opsiyonel modül filtresiyle) */
  meta(tenantId: string, module?: string) {
    return this.prisma.documentCategory.findMany({
      where: {
        tenantId,
        ...(module
          ? {
              OR: [
                { module: "ALL" },
                { module: { contains: module } },
              ],
            }
          : {}),
      },
      orderBy: { sortOrder: "asc" },
      include: { types: { orderBy: { sortOrder: "asc" } } },
    });
  }

  // --- Kategori / tip yönetimi (tenant kapsamlı) ---

  async createCategory(tenantId: string, dto: CreateDocumentCategoryDto) {
    try {
      return await this.prisma.documentCategory.create({
        data: {
          tenantId,
          value: dto.value,
          label: dto.label,
          module: dto.module || "ALL",
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateDocumentCategoryDto) {
    await this.ensureCategory(tenantId, id);
    return this.prisma.documentCategory.update({ where: { id }, data: dto });
  }

  async removeCategory(tenantId: string, id: string) {
    await this.ensureCategory(tenantId, id);
    const used = await this.prisma.document.count({ where: { categoryId: id } });
    if (used) throw new BadRequestException("Bu kategoride kayıtlı evrak var, silinemez");
    await this.prisma.documentCategory.delete({ where: { id } });
    return { success: true };
  }

  async createType(tenantId: string, dto: CreateDocumentTypeDto) {
    await this.ensureCategory(tenantId, dto.categoryId);
    try {
      return await this.prisma.documentType.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          value: dto.value,
          label: dto.label,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async updateType(tenantId: string, id: string, dto: UpdateDocumentTypeDto) {
    await this.ensureType(tenantId, id);
    return this.prisma.documentType.update({ where: { id }, data: dto });
  }

  async removeType(tenantId: string, id: string) {
    await this.ensureType(tenantId, id);
    const used = await this.prisma.document.count({ where: { typeId: id } });
    if (used) throw new BadRequestException("Bu tipte kayıtlı evrak var, silinemez");
    await this.prisma.documentType.delete({ where: { id } });
    return { success: true };
  }

  /** Eksik varsayılan kategori/tipleri ekler (idempotent) */
  async loadDefaults(tenantId: string) {
    let created = 0;
    for (const [ci, cat] of DEFAULT_DOCUMENT_STRUCTURE.entries()) {
      let category = await this.prisma.documentCategory.findFirst({
        where: { tenantId, value: cat.value },
      });
      if (!category) {
        category = await this.prisma.documentCategory.create({
          data: {
            tenantId,
            value: cat.value,
            label: cat.label,
            module: cat.module || "ALL",
            sortOrder: ci + 1,
          },
        });
        created++;
      } else {
        await this.prisma.documentCategory.update({
          where: { id: category.id },
          data: { module: cat.module || "ALL" },
        });
      }
      for (const [ti, [value, label]] of cat.types.entries()) {
        const exists = await this.prisma.documentType.findFirst({
          where: { categoryId: category.id, value },
        });
        if (!exists) {
          await this.prisma.documentType.create({
            data: { tenantId, categoryId: category.id, value, label, sortOrder: ti + 1 },
          });
          created++;
        }
      }
    }
    return { created, categories: await this.meta(tenantId) };
  }

  private async ensureCategory(tenantId: string, id: string) {
    const c = await this.prisma.documentCategory.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException("Evrak kategorisi bulunamadı");
    return c;
  }

  private async ensureType(tenantId: string, id: string) {
    const t = await this.prisma.documentType.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException("Evrak tipi bulunamadı");
    return t;
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return new ConflictException("Bu değer (value) zaten tanımlı");
    }
    return e as Error;
  }

  // --- Dokümanlar ---

  async list(companyId: string, q: QueryDocumentsDto) {
    const docs = await this.prisma.document.findMany({
      where: {
        companyId,
        referenceType: q.referenceType,
        referenceId: q.referenceId,
      },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      docs.map(async (d) => {
        let url: string;
        let thumbUrl: string | null = null;
        if (d.fileKey.startsWith("demo-doc:")) {
          url = `/api/v1/documents/view/${d.id}`;
          thumbUrl = `/api/v1/documents/thumb/${d.id}`;
        } else if (d.fileKey.startsWith("http://") || d.fileKey.startsWith("https://")) {
          url = d.fileKey;
          thumbUrl = d.thumbKey ?? d.fileKey;
        } else {
          url = await this.storage.presignDownload(d.fileKey).catch(() => "");
          thumbUrl = d.thumbKey ? await this.storage.presignDownload(d.thumbKey).catch(() => null) : null;
        }
        return {
          ...d,
          url,
          thumbUrl,
        };
      }),
    );
  }

  async getDocumentWithVehicle(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Doküman bulunamadı");

    let vehicle: any = null;
    let company: any = null;
    if (doc.referenceType === "VEHICLE" && doc.referenceId) {
      vehicle = await this.prisma.vehicle.findUnique({
        where: { id: doc.referenceId },
      });
    }
    if (doc.companyId) {
      company = await this.prisma.company.findUnique({
        where: { id: doc.companyId },
      });
    }

    const typeParts = doc.fileKey.split(":");
    const docType = (typeParts[1] || "ruhsat") as any;

    const ctx: DemoVehicleDocContext = {
      plate: vehicle?.plate || "34 PLK 01",
      brandName: vehicle?.brandName || "",
      modelName: vehicle?.modelName || "",
      year: vehicle?.year || 2023,
      colorName: vehicle?.colorName || "Beyaz",
      fuelType: vehicle?.fuelType || "BENZIN",
      chassisNo: vehicle?.chassisNo || "WBA5A51080G12894",
      engineNo: vehicle?.engineNo || "ENG291824",
      km: vehicle?.km || 45000,
      engineVolume: vehicle?.engineVolume || 1597,
      horsePower: vehicle?.horsePower || 170,
      companyName: company?.name || "Demo Otomotiv A.Ş.",
      purchasePrice: vehicle?.purchasePrice ? Number(vehicle.purchasePrice) : 1850000,
      docType,
      documentNo: doc.description || doc.fileName,
      expiryDate: doc.expiryDate || undefined,
    };

    return { doc, vehicle, ctx };
  }

  async create(companyId: string, userId: string, dto: CreateDocumentDto) {
    const doc = await this.prisma.document.create({
      data: { ...dto, companyId, uploadedById: userId },
    });

    void this.activity.log({
      companyId,
      userId,
      type: "DOCUMENT_NEW",
      title: `Yeni Evrak: ${doc.fileName || "Evrak Yüklendi"}`,
      description: `${doc.referenceType} (${doc.referenceId}) için evrak yüklendi`,
      entityType: "document",
      entityId: doc.id,
      link: doc.referenceType === "VEHICLE" ? `/vehicles/${doc.referenceId}` : "/vehicles",
    });

    return doc;
  }

  async remove(companyId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, companyId } });
    if (!doc) throw new NotFoundException("Doküman bulunamadı");
    await this.prisma.document.delete({ where: { id } });
    if (doc.fileKey) await this.storage.delete(doc.fileKey);
    if (doc.thumbKey) await this.storage.delete(doc.thumbKey);
    return { success: true };
  }
}
