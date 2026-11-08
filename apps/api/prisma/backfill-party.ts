/**
 * Party Faz 2 — Backfill: mevcut Account (cari) ve Lead kayıtlarını telefon/email/VKN
 * ile TEKİLLEŞTİREREK Party'ye (holding-global kimlik) bağlar.
 * Idempotent: yalnız partyId'si BOŞ kayıtları işler. Prod'da önce YEDEK alın.
 *   npx ts-node prisma/backfill-party.ts
 */
import { PrismaClient, EntityType } from "@prisma/client";

const prisma = new PrismaClient();

const digits = (v?: string | null) => {
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  return d.length ? d : null;
};
const normPhone = (v?: string | null) => {
  let d = digits(v);
  if (!d) return null;
  if (d.length > 10) d = d.slice(-10);
  return d;
};
const normEmail = (v?: string | null) => v?.trim().toLowerCase() || null;

async function findOrCreateParty(
  tenantId: string,
  input: {
    entityType: EntityType;
    name: string;
    phone?: string | null;
    email?: string | null;
    taxNumber?: string | null;
    tckn?: string | null;
    taxOffice?: string | null;
    contactPerson?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    postalCode?: string | null;
  },
): Promise<string> {
  const phone = normPhone(input.phone);
  const email = normEmail(input.email);
  const taxNumber = digits(input.taxNumber);
  const tckn = digits(input.tckn);

  const or: any[] = [];
  if (taxNumber) or.push({ taxNumber });
  if (tckn) or.push({ tckn });
  if (phone) or.push({ phone });
  if (email) or.push({ email });

  if (or.length) {
    const existing = await prisma.party.findFirst({
      where: { tenantId, deletedAt: null, OR: or },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const created = await prisma.party.create({
    data: {
      tenantId,
      entityType: input.entityType,
      name: input.name,
      phone,
      email,
      taxNumber,
      tckn,
      taxOffice: input.taxOffice ?? undefined,
      contactPerson: input.contactPerson ?? undefined,
      address: input.address ?? undefined,
      city: input.city ?? undefined,
      district: input.district ?? undefined,
      neighborhood: input.neighborhood ?? undefined,
      postalCode: input.postalCode ?? undefined,
    },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: { companies: { select: { id: true } } },
  });

  let accCount = 0;
  let leadCount = 0;
  let partyBefore = await prisma.party.count();

  for (const t of tenants) {
    const companyIds = t.companies.map((c) => c.id);
    if (!companyIds.length) continue;

    // Carileri önce işle (VKN/email/telefon en zengin kaynak)
    const accounts = await prisma.account.findMany({
      where: { companyId: { in: companyIds }, partyId: null },
    });
    for (const a of accounts) {
      const partyId = await findOrCreateParty(t.id, {
        entityType: a.entityType,
        name: a.name,
        phone: a.phone,
        email: a.email,
        taxNumber: a.taxNumber,
        tckn: a.tckn,
        taxOffice: a.taxOffice,
        contactPerson: a.contactPerson,
        address: a.address,
        city: a.city,
        district: a.district,
        neighborhood: a.neighborhood,
        postalCode: a.postalCode,
      });
      await prisma.account.update({ where: { id: a.id }, data: { partyId } });
      accCount++;
    }

    // Lead'ler (kişi — INDIVIDUAL)
    const leads = await prisma.lead.findMany({
      where: { companyId: { in: companyIds }, partyId: null, deletedAt: null },
    });
    for (const l of leads) {
      const partyId = await findOrCreateParty(t.id, {
        entityType: "INDIVIDUAL",
        name: l.fullName,
        phone: l.phone,
        email: l.email,
      });
      await prisma.lead.update({ where: { id: l.id }, data: { partyId } });
      leadCount++;
    }

    console.log(`- ${t.name}: ${accounts.length} cari, ${leads.length} lead işlendi`);
  }

  const partyAfter = await prisma.party.count();
  console.log(
    `✓ Backfill tamam: ${accCount} cari + ${leadCount} lead bağlandı; Party ${partyBefore} → ${partyAfter}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
