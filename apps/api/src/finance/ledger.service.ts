import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceInvoiceType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  accountSide,
  AgingBucket,
  agingBucket,
  AllocationInput,
  daysOverdue,
  fifoAllocate,
  purchaseInvoiceTotal,
  r2,
  validateAllocations,
} from "./finance.util";

type Db = PrismaService | Prisma.TransactionClient;
export type InvoiceSide = "RECEIVABLE" | "PAYABLE";

export interface OpenInvoice {
  invoiceType: FinanceInvoiceType;
  invoiceId: string;
  side: InvoiceSide;
  invoiceNo: string | null;
  date: Date;
  dueDate: Date;
  total: number;
  paid: number;
  open: number;
  daysOverdue: number;
  bucket: AgingBucket;
  accountId: string;
  accountName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
}

export interface StatementLine {
  id: string;
  date: Date;
  kind: "INVOICE" | "MOVEMENT";
  type: string;
  documentNo: string | null;
  description: string;
  vehiclePlate: string | null;
  debit: number;
  credit: number;
  currency: string | null;
  foreignAmount: number | null;
  groupId: string | null;
  link: string | null;
  balance?: number;
}

const INVOICE_LABEL: Record<FinanceInvoiceType, string> = {
  SALES: "Satış Faturası",
  RENTAL: "Kira Faturası",
  PURCHASE: "Alış Faturası",
  EXPENSE: "Masraf",
};

const MOVEMENT_LABEL: Record<string, string> = {
  COLLECTION: "Tahsilat",
  PAYMENT: "Ödeme",
  POS_COLLECTION: "POS Tahsilatı",
  CARD_EXPENSE: "Kredi Kartı Harcaması",
  CHEQUE_RECEIVED: "Çek/Senet Alındı",
  CHEQUE_ENDORSED: "Çek Ciro Edildi",
  CHEQUE_BOUNCED: "Çek Karşılıksız / İade",
  CHEQUE_ISSUED: "Çek/Senet Verildi",
};

/** Karşılıksız / iade çeklerle yapılan eşleştirmeler faturayı kapatmaz */
const effectiveAllocation: Prisma.PaymentAllocationWhereInput = {
  movement: {
    OR: [{ chequeId: null }, { cheque: { status: { notIn: ["BOUNCED", "RETURNED"] } } }],
  },
};

