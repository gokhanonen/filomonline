import { PaymentProviderType, PaymentStatus } from "@prisma/client";

/** Ödeme başlatma girdisi (ürün-bağımsız). */
export interface CreatePaymentInput {
  /** Bizim Payment kaydımızın id'si */
  paymentId: string;
  amount: number;
  currency: string;
  description?: string;
  company: { id: string; name?: string | null };
  user?: { id: string; email?: string | null; name?: string | null };
  /** 3D-Secure / hosted ödeme sonrası dönülecek URL */
  returnUrl?: string;
  meta?: Record<string, unknown>;
}

/** Ödeme başlatma sonucu — sağlayıcıdan normalize edilmiş. */
export interface CreatePaymentResult {
  providerRef?: string;
  status: PaymentStatus;
  /** 3DS/hosted ödeme sayfası için yönlendirme URL'i */
  redirectUrl?: string;
  /** iframe token vb. istemciye verilecek ek veri */
  clientData?: Record<string, unknown>;
  raw?: unknown;
}

/** Sağlayıcı callback/webhook'undan normalize edilmiş sonuç. */
export interface VerifiedCallback {
  providerRef?: string;
  /** Sağlayıcı bizim paymentId'mizi geri döndürüyorsa */
  paymentId?: string;
  status: PaymentStatus;
  failReason?: string;
  raw?: unknown;
}

export interface RefundInput {
  providerRef: string;
  amount: number;
}

/**
 * Ödeme sağlayıcısı arabirimi. iyzico / PayTR / Stripe birer adaptör olarak
 * bunu uygular. Şimdilik yalnız MockProvider var; gerçek sağlayıcı seçilince
 * tek bir adaptör eklenir, üst katman (PaymentsService) değişmez.
 */
export interface PaymentProvider {
  readonly type: PaymentProviderType;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Webhook/callback gövdesini doğrulayıp normalize eder. */
  verifyCallback(
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<VerifiedCallback>;
  refund?(input: RefundInput): Promise<{ status: PaymentStatus; raw?: unknown }>;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
