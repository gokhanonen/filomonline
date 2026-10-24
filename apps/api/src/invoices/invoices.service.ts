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
  UpdateSalesInvoiceDto,
  QueryInvoicesDto,
  UpdateIntegrationStatusDto,
} from "./dto/invoice.dto";

import { ActivityService } from "../activity/activity.service";
import { calculateSalesRegime } from "./sales-regime.util";

const round = (n: number) => Number(n.toFixed(2));

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicles: VehiclesService,
    private readonly activity: ActivityService,
  ) {}

  private async assertVehicle(companyId: string, vehicleId: string) {
    const ok = await this.prisma.vehicle.count({ where: { id: vehicleId, companyId } });
    if (!ok) throw new BadRequestException("Geçersiz araç");
  }

  calculateSalesRegime(params: Parameters<typeof calculateSalesRegime>[0]) {
    return calculateSalesRegime(params);
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

    void this.activity.log({
      companyId,
      type: "VEHICLE_PURCHASE",
      title: `Alış Faturası: ${invoice.invoiceNo}`,
      description: `Araç alış faturası düzenlendi (Tutar: ${invoice.notaryAmount} ₺)`,
      entityType: "invoice",
      entityId: invoice.id,
      link: "/invoices",
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

    const calc = this.calculateSalesRegime({
      regime,
      notarySalePrice,
      notaryPurchasePrice,
      saleAmount,
      customVatRate: dto.vatRate,
    });

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        accountId: dto.accountId,
        invoiceNo: dto.invoiceNo,
        invoiceDate: dto.invoiceDate,
        entityType: dto.entityType ?? (regime === "sahis" ? "INDIVIDUAL" : "CORPORATE"),
        purchaseRegime: calc.regime,
        saleAmount: calc.saleAmount,
        notarySalePrice: calc.notarySalePrice,
        notaryPurchasePrice: calc.notaryPurchasePrice,
        profitMargin: calc.profitMargin,
        matrah: calc.matrah,
        vatRate: calc.vatRate,
        vatAmount: calc.vatAmount,
        serviceFee: calc.serviceFee,
        serviceFeeVat: calc.serviceFeeVat,
        totalWithVat: dto.totalWithVat || calc.totalWithVat,
        otherAmountExclNotary: dto.otherAmountExclNotary ?? 0,
        saleType: dto.saleType ?? "Normal",
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
        saleAmount: calc.saleAmount,
        saleNotaryAmount: calc.notarySalePrice,
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

    void this.activity.log({
      companyId,
      type: "VEHICLE_SALE",
      title: `Satış Faturası: ${invoice.invoiceNo}`,
      description: `Araç satıldı (${vehicle.plate || vehicle.brandName || "Araç"} - Tutar: ${invoice.saleAmount} ₺)`,
      entityType: "invoice",
      entityId: invoice.id,
      link: "/invoices",
    });

    return invoice;
  }

  async findOne(companyId: string, type: string, id: string) {
    if (type === "sales") {
      const inv = await this.prisma.salesInvoice.findFirst({
        where: { id, companyId },
      });
      if (!inv) throw new NotFoundException("Satış faturası bulunamadı");
      const [vehicle, account] = await Promise.all([
        this.prisma.vehicle.findUnique({
          where: { id: inv.vehicleId },
          select: {
            id: true,
            plate: true,
            brandName: true,
            modelName: true,
            year: true,
            chassisNo: true,
            purchaseNotaryPrice: true,
            purchasePrice: true,
            purchaseRegime: true,
          },
        }),
        this.prisma.account.findUnique({
          where: { id: inv.accountId },
          select: {
            id: true,
            name: true,
            taxNumber: true,
            tckn: true,
            phone: true,
            email: true,
            type: true,
            city: true,
            district: true,
          },
        }),
      ]);
      return { ...inv, vehicle, account };
    } else if (type === "purchase") {
      const inv = await this.prisma.purchaseInvoice.findFirst({
        where: { id, companyId },
      });
      if (!inv) throw new NotFoundException("Alış faturası bulunamadı");
      const [vehicle, account] = await Promise.all([
        this.prisma.vehicle.findUnique({
          where: { id: inv.vehicleId },
          select: {
            id: true,
            plate: true,
            brandName: true,
            modelName: true,
            year: true,
            chassisNo: true,
          },
        }),
        this.prisma.account.findUnique({
          where: { id: inv.accountId },
          select: {
            id: true,
            name: true,
            taxNumber: true,
            tckn: true,
            phone: true,
            email: true,
            type: true,
          },
        }),
      ]);
      return { ...inv, vehicle, account };
    } else if (type === "rental") {
      const inv = await this.prisma.rentalInvoice.findFirst({
        where: { id, companyId },
      });
      if (!inv) throw new NotFoundException("Kira faturası bulunamadı");
      const [vehicle, account] = await Promise.all([
        this.prisma.vehicle.findUnique({
          where: { id: inv.vehicleId },
          select: { id: true, plate: true, brandName: true, modelName: true, year: true },
        }),
        this.prisma.account.findUnique({
          where: { id: inv.accountId },
          select: { id: true, name: true, taxNumber: true, tckn: true, phone: true, email: true },
        }),
      ]);
      return { ...inv, vehicle, account };
    }
    throw new BadRequestException("Geçersiz fatura tipi");
  }

  async findSalesByVehicle(companyId: string, vehicleId: string) {
    const inv = await this.prisma.salesInvoice.findFirst({
      where: { vehicleId, companyId, toDelete: false },
      orderBy: { createdAt: "desc" },
    });
    if (!inv) return null;
    const account = await this.prisma.account.findUnique({
      where: { id: inv.accountId },
      select: { id: true, name: true, taxNumber: true, tckn: true, phone: true, email: true },
    });
    return { ...inv, account };
  }

  async updateSales(companyId: string, id: string, dto: UpdateSalesInvoiceDto) {
    const inv = await this.prisma.salesInvoice.findFirst({
      where: { id, companyId },
    });
    if (!inv) throw new NotFoundException("Satış faturası bulunamadı");

    // T Tipi Akışı:
    // Eğer fatura ERP'ye entegre edilmişse:
    // Sadece ve sadece satisTipi "T Tipi" / "T" iken "Normal"e çevriliyorsa izin verilir!
    const isIntegrated = inv.integrationStatus === "ENTEGRE_EDILDI";
    const wasTTipi = inv.saleType?.toLowerCase().includes("t");
    const isSwitchingFromTTipiToNormal =
      wasTTipi && dto.saleType && !dto.saleType.toLowerCase().includes("t");

    if (isIntegrated) {
      if (!isSwitchingFromTTipiToNormal) {
        throw new BadRequestException("Entegre edilmiş satış faturaları değiştirilemez.");
      }

      // T Tipi'nden Normale Geçiş:
      // 1) Eski kaydı iptal_bekliyor + toDelete: true yap
      await this.prisma.salesInvoice.update({
        where: { id },
        data: {
          integrationStatus: "IPTAL_BEKLIYOR",
          toDelete: true,
        },
      });

      // 2) Yeni satış faturasını 'BEKLIYOR' olarak oluştur
      const calc = this.calculateSalesRegime({
        regime: dto.purchaseRegime ?? inv.purchaseRegime ?? "sahis",
        notarySalePrice: dto.notarySalePrice ?? Number(inv.notarySalePrice ?? 0),
        notaryPurchasePrice: dto.notaryPurchasePrice ?? Number(inv.notaryPurchasePrice ?? 0),
        saleAmount: dto.saleAmount ?? Number(inv.saleAmount ?? 0),
      });

      const newInvoice = await this.prisma.salesInvoice.create({
        data: {
          companyId,
          vehicleId: inv.vehicleId,
          accountId: dto.accountId ?? inv.accountId,
          locationId: dto.locationId ?? inv.locationId,
          invoiceNo: dto.invoiceNo ?? inv.invoiceNo,
          invoiceDate: dto.invoiceDate ?? inv.invoiceDate,
          entityType: dto.entityType ?? inv.entityType,
          purchaseRegime: calc.regime,
          saleAmount: calc.saleAmount,
          notarySalePrice: calc.notarySalePrice,
          notaryPurchasePrice: calc.notaryPurchasePrice,
          profitMargin: calc.profitMargin,
          matrah: calc.matrah,
          vatRate: calc.vatRate,
          vatAmount: calc.vatAmount,
          serviceFee: calc.serviceFee,
          serviceFeeVat: calc.serviceFeeVat,
          totalWithVat: calc.totalWithVat,
          otherAmountExclNotary: dto.otherAmountExclNotary ?? inv.otherAmountExclNotary,
          saleType: dto.saleType ?? "Normal",
          notaryJournalNo: dto.notaryJournalNo ?? inv.notaryJournalNo,
          description: dto.description ?? inv.description,
          erpCode: dto.erpCode ?? inv.erpCode,
          integrationStatus: "BEKLIYOR",
        },
      });

      await this.prisma.vehicle.update({
        where: { id: inv.vehicleId },
        data: {
          saleAmount: calc.saleAmount,
          saleNotaryAmount: calc.notarySalePrice,
          saleInvoiceNo: newInvoice.invoiceNo,
          saleInvoiceDate: newInvoice.invoiceDate,
          customerId: newInvoice.accountId,
          salesIntegrationStatus: "BEKLIYOR",
        },
      });

      return newInvoice;
    }

    // Entegre edilmemişse (BEKLIYOR / KUYRUKTA):
    const calc = this.calculateSalesRegime({
      regime: dto.purchaseRegime ?? inv.purchaseRegime ?? "sahis",
      notarySalePrice: dto.notarySalePrice ?? Number(inv.notarySalePrice ?? 0),
      notaryPurchasePrice: dto.notaryPurchasePrice ?? Number(inv.notaryPurchasePrice ?? 0),
      saleAmount: dto.saleAmount ?? Number(inv.saleAmount ?? 0),
    });

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        accountId: dto.accountId ?? undefined,
        invoiceNo: dto.invoiceNo ?? undefined,
        invoiceDate: dto.invoiceDate ?? undefined,
        entityType: dto.entityType ?? undefined,
        purchaseRegime: calc.regime,
        saleAmount: calc.saleAmount,
        notarySalePrice: calc.notarySalePrice,
        notaryPurchasePrice: calc.notaryPurchasePrice,
        profitMargin: calc.profitMargin,
        matrah: calc.matrah,
        vatRate: calc.vatRate,
        vatAmount: calc.vatAmount,
        serviceFee: calc.serviceFee,
        serviceFeeVat: calc.serviceFeeVat,
        totalWithVat: calc.totalWithVat,
        otherAmountExclNotary: dto.otherAmountExclNotary ?? undefined,
        locationId: dto.locationId ?? undefined,
        saleType: dto.saleType ?? undefined,
        notaryJournalNo: dto.notaryJournalNo ?? undefined,
        description: dto.description ?? undefined,
        erpCode: dto.erpCode ?? undefined,
      },
    });

    await this.prisma.vehicle.update({
      where: { id: inv.vehicleId },
      data: {
        saleAmount: calc.saleAmount,
        saleNotaryAmount: calc.notarySalePrice,
        saleDate: dto.invoiceDate ?? undefined,
        saleInvoiceNo: dto.invoiceNo ?? undefined,
        saleInvoiceDate: dto.invoiceDate ?? undefined,
        customerId: dto.accountId ?? undefined,
      },
    });

    return updated;
  }

  async deleteInvoice(companyId: string, type: string, id: string) {
    if (type === "sales") {
      const inv = await this.prisma.salesInvoice.findFirst({ where: { id, companyId } });
      if (!inv) throw new NotFoundException("Fatura bulunamadı");
      if (inv.integrationStatus === "ENTEGRE_EDILDI") {
        throw new BadRequestException("Entegre edilmiş faturalar silinemez.");
      }
      await this.prisma.salesInvoice.delete({ where: { id } });

      await this.prisma.vehicle.update({
        where: { id: inv.vehicleId },
        data: {
          status: "STOKTA",
          saleAmount: null,
          saleNotaryAmount: null,
          saleDate: null,
          saleInvoiceNo: null,
          saleInvoiceDate: null,
          customerId: null,
          salesIntegrationStatus: null,
        },
      });
      return { success: true };
    } else if (type === "purchase") {
      const inv = await this.prisma.purchaseInvoice.findFirst({ where: { id, companyId } });
      if (!inv) throw new NotFoundException("Fatura bulunamadı");
      if (inv.integrationStatus === "ENTEGRE_EDILDI") {
        throw new BadRequestException("Entegre edilmiş faturalar silinemez.");
      }
      await this.prisma.purchaseInvoice.delete({ where: { id } });
      return { success: true };
    } else if (type === "rental") {
      const inv = await this.prisma.rentalInvoice.findFirst({ where: { id, companyId } });
      if (!inv) throw new NotFoundException("Fatura bulunamadı");
      if (inv.integrationStatus === "ENTEGRE_EDILDI") {
        throw new BadRequestException("Entegre edilmiş faturalar silinemez.");
      }
      await this.prisma.rentalInvoice.delete({ where: { id } });
      return { success: true };
    }
    throw new BadRequestException("Geçersiz fatura tipi");
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
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((r) => r.invoiceNo.toLowerCase().includes(s));
    }
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
