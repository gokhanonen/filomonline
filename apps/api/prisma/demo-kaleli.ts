/**
 * Örnek çoklu-firma demosu: "Kaleli Grup" holdingi + altında 3 firma + hepsinin
 * yöneticisi bir kullanıcı. Amaç sağ üstteki firma değiştirici combobox'ı göstermek.
 * Çalıştırma: npx ts-node prisma/demo-kaleli.ts  (apps/api içinde)
 * Idempotent — tekrar çalıştırılabilir.
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "kaleli-grup" },
    update: {},
    create: { name: "Kaleli Grup", slug: "kaleli-grup" },
  });

  const companyNames = [
    "Kaleli Ford Plaza",
    "Kaleli 2.El",
    "Kaleli Rent a Car",
  ];

  const companies = [];
  for (const name of companyNames) {
    const existing = await prisma.company.findFirst({
      where: { tenantId: tenant.id, name },
    });
    companies.push(
      existing ??
        (await prisma.company.create({
          data: { tenantId: tenant.id, name },
        })),
    );
  }

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Yönetici" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Yönetici",
      description: "Tüm yetkiler",
      permissions: ["*"],
    },
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

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId: c.id } },
      update: {},
      create: {
        userId: user.id,
        companyId: c.id,
        isDefault: i === 0, // İlk firma varsayılan
        isAdmin: true,
        roles: { connect: { id: adminRole.id } },
      },
    });
  }

  console.log("Kaleli Grup demosu hazır:");
  console.log("  Giriş: kaleli@filomonline.com / Kaleli123!");
  console.log("  Firmalar:", companyNames.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
