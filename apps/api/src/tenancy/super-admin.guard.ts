import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth.types";

/** Yalnızca platform süper admini. Tenant/şirket bootstrap yönetimi için. */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException("Süper admin yetkisi gerekli");
    }
    return true;
  }
}
