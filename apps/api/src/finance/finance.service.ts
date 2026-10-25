import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CashRegisterType,
  FinanceDirection,
  FinanceModule,
  FinanceMovementType,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { Paginated } from "../common/dto/pagination.dto";
import { LedgerService } from "./ledger.service";
import { addDays, AllocationInput, cardPeriod, posSettlement, r2, toTry } from "./finance.util";
import {
  CollectionDto,
  CreateFinanceAccountDto,
  PaymentDto,
  PosSettlementDto,
  QueryMovementsDto,
  TransferDto,
  UpdateFinanceAccountDto,
} from "./dto/finance.dto";

type Tx = Prisma.TransactionClient;

export interface LineInput {
  type: FinanceMovementType;
  module: FinanceModule;
  direction: FinanceDirection;
  cashRegisterId?: string | null;
  chequeId?: string | null;
  amount: number;
  currency: string;
  exchangeRate: number;
  accountId?: string | null;
  vehicleId?: string | null;
  valueDate?: Date | null;
  settled?: boolean;
  documentNo?: string | null;
  description?: string | null;
  allocations?: AllocationInput[];
}

const MODULE_OF: Record<CashRegisterType, FinanceModule> = {
  CASH: "CASH",
  BANK: "BANK",
  POS: "POS",
  CREDIT_CARD: "CREDIT_CARD",
};

const TYPE_LABEL: Partial<Record<FinanceMovementType, string>> = {
  COLLECTION: "Tahsilat",
  PAYMENT: "Ödeme",
  TRANSFER: "Virman",
  POS_COLLECTION: "POS Tahsilatı",
  POS_SETTLEMENT: "POS → Banka",
  CARD_EXPENSE: "Kredi Kartı Harcaması",
  CARD_PAYMENT: "Kredi Kartı Ödemesi",
  CHEQUE_RECEIVED: "Çek/Senet Alındı",
  CHEQUE_ENDORSED: "Çek Ciro",
  CHEQUE_ISSUED: "Çek/Senet Verildi",
};

/** İç transfer tipleri: aylık giriş/çıkış özetine katılmaz */
const INTERNAL_TYPES: FinanceMovementType[] = ["TRANSFER", "POS_SETTLEMENT", "CARD_PAYMENT", "CHEQUE_COLLECTED", "CHEQUE_PAID"];

