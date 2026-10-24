import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

export function findJsonDataPath(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), "jsondata", filename),
    path.resolve(process.cwd(), "../../jsondata", filename),
    path.resolve(process.cwd(), "../jsondata", filename),
    path.resolve(__dirname, "../../../../jsondata", filename),
    path.resolve(__dirname, "../../../jsondata", filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`Katalog veri dosyası bulunamadı: ${filename}`);
}

const COLOR_HEX_MAP: Record<string, string> = {
  beyaz: "#FFFFFF",
  siyah: "#000000",
  gri: "#808080",
  gumus: "#C0C0C0",
  mavi: "#1976D2",
  lacivert: "#1A237E",
  kirmizi: "#D32F2F",
  bordo: "#800020",
  yesil: "#2E7D32",
  kahverengi: "#795548",
  bej: "#F5F5DC",
  turuncu: "#FF9800",
  sari: "#FFEB3B",
  mor: "#9C27B0",
  beyaz_siyah: "#ECEFF1",
  mavi_siyah: "#0D47A1",
};

/**
 * Yeni bir Tenant (Holding) açıldığında varsayılan katalog verilerini
 * (kategoriler, markalar, modeller, renkler, kasa/araç tipleri, ilan kaynakları, yönetici rolü)
 * otomatik olarak oluşturur.
 */
export async function seedDefaultsForTenant(
  prisma: PrismaService,
  tenantId: string,
): Promise<void> {
  // 1. Kategoriler (jsondata/categories.json)
  const categoriesRaw = JSON.parse(
    fs.readFileSync(findJsonDataPath("categories.json"), "utf8"),
  );
  const categoryIdByCode = new Map<string, string>();
  for (const cat of categoriesRaw) {
    const created = await prisma.vehicleCategory.create({
      data: {
        tenantId,
        name: cat.label,
        code: cat.value,
        sortOrder: cat.order ?? 0,
      },
    });
    categoryIdByCode.set(cat.value, created.id);
  }

  // 2. Markalar (jsondata/brands.json) -> categoryId ile ilişkili
  const brandsRaw = JSON.parse(
    fs.readFileSync(findJsonDataPath("brands.json"), "utf8"),
  );
  const brandIdMap = new Map<string, string>();
  for (const b of brandsRaw) {
    const catId = categoryIdByCode.get(b.category);
    if (!catId) continue; // örn: 'ube' filtrele

    const created = await prisma.brand.create({
      data: {
        tenantId,
        categoryId: catId,
        name: b.name.trim(),
      },
    });
    brandIdMap.set(b.id, created.id);
  }

  // 3. Modeller (jsondata/models.json) -> brandId ile ilişkili
  const modelsRaw = JSON.parse(
    fs.readFileSync(findJsonDataPath("models.json"), "utf8"),
  );
  const seenModelKeys = new Set<string>();
  const modelsToInsert: { brandId: string; name: string }[] = [];
  for (const m of modelsRaw) {
    const targetBrandId = brandIdMap.get(m.brandId);
    if (!targetBrandId) continue;
    const modelName = m.name.trim();
    if (!modelName) continue;

    const key = `${targetBrandId}:::${modelName.toLowerCase()}`;
    if (!seenModelKeys.has(key)) {
      seenModelKeys.add(key);
      modelsToInsert.push({ brandId: targetBrandId, name: modelName });
    }
  }

  for (let i = 0; i < modelsToInsert.length; i += 500) {
    await prisma.vehicleModel.createMany({
      data: modelsToInsert.slice(i, i + 500),
      skipDuplicates: true,
    });
  }

  // 4. Renkler (jsondata/colors.json)
  const colorsRaw = JSON.parse(
    fs.readFileSync(findJsonDataPath("colors.json"), "utf8"),
  );
  const colorsData = colorsRaw.map((jc: any) => ({
    tenantId,
    name: jc.label.trim(),
    hex: COLOR_HEX_MAP[jc.value] || "#808080",
    sortOrder: jc.order ?? 0,
  }));
  await prisma.color.createMany({
    data: colorsData,
    skipDuplicates: true,
  });

  // 5. Kasa Tipleri
  const BODY_TYPES = [
    "Sedan",
    "Hatchback",
    "SUV",
    "Station Wagon",
    "Coupe",
    "Ticari",
    "Minivan",
    "Cabrio",
  ];
  await prisma.bodyType.createMany({
    data: BODY_TYPES.map((name, i) => ({ tenantId, name, sortOrder: i + 1 })),
    skipDuplicates: true,
  });

  // 6. Araç Tipleri
  const VEHICLE_TYPES = ["Filo", "2.El", "Konsinye", "Sıfır"];
  await prisma.vehicleType.createMany({
    data: VEHICLE_TYPES.map((name, i) => ({ tenantId, name, sortOrder: i + 1 })),
    skipDuplicates: true,
  });

  // 7. İlan Kaynakları
  const LISTING_SOURCES = [
    { label: "Sahibinden", domainLink: "sahibinden.com", sortOrder: 1 },
    { label: "Arabam", domainLink: "arabam.com", sortOrder: 2 },
    { label: "DOD", domainLink: "dod.com.tr", sortOrder: 3 },
    { label: "Letgo", domainLink: "letgo.com", sortOrder: 4 },
  ];
  await prisma.listingSource.createMany({
    data: LISTING_SOURCES.map((s) => ({ tenantId, ...s })),
    skipDuplicates: true,
  });

  // 8. Varsayılan "Yönetici" Rolü
  await prisma.role.create({
    data: {
      tenantId,
      name: "Yönetici",
      description: "Tüm yetkiler",
      permissions: ["*"],
    },
  });
}
