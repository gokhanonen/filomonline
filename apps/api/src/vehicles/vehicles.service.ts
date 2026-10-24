import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, VehicleOption } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { Paginated } from "../common/dto/pagination.dto";
import { normalizeDomain } from "../catalog/catalog.service";
import {
  CreateVehicleDto,
  QueryVehiclesDto,
  TramerRecordDto,
  UpdateVehicleDto,
  VehiclePhotoDto,
} from "./dto/vehicle.dto";
import { AddListingUrlDto, CreateVehicleOptionDto } from "./dto/vehicle-extras.dto";

const fullInclude = {
  photos: { orderBy: { sortOrder: "asc" } },
  tramerSet: true,
  listingUrls: { orderBy: { createdAt: "desc" } },
  installments: true,
  // Aktif opsiyon (varsa) — kart/detayda "Opsiyonlu" rozeti için
  options: { where: { status: "ACTIVE" }, take: 1 },
} satisfies Prisma.VehicleInclude;

/** Seçilen müşteri adı ile zenginleştirilmiş opsiyon */
export type VehicleOptionView = VehicleOption & { customerName: string | null };

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  create(companyId: string, dto: CreateVehicleDto) {
    const { photos, tramerSet, listingUrls, installments, ...scalars } = dto;
    return this.prisma.vehicle.create({
      data: {
        ...scalars,
        companyId,
        photos: photos?.length ? { create: photos } : undefined,
        tramerSet: tramerSet?.length ? { create: tramerSet } : undefined,
        listingUrls: listingUrls?.length ? { create: listingUrls } : undefined,
        installments: installments?.length
          ? { create: installments }
          : undefined,
      },
      include: fullInclude,
    });
  }

  async findAll(
    companyId: string,
    q: QueryVehiclesDto,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.VehicleWhereInput = {
      companyId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.vehicleTypeId ? { vehicleTypeId: q.vehicleTypeId } : {}),
      ...(q.onlyActive ? { isActive: true } : {}),
      ...(q.search
        ? {
            OR: [
              { plate: { contains: q.search } },
              { brandName: { contains: q.search } },
              { modelName: { contains: q.search } },
              { chassisNo: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          photos: { where: { category: "COVER" }, take: 1 },
          listingUrls: { orderBy: { createdAt: "desc" } },
          options: { where: { status: "ACTIVE" }, take: 1 },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    // Aktif opsiyonların müşteri adlarını tek sorguda çöz
    const customerNames = await this.customerNames(
      companyId,
      vehicles.flatMap((v) => v.options.map((o) => o.customerId)),
    );

    // Kapak için imzalı URL — varsa THUMBNAIL (hızlı), yoksa tam görsel.
    const items = await Promise.all(
      vehicles.map(async (v) => {
        const cover = v.photos[0];
        const coverUrl = cover
          ? await this.storage.presignDownload(cover.thumbKey ?? cover.fileKey)
          : null;
        const { options, ...rest } = v;
        return {
          ...rest,
          coverUrl,
          activeOption: this.viewActiveOption(options[0], customerNames),
        };
      }),
    );

    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: fullInclude,
    });
    if (!vehicle) throw new NotFoundException("Araç bulunamadı");
    const { options, ...rest } = vehicle;
    const names = await this.customerNames(companyId, options.map((o) => o.customerId));
    return { ...rest, activeOption: this.viewActiveOption(options[0], names) };
  }

  // --- İlan linkleri ---

  async listListingUrls(companyId: string, id: string) {
    await this.ensureExists(companyId, id);
    return this.prisma.vehicleListingUrl.findMany({
      where: { vehicleId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  async addListingUrl(companyId: string, id: string, dto: AddListingUrlDto) {
    await this.ensureExists(companyId, id);
    // Kaynak verilmediyse alan adına göre otomatik eşle (tenant'ın ilan kaynakları)
    let listingSourceId = dto.listingSourceId ?? null;
    if (!listingSourceId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { tenantId: true },
      });
      const host = normalizeDomain(dto.url) ?? "";
      const sources = await this.prisma.listingSource.findMany({
        where: { tenantId: company?.tenantId, domainLink: { not: null } },
      });
      listingSourceId =
        sources.find((s) => s.domainLink && host.endsWith(s.domainLink))?.id ?? null;
    }
    await this.prisma.vehicleListingUrl.create({
      data: { vehicleId: id, url: dto.url, listingSourceId },
    });
    return this.listListingUrls(companyId, id);
  }

  async removeListingUrl(companyId: string, id: string, urlId: string) {
    await this.ensureExists(companyId, id);
    const found = await this.prisma.vehicleListingUrl.findFirst({
      where: { id: urlId, vehicleId: id },
    });
    if (!found) throw new NotFoundException("İlan linki bulunamadı");
    await this.prisma.vehicleListingUrl.delete({ where: { id: urlId } });
    return { success: true };
  }

  // --- Opsiyon (kapora / rezervasyon) ---

  async getActiveOption(companyId: string, id: string): Promise<VehicleOptionView | null> {
    await this.ensureExists(companyId, id);
    const opt = await this.prisma.vehicleOption.findFirst({
      where: { vehicleId: id, companyId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!opt) return null;
    // Süresi dolmuşsa tembel olarak EXPIRED'a çek
    if (opt.validUntil < new Date()) {
      await this.prisma.vehicleOption.update({
        where: { id: opt.id },
        data: { status: "EXPIRED" },
      });
      return null;
    }
    const names = await this.customerNames(companyId, [opt.customerId]);
    return { ...opt, customerName: names.get(opt.customerId) ?? null };
  }

  async listOptions(companyId: string, id: string): Promise<VehicleOptionView[]> {
    await this.ensureExists(companyId, id);
    const list = await this.prisma.vehicleOption.findMany({
      where: { vehicleId: id, companyId },
      orderBy: { createdAt: "desc" },
    });
    const names = await this.customerNames(companyId, list.map((o) => o.customerId));
    return list.map((o) => ({ ...o, customerName: names.get(o.customerId) ?? null }));
  }

  async createOption(
    companyId: string,
    userId: string,
    id: string,
    dto: CreateVehicleOptionDto,
  ) {
    await this.ensureExists(companyId, id);
    await this.assertCustomer(companyId, dto.customerId);
    if (dto.validUntil < new Date()) {
      throw new BadRequestException("Geçerlilik tarihi geçmiş olamaz");
    }
    const active = await this.getActiveOption(companyId, id);
    if (active) {
      throw new ConflictException(
        "Bu araç için aktif bir opsiyon zaten var. Önce güncelleyin veya iptal edin.",
      );
    }
    const created = await this.prisma.vehicleOption.create({
      data: {
        companyId,
        vehicleId: id,
        customerId: dto.customerId,
        optionDate: new Date(),
        validUntil: dto.validUntil,
        amount: dto.amount,
        note: dto.note ?? null,
        status: "ACTIVE",
        createdById: userId,
      },
    });
    return this.withName(companyId, created);
  }

  /** Güncelleme: eski kayıt SUPERSEDED olur, yeni ACTIVE kayıt açılır (geçmiş korunur). */
  async updateOption(
    companyId: string,
    userId: string,
    id: string,
    optionId: string,
    dto: CreateVehicleOptionDto,
  ) {
    const old = await this.ensureOption(companyId, id, optionId);
    if (old.status !== "ACTIVE") {
      throw new BadRequestException("Sadece aktif opsiyon güncellenebilir");
    }
    await this.assertCustomer(companyId, dto.customerId);
    if (dto.validUntil < new Date()) {
      throw new BadRequestException("Geçerlilik tarihi geçmiş olamaz");
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const next = await tx.vehicleOption.create({
        data: {
          companyId,
          vehicleId: id,
          customerId: dto.customerId,
          optionDate: new Date(),
          validUntil: dto.validUntil,
          amount: dto.amount,
          note: dto.note ?? null,
          status: "ACTIVE",
          createdById: userId,
        },
      });
      await tx.vehicleOption.update({
        where: { id: optionId },
        data: { status: "SUPERSEDED", updatedById: userId, supersededById: next.id },
      });
      return next;
    });
    return this.withName(companyId, created);
  }

  async cancelOption(companyId: string, userId: string, id: string, optionId: string) {
    const old = await this.ensureOption(companyId, id, optionId);
    if (old.status !== "ACTIVE") {
      throw new BadRequestException("Sadece aktif opsiyon iptal edilebilir");
    }
    await this.prisma.vehicleOption.update({
      where: { id: optionId },
      data: {
        status: "CANCELLED",
        cancelledById: userId,
        cancelledAt: new Date(),
        updatedById: userId,
      },
    });
    return { success: true };
  }

  /**
   * Satış sonrası: aktif opsiyon aynı müşteriyeyse CONVERTED, değilse CANCELLED.
   * InvoicesService satış faturası oluştururken çağırır.
   */
  async settleOptionOnSale(
    companyId: string,
    vehicleId: string,
    customerId: string,
    saleId: string,
  ) {
    const active = await this.prisma.vehicleOption.findFirst({
      where: { vehicleId, companyId, status: "ACTIVE" },
    });
    if (!active) return;
    await this.prisma.vehicleOption.update({
      where: { id: active.id },
      data:
        active.customerId === customerId
          ? { status: "CONVERTED", convertedAt: new Date(), saleId }
          : { status: "CANCELLED", cancelledAt: new Date() },
    });
  }

  // --- yardımcılar ---

  private viewActiveOption(
    opt: VehicleOption | undefined,
    names: Map<string, string>,
  ): VehicleOptionView | null {
    if (!opt) return null;
    if (opt.validUntil < new Date()) return null; // süresi dolmuş: kartta gösterme
    return { ...opt, customerName: names.get(opt.customerId) ?? null };
  }

  private async withName(companyId: string, opt: VehicleOption): Promise<VehicleOptionView> {
    const names = await this.customerNames(companyId, [opt.customerId]);
    return { ...opt, customerName: names.get(opt.customerId) ?? null };
  }

  private async customerNames(companyId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map<string, string>();
    const accounts = await this.prisma.account.findMany({
      where: { companyId, id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(accounts.map((a) => [a.id, a.name]));
  }

  private async assertCustomer(companyId: string, customerId: string) {
    const ok = await this.prisma.account.count({ where: { id: customerId, companyId } });
    if (!ok) throw new BadRequestException("Geçersiz müşteri");
  }

  private async ensureOption(companyId: string, vehicleId: string, optionId: string) {
    const opt = await this.prisma.vehicleOption.findFirst({
      where: { id: optionId, vehicleId, companyId },
    });
    if (!opt) throw new NotFoundException("Opsiyon bulunamadı");
    return opt;
  }

  async update(companyId: string, id: string, dto: UpdateVehicleDto) {
    await this.ensureExists(companyId, id);
    // İç içe koleksiyonlar ayrı endpoint'lerle yönetilir; burada yok sayılır.
    const { photos, tramerSet, listingUrls, installments, ...scalars } = dto;
    void photos;
    void tramerSet;
    void listingUrls;
    void installments;
    return this.prisma.vehicle.update({
      where: { id },
      data: scalars,
      include: fullInclude,
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensureExists(companyId, id);
    await this.prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }

  // --- Fotoğraflar ---

  async addPhotos(companyId: string, id: string, photos: VehiclePhotoDto[]) {
    await this.ensureExists(companyId, id);
    await this.prisma.vehiclePhoto.createMany({
      data: photos.map((p) => ({ ...p, vehicleId: id })),
    });
    return this.findOne(companyId, id);
  }

  async deletePhoto(companyId: string, id: string, photoId: string) {
    await this.ensureExists(companyId, id);
    const photo = await this.prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicleId: id },
    });
    if (!photo) throw new NotFoundException("Fotoğraf bulunamadı");
    await this.prisma.vehiclePhoto.delete({ where: { id: photoId } });
    if (photo.fileKey) await this.storage.delete(photo.fileKey);
    if (photo.thumbKey) await this.storage.delete(photo.thumbKey);
    return { success: true };
  }

  // --- Tramer ---

  async addTramer(companyId: string, id: string, dto: TramerRecordDto) {
    await this.ensureExists(companyId, id);
    return this.prisma.vehicleTramerRecord.create({
      data: {
        vehicleId: id,
        date: dto.date,
        amount: dto.amount,
        description: dto.description,
        photoUrl: dto.photoUrl ?? null,
      },
    });
  }

  async deleteTramer(companyId: string, id: string, tramerId: string) {
    await this.ensureExists(companyId, id);
    const tramer = await this.prisma.vehicleTramerRecord.findFirst({
      where: { id: tramerId, vehicleId: id },
    });
    if (!tramer) throw new NotFoundException("Tramer kaydı bulunamadı");
    await this.prisma.vehicleTramerRecord.delete({ where: { id: tramerId } });
    return { success: true };
  }

  private async ensureExists(companyId: string, id: string) {
    const exists = await this.prisma.vehicle.count({
      where: { id, companyId },
    });
    if (!exists) throw new NotFoundException("Araç bulunamadı");
  }
}
