import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth.types";

/**
 * CompanyGuard'ın doğruladığı aktif şirket id'sini enjekte eder.
 * Şirket kapsamlı tüm servis çağrıları bu değerle filtrelenir.
 */
export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user?.companyId) {
      throw new ForbiddenException("Aktif şirket bağlamı yok");
    }
    return user.companyId;
  },
);
