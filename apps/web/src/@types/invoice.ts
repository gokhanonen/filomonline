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
