import type { Vehicle } from "./vehicle";
import type { Account } from "./account";

export type ContractKind = "RENTAL" | "SALES" | "PURCHASE";

export type SalesContractStatus =
  | "DRAFT"
  | "SENT"
  | "SIGNED"
  | "APPROVED"
  | "CONVERTED"
  | "CANCELLED";

export type RentalContractStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface SalesContractInstallment {
  id?: string;
  salesContractId?: string;
  date: string;
  amount: number;
  type: string; // NAKİT, KREDİ KARTI, ÇEK, SENET, HAVALE
  sortOrder?: number;
}

export interface SalesContract {
  id: string;
  companyId: string;
  vehicleId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerDistrict?: string | null;
  customerCity?: string | null;
  customerIntegrationCode?: string | null;
  customerTaxOffice?: string | null;
  customerTaxNumber?: string | null;
  customerIdentityNumber?: string | null;
  documentNo: string;
  contractDate: string;
  validUntil?: string | null;
  price: number;
  vatRate: number;
  vatAmount: number;
  vatBase?: number | null;
  discount: number;
  grandTotal: number;
  notarySalePrice?: number | null;
  notaryPurchaseAmount?: number | null;
  specialBase: boolean;
  specialBaseAmount?: number | null;
  status: SalesContractStatus;
  notes?: string | null;
  paymentNotes?: string | null;
  penaltyClause?: number | null;
  saleLocationId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  installments?: SalesContractInstallment[];
  vehicle?: Partial<Vehicle> | null;
  customer?: Partial<Account> | null;
}

export interface SalesContractFormData {
  vehicleId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerDistrict?: string;
  customerCity?: string;
  customerTaxOffice?: string;
  customerTaxNumber?: string;
  customerIdentityNumber?: string;
  documentNo: string;
  contractDate: string;
  validUntil?: string;
  price: number;
  vatRate?: number;
  vatAmount?: number;
  discount?: number;
  grandTotal?: number;
  notarySalePrice?: number;
  notaryPurchaseAmount?: number;
  specialBase?: boolean;
  specialBaseAmount?: number;
  status?: SalesContractStatus;
  notes?: string;
  paymentNotes?: string;
  penaltyClause?: number;
  saleLocationId?: string;
  installments?: Array<{
    date: string;
    amount: number;
    type: string;
    sortOrder?: number;
  }>;
}

export interface RentalContract {
  id: string;
  companyId: string;
  vehicleId: string;
  customerId?: string | null;
  customerName: string;
  customerTcTaxNo?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  durationMonths: number;
  kmLimit: number;
  startDate: string;
  endDate?: string | null;
  monthlyPrice: number;
  currency: string;
  vatRate: number;
  drivers: string[];
  contractDate: string;
  documentNo?: string | null;
  salesRegime?: string | null;
  status: RentalContractStatus;
  createdAt: string;
  updatedAt: string;
  vehicle?: Partial<Vehicle> | null;
  customer?: Partial<Account> | null;
}

export interface ContractTemplate {
  id: string;
  tenantId: string;
  type: ContractKind;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SALES_STATUS_LABELS: Record<SalesContractStatus, string> = {
  DRAFT: "Taslak",
  SENT: "Gönderildi",
  SIGNED: "İmzalandı",
  APPROVED: "Onaylandı",
  CONVERTED: "Satışa Dönüştü",
  CANCELLED: "İptal Edildi",
};

export const SALES_STATUS_COLOR: Record<
  SalesContractStatus,
  "neutral" | "primary" | "info" | "success" | "warning" | "error"
> = {
  DRAFT: "neutral",
  SENT: "info",
  SIGNED: "primary",
  APPROVED: "success",
  CONVERTED: "success",
  CANCELLED: "error",
};

export const RENTAL_STATUS_LABELS: Record<RentalContractStatus, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

export const RENTAL_STATUS_COLOR: Record<
  RentalContractStatus,
  "neutral" | "success" | "warning" | "error"
> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  COMPLETED: "warning",
  CANCELLED: "error",
};
