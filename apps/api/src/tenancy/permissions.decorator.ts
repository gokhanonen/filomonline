import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthUser } from "../auth/auth.types";

export const PERMISSIONS_KEY = "requiredPermissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser;
    const owned = user?.permissions ?? [];
    if (user?.isSuperAdmin || user?.isCompanyAdmin || owned.includes("*")) {
      return true;
    }
    const ok = required.every((p) => owned.includes(p));
    if (!ok) throw new ForbiddenException("Bu işlem için yetkiniz yok");
    return true;
  }
}

/** Örn: @RequirePermissions('vehicles.read', 'vehicles.write') */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(PermissionsGuard),
  );
