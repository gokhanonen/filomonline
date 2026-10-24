/**
 * jsondata/colors.json verisini tüm tenant'lara içe aktarır,
 * eski renkleri siler / günceller ve mevcut araçların colorId referanslarını yeniler.
 *
 * Çalıştırma: cd apps/api && npx ts-node prisma/seed-colors.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface JsonColor {
  id: string;
  label: string;
  value: string;
  order: number;
}

const HEX_MAP: Record<string, string> = {
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

async function main() {
  console.log("🚀 Renk verileri içe aktarılıyor...");

  const dataPath = path.resolve(__dirname, "../../../jsondata/colors.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Dosya bulunamadı: ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const jsonColors: JsonColor[] = JSON.parse(raw);
  jsonColors.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  console.log(`🎨 ${jsonColors.length} adet renk tanımı okundu.`);

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`🏢 ${tenants.length} tenant için renkler güncelleniyor...`);

  for (const tenant of tenants) {
    console.log(`\n📌 Tenant: ${tenant.name} (${tenant.id})`);

    // 1. Yeni renkleri ekle veya güncelle
    const activeColorNames = new Set<string>();
    const colorByName = new Map<string, string>(); // name -> id

    for (const jc of jsonColors) {
      const name = jc.label.trim();
      const hex = HEX_MAP[jc.value] || "#808080";
      const sortOrder = jc.order ?? 0;

      activeColorNames.add(name);

      const color = await prisma.color.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name } },
        create: {
          tenantId: tenant.id,
          name,
          hex,
          sortOrder,
        },
        update: {
          hex,
          sortOrder,
        },
      });

      colorByName.set(name, color.id);
    }

    console.log(`  ✓ ${jsonColors.length} renk kaydedildi/güncellendi.`);

    // 2. Bu tenant'ın araçlarındaki colorId'leri yeni renk ID'leri ile eşle
    const tenantCompanies = await prisma.company.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    const companyIds = tenantCompanies.map((c) => c.id);

    const vehicles = await prisma.vehicle.findMany({
      where: {
        companyId: { in: companyIds },
        colorName: { not: null },
      },
      select: { id: true, colorName: true, colorId: true },
    });

    let updatedVehicles = 0;
    for (const v of vehicles) {
      if (!v.colorName) continue;
      const targetId = colorByName.get(v.colorName);
      if (targetId && targetId !== v.colorId) {
        await prisma.vehicle.update({
          where: { id: v.id },
          data: { colorId: targetId },
        });
        updatedVehicles++;
      }
    }
    if (updatedVehicles > 0) {
      console.log(`  ✓ ${updatedVehicles} aracın renk bağlantısı güncellendi.`);
    }

    // 3. colors.json'da OLMAYAN eski renkleri sil
    const oldColorsToDelete = await prisma.color.findMany({
      where: {
        tenantId: tenant.id,
        name: { notIn: Array.from(activeColorNames) },
      },
      select: { id: true, name: true },
    });

    if (oldColorsToDelete.length > 0) {
      const deleteIds = oldColorsToDelete.map((c) => c.id);
      // Bu renkleri kullanan araç varsa colorId'sini null yap
      await prisma.vehicle.updateMany({
        where: { colorId: { in: deleteIds } },
        data: { colorId: null },
      });

      await prisma.color.deleteMany({
        where: { id: { in: deleteIds } },
      });
      console.log(
        `  🗑️  ${oldColorsToDelete.length} eski renk silindi: ${oldColorsToDelete.map((c) => c.name).join(", ")}`,
      );
    } else {
      console.log(`  ✓ Silinecek eski renk bulunamadı.`);
    }
  }

  console.log("\n✅ Renk içe aktarımı başarıyla tamamlandı!");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
