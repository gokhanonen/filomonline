import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CashRegisterType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import { FinanceService } from "./finance.service";
import { daysOverdue } from "./finance.util";
import { ChequeBounceDto, ChequeCollectDto, ChequeDepositDto, QueryChequesDto } from "./dto/finance.dto";

/**
 * Çek/senet yaşam döngüsü. Alınan: Portföy → (Tahsile ver) → Tahsil / Karşılıksız / İade, ya da Ciro.
 * Verilen: Verildi → Ödendi. Ciro ve yeni çek verme ödeme işleminden yapılır (FinanceService.payment).
 */
@Injectable()
export class ChequesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  private async get(companyId: string, id: string) {
    const c = await this.prisma.cheque.findFirst({ where: { id, companyId } });
    if (!c) throw new NotFoundException("Çek/senet bulunamadı");
    return c;
  }

  async list(companyId: string, q: QueryChequesDto): Promise<Paginated<unknown>> {
    const where: Prisma.ChequeWhereInput = {
      companyId,
      ...(q.direction ? { direction: q.direction } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.accountId ? { OR: [{ accountId: q.accountId }, { holderAccountId: q.accountId }] } : {}),
      ...(q.dueFrom || q.dueTo
        ? { dueDate: { ...(q.dueFrom ? { gte: new Date(q.dueFrom) } : {}), ...(q.dueTo ? { lte: new Date(`${q.dueTo.slice(0, 10)}T23:59:59.999`) } : {}) } }
        : {}),
      ...(q.search
        ? { AND: [{ OR: [{ serialNo: { contains: q.search } }, { drawer: { contains: q.search } }, { bankName: { contains: q.search } }] }] }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.cheque.count({ where }),
      this.prisma.cheque.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
    ]);
    const accIds = [...new Set(items.flatMap((c) => [c.accountId, c.holderAccountId]).filter(Boolean) as string[])];
    const bankIds = [...new Set(items.map((c) => c.bankRegisterId).filter(Boolean) as string[])];
    const [accounts, banks] = await Promise.all([
      accIds.length ? this.prisma.account.findMany({ where: { companyId, id: { in: accIds } }, select: { id: true, name: true } }) : [],
      bankIds.length ? this.prisma.cashRegister.findMany({ where: { companyId, id: { in: bankIds } }, select: { id: true, name: true } }) : [],
    ]);
    const acc = new Map(accounts.map((a) => [a.id, a]));
    const bank = new Map(banks.map((b) => [b.id, b]));
    const open = (s: string) => ["PORTFOLIO", "IN_COLLECTION", "ISSUED"].includes(s);
    return {
      items: items.map((c) => ({
        ...c,
        amount: Number(c.amount),
        account: c.accountId ? acc.get(c.accountId) ?? null : null,
        holder: c.holderAccountId ? acc.get(c.holderAccountId) ?? null : null,
        bankRegister: c.bankRegisterId ? bank.get(c.bankRegisterId) ?? null : null,
        daysToDue: open(c.status) ? -daysOverdue(c.dueDate) : null,
      })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async history(companyId: string, id: string) {
    await this.get(companyId, id);
    return this.prisma.financeMovement.findMany({
      where: { companyId, chequeId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, groupId: true, date: true, type: true, direction: true, amount: true, accountId: true, description: true },
    });
  }

  /** Alınan çeki tahsil için bankaya ver (hareket oluşmaz, yalnızca durum) */
  async deposit(companyId: string, id: string, dto: ChequeDepositDto) {
    const c = await this.get(companyId, id);
    if (c.direction !== "RECEIVED" || c.status !== "PORTFOLIO") throw new BadRequestException("Yalnızca portföydeki alınan çek tahsile verilebilir");
    const bank = await this.finance.getRegister(this.prisma, companyId, dto.bankRegisterId, ["BANK"], "Banka hesabı");
    if (bank.currency !== c.currency) throw new BadRequestException("Çek dövizi banka hesabının dövizi ile aynı olmalı");
    return this.prisma.cheque.update({ where: { id }, data: { status: "IN_COLLECTION", bankRegisterId: bank.id } });
  }

  /** Tahsilden geri çek → portföy */
  async withdraw(companyId: string, id: string) {
    const c = await this.get(companyId, id);
    if (c.status !== "IN_COLLECTION") throw new BadRequestException("Çek tahsilde değil");
    return this.prisma.cheque.update({ where: { id }, data: { status: "PORTFOLIO", bankRegisterId: null } });
  }

  /** Alınan çek tahsil edildi: çek çıkar, kasa/banka girer */
  async collect(companyId: string, userId: string | undefined, id: string, dto: ChequeCollectDto) {
    const c = await this.get(companyId, id);
    if (c.direction !== "RECEIVED" || !["PORTFOLIO", "IN_COLLECTION"].includes(c.status)) {
      throw new BadRequestException("Bu çek tahsil edilemez");
    }
    return this.settle(companyId, userId, c, dto, "CHEQUE_COLLECTED", "COLLECTED", ["CASH", "BANK"]);
  }

  /** Verilen çek ödendi: banka çıkar, çek borcu kapanır */
  async pay(companyId: string, userId: string | undefined, id: string, dto: ChequeCollectDto) {
    const c = await this.get(companyId, id);
    if (c.direction !== "ISSUED" || c.status !== "ISSUED") throw new BadRequestException("Bu çek/senet ödenemez");
    return this.settle(companyId, userId, c, dto, "CHEQUE_PAID", "PAID", ["CASH", "BANK"]);
  }

  private async settle(
    companyId: string,
    userId: string | undefined,
    c: Awaited<ReturnType<ChequesService["get"]>>,
    dto: ChequeCollectDto,
    type: "CHEQUE_COLLECTED" | "CHEQUE_PAID",
    status: "COLLECTED" | "PAID",
    types: CashRegisterType[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reg = await this.finance.getRegister(tx, companyId, dto.cashRegisterId || c.bankRegisterId, types, "Kasa/banka hesabı");
      if (reg.currency !== c.currency) throw new BadRequestException("Çek dövizi hesabın dövizi ile aynı olmalı");
      const rate = await this.finance.chequeRate(tx, c.id, c.currency);
      const amount = Number(c.amount);
      const description = dto.description || `${c.kind === "NOTE" ? "Senet" : "Çek"} #${c.serialNo}`;
      const regDir = type === "CHEQUE_COLLECTED" ? "IN" : "OUT";
      const res = await this.finance.post(tx, companyId, userId, new Date(dto.date), [
        { type, module: "CHEQUE", direction: regDir === "IN" ? "OUT" : "IN", chequeId: c.id, amount, currency: c.currency, exchangeRate: rate, description },
        { type, module: reg.type === "CASH" ? "CASH" : "BANK", direction: regDir, cashRegisterId: reg.id, amount, currency: reg.currency, exchangeRate: rate, description },
      ]);
      await tx.cheque.update({ where: { id: c.id }, data: { status, bankRegisterId: reg.type === "BANK" ? reg.id : c.bankRegisterId } });
      return res;
    });
  }

  /** Karşılıksız / iade: çek portföyden çıkar, müşteri yeniden borçlanır */
  async bounce(companyId: string, userId: string | undefined, id: string, dto: ChequeBounceDto) {
    const c = await this.get(companyId, id);
    if (c.direction !== "RECEIVED" || !["PORTFOLIO", "IN_COLLECTION"].includes(c.status)) {
      throw new BadRequestException("Yalnızca portföydeki veya tahsildeki alınan çek karşılıksız/iade yapılabilir");
    }
    return this.prisma.$transaction(async (tx) => {
      const rate = await this.finance.chequeRate(tx, c.id, c.currency);
      const label = dto.status === "BOUNCED" ? "Karşılıksız" : "İade";
      const res = await this.finance.post(tx, companyId, userId, new Date(dto.date), [
        {
          type: "CHEQUE_BOUNCED",
          module: "CHEQUE",
          direction: "OUT",
          chequeId: c.id,
          accountId: c.accountId,
          amount: Number(c.amount),
          currency: c.currency,
          exchangeRate: rate,
          description: dto.description || `${label}: ${c.kind === "NOTE" ? "Senet" : "Çek"} #${c.serialNo}`,
        },
      ]);
      await tx.cheque.update({ where: { id: c.id }, data: { status: dto.status } });
      return res;
    });
  }
}
