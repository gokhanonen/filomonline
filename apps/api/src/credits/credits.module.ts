import { Global, Module } from "@nestjs/common";
import { CreditsService } from "./credits.service";
import { CreditsAdminService } from "./credits-admin.service";
import { CreditsController } from "./credits.controller";
import { CreditsAdminController } from "./credits-admin.controller";

/**
 * Kontör (AI kredisi) modülü. PaymentsModule (global) üzerinden satın alma yapar
 * ve teslimat kancasını kaydeder. Global; AI modülü CreditsService ile harcama yapar.
 */
@Global()
@Module({
  controllers: [CreditsController, CreditsAdminController],
  providers: [CreditsService, CreditsAdminService],
  exports: [CreditsService],
})
export class CreditsModule {}
