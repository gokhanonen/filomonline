import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ContractKind } from "@prisma/client";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { activeTenantId } from "../tenancy/tenant-context";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { ContractTemplatesService } from "./contract-templates.service";
import {
  CreateContractTemplateDto,
  RenderContractDto,
  UpdateContractTemplateDto,
} from "./dto/contract-template.dto";

@ApiTags("contract-templates")
@ApiBearerAuth()
@Controller("contracts/templates")
export class ContractTemplatesController {
  constructor(private readonly templates: ContractTemplatesService) {}

  @RequirePermissions("rentals.read")
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query("type") type?: ContractKind,
  ) {
    return this.templates.findAll(activeTenantId(user), type);
  }

  @RequirePermissions("rentals.read")
  @Get(":id")
  findOne(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.templates.findOne(activeTenantId(user), id);
  }

  @RequirePermissions("catalog.write") // Or settings.write
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateContractTemplateDto,
  ) {
    return this.templates.create(activeTenantId(user), dto);
  }

  @RequirePermissions("catalog.write")
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateContractTemplateDto,
  ) {
    return this.templates.update(activeTenantId(user), id, dto);
  }

  @RequirePermissions("catalog.write")
  @Delete(":id")
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.templates.remove(activeTenantId(user), id);
  }

  @RequirePermissions("rentals.read")
  @Post("render")
  render(
    @CurrentUser() user: AuthUser,
    @CompanyId() companyId: string,
    @Body() dto: RenderContractDto,
  ) {
    return this.templates.render(activeTenantId(user), companyId, dto);
  }
}
