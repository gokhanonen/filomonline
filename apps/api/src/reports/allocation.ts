/**
 * Lokasyon / genel masrafların araçlara "stok günü" ağırlığıyla dağıtımı
 * ("Yansıyan Masraf"). Saf fonksiyon — DB'den bağımsız, test edilebilir.
 *
 * Kurallar (eski projenin locationExpenseAllocation ile birebir):
 *  - Havuza giren masraflar: invoiceType RECEIVED ve vehicleId OLMAYAN masraflar.
 *    locationId varsa lokasyon havuzu [loc|ay], yoksa genel havuz [ay].
 *  - Her aracın stok dönemi: alışTarihi .. (satıldıysa satışTarihi, değilse bugün), gün sayımı dahil (12→25 = 14 gün).
 *  - Lokasyon zaman çizelgesi: onaylı transferler (confirmedAt) tarih sırasıyla; ilk atama
 *    (fromLocationId boş veya from==to) alış tarihinden itibaren geçerli. Gerçek taşınmada taşınma günü
 *    yeni lokasyona yazılır, eski segment bir gün önce biter.
 *  - İlk atama yoksa: ilk gerçek taşınmanın fromLocationId'si, o da yoksa purchaseLocationId.
 *  - locationShare = Σ havuz[loc|ay] / lokasyonAyGünü[loc|ay] × araçGünü[loc|ay]
 *    (bir ayda hiç araç yoksa tutar o lokasyonun "artık" havuzuna gider ve lokasyonda bulunmuş
 *     araçlara toplam gün oranıyla dağıtılır — para şube içinde kalır).
 *  - generalShare = Σ genelHavuz[ay] / ayToplamGünü[ay] × araçGünü[ay]
 */

export interface AllocVehicle {
  id: string;
  status: string; // STOKTA | KIRALAMADA | SATILDI
  purchaseDate: Date | null;
  saleDate: Date | null;
  purchaseLocationId?: string | null;
}
export interface AllocExpense {
  invoiceType: string; // RECEIVED | PROVIDED
  vehicleId?: string | null;
  locationId?: string | null;
  documentDate: Date;
  grandTotal: number;
}
export interface AllocTransfer {
  vehicleId: string;
  fromLocationId: string | null;
  toLocationId: string;
  status: string; // PENDING | CONFIRMED | CANCELLED
  confirmedAt: Date | null;
}
export interface AllocationResult {
  locationShare: number;
  generalShare: number;
  total: number;
}

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
/** Dahil gün sayısı: aynı gün = 1 */
export const inclusiveDays = (a: Date, b: Date) =>
  Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY) + 1);

interface Segment {
  locationId: string | null;
  from: Date;
  to: Date; // dahil
}

/** Bir aracın stok dönemini lokasyon segmentlerine böler. */
export function buildSegments(
  v: AllocVehicle,
  transfers: AllocTransfer[],
  today = new Date(),
): Segment[] {
  if (!v.purchaseDate) return [];
  const start = startOfDay(v.purchaseDate);
  const end = startOfDay(v.status === "SATILDI" && v.saleDate ? v.saleDate : today);
  if (end < start) return [];

  const confirmed = transfers
    .filter((t) => t.vehicleId === v.id && t.status === "CONFIRMED" && t.confirmedAt)
    .sort((a, b) => a.confirmedAt!.getTime() - b.confirmedAt!.getTime());
  const isInitial = (t: AllocTransfer) => !t.fromLocationId || t.fromLocationId === t.toLocationId;
  const initial = confirmed.find(isInitial);
  const moves = confirmed.filter((t) => !isInitial(t));

  let current: string | null =
    initial?.toLocationId ?? moves[0]?.fromLocationId ?? v.purchaseLocationId ?? null;
  let cursor = start;
  const segments: Segment[] = [];

  for (const m of moves) {
    const day = startOfDay(m.confirmedAt!);
    if (day <= cursor) {
      current = m.toLocationId; // dönem başından önce: sadece konum güncellenir
      continue;
    }
    if (day > end) break;
    segments.push({ locationId: current, from: cursor, to: new Date(day.getTime() - DAY) });
    current = m.toLocationId;
    cursor = day;
  }
  segments.push({ locationId: current, from: cursor, to: end });
  return segments;
}

