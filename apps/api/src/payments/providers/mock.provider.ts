import { Injectable } from "@nestjs/common";
import { PaymentProviderType, PaymentStatus } from "@prisma/client";
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifiedCallback,
} from "../payment-provider.interface";

/**
 * Sahte ödeme sağlayıcısı — gerçek KK tahsilatı YAPMAZ.
 * Akışı uçtan uca denemek için: ödeme "REQUIRES_ACTION" döner ve istemciyi
 * bizim mock onay ekranımıza/endpoint'imize yönlendirir. Gerçek sağlayıcı
 * (iyzico/PayTR/Stripe) seçilince bu dosyanın yerine o adaptör konur.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.MOCK;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerRef = `mock_${input.paymentId}`;
    // Gerçek sağlayıcıda burada 3DS/hosted sayfa URL'i dönerdi.
    return {
      providerRef,
      status: PaymentStatus.REQUIRES_ACTION,
      // İstemci bu URL'e giderek mock onay ekranını açar (dev amaçlı).
      redirectUrl: `/billing/mock-checkout?payment=${input.paymentId}`,
      clientData: { mock: true },
      raw: { note: "mock provider — no real charge" },
    };
  }

  async verifyCallback(payload: unknown): Promise<VerifiedCallback> {
    const body = (payload ?? {}) as {
      paymentId?: string;
      providerRef?: string;
      outcome?: string;
    };
    const ok = body.outcome === "success";
    return {
      paymentId: body.paymentId,
      providerRef: body.providerRef,
      status: ok ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
      failReason: ok ? undefined : "Mock ödeme reddedildi",
      raw: body,
    };
  }

  async refund(input: { providerRef: string; amount: number }) {
    return { status: PaymentStatus.REFUNDED, raw: input };
  }
}
