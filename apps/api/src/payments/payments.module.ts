import { Global, Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { MockPaymentProvider } from "./providers/mock.provider";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";

/**
 * Ürün-bağımsız ödeme (KK tahsilat) altyapısı. Global; ürün modülleri (credits…)
 * PaymentsService'i enjekte edip teslimat kancası kaydeder.
 *
 * Gerçek sağlayıcıya geçince: ilgili adaptörü (IyzicoProvider/PaytrProvider…)
 * ekleyip PAYMENT_PROVIDER'ı ona bağlayın; üst katman değişmez.
 */
@Global()
@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MockPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
