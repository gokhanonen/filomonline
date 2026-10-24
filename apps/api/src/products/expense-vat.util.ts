const r2 = (n: number) => Number(n.toFixed(2));

/**
 * Masraf satırı KDV hesabı (eski projedeki ürün ekstresi kuralı):
 *  - satırın kendi vatRate'i > 0 ise: net × oran / 100
 *  - değilse belge başlığında totalVat > 0 ise: totalVat'ın satır net'ine göre orantılı payı
 *  - değilse 0 (gayri resmi "T" belgesi)
 * Dönen `rate` gösterim içindir (orantılı payda yuvarlanmış efektif oran).
 */
export function lineVat(
  net: number,
  lineRate: number,
  headerTotalVat: number,
  headerNetSum: number,
): { vat: number; rate: number } {
  if (lineRate > 0) return { vat: r2((net * lineRate) / 100), rate: lineRate };
  if (headerTotalVat > 0 && headerNetSum > 0) {
    const vat = r2((headerTotalVat * net) / headerNetSum);
    return { vat, rate: net > 0 ? Math.round((vat / net) * 100) : 0 };
  }
  return { vat: 0, rate: 0 };
}
