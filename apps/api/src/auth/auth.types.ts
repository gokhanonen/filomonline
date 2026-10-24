/** JWT access token payload'ı */
export interface JwtPayload {
  sub: string; // userId
  tenantId: string | null;
  isSuperAdmin: boolean;
}

/** Guard'lar tarafından request.user'a yerleştirilen kimlik */
export interface AuthUser {
  id: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  /** CompanyGuard doldurur: aktif şirket */
  companyId?: string;
  /** CompanyGuard doldurur: aktif şirketin tenant'ı (tenant kapsamlı yönetim için) */
  activeTenantId?: string;
  /** CompanyGuard doldurur: aktif şirketteki izin anahtarları */
  permissions?: string[];
  /** CompanyGuard doldurur: şirket yöneticisi mi */
  isCompanyAdmin?: boolean;
}
