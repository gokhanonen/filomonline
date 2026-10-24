/** Cari ekstresi satırı */
export interface StatementRow {
  id: string;
  date: string; // ISO
  type:
    | "SALES_INVOICE"
    | "PURCHASE_INVOICE"
    | "RENTAL_INVOICE"
    | "EXPENSE"
    | "RENTAL_CONTRACT"
    | "SALES_CONTRACT"
    | "VEHICLE_OPTION";
  documentNo: string | null;
  description: string;
  vehiclePlate: string | null;
  /** Borç: cari bize borçlanır (satış, kira faturası) */
  debit: number;
  /** Alacak: biz cariye borçlanırız (alış faturası, masraf) */
  credit: number;
  link: string | null;
  balance?: number;
}

const r2 = (n: number) => Number(n.toFixed(2));

/**
 * Satırları tarihe göre (eskiden yeniye) sıralar ve yürüyen bakiye ekler.
 * bakiye = Σ(borç) − Σ(alacak); pozitif → caridan alacaklıyız.
 */
export function withRunningBalance<T extends Omit<StatementRow, "balance">>(
  rows: T[],
): (T & { balance: number })[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let balance = 0;
  return sorted.map((row) => {
    balance = r2(balance + (row.debit || 0) - (row.credit || 0));
    return { ...row, balance };
  });
}

export function statementTotals(rows: Pick<StatementRow, "debit" | "credit">[]) {
  const debit = r2(rows.reduce((s, r) => s + (r.debit || 0), 0));
  const credit = r2(rows.reduce((s, r) => s + (r.credit || 0), 0));
  return { debit, credit, balance: r2(debit - credit) };
}
