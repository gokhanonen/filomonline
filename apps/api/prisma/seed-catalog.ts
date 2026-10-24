/**
 * Tüm tenant'lara ilişkisel araç kataloğu yükler (idempotent):
 *  - Kategoriler (jsondata/categories.json) -> 6 kategori
 *  - Markalar (jsondata/brands.json) -> 197 marka (kategoriye bağlı)
 *  - Modeller (jsondata/models.json) -> 1279 model (markaya bağlı)
 *  - Renkler, Kasa Tipleri, Araç Tipleri, İlan Kaynakları
 *
 * Çalıştırma: cd apps/api && npx ts-node prisma/seed-catalog.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface JsonCategory {
  id: string;
  label: string;
  value: string;
  order: number;
}

interface JsonBrand {
  id: string;
  name: string;
  category: string;
}

interface JsonModel {
  id: string;
  brandId: string;
  name: string;
}

const COLORS: [string, string, number][] = [
  ["Beyaz", "#FFFFFF", 1],
  ["Siyah", "#000000", 2],
  ["Gri", "#808080", 3],
  ["Gümüş", "#C0C0C0", 4],
  ["Mavi", "#1976D2", 5],
  ["Lacivert", "#1A237E", 6],
  ["Kırmızı", "#D32F2F", 7],
  ["Bordo", "#800020", 8],
  ["Yeşil", "#2E7D32", 9],
  ["Kahverengi", "#795548", 10],
  ["Bej", "#F5F5DC", 11],
  ["Turuncu", "#FF9800", 12],
  ["Sarı", "#FFEB3B", 13],
  ["Mor", "#9C27B0", 14],
  ["Beyaz Siyah", "#ECEFF1", 15],
  ["Mavi Siyah", "#0D47A1", 16],
];
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
const VEHICLE_TYPES = ["Filo", "2.El", "Konsinye", "Sıfır"];
const LISTING_SOURCES: [string, string][] = [
  ["Sahibinden", "sahibinden.com"],
  ["Arabam", "arabam.com"],
  ["DOD", "dod.com.tr"],
  ["Letgo", "letgo.com"],
];

async function upsertSimple(
  model: "color" | "bodyType" | "vehicleType",
  tenantId: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  const delegate = (prisma as unknown as Record<string, any>)[model];
  const existing = await delegate.findFirst({ where: { tenantId, name } });
  if (!existing) await delegate.create({ data: { tenantId, name, ...extra } });
}

async function main() {
  console.log("🚀 İlişkisel katalog verileri yükleniyor...");

  const baseDir = path.resolve(__dirname, "../../../jsondata");
  const categoriesRaw: JsonCategory[] = JSON.parse(
    fs.readFileSync(path.join(baseDir, "categories.json"), "utf8"),
  );
  const brandsRaw: JsonBrand[] = JSON.parse(
    fs.readFileSync(path.join(baseDir, "brands.json"), "utf8"),
  );
  const modelsRaw: JsonModel[] = JSON.parse(
    fs.readFileSync(path.join(baseDir, "models.json"), "utf8"),
  );

  const validCategoriesMap = new Map<string, JsonCategory>();
  for (const c of categoriesRaw) {
    validCategoriesMap.set(c.value, c);
  }

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`🏢 ${tenants.length} tenant için katalog güncelleniyor...`);

  for (const tenant of tenants) {
    console.log(`\n📌 Tenant: ${tenant.name} (${tenant.id})`);

    // 1. Kategorileri oluştur
    const categoryIdByCode = new Map<string, string>();
    for (const cat of categoriesRaw) {
      const existing = await prisma.vehicleCategory.findFirst({
        where: { tenantId: tenant.id, name: cat.label },
      });
      if (existing) {
        if (!existing.code) {
          await prisma.vehicleCategory.update({
            where: { id: existing.id },
            data: { code: cat.value, sortOrder: cat.order },
          });
        }
        categoryIdByCode.set(cat.value, existing.id);
      } else {
        const created = await prisma.vehicleCategory.create({
          data: {
            tenantId: tenant.id,
            name: cat.label,
            code: cat.value,
            sortOrder: cat.order,
          },
        });
        categoryIdByCode.set(cat.value, created.id);
      }
    }
    console.log(`  ✓ ${categoryIdByCode.size} kategori hazır`);

    // 2. Markaları kategoriye bağlı olarak oluştur / eşle
    const brandIdMap = new Map<string, string>(); // jsonBrandId -> dbBrandId
    let createdBrandsCount = 0;

    for (const b of brandsRaw) {
      const catId = categoryIdByCode.get(b.category);
      if (!catId) continue; // örn: 'ube' filtrele

      const brandName = b.name.trim();
      let dbBrand = await prisma.brand.findFirst({
        where: {
          tenantId: tenant.id,
          categoryId: catId,
          name: brandName,
        },
      });

      if (!dbBrand) {
        dbBrand = await prisma.brand.create({
          data: {
            tenantId: tenant.id,
            categoryId: catId,
            name: brandName,
          },
        });
        createdBrandsCount++;
      }

      brandIdMap.set(b.id, dbBrand.id);
    }
    console.log(`  ✓ ${brandIdMap.size} marka eşleşti (${createdBrandsCount} yeni eklendi)`);

    // 3. Modelleri markaya bağlı olarak oluştur
    let createdModelsCount = 0;
    const existingModels = await prisma.vehicleModel.findMany({
      where: { brand: { tenantId: tenant.id } },
      select: { brandId: true, name: true },
    });
    const existingModelKeys = new Set(
      existingModels.map((m) => `${m.brandId}:::${m.name.toLowerCase()}`),
    );

    const modelsToInsert: { brandId: string; name: string }[] = [];
    for (const m of modelsRaw) {
      const targetBrandId = brandIdMap.get(m.brandId);
      if (!targetBrandId) continue;

      const modelName = m.name.trim();
      if (!modelName) continue;

      const key = `${targetBrandId}:::${modelName.toLowerCase()}`;
      if (!existingModelKeys.has(key)) {
        existingModelKeys.add(key);
        modelsToInsert.push({ brandId: targetBrandId, name: modelName });
      }
    }

    if (modelsToInsert.length > 0) {
      // 500'lük gruplar halinde ekle
      for (let i = 0; i < modelsToInsert.length; i += 500) {
        const batch = modelsToInsert.slice(i, i + 500);
        await prisma.vehicleModel.createMany({
          data: batch,
          skipDuplicates: true,
        });
        createdModelsCount += batch.length;
      }
    }
    console.log(`  ✓ ${createdModelsCount} yeni model eklendi`);

    // 4. Renkler, Kasa Tipleri, Araç Tipleri, İlan Kaynakları
    for (const [name, hex, sortOrder] of COLORS)
      await upsertSimple("color", tenant.id, name, { hex, sortOrder });
    for (const n of BODY_TYPES) await upsertSimple("bodyType", tenant.id, n);
    for (const n of VEHICLE_TYPES) await upsertSimple("vehicleType", tenant.id, n);
    for (const [i, [label, domainLink]] of LISTING_SOURCES.entries()) {
      const exists = await prisma.listingSource.findFirst({
        where: { tenantId: tenant.id, label },
      });
      if (!exists) {
        await prisma.listingSource.create({
          data: { tenantId: tenant.id, label, domainLink, sortOrder: i + 1 },
        });
      }
    }
    console.log(`  ✓ Renkler, kasa/araç tipleri ve ilan kaynakları senkronize edildi`);
  }

  console.log("\n✅ İlişkisel katalog seed işlemi başarıyla tamamlandı!");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
