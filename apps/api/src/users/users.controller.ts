import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CompanyAdminGuard } from "../tenancy/company-admin.guard";
import { activeTenantId } from "../tenancy/tenant-context";
import {
  CreateUserDto,
  SetMembershipsDto,
  UpdateUserDto,
} from "./dto/user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(CompanyAdminGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(activeTenantId(user), dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.users.findAll(activeTenantId(user));
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.users.findOne(activeTenantId(user), id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(activeTenantId(user), id, dto);
  }

  @Put(":id/memberships")
  setMemberships(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: SetMembershipsDto,
  ) {
    return this.users.setMemberships(activeTenantId(user), id, dto);
  }
}