/** Segmenti takvim aylarına böler: [{month, days}] */
function splitByMonth(from: Date, to: Date): { month: string; days: number }[] {
  const out: { month: string; days: number }[] = [];
  let a = from;
  while (a <= to) {
    const monthEnd = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    const b = monthEnd < to ? monthEnd : to;
    out.push({ month: monthKey(a), days: inclusiveDays(a, b) });
    a = new Date(b.getTime() + DAY);
  }
  return out;
}

export function computeAllocatedExpenses(
  vehicles: AllocVehicle[],
  expenses: AllocExpense[],
  transfers: AllocTransfer[],
  today = new Date(),
): Map<string, AllocationResult> {
  // 1) Havuzlar
  const locPool = new Map<string, number>(); // "loc|ay"
  const genPool = new Map<string, number>(); // "ay"
  for (const e of expenses) {
    if (e.invoiceType === "PROVIDED" || e.vehicleId) continue;
    const m = monthKey(e.documentDate);
    if (e.locationId) {
      const k = `${e.locationId}|${m}`;
      locPool.set(k, (locPool.get(k) ?? 0) + e.grandTotal);
    } else {
      genPool.set(m, (genPool.get(m) ?? 0) + e.grandTotal);
    }
  }

  // 2) Gün birikimleri
  const vehLocMonth = new Map<string, Map<string, number>>(); // vid -> "loc|ay" -> gün
  const vehMonth = new Map<string, Map<string, number>>(); // vid -> ay -> gün
  const vehLocTotal = new Map<string, Map<string, number>>(); // vid -> loc -> gün (tüm zaman)
  const locMonthDays = new Map<string, number>();
  const locTotalDays = new Map<string, number>();
  const monthTotalDays = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

  for (const v of vehicles) {
    const vlm = new Map<string, number>();
    const vm = new Map<string, number>();
    const vlt = new Map<string, number>();
    for (const s of buildSegments(v, transfers, today)) {
      for (const { month, days } of splitByMonth(s.from, s.to)) {
        bump(vm, month, days);
        bump(monthTotalDays, month, days);
        if (s.locationId) {
          bump(vlm, `${s.locationId}|${month}`, days);
          bump(vlt, s.locationId, days);
          bump(locMonthDays, `${s.locationId}|${month}`, days);
          bump(locTotalDays, s.locationId, days);
        }
      }
    }
    vehLocMonth.set(v.id, vlm);
    vehMonth.set(v.id, vm);
    vehLocTotal.set(v.id, vlt);
  }

  // 3) Araçsız aylardaki lokasyon tutarları -> lokasyon artık havuzu
  const leftover = new Map<string, number>();
  for (const [k, amount] of locPool) {
    if (!locMonthDays.get(k)) {
      const loc = k.split("|")[0];
      bump(leftover, loc, amount);
    }
  }

  // 4) Paylar
  const result = new Map<string, AllocationResult>();
  for (const v of vehicles) {
    let locationShare = 0;
    for (const [k, days] of vehLocMonth.get(v.id) ?? []) {
      const pool = locPool.get(k);
      const denom = locMonthDays.get(k);
      if (pool && denom) locationShare += (pool / denom) * days;
    }
    for (const [loc, days] of vehLocTotal.get(v.id) ?? []) {
      const pool = leftover.get(loc);
      const denom = locTotalDays.get(loc);
      if (pool && denom) locationShare += (pool / denom) * days;
    }
    let generalShare = 0;
    for (const [m, days] of vehMonth.get(v.id) ?? []) {
      const pool = genPool.get(m);
      const denom = monthTotalDays.get(m);
      if (pool && denom) generalShare += (pool / denom) * days;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    result.set(v.id, {
      locationShare: r2(locationShare),
      generalShare: r2(generalShare),
      total: r2(locationShare + generalShare),
    });
  }
  return result;
}
