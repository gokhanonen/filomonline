import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CompanyAdminGuard } from "../tenancy/company-admin.guard";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  all(@CompanyId() companyId: string) {
    return this.settings.getAll(companyId);
  }

  // Sabit rotalar ":key"den ÖNCE
  @UseGuards(CompanyAdminGuard)
  @Get("integrations/gemini/models")
  geminiModels(@CompanyId() companyId: string) {
    return this.settings.geminiModels(companyId);
  }

  @UseGuards(CompanyAdminGuard)
  @Put()
  setMany(@CompanyId() companyId: string, @Body() body: Record<string, unknown>) {
    return this.settings.setMany(companyId, body);
  }

  @UseGuards(CompanyAdminGuard)
  @Put(":key")
  set(
    @CompanyId() companyId: string,
    @Param("key") key: string,
    @Body() body: { value: unknown },
  ) {
    return this.settings.set(companyId, key, body.value);
  }
}
