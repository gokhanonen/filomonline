/**
 * Her tenant'taki HER firmanın en az 2 lokasyonu olmasını garanti eder
 * (Merkez + Şube). Lokasyon bazlı çalışmaya geçişte "lokasyonsuz firma" olmasın diye.
 * Idempotent: (companyId, code) benzersiz → upsert; zaten lokasyonu olan firmaya yalnız eksikleri ekler.
 *   npx ts-node prisma/seed-locations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Firma adından kısa kod türet (TR karakterleri sadeleştir)
function slugCode(name: string): string {
  return name
    .toLocaleUpperCase("tr")
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[ÇĞİÖŞÜ]/g, (m) => ({ Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U" }[m] || m))
    .slice(0, 6) || "FRM";
}

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  let created = 0;

  for (const c of companies) {
    const code = slugCode(c.name);
    const want = [
      { name: `${c.name} - Merkez`, code: `${code}-MRK`, city: "İstanbul" },
      { name: `${c.name} - Şube`, code: `${code}-SB1`, city: "İstanbul" },
    ];
    const existingCount = await prisma.location.count({ where: { companyId: c.id } });

    // Zaten lokasyonu olan firmaya dokunma; yalnız lokasyonsuzlara varsayılan 2 ekle.
    if (existingCount === 0) {
      for (const l of want) {
        await prisma.location.create({
          data: { companyId: c.id, name: l.name, code: l.code, city: l.city, isActive: true },
        });
        created++;
      }
    }
    const after = await prisma.location.count({ where: { companyId: c.id } });
    console.log(`- ${c.name}: ${existingCount} → ${after} lokasyon${existingCount ? " (dokunulmadı)" : ""}`);
  }

  const total = await prisma.location.count();
  console.log(`✓ Tamam. Toplam lokasyon: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
