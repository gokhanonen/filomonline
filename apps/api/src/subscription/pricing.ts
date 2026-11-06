import { BillingPeriod, Coupon, CouponType, SubscriptionPlan } from "@prisma/client";

const dec = (v: unknown): number => (v == null ? 0 : Number(v));

/** Aylık efektif fiyat: kampanya (süresi geçmemişse) yoksa liste yoksa legacy. */
export function monthlyEffective(plan: SubscriptionPlan, now = new Date()): number {
  const list = dec(plan.monthlyListPrice) || dec(plan.monthlyPrice);
  const campaign = dec(plan.monthlyCampaignPrice);
  const campaignLive =
    campaign > 0 && (!plan.campaignEndsAt || plan.campaignEndsAt > now);
  return campaignLive ? campaign : list;
}

export function monthlyList(plan: SubscriptionPlan): number {
  return dec(plan.monthlyListPrice) || dec(plan.monthlyPrice);
}

/** Yıllık efektif + liste fiyatı. "10 öde 12 kullan" → annualMonthsCharged=10. */
export function annualPricing(
  plan: SubscriptionPlan,
  now = new Date(),
): { list: number; effective: number; monthsCharged: number } {
  const mEff = monthlyEffective(plan, now);
  const mList = monthlyList(plan);
  const monthsCharged = plan.annualMonthsCharged ?? 12;
  const effective =
    dec(plan.annualCampaignPrice) || mEff * monthsCharged;
  const list = dec(plan.annualListPrice) || mList * 12;
  return { list, effective, monthsCharged };
}

export interface PlanPricing {
  monthly: { list: number; effective: number };
  annual: { list: number; effective: number; monthsCharged: number };
}

export function planPricing(plan: SubscriptionPlan, now = new Date()): PlanPricing {
  return {
    monthly: { list: monthlyList(plan), effective: monthlyEffective(plan, now) },
    annual: annualPricing(plan, now),
  };
}

/** Kuponun bu plan için geçerli olup olmadığını döner (neden ile). */
export function couponValidFor(
  coupon: Coupon,
  plan: SubscriptionPlan,
  now = new Date(),
): { ok: boolean; reason?: string } {
  if (!coupon.isActive) return { ok: false, reason: "Kupon pasif." };
  if (coupon.validFrom && coupon.validFrom > now)
    return { ok: false, reason: "Kupon henüz başlamadı." };
  if (coupon.validUntil && coupon.validUntil < now)
    return { ok: false, reason: "Kuponun süresi dolmuş." };
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions)
    return { ok: false, reason: "Kupon kullanım limiti dolmuş." };
  if (coupon.appliesToPlanCodes) {
    const codes = coupon.appliesToPlanCodes.split(",").map((c) => c.trim());
    if (!codes.includes(plan.code))
      return { ok: false, reason: "Kupon bu plan için geçerli değil." };
  }
  return { ok: true };
}

export interface PriceQuote {
  period: BillingPeriod;
  listPrice: number; // üstü çizili
  basePrice: number; // kampanya/efektif (kupon öncesi)
  discount: number; // kupon indirimi
  finalPrice: number; // ödenecek
  freeMonths: number; // MONTHS_FREE kuponu → ücretsiz ay
  couponCode?: string;
}

/** Bir plan+dönem+(opsiyonel kupon) için ödenecek tutarı hesaplar. */
export function quote(
  plan: SubscriptionPlan,
  period: BillingPeriod,
  coupon?: Coupon | null,
  customPrice?: number | null,
  now = new Date(),
): PriceQuote {
  const p = planPricing(plan, now);
  const isAnnual = period === "ANNUAL";
  let listPrice = isAnnual ? p.annual.list : p.monthly.list;
  let basePrice = isAnnual ? p.annual.effective : p.monthly.effective;

  // Enterprise özel fiyat tabanı ezer.
  if (customPrice != null) {
    basePrice = customPrice;
    listPrice = Math.max(listPrice, customPrice);
  }

  let discount = 0;
  let freeMonths = 0;
  if (coupon && couponValidFor(coupon, plan, now).ok) {
    const val = Number(coupon.value);
    if (coupon.type === CouponType.PERCENT) {
      discount = Math.round(basePrice * (val / 100) * 100) / 100;
    } else if (coupon.type === CouponType.FIXED) {
      discount = Math.min(basePrice, val);
    } else if (coupon.type === CouponType.MONTHS_FREE) {
      freeMonths = Math.floor(val);
    }
  }

  const finalPrice = Math.max(0, Math.round((basePrice - discount) * 100) / 100);
  return {
    period,
    listPrice,
    basePrice,
    discount,
    finalPrice,
    freeMonths,
    couponCode: coupon?.code,
  };
}
