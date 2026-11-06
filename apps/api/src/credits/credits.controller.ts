import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreditsService } from "./credits.service";
import { PurchaseCreditsDto } from "./dto/credits-admin.dto";

@ApiTags("credits")
@ApiBearerAuth()
@Controller("credits")
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  /** Firma kontör bakiyesi (ücretsiz + ücretli) */
  @Get("wallet")
  wallet(@CompanyId() companyId: string) {
    return this.credits.getWallet(companyId);
  }

  /** Kontör hareket geçmişi */
  @Get("transactions")
  transactions(@CompanyId() companyId: string) {
    return this.credits.listTransactions(companyId);
  }

  /** Satın alınabilir kontör paketleri (aktif) */
  @Get("packages")
  packages() {
    return this.credits.listPackages();
  }

  /** Kontör satın alma başlat → ödeme yönlendirmesi döner */
  @Post("purchase")
  purchase(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PurchaseCreditsDto,
  ) {
    return this.credits.purchase(companyId, user.id, dto.packageId, dto.returnUrl);
  }
}
