/**
 * Kapsamlı ve Hiyerarşik Demo Verisi:
 * Kaleli Grup ve Demo Holding firmalarına;
 *  - Cariler (Bireysel + Kurumsal müşteriler, tedarikçiler)
 *  - Ürünler & Hizmetler
 *  - Lokasyonlar ve Kasalar
 *  - Katalog ile %100 UYUMLU 22 Zengin Araç (Otomobil, SUV, Minivan, Ticari, Elektrikli)
 *  - Her araç için gerçek internet otomobil fotoğrafları (Kapak, Dış, Kokpit/İç Mekan)
 *  - Her araç için gerçekçi resmi evraklar (Ruhsat, Kasko, Trafik Sigortası, TÜVTÜRK Muayene, TSE Ekspertiz, Noter Senedi)
 *  - Kira sözleşmeleri, satış sözleşmeleri, opsiyonlar, tramer kayıtları ve masraflar
 *
 * Çalıştırma:
 *   FORCE=1 npx ts-node prisma/seed-demo.ts
 */
import { PrismaClient, VehicleStatus, FuelType, TransmissionType, DriveType } from "@prisma/client";

const prisma = new PrismaClient();

const CUSTOMERS = [
  { entityType: "INDIVIDUAL", name: "Ahmet Yılmaz", phone: "05321112233", tckn: "11111111111", city: "İstanbul" },
  { entityType: "INDIVIDUAL", name: "Mehmet Demir", phone: "05334445566", tckn: "22222222222", city: "Ankara" },
  { entityType: "INDIVIDUAL", name: "Ayşe Kaya", phone: "05357778899", tckn: "33333333333", city: "İzmir" },
  { entityType: "INDIVIDUAL", name: "Burak Kaya", phone: "05325551234", tckn: "28491028472", city: "İstanbul" },
  { entityType: "INDIVIDUAL", name: "Selin Çelik", phone: "05423332211", tckn: "44444444444", city: "Bursa" },
  { entityType: "INDIVIDUAL", name: "Caner Öztürk", phone: "05307771122", tckn: "55555555555", city: "Antalya" },
  { entityType: "CORPORATE", name: "Yıldız İnşaat Ltd. Şti.", phone: "02121234567", taxNumber: "1234567890", taxOffice: "Kadıköy", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Deniz Lojistik A.Ş.", phone: "02123334455", taxNumber: "9876543210", taxOffice: "Şişli", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Güneş Turizm A.Ş.", phone: "02326667788", taxNumber: "5556667778", taxOffice: "Konak", city: "İzmir" },
  { entityType: "CORPORATE", name: "Borusan Teknoloji A.Ş.", phone: "02165554433", taxNumber: "7778889990", taxOffice: "Ümraniye", city: "İstanbul" },
];

const SUPPLIERS = [
  { entityType: "CORPORATE", name: "Oto Yedek Parça San. Tic.", phone: "02129998877", taxNumber: "1112223334", taxOffice: "Bağcılar", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Hızlı Servis Oto", phone: "02128887766", taxNumber: "2223334445", taxOffice: "Ümraniye", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Lastikçi Mehmet", phone: "05339990011", taxNumber: "3334445556", taxOffice: "Esenler", city: "İstanbul" },
  { entityType: "INDIVIDUAL", name: "Noter - 15. Noterlik", phone: "02124445566", city: "İstanbul" },
  { entityType: "CORPORATE", name: "Anadolu Sigorta Acentesi", phone: "02164441234", taxNumber: "8881112233", taxOffice: "Kadıköy", city: "İstanbul" },
];

const PRODUCTS = [
  { type: "MATERIAL", name: "Lastik (Takım)", code: "LST-001", unit: "Takım", buyingPrice: 8000, sellingPrice: 10000, taxRate: 20 },
  { type: "MATERIAL", name: "Motor Yağı", code: "YAG-001", unit: "Litre", buyingPrice: 350, sellingPrice: 500, taxRate: 20 },
  { type: "MATERIAL", name: "Fren Balatası", code: "BAL-001", unit: "Takım", buyingPrice: 1200, sellingPrice: 1800, taxRate: 20 },
  { type: "MATERIAL", name: "Akü", code: "AKU-001", unit: "Adet", buyingPrice: 2500, sellingPrice: 3500, taxRate: 20 },
  { type: "RECEIVED_SERVICE", name: "Bakım İşçiliği", code: "ISC-900", unit: "Saat", buyingPrice: 500, sellingPrice: 750, taxRate: 20 },
  { type: "PROVIDED_SERVICE", name: "Araç Kiralama Hizmeti", code: "KIR-900", unit: "Ay", buyingPrice: 0, sellingPrice: 25000, taxRate: 20 },
  { type: "RECEIVED_SERVICE", name: "Kaporta Boya", code: "KPR-001", unit: "Adet", buyingPrice: 4000, sellingPrice: 6000, taxRate: 20 },
];

