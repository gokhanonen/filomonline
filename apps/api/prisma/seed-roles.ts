/**
 * Her tenant'a hazır rol şablonlarını (Yönetici / Satış Danışmanı / Muhasebe / Görüntüleyici)
 * ekler. Idempotent: (tenantId, name) benzersiz → upsert.
 *   npx ts-node prisma/seed-roles.ts
 */
import { PrismaClient } from "@prisma/client";
import { ROLE_PRESETS } from "../src/authz/permission-catalog";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    for (const preset of ROLE_PRESETS) {
      await prisma.role.upsert({
        where: { tenantId_name: { tenantId: t.id, name: preset.name } },
        update: { description: preset.description, permissions: preset.permissions },
        create: {
          tenantId: t.id,
          name: preset.name,
          description: preset.description,
          permissions: preset.permissions,
        },
      });
    }
    console.log(`${t.name}: ${ROLE_PRESETS.length} rol şablonu hazır`);
  }
}

main()
  .then(() => console.log("✓ rol şablonları seed tamam"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
