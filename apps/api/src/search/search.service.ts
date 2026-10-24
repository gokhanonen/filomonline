import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SearchResultItem {
  id: string;
  category:
    | "vehicles"
    | "invoices"
    | "expenses"
    | "accounts"
    | "rentals"
    | "contracts"
    | "options"
    | "products";
  moduleName: string;
  badgeColor: "primary" | "success" | "warning" | "danger" | "info" | "purple";
  title: string;
  subtitle: string;
  targetUrl: string;
  date?: string;
}

const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("tr-TR");
  } catch {
    return "";
  }
};

const fmtMoney = (val: number | string | { toString(): string } | null | undefined): string => {
  if (val === null || val === undefined) return "0 ₺";
  const num = typeof val === "number" ? val : parseFloat(val.toString()) || 0;
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₺";
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(companyId: string, rawQuery: string): Promise<SearchResultItem[]> {
    const query = rawQuery?.trim();
    if (!query || query.length < 2) return [];

    const plateClean = query.replace(/\s+/g, "").toUpperCase();

    // 1. Önce eşleşen araçları bul (diğer modüllerde araç plakasıyla arama için de kullanılır)
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        OR: [
          { plate: { contains: query } },
          { plate: { contains: plateClean } },
          { brandName: { contains: query } },
          { modelName: { contains: query } },
          { chassisNo: { contains: query } },
          { engineNo: { contains: query } },
        ],
      },
      take: 6,
      select: {
        id: true,
        plate: true,
        brandName: true,
        modelName: true,
        year: true,
        status: true,
        colorName: true,
        km: true,
        chassisNo: true,
      },
    });

    const matchedVehicleIds = vehicles.map((v) => v.id);

    // 2. Eşleşen carileri bul
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: query } },
          { contactPerson: { contains: query } },
          { phone: { contains: query } },
          { taxNumber: { contains: query } },
          { tckn: { contains: query } },
          { email: { contains: query } },
        ],
      },
      take: 6,
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        taxNumber: true,
        tckn: true,
        type: true,
      },
    });
    const matchedAccountIds = accounts.map((a) => a.id);

    // 3. Eş zamanlı olarak diğer tüm modüllerde ara
    const [
      salesInvoices,
      purchaseInvoices,
      rentalInvoices,
      expenses,
      rentals,
      rentalContracts,
      salesContracts,
      options,
      products,
    ] = await Promise.all([
      // Satış faturaları
      this.prisma.salesInvoice.findMany({
        where: {
          companyId,
          OR: [
            { invoiceNo: { contains: query } },
            { description: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
            ...(matchedAccountIds.length ? [{ accountId: { in: matchedAccountIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { invoiceDate: "desc" },
      }),

      // Alış faturaları
      this.prisma.purchaseInvoice.findMany({
        where: {
          companyId,
          OR: [
            { invoiceNo: { contains: query } },
            { description: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
            ...(matchedAccountIds.length ? [{ accountId: { in: matchedAccountIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { invoiceDate: "desc" },
      }),

      // Kira faturaları
      this.prisma.rentalInvoice.findMany({
        where: {
          companyId,
          OR: [
            { invoiceNo: { contains: query } },
            { description: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
            ...(matchedAccountIds.length ? [{ accountId: { in: matchedAccountIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { invoiceDate: "desc" },
      }),

      // Masraf ve Giderler
      this.prisma.expense.findMany({
        where: {
          companyId,
          OR: [
            { documentNo: { contains: query } },
            { description: { contains: query } },
            { category: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
            ...(matchedAccountIds.length ? [{ supplierId: { in: matchedAccountIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { documentDate: "desc" },
      }),

      // Dönemsel Kiralamalar
      this.prisma.rental.findMany({
        where: {
          companyId,
          OR: [
            { documentNo: { contains: query } },
            { customerName: { contains: query } },
            { description: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { documentDate: "desc" },
      }),

      // Kira Sözleşmeleri
      this.prisma.rentalContract.findMany({
        where: {
          companyId,
          OR: [
            { documentNo: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { contractDate: "desc" },
      }),

      // Satış Sözleşmeleri
      this.prisma.salesContract.findMany({
        where: {
          companyId,
          OR: [
            { documentNo: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { contractDate: "desc" },
      }),

      // Araç Opsiyonları
      this.prisma.vehicleOption.findMany({
        where: {
          companyId,
          OR: [
            { note: { contains: query } },
            ...(matchedVehicleIds.length ? [{ vehicleId: { in: matchedVehicleIds } }] : []),
          ],
        },
        take: 6,
        orderBy: { optionDate: "desc" },
      }),

      // Ürün ve Hizmetler
      this.prisma.product.findMany({
        where: {
          companyId,
          OR: [
            { name: { contains: query } },
            { code: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: 6,
      }),
    ]);

    // 4. İlgili tüm vehicleId ve accountId'leri toplayıp tek seferde ad ve plakalarını haritalayalım
    const extraVehicleIds = [
      ...new Set([
        ...salesInvoices.map((i) => i.vehicleId),
        ...purchaseInvoices.map((i) => i.vehicleId),
        ...rentalInvoices.map((i) => i.vehicleId),
        ...expenses.map((e) => e.vehicleId).filter(Boolean),
        ...rentals.map((r) => r.vehicleId),
        ...rentalContracts.map((rc) => rc.vehicleId),
        ...salesContracts.map((sc) => sc.vehicleId),
        ...options.map((o) => o.vehicleId),
      ] as string[]),
    ];

    const extraAccountIds = [
      ...new Set([
        ...salesInvoices.map((i) => i.accountId),
        ...purchaseInvoices.map((i) => i.accountId),
        ...rentalInvoices.map((i) => i.accountId),
        ...expenses.map((e) => e.supplierId).filter(Boolean),
        ...options.map((o) => o.customerId),
      ] as string[]),
    ];

    const [extraVehiclesList, extraAccountsList] = await Promise.all([
      extraVehicleIds.length
        ? this.prisma.vehicle.findMany({
            where: { id: { in: extraVehicleIds } },
            select: { id: true, plate: true, brandName: true, modelName: true },
          })
        : [],
      extraAccountIds.length
        ? this.prisma.account.findMany({
            where: { id: { in: extraAccountIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const vehiclePlateMap = new Map<string, string>();
    vehicles.forEach((v) => vehiclePlateMap.set(v.id, v.plate));
    extraVehiclesList.forEach((v) => vehiclePlateMap.set(v.id, v.plate));

    const accountNameMap = new Map<string, string>();
    accounts.forEach((a) => accountNameMap.set(a.id, a.name));
    extraAccountsList.forEach((a) => accountNameMap.set(a.id, a.name));

    const results: SearchResultItem[] = [];

    // --- Araçlar ---
    for (const v of vehicles) {
      results.push({
        id: v.id,
        category: "vehicles",
        moduleName: "Araç Kartı",
        badgeColor: "primary",
        title: `${v.plate} — ${v.brandName ?? ""} ${v.modelName ?? ""}`.trim(),
        subtitle: `Durum: ${v.status} • Model Yılı: ${v.year ?? "-"} • KM: ${(v.km ?? 0).toLocaleString("tr-TR")} • Şasi: ${v.chassisNo ?? "-"}`,
        targetUrl: `/vehicles/${v.id}`,
      });
    }

    // --- Masraf Faturaları ---
    for (const exp of expenses) {
      const plate = exp.vehicleId ? vehiclePlateMap.get(exp.vehicleId) : null;
      const supplier = exp.supplierId ? accountNameMap.get(exp.supplierId) : null;
      const parts = [
        "Masraf Faturası",
        exp.documentNo || null,
        plate || null,
        fmtDate(exp.documentDate),
        fmtMoney(exp.grandTotal),
        supplier || exp.description || exp.category || null,
      ].filter(Boolean);

      results.push({
        id: exp.id,
        category: "expenses",
        moduleName: "Masraf Faturası",
        badgeColor: "warning",
        title: `Masraf Faturası: ${exp.documentNo || "Gider Kaydı"}`,
        subtitle: parts.join(" • "),
        targetUrl: `/expenses?search=${encodeURIComponent(exp.documentNo || plate || "")}`,
        date: exp.documentDate.toISOString(),
      });
    }

    // --- Satış Faturaları ---
    for (const inv of salesInvoices) {
      const plate = vehiclePlateMap.get(inv.vehicleId);
      const buyer = accountNameMap.get(inv.accountId);
      const parts = [
        "Satış Faturası",
        inv.invoiceNo,
        plate || null,
        fmtDate(inv.invoiceDate),
        fmtMoney(inv.totalWithVat),
        buyer || null,
      ].filter(Boolean);

      results.push({
        id: inv.id,
        category: "invoices",
        moduleName: "Satış Faturası",
        badgeColor: "success",
        title: `Satış Faturası: ${inv.invoiceNo}`,
        subtitle: parts.join(" • "),
        targetUrl: `/invoices?type=sales&search=${encodeURIComponent(inv.invoiceNo)}`,
        date: inv.invoiceDate.toISOString(),
      });
    }

    // --- Alış Faturaları ---
    for (const inv of purchaseInvoices) {
      const plate = vehiclePlateMap.get(inv.vehicleId);
      const supplier = accountNameMap.get(inv.accountId);
      const total =
        Number(inv.notaryAmount) +
        Number(inv.otherAmount) +
        Number(inv.vatAmount);
      const parts = [
        "Alış Faturası",
        inv.invoiceNo,
        plate || null,
        fmtDate(inv.invoiceDate),
        fmtMoney(total),
        supplier || null,
      ].filter(Boolean);

      results.push({
        id: inv.id,
        category: "invoices",
        moduleName: "Alış Faturası",
        badgeColor: "info",
        title: `Alış Faturası: ${inv.invoiceNo}`,
        subtitle: parts.join(" • "),
        targetUrl: `/invoices?type=purchase&search=${encodeURIComponent(inv.invoiceNo)}`,
        date: inv.invoiceDate.toISOString(),
      });
    }

    // --- Kira Faturaları ---
    for (const inv of rentalInvoices) {
      const plate = vehiclePlateMap.get(inv.vehicleId);
      const customer = accountNameMap.get(inv.accountId);
      const parts = [
        "Kira Faturası",
        inv.invoiceNo,
        plate || null,
        fmtDate(inv.invoiceDate),
        fmtMoney(inv.totalWithVat),
        customer || null,
      ].filter(Boolean);

      results.push({
        id: inv.id,
        category: "invoices",
        moduleName: "Kira Faturası",
        badgeColor: "purple",
        title: `Kira Faturası: ${inv.invoiceNo}`,
        subtitle: parts.join(" • "),
        targetUrl: `/invoices?type=rental&search=${encodeURIComponent(inv.invoiceNo)}`,
        date: inv.invoiceDate.toISOString(),
      });
    }

    // --- Cariler (Hesaplar) ---
    for (const acc of accounts) {
      results.push({
        id: acc.id,
        category: "accounts",
        moduleName: "Cari Kart",
        badgeColor: "purple",
        title: acc.name,
        subtitle: `Yetkili: ${acc.contactPerson ?? "-"} • Tel: ${acc.phone ?? "-"} • VKN/TCKN: ${acc.taxNumber ?? acc.tckn ?? "-"}`,
        targetUrl: `/accounts?search=${encodeURIComponent(acc.name)}`,
      });
    }

    // --- Kira Sözleşmeleri ---
    for (const rc of rentalContracts) {
      const plate = vehiclePlateMap.get(rc.vehicleId);
      const parts = [
        "Kira Sözleşmesi",
        rc.documentNo || null,
        plate || null,
        `${fmtDate(rc.startDate)} - ${fmtDate(rc.endDate)}`,
        `${fmtMoney(rc.monthlyPrice)} / ay`,
        rc.customerName || null,
      ].filter(Boolean);

      results.push({
        id: rc.id,
        category: "contracts",
        moduleName: "Kira Sözleşmesi",
        badgeColor: "info",
        title: `Kira Sözleşmesi: ${rc.documentNo || rc.customerName}`,
        subtitle: parts.join(" • "),
        targetUrl: `/rentals?search=${encodeURIComponent(rc.documentNo || plate || "")}`,
        date: rc.contractDate.toISOString(),
      });
    }

    // --- Dönemsel Kiralamalar ---
    for (const r of rentals) {
      const plate = vehiclePlateMap.get(r.vehicleId);
      const parts = [
        "Kiralama Kaydı",
        r.documentNo || null,
        plate || null,
        `${fmtDate(r.startDate)} - ${fmtDate(r.endDate)}`,
        fmtMoney(r.totalAmount),
        r.customerName || null,
      ].filter(Boolean);

      results.push({
        id: r.id,
        category: "rentals",
        moduleName: "Kiralama",
        badgeColor: "info",
        title: `Kiralama: ${r.documentNo || r.customerName}`,
        subtitle: parts.join(" • "),
        targetUrl: `/rentals?search=${encodeURIComponent(r.documentNo || plate || "")}`,
        date: r.documentDate.toISOString(),
      });
    }

    // --- Satış Sözleşmeleri ---
    for (const sc of salesContracts) {
      const plate = vehiclePlateMap.get(sc.vehicleId);
      const parts = [
        "Satış Sözleşmesi",
        sc.documentNo,
        plate || null,
        fmtDate(sc.contractDate),
        fmtMoney(sc.grandTotal),
        sc.customerName || null,
      ].filter(Boolean);

      results.push({
        id: sc.id,
        category: "contracts",
        moduleName: "Satış Sözleşmesi",
        badgeColor: "success",
        title: `Satış Sözleşmesi: ${sc.documentNo}`,
        subtitle: parts.join(" • "),
        targetUrl: `/vehicles/${sc.vehicleId}`,
        date: sc.contractDate.toISOString(),
      });
    }

    // --- Araç Opsiyonları ---
    for (const opt of options) {
      const plate = vehiclePlateMap.get(opt.vehicleId);
      const customer = accountNameMap.get(opt.customerId);
      const parts = [
        "Araç Opsiyonu",
        plate || null,
        `Geçerlilik: ${fmtDate(opt.validUntil)}`,
        `Kapora: ${fmtMoney(opt.amount)}`,
        customer || opt.note || null,
      ].filter(Boolean);

      results.push({
        id: opt.id,
        category: "options",
        moduleName: "Opsiyon",
        badgeColor: "warning",
        title: `Opsiyon: ${plate || "Araç"} (Geçerli: ${fmtDate(opt.validUntil)})`,
        subtitle: parts.join(" • "),
        targetUrl: `/vehicles/${opt.vehicleId}`,
        date: opt.optionDate.toISOString(),
      });
    }

    // --- Ürün ve Hizmetler ---
    for (const p of products) {
      const isService =
        p.type === "RECEIVED_SERVICE" || p.type === "PROVIDED_SERVICE";
      results.push({
        id: p.id,
        category: "products",
        moduleName: isService ? "Hizmet" : "Ürün / Parça",
        badgeColor: isService ? "purple" : "info",
        title: `${p.name} (${p.code})`,
        subtitle: `Tip: ${isService ? "Hizmet" : "Ürün"} • Fiyat: ${fmtMoney(p.sellingPrice)} (KDV %${p.taxRate}) • ${p.description ?? "-"}`,
        targetUrl: `/products?search=${encodeURIComponent(p.code || p.name)}`,
      });
    }

    return results;
  }
}
