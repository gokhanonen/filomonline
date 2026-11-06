import { SubscriptionPlan, Coupon } from "@prisma/client";
import { monthlyEffective, annualPricing, quote } from "./pricing";

const plan = (over: Partial<SubscriptionPlan> = {}): SubscriptionPlan =>
  ({
    id: "p",
    code: "pro",
    name: "Pro",
    monthlyFreeCredits: 0,
    monthlyPrice: null,
    includedUsers: 0,
    includedLocations: 0,
    includedVehicles: 0,
    freeTransactionLimit: null,
    monthlyListPrice: 1000,
    monthlyCampaignPrice: null,
    annualMonthsCharged: 10, // "10 öde 12 kullan"
    annualListPrice: null,
    annualCampaignPrice: null,
    campaignEndsAt: null,
    trialDays: 0,
    graceOveragePct: 10,
    isPublic: true,
    isActive: true,
    isDefault: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as unknown as SubscriptionPlan;

const coupon = (over: Partial<Coupon>): Coupon =>
  ({
    id: "c",
    code: "X",
    type: "PERCENT",
    value: 10,
    description: null,
    appliesToPlanCodes: null,
    maxRedemptions: null,
    redeemedCount: 0,
    validFrom: null,
    validUntil: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as unknown as Coupon;

describe("subscription pricing", () => {
  it("kampanya fiyatı süresi geçmemişse geçerli", () => {
    expect(monthlyEffective(plan())).toBe(1000);
    expect(monthlyEffective(plan({ monthlyCampaignPrice: 800 as never }))).toBe(800);
    const past = new Date(Date.now() - 86400_000);
    expect(
      monthlyEffective(plan({ monthlyCampaignPrice: 800 as never, campaignEndsAt: past })),
    ).toBe(1000);
  });

  it("yıllık '10 öde 12 kullan' hesabı", () => {
    const a = annualPricing(plan());
    expect(a.effective).toBe(10000); // 1000 * 10
    expect(a.list).toBe(12000); // 1000 * 12
    expect(a.monthsCharged).toBe(10);
  });

  it("yıllık teklif + yüzde kupon", () => {
    const q = quote(plan(), "ANNUAL", coupon({ type: "PERCENT", value: 10 as never }));
    expect(q.listPrice).toBe(12000);
    expect(q.basePrice).toBe(10000);
    expect(q.discount).toBe(1000);
    expect(q.finalPrice).toBe(9000);
  });

  it("sabit tutar kupon ve ücretsiz ay kuponu", () => {
    const fixed = quote(plan(), "MONTHLY", coupon({ type: "FIXED", value: 300 as never }));
    expect(fixed.finalPrice).toBe(700); // 1000 - 300

    const months = quote(plan(), "MONTHLY", coupon({ type: "MONTHS_FREE", value: 2 as never }));
    expect(months.freeMonths).toBe(2);
    expect(months.finalPrice).toBe(1000); // fiyat inmez, süre uzar
  });

  it("enterprise özel fiyat tabanı ezer", () => {
    const q = quote(plan(), "MONTHLY", null, 650);
    expect(q.basePrice).toBe(650);
    expect(q.finalPrice).toBe(650);
  });
});
