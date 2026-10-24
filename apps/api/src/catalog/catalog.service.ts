import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateBrandDto,
  CreateModelDto,
  ListingSourceDto,
  SimpleCatalogDto,
  UpdateListingSourceDto,
  UpdateSimpleCatalogDto,
} from "./dto/catalog.dto";
import { seedDefaultsForTenant } from "./catalog-seed.helper";

// İsim bazlı basit katalog varlıkları (hepsi tenant kapsamlı, unique [tenantId,name])
type SimpleEntity = "color" | "bodyType" | "vehicleType" | "vehicleCategory";

/** "https://www.sahibinden.com/x" -> "sahibinden.com" (eşleştirme için sade alan adı) */
export function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0];
  return s || null;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Araç formu için tüm katalogları tek seferde ---
  async all(tenantId: string) {
    const [brands, colors, bodyTypes, vehicleTypes, vehicleCategories, listingSources] =
      await this.prisma.$transaction([
        this.prisma.brand.findMany({
          where: { tenantId },
          orderBy: { name: "asc" },
          include: {
            models: { orderBy: { name: "asc" } },
            category: { select: { id: true, name: true } },
          },
        }),
        this.prisma.color.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
        this.prisma.bodyType.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
        this.prisma.vehicleType.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
        this.prisma.vehicleCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
        this.prisma.listingSource.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } }),
      ]);
    return { brands, colors, bodyTypes, vehicleTypes, vehicleCategories, listingSources };
  }

  // --- İlan kaynakları (Sahibinden, Arabam, DOD...) ---
  listListingSources(tenantId: string) {
    return this.prisma.listingSource.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createListingSource(tenantId: string, dto: ListingSourceDto) {
    const last = await this.prisma.listingSource.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
    });
    return this.prisma.listingSource.create({
      data: {
        tenantId,
        label: dto.label,
        domainLink: normalizeDomain(dto.domainLink),
        iconUrl: dto.iconUrl || null,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
  }

  async updateListingSource(tenantId: string, id: string, dto: UpdateListingSourceDto) {
    const found = await this.prisma.listingSource.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException("İlan kaynağı bulunamadı");
    return this.prisma.listingSource.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.domainLink !== undefined ? { domainLink: normalizeDomain(dto.domainLink) } : {}),
        ...(dto.iconUrl !== undefined ? { iconUrl: dto.iconUrl || null } : {}),
      },
    });
  }

  async removeListingSource(tenantId: string, id: string) {
    const found = await this.prisma.listingSource.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException("İlan kaynağı bulunamadı");
    await this.prisma.listingSource.delete({ where: { id } });
    return { success: true };
  }

  // --- Basit varlıklar (color/bodyType/vehicleType/vehicleCategory) ---
  list(entity: SimpleEntity, tenantId: string) {
    return this.delegate(entity).findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  async create(entity: SimpleEntity, tenantId: string, dto: SimpleCatalogDto) {
    const data: Record<string, unknown> = { tenantId, name: dto.name };
    if (entity === "color" && dto.hex) data.hex = dto.hex;
    try {
      return await this.delegate(entity).create({ data });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(
    entity: SimpleEntity,
    tenantId: string,
    id: string,
    dto: UpdateSimpleCatalogDto,
  ) {
    await this.ensure(entity, tenantId, id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (entity === "color" && dto.hex !== undefined) data.hex = dto.hex;
    try {
      return await this.delegate(entity).update({ where: { id }, data });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async remove(entity: SimpleEntity, tenantId: string, id: string) {
    await this.ensure(entity, tenantId, id);
    await this.delegate(entity).delete({ where: { id } });
    return { success: true };
  }

  // --- Markalar ---
  listBrands(tenantId: string, categoryId?: string) {
    return this.prisma.brand.findMany({
      where: {
        tenantId,
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        models: { orderBy: { name: "asc" } },
        category: { select: { id: true, name: true } },
      },
    });
  }

  async createBrand(tenantId: string, dto: CreateBrandDto) {
    try {
      return await this.prisma.brand.create({
        data: { tenantId, name: dto.name, categoryId: dto.categoryId },
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async updateBrand(tenantId: string, id: string, dto: CreateBrandDto) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException("Marka bulunamadı");
    return this.prisma.brand.update({
      where: { id },
      data: { name: dto.name, categoryId: dto.categoryId },
    });
  }

  async removeBrand(tenantId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException("Marka bulunamadı");
    await this.prisma.brand.delete({ where: { id } });
    return { success: true };
  }

  // --- Modeller ---
  async listModels(tenantId: string, brandId?: string) {
    if (brandId) await this.assertBrand(tenantId, brandId);
    return this.prisma.vehicleModel.findMany({
      where: { brand: { tenantId }, ...(brandId ? { brandId } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async createModel(tenantId: string, dto: CreateModelDto) {
    await this.assertBrand(tenantId, dto.brandId);
    try {
      return await this.prisma.vehicleModel.create({
        data: { brandId: dto.brandId, name: dto.name },
      });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async removeModel(tenantId: string, id: string) {
    const model = await this.prisma.vehicleModel.findFirst({
      where: { id, brand: { tenantId } },
    });
    if (!model) throw new NotFoundException("Model bulunamadı");
    await this.prisma.vehicleModel.delete({ where: { id } });
    return { success: true };
  }

  // --- yardımcılar ---
  private delegate(entity: SimpleEntity) {
    // Prisma delegate'leri farklı tiplerde; katalog için any ile indeksliyoruz.
    return (this.prisma as unknown as Record<string, any>)[entity];
  }

  private async ensure(entity: SimpleEntity, tenantId: string, id: string) {
    const found = await this.delegate(entity).findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException("Kayıt bulunamadı");
  }

  private async assertBrand(tenantId: string, brandId: string) {
    const ok = await this.prisma.brand.count({ where: { id: brandId, tenantId } });
    if (!ok) throw new BadRequestException("Geçersiz marka");
  }

  /** Yeni açılan tenant için varsayılan katalog verilerini otomatik oluşturur */
  seedDefaultsForTenant(tenantId: string) {
    return seedDefaultsForTenant(this.prisma, tenantId);
  }

  private mapError(e: unknown) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return new ConflictException("Bu isim zaten var");
    }
    return e as Error;
  }
}
