import { Global, Module } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionAdminService } from "./subscription-admin.service";
import { QuotaService } from "./quota.service";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionAdminController } from "./subscription-admin.controller";

/**
 * Abonelik + kota/gating modülü. Global: QuotaService diğer servislerde
 * (vehicles.create, invoices.createSales) gating için enjekte edilir.
 * Satın alma PaymentsModule (global) üzerinden; teslimatta abonelik aktive olur.
 */
@Global()
@Module({
  controllers: [SubscriptionController, SubscriptionAdminController],
  providers: [SubscriptionService, SubscriptionAdminService, QuotaService],
  exports: [SubscriptionService, QuotaService],
})
export class SubscriptionModule {}
