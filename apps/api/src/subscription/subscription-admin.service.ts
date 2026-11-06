import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QuotaService } from "./quota.service";
import {
  AssignSubscriptionDto,
  UpsertCouponDto,
  UpsertPlanDto,
} from "./dto/subscription.dto";

const dec = (v?: number | null) => (v == null ? undefined : new Prisma.Decimal(v));

/** Süper admin: plan (tüm alanlar) + kupon + tenant aboneliği yönetimi. */
@Injectable()
export class SubscriptionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
  ) {}

  // --- Planlar ---------------------------------------------------------------

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  private planData(dto: UpsertPlanDto) {
    return {
      code: dto.code,
      name: dto.name,
      monthlyFreeCredits: dto.monthlyFreeCredits ?? 0,
      includedUsers: dto.includedUsers ?? 0,
      includedLocations: dto.includedLocations ?? 0,
      includedVehicles: dto.includedVehicles ?? 0,
      freeTransactionLimit: dto.freeTransactionLimit ?? null,
      monthlyListPrice: dec(dto.monthlyListPrice) ?? null,
      monthlyCampaignPrice: dec(dto.monthlyCampaignPrice) ?? null,
      annualMonthsCharged: dto.annualMonthsCharged ?? null,
      annualListPrice: dec(dto.annualListPrice) ?? null,
      annualCampaignPrice: dec(dto.annualCampaignPrice) ?? null,
      campaignEndsAt: dto.campaignEndsAt ? new Date(dto.campaignEndsAt) : null,
      trialDays: dto.trialDays ?? 0,
      graceOveragePct: dto.graceOveragePct ?? 10,
      isPublic: dto.isPublic ?? true,
      isActive: dto.isActive ?? true,
      isDefault: dto.isDefault ?? false,
      sortOrder: dto.sortOrder ?? 0,
    };
  }

  async createPlan(dto: UpsertPlanDto) {
    if (dto.isDefault) await this.clearDefault();
    return this.prisma.subscriptionPlan.create({ data: this.planData(dto) });
  }

  async updatePlan(id: string, dto: UpsertPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Plan bulunamadı.");
    if (dto.isDefault) await this.clearDefault(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: this.planData(dto),
    });
  }

  private async clearDefault(exceptId?: string) {
    await this.prisma.subscriptionPlan.updateMany({
      where: { isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false },
    });
  }

  // --- Kuponlar --------------------------------------------------------------

  listCoupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  private couponData(dto: UpsertCouponDto) {
    return {
      code: dto.code,
      type: dto.type,
      value: new Prisma.Decimal(dto.value),
      description: dto.description,
      appliesToPlanCodes: dto.appliesToPlanCodes ?? null,
      maxRedemptions: dto.maxRedemptions ?? null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive: dto.isActive ?? true,
    };
  }

  createCoupon(dto: UpsertCouponDto) {
    return this.prisma.coupon.create({ data: this.couponData(dto) });
  }

  async updateCoupon(id: string, dto: UpsertCouponDto) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("Kupon bulunamadı.");
    return this.prisma.coupon.update({ where: { id }, data: this.couponData(dto) });
  }

  // --- Tenant aboneliği ------------------------------------------------------

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: { subscription: { include: { plan: true } } },
      orderBy: { name: "asc" },
    });
    return Promise.all(
      tenants.map(async (t) => ({
        id: t.id,
        name: t.name,
        subscription: t.subscription
          ? {
              status: t.subscription.status,
              period: t.subscription.period,
              planCode: t.subscription.plan.code,
              planName: t.subscription.plan.name,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
            }
          : null,
        usage: await this.quota.usage(t.id),
      })),
    );
  }

  /** Süper admin tenant'a plan atar (ödeme olmadan — anlaşmalı/elle). */
  async assignPlan(tenantId: string, dto: AssignSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.planCode },
    });
    if (!plan) throw new NotFoundException("Plan bulunamadı.");

    const now = new Date();
    const period = dto.period ?? "MONTHLY";
    const months = period === "ANNUAL" ? 12 : 1;
    const trialEndsAt = dto.trialDays
      ? new Date(now.getTime() + dto.trialDays * 86400_000)
      : null;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + months);

    const data = {
      planId: plan.id,
      status: trialEndsAt ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
      period,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt,
      customPrice: dec(dto.customPrice) ?? null,
      note: dto.note,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };

    const [sub] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { tenantId },
        update: data,
        create: { tenantId, ...data },
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { subscriptionPlanId: plan.id },
      }),
    ]);
    return sub;
  }
}
