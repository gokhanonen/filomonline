import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import {
  CreateRentalContractDto,
  QueryRentalsDto,
  UpdateRentalContractDto,
} from "./dto/rental.dto";

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: string, dto: CreateRentalContractDto) {
    return this.prisma.rentalContract.create({
      data: {
        companyId,
        ...dto,
        drivers: dto.drivers ?? [],
        currency: dto.currency ?? "TRY",
        vatRate: dto.vatRate ?? 20,
      },
    });
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
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const rental = await this.prisma.rentalContract.findFirst({
      where: { id, companyId },
    });
    if (!rental) throw new NotFoundException("Kira sözleşmesi bulunamadı");
    return rental;
  }

  async update(companyId: string, id: string, dto: UpdateRentalContractDto) {
    await this.ensureExists(companyId, id);
    return this.prisma.rentalContract.update({
      where: { id },
      data: {
        ...dto,
        drivers: dto.drivers ?? [],
        currency: dto.currency ?? "TRY",
        vatRate: dto.vatRate ?? 20,
      },
    });
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
