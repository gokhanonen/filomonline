/**
 * Demo/başlangıç: abonelik kademeleri (kota + fiyat + aylık AI kontör) + kontör paketleri.
 *  - Kademeler: free (varsayılan) / starter / pro / enterprise.
 *  - Freemium: free planda 5 tamamlanan alış+satış işleminden sonra (grace %10 → 6'da) kilit.
 *  - Yıllık: "10 öde 12 kullan" (annualMonthsCharged=10).
 *  - Satılık kontör paketleri (süresiz).
 *  - Planı olmayan tüm tenant'lara "free" atanır.
 * Tüm sayılar süper admin panelinden değiştirilebilir. Idempotent (code/isim bazlı).
 *   npx ts-node prisma/seed-credits.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const D = (v: number | null) => (v == null ? null : new Prisma.Decimal(v));

// code, name, aylık AI kontör, kullanıcı, lokasyon, aktif araç, freeTxnLimit, aylık liste fiyat, public, default, yıllık ay
const PLANS = [
  { code: "free", name: "Ücretsiz", credits: 20, users: 1, loc: 1, veh: 3, freeTxn: 5, price: 0, pub: true, def: true, annMonths: null, order: 0 },
  { code: "starter", name: "Başlangıç", credits: 300, users: 3, loc: 1, veh: 30, freeTxn: null, price: 1500, pub: true, def: false, annMonths: 10, order: 1 },
  { code: "pro", name: "Profesyonel", credits: 1500, users: 8, loc: 3, veh: 120, freeTxn: null, price: 3500, pub: true, def: false, annMonths: 10, order: 2 },
  { code: "enterprise", name: "Kurumsal", credits: 6000, users: 20, loc: 10, veh: 500, freeTxn: null, price: 7500, pub: false, def: false, annMonths: 10, order: 3 },
];

const PACKAGES = [
  { name: "500 Kontör", credits: 500, price: 499 },
  { name: "1.000 Kontör", credits: 1000, price: 899 },
  { name: "5.000 Kontör", credits: 5000, price: 3999 },
];

async function main() {
  for (const p of PLANS) {
    if (p.def) {
      await prisma.subscriptionPlan.updateMany({
        where: { isDefault: true, code: { not: p.code } },
        data: { isDefault: false },
      });
    }
    const data = {
      name: p.name,
      monthlyFreeCredits: p.credits,
      includedUsers: p.users,
      includedLocations: p.loc,
      includedVehicles: p.veh,
      freeTransactionLimit: p.freeTxn,
      monthlyListPrice: D(p.price),
      annualMonthsCharged: p.annMonths,
      graceOveragePct: 10,
      isPublic: p.pub,
      isActive: true,
      isDefault: p.def,
      sortOrder: p.order,
    };
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: data,
      create: { code: p.code, ...data },
    });
    console.log(`plan: ${p.code} — ${p.credits} kontör/ay, ${p.users}k/${p.loc}lok/${p.veh}araç, ${p.price}₺/ay`);
  }

  const free = await prisma.subscriptionPlan.findUnique({ where: { code: "free" } });

  for (const k of PACKAGES) {
    const existing = await prisma.creditPackage.findFirst({ where: { name: k.name } });
    if (existing) {
      await prisma.creditPackage.update({
        where: { id: existing.id },
        data: { credits: k.credits, price: D(k.price)!, isActive: true },
      });
    } else {
      await prisma.creditPackage.create({
        data: { name: k.name, credits: k.credits, price: D(k.price)! },
      });
    }
    console.log(`paket: ${k.name} → ${k.credits} kontör / ${k.price}₺`);
  }

  if (free) {
    const r = await prisma.tenant.updateMany({
      where: { subscriptionPlanId: null },
      data: { subscriptionPlanId: free.id },
    });
    console.log(`${r.count} tenant'a 'free' planı atandı`);
  }
}

main()
  .then(() => console.log("✓ abonelik + kontör seed tamam"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
