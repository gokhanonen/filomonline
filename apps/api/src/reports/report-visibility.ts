/**
 * Raporlar için hassas-veri gizleme. FieldVisibilityInterceptor yalnız standart alan
 * adlarını (profit, margin…) gizler; raporlar brutKar/maliyet/ciro gibi Türkçe toplu
 * alanlar döndürdüğü için bunlar kaçıyordu. Burada rapor alan adlarını scope'lara eşleyip,
 * scope'u OLMAYAN kullanıcıdan ilgili alanları (iç içe dahil) çıkarıyoruz.
 */

/** Hangi scope yoksa hangi rapor alanları çıkarılır. */
export const REPORT_SCOPE_FIELDS: Record<string, string[]> = {
  "data.cost.view": [
    "stokMaliyeti",
    "toplamMasraf",
    "currentExpenseTL",
    "currentMonthlyExpenseTL",
    "avgMonthlyExpense",
    "expenseSeries",
    "expenseGrowth",
    "totalCost",
    "purchasePrice",
    "totalExpenses",
    "totalExpensesSum",
    "totalPurchases",
  ],
  "data.profit.view": [
    "brutKar",
    "totalProfit",
    "avgProfitPerVehicle",
    "margin",
    "profit",
    "netProfit",
    "profitMargin",
    "totalNetProfit",
  ],
  "data.finance.view": ["balance", "vadeFarki", "kdvFarki", "devredenKdv"],
  "data.salePrice.view": [
    "stokListeDeğeri",
    "toplamSatis",
    "aktifKiraGeliri",
    "revenueSeries",
    "currentRevenueTL",
    "revenueGrowth",
    "totalRevenue",
    "revenue",
    "salePrice",
    "totalSalesRevenue",
  ],
};

const SCOPE_KEYS = Object.keys(REPORT_SCOPE_FIELDS);

/** Kullanıcının izinlerine göre EKSİK scope'lar (["*"] → hiçbiri eksik değil). */
export function missingScopes(permissions: string[] | undefined): string[] {
  const perms = permissions ?? [];
  if (perms.includes("*")) return [];
  return SCOPE_KEYS.filter((s) => !perms.includes(s));
}

/** Eksik scope'lara ait alanları (iç içe nesne/dizi dahil) rapor yanıtından çıkarır. */
export function stripReport<T>(data: T, missing: string[]): T {
  if (!missing.length) return data;
  const remove = new Set(missing.flatMap((s) => REPORT_SCOPE_FIELDS[s] ?? []));
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (remove.has(k)) continue;
        out[k] = walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(data) as T;
}
