import {
  accountSide,
  agingBucket,
  cardPeriod,
  daysOverdue,
  fifoAllocate,
  posSettlement,
  purchaseInvoiceTotal,
  toTry,
  validateAllocations,
} from "./finance.util";

const d = (s: string) => new Date(`${s}T00:00:00`);

describe("finance.util", () => {
  it("toTry kurla çevirir ve 2 haneye yuvarlar", () => {
    expect(toTry(5000, 37.2154)).toBe(186077);
    expect(toTry(10.005)).toBe(10.01);
  });

  it("accountSide: giriş cari alacak, çıkış cari borç", () => {
    expect(accountSide("IN", 100)).toEqual({ debit: 0, credit: 100 });
    expect(accountSide("OUT", 100)).toEqual({ debit: 100, credit: 0 });
  });

  it("purchaseInvoiceTotal noter+diğer+KDV+hizmet bedeli", () => {
    expect(
      purchaseInvoiceTotal({ notaryAmount: "1000000", otherAmount: 5000, vatAmount: 10050, specialBaseServiceFee: 0 }),
    ).toBe(1015050);
  });

  it("posSettlement oran ya da gerçek komisyonla", () => {
    expect(posSettlement(120000, 1.8)).toEqual({ gross: 120000, commission: 2160, net: 117840 });
    expect(posSettlement(120000, 1.8, 2000)).toEqual({ gross: 120000, commission: 2000, net: 118000 });
    expect(() => posSettlement(100, 0, 150)).toThrow();
  });

  it("daysOverdue / agingBucket", () => {
    const today = d("2026-10-25");
    expect(daysOverdue(d("2026-10-20"), today)).toBe(5);
    expect(agingBucket(d("2026-11-01"), today)).toBe("NOT_DUE");
    expect(agingBucket(d("2026-10-25"), today)).toBe("NOT_DUE");
    expect(agingBucket(d("2026-10-01"), today)).toBe("D0_30");
    expect(agingBucket(d("2026-09-01"), today)).toBe("D31_60");
    expect(agingBucket(d("2026-05-01"), today)).toBe("D90_PLUS");
  });

  it("cardPeriod: kesimden sonraki gün başlar, son ödeme kesimden sonra", () => {
    const p = cardPeriod(15, 25, d("2026-10-20"));
    expect(p.start).toEqual(d("2026-10-16"));
    expect(p.end).toEqual(d("2026-11-15"));
    expect(p.dueDate).toEqual(d("2026-11-25"));
    // son ödeme günü kesim gününden küçükse bir sonraki aya geçer
    expect(cardPeriod(28, 5, d("2026-10-10")).dueDate).toEqual(d("2026-11-05"));
    // 31 çeken olmayan ayda ay sonuna kırpılır
    expect(cardPeriod(31, null, d("2026-11-10")).end).toEqual(d("2026-11-30"));
  });

  it("validateAllocations açık tutarı ve toplamı aşmaya izin vermez", () => {
    const open = [
      { invoiceType: "SALES" as const, invoiceId: "a", open: 100 },
      { invoiceType: "RENTAL" as const, invoiceId: "b", open: 50 },
    ];
    expect(() => validateAllocations([{ invoiceType: "SALES", invoiceId: "a", amount: 100 }], 100, open)).not.toThrow();
    expect(() => validateAllocations([{ invoiceType: "SALES", invoiceId: "a", amount: 101 }], 200, open)).toThrow();
    expect(() =>
      validateAllocations(
        [
          { invoiceType: "SALES", invoiceId: "a", amount: 100 },
          { invoiceType: "RENTAL", invoiceId: "b", amount: 50 },
        ],
        120,
        open,
      ),
    ).toThrow();
    expect(() => validateAllocations([{ invoiceType: "SALES", invoiceId: "x", amount: 1 }], 10, open)).toThrow();
  });

  it("fifoAllocate en eski vadeden dağıtır", () => {
    const out = fifoAllocate(130, [
      { invoiceType: "SALES", invoiceId: "new", open: 100, dueDate: d("2026-10-01") },
      { invoiceType: "SALES", invoiceId: "old", open: 80, dueDate: d("2026-09-01") },
    ]);
    expect(out).toEqual([
      { invoiceType: "SALES", invoiceId: "old", amount: 80 },
      { invoiceType: "SALES", invoiceId: "new", amount: 50 },
    ]);
  });
});
