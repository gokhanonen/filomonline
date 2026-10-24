import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth.types";

/**
 * Aktif şirketin yöneticisi (veya süper admin).
 * CompanyGuard'dan SONRA çalışır (isCompanyAdmin orada doldurulur).
 */
@Injectable()
export class CompanyAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (user?.isSuperAdmin || user?.isCompanyAdmin) return true;
    throw new ForbiddenException("Şirket yöneticisi yetkisi gerekli");
  }
}
