import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyAdminGuard } from "../tenancy/company-admin.guard";
import {
  DATA_SCOPES,
  MODULES,
  ROLE_PRESETS,
  DEFAULT_NEW_USER_ROLE,
} from "./permission-catalog";

/** İzin kataloğu — rol editörü bunu çeker (yalnız şirket yöneticisi). */
@ApiTags("authz")
@ApiBearerAuth()
@UseGuards(CompanyAdminGuard)
@Controller("authz")
export class AuthzController {
  @Get("catalog")
  catalog() {
    return {
      modules: MODULES,
      dataScopes: DATA_SCOPES,
      rolePresets: ROLE_PRESETS,
      defaultRole: DEFAULT_NEW_USER_ROLE,
    };
  }
}
