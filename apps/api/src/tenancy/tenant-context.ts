import { ForbiddenException } from "@nestjs/common";
import { AuthUser } from "../auth/auth.types";

/**
 * Tenant kapsamlı yönetim işlemleri (rol/kullanıcı) için aktif tenant'ı çözer.
 * Normal kullanıcı: kendi tenantId'si. Süper admin: aktif şirketin tenant'ı
 * (CompanyGuard activeTenantId'yi doldurur).
 */
export function activeTenantId(user: AuthUser): string {
  const tid = user.activeTenantId ?? user.tenantId;
  if (!tid) {
    throw new ForbiddenException("Aktif tenant bağlamı belirlenemedi");
  }
  return tid;
}
