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
  roles: { id: string; name: string }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  extension?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships: AdminMembership[];
}

export interface MembershipInput {
  companyId: string;
  roleIds?: string[];
  isAdmin?: boolean;
  isDefault?: boolean;
}

export interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  extension?: string;
  isActive?: boolean;
}
