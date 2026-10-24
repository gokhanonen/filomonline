export type RentalContractStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";

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
  monthlyPrice: string;
  currency: string;
  vatRate: string;
  drivers: string[];
  contractDate: string;
  documentNo?: string | null;
  status: RentalContractStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RentalFormValues {
  vehicleId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTcTaxNo?: string;
  durationMonths: number;
  kmLimit?: number;
  startDate: string;
  monthlyPrice: number;
  vatRate?: number;
  contractDate: string;
  documentNo?: string;
  status?: RentalContractStatus;
}

export const RENTAL_STATUS_LABELS: Record<RentalContractStatus, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};
export const RENTAL_STATUS_COLOR: Record<
  RentalContractStatus,
  "neutral" | "success" | "info" | "error"
> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  COMPLETED: "info",
  CANCELLED: "error",
};
