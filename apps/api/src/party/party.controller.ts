import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { activeTenantId } from "../tenancy/tenant-context";
import { PartyService } from "./party.service";

/** Holding-geneli kimlik (Party) görünümü — firma bağlamı gerektirmez. */
@ApiTags("party")
@ApiBearerAuth()
@SkipCompany()
@Controller("party")
export class PartyController {
  constructor(private readonly party: PartyService) {}

  /** Kişinin holding genelindeki tüm firma ilişkileri (cari bakiye) + lead'leri */
  @Get(":id")
  async overview(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.party.overview(id, activeTenantId(user));
    if (!data) throw new NotFoundException("Kişi bulunamadı.");
    return data;
  }
}