/**
 * Cari tarafı: fatura bakiyeleri, eşleştirmeler, ekstre.
 * Faturalar kendi tablolarında kalır; ödemeler FinanceMovement + PaymentAllocation.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cari(ler)in faturaları — toplam/ödenen/açık tutarlarıyla */
  async invoices(
    companyId: string,
    opts: { accountId?: string; side?: InvoiceSide; onlyOpen?: boolean },
    db: Db = this.prisma,
  ): Promise<OpenInvoice[]> {
    const acc = opts.accountId ? { accountId: opts.accountId } : {};
    const sup = opts.accountId ? { supplierId: opts.accountId } : { supplierId: { not: null } };
    const wantR = opts.side !== "PAYABLE";
    const wantP = opts.side !== "RECEIVABLE";

    const [sales, rentals, purchases, expenses] = await Promise.all([
      wantR
        ? db.salesInvoice.findMany({
            where: { companyId, toDelete: false, ...acc },
            select: { id: true, invoiceNo: true, invoiceDate: true, dueDate: true, totalWithVat: true, accountId: true, vehicleId: true },
          })
        : [],
      wantR
        ? db.rentalInvoice.findMany({
            where: { companyId, ...acc },
            select: { id: true, invoiceNo: true, invoiceDate: true, dueDate: true, totalWithVat: true, accountId: true, vehicleId: true },
          })
        : [],
      wantP
        ? db.purchaseInvoice.findMany({
            where: { companyId, ...acc },
            select: {
              id: true, invoiceNo: true, invoiceDate: true, dueDate: true, accountId: true, vehicleId: true,
              notaryAmount: true, otherAmount: true, vatAmount: true, specialBaseServiceFee: true,
            },
          })
        : [],
      db.expense.findMany({
        where: {
          companyId,
          ...sup,
          ...(wantR && wantP ? {} : { invoiceType: wantR ? "PROVIDED" : "RECEIVED" }),
        },
        select: { id: true, documentNo: true, documentDate: true, dueDate: true, grandTotal: true, supplierId: true, vehicleId: true, invoiceType: true },
      }),
    ]);

    type Raw = Omit<OpenInvoice, "paid" | "open" | "daysOverdue" | "bucket" | "accountName" | "vehiclePlate">;
    const raw: Raw[] = [
      ...sales.map((i) => ({
        invoiceType: "SALES" as const, invoiceId: i.id, side: "RECEIVABLE" as const, invoiceNo: i.invoiceNo,
        date: i.invoiceDate, dueDate: i.dueDate ?? i.invoiceDate, total: Number(i.totalWithVat), accountId: i.accountId, vehicleId: i.vehicleId,
      })),
      ...rentals.map((i) => ({
        invoiceType: "RENTAL" as const, invoiceId: i.id, side: "RECEIVABLE" as const, invoiceNo: i.invoiceNo,
        date: i.invoiceDate, dueDate: i.dueDate ?? i.invoiceDate, total: Number(i.totalWithVat), accountId: i.accountId, vehicleId: i.vehicleId,
      })),
      ...purchases.map((i) => ({
        invoiceType: "PURCHASE" as const, invoiceId: i.id, side: "PAYABLE" as const, invoiceNo: i.invoiceNo,
        date: i.invoiceDate, dueDate: i.dueDate ?? i.invoiceDate, total: purchaseInvoiceTotal(i), accountId: i.accountId, vehicleId: i.vehicleId,
      })),
      ...expenses.map((i) => ({
        invoiceType: "EXPENSE" as const, invoiceId: i.id, side: (i.invoiceType === "PROVIDED" ? "RECEIVABLE" : "PAYABLE") as InvoiceSide,
        invoiceNo: i.documentNo, date: i.documentDate, dueDate: i.dueDate ?? i.documentDate, total: Number(i.grandTotal),
        accountId: i.supplierId!, vehicleId: i.vehicleId,
      })),
    ];
    if (!raw.length) return [];

    const paidRows = await db.paymentAllocation.groupBy({
      by: ["invoiceType", "invoiceId"],
      where: { companyId, invoiceId: { in: raw.map((r) => r.invoiceId) }, ...effectiveAllocation },
      _sum: { amount: true },
    });
    const paidMap = new Map(paidRows.map((p) => [`${p.invoiceType}:${p.invoiceId}`, Number(p._sum.amount || 0)]));

    const [accounts, vehicles] = await Promise.all([
      db.account.findMany({
        where: { companyId, id: { in: [...new Set(raw.map((r) => r.accountId))] } },
        select: { id: true, name: true },
      }),
      db.vehicle.findMany({
        where: { companyId, id: { in: [...new Set(raw.map((r) => r.vehicleId).filter(Boolean) as string[])] } },
        select: { id: true, plate: true },
      }),
    ]);
    const accName = new Map(accounts.map((a) => [a.id, a.name]));
    const plate = new Map(vehicles.map((v) => [v.id, v.plate]));
    const today = new Date();

    return raw
      .map((r) => {
        const paid = r2(paidMap.get(`${r.invoiceType}:${r.invoiceId}`) || 0);
        const open = r2(r.total - paid);
        return {
          ...r,
          total: r2(r.total),
          paid,
          open,
          daysOverdue: open > 0 ? daysOverdue(r.dueDate, today) : 0,
          bucket: agingBucket(r.dueDate, today),
          accountName: accName.get(r.accountId) ?? null,
          vehiclePlate: r.vehicleId ? plate.get(r.vehicleId) ?? null : null,
        };
      })
      .filter((r) => !opts.onlyOpen || r.open > 0.009)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  /** Vade yaşlandırma: cari bazında açık bakiyeler */
  async aging(companyId: string, side: InvoiceSide) {
    const open = await this.invoices(companyId, { side, onlyOpen: true });
    const empty = () => ({ NOT_DUE: 0, D0_30: 0, D31_60: 0, D61_90: 0, D90_PLUS: 0 } as Record<AgingBucket, number>);
    const byAccount = new Map<string, { accountId: string; accountName: string | null; total: number; overdue: number; buckets: Record<AgingBucket, number> }>();
    const totals = { total: 0, overdue: 0, buckets: empty() };
    for (const o of open) {
      const row = byAccount.get(o.accountId) ?? { accountId: o.accountId, accountName: o.accountName, total: 0, overdue: 0, buckets: empty() };
      row.total = r2(row.total + o.open);
      row.buckets[o.bucket] = r2(row.buckets[o.bucket] + o.open);
      totals.total = r2(totals.total + o.open);
      totals.buckets[o.bucket] = r2(totals.buckets[o.bucket] + o.open);
      if (o.bucket !== "NOT_DUE") {
        row.overdue = r2(row.overdue + o.open);
        totals.overdue = r2(totals.overdue + o.open);
      }
      byAccount.set(o.accountId, row);
    }
    return { side, totals, accounts: [...byAccount.values()].sort((a, b) => b.total - a.total) };
  }

  /**
   * Hareketin fatura eşleştirmelerini çözer: açık eşleştirme doğrulanır,
   * autoAllocate ise en eski vadeden dağıtılır.
   */
  async resolveAllocations(
    db: Db,
    companyId: string,
    accountId: string,
    side: InvoiceSide,
    amountTry: number,
    explicit?: AllocationInput[],
    auto?: boolean,
  ): Promise<AllocationInput[]> {
    if (!explicit?.length && !auto) return [];
    const open = await this.invoices(companyId, { accountId, side, onlyOpen: true }, db);
    if (explicit?.length) {
      try {
        validateAllocations(explicit, amountTry, open);
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
      return explicit.map((a) => ({ ...a, amount: r2(a.amount) }));
    }
    return fifoAllocate(amountTry, open);
  }

  /** Cari ekstresi: faturalar + cariye bağlı finans hareketleri, yürüyen bakiyeyle */
  async statement(companyId: string, accountId: string, from?: string, to?: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, companyId },
      select: { id: true, name: true, type: true, ledgerCode: true, phone: true, email: true, taxNumber: true, tckn: true, taxOffice: true },
    });
    if (!account) throw new NotFoundException("Cari bulunamadı");

    const lines = await this.lines(this.prisma, companyId, accountId);
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(`${to.slice(0, 10)}T23:59:59.999`) : null;

    let opening = 0;
    let balance = 0;
    const rows: StatementLine[] = [];
    for (const l of lines) {
      if (toD && l.date > toD) continue;
      balance = r2(balance + l.debit - l.credit);
      if (fromD && l.date < fromD) {
        opening = balance;
        continue;
      }
      rows.push({ ...l, balance });
    }
    const debit = r2(rows.reduce((s, r) => s + r.debit, 0));
    const credit = r2(rows.reduce((s, r) => s + r.credit, 0));
    return {
      account,
      from: from ?? null,
      to: to ?? null,
      opening,
      totals: { debit, credit, balance: r2(opening + debit - credit) },
      rows,
    };
  }

  /** Bakiye = Σborç − Σalacak (pozitif → cari bize borçlu). Account.balance önbelleğini günceller. */
  async recomputeAccountBalance(db: Db, companyId: string, accountId: string) {
    const lines = await this.lines(db, companyId, accountId);
    const balance = r2(lines.reduce((s, l) => s + l.debit - l.credit, 0));
    await db.account.updateMany({ where: { id: accountId, companyId }, data: { balance } });
    return balance;
  }

  private async lines(db: Db, companyId: string, accountId: string): Promise<StatementLine[]> {
    const [invoices, movements] = await Promise.all([
      this.invoices(companyId, { accountId }, db),
      db.financeMovement.findMany({
        where: { companyId, accountId },
        include: {
          cashRegister: { select: { name: true } },
          cheque: { select: { serialNo: true, kind: true, dueDate: true } },
        },
      }),
    ]);

    const invoiceLines: StatementLine[] = invoices.map((i) => ({
      id: `${i.invoiceType}:${i.invoiceId}`,
      date: i.date,
      kind: "INVOICE",
      type: i.invoiceType,
      documentNo: i.invoiceNo,
      description: `${INVOICE_LABEL[i.invoiceType]}${i.dueDate.getTime() !== i.date.getTime() ? ` · Vade ${i.dueDate.toLocaleDateString("tr-TR")}` : ""}`,
      vehiclePlate: i.vehiclePlate,
      debit: i.side === "RECEIVABLE" ? i.total : 0,
      credit: i.side === "PAYABLE" ? i.total : 0,
      currency: null,
      foreignAmount: null,
      groupId: null,
      link: i.invoiceType === "EXPENSE" ? "/expenses" : "/invoices",
    }));

    const movementLines: StatementLine[] = movements.map((m) => {
      const side = accountSide(m.direction, Number(m.amountTry));
      const via = m.cheque
        ? `${m.cheque.kind === "NOTE" ? "Senet" : "Çek"} #${m.cheque.serialNo} · Vade ${m.cheque.dueDate.toLocaleDateString("tr-TR")}`
        : m.cashRegister?.name ?? "";
      return {
        id: m.id,
        date: m.date,
        kind: "MOVEMENT",
        type: m.type,
        documentNo: m.documentNo,
        description: [MOVEMENT_LABEL[m.type] ?? m.type, via, m.description].filter(Boolean).join(" · "),
        vehiclePlate: null,
        ...side,
        currency: m.currency,
        foreignAmount: m.currency !== "TRY" ? Number(m.amount) : null,
        groupId: m.groupId,
        link: "/finance/movements",
      };
    });

    return [...invoiceLines, ...movementLines].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || (a.kind === b.kind ? 0 : a.kind === "INVOICE" ? -1 : 1),
    );
  }
}
