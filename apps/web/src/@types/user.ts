// /auth/me yanıtına karşılık gelen tipler

export interface CompanySummary {
  id: string;
  name: string;
  logoUrl?: string | null;
  isActive: boolean;
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
  memberships: Membership[];
}
