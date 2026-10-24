export type AccountType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type EntityType = "INDIVIDUAL" | "CORPORATE";

export interface Account {
  id: string;
  companyId: string;
  type: AccountType;
  entityType: EntityType;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  tckn?: string | null;
  categoryId?: string | null;
  integrationCode?: string | null;
  isPotential: boolean;
  isActive: boolean;
  balance: string; // Prisma Decimal -> string
  createdAt: string;
  updatedAt: string;
}

export interface AccountFormValues {
  type: AccountType;
  entityType: EntityType;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  postalCode?: string;
  taxOffice?: string;
  taxNumber?: string;
  tckn?: string;
  integrationCode?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CUSTOMER: "Müşteri",
  SUPPLIER: "Tedarikçi",
  BOTH: "Müşteri + Tedarikçi",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  INDIVIDUAL: "Şahıs",
  CORPORATE: "Firma",
};
