import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  BillingPeriod,
  Payment,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentsService } from "../payments/payments.service";
import { planPricing, quote, couponValidFor } from "./pricing";

export const SUBSCRIPTION_PRODUCT_TYPE = "SUBSCRIPTION";

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

@Injectable()
export class SubscriptionService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  onModuleInit() {
    this.payments.registerFulfillment(SUBSCRIPTION_PRODUCT_TYPE, (p, tx) =>
      this.fulfill(p, tx),
    );
  }

  /** Kullanıcıya listelenecek herkese açık planlar + hesaplanmış fiyatlar. */
  async listPublicPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const now = new Date();
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      includedUsers: p.includedUsers,
      includedLocations: p.includedLocations,
      includedVehicles: p.includedVehicles,
      monthlyFreeCredits: p.monthlyFreeCredits,
      trialDays: p.trialDays,
      pricing: planPricing(p, now),
      isDefault: p.isDefault,
    }));
  }

  /** Tenant'ın mevcut aboneliği (yoksa null → varsayılan/free geçerli). */
  async getCurrent(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true, coupon: true },
    });
    return sub;
  }

  /** Kupon önizleme (ödeme öncesi tutarı gösterir). */
  async previewQuote(planCode: string, period: BillingPeriod, couponCode?: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });
    if (!plan) throw new NotFoundException("Plan bulunamadı.");
    let coupon = null;
    if (couponCode) {
      coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon) throw new BadRequestException("Kupon bulunamadı.");
      const v = couponValidFor(coupon, plan);
      if (!v.ok) throw new BadRequestException(v.reason);
    }
    return quote(plan, period, coupon);
  }

  /**
   * Abone ol / plan değiştir. Ücretli ise ödeme başlatır (başarıda fulfill aktive eder);
   * ücretsiz (final 0) ise doğrudan aktive eder.
   */
  async subscribe(
    tenantId: string,
    userId: string | undefined,
    input: { planCode: string; period: BillingPeriod; couponCode?: string },
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: input.planCode },
    });
    if (!plan || !plan.isActive) throw new NotFoundException("Plan bulunamadı.");

    let coupon = null;
    if (input.couponCode) {
      coupon = await this.prisma.coupon.findUnique({
        where: { code: input.couponCode },
      });
      if (!coupon) throw new BadRequestException("Kupon bulunamadı.");
      const v = couponValidFor(coupon, plan);
      if (!v.ok) throw new BadRequestException(v.reason);
    }

    const sub = await this.getCurrent(tenantId);
    const q = quote(plan, input.period, coupon, sub?.customPrice ? Number(sub.customPrice) : null);

    // Ücretsiz / final 0 → doğrudan aktive et (ödeme yok).
    if (q.finalPrice <= 0) {
      await this.prisma.$transaction((tx) =>
        this.activate(tx, {
          tenantId,
          planId: plan.id,
          period: input.period,
          priceSnapshot: 0,
          couponId: coupon?.id,
          freeMonths: q.freeMonths,
        }),
      );
      return { free: true, status: "ACTIVE" as const };
    }

    const company = await this.prisma.company.findFirst({
      where: { tenantId },
      select: { id: true, name: true },
    });
    if (!company)
      throw new BadRequestException("Tenant için firma bulunamadı.");

    const intent = await this.payments.createIntent({
      companyId: company.id,
      tenantId,
      userId,
      amount: q.finalPrice,
      currency: "TRY",
      productType: SUBSCRIPTION_PRODUCT_TYPE,
      productRef: plan.id,
      description: `${plan.name} aboneliği (${input.period === "ANNUAL" ? "Yıllık" : "Aylık"})`,
      companyName: company.name,
      meta: {
        kind: "subscription",
        tenantId,
        planId: plan.id,
        period: input.period,
        couponId: coupon?.id ?? null,
        freeMonths: q.freeMonths,
        priceSnapshot: q.finalPrice,
      },
    });
    return intent;
  }

  /** Dönem sonunda iptal (hemen kesmez; mevcut dönem bitene kadar geçerli). */
  async cancel(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException("Aktif abonelik yok.");
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
    });
  }

  /** Ödeme başarılı → aboneliği aktive eder (payments transaction'ı içinde). */
  private async fulfill(payment: Payment, tx: Prisma.TransactionClient) {
    if (payment.productType !== SUBSCRIPTION_PRODUCT_TYPE) return;
    const meta = (payment.meta ?? {}) as Record<string, unknown>;
    const tenantId = (meta.tenantId as string) || payment.tenantId || undefined;
    const planId = meta.planId as string | undefined;
    const period = (meta.period as BillingPeriod) || "MONTHLY";
    if (!tenantId || !planId) return;

    await this.activate(tx, {
      tenantId,
      planId,
      period,
      priceSnapshot: Number(payment.amount),
      couponId: (meta.couponId as string) ?? undefined,
      freeMonths: Number(meta.freeMonths ?? 0),
    });

    if (meta.couponId) {
      await tx.coupon.update({
        where: { id: meta.couponId as string },
        data: { redeemedCount: { increment: 1 } },
      });
    }
  }

  /** Aboneliği aktive/yenile + Tenant.subscriptionPlanId senkronu (credits için). */
  private async activate(
    tx: Prisma.TransactionClient,
    p: {
      tenantId: string;
      planId: string;
      period: BillingPeriod;
      priceSnapshot: number;
      couponId?: string;
      freeMonths?: number;
    },
  ) {
    const now = new Date();
    const months = (p.period === "ANNUAL" ? 12 : 1) + (p.freeMonths ?? 0);
    const periodEnd = addMonths(now, months);

    const data = {
      planId: p.planId,
      status: SubscriptionStatus.ACTIVE,
      period: p.period,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      priceSnapshot: new Prisma.Decimal(p.priceSnapshot),
      couponId: p.couponId,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };
    await tx.subscription.upsert({
      where: { tenantId: p.tenantId },
      update: data,
      create: { tenantId: p.tenantId, ...data },
    });

    // Credits modülü aylık hediyeyi Tenant.subscriptionPlan'dan okur — senkron tut.
    await tx.tenant.update({
      where: { id: p.tenantId },
      data: { subscriptionPlanId: p.planId },
    });
  }
}
