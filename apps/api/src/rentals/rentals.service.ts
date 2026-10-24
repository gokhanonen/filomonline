import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import { ActivityService } from "../activity/activity.service";
import {
  CreateRentalContractDto,
  QueryRentalsDto,
  UpdateRentalContractDto,
} from "./dto/rental.dto";

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async create(companyId: string, dto: CreateRentalContractDto) {
    const res = await this.prisma.rentalContract.create({
      data: {
        companyId,
        ...dto,
        drivers: dto.drivers ?? [],
        currency: dto.currency ?? "TRY",
        vatRate: dto.vatRate ?? 20,
      },
    });

    void this.activity.log({
      companyId,
      type: "RENTAL_NEW",
      title: `Kiralama Sözleşmesi: ${res.documentNo || "Yeni Kiralama"}`,
      description: `${res.customerName || "Müşteri"} için kiralama sözleşmesi oluşturuldu`,
      entityType: "rental",
      entityId: res.id,
      link: "/contracts",
    });

    return res;
  }

  async findAll(
    companyId: string,
    q: QueryRentalsDto,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.RentalContractWhereInput = {
      companyId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.vehicleId ? { vehicleId: q.vehicleId } : {}),
      ...(q.search
        ? {
            OR: [
              { customerName: { contains: q.search } },
              { documentNo: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rentalContract.findMany({
        where,
        orderBy: { contractDate: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.rentalContract.count({ where }),
    ]);

    const enriched = await Promise.all(items.map((i) => this.enrichRental(i)));
    return { items: enriched, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const rental = await this.prisma.rentalContract.findFirst({
      where: { id, companyId },
    });
    if (!rental) throw new NotFoundException("Kira sözleşmesi bulunamadı");
    return this.enrichRental(rental);
  }

  async findByVehicle(companyId: string, vehicleId: string) {
    const items = await this.prisma.rentalContract.findMany({
      where: { companyId, vehicleId },
      orderBy: { contractDate: "desc" },
    });
    return Promise.all(items.map((i) => this.enrichRental(i)));
  }

  async update(companyId: string, id: string, dto: UpdateRentalContractDto) {
    await this.ensureExists(companyId, id);
    const updated = await this.prisma.rentalContract.update({
      where: { id },
      data: {
        ...dto,
        drivers: dto.drivers ?? [],
        currency: dto.currency ?? "TRY",
        vatRate: dto.vatRate ?? 20,
      },
    });
    return this.enrichRental(updated);
  }

  private async enrichRental(rental: any) {
    const [vehicle, customer] = await Promise.all([
      rental.vehicleId
        ? this.prisma.vehicle.findUnique({
            where: { id: rental.vehicleId },
            select: {
              id: true,
              plate: true,
              brandName: true,
              modelName: true,
              year: true,
              chassisNo: true,
              engineNo: true,
              colorName: true,
              status: true,
            },
          })
        : null,
      rental.customerId
        ? this.prisma.account.findUnique({
            where: { id: rental.customerId },
            select: {
              id: true,
              name: true,
              taxNumber: true,
              tckn: true,
              phone: true,
              email: true,
              address: true,
            },
          })
        : null,
    ]);
    return { ...rental, vehicle, customer };
  }

  async remove(companyId: string, id: string) {
    await this.ensureExists(companyId, id);
    await this.prisma.rentalContract.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return { success: true };
  }

  private async ensureExists(companyId: string, id: string) {
    const exists = await this.prisma.rentalContract.count({
      where: { id, companyId },
    });
    if (!exists) throw new NotFoundException("Kira sözleşmesi bulunamadı");
  }
}
