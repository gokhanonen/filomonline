import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationDto } from "../common/dto/pagination.dto";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { CreateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";
import { TenantsService } from "./tenants.service";

@ApiTags("tenants")
@ApiBearerAuth()
@SkipCompany()
@UseGuards(SuperAdminGuard)
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Get()
  findAll(@Query() q: PaginationDto) {
    return this.tenants.findAll(q);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }
}
