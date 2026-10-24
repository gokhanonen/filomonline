/**
 * Türkiye İl/İlçe/Mahalle/Posta Kodu verilerini DB'ye yükler.
 * Kaynak: jsondata/postal_codes.json ve jsondata/address_data.json
 * Çalıştırma: cd apps/api && npx ts-node prisma/seed-address.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface NeighborhoodItem {
  name: string;
  postalCode: string;
}

interface PostalCodeDistrictEntry {
  id: string;
  cityCode: string;
  cityName: string;
  districtName: string;
  neighborhoods: NeighborhoodItem[];
}

async function main() {
  console.log("🚀 Adres verisi yükleniyor...");

  const dataPath = path.resolve(__dirname, "../../../jsondata/postal_codes.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Dosya bulunamadı: ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const data: PostalCodeDistrictEntry[] = JSON.parse(raw);

  console.log(`📖 ${data.length} ilçe kaydı okundu.`);

  // 1. İlleri hazırla ve createMany yap
  const cityMap = new Map<number, string>();
  for (const entry of data) {
    const code = parseInt(entry.cityCode, 10);
    if (!cityMap.has(code)) {
      cityMap.set(code, entry.cityName.trim());
    }
  }

  const cities = Array.from(cityMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  console.log(`🏙️  ${cities.length} il veritabanına ekleniyor...`);
  await prisma.city.createMany({
    data: cities,
    skipDuplicates: true,
  });

  // 2. İlçeleri hazırla ve createMany yap
  const districtMapKey = new Set<string>();
  const districtsData: { cityId: number; name: string }[] = [];

  for (const entry of data) {
    const cityId = parseInt(entry.cityCode, 10);
    const districtName = entry.districtName.trim();
    const key = `${cityId}:${districtName}`;
    if (!districtMapKey.has(key)) {
      districtMapKey.add(key);
      districtsData.push({ cityId, name: districtName });
    }
  }

  console.log(`📍 ${districtsData.length} ilçe veritabanına ekleniyor...`);
  await prisma.district.createMany({
    data: districtsData,
    skipDuplicates: true,
  });

  // DB'den ilçeleri çekip id eşleştirmesi yapalım
  const dbDistricts = await prisma.district.findMany({
    select: { id: true, cityId: true, name: true },
  });
  const districtLookup = new Map<string, number>();
  for (const d of dbDistricts) {
    districtLookup.set(`${d.cityId}:${d.name}`, d.id);
  }

  // 3. Mahalleleri hazırla
  const neighborhoodDedup = new Map<
    string,
    { districtId: number; name: string; postalCode: string }
  >();

  for (const entry of data) {
    const cityId = parseInt(entry.cityCode, 10);
    const districtName = entry.districtName.trim();
    const districtId = districtLookup.get(`${cityId}:${districtName}`);
    if (!districtId) continue;

    for (const nb of entry.neighborhoods) {
      const name = nb.name.trim();
      const postalCode = String(nb.postalCode || "").trim();
      const key = `${districtId}:${name}`;
      if (!neighborhoodDedup.has(key)) {
        neighborhoodDedup.set(key, { districtId, name, postalCode });
      }
    }
  }

  const allNeighborhoods = Array.from(neighborhoodDedup.values());
  console.log(
    `🏘️  ${allNeighborhoods.length} mahalle toplu olarak ekleniyor (batch: 2000)...`,
  );

  const BATCH_SIZE = 2000;
  for (let i = 0; i < allNeighborhoods.length; i += BATCH_SIZE) {
    const chunk = allNeighborhoods.slice(i, i + BATCH_SIZE);
    await prisma.neighborhood.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    process.stdout.write(
      `\r  İşlenen mahalle: ${Math.min(i + BATCH_SIZE, allNeighborhoods.length)} / ${allNeighborhoods.length}`,
    );
  }

  console.log("\n\n✅ Adres verileri başarıyla yüklendi!");

  const finalCityCount = await prisma.city.count();
  const finalDistrictCount = await prisma.district.count();
  const finalNeighborhoodCount = await prisma.neighborhood.count();

  console.log("📊 Özet:");
  console.log(`   • İl sayısı: ${finalCityCount}`);
  console.log(`   • İlçe sayısı: ${finalDistrictCount}`);
  console.log(`   • Mahalle sayısı: ${finalNeighborhoodCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
