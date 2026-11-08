import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { ReportsService } from "./reports.service";
import { missingScopes, stripReport } from "./report-visibility";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Kullanıcı tüm temsilcilerin verisini görebilir mi (yoksa yalnız kendi). */
  private canSeeAll(user: AuthUser): boolean {
    const perms = user.permissions ?? [];
    return (
      !!user.isSuperAdmin ||
      !!user.isCompanyAdmin ||
      perms.includes("*") ||
      perms.includes("reports.all")
    );
  }

  @RequirePermissions("reports.read")
  @Get("summary")
  async summary(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    const data = await this.reports.summary(companyId);
    return stripReport(data, missingScopes(user.permissions));
  }

  @RequirePermissions("reports.read")
  @Get("vehicle-profitability")
  async vehicleProfitability(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    const data = await this.reports.getVehicleProfitability(companyId, {
      status,
      search,
      // "Kendi" ise yalnız kullanıcının temsilci olduğu araçlar.
      salesRepId: this.canSeeAll(user) ? undefined : user.id,
    });
    return stripReport(data, missingScopes(user.permissions));
  }

  @RequirePermissions("reports.read")
  @Get("sales-reps")
  async salesReps(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    const data = await this.reports.getSalesRepPerformance(companyId, {
      onlyUserId: this.canSeeAll(user) ? undefined : user.id,
    });
    return stripReport(data, missingScopes(user.permissions));
  }

  @RequirePermissions("reports.read")
  @Get("trends")
  async trends(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    const data = await this.reports.getMonthlyTrends(companyId, {
      salesRepId: this.canSeeAll(user) ? undefined : user.id,
    });
    return stripReport(data, missingScopes(user.permissions));
  }
}
