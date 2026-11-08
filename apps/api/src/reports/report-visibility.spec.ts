import { missingScopes, stripReport } from "./report-visibility";

describe("report-visibility", () => {
  const full = {
    vehicles: { toplam: 10, satildi: 4 },
    stokMaliyeti: 1000,
    toplamSatis: 5000,
    brutKar: 1200,
    toplamMasraf: 300,
    cariSayisi: 7,
    trends: {
      revenueSeries: [1, 2, 3],
      expenseSeries: [4, 5, 6],
      months: ["Oca", "Şub"],
    },
    list: [
      { user: "a", soldCount: 3, totalRevenue: 100, totalCost: 60, totalProfit: 40, margin: 66 },
    ],
  };

  it("süper admin (*) hiçbir şeyi gizlemez", () => {
    expect(missingScopes(["*"])).toEqual([]);
    expect(stripReport(full, missingScopes(["*"]))).toEqual(full);
  });

  it("maliyet scope'u yoksa maliyet alanları çıkar", () => {
    const miss = missingScopes([
      "data.profit.view",
      "data.finance.view",
      "data.salePrice.view",
    ]); // cost eksik
    const out: any = stripReport(full, miss);
    expect(out.stokMaliyeti).toBeUndefined();
    expect(out.toplamMasraf).toBeUndefined();
    expect(out.trends.expenseSeries).toBeUndefined();
    expect(out.list[0].totalCost).toBeUndefined();
    // Kâr/satış dokunulmaz
    expect(out.brutKar).toBe(1200);
    expect(out.toplamSatis).toBe(5000);
  });

  it("kâr scope'u yoksa kâr/marj alanları çıkar (iç içe dahil)", () => {
    const miss = ["data.profit.view"];
    const out: any = stripReport(full, miss);
    expect(out.brutKar).toBeUndefined();
    expect(out.list[0].totalProfit).toBeUndefined();
    expect(out.list[0].margin).toBeUndefined();
    // Diğerleri durur
    expect(out.stokMaliyeti).toBe(1000);
    expect(out.list[0].totalRevenue).toBe(100);
  });

  it("satış fiyatı scope'u yoksa ciro/satış alanları çıkar", () => {
    const miss = ["data.salePrice.view"];
    const out: any = stripReport(full, miss);
    expect(out.toplamSatis).toBeUndefined();
    expect(out.trends.revenueSeries).toBeUndefined();
    expect(out.list[0].totalRevenue).toBeUndefined();
    expect(out.vehicles.toplam).toBe(10); // sayım dokunulmaz
  });

  it("hiç scope yoksa yalnız hassas-olmayan alanlar kalır", () => {
    const miss = missingScopes([]); // 4 scope da eksik
    const out: any = stripReport(full, miss);
    expect(out.cariSayisi).toBe(7);
    expect(out.vehicles).toEqual({ toplam: 10, satildi: 4 });
    expect(out.trends.months).toEqual(["Oca", "Şub"]);
    expect(out.brutKar).toBeUndefined();
    expect(out.stokMaliyeti).toBeUndefined();
    expect(out.toplamSatis).toBeUndefined();
  });
});
