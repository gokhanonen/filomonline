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
- **Tek Giriş Noktası — Ürün/UX Bakış Açısı (Kalıcı Kural):**
  - Sol menüde her modülün TEK giriş öğesi vardır: Operasyon (araçlar), CRM (potansiyeller), Finans (Panel + Hareketler), Tanımlar. Kullanıcı her şeye tek yerden, ana kaydın içinden ulaşır.
  - Alt işler için ayrı menü öğesi / ayrı liste sayfası AÇILMAZ. İşler ait oldukları kaydın içinden yapılır:
    - Araç kartı → radial menü (teklif ver, deneme sürüşü, masraf, satış, opsiyon, sözleşme, evrak, lokasyon, statü…).
    - Potansiyel (CRM) detayı → sekmeler (ilgilendiği araçlar, deneme sürüşleri, teklifler, geçmiş).
  - Yeni bir özellik eklerken ilk soru: "Bu iş hangi kaydın içinden yapılır?" Yeni menü öğesi değil, o kayda aksiyon/sekme eklenir.
  - Genel bakış ihtiyacı (bugünkü sürüşler, bekleyen teklifler, toplamlar) ayrı sayfa olmaz; ilgili ana sayfaya sayaç/filtre/kart olarak eklenir.
  - Kaldırılan sayfaların eski adresleri silinmez, ana sayfaya yönlendirilir (bildirim/yer imi linkleri kırılmasın). Örn. `/crm/test-drives`, `/crm/quotes` → `/crm/leads`.
- **Veri Asla Fiziksel Silinmez (Kalıcı Kural):** "Sil" işlemi kaydı gizler — `update({ data: softDeleteData() })` ile `deletedAt` yazılır, satır kullanıcıya görünmez, dosyalar depoda kalır.
  - Merkezi mekanizma `apps/api/src/prisma/soft-delete.ts`: `SOFT_DELETE_MODELS` listesindeki modellerde PrismaService üzerinden yapılan okuma/güncelleme sorgularına otomatik `deletedAt: null` eklenir; bu modellerde `delete`/`deleteMany` çalışma anında hata verir. Yeni iş kaydı modeli eklerken `deletedAt DateTime?` alanını ekle ve listeye yaz.
  - Otomatik filtre YALNIZ üst seviye sorguları kapsar: iç içe `include` listelerine (`photos`, `tramerSet`, `listingUrls`, `models`, `types`, `quotes`, `testDrives`…) ve ilişki filtrelerine (`movement: {…}`) `deletedAt: null` elle yazılır.
  - Gizli kayda bilerek erişmek (geri getirme, arşiv) için where'e `deletedAt` yaz; filtre devreye girmez. Benzersiz adlı tanımlarda (marka, renk, evrak tipi…) `createOrRestore` kullan — aynı adla tekrar eklenen gizli kayıt geri gelir.
  - Fiziksel silme yalnız demo seed betiklerinde (düz `PrismaClient`) ve düzenlemede satır yenilemede (masraf satırı, sözleşme taksiti) kalır; yetki kayıtları (rol, firma üyeliği) güvenlik nedeniyle gerçekten silinir.
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

