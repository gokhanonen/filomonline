import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Payment, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
  VerifiedCallback,
} from "./payment-provider.interface";

/**
 * Bir ürünün ödemesi başarıyla tahsil edilince çağrılır. Ürün modülü (ör. credits)
 * kendi teslimatını BURADA yapar; aynı transaction içinde çalışır, böylece
 * "ödeme başarılı ama kontör yüklenmedi" durumu oluşmaz.
 */
export type FulfillmentHandler = (
  payment: Payment,
  tx: Prisma.TransactionClient,
) => Promise<void>;

export interface CreateIntentInput {
  companyId: string;
  tenantId?: string | null;
  userId?: string | null;
  amount: number;
  currency?: string;
  productType: string; // "CREDITS" — yarın başka ürün
  productRef?: string | null;
  quantity?: number | null;
  description?: string;
  companyName?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  returnUrl?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly fulfillment = new Map<string, FulfillmentHandler>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Ürün modülleri (credits vb.) teslimat kancasını buraya kaydeder. */
  registerFulfillment(productType: string, handler: FulfillmentHandler) {
    if (this.fulfillment.has(productType)) {
      this.logger.warn(`Fulfillment zaten kayıtlı, üzerine yazılıyor: ${productType}`);
    }
    this.fulfillment.set(productType, handler);
  }

  /** Ödeme başlatır: Payment(PENDING) oluşturur, sağlayıcıyı çağırır, yönlendirmeyi döner. */
  async createIntent(input: CreateIntentInput) {
    if (!(input.amount > 0)) {
      throw new BadRequestException("Ödeme tutarı sıfırdan büyük olmalı.");
    }
    const currency = input.currency || "TRY";
    const payment = await this.prisma.payment.create({
      data: {
        companyId: input.companyId,
        tenantId: input.tenantId ?? undefined,
        userId: input.userId ?? undefined,
        provider: this.provider.type,
        status: PaymentStatus.PENDING,
        amount: new Prisma.Decimal(input.amount),
        currency,
        productType: input.productType,
        productRef: input.productRef ?? undefined,
        quantity: input.quantity ?? undefined,
        description: input.description,
        meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    try {
      const result = await this.provider.createPayment({
        paymentId: payment.id,
        amount: input.amount,
        currency,
        description: input.description,
        company: { id: input.companyId, name: input.companyName },
        user: input.userId
          ? { id: input.userId, email: input.userEmail, name: input.userName }
          : undefined,
        returnUrl: input.returnUrl,
        meta: input.meta,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerRef: result.providerRef,
          status: result.status,
          meta: {
            ...((payment.meta as Record<string, unknown>) ?? {}),
            providerResult: result.raw as Prisma.InputJsonValue,
          } as Prisma.InputJsonValue,
        },
      });

      // Sağlayıcı anında başarılı döndüyse teslimatı hemen yap.
      if (result.status === PaymentStatus.SUCCEEDED) {
        await this.handleStatus(payment.id, PaymentStatus.SUCCEEDED, undefined, result.raw);
      }

      return {
        payment: updated,
        status: result.status,
        redirectUrl: result.redirectUrl,
        clientData: result.clientData,
      };
    } catch (err) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failReason: (err as Error)?.message ?? "Ödeme başlatılamadı",
        },
      });
      throw new BadRequestException(
        `Ödeme başlatılamadı: ${(err as Error)?.message ?? "bilinmeyen hata"}`,
      );
    }
  }

  /** Sağlayıcı webhook/callback gövdesini doğrulayıp durumu uygular. */
  async handleCallback(payload: unknown, headers?: Record<string, string>) {
    const verified = await this.provider.verifyCallback(payload, headers);
    return this.applyVerified(verified);
  }

  private async applyVerified(verified: VerifiedCallback) {
    const payment = await this.findByRef(verified.paymentId, verified.providerRef);
    if (!payment) throw new NotFoundException("Ödeme kaydı bulunamadı.");
    return this.handleStatus(payment.id, verified.status, verified.failReason, verified.raw);
  }

  private async findByRef(paymentId?: string, providerRef?: string) {
    if (paymentId) {
      const p = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      if (p) return p;
    }
    if (providerRef) {
      return this.prisma.payment.findFirst({ where: { providerRef } });
    }
    return null;
  }

  /**
   * Bir ödemenin durumunu günceller. SUCCEEDED'a İLK geçişte ilgili ürünün
   * teslimat kancasını AYNI transaction içinde çağırır (idempotent).
   */
  async handleStatus(
    paymentId: string,
    status: PaymentStatus,
    failReason?: string,
    raw?: unknown,
  ): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Ödeme kaydı bulunamadı.");

      // Zaten sonlanmışsa tekrar işlem yapma (idempotent).
      if (
        payment.status === PaymentStatus.SUCCEEDED ||
        payment.status === PaymentStatus.REFUNDED
      ) {
        return payment;
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          failReason: status === PaymentStatus.FAILED ? failReason : null,
          paidAt: status === PaymentStatus.SUCCEEDED ? new Date() : payment.paidAt,
          meta: raw
            ? ({
                ...((payment.meta as Record<string, unknown>) ?? {}),
                callback: raw as Prisma.InputJsonValue,
              } as Prisma.InputJsonValue)
            : (payment.meta as Prisma.InputJsonValue | undefined),
        },
      });

      if (status === PaymentStatus.SUCCEEDED) {
        const handler = this.fulfillment.get(payment.productType);
        if (!handler) {
          this.logger.error(
            `Ödeme başarılı ama '${payment.productType}' için teslimat kancası yok (payment ${payment.id})`,
          );
        } else {
          await handler(updated, tx);
        }
      }
      return updated;
    });
  }

  /** Dev/mock: ödeme sonucunu simüle eder (gerçek sağlayıcıda webhook yapar). */
  async mockComplete(paymentId: string, outcome: "success" | "fail") {
    return this.handleCallback({ paymentId, outcome });
  }

  async getPayment(companyId: string, id: string) {
    const p = await this.prisma.payment.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException("Ödeme bulunamadı.");
    return p;
  }

  async listPayments(companyId: string, take = 50) {
    return this.prisma.payment.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
