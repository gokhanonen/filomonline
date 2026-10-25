import { monthlyPayment, resolveOption } from "./quote-calc";

describe("quote-calc", () => {
  it("anüite: 1.000.000 ₺, aylık %3, 12 ay", () => {
    expect(monthlyPayment(1_000_000, 3, 12)).toBe(100462.09);
  });

  it("faizsiz düz bölme ve geçersiz girdiler", () => {
    expect(monthlyPayment(120_000, 0, 12)).toBe(10000);
    expect(monthlyPayment(0, 3, 12)).toBe(0);
    expect(monthlyPayment(1000, 3, 0)).toBe(0);
  });

  it("kredili: peşinat düşülür, taksit hesaplanır", () => {
    expect(resolveOption({ type: "LOAN", price: 1_500_000, downPayment: 500_000, installmentCount: 12, interestRate: 3 })).toEqual({
      financed: 1_000_000,
      monthly: 100462.09,
    });
  });

  it("takaslı + senetli: takas ve peşinat düşülür, eşit bölünür", () => {
    expect(resolveOption({ type: "INSTALLMENT", price: 1_000_000, downPayment: 200_000, tradeInValue: 400_000, installmentCount: 8 })).toEqual({
      financed: 400_000,
      monthly: 50_000,
    });
  });

  it("elle girilen taksit korunur; peşin seçenekte taksit yok", () => {
    expect(resolveOption({ type: "LOAN", price: 100, installmentCount: 10, monthlyPayment: 12 }).monthly).toBe(12);
    expect(resolveOption({ type: "CASH", price: 100 })).toEqual({ financed: 100, monthly: undefined });
  });
});