## Lokasyon bazlı çalışma (Holding > Firma > Lokasyon > Hareket)
- **Hiyerarşi:** En üstte holding (Tenant), altında firmalar (Company/VKN), altında lokasyonlar (`Location`, companyId kapsamlı), en altta hareketler. Sağ üstteki seçici artık **Firma → Lokasyon ağacı** (`CompanySwitcher.tsx`): lokasyon seçimi aktif firma + aktif lokasyonu belirler; "Tüm Firmalar (Konsolide)" → `/holding`.
- **Lokasyon tipi (satış/galeri vs dış servis):** `Location.isExternal` ayrımı — `false` = satış/galeri (araç kaydı/satışı yapılan, çalışma lokasyonu), `true` = dış servis (kaporta, boyacı, bakım, yıkama). **Firma→Lokasyon seçicisi YALNIZ `isExternal:false` lokasyonları gösterir** (`auth.service.me()` bunları `isExternal:false` ile filtreler). Dış servis lokasyonlarına araçlar transfer akışıyla gönderilir (AT_EXTERNAL), aktif çalışma lokasyonu olmazlar. Tip, lokasyon aç/düzenle formunda (`LocationForm.tsx`) checkbox ile belirlenir.
- **Aktif lokasyon bağlamı:** Frontend `X-Location-Id` header'ı gönderir (`axios.ts`, `fo.activeLocationId`). `CompanyGuard` bunu doğrular (aktif firmaya ait + aktif olmalı, değilse 403) ve `request.user.locationId`'ye yazar. Enjeksiyon: `@LocationId()` decorator (yoksa `undefined` → geçiş dönemi uyumlu). Lokasyon companyId gibi **asla body'den alınmaz.**
- **Hareket damgalama (create):** Aktif lokasyon ilgili kayda damgalanır — Araç `currentLocationId` (alış lokasyonu öncelikli), Finans hareketi `locationId` (kasasının lokasyonundan türetilir), Fatura/Masraf `locationId` (form seçimi öncelikli, yoksa aktif lokasyon), Lead `locationId`, Kira sözleşmesi `locationId`. Satış faturasında araç `currentLocationId` satış lokasyonuna güncellenir.
- **Liste filtreleme:** Aktif lokasyon seçiliyse listeler o lokasyona filtrelenir (araç/`currentLocationId`, lead, kira, fatura, masraf, ham finans `movements`). Lokasyon seçili değilse (undefined) filtre uygulanmaz (firma geneli). **İstisna:** Finans birleşik ekstresi (`GET /finance/ledger`, Hareketler) muhasebe çapraz-görünümü olduğu (fatura bir lokasyonda, ödemesi başka lokasyonda olabilir) için firma geneli bırakılır — yalnız ham `movements` listesi lokasyona filtrelenir.
- **Seed/backfill:** `seed-locations.ts` her firmaya en az 2 lokasyon (Merkez+Şube) garantiler (idempotent). `backfill-locations.ts` mevcut işlemlere lokasyon atar (araç alış/satış loc'u, finans kasasının loc'u, lead/kira firmanın ilk loc'u). **Deploy sonrası `backfill-locations.ts` bir kez çalıştırılmalı.** Lokasyon kolonları eklemeli migration: `20261108130000_location_on_transactions` (4 nullable kolon).
- **Firma yaratma (holding self-servis):** Holding/firma yöneticisi (`isCompanyAdmin`) kendi holding'i altında firma açabilir — `POST /companies/holding` (tenantId guard'ın `activeTenantId`'sinden, body'den DEĞİL). Açılış tek transaction'da: firma + oluşturana admin üyelik + 2 varsayılan lokasyon (Merkez+Şube, lokasyonsuz kalmasın). `GET /companies/holding` tenant firmalarını listeler. UI: **Tanımlar > Firmalar** (`/company`, `DefinitionsNav` sekmesi): firmalar kart olarak browse edilir, "Yeni Firma" ile açılır, bir karta tıklayınca o firma aktif olur ve altında zengin form (`CompanySettingsCard` — logo, resmi ünvan, MERSİS, adres…) ile düzenlenir. Başarıda `refreshUser()` ile yeni firma Firma→Lokasyon seçicisine düşer. (Firma yönetimi ayrı Yönetim öğesi DEĞİL — Tanımlar altında; süper-admin `POST /companies` ayrı durur.)
- **Konsolide (Tüm Firmalar) operasyon — "gör + tıkla-işlem":** `GET /vehicles/holding` (`@SkipCompany`) kullanıcının erişebildiği TÜM firmalardaki araçları firma+lokasyon rozetiyle döner (hafif, ağır presign yok). UI: `/holding/vehicles` — bir araca tıklayınca `switchLocation` ile o aracın firma+lokasyonuna geçip Operasyon'a gider (işlem hep kaydın kendi firma/lokasyonundan). `/holding` özet ekranından giriş butonu. İlk dikey dilim **araç**; aynı desen (holding-wide list endpoint + rozet + tıkla-geç) CRM/Finans'a da genişletilebilir.

