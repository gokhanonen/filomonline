/**
 * Başlangıç verisi:
 *  - Platform süper admini
 *  - Demo tenant (holding) + şirket + şirket yöneticisi
 * Çalıştırma: npm --workspace apps/api run seed
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "admin@filomonline.com";
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? "Admin123!";

  const passwordHash = await argon2.hash(superAdminPassword);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash,
      name: "Platform Admin",
      isSuperAdmin: true,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-holding" },
    update: {},
    create: { name: "Demo Holding", slug: "demo-holding" },
  });

  const existingCompany = await prisma.company.findFirst({
    where: { tenantId: tenant.id, name: "Demo Otomotiv" },
  });
  const company =
    existingCompany ??
    (await prisma.company.create({
      data: { tenantId: tenant.id, name: "Demo Otomotiv" },
    }));

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

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@filomonline.com" },
    update: {},
    create: {
      email: "demo@filomonline.com",
      passwordHash: await argon2.hash("Demo123!"),
      name: "Demo Yönetici",
      tenantId: tenant.id,
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: { userId: demoUser.id, companyId: company.id },
    },
    update: {},
    create: {
      userId: demoUser.id,
      companyId: company.id,
      isDefault: true,
      isAdmin: true,
      roles: { connect: { id: adminRole.id } },
    },
  });

  console.log("Seed tamam:");
  console.log(`  Süper admin : ${superAdminEmail} / ${superAdminPassword}`);
  console.log("  Demo yönetici: demo@filomonline.com / Demo123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
