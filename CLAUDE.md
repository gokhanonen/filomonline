# CLAUDE.md — FilomOnline

Multi-tenant filo/galeri yönetimi + ön muhasebe SaaS. Eski projenin
(`/Users/gonen/Documents/turgut/ts/demo`, Firebase tabanlı Turgut Auto) yeniden yazımı.
Mimari kararlar ve tenant kuralları: `ARCHITECTURE.md` (ÖNCE ONU OKU).

## Yapı
- Monorepo (npm workspaces): `apps/api` (NestJS + Prisma + MySQL), `apps/web` (React TS + Tailux teması, kendi backend'imize bağlı), `packages/shared`
- `docker compose up -d` → MySQL (3306) + MinIO (9000/9001)
- API: `npm run dev:api` → http://localhost:3001, Swagger: `/api/docs`, global prefix `/api/v1`
- Web: `npm run dev:web` → http://localhost:5173, `VITE_API_URL` ile API'ye bağlanır

## Web / tema notları
- Tema demo sayfaları (dashboards/apps/components/docs/forms/prototypes/tables) kaldırıldı; kalanlar: Auth (login), errors, settings.
- Auth tamamen kendi API'mize bağlı: `src/app/contexts/auth/Provider.tsx` (login→/auth/login, sonra /auth/me ile kullanıcı+şirketler+izinler). Firma seçici: `switchCompany`, izin kontrolü: `can('modul.eylem')`.
- `src/utils/axios.ts`: her isteğe `Authorization` + `X-Company-Id` ekler, 401'de bir kez refresh dener. Token'lar localStorage'da `fo.*` anahtarlarında (`src/configs/auth.ts`).
- Navigasyon `src/app/navigation/index.ts` (title doğrudan Türkçe, transKey yok); yeni menü öğesinin `icon` anahtarı `navigation/icons.ts`'te kayıtlı OLMALI yoksa menü hata fırlatır.
- Modül sayfaları şimdilik `Placeholder` ile route'landı (`src/app/router/protected.tsx`); gerçek sayfalar yazıldıkça değiştirilecek.

## Değişmez kurallar
- Şirket kapsamlı her Prisma sorgusu `companyId` ile filtrelenir; companyId HER ZAMAN
  `CompanyGuard`'ın doldurduğu `request.user.companyId`'den alınır, istemci body'sinden asla.
- Frontend doğrudan DB'ye erişmez; her şey API üzerinden (mobil app de aynı API'yi kullanacak).
- Para alanları `Decimal @db.Decimal(15,2)`, oranlar `Decimal(5,2)`.
- Yeni endpoint'ler varsayılan JWT korumalı (`@Public` ile açılır); şirket bağlamı
  gerektirmeyenler `@SkipCompany` ile işaretlenir; yetki `@RequirePermissions('modul.eylem')`.
