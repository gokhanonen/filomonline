import { Module } from "@nestjs/common";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";
import { PublicQuoteController, QuoteShareController } from "./quote-share.controller";
import { QuoteShareService } from "./quote-share.service";

@Module({
  // QuoteShareController, CrmController'dan önce: "quotes/quick" rotası ":id" rotalarına takılmasın
  controllers: [QuoteShareController, PublicQuoteController, CrmController],
  providers: [CrmService, QuoteShareService],
  exports: [CrmService],
})
export class CrmModule {}