## Raporlar — yetkiye göre sınırlı
- Raporlar (`/reports/*`) `reports.read` ile korunur; İÇERİK de yetkiye göre sınırlanır.
- **Scope-bazlı gizleme (güvenlik):** `reports/report-visibility.ts` rapor alan adlarını (Türkçe toplu alanlar dahil: `brutKar, stokMaliyeti, toplamSatis, totalProfit, totalRevenue…`) scope'lara eşler; `stripReport` scope'u OLMAYAN kullanıcıdan ilgili alanları (iç içe dahil) **sunucuda** çıkarır. (FieldVisibilityInterceptor yalnız standart İngilizce alanları yakalıyordu; bu boşluğu kapatır.)
- **Kendi/Hepsi:** yeni özel izin **`reports.all`** (`SPECIAL_PERMISSIONS`, rol editöründe switch). Yoksa kullanıcı raporlarda yalnız kendi (`salesRepId = user.id`) verisini görür; varsa/`isAdmin`/`*` → tüm temsilciler. Muhasebe şablonunda var.
- Frontend güvenlik ağı: `money()` undefined'da "—" (NaN yerine); dashboard hassas kartları `can("data.*.view")` ile gizli. (Rapor sayfasında tam kart/sütun/grafik gizleme + grafik format bug'ı sonraki faz.)
- **Lokasyon kısıtı raporlara henüz uygulanmadı** (sonraki faz).

## Finans modülü
- Tek hareket tablosu `FinanceMovement`: her satır bir ana kaydı etkiler (`CashRegister` = Kasa/Banka/POS/Kredi Kartı, ya da `Cheque`). Çok bacaklı işlemler (virman, POS→banka, KK ödemesi, çek tahsil) ortak `groupId` taşır; silme grup bazında.
- Cariye bağlı satır ekstreye düşer: IN → cari alacak, OUT → cari borç. Cari bakiye = faturalar + hareketler (`LedgerService`), `Account.balance` sadece önbellek.
- Fatura kapatma `PaymentAllocation` ile (SALES/PURCHASE/RENTAL/EXPENSE); karşılıksız/iade çekin eşleştirmesi faturayı kapatmaz. Vade: faturalarda `dueDate` (boşsa belge tarihi).
- Şemayı `prisma db push` ile DEĞİL migration ile değiştir (uzak DB, geçmiş kopmasın).
- UI: menüde yalnız **Panel** (`/finance`, `GET /finance/dashboard`) ve **Hareketler** (`/finance/movements`, `GET /finance/ledger` — hareketler + satış/alış/kira faturaları + masraflar tek akış). Kasa & Banka / Çek / Alacak-Borç / Ekstre panelden açılır; `/invoices` ve `/expenses` Hareketler'e yönlenir. Yeni kayıt girişleri `FinanceActions` bileşeninde.

