const round = (n: number) => Number(n.toFixed(2));

export interface SalesRegimeParams {
  regime: string;
  notarySalePrice: number;
  notaryPurchasePrice: number;
  saleAmount?: number;
  customVatRate?: number;
}

export interface SalesRegimeCalculation {
  regime: string;
  saleAmount: number;
  notarySalePrice: number;
  notaryPurchasePrice: number;
  profitMargin: number;
  matrah: number;
  vatRate: number;
  vatAmount: number;
  serviceFee: number | null;
  serviceFeeVat: number | null;
  totalWithVat: number;
}

/**
 * 4 Alım Rejimi Satış Faturası ve KDV / Özel Matrah Hesaplama Motoru
 *
 * 1) sahis (Şahıstan Alım):
 *    - KDV %0 ile alınmıştır.
 *    - Satışta Kâr Marjı = Noter Satış - Noter Alış.
 *    - Kâr Marjı üzerinden %20 KDV DAHİL Hizmet Bedeli hesaplanır.
 *    - Hizmet Matrahı = Kâr Marjı / 1.20
 *    - Hizmet KDV'si (%20) = Kâr Marjı - Hizmet Matrahı
 *
 * 2) sirket_1 (Şirketten %1 KDV ile Alım):
 *    - Satışta %1 KDV DAHİL tam fatura kesilir.
 *    - KDV = (Noter Satış / 1.01) * 0.01
 *    - Matrah = Noter Satış - KDV
 *
 * 3) sirket_20 (Şirketten %20 KDV ile Alım):
 *    - Satışta %20 KDV DAHİL tam fatura kesilir.
 *    - KDV = (Noter Satış / 1.20) * 0.20
 *    - Matrah = Noter Satış - KDV
 *
 * 4) galeri_ozel (Galeriden Özel Matrahlı Alım):
 *    - Satışta %1 KDV DAHİL fatura kesilir.
 *    - KDV = (Noter Satış / 1.01) * 0.01
 *    - Matrah = Noter Satış - KDV
 */
export function calculateSalesRegime(params: SalesRegimeParams): SalesRegimeCalculation {
  const regime = params.regime || "sahis";
  const notarySalePrice = params.notarySalePrice ?? 0;
  const notaryPurchasePrice = params.notaryPurchasePrice ?? 0;
  const saleAmount = params.saleAmount ?? notarySalePrice;

  let vatRate = 0;
  let vatAmount = 0;
  let matrah = 0;
  let serviceFee: number | null = null;
  let serviceFeeVat: number | null = null;
  let profitMargin = 0;

  if (regime === "sahis") {
    // 1) Şahıstan Alım:
    profitMargin = Math.max(0, notarySalePrice - notaryPurchasePrice);
    serviceFee = round(profitMargin / 1.2);
    serviceFeeVat = round(profitMargin - serviceFee);
    vatRate = 20;
    vatAmount = serviceFeeVat;
    matrah = round(notaryPurchasePrice + serviceFee);
  } else if (regime === "sirket_1" || regime === "galeri_ozel") {
    // 2) Şirketten %1 veya 4) Galeriden Özel Matrahlı (%1 KDV dahil)
    profitMargin = Math.max(0, notarySalePrice - notaryPurchasePrice);
    vatRate = 1;
    vatAmount = round((notarySalePrice / 1.01) * 0.01);
    matrah = round(notarySalePrice - vatAmount);
  } else if (regime === "sirket_20") {
    // 3) Şirketten %20 KDV ile Alım
    profitMargin = Math.max(0, notarySalePrice - notaryPurchasePrice);
    vatRate = 20;
    vatAmount = round((notarySalePrice / 1.2) * 0.2);
    matrah = round(notarySalePrice - vatAmount);
  } else {
    // Fallback
    profitMargin = Math.max(0, notarySalePrice - notaryPurchasePrice);
    vatRate = params.customVatRate ?? 20;
    vatAmount = round((notarySalePrice * vatRate) / 100);
    matrah = notarySalePrice;
  }

  const totalWithVat = notarySalePrice;

  return {
    regime,
    saleAmount,
    notarySalePrice,
    notaryPurchasePrice,
    profitMargin,
    matrah,
    vatRate,
    vatAmount,
    serviceFee,
    serviceFeeVat,
    totalWithVat,
  };
}
