export type InvoiceType = "purchase" | "sales" | "rental";
export type IntegrationStatus =
  | "BEKLIYOR"
  | "KUYRUKTA"
  | "ENTEGRE_EDILDI"
  | "IPTAL_BEKLIYOR"
  | "SILINDI";

export interface InvoiceRow {
  id: string;
  type: InvoiceType;
  vehicleId: string;
  invoiceNo: string;
  invoiceDate: string;
  total: number;
  integrationStatus: IntegrationStatus | null;
}

export interface PurchaseInvoiceForm {
  vehicleId: string;
  accountId: string;
  invoiceNo: string;
  invoiceDate: string;
  notaryAmount: number;
  otherAmount?: number;
  vatRate?: number;
  specialBase?: boolean;
  specialBaseAmount?: number;
}

import type { PurchaseRegime } from "./vehicle";

export interface SalesInvoiceForm {
  vehicleId: string;
  accountId: string;
  invoiceNo: string;
  invoiceDate: string;
  entityType?: "INDIVIDUAL" | "CORPORATE";
  purchaseRegime?: PurchaseRegime;
  saleAmount: number; // Satış Tutarı
  notarySalePrice: number; // Satış Noter Fiyatı
  notaryPurchasePrice?: number; // Alış Noter Fiyatı
  totalWithVat?: number;
  vatRate?: number;
  otherAmountExclNotary?: number;
  saleType?: string;
  notaryJournalNo?: string;
  description?: string;
  locationId?: string;
  erpCode?: string;
}

export interface SalesInvoiceDetail {
  id: string;
  companyId: string;
  vehicleId: string;
  locationId?: string | null;
  invoiceNo: string;
  invoiceDate: string;
  accountId: string;
  entityType: "INDIVIDUAL" | "CORPORATE";
  purchaseRegime: PurchaseRegime;
  saleAmount: number;
  notarySalePrice: number;
  notaryPurchasePrice: number;
  profitMargin: number;
  matrah: number;
  vatRate: number;
  vatAmount: number;
  serviceFee: number | null;
  serviceFeeVat: number | null;
  totalWithVat: number;
  otherAmountExclNotary: number;
  saleType: string | null;
  notaryJournalNo: string | null;
  description: string | null;
  integrationStatus: IntegrationStatus | null;
  toDelete: boolean;
  integrationRefNo: string | null;
  erpCode: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    id: string;
    plate: string;
    brandName?: string | null;
    modelName?: string | null;
    year?: number | null;
    chassisNo?: string | null;
  };
  account?: {
    id: string;
    name: string;
    taxNumber?: string | null;
    tckn?: string | null;
    phone?: string | null;
    email?: string | null;
    type?: string | null;
  };
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  purchase: "Alış",
  sales: "Satış",
  rental: "Kira",
};
export const INTEGRATION_LABELS: Record<IntegrationStatus, string> = {
  BEKLIYOR: "Bekliyor",
  KUYRUKTA: "Kuyrukta",
  ENTEGRE_EDILDI: "Entegre Edildi",
  IPTAL_BEKLIYOR: "İptal Bekliyor",
  SILINDI: "Silindi",
};
export const INTEGRATION_COLOR: Record<IntegrationStatus, "neutral" | "warning" | "success" | "error"> = {
  BEKLIYOR: "neutral",
  KUYRUKTA: "warning",
  ENTEGRE_EDILDI: "success",
  IPTAL_BEKLIYOR: "warning",
  SILINDI: "error",
};
