/**
 * Tüm tenant'lara varsayılan doküman kategori + tiplerini yükler (idempotent).
 * Çalıştırma: npx ts-node prisma/seed-documents.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STRUCTURE: { value: string; label: string; module: string; types: [string, string][] }[] = [
  {
    value: "arac",
    label: "Araç Evrakları",
    module: "VEHICLE",
    types: [
      ["ruhsat", "Ruhsat"],
      ["trafik_sigortasi", "Trafik Sigortası"],
      ["kasko", "Kasko"],
      ["muayene", "Araç Muayene Belgesi"],
      ["ekspertiz", "Ekspertiz Raporu"],
      ["noter_alis", "Noter Alış Evrakı"],
      ["noter_satis", "Noter Satış Evrakı"],
      ["k_belgesi", "K Belgesi"],
      ["sigorta", "Sigorta Poliçesi"],
      ["diger", "Diğer"],
    ],
  },
  {
    value: "musteri",
    label: "Müşteri Evrakları",
    module: "CUSTOMER,VEHICLE",
    types: [
      ["kimlik", "Kimlik Fotokopisi"],
      ["ehliyet", "Sürücü Belgesi / Ehliyet"],
      ["vekaletname", "Vekaletname"],
      ["vergi_levhasi", "Vergi Levhası"],
      ["imza_sirkuleri", "İmza Sirküleri"],
      ["faaliyet_belgesi", "Faaliyet Belgesi"],
    ],
  },
  {
    value: "sozlesme",
    label: "Sözleşmeler",
    module: "CONTRACT,VEHICLE",
    types: [
      ["satis_sozlesmesi", "Satış Sözleşmesi"],
      ["kira_sozlesmesi", "Kira Sözleşmesi"],
      ["teslim_tutanagi", "Araç Teslim Tutanağı"],
      ["rezerve_protokolu", "Opsiyon / Kapora Protokolü"],
    ],
  },
  {
    value: "fatura",
    label: "Fatura & Ödeme",
    module: "INVOICE,VEHICLE",
    types: [
      ["alis_faturasi", "Alış Faturası"],
      ["satis_faturasi", "Satış Faturası"],
      ["banka_dekontu", "Banka Dekontu"],
      ["gider_pusulasi", "Gider Pusulası"],
    ],
  },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    for (let ci = 0; ci < STRUCTURE.length; ci++) {
      const c = STRUCTURE[ci];
      let cat = await prisma.documentCategory.findFirst({
        where: { tenantId: t.id, value: c.value },
      });
      if (!cat) {
        cat = await prisma.documentCategory.create({
          data: { tenantId: t.id, value: c.value, label: c.label, module: c.module, sortOrder: ci },
        });
      } else {
        await prisma.documentCategory.update({
          where: { id: cat.id },
          data: { module: c.module },
        });
      }
      for (let ti = 0; ti < c.types.length; ti++) {
        const [value, label] = c.types[ti];
        const exists = await prisma.documentType.findFirst({
          where: { categoryId: cat.id, value },
        });
        if (!exists) {
          await prisma.documentType.create({
            data: { tenantId: t.id, categoryId: cat.id, value, label, sortOrder: ti },
          });
        }
      }
    }
    console.log(`  ${t.name}: doküman tipleri yüklendi`);
  }
  console.log("Doküman seed tamam.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
