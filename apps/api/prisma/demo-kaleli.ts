/**
 * Çoklu-firma holding demosu — firma değiştirici (CompanySwitcher) + lokasyon testi için.
 * "Kaleli Grup" holdingi + altında 5 FİRMA (VKN) + toplam 10 LOKASYON + hepsinin
 * yöneticisi TEK kullanıcı. Kullanıcı tüm firmalara üye olduğundan sağ üstteki
 * firma seçici AKTİF olur (tek firmada pasif/chip görünür).
 *
 * Çalıştırma (apps/api içinde):  npx ts-node prisma/demo-kaleli.ts
 * Idempotent — tekrar çalıştırılabilir.
 *
 * Giriş:  kaleli@filomonline.com / Kaleli123!
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// 5 firma (VKN) — her biri bir Company
const COMPANIES = [
  { name: "Kaleli Ford Plaza", taxNumber: "1000000001", taxOffice: "Kadıköy", city: "İstanbul" },
  { name: "Kaleli 2.El", taxNumber: "1000000002", taxOffice: "Şişli", city: "İstanbul" },
  { name: "Kaleli Rent a Car", taxNumber: "1000000003", taxOffice: "Beşiktaş", city: "İstanbul" },
  { name: "Kaleli Filo Kiralama", taxNumber: "1000000004", taxOffice: "Çankaya", city: "Ankara" },
  { name: "Kaleli Oto Servis", taxNumber: "1000000005", taxOffice: "Konak", city: "İzmir" },
];

// 10 lokasyon — firma adına göre dağıtılmış (companyName -> locations)
const LOCATIONS: Record<string, { name: string; code: string; city: string; isExternal?: boolean }[]> = {
  "Kaleli Ford Plaza": [
    { name: "Kadıköy Plaza", code: "FP-KDK", city: "İstanbul" },
    { name: "Ümraniye Şube", code: "FP-UMR", city: "İstanbul" },
  ],
  "Kaleli 2.El": [
    { name: "Maslak Galeri", code: "2E-MSK", city: "İstanbul" },
    { name: "Bostancı Galeri", code: "2E-BST", city: "İstanbul" },
  ],
  "Kaleli Rent a Car": [
    { name: "Havalimanı Ofis", code: "RC-IST", city: "İstanbul" },
    { name: "Taksim Ofis", code: "RC-TKS", city: "İstanbul" },
  ],
  "Kaleli Filo Kiralama": [
    { name: "Ankara Merkez", code: "FK-ANK", city: "Ankara" },
    { name: "Esenboğa Ofis", code: "FK-ESB", city: "Ankara" },
  ],
  "Kaleli Oto Servis": [
    { name: "İzmir Servis", code: "OS-IZM", city: "İzmir" },
    { name: "Bornova Kaporta (dış)", code: "OS-BRN", city: "İzmir", isExternal: true },
  ],
};

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "kaleli-grup" },
    update: {},
    create: { name: "Kaleli Grup", slug: "kaleli-grup" },
  });

  const companies = [];
  for (const c of COMPANIES) {
    const existing = await prisma.company.findFirst({
      where: { tenantId: tenant.id, name: c.name },
    });
    const company = existing
      ? await prisma.company.update({
          where: { id: existing.id },
          data: { taxNumber: c.taxNumber, taxOffice: c.taxOffice },
        })
      : await prisma.company.create({
          data: { tenantId: tenant.id, name: c.name, taxNumber: c.taxNumber, taxOffice: c.taxOffice },
        });
    companies.push(company);

    // Lokasyonlar (companyId+code benzersiz → upsert)
    for (const loc of LOCATIONS[c.name] ?? []) {
      await prisma.location.upsert({
        where: { companyId_code: { companyId: company.id, code: loc.code } },
        update: { name: loc.name, city: loc.city, isExternal: loc.isExternal ?? false, isActive: true },
        create: {
          companyId: company.id,
          name: loc.name,
          code: loc.code,
          city: loc.city,
          isExternal: loc.isExternal ?? false,
        },
      });
    }
  }

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Yönetici" } },
    update: {},
    create: { tenantId: tenant.id, name: "Yönetici", description: "Tüm yetkiler", permissions: ["*"] },
  });

  const user = await prisma.user.upsert({
    where: { email: "kaleli@filomonline.com" },
    update: {},
    create: {
      email: "kaleli@filomonline.com",
      passwordHash: await argon2.hash("Kaleli123!"),
      name: "Kaleli Grup Yöneticisi",
      tenantId: tenant.id,
    },
  });

  // Kullanıcıyı 5 firmanın HEPSİNE yönetici üye yap → firma seçici aktif olur
  for (let i = 0; i < companies.length; i++) {
    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId: companies[i].id } },
      update: { isAdmin: true },
      create: {
        userId: user.id,
        companyId: companies[i].id,
        isDefault: i === 0,
        isAdmin: true,
        roles: { connect: { id: adminRole.id } },
      },
    });
  }

  const locCount = Object.values(LOCATIONS).reduce((n, a) => n + a.length, 0);
  console.log("✓ Kaleli Grup holding demosu hazır:");
  console.log(`  Holding: Kaleli Grup → ${companies.length} firma, ${locCount} lokasyon`);
  console.log("  Giriş: kaleli@filomonline.com / Kaleli123!");
  console.log("  Firmalar:", COMPANIES.map((c) => c.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
