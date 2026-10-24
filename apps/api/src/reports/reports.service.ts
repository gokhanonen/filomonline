import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Panel / rapor özeti: araç durum sayıları, stok değeri, satış kârı, masraf toplamı. */
  async summary(companyId: string) {
    const [stokta, kiralamada, satildi, stockAgg, soldVehicles, expenseAgg, accountCount] =
      await this.prisma.$transaction([
        this.prisma.vehicle.count({ where: { companyId, status: "STOKTA", isActive: true } }),
        this.prisma.vehicle.count({ where: { companyId, status: "KIRALAMADA", isActive: true } }),
        this.prisma.vehicle.count({ where: { companyId, status: "SATILDI" } }),
        this.prisma.vehicle.aggregate({
          where: { companyId, status: "STOKTA", isActive: true },
          _sum: { purchasePrice: true, listPrice: true },
        }),
        this.prisma.vehicle.findMany({
          where: { companyId, status: "SATILDI" },
          select: { purchasePrice: true, saleAmount: true, saleNotaryAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: { companyId },
          _sum: { grandTotal: true },
        }),
        this.prisma.account.count({ where: { companyId, isActive: true } }),
      ]);

    let grossProfit = 0;
    let totalSales = 0;
    soldVehicles.forEach((v) => {
      const buy = Number(v.purchasePrice ?? 0);
      const sell = Number(v.saleAmount ?? v.saleNotaryAmount ?? 0);
      totalSales += sell;
      grossProfit += sell - buy;
    });

    return {
      vehicles: {
        stokta,
        kiralamada,
        satildi,
        toplam: stokta + kiralamada + satildi,
      },
      stokMaliyeti: Number(stockAgg._sum.purchasePrice ?? 0),
      stokListeDeğeri: Number(stockAgg._sum.listPrice ?? 0),
      toplamSatis: Number(totalSales.toFixed(2)),
      brutKar: Number(grossProfit.toFixed(2)),
      toplamMasraf: Number(expenseAgg._sum.grandTotal ?? 0),
      cariSayisi: accountCount,
    };
  }
}
