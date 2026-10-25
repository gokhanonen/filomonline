import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequirePermissions("reports.read")
  @Get("summary")
  summary(@CompanyId() companyId: string) {
    return this.reports.summary(companyId);
  }

  @RequirePermissions("reports.read")
  @Get("vehicle-profitability")
  vehicleProfitability(
    @CompanyId() companyId: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.reports.getVehicleProfitability(companyId, { status, search });
  }

  @RequirePermissions("reports.read")
  @Get("sales-reps")
  salesReps(@CompanyId() companyId: string) {
    return this.reports.getSalesRepPerformance(companyId);
  }

  @RequirePermissions("reports.read")
  @Get("trends")
  trends(@CompanyId() companyId: string) {
    return this.reports.getMonthlyTrends(companyId);
  }
}
