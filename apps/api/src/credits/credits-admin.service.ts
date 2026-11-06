import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  UpsertCreditPackageDto,
  UpsertPlanDto,
} from "./dto/credits-admin.dto";

/** Süper admin: abonelik planları ve kontör paketleri yönetimi. */
@Injectable()
export class CreditsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Planlar ---------------------------------------------------------------

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async createPlan(dto: UpsertPlanDto) {
    await this.clearDefaultIfNeeded(dto.isDefault);
    return this.prisma.subscriptionPlan.create({
      data: {
        code: dto.code,
        name: dto.name,
        monthlyFreeCredits: dto.monthlyFreeCredits ?? 0,
        monthlyPrice:
          dto.monthlyPrice != null ? new Prisma.Decimal(dto.monthlyPrice) : null,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePlan(id: string, dto: UpsertPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Plan bulunamadı.");
    if (dto.isDefault) await this.clearDefaultIfNeeded(true, id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        code: dto.code ?? plan.code,
        name: dto.name ?? plan.name,
        monthlyFreeCredits: dto.monthlyFreeCredits ?? plan.monthlyFreeCredits,
        monthlyPrice:
          dto.monthlyPrice != null
            ? new Prisma.Decimal(dto.monthlyPrice)
            : plan.monthlyPrice,
        isActive: dto.isActive ?? plan.isActive,
        isDefault: dto.isDefault ?? plan.isDefault,
        sortOrder: dto.sortOrder ?? plan.sortOrder,
      },
    });
  }

  private async clearDefaultIfNeeded(makingDefault?: boolean, exceptId?: string) {
    if (!makingDefault) return;
    await this.prisma.subscriptionPlan.updateMany({
      where: { isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false },
    });
  }

  // --- Kontör paketleri ------------------------------------------------------

  listPackages() {
    return this.prisma.creditPackage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  createPackage(dto: UpsertCreditPackageDto) {
    return this.prisma.creditPackage.create({
      data: {
        name: dto.name,
        credits: dto.credits,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? "TRY",
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePackage(id: string, dto: UpsertCreditPackageDto) {
    const pkg = await this.prisma.creditPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException("Paket bulunamadı.");
    return this.prisma.creditPackage.update({
      where: { id },
      data: {
        name: dto.name ?? pkg.name,
        credits: dto.credits ?? pkg.credits,
        price: dto.price != null ? new Prisma.Decimal(dto.price) : pkg.price,
        currency: dto.currency ?? pkg.currency,
        isActive: dto.isActive ?? pkg.isActive,
        sortOrder: dto.sortOrder ?? pkg.sortOrder,
      },
    });
  }
}