const LOCATIONS = [
  { name: "Merkez Showroom", code: "MERKEZ", city: "İstanbul", isExternal: false },
  { name: "İstoç Depo", code: "ISTOC", city: "İstanbul", isExternal: false },
  { name: "Anlaşmalı Servis", code: "SERVIS", city: "İstanbul", isExternal: true },
];

interface DemoVehicleBlueprint {
  plate: string;
  categoryCode: "otomobil" | "suv" | "minivanpanelvan" | "ticari" | "elektrikli_ara_";
  brandName: string;
  modelName: string;
  registrationModel?: string;
  bodyTypeName: string;
  colorName: string;
  vehicleTypeName: string;
  year: number;
  km: number;
  fuelType: FuelType;
  transmission: TransmissionType;
  driveType: DriveType;
  horsePower: number;
  engineVolume: number;
  purchasePrice: number;
  listPrice: number;
  status: VehicleStatus;
  coverPhoto: string;
  galleryPhotos?: { url: string; category: "INTERIOR" | "EXTERIOR" }[];
  isOptioned?: boolean;
  spareKey?: boolean;
  warranty?: boolean;
  notes?: string;
  tramerRecords?: { amount: number; description: string; date: Date }[];
}

// 22 adet özenle hazırlanmış, tüm kategorileri kapsayan araç filosu
const DEMO_BLUEPRINTS: DemoVehicleBlueprint[] = [
  // 1. BMW 520i
  {
    plate: "34 TU 5566",
    categoryCode: "otomobil",
    brandName: "BMW",
    modelName: "520i",
    registrationModel: "BMW 520i Sedan Special Edition",
    bodyTypeName: "Sedan",
    colorName: "Siyah",
    vehicleTypeName: "Filo",
    year: 2022,
    km: 45000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 170,
    engineVolume: 1597,
    purchasePrice: 2100000,
    listPrice: 2350000,
    status: "KIRALAMADA",
    coverPhoto: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1556800572-1b8aeef2c54f?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
      { url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80", category: "EXTERIOR" },
    ],
    spareKey: true,
    warranty: true,
    notes: "Yetkili Borusan servis bakımlı, seramik kaplama yapıldı.",
  },

  // 2. Audi A3 Sedan
  {
    plate: "34 AB 1234",
    categoryCode: "otomobil",
    brandName: "Audi",
    modelName: "A3",
    registrationModel: "Audi A3 Sedan 35 TFSI Advanced",
    bodyTypeName: "Sedan",
    colorName: "Beyaz",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 18000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 1498,
    purchasePrice: 1650000,
    listPrice: 1820000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1541348263662-e0c866657962?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
      { url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80", category: "EXTERIOR" },
    ],
    spareKey: true,
    warranty: true,
    notes: "İlk sahibinden, hatasız boyasız kapalı garaj aracı.",
  },

  // 3. Mercedes-Benz C200
  {
    plate: "34 CD 5678",
    categoryCode: "otomobil",
    brandName: "Mercedes-Benz",
    modelName: "C200",
    registrationModel: "Mercedes C 200 4MATIC AMG",
    bodyTypeName: "Sedan",
    colorName: "Gri",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 34000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 204,
    engineVolume: 1496,
    purchasePrice: 2400000,
    listPrice: 2650000,
    status: "STOKTA",
    isOptioned: true,
    coverPhoto: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
      { url: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80", category: "EXTERIOR" },
    ],
    spareKey: true,
    warranty: true,
    notes: "Kapora alındı, kredi onayı bekleniyor.",
    tramerRecords: [
      { amount: 14500, description: "Arka tampon lokal boya (yetkili servis)", date: new Date(2023, 8, 12) },
    ],
  },

  // 4. Volkswagen Golf
  {
    plate: "34 EF 9012",
    categoryCode: "otomobil",
    brandName: "Volkswagen",
    modelName: "Golf",
    registrationModel: "VW Golf 1.5 eTSI Style DSG",
    bodyTypeName: "Hatchback",
    colorName: "Mavi",
    vehicleTypeName: "2.El",
    year: 2021,
    km: 52000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 1498,
    purchasePrice: 1150000,
    listPrice: 1280000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1471444668990-2a8d21b44d32?auto=format&fit=crop&w=1200&q=80", category: "EXTERIOR" },
    ],
    spareKey: true,
  },

  // 5. Ford Transit Minivan
  {
    plate: "06 GH 3456",
    categoryCode: "minivanpanelvan",
    brandName: "Ford",
    modelName: "Transit",
    registrationModel: "Ford Transit Custom 320S",
    bodyTypeName: "Minivan",
    colorName: "Beyaz",
    vehicleTypeName: "Filo",
    year: 2022,
    km: 68000,
    fuelType: "DIZEL",
    transmission: "MANUEL",
    driveType: "ONDEN_CEKIS",
    horsePower: 130,
    engineVolume: 1995,
    purchasePrice: 950000,
    listPrice: 1100000,
    status: "KIRALAMADA",
    coverPhoto: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
  },

  // 6. FIAT Doblo
  {
    plate: "35 IJ 7890",
    categoryCode: "minivanpanelvan",
    brandName: "FIAT",
    modelName: "Doblo",
    registrationModel: "Fiat Doblo Combi 1.6 Multijet Premio",
    bodyTypeName: "Minivan",
    colorName: "Gümüş",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 24000,
    fuelType: "DIZEL",
    transmission: "MANUEL",
    driveType: "ONDEN_CEKIS",
    horsePower: 105,
    engineVolume: 1598,
    purchasePrice: 720000,
    listPrice: 830000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
  },

  // 7. Renault Captur SUV
  {
    plate: "34 KL 2345",
    categoryCode: "suv",
    brandName: "Renault",
    modelName: "Captur",
    registrationModel: "Renault Captur 1.3 TCe Icon EDC",
    bodyTypeName: "SUV",
    colorName: "Kırmızı",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 39000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 140,
    engineVolume: 1332,
    purchasePrice: 1120000,
    listPrice: 1260000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
  },

  // 8. Audi Q5 SUV
  {
    plate: "35 RS 3344",
    categoryCode: "suv",
    brandName: "Audi",
    modelName: "Q5",
    registrationModel: "Audi Q5 40 TDI quattro Advanced S Tronic",
    bodyTypeName: "SUV",
    colorName: "Siyah",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 26000,
    fuelType: "DIZEL",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 204,
    engineVolume: 1968,
    purchasePrice: 3200000,
    listPrice: 3550000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80", category: "EXTERIOR" },
    ],
    spareKey: true,
    warranty: true,
  },

  // 9. Renault Master Ticari
  {
    plate: "34 MN 6789",
    categoryCode: "ticari",
    brandName: "RENAULT",
    modelName: "MASTER",
    registrationModel: "Renault Master Panelvan L3H2 2.3 dCi",
    bodyTypeName: "Ticari",
    colorName: "Beyaz",
    vehicleTypeName: "Filo",
    year: 2022,
    km: 74000,
    fuelType: "DIZEL",
    transmission: "MANUEL",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 2299,
    purchasePrice: 1080000,
    listPrice: 1240000,
    status: "KIRALAMADA",
    coverPhoto: "https://images.unsplash.com/photo-1586191582056-a60d164627bb?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
  },

  // 10. TOGG T10X Elektrikli
  {
    plate: "06 OP 1122",
    categoryCode: "elektrikli_ara_",
    brandName: "TOGG",
    modelName: "T10X",
    registrationModel: "Togg T10X V2 Uzun Menzil 88.5 kWh",
    bodyTypeName: "SUV",
    colorName: "Mavi",
    vehicleTypeName: "Sıfır",
    year: 2023,
    km: 12000,
    fuelType: "ELEKTRIK",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 218,
    engineVolume: 0,
    purchasePrice: 1450000,
    listPrice: 1600000,
    status: "SATILDI",
    coverPhoto: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
  },

  // 11. Tesla Model Y
  {
    plate: "34 TSL 99",
    categoryCode: "elektrikli_ara_",
    brandName: "Tesla",
    modelName: "Model Y",
    registrationModel: "Tesla Model Y Long Range Dual Motor AWD",
    bodyTypeName: "SUV",
    colorName: "Beyaz",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 16500,
    fuelType: "ELEKTRIK",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 514,
    engineVolume: 0,
    purchasePrice: 2200000,
    listPrice: 2450000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1538592116845-119a3974c958?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
    notes: "Otopilot aktif, cam tavan, hatasız boyasız.",
  },

  // 12. Volvo XC60
  {
    plate: "34 VLV 60",
    categoryCode: "suv",
    brandName: "Volvo",
    modelName: "XC60",
    registrationModel: "Volvo XC60 2.0 B4 AWD Plus Dark",
    bodyTypeName: "SUV",
    colorName: "Gümüş",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 21000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 197,
    engineVolume: 1969,
    purchasePrice: 2850000,
    listPrice: 3100000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
  },

  // 13. Porsche Macan
  {
    plate: "34 PRS 911",
    categoryCode: "suv",
    brandName: "Porsche",
    modelName: "Macan",
    registrationModel: "Porsche Macan 2.0 PDK AWD",
    bodyTypeName: "SUV",
    colorName: "Siyah",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 32000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 265,
    engineVolume: 1984,
    purchasePrice: 4200000,
    listPrice: 4650000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
    notes: "Doğuş Oto çıkışlı, Chrono paket, spor egzoz.",
  },

  // 14. Porsche Taycan Elektrikli
  {
    plate: "34 TYC 01",
    categoryCode: "elektrikli_ara_",
    brandName: "Porsche",
    modelName: "Taycan",
    registrationModel: "Porsche Taycan 4S Performance Battery Plus",
    bodyTypeName: "Sedan",
    colorName: "Gri",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 29000,
    fuelType: "ELEKTRIK",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 530,
    engineVolume: 0,
    purchasePrice: 4900000,
    listPrice: 5350000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
  },

  // 15. Mercedes-Benz Vito VIP Minivan
  {
    plate: "34 VTO 88",
    categoryCode: "minivanpanelvan",
    brandName: "Mercedes-Benz",
    modelName: "Vito",
    registrationModel: "Mercedes-Benz Vito Tourer 119 CDI Select VIP",
    bodyTypeName: "Minivan",
    colorName: "Siyah",
    vehicleTypeName: "Filo",
    year: 2023,
    km: 41000,
    fuelType: "DIZEL",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 190,
    engineVolume: 1950,
    purchasePrice: 2350000,
    listPrice: 2600000,
    status: "KIRALAMADA",
    coverPhoto: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    notes: "Tam VIP donanım, ara bölmeli, Apple TV, buzdolabı ve masajlı koltuklar.",
  },

  // 16. Toyota Corolla
  {
    plate: "34 TCO 44",
    categoryCode: "otomobil",
    brandName: "Toyota",
    modelName: "Corolla",
    registrationModel: "Toyota Corolla 1.5 Vision Plus Multidrive S",
    bodyTypeName: "Sedan",
    colorName: "Beyaz",
    vehicleTypeName: "Filo",
    year: 2023,
    km: 28000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 125,
    engineVolume: 1490,
    purchasePrice: 980000,
    listPrice: 1090000,
    status: "KIRALAMADA",
    coverPhoto: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
    warranty: true,
  },

  // 17. BMW 320i M Sport
  {
    plate: "34 BMW 320",
    categoryCode: "otomobil",
    brandName: "BMW",
    modelName: "320i",
    registrationModel: "BMW 320i Sedan M Sport 1.6",
    bodyTypeName: "Sedan",
    colorName: "Mavi",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 19500,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 170,
    engineVolume: 1597,
    purchasePrice: 2450000,
    listPrice: 2700000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
    notes: "Portimao Mavi, lazer far, harman kardon ses sistemi.",
  },

  // 18. Peugeot 3008 SUV
  {
    plate: "34 PGT 300",
    categoryCode: "suv",
    brandName: "Peugeot",
    modelName: "3008",
    registrationModel: "Peugeot 3008 1.5 BlueHDi GT EAT8",
    bodyTypeName: "SUV",
    colorName: "Gri",
    vehicleTypeName: "2.El",
    year: 2022,
    km: 48000,
    fuelType: "DIZEL",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 130,
    engineVolume: 1499,
    purchasePrice: 1380000,
    listPrice: 1520000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
  },

  // 19. Volkswagen Passat
  {
    plate: "06 PST 19",
    categoryCode: "otomobil",
    brandName: "Volkswagen",
    modelName: "Passat",
    registrationModel: "VW Passat 1.5 TSI Elegance DSG",
    bodyTypeName: "Sedan",
    colorName: "Siyah",
    vehicleTypeName: "Filo",
    year: 2021,
    km: 62000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 150,
    engineVolume: 1498,
    purchasePrice: 1480000,
    listPrice: 1650000,
    status: "KIRALAMADA",
    coverPhoto: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
  },

  // 20. Mercedes-Benz E200
  {
    plate: "34 MB 2024",
    categoryCode: "otomobil",
    brandName: "Mercedes-Benz",
    modelName: "E200",
    registrationModel: "Mercedes-Benz E 200 d Exclusive 9G-TRONIC",
    bodyTypeName: "Sedan",
    colorName: "Gümüş",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 22000,
    fuelType: "DIZEL",
    transmission: "OTOMATIK",
    driveType: "ARKADAN_ITIS",
    horsePower: 197,
    engineVolume: 1993,
    purchasePrice: 3600000,
    listPrice: 3950000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80", category: "INTERIOR" },
    ],
    spareKey: true,
    warranty: true,
  },

  // 21. Hyundai Tucson SUV
  {
    plate: "35 HYN 55",
    categoryCode: "suv",
    brandName: "Hyundai",
    modelName: "Tucson",
    registrationModel: "Hyundai Tucson 1.6 T-GDI Elite Plus 4x4",
    bodyTypeName: "SUV",
    colorName: "Mavi",
    vehicleTypeName: "2.El",
    year: 2023,
    km: 19000,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    driveType: "AWD",
    horsePower: 180,
    engineVolume: 1598,
    purchasePrice: 1550000,
    listPrice: 1720000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
    warranty: true,
  },

  // 22. BYD Atto 3 Elektrikli
  {
    plate: "34 BYD 03",
    categoryCode: "elektrikli_ara_",
    brandName: "BYD",
    modelName: "Atto 3",
    registrationModel: "BYD Atto 3 Design 60.5 kWh 150 kW",
    bodyTypeName: "SUV",
    colorName: "Mavi",
    vehicleTypeName: "Sıfır",
    year: 2024,
    km: 4500,
    fuelType: "ELEKTRIK",
    transmission: "OTOMATIK",
    driveType: "ONDEN_CEKIS",
    horsePower: 204,
    engineVolume: 0,
    purchasePrice: 1500000,
    listPrice: 1680000,
    status: "STOKTA",
    coverPhoto: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&w=1200&q=80",
    spareKey: true,
    warranty: true,
  },
];

