/**
 * FilomOnline — Kapsamlı ve Zengin CRM Demo Seed Scripti
 *
 * Tüm kombinasyonları içerir:
 *  - 7 Lead Durumu: NEW, CONTACTED, TEST_DRIVE, QUOTE_SENT, NEGOTIATION, CONVERTED, LOST
 *  - 8 Kaynak: SAHIBINDEN, ARABAM, WALK_IN, WEBSITE, REFERRAL, SOCIAL_MEDIA, PHONE, OTHER
 *  - 4 Deneme Sürüşü Durumu: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
 *  - 5 Teklif Durumu: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
 *  - İlgilenilen Araçlar, Teklifler, Test Sürüşleri, Zaman Çizelgesi Aktiviteleri (Arama, Toplantı, Not, Aşama Değişimi)
 *
 * Çalıştırma:
 *   npx tsx prisma/seed-crm.ts
 */
import {
  PrismaClient,
  LeadStatus,
  LeadSource,
  TestDriveStatus,
  QuoteStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

export async function seedCrmForCompany(companyId: string, companyName: string) {
  console.log(`\n--- ${companyName} (${companyId}) için CRM Verileri Oluşturuluyor ---`);

  // Mevcut araçları ve kullanıcıları çek
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId },
    select: { id: true, plate: true, brandName: true, modelName: true, listPrice: true, purchasePrice: true },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  const accounts = await prisma.account.findMany({
    where: { companyId },
    select: { id: true, name: true },
  });

  const defaultUser = users[0];
  const salesRep1 = users[1] || users[0];
  const salesRep2 = users[2] || users[0];

  // Eski CRM kayıtlarını temizle
  const existingLeads = await prisma.lead.findMany({ where: { companyId }, select: { id: true } });
  if (existingLeads.length > 0) {
    console.log(`  Eski ${existingLeads.length} potansiyel müşteri temizleniyor...`);
    await prisma.lead.deleteMany({ where: { companyId } });
  }

  const vMap = (brand: string, model?: string) => {
    const found = vehicles.find((v) =>
      v.brandName?.toLowerCase().includes(brand.toLowerCase()) &&
      (!model || v.modelName?.toLowerCase().includes(model.toLowerCase()))
    );
    return found || vehicles[0];
  };

  const bmw = vMap("BMW");
  const audiA3 = vMap("Audi", "A3");
  const audiQ5 = vMap("Audi", "Q5");
  const merc = vMap("Mercedes");
  const golf = vMap("Volkswagen");
  const transit = vMap("Ford");
  const doblo = vMap("FIAT");
  const captur = vMap("Renault", "Captur");
  const togg = vMap("TOGG");

  const now = new Date();
  const dAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };
  const dAhead = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  const LEADS_DATA = [
    // -------------------------------------------------------------------------
    // 1. NEW (Yeni Potansiyel) - 7 Kayıt
    // -------------------------------------------------------------------------
    {
      fullName: "Mert Aksoy",
      phone: "0532 948 10 22",
      email: "mert.aksoy@gmail.com",
      source: LeadSource.SAHIBINDEN,
      status: LeadStatus.NEW,
      budget: 2350000,
      notes: "Sahibinden ilanı üzerinden mesaj attı. 2020 Passat takas teklifini görüşmek istiyor.",
      vehicle: bmw,
      assignedUser: salesRep1,
      createdAt: dAgo(1),
    },
    {
      fullName: "Zeynep Karahan",
      phone: "0544 321 88 90",
      email: "zeynep.karahan@outlook.com",
      source: LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      budget: 1850000,
      notes: "Web sitemizdeki formdan ulaştı. Kurumsal faturalı satın alma veya filo kiralama koşullarını soruyor.",
      vehicle: audiA3,
      assignedUser: salesRep2,
      createdAt: dAgo(2),
    },
    {
      fullName: "Emre Çetin",
      phone: "0535 777 44 11",
      email: "emre.cetin@techcorp.com.tr",
      source: LeadSource.SOCIAL_MEDIA,
      status: LeadStatus.NEW,
      budget: 1650000,
      notes: "Instagram Reels videosunda TOGG'u görmüş. Evde şarj istasyonu desteği ve gerçek kış menzilini merak ediyor.",
      vehicle: togg,
      assignedUser: defaultUser,
      createdAt: dAgo(2),
    },
    {
      fullName: "Seda Güler",
      phone: "0555 890 12 34",
      email: "seda.guler@hotmail.com",
      source: LeadSource.ARABAM,
      status: LeadStatus.NEW,
      budget: 2700000,
      notes: "Arabam.com'dan fiyat teklifi talep etti. Cam tavan ve AMG paket şartı var.",
      vehicle: merc,
      assignedUser: salesRep1,
      createdAt: dAgo(3),
    },
    {
      fullName: "Volkan Koç",
      phone: "0530 654 32 10",
      email: "volkan@koctekstil.com",
      source: LeadSource.PHONE,
      status: LeadStatus.NEW,
      budget: 1150000,
      notes: "Güngören tekstil atölyesi için kapalı kasa panelvan arıyor. Vadeli çek veya kısmi leasing imkanlarını sordu.",
      vehicle: transit,
      assignedUser: salesRep2,
      createdAt: dAgo(3),
    },
    {
      fullName: "Derya Şimşek",
      phone: "0542 111 22 33",
      email: "derya.simsek@gmail.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.NEW,
      budget: 1300000,
      notes: "Showroom'a uğradı, ayaküstü kartvizit bıraktı. Kırmızı renk Golf arıyor.",
      vehicle: golf,
      assignedUser: defaultUser,
      createdAt: dAgo(4),
    },
    {
      fullName: "Gökhan Aydın",
      phone: "0533 222 99 88",
      email: "gokhan.aydin@aydinlar.com.tr",
      source: LeadSource.REFERRAL,
      status: LeadStatus.NEW,
      budget: 3600000,
      notes: "Eski müşterimiz Ahmet Bey tavsiyesi ile ulaştı. Aile kullanımı için geniş lüks SUV bakıyor.",
      vehicle: audiQ5,
      assignedUser: salesRep1,
      createdAt: dAgo(4),
    },

    // -------------------------------------------------------------------------
    // 2. CONTACTED (İletişime Geçildi) - 6 Kayıt
    // -------------------------------------------------------------------------
    {
      fullName: "Murat Arslan",
      phone: "0532 444 55 66",
      email: "murat.arslan@arslanlojistik.com",
      source: LeadSource.SAHIBINDEN,
      status: LeadStatus.CONTACTED,
      budget: 2350000,
      notes: "İlk temas kuruldu. Cumartesi günü öğleden sonra aracı canlı görmeye gelecek.",
      vehicle: bmw,
      assignedUser: salesRep1,
      createdAt: dAgo(5),
    },
    {
      fullName: "Buket Yalçın",
      phone: "0535 888 11 22",
      email: "buket.yalcin@bursa.gov.tr",
      source: LeadSource.WEBSITE,
      status: LeadStatus.CONTACTED,
      budget: 1250000,
      notes: "Telefonla 18 dakika detaylı görüşüldü. Şehir içi kadın kullanımına uygunluğu ve yakıt tüketimi konuşuldu.",
      vehicle: captur,
      assignedUser: salesRep2,
      createdAt: dAgo(6),
    },
    {
      fullName: "Alişan Keskin",
      phone: "0543 555 66 77",
      email: "alisan@keskinmimarlik.com",
      source: LeadSource.PHONE,
      status: LeadStatus.CONTACTED,
      budget: 850000,
      notes: "Şantiye saha kontrolleri için hafif ticari araç bakıyor. Ekspertiz garantisi talep etti.",
      vehicle: doblo,
      assignedUser: defaultUser,
      createdAt: dAgo(7),
    },
    {
      fullName: "Ece Doğan",
      phone: "0530 999 44 33",
      email: "ece.dogan@doganhukuk.com",
      source: LeadSource.SOCIAL_MEDIA,
      status: LeadStatus.CONTACTED,
      budget: 1850000,
      notes: "WhatsApp üzerinden detaylı ekspertiz raporu ve servis bakım geçmişi gönderildi. Çok memnun kaldı.",
      vehicle: audiA3,
      assignedUser: salesRep1,
      createdAt: dAgo(8),
    },
    {
      fullName: "Koray Taner",
      phone: "0537 123 45 67",
      email: "koray.taner@tanerinsaat.com.tr",
      source: LeadSource.ARABAM,
      status: LeadStatus.CONTACTED,
      budget: 2650000,
      notes: "Takas aracının fotoğraflarını gönderdi (2019 Corolla). Fiyat değerlendirmesi bekliyor.",
      vehicle: merc,
      assignedUser: salesRep2,
      createdAt: dAgo(9),
    },
    {
      fullName: "Pınar Erdem",
      phone: "0541 789 01 23",
      email: "pinar.erdem@erdemler.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.CONTACTED,
      budget: 1300000,
      notes: "Showroomda satış danışmanımız araç başında 25 dakika detaylı sunum yaptı.",
      vehicle: golf,
      assignedUser: defaultUser,
      createdAt: dAgo(10),
    },

    // -------------------------------------------------------------------------
    // 3. TEST_DRIVE (Deneme Sürüşü) - 6 Kayıt (Tüm Test Sürüşü Durumları)
    // -------------------------------------------------------------------------
    {
      fullName: "Kaan Yıldırım",
      phone: "0532 777 88 99",
      email: "kaan.yildirim@yildirimholding.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.TEST_DRIVE,
      budget: 2650000,
      notes: "Test sürüşü tamamlandı. Sürüş konforu ve 9G-Tronic şanzıman geçişleri kusursuz bulundu.",
      vehicle: merc,
      assignedUser: salesRep1,
      createdAt: dAgo(7),
      testDrive: {
        scheduledAt: dAgo(1),
        durationMinutes: 45,
        status: TestDriveStatus.COMPLETED,
        feedbackRating: 5,
        feedbackNotes: "Araç sürüş dinamikleri, ses yalıtımı ve hızlanması çok beğenildi. Teklif hazırlanmasını istedi.",
        driverLicenseNo: "34829104829",
      },
    },
    {
      fullName: "Esen Bayrak",
      phone: "0533 333 22 11",
      email: "esen.bayrak@bayrakenerji.com",
      source: LeadSource.WEBSITE,
      status: LeadStatus.TEST_DRIVE,
      budget: 1820000,
      notes: "Test sürüşü randevusu planlandı. Eşiyle birlikte gelecek.",
      vehicle: audiA3,
      assignedUser: salesRep2,
      createdAt: dAgo(4),
      testDrive: {
        scheduledAt: dAhead(1),
        durationMinutes: 30,
        status: TestDriveStatus.SCHEDULED,
        driverLicenseNo: "22839104928",
      },
    },
    {
      fullName: "Cem Polat",
      phone: "0542 888 77 66",
      email: "cem.polat@polatyapi.com.tr",
      source: LeadSource.PHONE,
      status: LeadStatus.TEST_DRIVE,
      budget: 2350000,
      notes: "Test sürüşü yapıldı. Performans beğenildi ancak bagaj hacmi biraz sorgulandı.",
      vehicle: bmw,
      assignedUser: defaultUser,
      createdAt: dAgo(11),
      testDrive: {
        scheduledAt: dAgo(2),
        durationMinutes: 30,
        status: TestDriveStatus.COMPLETED,
        feedbackRating: 4,
        feedbackNotes: "Yol tutuş ve süspansiyon sertliği spor modda harika. Çocuk koltuğu montajı denendi.",
        driverLicenseNo: "44910294820",
      },
    },
    {
      fullName: "Tuğba Özkan",
      phone: "0530 111 55 44",
      email: "dr.tugba@ozkanklinik.com",
      source: LeadSource.REFERRAL,
      status: LeadStatus.TEST_DRIVE,
      budget: 1260000,
      notes: "Acil hastane nöbeti çıktığı için randevuyu son anda iptal etti.",
      vehicle: captur,
      assignedUser: salesRep1,
      createdAt: dAgo(12),
      testDrive: {
        scheduledAt: dAgo(3),
        durationMinutes: 30,
        status: TestDriveStatus.CANCELLED,
        feedbackNotes: "Müşteri şehir dışı ameliyat programı nedeniyle iptal etti, önümüzdeki hafta yeniden planlanacak.",
        driverLicenseNo: "18294019283",
      },
    },
    {
      fullName: "Bora Sezgin",
      phone: "0535 666 33 22",
      email: "bora@sezginturizm.com",
      source: LeadSource.ARABAM,
      status: LeadStatus.TEST_DRIVE,
      budget: 3550000,
      notes: "Randevuya katılmadı, telefonu cevap vermedi.",
      vehicle: audiQ5,
      assignedUser: salesRep2,
      createdAt: dAgo(13),
      testDrive: {
        scheduledAt: dAgo(4),
        durationMinutes: 45,
        status: TestDriveStatus.NO_SHOW,
        feedbackNotes: "Randevu saatinde gelinmedi. WhatsApp üzerinden hatırlatma bırakıldı.",
      },
    },
    {
      fullName: "İlknur Vural",
      phone: "0544 999 11 00",
      email: "ilknur.vural@vuraltasarim.com",
      source: LeadSource.SAHIBINDEN,
      status: LeadStatus.TEST_DRIVE,
      budget: 1600000,
      notes: "Hafta sonu elektrikli araç deneyimi için test sürüşü planlandı.",
      vehicle: togg,
      assignedUser: defaultUser,
      createdAt: dAgo(5),
      testDrive: {
        scheduledAt: dAhead(2),
        durationMinutes: 45,
        status: TestDriveStatus.SCHEDULED,
        driverLicenseNo: "55920194827",
      },
    },

    // -------------------------------------------------------------------------
    // 4. QUOTE_SENT (Teklif Verildi) - 6 Kayıt (Tüm Teklif Durumları)
    // -------------------------------------------------------------------------
    {
      fullName: "Tarık Bozkurt",
      phone: "0532 666 77 88",
      email: "tarik.bozkurt@bozkurtmaden.com",
      source: LeadSource.REFERRAL,
      status: LeadStatus.QUOTE_SENT,
      budget: 3500000,
      notes: "Resmi fiyat teklifi iletildi. Nakit alım için ek indirim talep ediyor.",
      vehicle: audiQ5,
      assignedUser: salesRep1,
      createdAt: dAgo(8),
      quote: {
        quoteNumber: "TKL-2026-0001",
        vehiclePrice: 3550000,
        offeredPrice: 3420000,
        discountAmount: 130000,
        paymentType: "Nakit / Banka Havalesi",
        validUntil: dAhead(5),
        status: QuoteStatus.SENT,
        terms: "Tescil ve noter masrafları alıcıya aittir. 5 gün süreyle fiyat garantilidir.",
        notes: "Müşteri özel plaka ve kış lastiği hediyesi talep etti.",
      },
    },
    {
      fullName: "Füsun Çakır",
      phone: "0533 111 99 22",
      email: "fusun.cakir@cakirmimarlik.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.QUOTE_SENT,
      budget: 2300000,
      notes: "Taşıt kredisi destekli teklif mektubu gönderildi.",
      vehicle: bmw,
      assignedUser: salesRep2,
      createdAt: dAgo(9),
      quote: {
        quoteNumber: "TKL-2026-0002",
        vehiclePrice: 2350000,
        offeredPrice: 2280000,
        discountAmount: 70000,
        paymentType: "1.000.000 TL Nakit + 1.280.000 TL Taşıt Kredisi",
        validUntil: dAhead(7),
        status: QuoteStatus.SENT,
        terms: "Garanti BBVA 24 ay %2.89 taşıt kredisi ile hesaplandı.",
      },
    },
    {
      fullName: "Hakan Uysal",
      phone: "0542 333 44 55",
      email: "hakan@uysalinsaat.com.tr",
      source: LeadSource.WEBSITE,
      status: LeadStatus.QUOTE_SENT,
      budget: 1250000,
      notes: "Taslak teklif hazırlandı, yönetici onayı bekleniyor.",
      vehicle: golf,
      assignedUser: defaultUser,
      createdAt: dAgo(10),
      quote: {
        quoteNumber: "TKL-2026-0003",
        vehiclePrice: 1280000,
        offeredPrice: 1245000,
        discountAmount: 35000,
        paymentType: "Takas + Nakit",
        validUntil: dAhead(10),
        status: QuoteStatus.DRAFT,
        terms: "Takas aracı için TSE ekspertiz raporu şartı aranmaktadır.",
      },
    },
    {
      fullName: "Sinem Eren",
      phone: "0530 888 33 44",
      email: "sinem.eren@erendanismanlik.com",
      source: LeadSource.ARABAM,
      status: LeadStatus.QUOTE_SENT,
      budget: 1800000,
      notes: "Gönderilen teklif üzerinden detaylı sorular sordu. Yanıtlar verildi.",
      vehicle: audiA3,
      assignedUser: salesRep1,
      createdAt: dAgo(12),
      quote: {
        quoteNumber: "TKL-2026-0004",
        vehiclePrice: 1820000,
        offeredPrice: 1770000,
        discountAmount: 50000,
        paymentType: "Nakit",
        validUntil: dAhead(3),
        status: QuoteStatus.SENT,
        terms: "Peşin ödemede kasko hediye kampanyası dahil edildi.",
      },
    },
    {
      fullName: "Metin Karaca",
      phone: "0535 222 11 00",
      email: "metin@karacalojistik.com.tr",
      source: LeadSource.SAHIBINDEN,
      status: LeadStatus.QUOTE_SENT,
      budget: 1100000,
      notes: "Teklif geçerlilik süresi doldu. Yenileme teklifi hazırlanacak.",
      vehicle: transit,
      assignedUser: salesRep2,
      createdAt: dAgo(20),
      quote: {
        quoteNumber: "TKL-2026-0005",
        vehiclePrice: 1100000,
        offeredPrice: 1060000,
        discountAmount: 40000,
        paymentType: "Nakit",
        validUntil: dAgo(2),
        status: QuoteStatus.EXPIRED,
        terms: "Teklif süresi 15 gün olarak verilmişti.",
      },
    },
    {
      fullName: "Yasemin Tezel",
      phone: "0543 444 99 88",
      email: "yasemin.tezel@tezelkimya.com",
      source: LeadSource.PHONE,
      status: LeadStatus.QUOTE_SENT,
      budget: 1250000,
      notes: "Kısmi vadeli ödeme planı teklif edildi.",
      vehicle: captur,
      assignedUser: defaultUser,
      createdAt: dAgo(14),
      quote: {
        quoteNumber: "TKL-2026-0006",
        vehiclePrice: 1260000,
        offeredPrice: 1215000,
        discountAmount: 45000,
        paymentType: "600.000 TL Peşin + 3 Ay Vadeli Senet",
        validUntil: dAhead(4),
        status: QuoteStatus.SENT,
        terms: "Senet ödemelerinde kefil şartı aranmaktadır.",
      },
    },

    // -------------------------------------------------------------------------
    // 5. NEGOTIATION (Pazarlık / Karar Aşaması) - 5 Kayıt
    // -------------------------------------------------------------------------
    {
      fullName: "Barış Alkan",
      phone: "0532 555 99 11",
      email: "baris.alkan@alkangrup.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.NEGOTIATION,
      budget: 2600000,
      notes: "Müşteri 2.550.000 TL nakit teklif etti. Genel müdür onayında bekliyor.",
      vehicle: merc,
      assignedUser: salesRep1,
      createdAt: dAgo(15),
      quote: {
        quoteNumber: "TKL-2026-0007",
        vehiclePrice: 2650000,
        offeredPrice: 2570000,
        discountAmount: 80000,
        paymentType: "Nakit / Tek Çekim",
        validUntil: dAhead(2),
        status: QuoteStatus.SENT,
      },
    },
    {
      fullName: "Nihal Güneş",
      phone: "0533 777 00 22",
      email: "nihal@gunestasarim.com",
      source: LeadSource.REFERRAL,
      status: LeadStatus.NEGOTIATION,
      budget: 2300000,
      notes: "Kendi 2021 model BMW 320i aracını takasa saydırmak istiyor. Ekspertiz farkı üzerinde müzakere sürüyor.",
      vehicle: bmw,
      assignedUser: salesRep2,
      createdAt: dAgo(16),
    },
    {
      fullName: "Serdar Yurt",
      phone: "0541 222 88 44",
      email: "serdar.yurt@yurtlojistik.com",
      source: LeadSource.PHONE,
      status: LeadStatus.NEGOTIATION,
      budget: 1600000,
      notes: "Banka kredi ön onayı çıktı. Kasko ve tescil masraflarını bizim karşılamamızı şart koşuyor.",
      vehicle: togg,
      assignedUser: defaultUser,
      createdAt: dAgo(17),
    },
    {
      fullName: "Aslıhan Başar",
      phone: "0530 444 11 99",
      email: "aslihan@basarhukuk.com",
      source: LeadSource.SAHIBINDEN,
      status: LeadStatus.NEGOTIATION,
      budget: 1800000,
      notes: "Audi A3 ile BMW 1 serisi arasında kaldı. Fiyatı 1.750.000 TL'ye çekersek hemen imzalayacağını söyledi.",
      vehicle: audiA3,
      assignedUser: salesRep1,
      createdAt: dAgo(18),
    },
    {
      fullName: "Önder Kaplan",
      phone: "0535 999 55 66",
      email: "onder@kaplanambalaj.com.tr",
      source: LeadSource.ARABAM,
      status: LeadStatus.NEGOTIATION,
      budget: 820000,
      notes: "Kolektif şirket adına alım yapacak. KDV iade avantajı ve vadeli çek koşulları görüşülüyor.",
      vehicle: doblo,
      assignedUser: salesRep2,
      createdAt: dAgo(19),
    },

    // -------------------------------------------------------------------------
    // 6. CONVERTED (Kazanıldı / Cari Müşteriye Dönüştü) - 5 Kayıt
    // -------------------------------------------------------------------------
    {
      fullName: "Ahmet Yılmaz",
      phone: "05321112233",
      email: "ahmet.yilmaz@gmail.com",
      source: LeadSource.REFERRAL,
      status: LeadStatus.CONVERTED,
      budget: 3500000,
      notes: "Satış sözleşmesi imzalandı, noter devri ve tescil tamamlandı. Müşteri cari kartı açıldı.",
      vehicle: audiQ5,
      assignedUser: salesRep1,
      createdAt: dAgo(30),
      convertedAt: dAgo(2),
      accountName: "Ahmet Yılmaz",
      quote: {
        quoteNumber: "TKL-2026-0008",
        vehiclePrice: 3550000,
        offeredPrice: 3450000,
        discountAmount: 100000,
        paymentType: "Nakit",
        validUntil: dAgo(2),
        status: QuoteStatus.ACCEPTED,
      },
    },
    {
      fullName: "Mehmet Demir",
      phone: "05334445566",
      email: "mehmet.demir@hotmail.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.CONVERTED,
      budget: 2350000,
      notes: "Araç satışı gerçekleşti. Kasa tahsilatı yapıldı ve fatura düzenlendi.",
      vehicle: bmw,
      assignedUser: salesRep2,
      createdAt: dAgo(35),
      convertedAt: dAgo(5),
      accountName: "Mehmet Demir",
      quote: {
        quoteNumber: "TKL-2026-0009",
        vehiclePrice: 2350000,
        offeredPrice: 2300000,
        discountAmount: 50000,
        paymentType: "Taşıt Kredisi + Nakit",
        validUntil: dAgo(5),
        status: QuoteStatus.ACCEPTED,
      },
    },
    {
      fullName: "Ayşe Kaya",
      phone: "05357778899",
      email: "ayse.kaya@yahoo.com",
      source: LeadSource.WEBSITE,
      status: LeadStatus.CONVERTED,
      budget: 1280000,
      notes: "Satış başarılı. Anahtar teslim töreni yapıldı.",
      vehicle: golf,
      assignedUser: defaultUser,
      createdAt: dAgo(40),
      convertedAt: dAgo(8),
      accountName: "Ayşe Kaya",
      quote: {
        quoteNumber: "TKL-2026-0010",
        vehiclePrice: 1280000,
        offeredPrice: 1260000,
        discountAmount: 20000,
        paymentType: "Nakit",
        validUntil: dAgo(8),
        status: QuoteStatus.ACCEPTED,
      },
    },
    {
      fullName: "Burak Kaya",
      phone: "05325551234",
      email: "burak.kaya@gmail.com",
      source: LeadSource.PHONE,
      status: LeadStatus.CONVERTED,
      budget: 1600000,
      notes: "TOGG T10X satışı tamamlandı. Şarj kartı hediye edildi.",
      vehicle: togg,
      assignedUser: salesRep1,
      createdAt: dAgo(45),
      convertedAt: dAgo(12),
      accountName: "Burak Kaya",
      quote: {
        quoteNumber: "TKL-2026-0011",
        vehiclePrice: 1600000,
        offeredPrice: 1580000,
        discountAmount: 20000,
        paymentType: "Nakit",
        validUntil: dAgo(12),
        status: QuoteStatus.ACCEPTED,
      },
    },
    {
      fullName: "Selin Çelik",
      phone: "05423332211",
      email: "selin.celik@celikgrup.com",
      source: LeadSource.SOCIAL_MEDIA,
      status: LeadStatus.CONVERTED,
      budget: 1260000,
      notes: "Renault Captur satışı tescil edildi. Kasko poliçesi teslim edildi.",
      vehicle: captur,
      assignedUser: salesRep2,
      createdAt: dAgo(50),
      convertedAt: dAgo(15),
      accountName: "Selin Çelik",
      quote: {
        quoteNumber: "TKL-2026-0012",
        vehiclePrice: 1260000,
        offeredPrice: 1235000,
        discountAmount: 25000,
        paymentType: "Kredi Kartı 12 Taksit",
        validUntil: dAgo(15),
        status: QuoteStatus.ACCEPTED,
      },
    },

    // -------------------------------------------------------------------------
    // 7. LOST (Kaybedildi) - 6 Kayıt (Tüm Kaybedilme Nedenleri)
    // -------------------------------------------------------------------------
    {
      fullName: "Cihan Kılıç",
      phone: "0533 888 22 11",
      email: "cihan.kilic@kilicoto.com",
      source: LeadSource.SAHIBINDEN,
      status: LeadStatus.LOST,
      budget: 2200000,
      notes: "Mercedes C200 için bütçesi yetmedi.",
      lostReason: "Fiyat yüksek bulundu, bütçesini 350.000 TL aştı.",
      vehicle: merc,
      assignedUser: salesRep1,
      createdAt: dAgo(22),
    },
    {
      fullName: "Melis Tan",
      phone: "0532 999 00 33",
      email: "melis.tan@tanmimarlik.com",
      source: LeadSource.ARABAM,
      status: LeadStatus.LOST,
      budget: 1750000,
      notes: "Başka bayiden alım yaptı.",
      lostReason: "Rakip galeriden daha düşük kilometreli alternatif araç satın aldı.",
      vehicle: audiA3,
      assignedUser: salesRep2,
      createdAt: dAgo(23),
    },
    {
      fullName: "Okan Varol",
      phone: "0544 111 44 77",
      email: "okan@varolnakliyat.com.tr",
      source: LeadSource.WEBSITE,
      status: LeadStatus.LOST,
      budget: 1050000,
      notes: "Kredi reddi nedeniyle süreç sonlandı.",
      lostReason: "Banka ticari taşıt kredisi talebini sicil sebebiyle onaylamadı.",
      vehicle: transit,
      assignedUser: defaultUser,
      createdAt: dAgo(24),
    },
    {
      fullName: "Bahar Özdemir",
      phone: "0530 555 88 22",
      email: "bahar.ozdemir@ozdemirlab.com",
      source: LeadSource.PHONE,
      status: LeadStatus.LOST,
      budget: 1600000,
      notes: "Renk konusunda anlaşamadık.",
      lostReason: "Müşteri kesinlikle beyaz renk istiyordu, stoktaki araç füme renkti.",
      vehicle: togg,
      assignedUser: salesRep1,
      createdAt: dAgo(25),
    },
    {
      fullName: "Erhan Demircan",
      phone: "0535 333 99 00",
      email: "erhan@demircanholding.com",
      source: LeadSource.WALK_IN,
      status: LeadStatus.LOST,
      budget: 2300000,
      notes: "Yatırım kararını erteledi.",
      lostReason: "Şirket bütçe revizyonu ve faiz oranları nedeniyle alımı 2027 başına erteledi.",
      vehicle: bmw,
      assignedUser: salesRep2,
      createdAt: dAgo(26),
    },
    {
      fullName: "Sevgi Kurt",
      phone: "0541 666 55 44",
      email: "sevgi.kurt@kurtkirtasiye.com",
      source: LeadSource.OTHER,
      status: LeadStatus.LOST,
      budget: 800000,
      notes: "Takas fiyatında uzlaşılamadı.",
      lostReason: "Takasa getirdiği 2012 model araca verilen takas bedelini düşük buldu.",
      vehicle: doblo,
      assignedUser: defaultUser,
      createdAt: dAgo(27),
    },
  ];

  let createdCount = 0;
  let testDriveCount = 0;
  let quoteCount = 0;
  let activityCount = 0;

  for (const item of LEADS_DATA) {
    const acc = item.accountName ? accounts.find((a) => a.name.includes(item.accountName)) : null;

    const lead = await prisma.lead.create({
      data: {
        companyId,
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        source: item.source,
        status: item.status,
        budget: item.budget,
        notes: item.notes,
        lostReason: item.lostReason,
        assignedUserId: item.assignedUser?.id || defaultUser?.id,
        convertedAccountId: acc?.id,
        convertedAt: item.convertedAt,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
        interestedVehicles: item.vehicle?.id
          ? {
              create: [
                {
                  vehicleId: item.vehicle.id,
                  notes: `${item.vehicle.brandName} ${item.modelName || item.vehicle.modelName} aracı ile ilgileniyor.`,
                },
              ],
            }
          : undefined,
      },
    });
    createdCount++;

    // Test Sürüşü oluştur
    if (item.testDrive && item.vehicle?.id) {
      await prisma.leadTestDrive.create({
        data: {
          companyId,
          leadId: lead.id,
          vehicleId: item.vehicle.id,
          scheduledAt: item.testDrive.scheduledAt,
          durationMinutes: item.testDrive.durationMinutes || 30,
          driverLicenseNo: item.testDrive.driverLicenseNo,
          status: item.testDrive.status,
          assignedUserId: item.assignedUser?.id,
          feedbackRating: item.testDrive.feedbackRating,
          feedbackNotes: item.testDrive.feedbackNotes,
          createdAt: item.createdAt,
        },
      });
      testDriveCount++;
    }

    // Teklif oluştur
    if (item.quote && item.vehicle?.id) {
      await prisma.leadQuote.create({
        data: {
          companyId,
          leadId: lead.id,
          vehicleId: item.vehicle.id,
          quoteNumber: item.quote.quoteNumber,
          vehiclePrice: item.quote.vehiclePrice,
          offeredPrice: item.quote.offeredPrice,
          discountAmount: item.quote.discountAmount || 0,
          paymentType: item.quote.paymentType,
          validUntil: item.quote.validUntil,
          status: item.quote.status,
          terms: item.quote.terms,
          createdAt: item.createdAt,
        },
      });
      quoteCount++;
    }

    // Zengin Zaman Çizelgesi Aktiviteleri (Aramalar, Toplantılar, Notlar)
    const activitiesToCreate = [
      {
        leadId: lead.id,
        userId: item.assignedUser?.id,
        userName: item.assignedUser?.name || "Satış Danışmanı",
        type: "NOTE",
        title: "Potansiyel Müşteri Kaydı",
        content: `${item.source} kaynağından potansiyel müşteri kaydı sisteme alındı.`,
        createdAt: item.createdAt,
      },
    ];

    if (item.status !== LeadStatus.NEW) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: item.assignedUser?.id,
        userName: item.assignedUser?.name || "Satış Danışmanı",
        type: "CALL",
        title: "Telefon Görüşmesi",
        content: `Müşteri ile telefon görüşmesi gerçekleştirildi. İhtiyaç analizi ve araç detayları paylaşıldı.`,
        createdAt: new Date(item.createdAt.getTime() + 1000 * 60 * 60 * 4),
      });
    }

    if (item.testDrive) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: item.assignedUser?.id,
        userName: item.assignedUser?.name || "Satış Danışmanı",
        type: "TEST_DRIVE",
        title: `Deneme Sürüşü: ${item.testDrive.status}`,
        content: item.testDrive.feedbackNotes || `${item.vehicle?.brandName} ${item.vehicle?.modelName} test sürüşü organize edildi.`,
        createdAt: item.testDrive.scheduledAt,
      });
    }

    if (item.quote) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: item.assignedUser?.id,
        userName: item.assignedUser?.name || "Satış Danışmanı",
        type: "QUOTE",
        title: `Resmi Fiyat Teklifi: ${item.quote.quoteNumber}`,
        content: `${item.quote.offeredPrice.toLocaleString("tr-TR")} TL tutarında teklif mektubu iletildi. Durum: ${item.quote.status}`,
        createdAt: new Date(item.createdAt.getTime() + 1000 * 60 * 60 * 24),
      });
    }

    if (item.status === LeadStatus.CONVERTED) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: item.assignedUser?.id,
        userName: item.assignedUser?.name || "Satış Danışmanı",
        type: "CONVERTED",
        title: "Satış Başarıyla Tamamlandı (Cari Açıldı)",
        content: `Müşteri başarıyla resmi cari müşteriye dönüştürüldü ve araç tescil işlemleri tamamlandı.`,
        createdAt: item.convertedAt || now,
      });
    }

    if (item.status === LeadStatus.LOST) {
      activitiesToCreate.push({
        leadId: lead.id,
        userId: item.assignedUser?.id,
        userName: item.assignedUser?.name || "Satış Danışmanı",
        type: "STATUS_CHANGE",
        title: "Fırsat Kaybedildi Olarak İşaretlendi",
        content: `Neden: ${item.lostReason}`,
        createdAt: new Date(item.createdAt.getTime() + 1000 * 60 * 60 * 48),
      });
    }

    for (const act of activitiesToCreate) {
      await prisma.leadActivity.create({ data: act });
      activityCount++;
    }
  }

  console.log(
    `  ✓ ${companyName}: ${createdCount} Potansiyel (Lead), ${testDriveCount} Test Sürüşü, ${quoteCount} Teklif, ${activityCount} Aktivite kaydı oluşturuldu.`
  );
}

async function main() {
  console.log("=== CRM SEED SCRIPTİ BAŞLATILDI ===");

  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });

  for (const comp of companies) {
    await seedCrmForCompany(comp.id, comp.name);
  }

  console.log("\n✅ Tüm şirketler için CRM verileri başarıyla oluşturuldu!");
}

if (require.main === module || process.argv[1]?.endsWith("seed-crm.ts")) {
  main()
    .catch((e) => {
      console.error("Hata:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
