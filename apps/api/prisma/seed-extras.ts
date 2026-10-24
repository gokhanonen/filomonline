/**
 * Demo: ilan linkleri + opsiyon (kapora) kayıtları.
 * Idempotent: linki/opsiyonu olan araca tekrar eklemez.
 *   npx ts-node prisma/seed-extras.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LINKS = [
  "https://www.sahibinden.com/ilan/vasita-otomobil-ikinci-el-{n}/detay",
  "https://www.arabam.com/ilan/galeriden-satilik-{n}",
  "https://www.dod.com.tr/arac/{n}",
];

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, tenantId: true },
  });

  for (const c of companies) {
    const sources = await prisma.listingSource.findMany({ where: { tenantId: c.tenantId } });
    const srcByDomain = (url: string) =>
      sources.find((s) => s.domainLink && url.includes(s.domainLink))?.id ?? null;

    const vehicles = await prisma.vehicle.findMany({
      where: { companyId: c.id, status: "STOKTA", isActive: true },
      orderBy: { createdAt: "asc" },
      take: 4,
      include: { listingUrls: true, options: { where: { status: "ACTIVE" } } },
    });
    const customers = await prisma.account.findMany({
      where: { companyId: c.id, type: { in: ["CUSTOMER", "BOTH"] }, isActive: true },
      take: 2,
    });
    const admin = await prisma.user.findFirst({ where: { tenantId: c.tenantId } });

    let links = 0;
    let options = 0;
    for (const [i, v] of vehicles.entries()) {
      // İlk 3 araca 1-2 ilan linki
      if (i < 3 && v.listingUrls.length === 0) {
        const urls = i === 0 ? [LINKS[0], LINKS[1]] : [LINKS[i % LINKS.length]];
        for (const tpl of urls) {
          const url = tpl.replace("{n}", String(1000 + i * 7 + links));
          await prisma.vehicleListingUrl.create({
            data: { vehicleId: v.id, url, listingSourceId: srcByDomain(url) },
          });
          links++;
        }
      }
      // 2. araca aktif opsiyon (ilk müşteri, 14 gün geçerli)
      if (i === 1 && v.options.length === 0 && customers[0] && admin) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 14);
        await prisma.vehicleOption.create({
          data: {
            companyId: c.id,
            vehicleId: v.id,
            customerId: customers[0].id,
            optionDate: new Date(),
            validUntil,
            amount: 50000,
            note: "Kapora alındı, 14 gün opsiyon",
            status: "ACTIVE",
            createdById: admin.id,
          },
        });
        options++;
      }
      // 4. araca geçmiş (iptal edilmiş) opsiyon — geçmiş listesi dolu görünsün
      if (i === 3 && customers[1] && admin) {
        const has = await prisma.vehicleOption.count({ where: { vehicleId: v.id } });
        if (!has) {
          const past = new Date();
          past.setDate(past.getDate() - 20);
          const until = new Date(past);
          until.setDate(until.getDate() + 7);
          await prisma.vehicleOption.create({
            data: {
              companyId: c.id,
              vehicleId: v.id,
              customerId: customers[1].id,
              optionDate: past,
              validUntil: until,
              amount: 25000,
              note: "Müşteri vazgeçti",
              status: "CANCELLED",
              cancelledAt: new Date(past.getTime() + 3 * 86400000),
              createdById: admin.id,
              cancelledById: admin.id,
            },
          });
          options++;
        }
      }
    }
    console.log(`  ${c.name}: +${links} ilan linki, +${options} opsiyon`);
  }
  console.log("Ekstra seed tamam.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
