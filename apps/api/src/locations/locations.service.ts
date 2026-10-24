import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import {
  CreateCashRegisterDto,
  CreateLocationDto,
  QueryLocationsDto,
  UpdateCashRegisterDto,
  UpdateLocationDto,
} from "./dto/location.dto";

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Lokasyonlar ---

  async create(companyId: string, dto: CreateLocationDto) {
    try {
      return await this.prisma.location.create({ data: { ...dto, companyId } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ConflictException("Bu lokasyon kodu zaten kullanılıyor");
      }
      throw e;
    }
  }

  async findAll(
    companyId: string,
    q: QueryLocationsDto,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.LocationWhereInput = {
      companyId,
      ...(q.onlyActive ? { isActive: true } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { code: { contains: q.search } },
              { city: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.location.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, companyId },
    });
    if (!location) throw new NotFoundException("Lokasyon bulunamadı");
    return location;
  }

  async update(companyId: string, id: string, dto: UpdateLocationDto) {
    await this.findOne(companyId, id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }

  // --- Kasalar ---

  async listCashRegisters(companyId: string, locationId?: string) {
    return this.prisma.cashRegister.findMany({
      where: { companyId, ...(locationId ? { locationId } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async createCashRegister(companyId: string, dto: CreateCashRegisterDto) {
    await this.assertLocation(companyId, dto.locationId);
    return this.prisma.cashRegister.create({ data: { ...dto, companyId } });
  }

  async updateCashRegister(
    companyId: string,
    id: string,
    dto: UpdateCashRegisterDto,
  ) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Kasa bulunamadı");
    if (dto.locationId) await this.assertLocation(companyId, dto.locationId);
    return this.prisma.cashRegister.update({ where: { id }, data: dto });
  }

  private async assertLocation(companyId: string, locationId: string) {
    const ok = await this.prisma.location.count({
      where: { id: locationId, companyId },
    });
    if (!ok) throw new BadRequestException("Geçersiz lokasyon");
  }
}
