import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import { ActivityService } from "../activity/activity.service";
import {
  CreateExpenseDto,
  ExpenseLineDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from "./dto/expense.dto";

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /** Satırlardan dip toplam / KDV / genel toplam hesaplar. */
  private totals(lines: ExpenseLineDto[]) {
    let subTotal = 0;
    let totalVat = 0;
    lines.forEach((l) => {
      const net = l.quantity * l.unitPrice;
      subTotal += net;
      totalVat += (net * (l.vatRate ?? 20)) / 100;
    });
    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      grandTotal: Number((subTotal + totalVat).toFixed(2)),
    };
  }

  async create(companyId: string, dto: CreateExpenseDto) {
    const { lines, ...header } = dto;
    const t = this.totals(lines);
    const expense = await this.prisma.expense.create({
      data: {
        ...header,
        companyId,
        ...t,
        lines: {
          create: lines.map((l, i) => ({
            type: l.type,
            productId: l.productId,
            code: l.code,
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate ?? 20,
            description: l.description,
            sortOrder: i,
          })),
        },
      },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });

    void this.activity.log({
      companyId,
      type: "EXPENSE_NEW",
      title: `Masraf: ${expense.documentNo || "Yeni Masraf"}`,
      description: `${expense.grandTotal} ₺ tutarında masraf faturası kaydedildi`,
      entityType: "expense",
      entityId: expense.id,
      link: "/expenses",
    });

    return expense;
  }

  async findAll(
    companyId: string,
    q: QueryExpensesDto,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...(q.invoiceType ? { invoiceType: q.invoiceType } : {}),
      ...(q.vehicleId ? { vehicleId: q.vehicleId } : {}),
      ...(q.search
        ? {
            OR: [
              { documentNo: { contains: q.search } },
              { description: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { lines: { orderBy: { sortOrder: "asc" } } },
        orderBy: { documentDate: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!expense) throw new NotFoundException("Masraf bulunamadı");
    return expense;
  }

  async update(companyId: string, id: string, dto: UpdateExpenseDto) {
    await this.ensureExists(companyId, id);
    const { lines, ...header } = dto;
    const t = this.totals(lines);
    // Satırları tamamen değiştir
    await this.prisma.expenseLine.deleteMany({ where: { expenseId: id } });
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...header,
        ...t,
        lines: {
          create: lines.map((l, i) => ({
            type: l.type,
            productId: l.productId,
            code: l.code,
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate ?? 20,
            description: l.description,
            sortOrder: i,
          })),
        },
      },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensureExists(companyId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(companyId: string, id: string) {
    const exists = await this.prisma.expense.count({ where: { id, companyId } });
    if (!exists) throw new NotFoundException("Masraf bulunamadı");
  }
}
