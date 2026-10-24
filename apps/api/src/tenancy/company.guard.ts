import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../auth/auth.types";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { SKIP_COMPANY_KEY } from "./skip-company.decorator";

/**
 * X-Company-Id header'ını doğrular:
 *  - Kullanıcının o şirkette üyeliği var mı?
 *  - Süper admin her şirkete erişebilir.
 * Doğrulama sonrası request.user.companyId + permissions doldurulur.
 * Tüm servis katmanı sorguları bu companyId ile filtrelenmek ZORUNDADIR.
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_COMPANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip || isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) return false; // JwtAuthGuard zaten reddetmiş olmalı

    const companyId = request.headers["x-company-id"] as string | undefined;
    if (!companyId) {
      throw new ForbiddenException("X-Company-Id header'ı zorunlu");
    }

    if (user.isSuperAdmin) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { isActive: true, tenantId: true },
      });
      if (!company || !company.isActive) {
        throw new ForbiddenException("Şirket bulunamadı veya pasif");
      }
      user.companyId = companyId;
      user.activeTenantId = company.tenantId;
      user.isCompanyAdmin = true;
      user.permissions = ["*"];
      return true;
    }

    const membership = await this.prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      include: { roles: true, company: { select: { isActive: true, tenantId: true } } },
    });

    if (!membership || !membership.company.isActive) {
      throw new ForbiddenException("Bu şirkete erişim yetkiniz yok");
    }

    user.companyId = companyId;
    user.activeTenantId = membership.company.tenantId;
    user.isCompanyAdmin = membership.isAdmin;
    user.permissions = [
      ...new Set(
        membership.roles.flatMap((r) => (r.permissions as string[]) ?? []),
      ),
    ];
    return true;
  }
}
