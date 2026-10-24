import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AllocationResult, computeAllocatedExpenses } from "./allocation";

/**
 * Şirketin TÜM araç/masraf/transfer verisiyle yansıyan masraf haritasını üretir.
 * Rapor filtrelerinden bağımsızdır (eski projeyle aynı davranış).
 */
@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async mapForCompany(companyId: string): Promise<Map<string, AllocationResult>> {
    const [vehicles, expenses, transfers] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where: { companyId },
        select: { id: true, status: true, purchaseDate: true, saleDate: true, purchaseLocationId: true },
      }),
      this.prisma.expense.findMany({
        where: { companyId },
        select: { invoiceType: true, vehicleId: true, locationId: true, documentDate: true, grandTotal: true },
      }),
      this.prisma.vehicleTransfer.findMany({
        where: { companyId, status: "CONFIRMED" },
        select: { vehicleId: true, fromLocationId: true, toLocationId: true, status: true, confirmedAt: true },
      }),
    ]);
    return computeAllocatedExpenses(
      vehicles,
      expenses.map((e) => ({ ...e, grandTotal: Number(e.grandTotal) })),
      transfers,
    );
  }

  async forVehicle(companyId: string, vehicleId: string): Promise<AllocationResult> {
    const map = await this.mapForCompany(companyId);
    return map.get(vehicleId) ?? { locationShare: 0, generalShare: 0, total: 0 };
  }
}
