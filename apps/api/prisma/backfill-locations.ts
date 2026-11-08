/**
 * Faz A backfill — mevcut işlemlere lokasyon atar (locationId boş olanlara).
 * Her firmanın İLK lokasyonu varsayılan alınır; araçta varsa purchaseLocationId önceliklidir;
 * finans hareketinde kasasının lokasyonu önceliklidir.
 * Idempotent: yalnız locationId/currentLocationId boş kayıtları işler. Prod'da önce YEDEK alın.
 *   npx ts-node prisma/backfill-locations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  let veh = 0;
  let fin = 0;
  let lead = 0;
  let rent = 0;

  for (const c of companies) {
    const firstLoc = await prisma.location.findFirst({
      where: { companyId: c.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!firstLoc) {
      console.log(`- ${c.name}: lokasyon yok, atlandı`);
      continue;
    }
    const def = firstLoc.id;

    // Araç güncel lokasyonu: purchaseLocationId varsa o, yoksa varsayılan
    const vehicles = await prisma.vehicle.findMany({
      where: { companyId: c.id, currentLocationId: null },
      select: { id: true, purchaseLocationId: true, saleLocationId: true },
    });
    for (const v of vehicles) {
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { currentLocationId: v.saleLocationId ?? v.purchaseLocationId ?? def },
      });
      veh++;
    }

    // Finans hareketi: kasasının lokasyonu önce (cashRegister.locationId), yoksa varsayılan
    const movements = await prisma.financeMovement.findMany({
      where: { companyId: c.id, locationId: null },
      select: { id: true, cashRegisterId: true },
    });
    const crIds = [...new Set(movements.map((m) => m.cashRegisterId).filter(Boolean))] as string[];
    const crs = crIds.length
      ? await prisma.cashRegister.findMany({
          where: { id: { in: crIds } },
          select: { id: true, locationId: true },
        })
      : [];
    const crLoc = new Map(crs.map((x) => [x.id, x.locationId]));
    for (const m of movements) {
      const loc = (m.cashRegisterId && crLoc.get(m.cashRegisterId)) || def;
      await prisma.financeMovement.update({ where: { id: m.id }, data: { locationId: loc } });
      fin++;
    }

    // Lead + Kira sözleşmesi: varsayılan lokasyon
    const leads = await prisma.lead.findMany({
      where: { companyId: c.id, locationId: null },
      select: { id: true },
    });
    for (const l of leads) {
      await prisma.lead.update({ where: { id: l.id }, data: { locationId: def } });
      lead++;
    }
    const rentals = await prisma.rentalContract.findMany({
      where: { companyId: c.id, locationId: null },
      select: { id: true },
    });
    for (const r of rentals) {
      await prisma.rentalContract.update({ where: { id: r.id }, data: { locationId: def } });
      rent++;
    }

    console.log(`- ${c.name}: araç ${vehicles.length}, finans ${movements.length}, lead ${leads.length}, kira ${rentals.length}`);
  }

  console.log(`✓ Backfill: araç ${veh}, finans ${fin}, lead ${lead}, kira ${rent} işlemine lokasyon atandı`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
