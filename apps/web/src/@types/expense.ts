import type { ProductType } from "@/@types/product";

export type ExpenseInvoiceType = "RECEIVED" | "PROVIDED";
export type ExpenseTargetType = "VEHICLE" | "LOCATION" | "GENERAL";

export interface ExpenseLine {
  id?: string;
  type: ProductType;
  productId?: string | null;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  description?: string | null;
  sortOrder?: number;
}

export interface Expense {
  id: string;
  companyId: string;
  invoiceType: ExpenseInvoiceType;
  expenseType: ExpenseTargetType;
  vehicleId?: string | null;
  locationId?: string | null;
  documentNo?: string | null;
  documentDate: string;
  dueDate?: string | null;
  category?: string | null;
  description?: string | null;
  supplierId?: string | null;
  subTotal: string;
  totalVat: string;
  grandTotal: string;
  integrationStatus?: string | null;
  lines: ExpenseLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseLineInput {
  type: ProductType;
  productId?: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  description?: string;
}

export interface ExpenseFormValues {
  invoiceType: ExpenseInvoiceType;
  expenseType: ExpenseTargetType;
  vehicleId?: string;
  locationId?: string;
  supplierId?: string;
  documentNo?: string;
  documentDate: string;
  dueDate?: string | null;
  category?: string;
  description?: string;
  lines: ExpenseLineInput[];
}

export const EXPENSE_INVOICE_LABELS: Record<ExpenseInvoiceType, string> = {
  RECEIVED: "Alınan (Masraf)",
  PROVIDED: "Verilen Hizmet",
};
export const EXPENSE_TARGET_LABELS: Record<ExpenseTargetType, string> = {
  VEHICLE: "Araç",
  LOCATION: "Lokasyon",
  GENERAL: "Genel",
};
