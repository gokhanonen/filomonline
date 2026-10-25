import { FinanceDirection, FinanceInvoiceType } from "@prisma/client";

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Ana kaydın dövizindeki tutarı TL'ye çevirir */
export const toTry = (amount: number, exchangeRate = 1) => r2(amount * (exchangeRate || 1));

/**
 * Cariye bağlı hareketin ekstredeki etkisi.
 * IN  (para/çek bize girdi)   → cari ALACAK (müşteri borcunu ödedi)
 * OUT (para/çek bizden çıktı) → cari BORÇ   (tedarikçiye ödedik / çek iade)
 */
export function accountSide(direction: FinanceDirection, amountTry: number) {
  return direction === "IN"
    ? { debit: 0, credit: amountTry }
    : { debit: amountTry, credit: 0 };
}

/** Faturanın cari ekstresindeki tarafı: alacak faturası (bize borçlu) mı? */
export function isReceivableInvoice(type: FinanceInvoiceType, expenseProvided = false) {
  if (type === "SALES" || type === "RENTAL") return true;
  if (type === "EXPENSE") return expenseProvided;
  return false;
}

/** Alış faturası toplamı: noter + diğer + KDV (özel matrahta KDV 0, hizmet bedeli dahil) */
export function purchaseInvoiceTotal(row: {
  notaryAmount: unknown;
  otherAmount: unknown;
  vatAmount: unknown;
  specialBaseServiceFee?: unknown;
}) {
  return r2(
    Number(row.notaryAmount || 0) +
      Number(row.otherAmount || 0) +
      Number(row.vatAmount || 0) +
      Number(row.specialBaseServiceFee || 0),
  );
}

/** POS → banka: komisyon (oran ya da elle girilen gerçek tutar) ve net */
export function posSettlement(gross: number, commissionRate?: number | null, commissionOverride?: number | null) {
  const commission =
    commissionOverride !== undefined && commissionOverride !== null
      ? r2(commissionOverride)
      : r2((gross * Number(commissionRate || 0)) / 100);
  if (commission < 0 || commission > gross) {
    throw new Error("Komisyon tutarı brüt tutardan büyük veya negatif olamaz");
  }
  return { gross: r2(gross), commission, net: r2(gross - commission) };
}

export const addDays = (d: Date, days: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Vadeden bu yana geçen gün (pozitif = gecikmiş) */
export function daysOverdue(dueDate: Date, today = new Date()) {
  return Math.round((startOfDay(today).getTime() - startOfDay(dueDate).getTime()) / 86_400_000);
}

export type AgingBucket = "NOT_DUE" | "D0_30" | "D31_60" | "D61_90" | "D90_PLUS";

export function agingBucket(dueDate: Date, today = new Date()): AgingBucket {
  const d = daysOverdue(dueDate, today);
  if (d <= 0) return "NOT_DUE";
  if (d <= 30) return "D0_30";
  if (d <= 60) return "D31_60";
  if (d <= 90) return "D61_90";
  return "D90_PLUS";
}

const clampDay = (year: number, month: number, day: number) =>
  new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));

/**
 * Kredi kartı açık dönemi: son hesap kesiminden (hariç) bir sonraki kesime (dahil).
 * dueDate: kesimden sonraki ilk son ödeme günü.
 */
export function cardPeriod(statementDay: number, paymentDueDay: number | null | undefined, today = new Date()) {
  const t = startOfDay(today);
  let end = clampDay(t.getFullYear(), t.getMonth(), statementDay);
  if (end < t) end = clampDay(t.getFullYear(), t.getMonth() + 1, statementDay);
  const prevEnd = clampDay(end.getFullYear(), end.getMonth() - 1, statementDay);
  const start = addDays(prevEnd, 1);
  let dueDate: Date | null = null;
  if (paymentDueDay) {
    dueDate = clampDay(end.getFullYear(), end.getMonth(), paymentDueDay);
    if (dueDate <= end) dueDate = clampDay(end.getFullYear(), end.getMonth() + 1, paymentDueDay);
  }
  return { start, end, dueDate };
}

export interface OpenItem {
  invoiceType: FinanceInvoiceType;
  invoiceId: string;
  open: number;
}

export interface AllocationInput {
  invoiceType: FinanceInvoiceType;
  invoiceId: string;
  amount: number;
}

/** Eşleştirmeleri doğrular: her kalem açık tutarı, toplam hareket tutarını aşamaz */
export function validateAllocations(allocs: AllocationInput[], totalTry: number, open: OpenItem[]) {
  const openMap = new Map(open.map((o) => [`${o.invoiceType}:${o.invoiceId}`, o.open]));
  let sum = 0;
  for (const a of allocs) {
    if (a.amount <= 0) throw new Error("Eşleştirme tutarı sıfırdan büyük olmalı");
    const key = `${a.invoiceType}:${a.invoiceId}`;
    if (!openMap.has(key)) throw new Error("Eşleştirilen fatura bu cariye ait değil veya kapalı");
    if (r2(a.amount) > r2(openMap.get(key)!)) throw new Error("Eşleştirme tutarı faturanın açık tutarını aşıyor");
    sum += a.amount;
  }
  if (r2(sum) > r2(totalTry)) throw new Error("Eşleştirmelerin toplamı işlem tutarını aşıyor");
}

/** En eski vadeden başlayarak otomatik dağıtım (FIFO) */
export function fifoAllocate(
  totalTry: number,
  open: (OpenItem & { dueDate: Date })[],
): AllocationInput[] {
  let remaining = r2(totalTry);
  const out: AllocationInput[] = [];
  for (const o of [...open].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())) {
    if (remaining <= 0) break;
    const amount = r2(Math.min(remaining, o.open));
    if (amount <= 0) continue;
    out.push({ invoiceType: o.invoiceType, invoiceId: o.invoiceId, amount });
    remaining = r2(remaining - amount);
  }
  return out;
}
