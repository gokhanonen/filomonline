import axios from "@/utils/axios";

// --- Tipler ---------------------------------------------------------------

export interface CreditWallet {
  balance: number;
  freeBalance: number;
  paidBalance: number;
}

export type CreditTxnType =
  | "GRANT"
  | "PURCHASE"
  | "SPEND"
  | "REFUND"
  | "EXPIRE"
  | "ADJUST";

export interface CreditTransaction {
  id: string;
  type: CreditTxnType;
  amount: number;
  balanceAfter: number;
  operation?: string;
  note?: string;
  createdAt: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number | string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

export type PaymentStatus =
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export interface PurchaseIntent {
  payment: { id: string; provider: string; status: PaymentStatus; amount: string | number };
  status: PaymentStatus;
  redirectUrl?: string;
  clientData?: Record<string, unknown>;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  monthlyFreeCredits: number;
  monthlyPrice?: number | string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

// --- Firma (kullanıcı) ----------------------------------------------------

export const getWallet = async (): Promise<CreditWallet> => {
  const { data } = await axios.get<CreditWallet>("/credits/wallet");
  return data;
};

export const getCreditTransactions = async (): Promise<CreditTransaction[]> => {
  const { data } = await axios.get<CreditTransaction[]>("/credits/transactions");
  return data;
};

export const getCreditPackages = async (): Promise<CreditPackage[]> => {
  const { data } = await axios.get<CreditPackage[]>("/credits/packages");
  return data;
};

export const purchaseCredits = async (
  packageId: string,
  returnUrl?: string,
): Promise<PurchaseIntent> => {
  const { data } = await axios.post<PurchaseIntent>("/credits/purchase", {
    packageId,
    returnUrl,
  });
  return data;
};

/** Dev/mock: ödemeyi başarılı/başarısız olarak tamamla (gerçek sağlayıcıda webhook yapar). */
export const mockCompletePayment = async (
  paymentId: string,
  outcome: "success" | "fail",
) => {
  const { data } = await axios.post(`/payments/${paymentId}/mock-complete`, {
    outcome,
  });
  return data;
};

// --- Süper admin ----------------------------------------------------------

export const adminListPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data } = await axios.get<SubscriptionPlan[]>("/admin/credits/plans");
  return data;
};
export const adminUpsertPlan = async (
  plan: Partial<SubscriptionPlan> & { code: string; name: string },
  id?: string,
): Promise<SubscriptionPlan> => {
  const { data } = id
    ? await axios.patch<SubscriptionPlan>(`/admin/credits/plans/${id}`, plan)
    : await axios.post<SubscriptionPlan>("/admin/credits/plans", plan);
  return data;
};

export const adminListPackages = async (): Promise<CreditPackage[]> => {
  const { data } = await axios.get<CreditPackage[]>("/admin/credits/packages");
  return data;
};
export const adminUpsertPackage = async (
  pkg: Partial<CreditPackage> & { name: string; credits: number; price: number },
  id?: string,
): Promise<CreditPackage> => {
  const { data } = id
    ? await axios.patch<CreditPackage>(`/admin/credits/packages/${id}`, pkg)
    : await axios.post<CreditPackage>("/admin/credits/packages", pkg);
  return data;
};
