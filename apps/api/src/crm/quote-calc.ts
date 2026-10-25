const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Eşit taksitli kredi ödemesi (anüite). Aylık faiz yüzde olarak; 0 ise düz bölme.
 * P·r / (1 − (1+r)^−n)
 */
export function monthlyPayment(principal: number, monthlyRatePct: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRatePct / 100;
  if (!r) return r2(principal / months);
  return r2((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export interface QuoteOptionInput {
  type: "CASH" | "LOAN" | "TRADE_IN" | "INSTALLMENT";
  price: number;
  downPayment?: number;
  tradeInValue?: number;
  installmentCount?: number;
  interestRate?: number;
  monthlyPayment?: number;
}

/** Seçeneğin finanse edilen kısmı ve (girilmediyse) aylık taksiti */
export function resolveOption(o: QuoteOptionInput) {
  const financed = r2(Math.max(0, o.price - (o.downPayment ?? 0) - (o.tradeInValue ?? 0)));
  const n = o.installmentCount ?? 0;
  const monthly =
    o.monthlyPayment ??
    (o.type === "LOAN" ? monthlyPayment(financed, o.interestRate ?? 0, n) : o.type === "INSTALLMENT" && n ? r2(financed / n) : undefined);
  return { financed, monthly };
}
