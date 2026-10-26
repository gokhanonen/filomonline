# FilomOnline — Kolay Kurulum (3 adım)

Site: **https://filomonline.com** · Sunucu: **22.6.102.180** · Kullanıcı: **tana**

---

## Adım 1 — İki DNS kaydı aç (alan adı sağlayıcında)
Alan adını (filomonline.com) aldığın yere (örn. GoDaddy, Natro, isimtescil) gir, **DNS / Kayıtlar**
bölümüne şu **iki A kaydını** ekle:

| Tür | İsim / Host | Değer (IP)     |
|-----|-------------|----------------|
| A   | `@`         | `22.6.102.180` |
| A   | `s3`        | `22.6.102.180` |

> `@` = filomonline.com'un kendisi. `s3` = s3.filomonline.com (fotoğrafların güvenli yüklenmesi için).
> Kaydettikten sonra yayılması 5–30 dakika sürebilir.

## Adım 2 — Tek komutu çalıştır (kendi bilgisayarında)
Mac'te Terminal'i aç, proje klasörüne gir ve şunu yaz:

```bash
cd /Users/gonen/Documents/filomonline
bash deploy/deploy.sh
```

- Şifre sorulursa **tana kullanıcısının şifresini** gir (sunucu şifresi).
- Gerisi otomatik: kurulum, derleme, SSL sertifikası, başlatma. Birkaç dakika sürer.

## Adım 3 — Aç ve gir
Tarayıcıdan **https://filomonline.com** adresine git (kilit işareti çıkmalı).
- Süper admin ile gir → **Platform Yönetimi**'nden:
  - **Claude AI**: API anahtarını gir,
  - **E-posta (SMTP)**: posta hesabını gir ve "Bağlantıyı Test Et".

---

## Daha sonra güncelleme yapmak
Kodda değişiklik olunca aynı tek komut yeter:
```bash
bash deploy/deploy.sh
```

## Takılırsan
- **Kilit çıkmadı / sertifika hatası:** DNS daha yayılmamış olabilir. 15 dk sonra `bash deploy/deploy.sh` tekrar.
- **Durumu görmek için** (sunucuda): `ssh tana@22.6.102.180` → `pm2 status` ve `pm2 logs filom-api`
- Her şey otomatik dolduruldu; veritabanı/MinIO şifrelerini ya da güvenlik anahtarlarını elle girmene gerek yok.

## Not: eski kurulum
Sunucuda daha önce (başka bir oturumda) HTTPS'siz bir kurulum yapılmıştı (`deploy.py`, portlar 5198/5199).
Bu yeni `deploy/deploy.sh` onun yerine geçer ve o süreçleri durdurur. Bundan sonra **yalnızca**
`bash deploy/deploy.sh` kullan; `deploy.py`'yi bir daha çalıştırma (ikisi çakışır).