## E-posta
- Platform geneli tek SMTP hesabı: Süper Admin > E-posta (SMTP) sekmesi (`/admin/mail/*`, ayar `system` / `integrations.smtp`, şifre maskeli). Gönderim `MailService.send` (global `MailModule`); gönderen adı firma adı, `replyTo` gönderen kullanıcı.
- Müşteriye giden linklerin kökü `WEB_URL` (yoksa `CORS_ORIGIN`'in ilki). Üretimde `WEB_URL` mutlaka tanımlanmalı.

## Ödeme (KK tahsilat) — `payments` modülü
- **Ürün-bağımsız** altyapı (global `PaymentsModule`). `PaymentProvider` arabirimi; şimdilik yalnız `MockPaymentProvider` (gerçek çekim YOK). Gerçek sağlayıcıya geçiş = `payments/providers/` altına adaptör (iyzico/PayTR/Stripe) + `PAYMENT_PROVIDER`'ı ona bağla; üst katman değişmez.
- `Payment` kaydı `productType` taşır (ör. `"CREDITS"`, `"SUBSCRIPTION"`). Başarılı ödemede ilgili ürün modülünün kaydettiği **fulfillment** kancası AYNI transaction'da çağrılır (idempotent). Dev: `POST /payments/:id/mock-complete`.

## Kontör (AI kredisi) — `credits` modülü
- Cüzdan **firma (Company) bazlı** (`CreditWallet`). **Lot** tabanlı: her hediye/satın alma bir lot; harcama **FIFO** (önce bu ayın ücretsiz/süreli lotu, biterse ücretli/süresiz lot). Bakiye önbellek, defter `CreditTransaction` (GRANT/PURCHASE/SPEND/REFUND/EXPIRE) — **silinmez** (SOFT_DELETE listesinde değil).
- Aylık hediye **tembel**: cüzdana her erişimde o ayın hediyesi garanti edilir (cron yok), geçmiş ay süre dolmuş sayılır. Miktar = tenant planının `monthlyFreeCredits`'i.
- AI işlemleri işlem başına 1 kontör harcar (harca → çalıştır → hata olursa iade): `POST /ai/assist`, `POST /ai/claude/query`, CRM `ai-message`. Süper admin "bağlantı testi" harcamaz.
- UI: `/billing` (Kontör) — bakiye + paket satın alma (mock ödeme) + hareketler. Süper admin: Platform Yönetimi > "Kontör Paketleri".

## Abonelik — `subscription` modülü
- **Tenant (holding) başına tek abonelik** (`Subscription`). **Sabit kademe** modeli: `SubscriptionPlan` dahil kotaları (kullanıcı/lokasyon/aktif araç), fiyatları (liste/kampanya, yıllık `annualMonthsCharged` ile "10 öde 12 kullan"), `freeTransactionLimit` (Free) ve aylık AI kontörü (`monthlyFreeCredits`) taşır. Kuponlar: `Coupon` (yüzde/sabit/ücretsiz ay).
- **Kota gating** (`QuotaService`): kullanım tenant genelinde toplanır; **grace = kota × (1 + graceOveragePct/100), yukarı yuvarla** → kota ile hard arası `WARN` (sürekli uyarı), hard üstü `BLOCK` (402 `QUOTA_EXCEEDED`). Uygulanan yerler: `vehicles.create` (aktif araç + işlem tetikleyicisi), `invoices.createSales` (işlem tetikleyicisi). Her alış=1, her satış=1 işlem.
- Abone olma ödeme üzerinden (`productType="SUBSCRIPTION"`); ücretsiz plan doğrudan aktive. Aktivasyonda `Tenant.subscriptionPlanId` senkronlanır (kontör hediyesi plana bağlı çalışsın). UI: `/subscription` + uygulama geneli `QuotaWarningBanner`. Süper admin: "Abonelik & Planlar" (plan/kupon/firma atama).

## Yetkilendirme — `authz` + roller
- Merkezi katalog `authz/permission-catalog.ts` (tek doğruluk kaynağı; frontend `GET /authz/catalog` ile çeker): modüller × `read/create/write/delete` (Görüntüle/Ekle/Düzenle/Sil) + **hassas-veri scope'ları**
- **`write` ⇒ `create` kuralı:** Düzenle yetkisi Ekle'yi KAPSAR. `expandImpliedPermissions` (CompanyGuard + frontend `permissionsFor` aynı mantık) etkin izinlere `X.write` varsa `X.create` ekler → eski roller (yalnız write) kırılmaz, veri migrasyonu gerekmez. `create`-only rol yalnız ekleyip düzenleyemeyen kullanıcı içindir. Ana create (`@Post()` kök) uçları `@RequirePermissions('modul.create')` ister; alt-aksiyon/çek yaşam döngüsü POST'ları `write` kalır. Rol editörü matrisinde Düzenle seçiliyken Ekle otomatik-işaretli (disabled) gösterilir. (`data.cost.view`, `data.profit.view`, `data.finance.view`, `data.salePrice.view`, `data.contact.view`) + **hazır rol şablonları** (Yönetici/Satış Danışmanı/Muhasebe/Görüntüleyici). Yeni kullanıcı varsayılanı: **Satış Danışmanı**.
- **Lokasyon kısıtı (kullanıcı-lokasyon):** `CompanyMembership.locationIds` (JSON string[]) — kullanıcının firma içinde erişebileceği lokasyonlar; **boş/null = firmadaki TÜM lokasyonlar**. Admin/süper-admin kısıtsız. `CompanyGuard` aktif lokasyonun (X-Location-Id) bu listede olmasını doğrular (değilse 403); `auth.service.me()` seçici lokasyonlarını bu listeyle kesiştirir. UI: kullanıcı formunda firma altında lokasyon chip'leri (boş = tümü). Migration: `20261108140000_membership_location_scope` (1 nullable kolon, backfill gerekmez).
- **Çoklu rol + bireysel override:** `CompanyMembership.permissionsGrant/Deny` (JSON string[]). **Etkin izin = (roller ∪ grant) − deny**, deny kazanır — aynı mantık `CompanyGuard` (backend) ve `auth/Provider` `can()` (frontend). `isAdmin`/`isSuperAdmin`/`"*"` tüm kontrolleri bypass eder.
- **Hassas-veri gizleme sunucu-tarafında** (`FieldVisibilityInterceptor`, global `APP_INTERCEPTOR`): scope'u OLMAYAN kullanıcıdan ilgili alanlar API yanıtından çıkarılır (iç içe dahil). Alan eşlemesi `SCOPE_FIELDS`, muaf yollar `VISIBILITY_SKIP_PREFIXES` (auth/users/credits/subscription…). Yeni hassas alan eklerken `SCOPE_FIELDS`'e yaz.
- UI: Sol menüde **Yetkilendirme** (eski "Kullanıcılar"), açılan sayfada Tanımlar benzeri sekmeler (`AuthzNav`): **Kullanıcılar** (`/users`) ve **Roller** (`/users?tab=roles` → `RolesManagerPanel`, izin matrisi + şablon). Kullanıcı formunda firma başına çoklu rol chip'leri + tek-tık hassas-veri switch'leri (grant/deny hesabı otomatik).

## Deploy (DEĞİŞMEZ KURALLAR — her deploy'da uygula)
- **Sunucu mimarisi (SABİT):** Dış ters-proxy (başka makine, 176.53.80.x) alan adını `22.6.102.180:5198`'e yönlendirir.
  - `filomonline-web` (pm2) = `deploy/web-server.mjs`, **:5198** — statik SPA (`apps/web/dist`) + `/api`,`/socket.io` → `:5199` proxy.
  - `filomonline-api` (pm2) = `apps/api/dist/main.js`, **PORT=5199** (NestJS).
  - **Port/isimleri ASLA değiştirme** (3001'e taşıma yok). Dış proxy bunlara göre ayarlı; değişirse site 502 olur.
- **Rutin deploy = `bash deploy/deploy.sh`** (Mac'ten). Yaptığı: rsync → `npm ci` → `prisma migrate deploy` → build → `pm2 startOrReload deploy/ecosystem.config.cjs`. **Kesintisiz.**
- **ASLA `pm2 delete filomonline-web filomonline-api` yapma.** Yalnız `startOrReload` ile yerinde yenile. Silmek canlıyı düşürür → 502.
- **Sudo / apt / nginx / certbot / SSL rutin deploy'da YOK.** Bunlar tek seferlik sunucu kurulumu (`deploy/_sunucu-kur.sh`) / DevOps işidir. Rutin deploy altyapıya dokunmaz.
- **DB migration'ları yalnız ekleme olmalı** (ADD COLUMN / yeni tablo). `migrate deploy` uzak prod DB'ye uygular; eski kodu bozmamalı. `db push` yok.
- **node/npm nvm altında** (`~/.nvm/.../v24`). Script'ler login-olmayan SSH'ta çalışsın diye `_app-steps.sh` nvm'yi kendisi yükler.
- SSH parolası `secure.md` içindeki **"Sunucu (SSH)" bölümündeki** "Şifre:" (ilk "Şifre:" DEĞİL — o başka bir hesap). Sudo için `ssh -tt` (TTY) gerekir.
- **Deploy sonrası doğrula:** `https://filomonline.com/login` ve `/api/v1/health` → 200; `pm2 ls` → filomonline-web + filomonline-api online.
- Kontör/abonelik/rol gibi yeni modül verisi gerekiyorsa deploy sonrası sunucuda ilgili seed'i çalıştır (`seed-credits.ts`, `seed-roles.ts`). Idempotent.

## Komutlar
```bash
npm run prisma:migrate   # şema değişikliği sonrası migration
npm --workspace apps/api run seed   # süper admin + demo tenant
npx ts-node prisma/seed-catalog.ts  # (apps/api) katalog + ilan kaynakları (Sahibinden/Arabam/DOD)
npx ts-node prisma/seed-extras.ts   # (apps/api) demo ilan linkleri + opsiyonlar
npx ts-node prisma/seed-finance.ts  # (apps/api) demo kasa/banka/POS/KK hesapları, tahsilat/ödeme, çek/senet
npx ts-node prisma/seed-credits.ts  # (apps/api) abonelik kademeleri + kontör paketleri + tenant'lara varsayılan plan
npx ts-node prisma/seed-roles.ts    # (apps/api) her tenant'a hazır rol şablonları (Yönetici/Satış Danışmanı/Muhasebe/Görüntüleyici)
npm run build:api
```
> Not: Üretim/uzak DB'de migration `npx prisma migrate deploy` ile uygulanır (yerelde `migrate dev` yok; uzak DB geçmişi korunur).

