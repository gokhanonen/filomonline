/**
 * Kapsamlı ve Hiyerarşik Demo Verisi:
 * Kaleli Grup ve Demo Holding firmalarına;
 *  - Cariler (Bireysel + Kurumsal müşteriler, tedarikçiler)
 *  - Ürünler & Hizmetler
 *  - Lokasyonlar ve Kasalar
 *  - Katalog ile %100 UYUMLU Araçlar (Otomobil, SUV, Ticari, Minivan, Elektrikli)
 *  - Kira sözleşmeleri, opsiyonlar, masraflar ve kapak fotoğrafları
 *
 * Çalıştırma:
 *   FORCE=1 npx ts-node prisma/seed-demo.ts
 */
import { PrismaClient, VehicleStatus, FuelType, TransmissionType, DriveType } from "@prisma/client";

const prisma = new PrismaClient();

const CUSTOMERS = [
  { entityType: "INDIVIDUAL", name: "Ahmet Yılmaz", phone: "05321112233", tckn: "11111111111", city: "İstanbul" },
  { entityType: "INDIVIDUAL", name: "Mehmet Demir", phone: "05334445566", tckn: "22222222222", city: "Ankara" },
  { entityType: "INDIVIDUAL", name: "Ayşe Kaya", phone: "05357778899", tckn: "33333333333", city: "İzmir" },
  { entityType: "CORPORATE", name: "Yıldız İnşaat Ltd. Şti.", phone: "02121234567", taxNumber: "1234567890", taxOffice: "Kadıköy", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Deniz Lojistik A.Ş.", phone: "02123334455", taxNumber: "9876543210", taxOffice: "Şişli", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Güneş Turizm A.Ş.", phone: "02326667788", taxNumber: "5556667778", taxOffice: "Konak", city: "İzmir" },
];

const SUPPLIERS = [
  { entityType: "CORPORATE", name: "Oto Yedek Parça San. Tic.", phone: "02129998877", taxNumber: "1112223334", taxOffice: "Bağcılar", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Hızlı Servis Oto", phone: "02128887766", taxNumber: "2223334445", taxOffice: "Ümraniye", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Lastikçi Mehmet", phone: "05339990011", taxNumber: "3334445556", taxOffice: "Esenler", city: "İstanbul" },
  { entityType: "INDIVIDUAL", name: "Noter - 15. Noterlik", phone: "02124445566", city: "İstanbul" },
];

const PRODUCTS = [
  { type: "MATERIAL", name: "Lastik (Takım)", code: "LST-001", unit: "Takım", buyingPrice: 8000, sellingPrice: 10000, taxRate: 20 },
  { type: "MATERIAL", name: "Motor Yağı", code: "YAG-001", unit: "Litre", buyingPrice: 350, sellingPrice: 500, taxRate: 20 },
  { type: "MATERIAL", name: "Fren Balatası", code: "BAL-001", unit: "Takım", buyingPrice: 1200, sellingPrice: 1800, taxRate: 20 },
  { type: "MATERIAL", name: "Akü", code: "AKU-001", unit: "Adet", buyingPrice: 2500, sellingPrice: 3500, taxRate: 20 },
  { type: "RECEIVED_SERVICE", name: "Bakım İşçiliği", code: "ISC-900", unit: "Saat", buyingPrice: 500, sellingPrice: 750, taxRate: 20 },
  { type: "PROVIDED_SERVICE", name: "Araç Kiralama Hizmeti", code: "KIR-900", unit: "Ay", buyingPrice: 0, sellingPrice: 25000, taxRate: 20 },
  { type: "RECEIVED_SERVICE", name: "Kaporta Boya", code: "KPR-001", unit: "Adet", buyingPrice: 4000, sellingPrice: 6000, taxRate: 20 },
];

const LOCATIONS = [
  { name: "Merkez Showroom", code: "MERKEZ", city: "İstanbul", isExternal: false },
  { name: "İstoç Depo", code: "ISTOC", city: "İstanbul", isExternal: false },
  { name: "Anlaşmalı Servis", code: "SERVIS", city: "İstanbul", isExternal: true },
];

