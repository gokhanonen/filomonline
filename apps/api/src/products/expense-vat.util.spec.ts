import { lineVat } from "./expense-vat.util";

describe("lineVat", () => {
  it("satır oranı varsa net × oran", () => {
    expect(lineVat(1000, 20, 0, 0)).toEqual({ vat: 200, rate: 20 });
    expect(lineVat(333.33, 10, 999, 999)).toEqual({ vat: 33.33, rate: 10 });
  });
  it("satır oranı yoksa başlık KDV'sini orantılı dağıtır", () => {
    // 2 satır: 1000 + 3000 = 4000 net, başlık KDV 800 → 200 + 600
    expect(lineVat(1000, 0, 800, 4000)).toEqual({ vat: 200, rate: 20 });
    expect(lineVat(3000, 0, 800, 4000)).toEqual({ vat: 600, rate: 20 });
  });
  it("ikisi de yoksa 0", () => {
    expect(lineVat(500, 0, 0, 500)).toEqual({ vat: 0, rate: 0 });
  });
  it("net 0 iken bölme hatası vermez", () => {
    expect(lineVat(0, 0, 100, 0)).toEqual({ vat: 0, rate: 0 });
  });
});
