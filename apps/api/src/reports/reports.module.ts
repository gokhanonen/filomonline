import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { HoldingController } from "./holding.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController, HoldingController],
  providers: [ReportsService],
})
export class ReportsModule {}
