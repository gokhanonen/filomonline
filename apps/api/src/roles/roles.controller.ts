import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CompanyAdminGuard } from "../tenancy/company-admin.guard";
import { activeTenantId } from "../tenancy/tenant-context";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { RolesService } from "./roles.service";

@ApiTags("roles")
@ApiBearerAuth()
@UseGuards(CompanyAdminGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoleDto) {
    return this.roles.create(activeTenantId(user), dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.roles.findAll(activeTenantId(user));
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.roles.findOne(activeTenantId(user), id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(activeTenantId(user), id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.roles.remove(activeTenantId(user), id);
  }
}
