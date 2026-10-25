import { Injectable } from "@nestjs/common";
import { FinanceMovementType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../auth/auth.types";
import { CASH_MODULES, FinanceService, NON_CASH_TYPES } from "./finance.service";
import { LedgerService, effectiveAllocation } from "./ledger.service";
import { addDays, purchaseInvoiceTotal, r2 } from "./finance.util";
import { QueryLedgerDto } from "./dto/finance.dto";

export type LedgerKind = "MOVEMENT" | "SALES" | "PURCHASE" | "RENTAL" | "EXPENSE";
/** Akıştaki yön: para girişi/çıkışı, kendi hesaplar arası aktarım ya da tahakkuk (fatura) */
export type LedgerFlow = "IN" | "OUT" | "TRANSFER" | "RECEIVABLE" | "PAYABLE";

export interface LedgerRow {
  key: string;
  kind: LedgerKind;
  flow: LedgerFlow;
  date: Date;
  amount: number; // TL
  currency: string;
  foreignAmount: number | null;
  documentNo: string | null;
  description: string | null;
  accountId: string | null;
  accountName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  // hareket
  groupId?: string;
  movementType?: FinanceMovementType;
  legs?: { module: string; direction: string; name: string; amount: number; currency: string }[];
  cheque?: { id: string; serialNo: string; kind: string; status: string; dueDate: Date } | null;
  // fatura / masraf
  recordId?: string;
  dueDate?: Date;
  total?: number;
  paid?: number;
  open?: number;
  integrationStatus?: string | null;
  expenseCategory?: string | null;
}

const IN_TYPES: FinanceMovementType[] = ["COLLECTION", "POS_COLLECTION", "CHEQUE_RECEIVED"];
const OUT_TYPES: FinanceMovementType[] = ["PAYMENT", "CARD_EXPENSE", "CHEQUE_ISSUED", "CHEQUE_ENDORSED", "CHEQUE_BOUNCED"];
const TRANSFER_TYPES: FinanceMovementType[] = ["TRANSFER", "POS_SETTLEMENT", "CARD_PAYMENT", "CHEQUE_COLLECTED", "CHEQUE_PAID", "COMMISSION"];

const flowOf = (t: FinanceMovementType): LedgerFlow =>
  IN_TYPES.includes(t) ? "IN" : OUT_TYPES.includes(t) ? "OUT" : "TRANSFER";

/** Görünüm sekmeleri → kaynaklar */
const VIEW_SOURCES: Record<string, { movementTypes?: FinanceMovementType[]; kinds: LedgerKind[] }> = {
  ALL: { kinds: ["MOVEMENT", "SALES", "PURCHASE", "RENTAL", "EXPENSE"] },
  IN: { movementTypes: IN_TYPES, kinds: ["MOVEMENT"] },
  OUT: { movementTypes: OUT_TYPES, kinds: ["MOVEMENT"] },
  TRANSFER: { movementTypes: TRANSFER_TYPES, kinds: ["MOVEMENT"] },
  SALES: { kinds: ["SALES", "RENTAL"] },
  PURCHASE: { kinds: ["PURCHASE"] },
  EXPENSE: { kinds: ["EXPENSE"] },
};

const MAX_WINDOW = 2000;

const can = (u: AuthUser, p: string) =>
  u.isSuperAdmin || u.isCompanyAdmin || (u.permissions ?? []).includes("*") || (u.permissions ?? []).includes(p);

/**
 * Finans paneli + birleşik hareket akışı: finans hareketleri (işlem bazında),
 * satış/alış/kira faturaları ve masraflar tek zaman çizelgesinde.
 */
@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
    private readonly ledger: LedgerService,
  ) {}

  async feed(companyId: string, user: AuthUser, q: QueryLedgerDto) {
    const view = VIEW_SOURCES[q.view ?? "ALL"] ?? VIEW_SOURCES.ALL;
    // Hesap/çek filtresi yalnız hareketlere uygulanır
    const onlyMovements = Boolean(q.cashRegisterId || q.chequeId);
    const kinds = view.kinds.filter((k) => {
      if (k === "MOVEMENT") return can(user, "finance.read");
      if (onlyMovements) return false;
      return can(user, k === "EXPENSE" ? "expenses.read" : "invoices.read");
    });

    const window = Math.min(q.page * q.pageSize, MAX_WINDOW);
    const dateRange = (field: string) =>
      q.from || q.to
        ? { [field]: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to.slice(0, 10)}T23:59:59.999`) } : {}) } }
        : {};

    // Arama: cari adı eşleşen cariler + belge no / açıklama
    const searchAccounts = q.search
      ? (await this.prisma.account.findMany({ where: { companyId, name: { contains: q.search } }, select: { id: true }, take: 200 })).map((a) => a.id)
      : [];
    const accFilter = (field: string) => (q.accountId ? { [field]: q.accountId } : {});

    // ---- Hareketler (groupId başına bir satır) ----
    const mvWhere: Prisma.FinanceMovementWhereInput = {
      companyId,
      ...(view.movementTypes ? { type: { in: view.movementTypes } } : {}),
      ...(q.cashRegisterId ? { cashRegisterId: q.cashRegisterId } : {}),
      ...(q.chequeId ? { chequeId: q.chequeId } : {}),
      ...accFilter("accountId"),
      ...dateRange("date"),
      ...(q.search
        ? {
            OR: [
              { description: { contains: q.search } },
              { documentNo: { contains: q.search } },
              { cheque: { serialNo: { contains: q.search } } },
              { cashRegister: { name: { contains: q.search } } },
              ...(searchAccounts.length ? [{ accountId: { in: searchAccounts } }] : []),
            ],
          }
        : {}),
    };
    const invSearch = (noField: string, accField: string) =>
      q.search
        ? { OR: [{ [noField]: { contains: q.search } }, ...(searchAccounts.length ? [{ [accField]: { in: searchAccounts } }] : [])] }
        : {};

    const want = (k: LedgerKind) => kinds.includes(k);
    const salesWhere: Prisma.SalesInvoiceWhereInput = { companyId, toDelete: false, ...accFilter("accountId"), ...dateRange("invoiceDate"), ...invSearch("invoiceNo", "accountId") };
    const rentalWhere: Prisma.RentalInvoiceWhereInput = { companyId, ...accFilter("accountId"), ...dateRange("invoiceDate"), ...invSearch("invoiceNo", "accountId") };
    const purchaseWhere: Prisma.PurchaseInvoiceWhereInput = { companyId, ...accFilter("accountId"), ...dateRange("invoiceDate"), ...invSearch("invoiceNo", "accountId") };
    const expenseWhere: Prisma.ExpenseWhereInput = {
      companyId,
      ...accFilter("supplierId"),
      ...dateRange("documentDate"),
      ...(q.search
        ? { OR: [{ documentNo: { contains: q.search } }, { description: { contains: q.search } }, ...(searchAccounts.length ? [{ supplierId: { in: searchAccounts } }] : [])] }
        : {}),
    };

    const [groupHeads, groupCount, sales, salesCount, rentals, rentalCount, purchases, purchaseCount, expenses, expenseCount] = await Promise.all([
      want("MOVEMENT")
        ? this.prisma.financeMovement.groupBy({ by: ["groupId"], where: mvWhere, _max: { date: true, createdAt: true }, orderBy: [{ _max: { date: "desc" } }, { _max: { createdAt: "desc" } }], take: window })
        : [],
      want("MOVEMENT") ? this.prisma.financeMovement.groupBy({ by: ["groupId"], where: mvWhere }).then((g) => g.length) : 0,
      want("SALES") ? this.prisma.salesInvoice.findMany({ where: salesWhere, orderBy: { invoiceDate: "desc" }, take: window }) : [],
      want("SALES") ? this.prisma.salesInvoice.count({ where: salesWhere }) : 0,
      want("RENTAL") ? this.prisma.rentalInvoice.findMany({ where: rentalWhere, orderBy: { invoiceDate: "desc" }, take: window }) : [],
      want("RENTAL") ? this.prisma.rentalInvoice.count({ where: rentalWhere }) : 0,
      want("PURCHASE") ? this.prisma.purchaseInvoice.findMany({ where: purchaseWhere, orderBy: { invoiceDate: "desc" }, take: window }) : [],
      want("PURCHASE") ? this.prisma.purchaseInvoice.count({ where: purchaseWhere }) : 0,
      want("EXPENSE") ? this.prisma.expense.findMany({ where: expenseWhere, orderBy: { documentDate: "desc" }, take: window }) : [],
      want("EXPENSE") ? this.prisma.expense.count({ where: expenseWhere }) : 0,
    ]);

    // Önce yalnız tarih/anahtar ile birleştir, sayfayı kes, sonra sayfadaki kayıtları zenginleştir
    type Head = { kind: LedgerKind; id: string; date: Date };
    const heads: Head[] = [
      ...groupHeads.map((g) => ({ kind: "MOVEMENT" as const, id: g.groupId, date: g._max.date! })),
      ...sales.map((r) => ({ kind: "SALES" as const, id: r.id, date: r.invoiceDate })),
      ...rentals.map((r) => ({ kind: "RENTAL" as const, id: r.id, date: r.invoiceDate })),
      ...purchases.map((r) => ({ kind: "PURCHASE" as const, id: r.id, date: r.invoiceDate })),
      ...expenses.map((r) => ({ kind: "EXPENSE" as const, id: r.id, date: r.documentDate })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
    const pageHeads = heads.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);

    const groupIds = pageHeads.filter((h) => h.kind === "MOVEMENT").map((h) => h.id);
    const invoiceIds = pageHeads.filter((h) => h.kind !== "MOVEMENT").map((h) => h.id);
    const [legs, paidRows] = await Promise.all([
      groupIds.length
        ? this.prisma.financeMovement.findMany({
            where: { companyId, groupId: { in: groupIds } },
            include: { cashRegister: { select: { name: true } }, cheque: { select: { id: true, serialNo: true, kind: true, status: true, dueDate: true } } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          })
        : [],
      invoiceIds.length
        ? this.prisma.paymentAllocation.groupBy({
            by: ["invoiceType", "invoiceId"],
            where: { companyId, invoiceId: { in: invoiceIds }, ...effectiveAllocation },
            _sum: { amount: true },
          })
        : [],
    ]);
    const paid = new Map(paidRows.map((p) => [`${p.invoiceType}:${p.invoiceId}`, Number(p._sum.amount || 0)]));

    const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));
    const salesMap = byId(sales), rentalMap = byId(rentals), purchaseMap = byId(purchases), expenseMap = byId(expenses);
    const legsByGroup = new Map<string, typeof legs>();
    for (const l of legs) legsByGroup.set(l.groupId, [...(legsByGroup.get(l.groupId) ?? []), l]);

    const rows: LedgerRow[] = pageHeads.map((h) => {
      if (h.kind === "MOVEMENT") {
        const g = legsByGroup.get(h.id)!;
        const main = g[0];
        const flow = flowOf(main.type);
        // İşlem tutarı: virmanda çıkan bacak, POS aktarımında brüt (net + komisyon), diğerlerinde ana bacak
        const amount =
          main.type === "POS_SETTLEMENT"
            ? g.filter((l) => l.module === "POS").reduce((s, l) => s + Number(l.amountTry), 0)
            : Number((flow === "TRANSFER" ? g.find((l) => l.direction === "OUT") ?? main : main).amountTry);
        const withAccount = g.find((l) => l.accountId);
        return {
          key: `MV:${h.id}`,
          kind: "MOVEMENT",
          flow,
          date: main.date,
          amount: r2(amount),
          currency: main.currency,
          foreignAmount: main.currency !== "TRY" ? Number(main.amount) : null,
          documentNo: main.documentNo,
          description: main.description,
          accountId: withAccount?.accountId ?? null,
          accountName: null,
          vehicleId: g.find((l) => l.vehicleId)?.vehicleId ?? null,
          vehiclePlate: null,
          groupId: h.id,
          movementType: main.type,
          legs: g.map((l) => ({
            module: l.module,
            direction: l.direction,
            name: l.cashRegister?.name ?? (l.cheque ? `${l.cheque.kind === "NOTE" ? "Senet" : "Çek"} #${l.cheque.serialNo}` : "—"),
            amount: Number(l.amount),
            currency: l.currency,
          })),
          cheque: g.find((l) => l.cheque)?.cheque ?? null,
        };
      }
      const paidOf = (type: string, id: string, total: number) => {
        const p = r2(paid.get(`${type}:${id}`) || 0);
        return { total: r2(total), paid: p, open: r2(total - p) };
      };
      if (h.kind === "EXPENSE") {
        const e = expenseMap.get(h.id)!;
        const provided = e.invoiceType === "PROVIDED";
        return {
          key: `EXPENSE:${e.id}`, kind: "EXPENSE", flow: provided ? "RECEIVABLE" : "PAYABLE", date: e.documentDate,
          amount: r2(Number(e.grandTotal)), currency: "TRY", foreignAmount: null, documentNo: e.documentNo, description: e.description,
          accountId: e.supplierId, accountName: null, vehicleId: e.vehicleId, vehiclePlate: null, recordId: e.id,
          dueDate: e.dueDate ?? e.documentDate, integrationStatus: e.integrationStatus, expenseCategory: e.category,
          ...(e.supplierId ? paidOf("EXPENSE", e.id, Number(e.grandTotal)) : {}),
        };
      }
      const inv = h.kind === "SALES" ? salesMap.get(h.id)! : h.kind === "RENTAL" ? rentalMap.get(h.id)! : purchaseMap.get(h.id)!;
      const total = h.kind === "PURCHASE" ? purchaseInvoiceTotal(inv as (typeof purchases)[number]) : Number((inv as { totalWithVat: unknown }).totalWithVat);
      return {
        key: `${h.kind}:${inv.id}`, kind: h.kind, flow: h.kind === "PURCHASE" ? "PAYABLE" : "RECEIVABLE", date: inv.invoiceDate,
        amount: r2(total), currency: "TRY", foreignAmount: null, documentNo: inv.invoiceNo, description: inv.description,
        accountId: inv.accountId, accountName: null, vehicleId: inv.vehicleId, vehiclePlate: null, recordId: inv.id,
        dueDate: inv.dueDate ?? inv.invoiceDate, integrationStatus: inv.integrationStatus,
        ...paidOf(h.kind, inv.id, total),
      };
    });

    // Cari ve plaka adları
    const accIds = [...new Set(rows.map((r) => r.accountId).filter(Boolean) as string[])];
    const vehIds = [...new Set(rows.map((r) => r.vehicleId).filter(Boolean) as string[])];
    const [accs, vehs] = await Promise.all([
      accIds.length ? this.prisma.account.findMany({ where: { companyId, id: { in: accIds } }, select: { id: true, name: true } }) : [],
      vehIds.length ? this.prisma.vehicle.findMany({ where: { companyId, id: { in: vehIds } }, select: { id: true, plate: true } }) : [],
    ]);
    const accName = new Map(accs.map((a) => [a.id, a.name]));
    const plate = new Map(vehs.map((v) => [v.id, v.plate]));
    for (const r of rows) {
      r.accountName = r.accountId ? accName.get(r.accountId) ?? null : null;
      r.vehiclePlate = r.vehicleId ? plate.get(r.vehicleId) ?? null : null;
    }

    return {
      items: rows,
      total: groupCount + salesCount + rentalCount + purchaseCount + expenseCount,
      page: q.page,
      pageSize: q.pageSize,
      totals: await this.feedTotals(kinds, mvWhere, { salesWhere, rentalWhere, purchaseWhere, expenseWhere }),
    };
  }

  /** Filtrelenmiş akışın toplamları (sayfadan bağımsız) */
  private async feedTotals(
    kinds: LedgerKind[],
    mvWhere: Prisma.FinanceMovementWhereInput,
    w: { salesWhere: Prisma.SalesInvoiceWhereInput; rentalWhere: Prisma.RentalInvoiceWhereInput; purchaseWhere: Prisma.PurchaseInvoiceWhereInput; expenseWhere: Prisma.ExpenseWhereInput },
  ) {
    const [cash, sales, rentals, purchases, expenses] = await Promise.all([
      kinds.includes("MOVEMENT")
        ? this.prisma.financeMovement.groupBy({
            by: ["direction"],
            where: { AND: [mvWhere, { module: { in: CASH_MODULES }, type: { notIn: NON_CASH_TYPES } }] },
            _sum: { amountTry: true },
          })
        : [],
      kinds.includes("SALES") ? this.prisma.salesInvoice.aggregate({ where: w.salesWhere, _sum: { totalWithVat: true } }) : null,
      kinds.includes("RENTAL") ? this.prisma.rentalInvoice.aggregate({ where: w.rentalWhere, _sum: { totalWithVat: true } }) : null,
      kinds.includes("PURCHASE")
        ? this.prisma.purchaseInvoice.aggregate({ where: w.purchaseWhere, _sum: { notaryAmount: true, otherAmount: true, vatAmount: true, specialBaseServiceFee: true } })
        : null,
      kinds.includes("EXPENSE") ? this.prisma.expense.aggregate({ where: { AND: [w.expenseWhere, { invoiceType: "RECEIVED" }] }, _sum: { grandTotal: true } }) : null,
    ]);
    const dir = (d: string) => Number(cash.find((c) => c.direction === d)?._sum.amountTry || 0);
    return {
      cashIn: r2(dir("IN")),
      cashOut: r2(dir("OUT")),
      sales: r2(Number(sales?._sum.totalWithVat || 0) + Number(rentals?._sum.totalWithVat || 0)),
      purchases: purchases ? purchaseInvoiceTotal(purchases._sum) : 0,
      expenses: r2(Number(expenses?._sum.grandTotal || 0)),
    };
  }

  /** Finans paneli */
  async dashboard(companyId: string, user: AuthUser) {
    const now = new Date();
    const monthsBack = 6;
    const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const in30 = addDays(now, 30);

    const [summary, accounts, flows, cheques, receivable, payable, recent] = await Promise.all([
      this.finance.summary(companyId),
      this.finance.listAccounts(companyId, false),
      this.prisma.financeMovement.findMany({
        where: { companyId, date: { gte: start }, module: { in: CASH_MODULES }, type: { notIn: NON_CASH_TYPES } },
        select: { date: true, direction: true, amountTry: true },
      }),
      this.prisma.cheque.findMany({
        where: { companyId, status: { in: ["PORTFOLIO", "IN_COLLECTION", "ISSUED"] }, dueDate: { lte: in30 } },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      this.ledger.aging(companyId, "RECEIVABLE"),
      this.ledger.aging(companyId, "PAYABLE"),
      this.feed(companyId, user, Object.assign(new QueryLedgerDto(), { page: 1, pageSize: 8 })),
    ]);

    // Aylık nakit akışı (giriş / çıkış)
    const cashflow = Array.from({ length: monthsBack }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, in: 0, out: 0 };
    });
    for (const f of flows) {
      const key = `${f.date.getFullYear()}-${String(f.date.getMonth() + 1).padStart(2, "0")}`;
      const row = cashflow.find((c) => c.month === key);
      if (!row) continue;
      if (f.direction === "IN") row.in = r2(row.in + Number(f.amountTry));
      else row.out = r2(row.out + Number(f.amountTry));
    }

    const chequeAcc = [...new Set(cheques.map((c) => c.accountId).filter(Boolean) as string[])];
    const chequeNames = new Map(
      (chequeAcc.length ? await this.prisma.account.findMany({ where: { companyId, id: { in: chequeAcc } }, select: { id: true, name: true } }) : []).map((a) => [a.id, a.name]),
    );

    return {
      summary,
      accounts: accounts.map((a) => ({
        id: a.id, name: a.name, type: a.type, currency: a.currency, bankName: a.bankName, balance: a.balance,
        pendingPos: a.pendingPos, cardDebt: a.cardDebt, availableLimit: a.availableLimit, creditLimit: a.creditLimit,
        dueDate: a.period?.dueDate ?? null,
      })),
      cashflow,
      upcomingCheques: cheques.map((c) => ({
        id: c.id, kind: c.kind, direction: c.direction, status: c.status, serialNo: c.serialNo, dueDate: c.dueDate,
        amount: Number(c.amount), currency: c.currency, accountName: c.accountId ? chequeNames.get(c.accountId) ?? null : null,
      })),
      topReceivables: receivable.accounts.slice(0, 5),
      topPayables: payable.accounts.slice(0, 5),
      recent: recent.items,
    };
  }
}
