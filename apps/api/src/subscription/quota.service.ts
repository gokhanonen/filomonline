import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type DimState = "OK" | "WARN" | "BLOCK";

export interface DimStatus {
  usage: number;
  limit: number | null; // null = sınırsız
  hardLimit: number | null; // kota * (1 + grace%), yukarı yuvarla
  state: DimState;
  label: string;
}

export interface QuotaStatus {
  plan: { code: string; name: string };
  dimensions: {
    users: DimStatus;
    locations: DimStatus;
    vehicles: DimStatus;
    transactions?: DimStatus; // yalnız freeTransactionLimit tanımlıysa (Free)
  };
  anyWarning: boolean;
  anyBlock: boolean;
  warnings: string[]; // kullanıcıya gösterilecek sürekli uyarı metinleri
}

type Dim = "users" | "locations" | "vehicles" | "transactions";
export type CreateKind = "vehicle" | "sale" | "user" | "location";

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /** hard limit = kota * (1 + grace%), yukarı yuvarla. */
  private hard(limit: number, pct: number): number {
    return Math.ceil(limit * (1 + pct / 100));
  }

  private dim(
    label: string,
    usage: number,
    limit: number | null | undefined,
    pct: number,
  ): DimStatus {
    if (limit == null || limit <= 0) {
      return { usage, limit: null, hardLimit: null, state: "OK", label };
    }
    const hardLimit = this.hard(limit, pct);
    const state: DimState =
      usage >= hardLimit ? "BLOCK" : usage >= limit ? "WARN" : "OK";
    return { usage, limit, hardLimit, state, label };
  }

  /** Tenant'ın firma id'leri. */
  private async companyIds(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.company.findMany({
      where: { tenantId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** Aboneliğin/Varsayılanın yürürlükteki planı. */
  async effectivePlan(tenantId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    const entitled =
      sub &&
      (sub.status === "ACTIVE" ||
        sub.status === "TRIAL" ||
        sub.status === "PAST_DUE" ||
        (sub.status === "CANCELED" &&
          sub.currentPeriodEnd != null &&
          sub.currentPeriodEnd > new Date()));
    if (entitled && sub) return sub.plan;

    const def = await this.prisma.subscriptionPlan.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (def) return def;
    // Hiç plan yoksa: her şeyi kısıtlayan sentetik boş plan.
    return {
      id: "none",
      code: "none",
      name: "Plansız",
      monthlyFreeCredits: 0,
      monthlyPrice: null,
      includedUsers: 0,
      includedLocations: 0,
      includedVehicles: 0,
      freeTransactionLimit: null,
      monthlyListPrice: null,
      monthlyCampaignPrice: null,
      annualMonthsCharged: null,
      annualListPrice: null,
      annualCampaignPrice: null,
      campaignEndsAt: null,
      trialDays: 0,
      graceOveragePct: 10,
      isPublic: false,
      isActive: true,
      isDefault: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SubscriptionPlan;
  }

  /** Tenant'ın anlık kullanımları (firma geneli toplam). */
  async usage(tenantId: string) {
    const ids = await this.companyIds(tenantId);
    const inCompanies = { companyId: { in: ids.length ? ids : ["__none__"] } };
    const [users, locations, activeVehicles, purchases, sales] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.location.count({ where: inCompanies }),
      this.prisma.vehicle.count({
        where: { ...inCompanies, status: { not: "SATILDI" } },
      }),
      this.prisma.purchaseInvoice.count({ where: inCompanies }),
      this.prisma.salesInvoice.count({ where: inCompanies }),
    ]);
    return {
      users,
      locations,
      activeVehicles,
      completedTransactions: purchases + sales,
    };
  }

  /** Kullanıcıya gösterilecek tam kota durumu (uyarı bannerı bunu kullanır). */
  async status(tenantId: string): Promise<QuotaStatus> {
    const plan = await this.effectivePlan(tenantId);
    const u = await this.usage(tenantId);
    const pct = plan.graceOveragePct ?? 10;

    const dimensions: QuotaStatus["dimensions"] = {
      users: this.dim("Kullanıcı", u.users, plan.includedUsers, pct),
      locations: this.dim("Lokasyon", u.locations, plan.includedLocations, pct),
      vehicles: this.dim("Aktif araç", u.activeVehicles, plan.includedVehicles, pct),
    };
    if (plan.freeTransactionLimit != null) {
      dimensions.transactions = this.dim(
        "İşlem (alış+satış)",
        u.completedTransactions,
        plan.freeTransactionLimit,
        pct,
      );
    }

    const all = Object.values(dimensions);
    const warnings: string[] = [];
    for (const d of all) {
      if (d.state === "WARN")
        warnings.push(
          `${d.label} kotanız doldu (${d.usage}/${d.limit}). Daha fazlası için planınızı yükseltin.`,
        );
      if (d.state === "BLOCK")
        warnings.push(
          `${d.label} üst sınırına ulaştınız (${d.usage}/${d.hardLimit}). Devam etmek için plan yükseltmeniz gerekiyor.`,
        );
    }

    return {
      plan: { code: plan.code, name: plan.name },
      dimensions,
      anyWarning: all.some((d) => d.state === "WARN"),
      anyBlock: all.some((d) => d.state === "BLOCK"),
      warnings,
    };
  }

  /**
   * Yeni kayıt oluşturulabilir mi? Hard limiti aşıyorsa 402 fırlatır.
   * Araç girişi: aktif araç kotası + (Free) işlem tetikleyicisi.
   * Satış: işlem tetikleyicisi. Kullanıcı/Lokasyon: kendi kotaları.
   */
  async assertCanCreate(companyId: string, kind: CreateKind) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { tenantId: true },
    });
    if (!company) return; // firma yoksa engelleme (üst katman zaten doğrular)
    const st = await this.status(company.tenantId);

    const toCheck: Dim[] =
      kind === "vehicle"
        ? ["vehicles", "transactions"]
        : kind === "sale"
          ? ["transactions"]
          : kind === "user"
            ? ["users"]
            : ["locations"];

    for (const dim of toCheck) {
      const d = st.dimensions[dim];
      if (d && d.state === "BLOCK") {
        throw new HttpException(
          {
            message: `${d.label} sınırına ulaştınız (${d.usage}/${d.hardLimit}). Devam etmek için planınızı yükseltin.`,
            code: "QUOTA_EXCEEDED",
            dimension: dim,
            usage: d.usage,
            limit: d.limit,
            hardLimit: d.hardLimit,
            plan: st.plan,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }
  }

  /** Salt-okunur (süresi dolmuş abonelik) kontrolü — ileride kullanılabilir. */
  async assertNotReadOnly(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (sub && sub.status === "EXPIRED") {
      throw new ForbiddenException(
        "Aboneliğinizin süresi doldu. Yalnız görüntüleme yapabilirsiniz; yeni kayıt için yenileyin.",
      );
    }
  }
}
