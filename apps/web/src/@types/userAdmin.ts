export interface AdminRole {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface AdminMembership {
  id: string;
  isAdmin: boolean;
  isDefault: boolean;
  company: { id: string; name: string };
  roles: { id: string; name: string; permissions?: string[] }[];
  permissionsGrant?: string[] | null;
  permissionsDeny?: string[] | null;
  locationIds?: string[] | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  extension?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships: AdminMembership[];
}

export interface MembershipInput {
  companyId: string;
  roleIds?: string[];
  permissionsGrant?: string[];
  permissionsDeny?: string[];
  locationIds?: string[];
  isAdmin?: boolean;
  isDefault?: boolean;
}

export interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  extension?: string;
  avatarUrl?: string;
  isActive?: boolean;
}