- **UI & Form Standartları (Kalıcı Kural):**
  - Cari/Tedarikçi/Müşteri, Araç, Hizmet/Ürün/Parça kartı, Kasa, Lokasyon gibi liste verisi içeren TÜM seçim alanlarında standart HTML `<select>` YERİNE mutlaka aranabilir Autocomplete / Combobox (`SearchableSelect`) bileşeni kullanılmalıdır. 100+ kayıt olduğunda kullanıcının arayarak bulması şarttır.
  - Masraf formunda "Belge Tipi" seçtirilmez; masraf her zaman "Alınan Masraf"tır (`invoiceType: "RECEIVED"`). Masraf kalemlerinde anlamsız "Tip" ayrımı yerine doğrudan aranabilir Hizmet/Parça kartı seçilmeli ve kart seçildiğinde ad, birim fiyat ve KDV otomatik dolmalıdır.
  - **Araç Fiyatları & 4 Alım Rejimi Kuralı:**
    - Araç kartında ve veritabanında `salePrice` (Satış Fiyatı) YOKTUR (kaldırılmıştır). Fiyat alanları: Liste Fiyatı (`listPrice`), TENSF (`tensf`), Alış Fiyatı (`purchasePrice`), Alış Noter Fiyatı (`purchaseNotaryPrice`).
    - 4 Alım Rejimi (`purchaseRegime`):
      1. `sahis`: Şahıstan (Özel Matrah Yok) -> Alış KDV %0, Satışta kâr marjı (Noter Satış - Noter Alış) üzerinden %20 KDV hesaplanır.
      2. `sirket_1`: Şirketten (%1 KDV) -> Alış KDV %1 kilitli, alış fatura bilgileri zorunlu. Satışta %1 KDV dahil tam fatura.
      3. `sirket_20`: Şirketten (%20 KDV) -> Alış KDV %20 kilitli, fatura bilgileri zorunlu. Satışta %20 KDV dahil tam fatura.
      4. `galeri_ozel`: Galeriden (Özel Matrahlı) -> Alış Özel Matrah Tutarı girilir. Satışta %1 KDV dahil tam fatura.
    - Satış faturası kesilirken: "Satış Tutarı" ve "Satış Noter Fiyatı" alanları kullanılır. KDV oranları rejim tarafından kilitli ve otomatiktir; kullanıcı elle değiştiremez.
  - **Tutar ve Fiyat Alanlarında Binlik Ayracı Standardı (Kalıcı Kural):**
    - Projedeki TÜM tutar, fiyat, ücret, opsiyon/kapora ve KM/büyüklük girişlerinde kullanıcı yazarken de yazdıktan sonra da Türkçe binlik ayracı (`.` binlik ayracı, `,` ondalık ayracı, örn: `1.600.000` veya `1.450.000,50`) zorunludur.
    - Ham `<input type="number">` ASLA parasal/tutar alanlarında kullanılmaz (HTML `type="number"` binlik ayracına izin vermez).
    - Yeni veya güncellenen tüm sayısal/parasal alanlarda `@/components/ui` altındaki `NumericInput` bileşeni kullanılır. React Hook Form ile `Controller` üzerinden bağlanır. Tam sayı alanları için `numeralDecimalScale={0}` ve özel son ek için `suffix` (örn: `"km"`) kullanılır.
  - **Evrak / Fotoğraf Yükleme ve Tanımlama Standardı (Kalıcı Kural):**
    - Fotoğraf yüklemelerinde görseller istemci tarafında (`imageResize.ts`) otomatik olarak **en fazla 300KB** (`DOCUMENT_PHOTO_MAX_BYTES = 300 * 1024`) olacak şekilde yeniden boyutlandırılır ve sıkıştırılır. PDF belgeleri ham yüklenir.
    - Evrak kategori ve tipleri `http://localhost:5173/catalog` adresindeki "Evrak Tanımları" sekmesinden dinamik olarak yönetilir ve modüllerle (`VEHICLE`, `CUSTOMER`, `CONTRACT`, `INVOICE`, `ALL`) ilişkilendirilir.
    - Tüm modüllerde evrak yükleme için `@/components/shared/DocumentManager` bileşeni kullanılır; bileşen `referenceType` ile çağrıldığında modüle uygun evrak kategorilerini otomatik filtreler.

## Finans modülü
- Tek hareket tablosu `FinanceMovement`: her satır bir ana kaydı etkiler (`CashRegister` = Kasa/Banka/POS/Kredi Kartı, ya da `Cheque`). Çok bacaklı işlemler (virman, POS→banka, KK ödemesi, çek tahsil) ortak `groupId` taşır; silme grup bazında.
- Cariye bağlı satır ekstreye düşer: IN → cari alacak, OUT → cari borç. Cari bakiye = faturalar + hareketler (`LedgerService`), `Account.balance` sadece önbellek.
- Fatura kapatma `PaymentAllocation` ile (SALES/PURCHASE/RENTAL/EXPENSE); karşılıksız/iade çekin eşleştirmesi faturayı kapatmaz. Vade: faturalarda `dueDate` (boşsa belge tarihi).
- Şemayı `prisma db push` ile DEĞİL migration ile değiştir (uzak DB, geçmiş kopmasın).

## Komutlar
```bash
npm run prisma:migrate   # şema değişikliği sonrası migration
npm --workspace apps/api run seed   # süper admin + demo tenant
npx ts-node prisma/seed-catalog.ts  # (apps/api) katalog + ilan kaynakları (Sahibinden/Arabam/DOD)
npx ts-node prisma/seed-extras.ts   # (apps/api) demo ilan linkleri + opsiyonlar
npx ts-node prisma/seed-finance.ts  # (apps/api) demo kasa/banka/POS/KK hesapları, tahsilat/ödeme, çek/senet
npm run build:api
```

