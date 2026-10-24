import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import { VehiclesService } from "../vehicles/vehicles.service";
import {
  CreatePurchaseInvoiceDto,
  CreateSalesInvoiceDto,
  QueryInvoicesDto,
  UpdateIntegrationStatusDto,
} from "./dto/invoice.dto";

const round = (n: number) => Number(n.toFixed(2));

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicles: VehiclesService,
  ) {}

  private async assertVehicle(companyId: string, vehicleId: string) {
    const ok = await this.prisma.vehicle.count({ where: { id: vehicleId, companyId } });
    if (!ok) throw new BadRequestException("Geçersiz araç");
  }

  // ---- Alış Faturası ----
  async createPurchase(companyId: string, dto: CreatePurchaseInvoiceDto) {
    await this.assertVehicle(companyId, dto.vehicleId);
    const other = dto.otherAmount ?? 0;
    const base = dto.notaryAmount + other;
    const vatRate = dto.vatRate ?? 0;

    // Özel matrah (ikinci el): araç bedeline KDV uygulanmaz, özel matrah üzerinden
    // %20 KDV DAHİL hizmet bedeli hesaplanır.
    const specialBaseAmount = dto.specialBase ? dto.specialBaseAmount ?? 0 : 0;
    const specialBaseServiceFee = dto.specialBase ? round(specialBaseAmount * 0.2) : 0;
    const vatAmount = dto.specialBase ? 0 : round((base * vatRate) / 100);

    const invoice = await this.prisma.purchaseInvoice.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        accountId: dto.accountId,
        invoiceNo: dto.invoiceNo,
        invoiceDate: dto.invoiceDate,
        notaryAmount: dto.notaryAmount,
        otherAmount: other,
        vatRate,
        vatAmount,
        specialBaseAmount,
        specialBaseServiceFee,
        locationId: dto.locationId,
        notaryJournalNo: dto.notaryJournalNo,
        description: dto.description,
        integrationStatus: "BEKLIYOR",
      },
    });

    // Araç = single source of truth: alış alanlarını güncelle
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: {
        purchasePrice: dto.notaryAmount,
        purchaseOtherAmount: other,
        purchaseNotaryAmount: dto.notaryAmount,
        purchaseInvoiceNo: dto.invoiceNo,
        purchaseInvoiceDate: dto.invoiceDate,
        supplierId: dto.accountId,
        specialBase: dto.specialBase ?? false,
        specialBaseAmount: specialBaseAmount || null,
        purchaseVatRate: vatRate,
      },
    });

    return invoice;
  }

  // ---- Satış Faturası ----
  async createSales(companyId: string, dto: CreateSalesInvoiceDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) throw new BadRequestException("Geçersiz araç");

    const regime = dto.purchaseRegime || vehicle.purchaseRegime || "sahis";
    const notarySalePrice = dto.notarySalePrice ?? 0;
    const notaryPurchasePrice =
      dto.notaryPurchasePrice ??
      Number(vehicle.purchaseNotaryPrice ?? vehicle.purchasePrice ?? 0);
    const saleAmount = dto.saleAmount ?? notarySalePrice;

    let vatRate = 0;
    let vatAmount = 0;
    let matrah = 0;
    let serviceFee: number | null = null;
    let serviceFeeVat: number | null = null;
    let profitMargin: number | null = null;

    if (regime === "sahis") {
      // 1) Şahıstan Alım:
      // Kâr Marjı = Noter Satış - Noter Alış
      profitMargin = Math.max(0, notarySalePrice - notaryPurchasePrice);
      // Hizmet Matrahı = Kâr Marjı / 1.20
      serviceFee = round(profitMargin / 1.2);
      // Hizmet KDV'si (%20) = Kâr Marjı - Hizmet Matrahı
      serviceFeeVat = round(profitMargin - serviceFee);
      vatRate = 20;
      vatAmount = serviceFeeVat;
      matrah = round(notaryPurchasePrice + serviceFee);
    } else if (regime === "sirket_1" || regime === "galeri_ozel") {
      // 2) Şirketten %1 veya 4) Galeriden Özel Matrahlı (%1 KDV dahil)
      // KDV (%1) = (Noter Satış Tutarı / 1.01) * 0.01
      vatRate = 1;
      vatAmount = round((notarySalePrice / 1.01) * 0.01);
      matrah = round(notarySalePrice - vatAmount);
    } else if (regime === "sirket_20") {
      // 3) Şirketten %20 KDV ile Alım
      // KDV (%20) = (Noter Satış Tutarı / 1.20) * 0.20
      vatRate = 20;
      vatAmount = round((notarySalePrice / 1.2) * 0.2);
      matrah = round(notarySalePrice - vatAmount);
    } else {
      // Fallback
      vatRate = dto.vatRate ?? 20;
      vatAmount = round((notarySalePrice * vatRate) / 100);
      matrah = notarySalePrice;
    }

    const totalWithVat = dto.totalWithVat || saleAmount;

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        accountId: dto.accountId,
        invoiceNo: dto.invoiceNo,
        invoiceDate: dto.invoiceDate,
        entityType: dto.entityType ?? (regime === "sahis" ? "INDIVIDUAL" : "CORPORATE"),
        purchaseRegime: regime,
        saleAmount,
        notarySalePrice,
        notaryPurchasePrice,
        profitMargin,
        matrah,
        vatRate,
        vatAmount,
        serviceFee,
        serviceFeeVat,
        totalWithVat,
        otherAmountExclNotary: dto.otherAmountExclNotary ?? 0,
        saleType: dto.saleType,
        notaryJournalNo: dto.notaryJournalNo,
        description: dto.description,
        locationId: dto.locationId,
        integrationStatus: "BEKLIYOR",
      },
    });

    // Araç: satış alanları + durum SATILDI
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: {
        status: "SATILDI",
        saleAmount,
        saleNotaryAmount: notarySalePrice,
        saleDate: dto.invoiceDate,
        saleInvoiceNo: dto.invoiceNo,
        saleInvoiceDate: dto.invoiceDate,
        customerId: dto.accountId,
        saleLocationId: dto.locationId,
        salesIntegrationStatus: "BEKLIYOR",
      },
    });

    // Aktif opsiyon varsa: aynı müşteriye satış → CONVERTED, farklı → CANCELLED
    await this.vehicles.settleOptionOnSale(
      companyId,
      dto.vehicleId,
      dto.accountId,
      invoice.id,
    );

    return invoice;
  }

  // ---- Birleşik liste ----
  async findAll(companyId: string, q: QueryInvoicesDto): Promise<Paginated<unknown>> {
    const vehFilter = q.vehicleId ? { vehicleId: q.vehicleId } : {};
    const [purchases, sales, rentals] = await this.prisma.$transaction([
      this.prisma.purchaseInvoice.findMany({ where: { companyId, ...vehFilter } }),
      this.prisma.salesInvoice.findMany({ where: { companyId, ...vehFilter } }),
      this.prisma.rentalInvoice.findMany({ where: { companyId, ...vehFilter } }),
    ]);

    type Row = {
      id: string;
      type: string;
      vehicleId: string;
      invoiceNo: string;
      invoiceDate: Date;
      total: number;
      integrationStatus: string | null;
    };
    let rows: Row[] = [
      ...purchases.map((p) => ({
        id: p.id,
        type: "purchase",
        vehicleId: p.vehicleId,
        invoiceNo: p.invoiceNo,
        invoiceDate: p.invoiceDate,
        total: Number(p.notaryAmount) + Number(p.otherAmount) + Number(p.vatAmount),
        integrationStatus: p.integrationStatus,
      })),
      ...sales.map((s) => ({
        id: s.id,
        type: "sales",
        vehicleId: s.vehicleId,
        invoiceNo: s.invoiceNo,
        invoiceDate: s.invoiceDate,
        total: s.entityType === "INDIVIDUAL" ? Number(s.serviceFee ?? 0) : Number(s.totalWithVat),
        integrationStatus: s.integrationStatus,
      })),
      ...rentals.map((r) => ({
        id: r.id,
        type: "rental",
        vehicleId: r.vehicleId,
        invoiceNo: r.invoiceNo,
        invoiceDate: r.invoiceDate,
        total: Number(r.totalWithVat),
        integrationStatus: r.integrationStatus,
      })),
    ];

    if (q.type) rows = rows.filter((r) => r.type === q.type);
    rows.sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime());

    const total = rows.length;
    const items = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async updateStatus(
    companyId: string,
    type: string,
    id: string,
    dto: UpdateIntegrationStatusDto,
  ) {
    const data = {
      integrationStatus: dto.integrationStatus,
      integrationRefNo: dto.integrationRefNo,
    };
    if (type === "purchase") {
      const r = await this.prisma.purchaseInvoice.updateMany({ where: { id, companyId }, data });
      if (!r.count) throw new NotFoundException("Fatura bulunamadı");
    } else if (type === "sales") {
      const r = await this.prisma.salesInvoice.updateMany({ where: { id, companyId }, data });
      if (!r.count) throw new NotFoundException("Fatura bulunamadı");
    } else if (type === "rental") {
      const r = await this.prisma.rentalInvoice.updateMany({ where: { id, companyId }, data });
      if (!r.count) throw new NotFoundException("Fatura bulunamadı");
    } else {
      throw new BadRequestException("Geçersiz fatura tipi");
    }
    return { success: true };
  }
}
