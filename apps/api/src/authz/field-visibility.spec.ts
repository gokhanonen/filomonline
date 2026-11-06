import { stripFields } from "./field-visibility.interceptor";
import { SCOPE_FIELDS } from "./permission-catalog";

describe("field visibility — stripFields", () => {
  it("maliyet alanlarını iç içe yapıdan çıkarır, diğerlerini korur", () => {
    const strip = new Set(SCOPE_FIELDS["data.cost.view"]);
    const data = {
      id: "v1",
      plate: "34ABC34",
      listPrice: 1_600_000,
      purchasePrice: 1_200_000,
      purchaseNotaryPrice: 1_000_000,
      options: [{ id: "o1", price: 100, purchasePrice: 90 }],
    };
    const out = stripFields(data, strip) as Record<string, any>;
    expect(out.plate).toBe("34ABC34");
    expect(out.listPrice).toBe(1_600_000); // satış fiyatı maliyet scope'unda değil
    expect("purchasePrice" in out).toBe(false);
    expect("purchaseNotaryPrice" in out).toBe(false);
    expect("purchasePrice" in out.options[0]).toBe(false); // iç içe de temizlenir
    expect(out.options[0].price).toBe(100);
  });

  it("dizileri ve null'ları güvenli işler", () => {
    const strip = new Set(["balance"]);
    expect(stripFields(null, strip)).toBeNull();
    const arr = [{ balance: 5, name: "a" }, { name: "b" }];
    const out = stripFields(arr, strip) as any[];
    expect("balance" in out[0]).toBe(false);
    expect(out[0].name).toBe("a");
  });

  it("boş strip setinde hiçbir şey değişmez", () => {
    const data = { purchasePrice: 1, balance: 2 };
    const out = stripFields(data, new Set()) as Record<string, number>;
    expect(out).toEqual({ purchasePrice: 1, balance: 2 });
  });
});
