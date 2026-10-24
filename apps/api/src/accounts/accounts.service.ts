import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import {
  CreateAccountDto,
  QueryAccountsDto,
  UpdateAccountDto,
} from "./dto/account.dto";

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({ data: { ...dto, companyId } });
  }

  async findAll(
    companyId: string,
    q: QueryAccountsDto,
  ): Promise<Paginated<unknown>> {
    const typeFilter: Prisma.AccountWhereInput =
      q.type && q.type !== "BOTH"
        ? { type: { in: [q.type, "BOTH"] } }
        : q.type
          ? { type: q.type }
          : {};

    const where: Prisma.AccountWhereInput = {
      companyId,
      ...typeFilter,
      ...(q.onlyActive ? { isActive: true } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { phone: { contains: q.search } },
              { taxNumber: { contains: q.search } },
              { tckn: { contains: q.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.account.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, companyId },
    });
    if (!account) throw new NotFoundException("Cari bulunamadı");
    return account;
  }

  async update(companyId: string, id: string, dto: UpdateAccountDto) {
    await this.findOne(companyId, id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  /** Finansal geçmişi korumak için pasifleştirir (kalıcı silmez). */
  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
