import { calculateSalesRegime } from "./sales-regime.util";

describe("calculateSalesRegime", () => {
  describe("1. sahis (Şahıstan Alım - Özel Matrah Yok)", () => {
    it("Noter satışı noter alışından yüksek olduğunda kâr marjı üzerinden %20 KDV dahil hizmet bedeli hesaplar", () => {
      // Noter Alış: 1.000.000 TL, Noter Satış: 1.240.000 TL -> Kâr Marjı: 240.000 TL
      // Hizmet Matrahı = 240.000 / 1.20 = 200.000 TL
      // Hizmet KDV = 240.000 - 200.000 = 40.000 TL
      const res = calculateSalesRegime({
        regime: "sahis",
        notaryPurchasePrice: 1000000,
        notarySalePrice: 1240000,
      });

      expect(res.profitMargin).toBe(240000);
      expect(res.serviceFee).toBe(200000);
      expect(res.serviceFeeVat).toBe(40000);
      expect(res.vatRate).toBe(20);
      expect(res.vatAmount).toBe(40000);
      expect(res.matrah).toBe(1200000); // 1.000.000 araç bedeli + 200.000 hizmet matrahı
      expect(res.totalWithVat).toBe(1240000);
    });

    it("Zararına satışta veya kâr yoksa KDV ve hizmet bedeli 0 olur", () => {
      const res = calculateSalesRegime({
        regime: "sahis",
        notaryPurchasePrice: 1000000,
        notarySalePrice: 950000,
      });

      expect(res.profitMargin).toBe(0);
      expect(res.serviceFee).toBe(0);
      expect(res.serviceFeeVat).toBe(0);
      expect(res.vatAmount).toBe(0);
      expect(res.totalWithVat).toBe(950000);
    });
  });

  describe("2. sirket_1 (Şirketten %1 KDV ile Alım)", () => {
    it("Noter satış tutarı üzerinden %1 KDV dahil tam fatura matrahı ve KDV hesaplar", () => {
      // Noter Satış: 1.010.000 TL -> KDV: 10.000 TL, Matrah: 1.000.000 TL
      const res = calculateSalesRegime({
        regime: "sirket_1",
        notaryPurchasePrice: 800000,
        notarySalePrice: 1010000,
      });

      expect(res.vatRate).toBe(1);
      expect(res.vatAmount).toBe(10000);
      expect(res.matrah).toBe(1000000);
      expect(res.totalWithVat).toBe(1010000);
    });
  });

  describe("3. sirket_20 (Şirketten %20 KDV ile Alım)", () => {
    it("Noter satış tutarı üzerinden %20 KDV dahil tam fatura matrahı ve KDV hesaplar", () => {
      // Noter Satış: 1.200.000 TL -> KDV (%20): 200.000 TL, Matrah: 1.000.000 TL
      const res = calculateSalesRegime({
        regime: "sirket_20",
        notaryPurchasePrice: 900000,
        notarySalePrice: 1200000,
      });

      expect(res.vatRate).toBe(20);
      expect(res.vatAmount).toBe(200000);
      expect(res.matrah).toBe(1000000);
      expect(res.totalWithVat).toBe(1200000);
    });
  });

  describe("4. galeri_ozel (Galeriden Özel Matrahlı Alım)", () => {
    it("Satışta %1 KDV dahil hesaplar", () => {
      const res = calculateSalesRegime({
        regime: "galeri_ozel",
        notaryPurchasePrice: 500000,
        notarySalePrice: 1010000,
      });

      expect(res.vatRate).toBe(1);
      expect(res.vatAmount).toBe(10000);
      expect(res.matrah).toBe(1000000);
    });
  });
});
