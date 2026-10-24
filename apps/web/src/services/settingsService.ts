import axios from "@/utils/axios";

export interface CompanyInfoSettings {
  title?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxOffice?: string;
  taxNumber?: string;
  website?: string;
  logoKey?: string;
}
export interface InvoiceDefaultsSettings {
  vatRate?: number; // varsayılan KDV %
  profitVatRate?: number; // kâr KDV'si (ikinci el özel matrah) %
  serviceFeeMultiplier?: number; // şahıs satışında hizmet bedeli çarpanı (1.20)
  currency?: string;
}
export interface NumberingSettings {
  salesContractPrefix?: string;
  rentalContractPrefix?: string;
  expensePrefix?: string;
}
export interface VehicleDefaultsSettings {
  defaultLocationId?: string;
  requireTransferApproval?: boolean;
  stockAlertDays?: number; // stokta X günü geçen araçlar uyarısı
}
export interface NotificationSettings {
  optionExpiryDays?: number;
  documentExpiryDays?: number;
  rentalEndDays?: number;
}

export interface CompanySettings {
  "company.info"?: CompanyInfoSettings;
  "invoice.defaults"?: InvoiceDefaultsSettings;
  numbering?: NumberingSettings;
  "vehicle.defaults"?: VehicleDefaultsSettings;
  notifications?: NotificationSettings;
  [key: string]: unknown;
}

export const SETTINGS_DEFAULTS: Required<
  Pick<CompanySettings, "invoice.defaults" | "numbering" | "vehicle.defaults" | "notifications">
> = {
  "invoice.defaults": { vatRate: 20, profitVatRate: 20, serviceFeeMultiplier: 1.2, currency: "TRY" },
  numbering: { salesContractPrefix: "SS-", rentalContractPrefix: "KS-", expensePrefix: "MS-" },
  "vehicle.defaults": { requireTransferApproval: true, stockAlertDays: 60 },
  notifications: { optionExpiryDays: 3, documentExpiryDays: 30, rentalEndDays: 15 },
};

export async function getSettings(): Promise<CompanySettings> {
  const { data } = await axios.get<CompanySettings>("/settings");
  return data;
}
export async function saveSettings(values: Partial<CompanySettings>): Promise<CompanySettings> {
  const { data } = await axios.put<CompanySettings>("/settings", values);
  return data;
}
export async function saveSetting(key: string, value: unknown) {
  await axios.put(`/settings/${key}`, { value });
}