interface DemoVehicleBlueprint {
  plate: string;
  categoryCode: "otomobil" | "suv" | "minivanpanelvan" | "ticari" | "elektrikli_ara_";
  brandName: string;
  modelName: string;
  bodyTypeName: string;
  colorName: string;
  vehicleTypeName: string;
  year: number;
  km: number;
  fuelType: FuelType;
  transmission: TransmissionType;
  driveType: DriveType;
  horsePower: number;
  engineVolume: number;
  purchasePrice: number;
  listPrice: number;
  status: VehicleStatus;
  photoKey?: string;
  isOptioned?: boolean;
}

// 10 adet özenle hazırlanmış, her kategoriden örnek içeren demo araç şablonu
const DEMO_BLUEPRINTS: DemoVehicleBlueprint[] = [
  {
    plate: "34 TU 5566",
    categoryCode: "otomobil",
    brandName: "BMW",
    modelName: "520i",
    bodyTypeName: "Sedan",
    colorName: "Siyah",
    vehicleTypeName: "Filo",
    year: 2022,
    km: 45000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 170,
    engineVolume: 1597,
    purchasePrice: 2100000,
    listPrice: 2350000,
    status: "KIRALAMADA",
    photoKey: "cmvl8g7630002ib5hyezsaqws/vehicle-photos/bd400968-c6a8-4b0d-9385-fb8a17647519-520i.jpg",
  },
  {
    plate: "34 AB 1234",
    categoryCode: "otomobil",
    brandName: "Audi",
    modelName: "A3",
    bodyTypeName: "Sedan",
    colorName: "Beyaz",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 18000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 1498,
    purchasePrice: 1650000,
    listPrice: 1820000,
    status: "STOKTA",
  },
  {
    plate: "34 CD 5678",
    categoryCode: "otomobil",
    brandName: "Mercedes-Benz",
    modelName: "C200",
    bodyTypeName: "Sedan",
    colorName: "Gri",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 34000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 204,
    engineVolume: 1496,
    purchasePrice: 2400000,
    listPrice: 2650000,
    status: "STOKTA",
    isOptioned: true,
  },
  {
    plate: "34 EF 9012",
    categoryCode: "otomobil",
    brandName: "Volkswagen",
    modelName: "Golf",
    bodyTypeName: "Hatchback",
    colorName: "Mavi",
    vehicleTypeName: "2.El",
    year: 2021,
    km: 52000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 1498,
    purchasePrice: 1150000,
    listPrice: 1280000,
    status: "STOKTA",
  },
  {
    plate: "06 GH 3456",
    categoryCode: "minivanpanelvan",
    brandName: "Ford",
    modelName: "Transit",
    bodyTypeName: "Minivan",
    colorName: "Beyaz",
    vehicleTypeName: "Filo",
    year: 2022,
    km: 68000,
    fuelType: "DIZEL",
    transmission: "MANUEL",
    driveType: "ONDEN_CEKIS",
    horsePower: 130,
    engineVolume: 1995,
    purchasePrice: 950000,
    listPrice: 1100000,
    status: "KIRALAMADA",
  },
  {
    plate: "35 IJ 7890",
    categoryCode: "minivanpanelvan",
    brandName: "FIAT",
    modelName: "Doblo",
    bodyTypeName: "Minivan",
    colorName: "Gümüş",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 24000,
    fuelType: "DIZEL",
    transmission: "MANUEL",
    driveType: "ONDEN_CEKIS",
    horsePower: 105,
    engineVolume: 1598,
    purchasePrice: 720000,
    listPrice: 830000,
    status: "STOKTA",
  },
  {
    plate: "34 KL 2345",
    categoryCode: "suv",
    brandName: "Renault",
    modelName: "Captur",
    bodyTypeName: "SUV",
    colorName: "Kırmızı",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 39000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 140,
    engineVolume: 1332,
    purchasePrice: 1120000,
    listPrice: 1260000,
    status: "STOKTA",
  },
  {
    plate: "35 RS 3344",
    categoryCode: "suv",
    brandName: "Audi",
    modelName: "Q5",
    bodyTypeName: "SUV",
    colorName: "Siyah",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 26000,
    fuelType: "DIZEL",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 204,
    engineVolume: 1968,
    purchasePrice: 3200000,
    listPrice: 3550000,
    status: "STOKTA",
  },
  {
    plate: "34 MN 6789",
    categoryCode: "ticari",
    brandName: "RENAULT",
    modelName: "MASTER",
    bodyTypeName: "Ticari",
    colorName: "Beyaz",
    vehicleTypeName: "Filo",
    year: 2022,
    km: 74000,
    fuelType: "DIZEL",
    transmission: "MANUEL",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 2299,
    purchasePrice: 1080000,
    listPrice: 1240000,
    status: "KIRALAMADA",
  },
  {
    plate: "06 OP 1122",
    categoryCode: "elektrikli_ara_",
    brandName: "TOGG",
    modelName: "T10X",
    bodyTypeName: "SUV",
    colorName: "Mavi",
    vehicleTypeName: "Sıfır",
    year: 2023,
    km: 12000,
    fuelType: "ELEKTRIK",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 218,
    engineVolume: 0,
    purchasePrice: 1450000,
    listPrice: 1600000,
    status: "SATILDI",
  },
];

