import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { AuthUser } from "../auth/auth.types";
import { QuoteShareService } from "./quote-share.service";
import { QuickQuoteDto, QuoteEmailDto, QuoteRespondDto } from "./dto/quick-quote.dto";

@ApiTags("crm")
@ApiBearerAuth()
@Controller("crm/quotes")
export class QuoteShareController {
  constructor(private readonly quotes: QuoteShareService) {}

  /** Araç kartından tek adımda teklif (+ isteğe bağlı paylaşım linki) */
  @Post("quick")
  quick(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Body() dto: QuickQuoteDto) {
    return this.quotes.quickQuote(companyId, user, dto);
  }

  @Get(":id/detail")
  detail(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.quotes.get(companyId, id);
  }

  @Post(":id/share")
  share(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.quotes.share(companyId, id);
  }

  @Post(":id/email")
  email(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: QuoteEmailDto) {
    return this.quotes.sendEmail(companyId, user, id, dto);
  }

  @Delete(":id/share")
  revoke(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.quotes.revoke(companyId, id);
  }
}

/** Müşteriye özel teklif sayfası — giriş gerektirmez, uzun rastgele token ile */
@ApiTags("public")
@Public()
@SkipCompany()
// Token tahminine karşı: IP başına 60 sn'de 40 istek
@Throttle({ default: { limit: 40, ttl: 60_000 } })
@Controller("public/quotes")
export class PublicQuoteController {
  constructor(private readonly quotes: QuoteShareService) {}

  @Get(":token")
  view(@Param("token") token: string) {
    return this.quotes.publicView(token);
  }

  @Post(":token/respond")
  respond(@Param("token") token: string, @Body() dto: QuoteRespondDto) {
    return this.quotes.respond(token, dto);
  }
}
