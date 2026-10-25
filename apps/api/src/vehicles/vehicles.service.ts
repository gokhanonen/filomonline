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
import {
  CreateVehicleTransferDto,
  ReturnFromExternalDto,
  SetInitialLocationDto,
} from "./dto/vehicle-transfer.dto";
import { CreateVehicleShareLinkDto } from "./dto/vehicle-share.dto";
import { randomBytes } from "crypto";
import { ActivityService } from "../activity/activity.service";
import { ClaudeService } from "../ai/claude.service";

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
    private readonly activity: ActivityService,
    private readonly claude: ClaudeService,
  ) {}

  async ocrRegistration(body: { imageBase64: string; mediaType?: string }) {
    if (!body.imageBase64) {
      throw new BadRequestException("Görsel verisi zorunludur.");
    }
    const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const mediaType = (body.mediaType as any) || "image/jpeg";

    const res = await this.claude.assist({
      prompt: "Bu araç ruhsatındaki plaka, marka, model, model yılı, şasi/vin no, motor no, renk, yakıt tipi ve vites bilgilerini oku.",
      image: {
        mediaType,
        base64Data: cleanBase64,
      },
      docTypeHint: "RUHSAT",
    });

    return res.data?.registration || null;
  }

  async create(companyId: string, dto: CreateVehicleDto) {
    const { photos, tramerSet, listingUrls, installments, ...scalars } = dto;
    const vehicle = await this.prisma.vehicle.create({
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

    if (dto.purchaseLocationId) {
      await this.prisma.vehicleLocationState
        .create({
          data: {
            companyId,
            vehicleId: vehicle.id,
            currentLocationId: dto.purchaseLocationId,
            status: "AT_LOCATION",
          },
        })
        .catch(() => void 0);

      await this.prisma.vehicleTransfer
        .create({
          data: {
            companyId,
            vehicleId: vehicle.id,
            fromLocationId: "",
            toLocationId: dto.purchaseLocationId,
            status: "CONFIRMED",
            initiatedById: "system",
            confirmedById: "system",
            confirmedAt: new Date(),
            notes: "Başlangıç lokasyonu ataması",
          },
        })
        .catch(() => void 0);
    }

    void this.activity.log({
      companyId,
      type: "VEHICLE_NEW",
      title: `Yeni Araç: ${vehicle.plate || vehicle.brandName || "Araç"}`,
      description: `${vehicle.brandName ?? ""} ${vehicle.modelName ?? ""} araç envanterine kaydedildi.`,
      entityType: "vehicle",
      entityId: vehicle.id,
      link: `/vehicles/${vehicle.id}`,
    });

    return vehicle;
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
        let coverUrl: string | null = null;
        if (cover) {
          if (cover.url && (cover.url.startsWith("http") || cover.url.startsWith("data:"))) {
            coverUrl = cover.url;
          } else if (cover.thumbKey && (cover.thumbKey.startsWith("http") || cover.thumbKey.startsWith("data:"))) {
            coverUrl = cover.thumbKey;
          } else if (cover.fileKey && (cover.fileKey.startsWith("http") || cover.fileKey.startsWith("data:"))) {
            coverUrl = cover.fileKey;
          } else {
            coverUrl = await this.storage.presignDownload(cover.thumbKey ?? cover.fileKey).catch(() => null);
          }
        }
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
    const result = await this.withName(companyId, created);
    const v = await this.prisma.vehicle.findUnique({ where: { id }, select: { plate: true } });
    void this.activity.log({
      companyId,
      userId,
      type: "VEHICLE_OPTION",
      title: `Araç Opsiyonlandı: ${v?.plate ?? id}`,
      description: `${result.customerName ?? "Müşteri"} adına ${created.amount ? Number(created.amount).toLocaleString("tr-TR") + " ₺ ile " : ""}opsiyon oluşturuldu.`,
      entityType: "vehicle",
      entityId: id,
      link: `/vehicles/${id}`,
    });
    return result;
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
    const v = await this.prisma.vehicle.findUnique({ where: { id }, select: { plate: true } });
    void this.activity.log({
      companyId,
      userId,
      type: "VEHICLE_OPTION_CANCEL",
      title: `Opsiyon İptal Edildi: ${v?.plate ?? id}`,
      description: `Aracın opsiyonu kaldırıldı ve araç tekrar boşa çıkarıldı.`,
      entityType: "vehicle",
      entityId: id,
      link: `/vehicles/${id}`,
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
    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: scalars,
      include: fullInclude,
    });
    void this.activity.log({
      companyId,
      type: "VEHICLE_UPDATE",
      title: `Araç Güncellendi: ${updated.plate || updated.brandName || "Araç"}`,
      description: `${updated.brandName ?? ""} ${updated.modelName ?? ""} araç kartı bilgileri güncellendi.`,
      entityType: "vehicle",
      entityId: updated.id,
      link: `/vehicles/${updated.id}`,
    });
    return updated;
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      select: { id: true, plate: true },
    });
    if (!existing) throw new NotFoundException("Araç bulunamadı");
    await this.prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
    void this.activity.log({
      companyId,
      type: "VEHICLE_UPDATE",
      title: `Araç Pasife Alındı: ${existing.plate || "Araç"}`,
      description: `Araç envanterden pasifleştirildi.`,
      entityType: "vehicle",
      entityId: id,
      link: `/vehicles`,
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

  // --- Lokasyon & Transfer Modülü ---

  async getVehicleLocation(companyId: string, vehicleId: string) {
    await this.ensureExists(companyId, vehicleId);

    let state = await this.prisma.vehicleLocationState.findUnique({
      where: { vehicleId },
    });

    // Eğer henüz state kaydı yoksa ama araçta purchaseLocationId varsa, otomatik state oluştur
    if (!state) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { purchaseLocationId: true },
      });
      if (vehicle?.purchaseLocationId) {
        const locExists = await this.prisma.location.findFirst({
          where: { id: vehicle.purchaseLocationId, companyId },
        });
        if (locExists) {
          state = await this.prisma.vehicleLocationState.create({
            data: {
              companyId,
              vehicleId,
              currentLocationId: vehicle.purchaseLocationId,
              status: "AT_LOCATION",
            },
          });
          await this.prisma.vehicleTransfer
            .create({
              data: {
                companyId,
                vehicleId,
                fromLocationId: "",
                toLocationId: vehicle.purchaseLocationId,
                status: "CONFIRMED",
                initiatedById: "system",
                confirmedById: "system",
                confirmedAt: new Date(),
                notes: "Başlangıç lokasyonu ataması",
              },
            })
            .catch(() => void 0);
        }
      }
    }

    if (!state) {
      return { status: "NO_LOCATION" as const };
    }

    const [currentLocation, pendingTransfer] = await Promise.all([
      this.prisma.location.findFirst({
        where: { id: state.currentLocationId, companyId },
      }),
      state.pendingTransferId
        ? this.prisma.vehicleTransfer.findFirst({
            where: { id: state.pendingTransferId, companyId },
          })
        : null,
    ]);

    let targetLocation = null;
    let supplier = null;
    let returnLocation = null;

    if (pendingTransfer) {
      if (pendingTransfer.toLocationId) {
        targetLocation = await this.prisma.location.findFirst({
          where: { id: pendingTransfer.toLocationId, companyId },
        });
      }
      if (pendingTransfer.supplierId) {
        supplier = await this.prisma.account.findFirst({
          where: { id: pendingTransfer.supplierId, companyId },
          select: { id: true, name: true, phone: true },
        });
      }
      if (pendingTransfer.returnLocationId) {
        returnLocation = await this.prisma.location.findFirst({
          where: { id: pendingTransfer.returnLocationId, companyId },
        });
      }
    } else if (state.supplierId) {
      supplier = await this.prisma.account.findFirst({
        where: { id: state.supplierId, companyId },
        select: { id: true, name: true, phone: true },
      });
    }

    return {
      status: state.status,
      currentLocation,
      targetLocation,
      supplier,
      returnLocation,
      pendingTransfer,
    };
  }

  async getTransferHistory(companyId: string, vehicleId: string) {
    await this.ensureExists(companyId, vehicleId);

    const transfers = await this.prisma.vehicleTransfer.findMany({
      where: { companyId, vehicleId },
      orderBy: { initiatedAt: "desc" },
    });

    const locationIds = Array.from(
      new Set(
        transfers
          .flatMap((t) => [t.fromLocationId, t.toLocationId, t.returnLocationId])
          .filter(Boolean) as string[],
      ),
    );
    const userIds = Array.from(
      new Set(
        transfers
          .flatMap((t) => [t.initiatedById, t.confirmedById, t.cancelledById])
          .filter((x): x is string => !!x && x !== "system"),
      ),
    );
    const supplierIds = Array.from(
      new Set(transfers.map((t) => t.supplierId).filter(Boolean) as string[]),
    );

    const [locations, users, accounts] = await Promise.all([
      locationIds.length
        ? this.prisma.location.findMany({
            where: { id: { in: locationIds }, companyId },
            select: { id: true, name: true, code: true, city: true, isExternal: true },
          })
        : [],
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : [],
      supplierIds.length
        ? this.prisma.account.findMany({
            where: { id: { in: supplierIds }, companyId },
            select: { id: true, name: true, phone: true },
          })
        : [],
    ]);

    const locMap = new Map(locations.map((l) => [l.id, l]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const accMap = new Map(accounts.map((a) => [a.id, a]));

    return transfers.map((t) => ({
      ...t,
      fromLocation: t.fromLocationId ? locMap.get(t.fromLocationId) ?? null : null,
      toLocation: locMap.get(t.toLocationId) ?? null,
      returnLocation: t.returnLocationId ? locMap.get(t.returnLocationId) ?? null : null,
      supplier: t.supplierId ? accMap.get(t.supplierId) ?? null : null,
      initiatedByUser:
        t.initiatedById === "system"
          ? { id: "system", name: "Sistem", email: "" }
          : userMap.get(t.initiatedById) ?? null,
      confirmedByUser:
        t.confirmedById === "system"
          ? { id: "system", name: "Sistem", email: "" }
          : t.confirmedById
            ? userMap.get(t.confirmedById) ?? null
            : null,
      cancelledByUser: t.cancelledById ? userMap.get(t.cancelledById) ?? null : null,
    }));
  }

  async createTransfer(
    companyId: string,
    userId: string,
    vehicleId: string,
    dto: CreateVehicleTransferDto,
  ) {
    await this.ensureExists(companyId, vehicleId);

    const targetLoc = await this.prisma.location.findFirst({
      where: { id: dto.toLocationId, companyId },
    });
    if (!targetLoc) {
      throw new BadRequestException("Hedef lokasyon bulunamadı");
    }

    let state = await this.prisma.vehicleLocationState.findUnique({
      where: { vehicleId },
    });

    // İlk atama (araçta henüz kayıtlı lokasyon yoksa)
    if (!state) {
      state = await this.prisma.vehicleLocationState.create({
        data: {
          companyId,
          vehicleId,
          currentLocationId: dto.toLocationId,
          status: "AT_LOCATION",
        },
      });

      const transfer = await this.prisma.vehicleTransfer.create({
        data: {
          companyId,
          vehicleId,
          fromLocationId: "",
          toLocationId: dto.toLocationId,
          status: "CONFIRMED",
          initiatedById: userId,
          initiatedAt: new Date(),
          confirmedById: userId,
          confirmedAt: new Date(),
          notes: dto.notes ?? "İlk lokasyon ataması",
          isExternalTransfer: false,
        },
      });

      await this.prisma.vehicle
        .update({
          where: { id: vehicleId },
          data: { purchaseLocationId: dto.toLocationId },
        })
        .catch(() => void 0);

      return {
        success: true,
        isInitial: true,
        transferId: transfer.id,
        currentLocationId: dto.toLocationId,
        message: "İlk lokasyon başarıyla atandı",
      };
    }

    if (state.status === "IN_TRANSFER") {
      throw new BadRequestException(
        "Bu araç için bekleyen bir transfer var. Önce mevcut transferi tamamlayın veya iptal edin.",
      );
    }
    if (state.status === "AT_EXTERNAL") {
      throw new BadRequestException(
        "Araç şu anda dış lokasyonda. Önce dönüş işlemini gerçekleştirin.",
      );
    }
    if (state.currentLocationId === dto.toLocationId) {
      throw new BadRequestException("Araç zaten seçilen lokasyonda.");
    }

    // Hedef lokasyon dış lokasyon ise (kaporta, boyacı vs.)
    if (targetLoc.isExternal) {
      if (!dto.supplierId) {
        throw new BadRequestException(
          "Dış lokasyon için tedarikçi / cari seçimi zorunludur",
        );
      }
      if (!dto.returnLocationId) {
        throw new BadRequestException(
          "Dış lokasyon için dönüş lokasyonu zorunludur",
        );
      }

      const transfer = await this.prisma.vehicleTransfer.create({
        data: {
          companyId,
          vehicleId,
          fromLocationId: state.currentLocationId,
          toLocationId: dto.toLocationId,
          status: "CONFIRMED", // Dış lokasyona gönderim otomatik onaylanır
          initiatedById: userId,
          initiatedAt: new Date(),
          confirmedById: userId,
          confirmedAt: new Date(),
          notes: dto.notes,
          isExternalTransfer: true,
          supplierId: dto.supplierId,
          returnLocationId: dto.returnLocationId,
        },
      });

      await this.prisma.vehicleLocationState.update({
        where: { vehicleId },
        data: {
          currentLocationId: dto.toLocationId,
          status: "AT_EXTERNAL",
          pendingTransferId: transfer.id,
          supplierId: dto.supplierId,
        },
      });

      return {
        success: true,
        transferId: transfer.id,
        status: "AT_EXTERNAL",
        message: "Araç dış lokasyona sevk edildi",
      };
    }

    // İç lokasyon transferi - Doğrudan taşıma
    if (dto.isDirect) {
      const transfer = await this.prisma.vehicleTransfer.create({
        data: {
          companyId,
          vehicleId,
          fromLocationId: state.currentLocationId,
          toLocationId: dto.toLocationId,
          status: "CONFIRMED",
          initiatedById: userId,
          initiatedAt: new Date(),
          confirmedById: userId,
          confirmedAt: new Date(),
          notes: dto.notes,
          isExternalTransfer: false,
        },
      });

      await this.prisma.vehicleLocationState.update({
        where: { vehicleId },
        data: {
          currentLocationId: dto.toLocationId,
          status: "AT_LOCATION",
          pendingTransferId: null,
          supplierId: null,
        },
      });

      return {
        success: true,
        transferId: transfer.id,
        status: "AT_LOCATION",
        message: "Araç yeni lokasyona doğrudan taşındı",
      };
    }

    // Normal teslim-tesellüm onay süreci
    const transfer = await this.prisma.vehicleTransfer.create({
      data: {
        companyId,
        vehicleId,
        fromLocationId: state.currentLocationId,
        toLocationId: dto.toLocationId,
        status: "PENDING",
        initiatedById: userId,
        initiatedAt: new Date(),
        notes: dto.notes,
        isExternalTransfer: false,
      },
    });

    await this.prisma.vehicleLocationState.update({
      where: { vehicleId },
      data: {
        status: "IN_TRANSFER",
        pendingTransferId: transfer.id,
      },
    });

    return {
      success: true,
      transferId: transfer.id,
      status: "IN_TRANSFER",
      message: "Transfer süreci başlatıldı (Teslim alma onayı bekliyor)",
    };
  }

  async confirmTransfer(
    companyId: string,
    userId: string,
    vehicleId: string,
    transferId: string,
  ) {
    await this.ensureExists(companyId, vehicleId);

    const transfer = await this.prisma.vehicleTransfer.findFirst({
      where: { id: transferId, companyId, vehicleId },
    });
    if (!transfer) {
      throw new NotFoundException("Transfer kaydı bulunamadı");
    }
    if (transfer.status !== "PENDING") {
      throw new BadRequestException("Bu transfer zaten sonuçlandırılmış");
    }

    await this.prisma.vehicleTransfer.update({
      where: { id: transferId },
      data: {
        status: "CONFIRMED",
        confirmedById: userId,
        confirmedAt: new Date(),
      },
    });

    await this.prisma.vehicleLocationState.update({
      where: { vehicleId },
      data: {
        currentLocationId: transfer.toLocationId,
        status: "AT_LOCATION",
        pendingTransferId: null,
      },
    });

    return { success: true, message: "Araç teslim alındı ve transfer onaylandı" };
  }

  async cancelTransfer(
    companyId: string,
    userId: string,
    vehicleId: string,
    transferId: string,
  ) {
    await this.ensureExists(companyId, vehicleId);

    const transfer = await this.prisma.vehicleTransfer.findFirst({
      where: { id: transferId, companyId, vehicleId },
    });
    if (!transfer) {
      throw new NotFoundException("Transfer kaydı bulunamadı");
    }
    if (transfer.status !== "PENDING") {
      throw new BadRequestException("Bu transfer zaten sonuçlandırılmış");
    }

    await this.prisma.vehicleTransfer.update({
      where: { id: transferId },
      data: {
        status: "CANCELLED",
        cancelledById: userId,
        cancelledAt: new Date(),
      },
    });

    await this.prisma.vehicleLocationState.update({
      where: { vehicleId },
      data: {
        status: "AT_LOCATION",
        pendingTransferId: null,
      },
    });

    return { success: true, message: "Transfer iptal edildi" };
  }

  async returnFromExternal(
    companyId: string,
    userId: string,
    vehicleId: string,
    dto: ReturnFromExternalDto,
  ) {
    await this.ensureExists(companyId, vehicleId);

    const state = await this.prisma.vehicleLocationState.findUnique({
      where: { vehicleId },
    });
    if (!state || state.status !== "AT_EXTERNAL") {
      throw new BadRequestException("Araç dış lokasyonda değil");
    }

    let returnLocId = dto.returnLocationId;
    if (!returnLocId && state.pendingTransferId) {
      const orig = await this.prisma.vehicleTransfer.findUnique({
        where: { id: state.pendingTransferId },
      });
      returnLocId = orig?.returnLocationId ?? undefined;
    }

    if (!returnLocId) {
      throw new BadRequestException("Dönüş lokasyonu belirtilmelidir");
    }

    const returnLoc = await this.prisma.location.findFirst({
      where: { id: returnLocId, companyId },
    });
    if (!returnLoc) {
      throw new BadRequestException("Dönüş lokasyonu bulunamadı");
    }

    const returnTransfer = await this.prisma.vehicleTransfer.create({
      data: {
        companyId,
        vehicleId,
        fromLocationId: state.currentLocationId,
        toLocationId: returnLocId,
        status: "CONFIRMED",
        initiatedById: userId,
        initiatedAt: new Date(),
        confirmedById: userId,
        confirmedAt: new Date(),
        notes: dto.notes ?? "Dış lokasyondan dönüş",
        isExternalTransfer: false,
      },
    });

    await this.prisma.vehicleLocationState.update({
      where: { vehicleId },
      data: {
        currentLocationId: returnLocId,
        status: "AT_LOCATION",
        pendingTransferId: null,
        supplierId: null,
      },
    });

    return {
      success: true,
      transferId: returnTransfer.id,
      message: "Araç dış lokasyondan başarıyla teslim alındı",
    };
  }

  private async ensureExists(companyId: string, id: string) {
    const exists = await this.prisma.vehicle.count({
      where: { id, companyId },
    });
    if (!exists) throw new NotFoundException("Araç bulunamadı");
  }

  // --- Dış Paylaşım Bağlantıları (Public Share Links) ---

  async getOrCreateShareLink(
    companyId: string,
    vehicleId: string,
    dto?: CreateVehicleShareLinkDto,
  ) {
    await this.ensureExists(companyId, vehicleId);

    // Eğer özel fiyat veya özel ayar gönderilmediyse mevcut aktif varsayılan linki getir
    const isCustom = Boolean(
      dto?.title ||
        dto?.hidePlate ||
        dto?.customPrice !== undefined ||
        dto?.customNote,
    );

    if (!isCustom) {
      const existing = await this.prisma.vehicleShareLink.findFirst({
        where: { vehicleId, companyId, isActive: true, customPrice: null },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return existing;
      }
    }

    // Yeni benzersiz token üret (12 karakter hex)
    const token = randomBytes(6).toString("hex");

    const link = await this.prisma.vehicleShareLink.create({
      data: {
        vehicleId,
        companyId,
        token,
        title: dto?.title?.trim() || null,
        hidePlate: dto?.hidePlate ?? false,
        customPrice:
          dto?.customPrice !== undefined
            ? new Prisma.Decimal(dto.customPrice)
            : null,
        customNote: dto?.customNote?.trim() || null,
        isActive: true,
      },
    });

    // Aracın ana shareToken alanını da güncelle (eğer henüz boşsa)
    await this.prisma.vehicle
      .update({
        where: { id: vehicleId },
        data: { shareToken: token },
      })
      .catch(() => void 0);

    return link;
  }

  async listShareLinks(companyId: string, vehicleId: string) {
    await this.ensureExists(companyId, vehicleId);
    return this.prisma.vehicleShareLink.findMany({
      where: { vehicleId, companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async toggleShareLink(
    companyId: string,
    vehicleId: string,
    linkId: string,
    isActive: boolean,
  ) {
    await this.ensureExists(companyId, vehicleId);
    const link = await this.prisma.vehicleShareLink.findFirst({
      where: { id: linkId, vehicleId, companyId },
    });
    if (!link) throw new NotFoundException("Paylaşım bağlantısı bulunamadı");

    return this.prisma.vehicleShareLink.update({
      where: { id: linkId },
      data: { isActive },
    });
  }

  async deleteShareLink(
    companyId: string,
    vehicleId: string,
    linkId: string,
  ) {
    await this.ensureExists(companyId, vehicleId);
    const link = await this.prisma.vehicleShareLink.findFirst({
      where: { id: linkId, vehicleId, companyId },
    });
    if (!link) throw new NotFoundException("Paylaşım bağlantısı bulunamadı");

    await this.prisma.vehicleShareLink.delete({ where: { id: linkId } });
    return { success: true };
  }

  /**
   * Login gerekmeksizin dışlink ile araç bilgilerini sorgular.
   * Kural: Araç satıldığında (SATILDI) link otomatik olarak devre dışı (disabled) kalır!
   */
  async getPublicVehicleByToken(token: string) {
    if (!token || typeof token !== "string") {
      throw new NotFoundException("Geçersiz paylaşım bağlantısı");
    }

    // 1. Önce VehicleShareLink tablosundan token ara
    let shareLink = await this.prisma.vehicleShareLink.findUnique({
      where: { token },
    });

    let vehicleId = shareLink?.vehicleId;

    // 2. Bulunamadıysa aracın birincil shareToken veya ID'si üzerinden ara
    if (!vehicleId) {
      const fallbackVehicle = await this.prisma.vehicle.findFirst({
        where: { OR: [{ shareToken: token }, { id: token }] },
        select: { id: true },
      });
      if (fallbackVehicle) {
        vehicleId = fallbackVehicle.id;
      }
    }

    if (!vehicleId) {
      throw new NotFoundException("Paylaşım bağlantısı veya araç bulunamadı");
    }

    // 3. Aracı ve şirket bilgilerini çek
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        tramerSet: { orderBy: { date: "desc" } },
        options: { where: { status: "ACTIVE" } },
      },
    });

    if (!vehicle) {
      throw new NotFoundException("Araç bulunamadı");
    }

    const company = await this.prisma.company.findUnique({
      where: { id: vehicle.companyId },
      select: {
        id: true,
        name: true,
        legalName: true,
        phone: true,
        email: true,
        address: true,
        logoUrl: true,
      },
    });

    let companyLogo = company?.logoUrl;
    if (companyLogo && !companyLogo.startsWith("http")) {
      companyLogo = await this.storage
        .presignDownload(companyLogo)
        .catch(() => company?.logoUrl || null);
    }

    const hidePlate = shareLink?.hidePlate ?? false;
    const displayedPlate = hidePlate ? this.maskPlate(vehicle.plate) : vehicle.plate;

    // --- KRİTİK KURAL: Araç satılmış ise link devre dışı kalır ---
    if (vehicle.status === "SATILDI") {
      return {
        status: "disabled",
        reason: "SOLD",
        message:
          "Bu aracın satışı tamamlandığı için ilan yayından kaldırılmıştır.",
        vehicleSummary: {
          brandName: vehicle.brandName,
          modelName: vehicle.modelName,
          year: vehicle.year,
          plate: displayedPlate,
        },
        company: company
          ? {
              name: company.name,
              phone: company.phone,
              logoUrl: companyLogo,
              address: company.address,
            }
          : null,
      };
    }

    // Manuel olarak kapatılmış link kontrolü
    if (shareLink && !shareLink.isActive) {
      return {
        status: "disabled",
        reason: "INACTIVE",
        message: "Bu paylaşım bağlantısı kapatılmıştır.",
        company: company
          ? {
              name: company.name,
              phone: company.phone,
              logoUrl: companyLogo,
              address: company.address,
            }
          : null,
      };
    }

    // Görüntülenme sayısını artır (asenkron arka plan)
    if (shareLink) {
      this.prisma.vehicleShareLink
        .update({
          where: { id: shareLink.id },
          data: {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
          },
        })
        .catch(() => void 0);
    }

    // Fotoğraf URL'lerini hazırla
    const resolvedPhotos = await Promise.all(
      vehicle.photos.map(async (p) => {
        let url = p.url;
        let thumbUrl = p.thumbUrl;
        if (!url && p.fileKey) {
          url = await this.storage.presignDownload(p.fileKey).catch(() => null);
        }
        if (!thumbUrl && (p.thumbKey || p.fileKey)) {
          thumbUrl = await this.storage
            .presignDownload(p.thumbKey ?? p.fileKey)
            .catch(() => null);
        }
        return {
          id: p.id,
          category: p.category,
          url: url ?? thumbUrl,
          thumbUrl: thumbUrl ?? url,
          sortOrder: p.sortOrder,
        };
      }),
    );

    const price =
      shareLink?.customPrice != null
        ? Number(shareLink.customPrice)
        : vehicle.listPrice != null
          ? Number(vehicle.listPrice)
          : null;

    return {
      status: "active",
      token,
      title: shareLink?.title ?? null,
      customNote: shareLink?.customNote ?? null,
      hidePlate,
      vehicle: {
        id: vehicle.id,
        plate: displayedPlate,
        brandName: vehicle.brandName,
        modelName: vehicle.modelName,
        year: vehicle.year,
        km: vehicle.km,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        colorName: vehicle.colorName,
        horsePower: vehicle.horsePower,
        enginePower: vehicle.enginePower,
        engineVolume: vehicle.engineVolume,
        driveType: vehicle.driveType,
        bodyTypeId: vehicle.bodyTypeId,
        warranty: vehicle.warranty,
        spareKey: vehicle.spareKey,
        heavyDamage: vehicle.heavyDamage,
        notes: vehicle.notes,
        listPrice: price,
        photos: resolvedPhotos,
        tramerSet: vehicle.tramerSet.map((t) => ({
          id: t.id,
          date: t.date,
          amount: Number(t.amount),
          description: t.description,
        })),
        isReserved: vehicle.options.length > 0,
        options: vehicle.options.map((o) => ({
          id: o.id,
          status: o.status,
          note: o.note,
        })),
      },
      company: company
        ? {
            name: company.name,
            legalName: company.legalName,
            phone: company.phone,
            email: company.email,
            address: company.address,
            logoUrl: companyLogo,
          }
        : null,
    };
  }

  private maskPlate(plate?: string | null): string {
    if (!plate) return "";
    const trimmed = plate.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      return `${parts[0]} *** ${parts.slice(2).join(" ")}`;
    }
    if (trimmed.length > 5) {
      return `${trimmed.slice(0, 2)} *** ${trimmed.slice(-3)}`;
    }
    return "***";
  }
}
