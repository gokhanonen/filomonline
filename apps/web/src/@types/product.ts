export type ProductType =
  | "MATERIAL"
  | "RECEIVED_SERVICE"
  | "PROVIDED_SERVICE"
  | "VEHICLE";

export interface Product {
  id: string;
  companyId: string;
  type: ProductType;
  name: string;
  code: string;
  unit: string;
  integrationCode?: string | null;
  categoryId?: string | null;
  description?: string | null;
  buyingPrice: string; // Decimal -> string
  sellingPrice: string;
  taxRate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormValues {
  type: ProductType;
  name: string;
  code: string;
  unit: string;
  integrationCode?: string;
  description?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  taxRate?: number;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  MATERIAL: "Malzeme",
  RECEIVED_SERVICE: "Alınan Hizmet",
  PROVIDED_SERVICE: "Verilen Hizmet",
  VEHICLE: "Araç",
};

export const COMMON_UNITS = ["Adet", "Saat", "Gün", "Kg", "Litre", "Metre", "Paket"];
