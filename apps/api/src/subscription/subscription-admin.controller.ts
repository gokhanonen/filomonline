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
import { SubscriptionAdminService } from "./subscription-admin.service";
import {
  AssignSubscriptionDto,
  UpsertCouponDto,
  UpsertPlanDto,
} from "./dto/subscription.dto";

/** Süper admin: plan kademeleri + kuponlar + tenant abonelikleri. */
@ApiTags("subscription-admin")
@ApiBearerAuth()
@SkipCompany()
@UseGuards(SuperAdminGuard)
@Controller("admin/subscription")
export class SubscriptionAdminController {
  constructor(private readonly admin: SubscriptionAdminService) {}

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

  @Get("coupons")
  listCoupons() {
    return this.admin.listCoupons();
  }
  @Post("coupons")
  createCoupon(@Body() dto: UpsertCouponDto) {
    return this.admin.createCoupon(dto);
  }
  @Patch("coupons/:id")
  updateCoupon(@Param("id") id: string, @Body() dto: UpsertCouponDto) {
    return this.admin.updateCoupon(id, dto);
  }

  @Get("tenants")
  listTenants() {
    return this.admin.listTenants();
  }
  @Post("tenants/:id/assign")
  assign(@Param("id") id: string, @Body() dto: AssignSubscriptionDto) {
    return this.admin.assignPlan(id, dto);
  }
}
