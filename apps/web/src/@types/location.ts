export interface Location {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  workplaceInfo?: string | null;
  warehouseInfo?: string | null;
  isExternal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationFormValues {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  workplaceInfo?: string;
  warehouseInfo?: string;
  isExternal?: boolean;
}
