# FilomOnline — Mimari

Turgut Auto'nun (oto galeri/filo yönetimi + ön muhasebe, Firebase tabanlı) multi-tenant,
servis mimarili yeniden yazımı. Özellik seti 1-1 taşınır; altyapı tamamen değişir.

## Kararlar (2026-10-22)

| Konu | Karar |
|------|-------|
| Backend | NestJS + Prisma, MySQL 8 |
| Frontend | React 19 + TS + Tailux teması (tema paketi ayrıca gelecek) |
| Repo | Monorepo (npm workspaces): `apps/api`, `apps/web`, `packages/shared` |
| Multi-tenant | Tek DB; Tenant (holding) → Company (şirket); operasyonel tablolarda `companyId` |
| Firma erişimi | Login + firma seçici; API'ye `X-Company-Id` header'ı ile |
| Auth | Kendi JWT'miz: access (15dk) + refresh (30g, rotasyonlu, DB'de hash) — Firebase yok |
| Realtime | Socket.io (chat, bildirimler) |
| Dosyalar | S3 uyumlu (lokalde MinIO, prod'da S3/R2); erişim imzalı URL ile |
| Deploy | VPS + Docker Compose (api, mysql, minio, nginx) |
| Tenant yönetimi | Süper admin paneli; self-service kayıt yok (şema aboneliğe hazır: `Tenant.plan`) |
| OCR | Gemini ruhsat OCR backend'e taşınır (API key sunucuda) |
| Veri taşıma | Yok — temiz başlangıç |

## Tenant / veri kapsamı kuralları

- **Tenant (holding) seviyesi:** katalog/tanım verileri — marka, model, renk, kasa tipi,
  araç kategorisi/tipi, ilan kaynakları, cari/ürün kategorileri, doküman kategori/tipleri,
  sözleşme şablonları, roller. Holdingin tüm şirketleri paylaşır.
- **Company (şirket) seviyesi:** tüm operasyonel veri — araç, cari, ürün, fatura, masraf,
  kira/satış sözleşmeleri, lokasyon, kasa, doküman, mesajlaşma, aktivite logları, ayarlar.
- **Kural:** şirket kapsamındaki her sorgu `companyId` ile filtrelenir. `CompanyGuard`
  header'daki şirketi üyelikle doğrular ve `request.user.companyId` + `permissions` doldurur.
  Servisler companyId'yi her zaman guard'dan alır, istemciden gelen body'den asla.
- Holding konsolidasyonu: tenant'ın şirketleri üzerinden toplanarak raporlanır.
- Dış API erişimi: şirket bazlı `ApiKey` (ERP vb. üçüncü taraflar için).

## Kimlik / yetki

- `User` → `CompanyMembership` (şirket başına üyelik + roller) → `Role.permissions` (string[]).
- `User.isSuperAdmin`: platform sahibi, tenant/şirket yönetimi.
- JWT payload: `{ sub, tenantId, isSuperAdmin }`. Şirket bağlamı token'da DEĞİL,
  her istekte header + DB doğrulamasıyla (üyelik değişiklikleri anında etkili olur).
- İzin anahtarı düzeni: `modul.eylem` (örn. `vehicles.read`, `invoices.write`).

## Eski → yeni eşleme notları

- Firestore'daki denormalize snapshot alanları (örn. faturadaki `vehiclePlaka`, `cariAdi`)
  ilişkisel modelde FK'ya dönüştü; gösterim join ile. Sözleşmelerdeki müşteri snapshot'ları
  hukuki belge oldukları için bilinçli olarak snapshot kaldı.
- `integrationStatus` yaşam döngüsü (Bekliyor → Kuyrukta → Entegre) korundu — dış ERP
  entegrasyonu artık şirket bazlı API key ile dışarıdan tüketilecek.
- Araç = single source of truth ilkesi korunuyor: alış/satış/kira finansal kayıtları
  `Vehicle` üzerinden türer, fatura kayıtları araca FK ile bağlı.

## Yol haritası (faz önerisi)

1. **Temel** ✅ iskelet: monorepo, Prisma şeması, auth, tenancy guard, docker-compose
2. **Platform:** süper admin (tenant/şirket CRUD), kullanıcı/rol yönetimi, firma seçici
3. **Çekirdek ERP:** cariler, ürünler, lokasyonlar, kasalar, araçlar (CRUD + fotoğraf/S3)
4. **Finans:** alış/satış/kira faturaları, masraflar, vergi kuralları (şahıs/firma), entegrasyon yaşam döngüsü
5. **Operasyon:** lokasyon transferleri, opsiyonlar, sözleşmeler (şablon + PDF), dokümanlar
6. **İletişim/BI:** Socket.io chat + bildirimler, raporlar (kar/zarar, temsilci performansı), OCR
7. **Dış API + mobil hazırlık:** API key yönetimi, rate limit, OpenAPI dokümantasyonu
