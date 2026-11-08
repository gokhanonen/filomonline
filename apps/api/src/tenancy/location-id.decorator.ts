import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../auth/auth.types";

/**
 * CompanyGuard'ın doğruladığı aktif lokasyon id'sini enjekte eder (X-Location-Id).
 * Header gönderilmemişse `undefined` döner — hareket damgalama bunu null olarak ele alır
 * (geçiş dönemi: lokasyon seçmeyen eski istemciler kırılmasın). Lokasyon her zaman
 * CompanyGuard'dan gelir, istemci body'sinden ASLA (companyId ile aynı kural).
 */
export const LocationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    return user?.locationId;
  },
);
