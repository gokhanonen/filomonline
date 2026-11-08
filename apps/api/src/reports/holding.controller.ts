import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { ReportsService } from "./reports.service";

/**
 * Holding (konsolide) görünümü — kullanıcının erişebildiği TÜM firmaların özeti bir arada.
 * Salt-okunur. Firma bağlamı gerektirmez (@SkipCompany); kullanıcının üyelikleri baz alınır.
 */
@ApiTags("holding")
@ApiBearerAuth()
@SkipCompany()
@Controller("holding")
export class HoldingController {
  constructor(
    private readonly reports: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("dashboard")
  async dashboard(@CurrentUser() user: AuthUser) {
    const memberships = await this.prisma.companyMembership.findMany({
      where: { userId: user.id },
      select: { company: { select: { id: true, name: true, isActive: true } } },
    });
    const companies = memberships
      .map((m) => m.company)
      .filter((c) => c.isActive)
      .map((c) => ({ id: c.id, name: c.name }));

    const tenant = user.tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { name: true },
        })
      : null;

    const data = await this.reports.holdingSummary(companies);
    return {
      holdingName: tenant?.name ?? "Holding",
      companyCount: companies.length,
      ...data,
    };
  }
}
