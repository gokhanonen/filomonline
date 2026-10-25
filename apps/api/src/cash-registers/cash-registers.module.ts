import { Module } from "@nestjs/common";
import { CashRegistersController } from "./cash-registers.controller";
import { CashRegistersService } from "./cash-registers.service";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports: [ActivityModule],
  controllers: [CashRegistersController],
  providers: [CashRegistersService],
  exports: [CashRegistersService],
})
export class CashRegistersModule {}
