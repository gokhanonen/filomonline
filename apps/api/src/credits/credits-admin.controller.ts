import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { CreditsAdminService } from "./credits-admin.service";
import {
  UpsertCreditPackageDto,
  UpsertPlanDto,
} from "./dto/credits-admin.dto";

/** Süper admin: abonelik planları + kontör paketleri yönetimi. */
@ApiTags("credits-admin")
@ApiBearerAuth()
@SkipCompany()
@UseGuards(SuperAdminGuard)
@Controller("admin/credits")
export class CreditsAdminController {
  constructor(private readonly admin: CreditsAdminService) {}

  @Get("plans")
  listPlans() {
    return this.admin.listPlans();
  }

  @Post("plans")
  createPlan(@Body() dto: UpsertPlanDto) {
    return this.admin.createPlan(dto);
  }

  @Patch("plans/:id")
  updatePlan(@Param("id") id: string, @Body() dto: UpsertPlanDto) {
    return this.admin.updatePlan(id, dto);
  }

  @Get("packages")
  listPackages() {
    return this.admin.listPackages();
  }

  @Post("packages")
  createPackage(@Body() dto: UpsertCreditPackageDto) {
    return this.admin.createPackage(dto);
  }

  @Patch("packages/:id")
  updatePackage(@Param("id") id: string, @Body() dto: UpsertCreditPackageDto) {
    return this.admin.updatePackage(id, dto);
  }
}
