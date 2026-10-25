import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CashRegister, CashTransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { Paginated } from "../common/dto/pagination.dto";
import {
  CreateCashRegisterDto,
  CreateCashTransactionDto,
  QueryTransactionsDto,
  UpdateCashRegisterDto,
} from "./dto/cash-register.dto";

export interface CashRegisterWithBalance extends CashRegister {
  openingBalance: any;
  totalIn: number;
  totalOut: number;
  balance: number;
}

@Injectable()
export class CashRegistersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async findAllRegisters(companyId: string): Promise<CashRegisterWithBalance[]> {
    let registers = await this.prisma.cashRegister.findMany({
      where: { companyId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    if (registers.length === 0) {
      await this.seedDefaults(companyId);
      registers = await this.prisma.cashRegister.findMany({
        where: { companyId },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      });
    }

    const registerIds = registers.map((r) => r.id);

    // Tüm hareketleri çekip bakiyeleri hesaplayalım
    const [collections, payments, transfersOut, transfersIn] = await Promise.all([
      this.prisma.cashTransaction.groupBy({
        by: ["cashRegisterId"],
        where: {
          companyId,
          cashRegisterId: { in: registerIds },
          type: CashTransactionType.COLLECTION,
        },
        _sum: { amount: true },
      }),
      this.prisma.cashTransaction.groupBy({
        by: ["cashRegisterId"],
        where: {
          companyId,
          cashRegisterId: { in: registerIds },
          type: CashTransactionType.PAYMENT,
        },
        _sum: { amount: true },
      }),
      this.prisma.cashTransaction.groupBy({
        by: ["cashRegisterId"],
        where: {
          companyId,
          cashRegisterId: { in: registerIds },
          type: CashTransactionType.TRANSFER,
        },
        _sum: { amount: true },
      }),
      this.prisma.cashTransaction.groupBy({
        by: ["targetRegisterId"],
        where: {
          companyId,
          targetRegisterId: { in: registerIds },
          type: CashTransactionType.TRANSFER,
        },
        _sum: { amount: true },
      }),
    ]);

    const collectionMap = new Map(collections.map((c) => [c.cashRegisterId, Number(c._sum.amount || 0)]));
    const paymentMap = new Map(payments.map((p) => [p.cashRegisterId, Number(p._sum.amount || 0)]));
    const transferOutMap = new Map(transfersOut.map((t) => [t.cashRegisterId, Number(t._sum.amount || 0)]));
    const transferInMap = new Map(transfersIn.map((t) => [t.targetRegisterId!, Number(t._sum.amount || 0)]));

    return registers.map((reg) => {
      const opening = Number(reg.openingBalance);
      const totalIn = (collectionMap.get(reg.id) || 0) + (transferInMap.get(reg.id) || 0);
      const totalOut = (paymentMap.get(reg.id) || 0) + (transferOutMap.get(reg.id) || 0);
      const currentBalance = opening + totalIn - totalOut;

      return {
        ...reg,
        openingBalance: opening,
        totalIn,
        totalOut,
        balance: currentBalance,
      };
    });
  }

  async findOneRegister(companyId: string, id: string) {
    const reg = await this.prisma.cashRegister.findFirst({
      where: { id, companyId },
    });
    if (!reg) throw new NotFoundException("Kasa/Banka hesabı bulunamadı");
    return reg;
  }

  async createRegister(companyId: string, dto: CreateCashRegisterDto) {
    const reg = await this.prisma.cashRegister.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency || "TRY",
        locationId: dto.locationId,
        erpCode: dto.erpCode,
        bankName: dto.bankName,
        branchName: dto.branchName,
        iban: dto.iban,
        accountNumber: dto.accountNumber,
        openingBalance: dto.openingBalance ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    void this.activity.log({
      companyId,
      type: "ACCOUNT_NEW",
      title: `Yeni Hesap: ${reg.name}`,
      description: `${reg.type} hesabı oluşturuldu (Açılış: ${reg.openingBalance} ₺)`,
      entityType: "cash_register",
      entityId: reg.id,
      link: "/finance/cash-bank",
    });

    return reg;
  }

  async updateRegister(companyId: string, id: string, dto: UpdateCashRegisterDto) {
    await this.findOneRegister(companyId, id);

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async deleteRegister(companyId: string, id: string) {
    await this.findOneRegister(companyId, id);

    const txCount = await this.prisma.cashTransaction.count({
      where: {
        OR: [{ cashRegisterId: id }, { targetRegisterId: id }],
      },
    });

    if (txCount > 0) {
      throw new BadRequestException("Bu hesaba ait finansal hareketler bulunduğundan silinemez. Pasife alabilirsiniz.");
    }

    await this.prisma.cashRegister.delete({ where: { id } });
    return { success: true };
  }

  async getSummary(companyId: string) {
    const registersWithBalances = await this.findAllRegisters(companyId);

    let totalCash = 0;
    let totalBank = 0;
    let totalPos = 0;
    let grandTotal = 0;

    for (const r of registersWithBalances) {
      grandTotal += r.balance;
      if (r.type === "CASH") totalCash += r.balance;
      else if (r.type === "BANK") totalBank += r.balance;
      else if (r.type === "POS") totalPos += r.balance;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthIn, monthOut] = await Promise.all([
      this.prisma.cashTransaction.aggregate({
        where: {
          companyId,
          type: CashTransactionType.COLLECTION,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.cashTransaction.aggregate({
        where: {
          companyId,
          type: CashTransactionType.PAYMENT,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCash,
      totalBank,
      totalPos,
      grandTotal,
      monthCollection: Number(monthIn._sum.amount || 0),
      monthPayment: Number(monthOut._sum.amount || 0),
      activeAccountsCount: registersWithBalances.filter((r: CashRegisterWithBalance) => r.isActive).length,
    };
  }

  // ---- HAREKETLER (Transactions) ----

  async createTransaction(companyId: string, dto: CreateCashTransactionDto) {
    const sourceReg = await this.findOneRegister(companyId, dto.cashRegisterId);

    if (dto.type === CashTransactionType.TRANSFER) {
      if (!dto.targetRegisterId) {
        throw new BadRequestException("Virman / transfer için hedef hesap seçilmelidir.");
      }
      if (dto.targetRegisterId === dto.cashRegisterId) {
        throw new BadRequestException("Kaynak hesap ile hedef hesap aynı olamaz.");
      }
      await this.findOneRegister(companyId, dto.targetRegisterId);
    }

    const txDate = dto.date ? new Date(dto.date) : new Date();

    const tx = await this.prisma.$transaction(async (prisma) => {
      const created = await prisma.cashTransaction.create({
        data: {
          companyId,
          cashRegisterId: dto.cashRegisterId,
          type: dto.type,
          amount: dto.amount,
          date: txDate,
          description: dto.description,
          documentNo: dto.documentNo,
          accountId: dto.accountId,
          invoiceType: dto.invoiceType,
          invoiceId: dto.invoiceId,
          vehicleId: dto.vehicleId,
          targetRegisterId: dto.targetRegisterId,
        },
      });

      // Cari bakiye güncellemesi
      if (dto.accountId) {
        // COLLECTION (Tahsilat): Müşteri borcunu ödedi -> bakiye düşer
        // PAYMENT (Tediye): Tedarikçiye ödeme yaptık -> borcumuz düşer
        const delta = dto.type === CashTransactionType.COLLECTION ? -dto.amount : dto.amount;
        await prisma.account.update({
          where: { id: dto.accountId },
          data: {
            balance: { increment: delta },
          },
        });
      }

      return created;
    });

    void this.activity.log({
      companyId,
      type: "EXPENSE_NEW",
      title: `${dto.type === "COLLECTION" ? "Tahsilat" : dto.type === "PAYMENT" ? "Tediye" : "Virman"}: ${Number(dto.amount).toLocaleString("tr-TR")} ₺`,
      description: `${sourceReg.name} hesabına ${dto.type.toLowerCase()} hareketi kaydedildi.`,
      entityType: "cash_transaction",
      entityId: tx.id,
      link: "/finance/cash-bank",
    });

    return tx;
  }

  async findTransactions(companyId: string, query: QueryTransactionsDto): Promise<Paginated<any>> {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 25);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.CashTransactionWhereInput = {
      companyId,
      ...(query.cashRegisterId
        ? {
            OR: [
              { cashRegisterId: query.cashRegisterId },
              { targetRegisterId: query.cashRegisterId },
            ],
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.startDate || query.endDate
        ? {
            date: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.cashTransaction.count({ where }),
      this.prisma.cashTransaction.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          cashRegister: { select: { id: true, name: true, type: true, bankName: true } },
          targetRegister: { select: { id: true, name: true, type: true, bankName: true } },
        },
      }),
    ]);

    // Cari ve araç isimlerini zenginleştirelim
    const accountIds = Array.from(new Set(items.map((i) => i.accountId).filter(Boolean))) as string[];
    const vehicleIds = Array.from(new Set(items.map((i) => i.vehicleId).filter(Boolean))) as string[];

    const [accounts, vehicles] = await Promise.all([
      accountIds.length > 0
        ? this.prisma.account.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, name: true, type: true },
          })
        : [],
      vehicleIds.length > 0
        ? this.prisma.vehicle.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, plate: true, brandName: true, modelName: true },
          })
        : [],
    ]);

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    const enrichedItems = items.map((item) => ({
      ...item,
      amount: Number(item.amount),
      account: item.accountId ? accountMap.get(item.accountId) || null : null,
      vehicle: item.vehicleId ? vehicleMap.get(item.vehicleId) || null : null,
    }));

    return {
      items: enrichedItems,
      total,
      page,
      pageSize,
    };
  }

  async deleteTransaction(companyId: string, id: string) {
    const tx = await this.prisma.cashTransaction.findFirst({
      where: { id, companyId },
    });
    if (!tx) throw new NotFoundException("Hareket bulunamadı");

    await this.prisma.$transaction(async (prisma) => {
      // Cari bakiye iadesi
      if (tx.accountId) {
        const delta = tx.type === CashTransactionType.COLLECTION ? Number(tx.amount) : -Number(tx.amount);
        await prisma.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: delta } },
        });
      }

      await prisma.cashTransaction.delete({ where: { id } });
    });

    return { success: true };
  }

  private async seedDefaults(companyId: string) {
    await this.prisma.cashRegister.createMany({
      data: [
        {
          companyId,
          name: "Merkez Nakit Kasa",
          type: "CASH",
          currency: "TRY",
          openingBalance: 150000,
          isActive: true,
        },
        {
          companyId,
          name: "Garanti BBVA Ticari Hesap",
          type: "BANK",
          bankName: "Garanti BBVA",
          branchName: "İstoç Şubesi",
          iban: "TR56 0006 2000 0001 2990 1022 34",
          currency: "TRY",
          openingBalance: 1250000,
          isActive: true,
        },
        {
          companyId,
          name: "Yapı Kredi Şirket Hesabı",
          type: "BANK",
          bankName: "Yapı Kredi",
          branchName: "Güneşli Kurumsal",
          iban: "TR12 0006 7010 0000 0098 7654 32",
          currency: "TRY",
          openingBalance: 480000,
          isActive: true,
        },
        {
          companyId,
          name: "Mağaza Ortak POS",
          type: "POS",
          bankName: "Garanti BBVA",
          currency: "TRY",
          openingBalance: 0,
          isActive: true,
        },
      ],
    });
  }
}