async function seedCompany(companyId: string, tenantId: string, companyName: string) {
  const force = process.env.FORCE === "1";
  const vehCount = await prisma.vehicle.count({ where: { companyId } });
  if (vehCount > 0 && !force) {
    console.log(`  (firma ${companyName} zaten dolu, atlandı)`);
    return;
  }

  console.log(`  [${companyName}] Demo verileri temizleniyor ve yeniden oluşturuluyor...`);

  // 1. Mevcut operasyonel verileri temizle
  await prisma.rentalContract.deleteMany({ where: { companyId } });
  await prisma.expense.deleteMany({ where: { companyId } });
  await prisma.vehicleOption.deleteMany({ where: { companyId } });

  // Araç alt tablolarını temizle
  const companyVehicles = await prisma.vehicle.findMany({ where: { companyId }, select: { id: true } });
  const vehIds = companyVehicles.map((v) => v.id);
  if (vehIds.length > 0) {
    await prisma.vehiclePhoto.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehicleListingUrl.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehicleTramerRecord.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehiclePurchaseInstallment.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehicle.deleteMany({ where: { companyId } });
  }

  await prisma.cashRegister.deleteMany({ where: { companyId } });
  await prisma.location.deleteMany({ where: { companyId } });
  await prisma.product.deleteMany({ where: { companyId } });
  await prisma.account.deleteMany({ where: { companyId } });

  // 2. Cariler
  const accounts: Record<string, string> = {};
  for (const c of CUSTOMERS) {
    const a = await prisma.account.create({
      data: {
        companyId,
        type: "CUSTOMER",
        entityType: c.entityType as any,
        name: c.name,
        phone: c.phone,
        tckn: (c as any).tckn,
        taxNumber: (c as any).taxNumber,
        taxOffice: (c as any).taxOffice,
        city: c.city,
      },
    });
    accounts[c.name] = a.id;
  }

  const supplierIds: string[] = [];
  for (const s of SUPPLIERS) {
    const a = await prisma.account.create({
      data: {
        companyId,
        type: "SUPPLIER",
        entityType: s.entityType as any,
        name: s.name,
        phone: s.phone,
        taxNumber: (s as any).taxNumber,
        taxOffice: (s as any).taxOffice,
        city: s.city,
      },
    });
    supplierIds.push(a.id);
  }

  // 3. Ürünler
  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        companyId,
        type: p.type as any,
        name: p.name,
        code: p.code,
        unit: p.unit,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        taxRate: p.taxRate,
      },
    });
  }

  // 4. Lokasyonlar + Kasalar
  const locIds: string[] = [];
  for (const l of LOCATIONS) {
    const loc = await prisma.location.create({ data: { companyId, ...l } });
    locIds.push(loc.id);
    await prisma.cashRegister.create({
      data: { companyId, locationId: loc.id, erpCode: `KASA-${l.code}`, name: `${l.name} Kasa` },
    });
  }

  // 5. Tenant Katalog Referansları
  const categories = await prisma.vehicleCategory.findMany({ where: { tenantId } });
  const brands = await prisma.brand.findMany({ where: { tenantId }, include: { models: true } });
  const colors = await prisma.color.findMany({ where: { tenantId } });
  const bodyTypes = await prisma.bodyType.findMany({ where: { tenantId } });
  const vehicleTypes = await prisma.vehicleType.findMany({ where: { tenantId } });
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });

  const norm = (s: string) => s.toLowerCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, "").trim();

  // 6. Araçları Oluştur
  const createdVehicles: { id: string; status: VehicleStatus; plate: string; isOptioned?: boolean }[] = [];
  const customerList = Object.values(accounts);

  for (let i = 0; i < DEMO_BLUEPRINTS.length; i++) {
    const bp = DEMO_BLUEPRINTS[i];

    // İlgili kategoriyi bul
    const category = categories.find((c) => (c.code || c.name.toLowerCase()) === bp.categoryCode);
    if (!category) {
      console.warn(`    [!] Kategori bulunamadı: ${bp.categoryCode}`);
      continue;
    }

    // İlgili markayı bul (categoryId'si eşleşen)
    const normBpBrand = norm(bp.brandName);
    let brand = brands.find(
      (b) =>
        b.categoryId === category.id &&
        (norm(b.name) === normBpBrand || norm(b.name).includes(normBpBrand) || normBpBrand.includes(norm(b.name)))
    );

    if (!brand) {
      // Marka yoksa oluştur
      brand = await prisma.brand.create({
        data: {
          tenantId,
          categoryId: category.id,
          name: bp.brandName,
        },
        include: { models: true },
      });
    }

    // İlgili modeli bul veya markaya ekle
    let model = brand.models.find((m) => norm(m.name) === norm(bp.modelName));
    if (!model) {
      model = await prisma.vehicleModel.create({
        data: {
          brandId: brand.id,
          name: bp.modelName,
        },
      });
    }

    // Renk, Kasa Tipi, Araç Tipi
    const color = colors.find((c) => norm(c.name) === norm(bp.colorName)) || colors[i % colors.length];
    const bodyType = bodyTypes.find((bt) => norm(bt.name) === norm(bp.bodyTypeName)) || bodyTypes[0];
    const vehicleType = vehicleTypes.find((vt) => norm(vt.name) === norm(bp.vehicleTypeName)) || vehicleTypes[0];

    const purchaseDate = new Date(2024, i % 12, 10 + (i % 15));

    const vehicle = await prisma.vehicle.create({
      data: {
        companyId,
        plate: bp.plate,
        status: bp.status,
        categoryId: category.id,
        brandId: brand.id,
        modelId: model.id,
        brandName: brand.name,
        modelName: model.name,
        colorId: color?.id,
        colorName: color?.name,
        bodyTypeId: bodyType?.id,
        vehicleTypeId: vehicleType?.id,
        year: bp.year,
        km: bp.km,
        fuelType: bp.fuelType,
        transmission: bp.transmission,
        driveType: bp.driveType,
        horsePower: bp.horsePower,
        engineVolume: bp.engineVolume,
        chassisNo: `CHS${100000 + i}`,
        engineNo: `ENG${200000 + i}`,
        purchasePrice: bp.purchasePrice,
        purchaseNotaryPrice: bp.purchasePrice,
        listPrice: bp.listPrice,
        tensf: bp.listPrice - 10000,
        purchaseRegime: "sahis",
        purchaseDate,
        supplierId: supplierIds[i % supplierIds.length],
        ...(bp.status === "SATILDI"
          ? {
              saleAmount: bp.listPrice + 20000,
              saleNotaryAmount: bp.listPrice + 20000,
              saleDate: new Date(2025, 5, 15),
              customerId: customerList[0],
            }
          : {}),
      },
    });

    createdVehicles.push({ id: vehicle.id, status: bp.status, plate: bp.plate, isOptioned: bp.isOptioned });

    // Kapak fotoğrafı
    if (bp.photoKey) {
      await prisma.vehiclePhoto.create({
        data: {
          vehicleId: vehicle.id,
          category: "COVER",
          fileKey: bp.photoKey,
          sortOrder: 0,
        },
      });
    }

    // Opsiyonlu araç
    if (bp.isOptioned && firstUser) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      await prisma.vehicleOption.create({
        data: {
          companyId,
          vehicleId: vehicle.id,
          customerId: customerList[1],
          amount: 30000,
          optionDate: new Date(),
          validUntil,
          note: "Kredi onayı bekleniyor — 30.000 TL kapora alındı.",
          createdById: firstUser.id,
          status: "ACTIVE",
        },
      });
    }
  }

  // 7. Masraflar (ilk 4 araç için)
  for (let i = 0; i < Math.min(4, createdVehicles.length); i++) {
    const veh = createdVehicles[i];
    const lines = [
      { type: "MATERIAL" as const, code: "LST-001", name: "Lastik Takımı", quantity: 4, unitPrice: 2500, vatRate: 20 },
      { type: "RECEIVED_SERVICE" as const, code: "ISC-900", name: "Periyodik Bakım", quantity: 1, unitPrice: 1500, vatRate: 20 },
    ];
    let sub = 0, vat = 0;
    lines.forEach((l) => {
      const n = l.quantity * l.unitPrice;
      sub += n;
      vat += (n * l.vatRate) / 100;
    });
    await prisma.expense.create({
      data: {
        companyId,
        invoiceType: "RECEIVED",
        expenseType: "VEHICLE",
        vehicleId: veh.id,
        supplierId: supplierIds[i % supplierIds.length],
        documentNo: `MSF-${companyId.slice(-3).toUpperCase()}-${1001 + i}`,
        documentDate: new Date(2025, i % 12, 10 + i),
        subTotal: sub,
        totalVat: vat,
        grandTotal: sub + vat,
        lines: { create: lines.map((l, idx) => ({ ...l, sortOrder: idx })) },
      },
    });
  }

  // 8. Kira Sözleşmeleri (KIRALAMADA araçlar için)
  const rented = createdVehicles.filter((v) => v.status === "KIRALAMADA");
  const corporateNames = ["Yıldız İnşaat Ltd. Şti.", "Deniz Lojistik A.Ş.", "Güneş Turizm A.Ş."];

  for (let i = 0; i < rented.length; i++) {
    const custName = corporateNames[i % corporateNames.length];
    const startDate = new Date(2025, i, 1);
    await prisma.rentalContract.create({
      data: {
        companyId,
        vehicleId: rented[i].id,
        customerId: accounts[custName] || customerList[0],
        customerName: custName,
        durationMonths: [12, 24, 36][i % 3],
        kmLimit: 35000,
        monthlyPrice: [35000, 22000, 28000][i % 3],
        startDate,
        contractDate: startDate,
        documentNo: `KIR-${2025}-${101 + i}`,
        status: "ACTIVE",
        drivers: [],
      },
    });
  }

  console.log(
    `  ✓ ${companyName}: ${createdVehicles.length} araç (katalogla %100 uyumlu), ${CUSTOMERS.length + SUPPLIERS.length} cari, ${PRODUCTS.length} ürün, ${rented.length} kira sözleşmesi`
  );
}

async function main() {
  console.log("=== DEMO VERİLERİNİ YENİDEN OLUŞTURMA BAŞLADI ===");

  // Kaleli Grup ve Demo Holding firmalarını bul
  const tenants = await prisma.tenant.findMany({
    where: {
      slug: { in: ["kaleli-grup", "demo-holding"] },
    },
    include: {
      companies: true,
    },
  });

  if (tenants.length === 0) {
    throw new Error("Hedef tenantlar bulunamadı!");
  }

  for (const tenant of tenants) {
    console.log(`\n🏢 Tenant: ${tenant.name} (${tenant.slug})`);
    for (const company of tenant.companies) {
      await seedCompany(company.id, tenant.id, company.name);
    }
  }

  console.log("\n✅ Demo veri sıfırlama ve oluşturma işlemi başarıyla tamamlandı!");
}

main()
  .catch((e) => {
    console.error("Hata:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
