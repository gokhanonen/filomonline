# FilomOnline — Deploy (VPS + PM2 + Nginx + HTTPS)

Tek domain mimarisi: `https://<domain>` → web (React), `https://<domain>/api` → API (NestJS),
`https://<s3-domain>` → MinIO (foto/evrak). API ve MinIO portları sunucu dışına kapalıdır;
dışarıya yalnız nginx (80/443) bakar.

```
Tarayıcı ──HTTPS──► nginx ─┬─ /            → apps/web/dist (statik SPA)
                           ├─ /api/        → 127.0.0.1:3001 (PM2: filom-api)
                           ├─ /socket.io/  → 127.0.0.1:3001 (WebSocket)
                           └─ (s3-domain)  → MinIO :9000
```

## Önkoşullar
- Bir Linux VPS (Ubuntu/Debian), sudo yetkili SSH erişimi.
- Uzak MySQL (zaten var), erişilebilir MinIO (zaten var: `22.6.102.180:9000`).
- **DNS A kayıtları**: `<domain>` ve `<s3-domain>` → sunucunun IP'si (certbot'tan önce yayılmış olmalı).

## 1) Ayar dosyaları (yerelde)
```bash
cp deploy/config.env.example deploy/config.env
# deploy/config.env içini doldur: DOMAIN, S3_DOMAIN, MINIO_UPSTREAM, SSH_*, APP_DIR, WEB_ROOT, LETSENCRYPT_EMAIL
```

## 2) Kodu sunucuya gönder + ilk kurulum
```bash
bash deploy/deploy.sh          # kaynağı sunucuya kopyalar (build sunucuda, ilk sefer de olur)
```
Sunucuda, bir kez (önkoşullar + nginx + SSL + güvenlik duvarı):
```bash
ssh <kullanıcı>@<sunucu>
cd <APP_DIR>
cp deploy/env/api.env.production.example apps/api/.env
nano apps/api/.env             # DATABASE_URL, JWT_*, S3_* (S3_ENDPOINT=https://<s3-domain>), WEB_URL, CORS_ORIGIN
sudo bash deploy/setup-server.sh
```
> JWT sırları üret: `openssl rand -base64 48` (access ve refresh için ayrı ayrı).

## 3) İlk veriyi oluştur (yalnız ilk kurulum)
```bash
cd <APP_DIR>/apps/api && npm run seed    # süper admin + demo tenant
```
MinIO bucket'ı yoksa MinIO konsolundan `filomonline` bucket'ını oluştur.

## 4) Giriş
`https://<domain>` → süper admin ile gir (secure.md'deki bilgiler; **üretimde şifreleri değiştir**).
- Süper Admin > **Claude AI**: API anahtarını gir.
- Süper Admin > **E-posta (SMTP)**: posta hesabını gir, "Bağlantıyı Test Et".

## Sonraki deploy'lar (güncelleme)
```bash
bash deploy/deploy.sh    # rsync + npm ci + prisma migrate deploy + build + pm2 reload
```

## Faydalı komutlar (sunucuda)
```bash
pm2 status                       # süreçler
pm2 logs filom-api               # canlı log
pm2 reload filom-api             # yeniden başlat (kesintisiz)
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run     # sertifika yenileme testi (otomatik timer zaten kurulu)
cd apps/api && npx prisma migrate status
```

## Dikkat / sık sorunlar
- **Mixed content**: Site HTTPS, MinIO HTTP ise tarayıcı foto/evrakı engeller. Çözüm bu kurulumda
  hazır: `S3_ENDPOINT=https://<s3-domain>` ve nginx S3 vekili. `S3_DOMAIN` boşsa bu kurulmaz → uyar.
- **S3 imza hatası (SignatureDoesNotMatch)**: nginx S3 bloğu `Host` başlığını değiştirmemeli
  (`proxy_set_header Host $host`). Şablon böyle; elle düzenlerken bozma.
- **WebSocket bağlanmıyor**: `/socket.io/` bloğundaki `Upgrade/Connection` başlıkları şart.
- **argon2 hatası**: native modül; `npm ci` mutlaka SUNUCUDA çalışmalı (yereldeki node_modules kopyalanmaz).
- **Port güvenliği**: 3001 ve 9000 dışarı kapalı olmalı (ufw). API yalnız nginx üzerinden erişilir.
- **CORS_ORIGIN / WEB_URL**: üretim domainiyle eşleşmeli; teklif e-posta linkleri `WEB_URL`'den üretilir.
```
