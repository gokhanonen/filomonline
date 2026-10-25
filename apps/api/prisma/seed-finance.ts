/**
 * Demo: finans modülü — banka/POS/kredi kartı hesapları, tahsilat/ödeme, POS aktarımı,
 * çek/senet portföyü, virman. İşlemler FinanceService üzerinden yazılır (bakiyeler, eşleştirmeler tutarlı).
 * Idempotent: "Garanti BBVA Ticari" hesabı olan şirkete tekrar eklemez.
 *   npx ts-node prisma/seed-finance.ts
 */
import { PrismaService } from "../src/prisma/prisma.service";
import { ActivityService } from "../src/activity/activity.service";
import { FinanceService } from "../src/finance/finance.service";
import { LedgerService } from "../src/finance/ledger.service";
import { ChequesService } from "../src/finance/cheques.service";

const prisma = new PrismaService();
const ledger = new LedgerService(prisma);
const activity = { log: async () => undefined } as unknown as ActivityService;
const finance = new FinanceService(prisma, ledger, activity);
const cheques = new ChequesService(prisma, finance);

const MARKER = "Garanti BBVA Ticari";
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });

  for (const c of companies) {
    if (await prisma.cashRegister.count({ where: { companyId: c.id, name: MARKER } })) {
      console.log(`- ${c.name}: zaten var, atlandı`);
      continue;
    }
    const customers = await prisma.account.findMany({ where: { companyId: c.id, isActive: true, type: { in: ["CUSTOMER", "BOTH"] } }, take: 6 });
    const suppliers = await prisma.account.findMany({ where: { companyId: c.id, isActive: true, type: { in: ["SUPPLIER", "BOTH"] } }, take: 4 });
    if (customers.length < 2 || suppliers.length < 1) {
      console.log(`- ${c.name}: yeterli cari yok, atlandı`);
      continue;
    }
    const cust = (i: number) => customers[i % customers.length].id;
    const sup = (i: number) => suppliers[i % suppliers.length].id;

    let kasa = await prisma.cashRegister.findFirst({ where: { companyId: c.id, type: "CASH", isActive: true } });
    if (!kasa) kasa = await finance.createAccount(c.id, undefined, { name: "Merkez Kasa", type: "CASH", openingBalance: 75000 });
    const garanti = await finance.createAccount(c.id, undefined, {
      name: MARKER, type: "BANK", bankName: "Garanti BBVA", branchName: "Güneşli Ticari", iban: "TR56 0006 2000 0001 2990 1022 34", openingBalance: 850000, erpCode: "102.01",
    });
    const isbank = await finance.createAccount(c.id, undefined, {
      name: "İş Bankası Kurumsal", type: "BANK", bankName: "Türkiye İş Bankası", branchName: "Levent Kurumsal", iban: "TR33 0006 4000 0011 2345 6789 01", openingBalance: 320000, erpCode: "102.02",
    });
    const eur = await finance.createAccount(c.id, undefined, {
      name: "Garanti EUR Hesabı", type: "BANK", currency: "EUR", bankName: "Garanti BBVA", iban: "TR11 0006 2000 0001 2990 5555 01", openingBalance: 12500, erpCode: "102.03",
    });
    const pos = await finance.createAccount(c.id, undefined, {
      name: "Garanti Sanal & Fiziki POS", type: "POS", bankName: "Garanti BBVA", linkedBankId: garanti.id, commissionRate: 1.79, valorDays: 1, erpCode: "108.01",
    });
    const card = await finance.createAccount(c.id, undefined, {
      name: "Bonus Business 1", type: "CREDIT_CARD", bankName: "Garanti BBVA", linkedBankId: garanti.id, cardLastFour: "4821", creditLimit: 250000, statementDay: 15, paymentDueDay: 25, erpCode: "309.01",
    });

    // Tahsilatlar (açık faturaya otomatik eşleşir)
    await finance.collection(c.id, undefined, { date: day(-40), accountId: cust(0), module: "BANK", cashRegisterId: garanti.id, amount: 450000, documentNo: "EFT-104512", description: "Araç satış bedeli", autoAllocate: true });
    await finance.collection(c.id, undefined, { date: day(-21), accountId: cust(1), module: "CASH", cashRegisterId: kasa.id, amount: 35000, description: "Kapora", autoAllocate: true });
    await finance.collection(c.id, undefined, { date: day(-9), accountId: cust(2), module: "BANK", cashRegisterId: isbank.id, amount: 180000, documentNo: "HVL-88231", autoAllocate: true });

    // POS: biri aktarılmış, ikisi bekliyor
    const p1 = await finance.collection(c.id, undefined, { date: day(-12), accountId: cust(3), module: "POS", cashRegisterId: pos.id, amount: 62500, description: "Kredi kartı ile ön ödeme" });
    await finance.posSettle(c.id, undefined, { posId: pos.id, movementIds: [p1.movements[0].id], date: day(-11) });
    await finance.collection(c.id, undefined, { date: day(-1), accountId: cust(4), module: "POS", cashRegisterId: pos.id, amount: 28750 });
    await finance.collection(c.id, undefined, { date: day(0), accountId: cust(5), module: "POS", cashRegisterId: pos.id, amount: 14900 });

    // Çekler: portföy, tahsilde, tahsil edildi, senet, ciro, karşılıksız
    const ch = (i: number, amount: number, due: number, serial: string, bank: string, kind: "CHEQUE" | "NOTE" = "CHEQUE") =>
      finance.collection(c.id, undefined, {
        date: day(-30 + i * 3), accountId: cust(i), module: "CHEQUE", amount, autoAllocate: true,
        cheque: { kind, serialNo: serial, bankName: kind === "CHEQUE" ? bank : undefined, dueDate: day(due) },
      });
    await ch(0, 275000, 18, "A-1048832", "Akbank");
    const inColl = await ch(1, 140000, 4, "Y-2290017", "Yapı Kredi");
    await cheques.deposit(c.id, inColl.movements[0].chequeId!, { bankRegisterId: garanti.id });
    const collected = await ch(2, 95000, -6, "Z-7781230", "Ziraat Bankası");
    await cheques.collect(c.id, undefined, collected.movements[0].chequeId!, { date: day(-5), cashRegisterId: isbank.id });
    await ch(3, 60000, 45, "SNT-0042", "", "NOTE");
    const endorse = await ch(4, 120000, 30, "H-5531209", "Halkbank");
    await finance.payment(c.id, undefined, { date: day(-8), accountId: sup(0), module: "CHEQUE", endorseChequeId: endorse.movements[0].chequeId!, amount: 120000, autoAllocate: true, description: "Araç alım bedeline ciro" });
    const bounced = await ch(5, 38000, -3, "T-0091827", "QNB");
    await cheques.bounce(c.id, undefined, bounced.movements[0].chequeId!, { date: day(-2), status: "BOUNCED", description: "Karşılıksız — banka şerhli" });
    await ch(1, 210000, -2, "G-6602144", "Garanti BBVA"); // vadesi geçmiş, portföyde

    // Verilen çek
    const issued = await finance.payment(c.id, undefined, {
      date: day(-15), accountId: sup(1), module: "CHEQUE", amount: 185000, autoAllocate: true,
      cheque: { serialNo: "GRN-000117", dueDate: day(20), bankRegisterId: garanti.id },
    });
    void issued;
    const paidIssued = await finance.payment(c.id, undefined, {
      date: day(-35), accountId: sup(2), module: "CHEQUE", amount: 64000, autoAllocate: true,
      cheque: { serialNo: "GRN-000109", dueDate: day(-4), bankRegisterId: garanti.id },
    });
    await cheques.pay(c.id, undefined, paidIssued.movements[0].chequeId!, { date: day(-4) });

    // Ödemeler + kredi kartı
    await finance.payment(c.id, undefined, { date: day(-18), accountId: sup(0), module: "BANK", cashRegisterId: garanti.id, amount: 96000, documentNo: "EFT-55120", autoAllocate: true });
    await finance.payment(c.id, undefined, { date: day(-7), accountId: sup(3), module: "CASH", cashRegisterId: kasa.id, amount: 4250, description: "Yıkama & detaylı temizlik", autoAllocate: true });
    await finance.payment(c.id, undefined, { date: day(-14), accountId: sup(1), module: "CREDIT_CARD", cashRegisterId: card.id, amount: 18400, description: "Lastik seti", autoAllocate: true });
    await finance.payment(c.id, undefined, { date: day(-6), module: "CREDIT_CARD", cashRegisterId: card.id, amount: 3250, description: "Akaryakıt" });
    await finance.payment(c.id, undefined, { date: day(-3), accountId: sup(2), module: "CREDIT_CARD", cashRegisterId: card.id, amount: 12600, description: "Ekspertiz & bakım", autoAllocate: true });
    await finance.transfer(c.id, undefined, { date: day(-10), fromId: garanti.id, toId: card.id, amount: 18400, description: "Bonus ekstre ödemesi" });

    // Virmanlar
    await finance.transfer(c.id, undefined, { date: day(-20), fromId: kasa.id, toId: garanti.id, amount: 30000, description: "Kasadan bankaya yatırılan" });
    await finance.transfer(c.id, undefined, { date: day(-16), fromId: garanti.id, toId: eur.id, amount: 186000, toAmount: 5000, description: "EUR alımı" });

    console.log(`✓ ${c.name}: finans demo verisi eklendi`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