export const fmtTry = (n: number) => `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly activity: ActivityService,
  ) {}

  // =========================================================
  // Ortak yardımcılar
  // =========================================================

  async getRegister(db: Tx | PrismaService, companyId: string, id: string | undefined | null, types: CashRegisterType[], label = "Hesap") {
    if (!id) throw new BadRequestException(`${label} seçilmelidir`);
    const reg = await db.cashRegister.findFirst({ where: { id, companyId } });
    if (!reg) throw new NotFoundException(`${label} bulunamadı`);
    if (!types.includes(reg.type)) throw new BadRequestException(`${label} türü bu işlem için uygun değil`);
    if (!reg.isActive) throw new BadRequestException(`${reg.name} pasif durumda`);
    return reg;
  }

  rateFor(currency: string, rate?: number) {
    if (currency === "TRY") return 1;
    if (!rate) throw new BadRequestException(`${currency} işlemi için TL kuru girilmelidir`);
    return rate;
  }

  async assertAccount(db: Tx | PrismaService, companyId: string, accountId?: string | null) {
    if (!accountId) return null;
    const acc = await db.account.findFirst({ where: { id: accountId, companyId }, select: { id: true, name: true } });
    if (!acc) throw new BadRequestException("Geçersiz cari");
    return acc;
  }

  async assertVehicle(db: Tx | PrismaService, companyId: string, vehicleId?: string | null) {
    if (!vehicleId) return;
    const ok = await db.vehicle.count({ where: { id: vehicleId, companyId } });
    if (!ok) throw new BadRequestException("Geçersiz araç");
  }

  /** Bir işlemi (aynı groupId'li satırlar) ve eşleştirmelerini yazar, etkilenen cari bakiyelerini günceller */
  async post(tx: Tx, companyId: string, userId: string | undefined, date: Date, lines: LineInput[], groupId = randomUUID()) {
    const created = [];
    for (const l of lines) {
      const m = await tx.financeMovement.create({
        data: {
          companyId,
          groupId,
          date,
          type: l.type,
          module: l.module,
          direction: l.direction,
          cashRegisterId: l.cashRegisterId ?? null,
          chequeId: l.chequeId ?? null,
          amount: r2(l.amount),
          currency: l.currency,
          exchangeRate: l.exchangeRate,
          amountTry: toTry(l.amount, l.exchangeRate),
          accountId: l.accountId ?? null,
          vehicleId: l.vehicleId ?? null,
          valueDate: l.valueDate ?? null,
          settled: l.settled ?? true,
          documentNo: l.documentNo ?? null,
          description: l.description ?? null,
          createdById: userId ?? null,
        },
      });
      if (l.allocations?.length) {
        await tx.paymentAllocation.createMany({
          data: l.allocations.map((a) => ({ companyId, movementId: m.id, invoiceType: a.invoiceType, invoiceId: a.invoiceId, amount: a.amount })),
        });
      }
      created.push(m);
    }
    for (const accountId of new Set(lines.map((l) => l.accountId).filter(Boolean) as string[])) {
      await this.ledger.recomputeAccountBalance(tx, companyId, accountId);
    }
    return { groupId, movements: created };
  }

  private log(companyId: string, userId: string | undefined, groupId: string, title: string, description: string) {
    void this.activity.log({
      companyId,
      userId,
      type: "FINANCE_MOVEMENT",
      title,
      description,
      entityType: "finance_movement",
      entityId: groupId,
      link: "/finance/movements",
    });
  }

  // =========================================================
  // Finans hesapları
  // =========================================================

  private async balances(companyId: string, ids: string[]) {
    if (!ids.length) return new Map<string, { in: number; out: number; pendingPos: number }>();
    const [sums, pending] = await Promise.all([
      this.prisma.financeMovement.groupBy({
        by: ["cashRegisterId", "direction"],
        where: { companyId, cashRegisterId: { in: ids } },
        _sum: { amount: true },
      }),
      this.prisma.financeMovement.groupBy({
        by: ["cashRegisterId"],
        where: { companyId, cashRegisterId: { in: ids }, type: "POS_COLLECTION", settled: false },
        _sum: { amount: true },
      }),
    ]);
    const map = new Map(ids.map((id) => [id, { in: 0, out: 0, pendingPos: 0 }]));
    for (const s of sums) {
      const row = map.get(s.cashRegisterId!)!;
      if (s.direction === "IN") row.in = Number(s._sum.amount || 0);
      else row.out = Number(s._sum.amount || 0);
    }
    for (const p of pending) map.get(p.cashRegisterId!)!.pendingPos = Number(p._sum.amount || 0);
    return map;
  }

  async listAccounts(companyId: string, includeInactive = true) {
    const regs = await this.prisma.cashRegister.findMany({
      where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
      include: { linkedBank: { select: { id: true, name: true } } },
      orderBy: [{ isActive: "desc" }, { type: "asc" }, { name: "asc" }],
    });
    const bal = await this.balances(companyId, regs.map((r) => r.id));

    const cards = regs.filter((r) => r.type === "CREDIT_CARD" && r.statementDay);
    const periodSpend = new Map<string, { start: Date; end: Date; dueDate: Date | null; spend: number }>();
    for (const c of cards) {
      const p = cardPeriod(c.statementDay!, c.paymentDueDay);
      const agg = await this.prisma.financeMovement.aggregate({
        where: { companyId, cashRegisterId: c.id, direction: "OUT", date: { gte: p.start, lte: addDays(p.end, 1) } },
        _sum: { amount: true },
      });
      periodSpend.set(c.id, { ...p, spend: Number(agg._sum.amount || 0) });
    }

    return regs.map((r) => {
      const b = bal.get(r.id)!;
      const opening = Number(r.openingBalance);
      const balance = r2(opening + b.in - b.out);
      const limit = r.creditLimit !== null ? Number(r.creditLimit) : null;
      return {
        ...r,
        openingBalance: opening,
        commissionRate: r.commissionRate !== null ? Number(r.commissionRate) : null,
        creditLimit: limit,
        totalIn: r2(b.in),
        totalOut: r2(b.out),
        balance,
        pendingPos: r.type === "POS" ? r2(b.pendingPos) : 0,
        // Kredi kartı: bakiye negatif = borç
        cardDebt: r.type === "CREDIT_CARD" ? r2(Math.max(0, -balance)) : null,
        availableLimit: r.type === "CREDIT_CARD" && limit !== null ? r2(limit + balance) : null,
        period: periodSpend.get(r.id) ?? null,
      };
    });
  }

  async getAccount(companyId: string, id: string) {
    const all = await this.listAccounts(companyId);
    const found = all.find((a) => a.id === id);
    if (!found) throw new NotFoundException("Finans hesabı bulunamadı");
    return found;
  }

  private async checkLinkedBank(companyId: string, type: CashRegisterType, linkedBankId?: string | null, currency?: string) {
    if (!linkedBankId) return;
    if (type !== "POS" && type !== "CREDIT_CARD") throw new BadRequestException("Bağlı banka yalnızca POS ve kredi kartı için seçilir");
    const bank = await this.getRegister(this.prisma, companyId, linkedBankId, ["BANK"], "Bağlı banka hesabı");
    if (currency && bank.currency !== currency) throw new BadRequestException("Bağlı banka hesabının dövizi aynı olmalı");
  }

  async createAccount(companyId: string, userId: string | undefined, dto: CreateFinanceAccountDto) {
    const currency = dto.currency || "TRY";
    await this.checkLinkedBank(companyId, dto.type, dto.linkedBankId, currency);
    const reg = await this.prisma.cashRegister.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        currency,
        locationId: dto.locationId || null,
        erpCode: dto.erpCode,
        bankName: dto.bankName,
        branchName: dto.branchName,
        iban: dto.iban,
        accountNumber: dto.accountNumber,
        openingBalance: dto.openingBalance ?? 0,
        linkedBankId: dto.linkedBankId || null,
        commissionRate: dto.type === "POS" ? dto.commissionRate ?? null : null,
        valorDays: dto.type === "POS" ? dto.valorDays ?? null : null,
        cardLastFour: dto.type === "CREDIT_CARD" ? dto.cardLastFour ?? null : null,
        creditLimit: dto.type === "CREDIT_CARD" ? dto.creditLimit ?? null : null,
        statementDay: dto.type === "CREDIT_CARD" ? dto.statementDay ?? null : null,
        paymentDueDay: dto.type === "CREDIT_CARD" ? dto.paymentDueDay ?? null : null,
        isActive: dto.isActive ?? true,
      },
    });
    void this.activity.log({
      companyId,
      userId,
      type: "ACCOUNT_NEW",
      title: `Yeni Finans Hesabı: ${reg.name}`,
      description: `${reg.type} hesabı oluşturuldu`,
      entityType: "cash_register",
      entityId: reg.id,
      link: "/finance/accounts",
    });
    return reg;
  }

  async updateAccount(companyId: string, id: string, dto: UpdateFinanceAccountDto) {
    const reg = await this.prisma.cashRegister.findFirst({ where: { id, companyId } });
    if (!reg) throw new NotFoundException("Finans hesabı bulunamadı");
    if (dto.linkedBankId !== undefined) await this.checkLinkedBank(companyId, reg.type, dto.linkedBankId, reg.currency);
    if (dto.linkedBankId === id) throw new BadRequestException("Hesap kendine bağlanamaz");
    return this.prisma.cashRegister.update({
      where: { id },
      data: { ...dto, linkedBankId: dto.linkedBankId === "" ? null : dto.linkedBankId, locationId: dto.locationId === "" ? null : dto.locationId },
    });
  }

  async deleteAccount(companyId: string, id: string) {
    const reg = await this.prisma.cashRegister.findFirst({ where: { id, companyId } });
    if (!reg) throw new NotFoundException("Finans hesabı bulunamadı");
    const [moves, linked, cheques] = await Promise.all([
      this.prisma.financeMovement.count({ where: { companyId, cashRegisterId: id } }),
      this.prisma.cashRegister.count({ where: { companyId, linkedBankId: id } }),
      this.prisma.cheque.count({ where: { companyId, bankRegisterId: id } }),
    ]);
    if (moves || linked || cheques) {
      throw new BadRequestException("Bu hesaba bağlı hareket, POS/kart ya da çek bulunduğundan silinemez. Pasife alabilirsiniz.");
    }
    await this.prisma.cashRegister.delete({ where: { id } });
    return { success: true };
  }

  async summary(companyId: string) {
    const accounts = await this.listAccounts(companyId, false);
    const byType: Record<string, Record<string, number>> = { CASH: {}, BANK: {}, POS: {}, CREDIT_CARD: {} };
    for (const a of accounts) byType[a.type][a.currency] = r2((byType[a.type][a.currency] || 0) + a.balance);
    const posPending = r2(accounts.filter((a) => a.type === "POS").reduce((s, a) => s + (a.currency === "TRY" ? a.pendingPos : 0), 0));
    const cardDebt = r2(accounts.filter((a) => a.type === "CREDIT_CARD").reduce((s, a) => s + (a.currency === "TRY" ? a.cardDebt || 0 : 0), 0));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthFlows, chequeGroups, receivable, payable] = await Promise.all([
      this.prisma.financeMovement.groupBy({
        by: ["direction"],
        where: { companyId, date: { gte: monthStart }, module: { in: ["CASH", "BANK", "POS"] }, type: { notIn: INTERNAL_TYPES } },
        _sum: { amountTry: true },
      }),
      this.prisma.cheque.groupBy({
        by: ["direction", "status", "currency"],
        where: { companyId, status: { in: ["PORTFOLIO", "IN_COLLECTION", "ISSUED"] } },
        _sum: { amount: true },
        _count: true,
      }),
      this.ledger.aging(companyId, "RECEIVABLE"),
      this.ledger.aging(companyId, "PAYABLE"),
    ]);
    const flow = (d: FinanceDirection) => Number(monthFlows.find((f) => f.direction === d)?._sum.amountTry || 0);
    const chq = (dir: "RECEIVED" | "ISSUED") => {
      const rows = chequeGroups.filter((g) => g.direction === dir);
      return {
        count: rows.reduce((s, g) => s + g._count, 0),
        byCurrency: rows.reduce<Record<string, number>>((acc, g) => ({ ...acc, [g.currency]: r2((acc[g.currency] || 0) + Number(g._sum.amount || 0)) }), {}),
      };
    };

    return {
      balances: byType,
      posPending,
      cardDebt,
      monthCollection: r2(flow("IN")),
      monthPayment: r2(flow("OUT")),
      chequesReceived: chq("RECEIVED"),
      chequesIssued: chq("ISSUED"),
      receivable: receivable.totals,
      payable: payable.totals,
    };
  }

  // =========================================================
  // İşlemler
  // =========================================================

  async collection(companyId: string, userId: string | undefined, dto: CollectionDto) {
    const date = new Date(dto.date);
    const result = await this.prisma.$transaction(async (tx) => {
      const acc = await this.assertAccount(tx, companyId, dto.accountId);
      await this.assertVehicle(tx, companyId, dto.vehicleId);
      const base = { accountId: dto.accountId, vehicleId: dto.vehicleId, documentNo: dto.documentNo, description: dto.description, direction: "IN" as const };

      let line: LineInput;
      if (dto.module === "CHEQUE") {
        if (!dto.cheque) throw new BadRequestException("Çek/senet bilgileri girilmelidir");
        const currency = dto.cheque.currency || "TRY";
        const rate = this.rateFor(currency, dto.exchangeRate);
        const cheque = await tx.cheque.create({
          data: {
            companyId,
            kind: dto.cheque.kind ?? "CHEQUE",
            direction: "RECEIVED",
            status: "PORTFOLIO",
            serialNo: dto.cheque.serialNo,
            bankName: dto.cheque.bankName,
            branchName: dto.cheque.branchName,
            drawer: dto.cheque.drawer || acc!.name,
            issueDate: dto.cheque.issueDate ? new Date(dto.cheque.issueDate) : null,
            dueDate: new Date(dto.cheque.dueDate),
            amount: dto.amount,
            currency,
            accountId: dto.accountId,
            description: dto.description,
          },
        });
        line = { ...base, type: "CHEQUE_RECEIVED", module: "CHEQUE", chequeId: cheque.id, amount: dto.amount, currency, exchangeRate: rate };
      } else {
        const reg = await this.getRegister(tx, companyId, dto.cashRegisterId, [dto.module as CashRegisterType]);
        const rate = this.rateFor(reg.currency, dto.exchangeRate);
        line = {
          ...base,
          type: dto.module === "POS" ? "POS_COLLECTION" : "COLLECTION",
          module: dto.module,
          cashRegisterId: reg.id,
          amount: dto.amount,
          currency: reg.currency,
          exchangeRate: rate,
          ...(dto.module === "POS" ? { settled: false, valueDate: addDays(date, reg.valorDays ?? 0) } : {}),
        };
      }
      line.allocations = await this.ledger.resolveAllocations(
        tx, companyId, dto.accountId, "RECEIVABLE", toTry(line.amount, line.exchangeRate), dto.allocations, dto.autoAllocate,
      );
      const res = await this.post(tx, companyId, userId, date, [line]);
      return { ...res, accountName: acc!.name };
    });
    this.log(companyId, userId, result.groupId, `Tahsilat: ${result.accountName}`, `${fmtTry(Number(result.movements[0].amountTry))} tahsil edildi`);
    return result;
  }

  async payment(companyId: string, userId: string | undefined, dto: PaymentDto) {
    const date = new Date(dto.date);
    const result = await this.prisma.$transaction(async (tx) => {
      const acc = await this.assertAccount(tx, companyId, dto.accountId);
      await this.assertVehicle(tx, companyId, dto.vehicleId);
      if ((dto.module === "CHEQUE" || dto.allocations?.length || dto.autoAllocate) && !acc) {
        throw new BadRequestException("Bu ödeme için cari seçilmelidir");
      }
      const base = { accountId: dto.accountId || null, vehicleId: dto.vehicleId, documentNo: dto.documentNo, description: dto.description, direction: "OUT" as const };

      let line: LineInput;
      if (dto.module === "CHEQUE" && dto.endorseChequeId) {
        const cheque = await tx.cheque.findFirst({ where: { id: dto.endorseChequeId, companyId } });
        if (!cheque || cheque.direction !== "RECEIVED") throw new NotFoundException("Ciro edilecek çek bulunamadı");
        if (cheque.status !== "PORTFOLIO") throw new BadRequestException("Yalnızca portföydeki çek ciro edilebilir");
        const rate = await this.chequeRate(tx, cheque.id, cheque.currency, dto.exchangeRate);
        await tx.cheque.update({ where: { id: cheque.id }, data: { status: "ENDORSED", holderAccountId: dto.accountId } });
        line = { ...base, type: "CHEQUE_ENDORSED", module: "CHEQUE", chequeId: cheque.id, amount: Number(cheque.amount), currency: cheque.currency, exchangeRate: rate };
      } else if (dto.module === "CHEQUE") {
        if (!dto.cheque) throw new BadRequestException("Çek/senet bilgileri girilmelidir");
        const currency = dto.cheque.currency || "TRY";
        const rate = this.rateFor(currency, dto.exchangeRate);
        let bankName = dto.cheque.bankName;
        if ((dto.cheque.kind ?? "CHEQUE") === "CHEQUE") {
          const bank = await this.getRegister(tx, companyId, dto.cheque.bankRegisterId, ["BANK"], "Çekin ödeneceği banka hesabı");
          if (bank.currency !== currency) throw new BadRequestException("Çek dövizi banka hesabının dövizi ile aynı olmalı");
          bankName = bankName || bank.bankName || bank.name;
        }
        const cheque = await tx.cheque.create({
          data: {
            companyId,
            kind: dto.cheque.kind ?? "CHEQUE",
            direction: "ISSUED",
            status: "ISSUED",
            serialNo: dto.cheque.serialNo,
            bankName,
            branchName: dto.cheque.branchName,
            drawer: dto.cheque.drawer,
            issueDate: dto.cheque.issueDate ? new Date(dto.cheque.issueDate) : date,
            dueDate: new Date(dto.cheque.dueDate),
            amount: dto.amount,
            currency,
            accountId: dto.accountId,
            bankRegisterId: dto.cheque.bankRegisterId || null,
            description: dto.description,
          },
        });
        line = { ...base, type: "CHEQUE_ISSUED", module: "CHEQUE", chequeId: cheque.id, amount: dto.amount, currency, exchangeRate: rate };
      } else {
        const reg = await this.getRegister(tx, companyId, dto.cashRegisterId, [dto.module as CashRegisterType]);
        const rate = this.rateFor(reg.currency, dto.exchangeRate);
        line = {
          ...base,
          type: dto.module === "CREDIT_CARD" ? "CARD_EXPENSE" : "PAYMENT",
          module: dto.module,
          cashRegisterId: reg.id,
          amount: dto.amount,
          currency: reg.currency,
          exchangeRate: rate,
        };
      }
      if (acc) {
        line.allocations = await this.ledger.resolveAllocations(
          tx, companyId, acc.id, "PAYABLE", toTry(line.amount, line.exchangeRate), dto.allocations, dto.autoAllocate,
        );
      }
      const res = await this.post(tx, companyId, userId, date, [line]);
      return { ...res, accountName: acc?.name ?? null };
    });
    this.log(
      companyId, userId, result.groupId,
      `${TYPE_LABEL[result.movements[0].type]}${result.accountName ? `: ${result.accountName}` : ""}`,
      `${fmtTry(Number(result.movements[0].amountTry))} ödendi`,
    );
    return result;
  }

  /** Çekin ilk (alış/veriliş) hareketindeki kur; TRY ise 1 */
  async chequeRate(db: Tx | PrismaService, chequeId: string, currency: string, override?: number) {
    if (currency === "TRY") return 1;
    if (override) return override;
    const first = await db.financeMovement.findFirst({ where: { chequeId }, orderBy: { createdAt: "asc" }, select: { exchangeRate: true } });
    return Number(first?.exchangeRate || 1);
  }

  async transfer(companyId: string, userId: string | undefined, dto: TransferDto) {
    if (dto.fromId === dto.toId) throw new BadRequestException("Kaynak ve hedef hesap aynı olamaz");
    const date = new Date(dto.date);
    const result = await this.prisma.$transaction(async (tx) => {
      const from = await this.getRegister(tx, companyId, dto.fromId, ["CASH", "BANK"], "Kaynak hesap");
      const to = await this.getRegister(tx, companyId, dto.toId, ["CASH", "BANK", "CREDIT_CARD"], "Hedef hesap");
      const type: FinanceMovementType = to.type === "CREDIT_CARD" ? "CARD_PAYMENT" : "TRANSFER";
      const fromRate = this.rateFor(from.currency, dto.exchangeRate);
      const fromTry = toTry(dto.amount, fromRate);
      let toAmount = dto.amount;
      let toRate = fromRate;
      if (from.currency !== to.currency) {
        if (!dto.toAmount) throw new BadRequestException("Dövizler farklı: hedefe girecek tutarı giriniz");
        toAmount = dto.toAmount;
        toRate = to.currency === "TRY" ? 1 : dto.toExchangeRate ?? fromTry / toAmount;
      }
      const common = { type, documentNo: dto.documentNo, description: dto.description };
      const res = await this.post(tx, companyId, userId, date, [
        { ...common, module: MODULE_OF[from.type], direction: "OUT", cashRegisterId: from.id, amount: dto.amount, currency: from.currency, exchangeRate: fromRate },
        { ...common, module: MODULE_OF[to.type], direction: "IN", cashRegisterId: to.id, amount: toAmount, currency: to.currency, exchangeRate: toRate },
      ]);
      return { ...res, from, to };
    });
    this.log(companyId, userId, result.groupId, `${TYPE_LABEL[result.movements[0].type]}: ${result.from.name} → ${result.to.name}`, `${fmtTry(Number(result.movements[0].amountTry))} aktarıldı`);
    return { groupId: result.groupId, movements: result.movements };
  }

  async posSettle(companyId: string, userId: string | undefined, dto: PosSettlementDto) {
    if (!dto.movementIds.length) throw new BadRequestException("Aktarılacak POS tahsilatı seçilmedi");
    const date = new Date(dto.date);
    const result = await this.prisma.$transaction(async (tx) => {
      const pos = await this.getRegister(tx, companyId, dto.posId, ["POS"], "POS");
      const bank = await this.getRegister(tx, companyId, dto.bankId || pos.linkedBankId, ["BANK"], "POS'un yatacağı banka hesabı");
      if (bank.currency !== pos.currency) throw new BadRequestException("POS ve banka hesabının dövizi aynı olmalı");
      const ids = [...new Set(dto.movementIds)];
      const items = await tx.financeMovement.findMany({
        where: { id: { in: ids }, companyId, cashRegisterId: pos.id, type: "POS_COLLECTION", settled: false },
      });
      if (items.length !== ids.length) throw new BadRequestException("Seçilen tahsilatların bir kısmı zaten aktarılmış veya bu POS'a ait değil");

      const gross = items.reduce((s, m) => s + Number(m.amount), 0);
      let split;
      try {
        split = posSettlement(gross, pos.commissionRate !== null ? Number(pos.commissionRate) : 0, dto.commission);
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
      const rate = pos.currency === "TRY" ? 1 : Number(items[0].exchangeRate);
      const desc = dto.description || `${items.length} POS tahsilatı bankaya aktarıldı`;
      const lines: LineInput[] = [
        { type: "POS_SETTLEMENT", module: "POS", direction: "OUT", cashRegisterId: pos.id, amount: split.net, currency: pos.currency, exchangeRate: rate, description: desc },
        { type: "POS_SETTLEMENT", module: "BANK", direction: "IN", cashRegisterId: bank.id, amount: split.net, currency: bank.currency, exchangeRate: rate, description: desc },
      ];
      if (split.commission > 0) {
        lines.push({ type: "COMMISSION", module: "POS", direction: "OUT", cashRegisterId: pos.id, amount: split.commission, currency: pos.currency, exchangeRate: rate, description: "POS komisyonu" });
      }
      const res = await this.post(tx, companyId, userId, date, lines);
      await tx.financeMovement.updateMany({ where: { id: { in: ids } }, data: { settled: true, settlementId: res.groupId } });
      return { ...res, split, pos, bank };
    });
    this.log(companyId, userId, result.groupId, `POS → Banka: ${result.pos.name}`, `Brüt ${fmtTry(result.split.gross)}, komisyon ${fmtTry(result.split.commission)}, net ${fmtTry(result.split.net)} → ${result.bank.name}`);
    return { groupId: result.groupId, ...result.split };
  }

  /** İşlemi (tüm satırları) geri alır */
  async deleteGroup(companyId: string, groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      const moves = await tx.financeMovement.findMany({ where: { companyId, groupId } });
      if (!moves.length) throw new NotFoundException("İşlem bulunamadı");
      if (moves.some((m) => m.type === "POS_COLLECTION" && m.settled)) {
        throw new BadRequestException("Bu POS tahsilatı bankaya aktarılmış. Önce aktarım işlemini silin.");
      }
      if (moves.some((m) => m.type === "POS_SETTLEMENT")) {
        await tx.financeMovement.updateMany({ where: { companyId, settlementId: groupId }, data: { settled: false, settlementId: null } });
      }

      const chequeIds = [...new Set(moves.map((m) => m.chequeId).filter(Boolean) as string[])];
      const deleteCheques: string[] = [];
      for (const chequeId of chequeIds) {
        const all = await tx.financeMovement.findMany({ where: { chequeId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
        const last = all[all.length - 1];
        if (last.groupId !== groupId) throw new BadRequestException("Bu çekin daha sonraki işlemleri var. Önce son işlemi silin.");
        const remaining = all.filter((m) => m.groupId !== groupId);
        const cheque = await tx.cheque.findUniqueOrThrow({ where: { id: chequeId } });
        if (!remaining.length) {
          deleteCheques.push(chequeId);
        } else {
          const status =
            cheque.direction === "ISSUED" ? "ISSUED" : cheque.bankRegisterId ? "IN_COLLECTION" : "PORTFOLIO";
          await tx.cheque.update({ where: { id: chequeId }, data: { status, ...(status === "PORTFOLIO" || status === "IN_COLLECTION" ? { holderAccountId: null } : {}) } });
        }
      }

      await tx.financeMovement.deleteMany({ where: { companyId, groupId } });
      if (deleteCheques.length) await tx.cheque.deleteMany({ where: { id: { in: deleteCheques } } });
      for (const accountId of new Set(moves.map((m) => m.accountId).filter(Boolean) as string[])) {
        await this.ledger.recomputeAccountBalance(tx, companyId, accountId);
      }
      return { success: true, deleted: moves.length };
    });
  }

  // =========================================================
  // Hareket listesi
  // =========================================================

  async movements(companyId: string, q: QueryMovementsDto): Promise<Paginated<unknown>> {
    const where: Prisma.FinanceMovementWhereInput = {
      companyId,
      ...(q.cashRegisterId ? { cashRegisterId: q.cashRegisterId } : {}),
      ...(q.chequeId ? { chequeId: q.chequeId } : {}),
      ...(q.accountId ? { accountId: q.accountId } : {}),
      ...(q.module ? { module: q.module } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.unsettled === "true" ? { type: "POS_COLLECTION", settled: false } : {}),
      ...(q.from || q.to
        ? { date: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to.slice(0, 10)}T23:59:59.999`) } : {}) } }
        : {}),
      ...(q.search
        ? {
            OR: [
              { description: { contains: q.search } },
              { documentNo: { contains: q.search } },
              { cheque: { serialNo: { contains: q.search } } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.financeMovement.count({ where }),
      this.prisma.financeMovement.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        include: {
          cashRegister: { select: { id: true, name: true, type: true, bankName: true, currency: true } },
          cheque: { select: { id: true, serialNo: true, kind: true, direction: true, status: true, dueDate: true } },
          allocations: { select: { invoiceType: true, invoiceId: true, amount: true } },
        },
      }),
    ]);
    const accountIds = [...new Set(items.map((i) => i.accountId).filter(Boolean) as string[])];
    const vehicleIds = [...new Set(items.map((i) => i.vehicleId).filter(Boolean) as string[])];
    const [accounts, vehicles] = await Promise.all([
      accountIds.length ? this.prisma.account.findMany({ where: { companyId, id: { in: accountIds } }, select: { id: true, name: true } }) : [],
      vehicleIds.length ? this.prisma.vehicle.findMany({ where: { companyId, id: { in: vehicleIds } }, select: { id: true, plate: true } }) : [],
    ]);
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const vehMap = new Map(vehicles.map((v) => [v.id, v]));
    return {
      items: items.map((m) => ({
        ...m,
        amount: Number(m.amount),
        exchangeRate: Number(m.exchangeRate),
        amountTry: Number(m.amountTry),
        allocations: m.allocations.map((a) => ({ ...a, amount: Number(a.amount) })),
        account: m.accountId ? accMap.get(m.accountId) ?? null : null,
        vehicle: m.vehicleId ? vehMap.get(m.vehicleId) ?? null : null,
      })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  /** Bir işlemin tüm satırları (detay görünümü) */
  async group(companyId: string, groupId: string) {
    const items = await this.prisma.financeMovement.findMany({
      where: { companyId, groupId },
      include: {
        cashRegister: { select: { id: true, name: true, type: true, currency: true } },
        cheque: true,
        allocations: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (!items.length) throw new NotFoundException("İşlem bulunamadı");
    return items;
  }
}
