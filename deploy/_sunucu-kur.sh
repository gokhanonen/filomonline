#!/usr/bin/env bash
# Sunucu tarafı kurulum — deploy.sh tarafından "sudo" ile (root olarak) çağrılır.
# Ayrıcalıklı işler root, uygulama işleri (build/pm2) uygulama kullanıcısı ile yapılır. Idempotent.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
set -a; . deploy/config.env; set +a
RUN_USER="${SSH_USER:-tana}"

echo "==> [1/7] Gerekli programlar"
export DEBIAN_FRONTEND=noninteractive
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v nginx   >/dev/null || { apt-get update -y && apt-get install -y nginx; }
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
command -v pm2     >/dev/null || npm install -g pm2
apt-get install -y build-essential >/dev/null 2>&1 || true   # argon2 derlemesi için

echo "==> [2/7] Güvenlik duvarı (22/80/443 açık; 3001/9000 yalnız içeride)"
if command -v ufw >/dev/null; then
  for p in 22 80 443; do ufw allow ${p}/tcp >/dev/null 2>&1 || true; done
  yes | ufw enable >/dev/null 2>&1 || true
fi

echo "==> [3/7] Uygulama derleme + PM2 (kullanıcı: ${RUN_USER})"
chown -R "${RUN_USER}:${RUN_USER}" "${APP_DIR}"
su - "${RUN_USER}" -c "cd '${APP_DIR}' && bash deploy/_app-steps.sh"

echo "==> [4/7] PM2 boot'ta otomatik başlasın"
env PATH="$PATH" pm2 startup systemd -u "${RUN_USER}" --hp "/home/${RUN_USER}" 2>/dev/null | tail -n 1 | bash || true

echo "==> [5/7] nginx ayarları"
mkdir -p "${WEB_ROOT}"
envsubst '${DOMAIN} ${WEB_ROOT}' < deploy/nginx-app.conf.template > /etc/nginx/sites-available/filomonline
ln -sf /etc/nginx/sites-available/filomonline /etc/nginx/sites-enabled/filomonline
if [ -n "${S3_DOMAIN:-}" ]; then
  envsubst '${S3_DOMAIN} ${MINIO_UPSTREAM}' < deploy/nginx-s3.conf.template > /etc/nginx/sites-available/filomonline-s3
  ln -sf /etc/nginx/sites-available/filomonline-s3 /etc/nginx/sites-enabled/filomonline-s3
fi
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> [6/7] SSL sertifikaları (Let's Encrypt)"
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${LETSENCRYPT_EMAIL}" --redirect \
    || echo "   UYARI: ${DOMAIN} için sertifika alınamadı — DNS kaydı henüz yayılmamış olabilir. Sonra: sudo certbot --nginx -d ${DOMAIN}"
fi
if [ -n "${S3_DOMAIN:-}" ] && [ ! -d "/etc/letsencrypt/live/${S3_DOMAIN}" ]; then
  certbot --nginx -d "${S3_DOMAIN}" --non-interactive --agree-tos -m "${LETSENCRYPT_EMAIL}" --redirect \
    || echo "   UYARI: ${S3_DOMAIN} için sertifika alınamadı — DNS kaydını kontrol et. Sonra: sudo certbot --nginx -d ${S3_DOMAIN}"
fi

echo "==> [7/7] Durum"
su - "${RUN_USER}" -c "pm2 status ${PM2_APP}" || true
echo ""
echo "BİTTİ ✓  →  https://${DOMAIN}"
