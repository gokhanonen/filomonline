import { PrismaClient } from "@prisma/client";
import { DEMO_BLUEPRINTS } from "./seed-demo";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Araç Fotoğrafları Senkronizasyonu Başlatılıyor ===");
  console.log(`Blueprint araç sayısı: ${DEMO_BLUEPRINTS.length}`);

  const blueprintMap = new Map<string, (typeof DEMO_BLUEPRINTS)[0]>();
  for (const bp of DEMO_BLUEPRINTS) {
    blueprintMap.set(bp.plate.replace(/\s+/g, "").toUpperCase(), bp);
  }

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      plate: true,
      brandName: true,
      modelName: true,
      companyId: true,
    },
  });

  console.log(`Veritabanında bulunan toplam araç sayısı: ${vehicles.length}`);

  let updatedCount = 0;

  for (const v of vehicles) {
    const cleanPlate = v.plate.replace(/\s+/g, "").toUpperCase();
    let bp = blueprintMap.get(cleanPlate);

    // Eğer plaka tam eşleşmezse marka ve modele göre eşleştir
    if (!bp && v.brandName && v.modelName) {
      bp = DEMO_BLUEPRINTS.find(
        (b) =>
          b.brandName.toLowerCase() === v.brandName?.toLowerCase() &&
          b.modelName.toLowerCase() === v.modelName?.toLowerCase(),
      );
    }

    if (!bp) {
      // Varsayılan olarak 1. blueprint'i temel al
      bp = DEMO_BLUEPRINTS[0];
    }

    // 1. Mevcut fotoğrafları temizle
    await prisma.vehiclePhoto.deleteMany({
      where: { vehicleId: v.id },
    });

    // 2. 1 adet KAPAK (COVER) fotoğrafı ekle
    await prisma.vehiclePhoto.create({
      data: {
        vehicleId: v.id,
        category: "COVER",
        fileKey: bp.coverPhoto,
        url: bp.coverPhoto,
        thumbKey: bp.coverPhoto,
        thumbUrl: bp.coverPhoto,
        sortOrder: 0,
      },
    });

    // 3. 2 Dış, 2 İç Galeri fotoğraflarını ekle
    if (bp.galleryPhotos && bp.galleryPhotos.length > 0) {
      for (let gi = 0; gi < bp.galleryPhotos.length; gi++) {
        const gp = bp.galleryPhotos[gi];
        await prisma.vehiclePhoto.create({
          data: {
            vehicleId: v.id,
            category: gp.category,
            fileKey: gp.url,
            url: gp.url,
            thumbKey: gp.url,
            thumbUrl: gp.url,
            sortOrder: gi + 1,
          },
        });
      }
    }

    updatedCount++;
    process.stdout.write(`\rGüncellenen araç: ${updatedCount} / ${vehicles.length} (${v.plate})`);
  }

  console.log(`\n✅ Başarıyla tamamlandı! Toplam ${updatedCount} aracın fotoğrafları (1 Kapak, 2 Dış, 2 İç) güncellendi.`);
}

main()
  .catch((e) => {
    console.error("Hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
