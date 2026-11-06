import axios from "@/utils/axios";
import type { PurchaseIntent } from "@/services/creditsService";

export type BillingPeriod = "MONTHLY" | "ANNUAL";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";
export type CouponType = "PERCENT" | "FIXED" | "MONTHS_FREE";

export interface PlanPricing {
  monthly: { list: number; effective: number };
  annual: { list: number; effective: number; monthsCharged: number };
}

export interface PublicPlan {
  id: string;
  code: string;
  name: string;
  includedUsers: number;
  includedLocations: number;
  includedVehicles: number;
  monthlyFreeCredits: number;
  trialDays: number;
  pricing: PlanPricing;
  isDefault: boolean;
}

export interface CurrentSubscription {
  id: string;
  status: SubscriptionStatus;
  period: BillingPeriod;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd: boolean;
  plan: { code: string; name: string };
}

export interface DimStatus {
  usage: number;
  limit: number | null;
  hardLimit: number | null;
  state: "OK" | "WARN" | "BLOCK";
  label: string;
}

export interface QuotaStatus {
  plan: { code: string; name: string };
  dimensions: {
    users: DimStatus;
    locations: DimStatus;
    vehicles: DimStatus;
    transactions?: DimStatus;
  };
  anyWarning: boolean;
  anyBlock: boolean;
  warnings: string[];
}

export interface PriceQuote {
  period: BillingPeriod;
  listPrice: number;
  basePrice: number;
  discount: number;
  finalPrice: number;
  freeMonths: number;
  couponCode?: string;
}

// --- Kullanıcı ---

export const getPlans = async (): Promise<PublicPlan[]> => {
  const { data } = await axios.get<PublicPlan[]>("/subscription/plans");
  return data;
};
export const getCurrentSubscription = async (): Promise<CurrentSubscription | null> => {
  const { data } = await axios.get<CurrentSubscription | null>("/subscription/current");
  return data;
};
export const getUsage = async (): Promise<QuotaStatus> => {
  const { data } = await axios.get<QuotaStatus>("/subscription/usage");
  return data;
};
export const previewQuote = async (
  planCode: string,
  period: BillingPeriod,
  couponCode?: string,
): Promise<PriceQuote> => {
  const { data } = await axios.post<PriceQuote>("/subscription/preview", {
    planCode,
    period,
    couponCode,
  });
  return data;
};
export const subscribe = async (
  planCode: string,
  period: BillingPeriod,
  couponCode?: string,
): Promise<PurchaseIntent | { free: true; status: "ACTIVE" }> => {
  const { data } = await axios.post("/subscription/subscribe", {
    planCode,
    period,
    couponCode,
  });
  return data;
};
export const cancelSubscription = async () => {
  const { data } = await axios.post("/subscription/cancel", {});
  return data;
};

// --- Süper admin ---

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  monthlyFreeCredits: number;
  includedUsers: number;
  includedLocations: number;
  includedVehicles: number;
  freeTransactionLimit: number | null;
  monthlyListPrice: number | string | null;
  monthlyCampaignPrice: number | string | null;
  annualMonthsCharged: number | null;
  trialDays: number;
  graceOveragePct: number;
  isPublic: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number | string;
  description?: string | null;
  appliesToPlanCodes?: string | null;
  maxRedemptions?: number | null;
  redeemedCount: number;
  validUntil?: string | null;
  isActive: boolean;
}

export interface AdminTenantRow {
  id: string;
  name: string;
  subscription: {
    status: SubscriptionStatus;
    period: BillingPeriod;
    planCode: string;
    planName: string;
    currentPeriodEnd?: string | null;
  } | null;
  usage: {
    users: number;
    locations: number;
    activeVehicles: number;
    completedTransactions: number;
  };
}

export const adminListPlans = async (): Promise<AdminPlan[]> => {
  const { data } = await axios.get<AdminPlan[]>("/admin/subscription/plans");
  return data;
};
export const adminUpsertPlan = async (plan: Partial<AdminPlan> & { code: string; name: string }, id?: string) => {
  const { data } = id
    ? await axios.patch(`/admin/subscription/plans/${id}`, plan)
    : await axios.post("/admin/subscription/plans", plan);
  return data as AdminPlan;
};
export const adminListCoupons = async (): Promise<AdminCoupon[]> => {
  const { data } = await axios.get<AdminCoupon[]>("/admin/subscription/coupons");
  return data;
};
export const adminUpsertCoupon = async (c: Partial<AdminCoupon> & { code: string; type: CouponType; value: number }, id?: string) => {
  const { data } = id
    ? await axios.patch(`/admin/subscription/coupons/${id}`, c)
    : await axios.post("/admin/subscription/coupons", c);
  return data as AdminCoupon;
};
export const adminListTenants = async (): Promise<AdminTenantRow[]> => {
  const { data } = await axios.get<AdminTenantRow[]>("/admin/subscription/tenants");
  return data;
};
export const adminAssignPlan = async (
  tenantId: string,
  body: { planCode: string; period?: BillingPeriod; customPrice?: number; trialDays?: number; note?: string },
) => {
  const { data } = await axios.post(`/admin/subscription/tenants/${tenantId}/assign`, body);
  return data;
};
