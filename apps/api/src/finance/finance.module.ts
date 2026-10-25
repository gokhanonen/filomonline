import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { LedgerService } from "./ledger.service";
import { ChequesService } from "./cheques.service";
import { FxService } from "./fx.service";
import { OverviewService } from "./overview.service";

@Module({
  imports: [ActivityModule],
  controllers: [FinanceController],
  providers: [FinanceService, LedgerService, ChequesService, FxService, OverviewService],
  exports: [FinanceService, LedgerService],
})
export class FinanceModule {}
