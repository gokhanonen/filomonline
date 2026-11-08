// /auth/me yanıtına karşılık gelen tipler

export interface LocationSummary {
  id: string;
  name: string;
  code: string;
  isExternal: boolean;
}

export interface CompanySummary {
  id: string;
  name: string;
  logoUrl?: string | null;
  isActive: boolean;
  /** Firma→Lokasyon ağacı için aktif lokasyonlar (/auth/me doldurur) */
  locations?: LocationSummary[];
}

export interface RoleSummary {
  id: string;
  name: string;
  permissions: string[];
}

export interface Membership {
  isDefault: boolean;
  isAdmin: boolean;
  company: CompanySummary;
  roles: RoleSummary[];
  permissionsGrant?: string[] | null;
  permissionsDeny?: string[] | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  extension?: string | null;
  avatarUrl?: string | null;
  isSuperAdmin: boolean;
  tenantId: string | null;
  tenant?: { name: string } | null;
  memberships: Membership[];
}