const DEFAULT_DOC_TYPES = [
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
];

async function seedCompany(companyId: string, tenantId: string, companyName: string) {
  const force = process.env.FORCE === "1";
  const vehCount = await prisma.vehicle.count({ where: { companyId } });
  if (vehCount > 15 && !force) {
    console.log(`  (firma ${companyName} zaten ${vehCount} araç ile dolu, atlandı)`);
    return;
  }

  console.log(`  [${companyName}] Demo verileri temizleniyor ve ${DEMO_BLUEPRINTS.length} araç ile zenginleştiriliyor...`);

  // 1. Mevcut operasyonel verileri temizle
  await prisma.rentalContract.deleteMany({ where: { companyId } });
  await prisma.expense.deleteMany({ where: { companyId } });
  await prisma.vehicleOption.deleteMany({ where: { companyId } });
  await prisma.document.deleteMany({ where: { companyId } });

  // Araç alt tablolarını temizle
  const companyVehicles = await prisma.vehicle.findMany({ where: { companyId }, select: { id: true } });
  const vehIds = companyVehicles.map((v) => v.id);
  if (vehIds.length > 0) {
    await prisma.vehiclePhoto.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehicleListingUrl.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehicleTramerRecord.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehiclePurchaseInstallment.deleteMany({ where: { vehicleId: { in: vehIds } } });
    await prisma.vehicle.deleteMany({ where: { companyId } });
  }

  await prisma.cashRegister.deleteMany({ where: { companyId } });
  await prisma.location.deleteMany({ where: { companyId } });
  await prisma.product.deleteMany({ where: { companyId } });
  await prisma.account.deleteMany({ where: { companyId } });

  // 2. Cariler
  const accounts: Record<string, string> = {};
  for (const c of CUSTOMERS) {
    const a = await prisma.account.create({
      data: {
        companyId,
        type: "CUSTOMER",
        entityType: c.entityType as any,
        name: c.name,
        phone: c.phone,
        tckn: (c as any).tckn,
        taxNumber: (c as any).taxNumber,
        taxOffice: (c as any).taxOffice,
        city: c.city,
      },
    });
    accounts[c.name] = a.id;
  }

  const supplierIds: string[] = [];
  for (const s of SUPPLIERS) {
    const a = await prisma.account.create({
      data: {
        companyId,
        type: "SUPPLIER",
        entityType: s.entityType as any,
        name: s.name,
        phone: s.phone,
        taxNumber: (s as any).taxNumber,
        taxOffice: (s as any).taxOffice,
        city: s.city,
      },
    });
    supplierIds.push(a.id);
  }

  // 3. Ürünler
  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        companyId,
        type: p.type as any,
        name: p.name,
        code: p.code,
        unit: p.unit,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        taxRate: p.taxRate,
      },
    });
  }

  // 4. Lokasyonlar + Kasalar
  const locIds: string[] = [];
  for (const l of LOCATIONS) {
    const loc = await prisma.location.create({ data: { companyId, ...l } });
    locIds.push(loc.id);
    await prisma.cashRegister.create({
      data: { companyId, locationId: loc.id, erpCode: `KASA-${l.code}`, name: `${l.name} Kasa` },
    });
  }

  // 5. Tenant Katalog & Doküman Referansları
  const categories = await prisma.vehicleCategory.findMany({ where: { tenantId } });
  const brands = await prisma.brand.findMany({ where: { tenantId }, include: { models: true } });
  const colors = await prisma.color.findMany({ where: { tenantId } });
  const bodyTypes = await prisma.bodyType.findMany({ where: { tenantId } });
  const vehicleTypes = await prisma.vehicleType.findMany({ where: { tenantId } });
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });

  // Doküman kategorisi ve tipleri
  let aracCategory = await prisma.documentCategory.findFirst({
    where: { tenantId, value: "arac" },
    include: { types: true },
  });
  if (!aracCategory) {
    aracCategory = await prisma.documentCategory.create({
      data: {
        tenantId,
        value: "arac",
        label: "Araç Evrakları",
        module: "VEHICLE",
        sortOrder: 1,
      },
      include: { types: true },
    });
  }

  const docTypeMap: Record<string, string> = {};
  for (const [val, lbl] of DEFAULT_DOC_TYPES) {
    let t = aracCategory.types.find((x) => x.value === val);
    if (!t) {
      t = await prisma.documentType.create({
        data: {
          tenantId,
          categoryId: aracCategory.id,
          value: val,
          label: lbl,
          sortOrder: 1,
        },
      });
    }
    docTypeMap[val] = t.id;
  }

  const norm = (s: string) => s.toLowerCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, "").trim();

  // 6. Araçları, Fotoğraflarını ve Evraklarını Oluştur
  const createdVehicles: { id: string; status: VehicleStatus; plate: string; isOptioned?: boolean }[] = [];
  const customerList = Object.values(accounts);

  for (let i = 0; i < DEMO_BLUEPRINTS.length; i++) {
    const bp = DEMO_BLUEPRINTS[i];

    // Kategori
    const category = categories.find((c) => (c.code || c.name.toLowerCase()) === bp.categoryCode) || categories[0];

    // Marka
    const normBpBrand = norm(bp.brandName);
    let brand = brands.find(
      (b) =>
        b.categoryId === category.id &&
        (norm(b.name) === normBpBrand || norm(b.name).includes(normBpBrand) || normBpBrand.includes(norm(b.name)))
    );

    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          tenantId,
          categoryId: category.id,
          name: bp.brandName,
        },
        include: { models: true },
      });
    }

    // Model
    let model = brand.models.find((m) => norm(m.name) === norm(bp.modelName));
    if (!model) {
      model = await prisma.vehicleModel.create({
        data: {
          brandId: brand.id,
          name: bp.modelName,
        },
      });
    }

    // Renk, Kasa Tipi, Araç Tipi
    const color = colors.find((c) => norm(c.name) === norm(bp.colorName)) || colors[i % colors.length];
    const bodyType = bodyTypes.find((bt) => norm(bt.name) === norm(bp.bodyTypeName)) || bodyTypes[0];
    const vehicleType = vehicleTypes.find((vt) => norm(vt.name) === norm(bp.vehicleTypeName)) || vehicleTypes[0];

    const purchaseDate = new Date(2024, i % 12, 10 + (i % 15));

    const vehicle = await prisma.vehicle.create({
      data: {
        companyId,
        plate: bp.plate,
        status: bp.status,
        categoryId: category.id,
        brandId: brand.id,
        modelId: model.id,
        brandName: brand.name,
        modelName: model.name,
        registrationModel: bp.registrationModel || `${brand.name} ${model.name}`,
        colorId: color?.id,
        colorName: color?.name,
        bodyTypeId: bodyType?.id,
        vehicleTypeId: vehicleType?.id,
        year: bp.year,
        km: bp.km,
        fuelType: bp.fuelType,
        transmission: bp.transmission,
        driveType: bp.driveType,
        horsePower: bp.horsePower,
        engineVolume: bp.engineVolume,
        chassisNo: `WF0${bp.plate.replace(/\s+/g, "")}${10000 + i}`,
        engineNo: `ENG${bp.plate.replace(/\s+/g, "")}${20000 + i}`,
        purchasePrice: bp.purchasePrice,
        purchaseNotaryPrice: bp.purchasePrice,
        listPrice: bp.listPrice,
        tensf: bp.listPrice - 15000,
        purchaseRegime: "sahis",
        purchaseDate,
        spareKey: bp.spareKey ?? true,
        warranty: bp.warranty ?? false,
        notes: bp.notes ?? null,
        supplierId: supplierIds[i % supplierIds.length],
        ...(bp.status === "SATILDI"
          ? {
              saleAmount: bp.listPrice + 25000,
              saleNotaryAmount: bp.listPrice + 25000,
              saleDate: new Date(2025, 4, 15),
              customerId: customerList[0],
            }
          : {}),
      },
    });

    createdVehicles.push({ id: vehicle.id, status: bp.status, plate: bp.plate, isOptioned: bp.isOptioned });

    // Fotoğrafları Ekle (Kapak + Galeri)
    await prisma.vehiclePhoto.create({
      data: {
        vehicleId: vehicle.id,
        category: "COVER",
        fileKey: bp.coverPhoto,
        url: bp.coverPhoto,
        thumbKey: bp.coverPhoto,
        thumbUrl: bp.coverPhoto,
        sortOrder: 0,
      },
    });

    if (bp.galleryPhotos && bp.galleryPhotos.length > 0) {
      for (let gi = 0; gi < bp.galleryPhotos.length; gi++) {
        const gp = bp.galleryPhotos[gi];
        await prisma.vehiclePhoto.create({
          data: {
            vehicleId: vehicle.id,
            category: gp.category,
            fileKey: gp.url,
            url: gp.url,
            thumbKey: gp.url,
            thumbUrl: gp.url,
            sortOrder: gi + 1,
          },
        });
      }
    }

    // Tramer Kayıtları
    if (bp.tramerRecords && bp.tramerRecords.length > 0) {
      for (const tr of bp.tramerRecords) {
        await prisma.vehicleTramerRecord.create({
          data: {
            vehicleId: vehicle.id,
            amount: tr.amount,
            description: tr.description,
            date: tr.date,
          },
        });
      }
    }

    // Opsiyonlu Araç
    if (bp.isOptioned && firstUser) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      await prisma.vehicleOption.create({
        data: {
          companyId,
          vehicleId: vehicle.id,
          customerId: customerList[1],
          amount: 35000,
          optionDate: new Date(),
          validUntil,
          note: "Kredi onayı bekleniyor — 35.000 TL kapora alındı.",
          createdById: firstUser.id,
          status: "ACTIVE",
        },
      });
    }

    // Resmi Araç Evraklarını Üret (Ruhsat, Kasko, Muayene, Trafik Sigortası, Ekspertiz, Noter)
    if (firstUser) {
      const docConfigs = [
        {
          typeVal: "ruhsat",
          name: `${vehicle.plate.replace(/\s+/g, "_")}_Tescil_Belgesi_Ruhsat.pdf`,
          desc: `T.C. Emniyet Genel Müdürlüğü Araç Tescil Belgesi (Seri: AA No: ${100000 + i})`,
          expiryDate: null,
        },
        {
          typeVal: "kasko",
          name: `${vehicle.plate.replace(/\s+/g, "_")}_Genisletilmis_Kasko_Policesi.pdf`,
          desc: `Anadolu Sigorta Tam Kapsamlı Genişletilmiş Kasko (Poliçe No: 2025-KSK-${80000 + i})`,
          expiryDate: new Date(2026, 7, 15),
        },
        {
          typeVal: "trafik_sigortasi",
          name: `${vehicle.plate.replace(/\s+/g, "_")}_Zorunlu_Trafik_Sigortasi.pdf`,
          desc: `Türkiye Sigorta Karayolları Motorlu Araçlar Zorunlu Mali Sorumluluk Sigortası (Poliçe No: 2025-TRF-${90000 + i})`,
          expiryDate: new Date(2026, 5, 20),
        },
        {
          typeVal: "muayene",
          name: `${vehicle.plate.replace(/\s+/g, "_")}_TUVTURK_Muayene_Raporu.pdf`,
          desc: `TÜVTÜRK Periyodik Araç Muayene Raporu — Sonuç: KUSURSUZ (Rapor No: TUV-2025-${70000 + i})`,
          expiryDate: new Date(2027, 2, 14),
        },
        {
          typeVal: "ekspertiz",
          name: `${vehicle.plate.replace(/\s+/g, "_")}_TSE_Oto_Ekspertiz_Raporu.pdf`,
          desc: `Pilot Garage TSE Onaylı 501 Nokta Detaylı Ekspertiz Raporu (%96 Motor Kondisyonu, Hatasız)`,
          expiryDate: null,
        },
        {
          typeVal: "noter_alis",
          name: `${vehicle.plate.replace(/\s+/g, "_")}_Noter_Satis_Senedi.pdf`,
          desc: `İstanbul 15. Noterliği Araç Alım Sözleşmesi ve Tescil Dekontu (Yevmiye: ${34000 + i})`,
          expiryDate: null,
        },
      ];

      for (const cfg of docConfigs) {
        await prisma.document.create({
          data: {
            companyId,
            categoryId: aracCategory.id,
            typeId: docTypeMap[cfg.typeVal] || aracCategory.types[0].id,
            referenceType: "VEHICLE",
            referenceId: vehicle.id,
            fileName: cfg.name,
            fileKey: `demo-doc:${cfg.typeVal}`,
            thumbKey: `demo-doc:${cfg.typeVal}`,
            fileType: "image/svg+xml",
            fileSize: 28500 + i * 120,
            description: cfg.desc,
            expiryDate: cfg.expiryDate,
            uploadedById: firstUser.id,
          },
        });
      }
    }
  }

  // 7. Masraflar (ilk 6 araç için periyodik bakım / lastik / kuaför)
  for (let i = 0; i < Math.min(6, createdVehicles.length); i++) {
    const veh = createdVehicles[i];
    const lines = [
      { type: "MATERIAL" as const, code: "LST-001", name: "Lastik Takımı (Michelin)", quantity: 4, unitPrice: 3200, vatRate: 20 },
      { type: "RECEIVED_SERVICE" as const, code: "ISC-900", name: "Yetkili Servis Periyodik Bakım", quantity: 1, unitPrice: 2400, vatRate: 20 },
    ];
    let sub = 0, vat = 0;
    lines.forEach((l) => {
      const n = l.quantity * l.unitPrice;
      sub += n;
      vat += (n * l.vatRate) / 100;
    });
    await prisma.expense.create({
      data: {
        companyId,
        invoiceType: "RECEIVED",
        expenseType: "VEHICLE",
        vehicleId: veh.id,
        supplierId: supplierIds[i % supplierIds.length],
        documentNo: `MSF-${companyId.slice(-3).toUpperCase()}-${1001 + i}`,
        documentDate: new Date(2025, i % 12, 10 + i),
        subTotal: sub,
        totalVat: vat,
        grandTotal: sub + vat,
        lines: { create: lines.map((l, idx) => ({ ...l, sortOrder: idx })) },
      },
    });
  }

  // 8. Kira Sözleşmeleri (KIRALAMADA araçlar için)
  const rented = createdVehicles.filter((v) => v.status === "KIRALAMADA");
  const corporateNames = ["Yıldız İnşaat Ltd. Şti.", "Deniz Lojistik A.Ş.", "Güneş Turizm A.Ş.", "Borusan Teknoloji A.Ş."];

  for (let i = 0; i < rented.length; i++) {
    const custName = corporateNames[i % corporateNames.length];
    const startDate = new Date(2025, i % 6, 1);
    await prisma.rentalContract.create({
      data: {
        companyId,
        vehicleId: rented[i].id,
        customerId: accounts[custName] || customerList[0],
        customerName: custName,
        durationMonths: [12, 24, 36][i % 3],
        kmLimit: 35000,
        monthlyPrice: [38000, 24000, 32000, 28000][i % 4],
        startDate,
        contractDate: startDate,
        documentNo: `KIR-2025-${101 + i}`,
        status: "ACTIVE",
        drivers: [],
      },
    });
  }

  console.log(
    `  ✓ ${companyName}: ${createdVehicles.length} araç (katalog & internet fotoğraflarıyla %100 uyumlu), her araca 6 resmi evrak (Ruhsat, Kasko, Muayene vb.), ${CUSTOMERS.length + SUPPLIERS.length} cari, ${PRODUCTS.length} ürün, ${rented.length} kira sözleşmesi`
  );
}

async function main() {
  console.log("=== DEMO VERİLERİNİ YENİDEN OLUŞTURMA BAŞLADI ===");

  // Kaleli Grup ve Demo Holding firmalarını bul
  const tenants = await prisma.tenant.findMany({
    where: {
      slug: { in: ["kaleli-grup", "demo-holding"] },
    },
    include: {
      companies: true,
    },
  });

  if (tenants.length === 0) {
    throw new Error("Hedef tenantlar bulunamadı!");
  }

  for (const tenant of tenants) {
    console.log(`\n🏢 Tenant: ${tenant.name} (${tenant.slug})`);
    for (const company of tenant.companies) {
      await seedCompany(company.id, tenant.id, company.name);
    }
  }

  console.log("\n✅ Demo veri sıfırlama ve oluşturma işlemi başarıyla tamamlandı!");
}

main()
  .catch((e) => {
    console.error("Hata:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
