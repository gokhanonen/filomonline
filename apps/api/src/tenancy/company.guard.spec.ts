import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CompanyGuard } from "./company.guard";
import { AuthUser } from "../auth/auth.types";

/**
 * CompanyGuard'ın lokasyon çözümlemesi (X-Location-Id):
 *  - Geçerli lokasyon → request.user.locationId'ye yazılır.
 *  - Lokasyon başka firmaya ait / pasif → 403.
 *  - Header yok → locationId undefined (lokasyon gerektirmeyen uçlar etkilenmez).
 */
describe("CompanyGuard — lokasyon çözümlemesi", () => {
  const COMPANY = "co_1";
  const TENANT = "tn_1";
  const LOCATION = "loc_1";

  function makeContext(user: AuthUser, headers: Record<string, string>) {
    const request = { user, headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as never;
  }

  function makeGuard(locationFound: boolean) {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const prisma = {
      company: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ isActive: true, tenantId: TENANT }),
      },
      location: {
        findFirst: jest
          .fn()
          .mockResolvedValue(locationFound ? { id: LOCATION } : null),
      },
    } as never;
    return new CompanyGuard(reflector, prisma);
  }

  const superAdmin = (): AuthUser => ({
    id: "u_1",
    tenantId: TENANT,
    isSuperAdmin: true,
  });

  it("geçerli lokasyonu request.user.locationId'ye yazar", async () => {
    const guard = makeGuard(true);
    const user = superAdmin();
    const ctx = makeContext(user, {
      "x-company-id": COMPANY,
      "x-location-id": LOCATION,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(user.locationId).toBe(LOCATION);
  });

  it("başka firmaya ait / pasif lokasyonda 403 atar", async () => {
    const guard = makeGuard(false);
    const user = superAdmin();
    const ctx = makeContext(user, {
      "x-company-id": COMPANY,
      "x-location-id": "loc_baska",
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("header yoksa locationId undefined kalır", async () => {
    const guard = makeGuard(true);
    const user = superAdmin();
    const ctx = makeContext(user, { "x-company-id": COMPANY });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(user.locationId).toBeUndefined();
  });
});
