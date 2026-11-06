#!/usr/bin/env bash
# FilomOnline — RUTİN DEPLOY (kesintisiz). Mac'ten:  bash deploy/deploy.sh
#
# Ne yapar: kodu rsync'ler → sunucuda npm ci + prisma migrate deploy + build +
#           `pm2 startOrReload` (filomonline-web:5198, filomonline-api:5199).
# Ne YAPMAZ: sudo / apt / nginx / certbot / SSL YOK; canlı pm2 süreçlerini SİLMEZ.
#
# ⚠️ MİMARİ SABİT: dış ters-proxy alan adını 22.6.102.180:5198'e yollar.
#    filomonline-web (web-server.mjs) statik SPA'yı sunar + /api,/socket.io → :5199.
#    Portları/isimleri DEĞİŞTİRME. İlk sunucu kurulumu (nginx/SSL) AYRI ve tek seferlik.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f deploy/config.env ] || { echo "HATA: deploy/config.env yok."; exit 1; }
[ -f deploy/env/api.env.production ] || { echo "HATA: deploy/env/api.env.production yok."; exit 1; }
set -a; . deploy/config.env; set +a

# Şifreyi tek seferde sor, bağlantıyı yeniden kullan (ControlMaster)
CS="/tmp/filom-ssh-%r@%h:%p"
SSH_OPTS="-p ${SSH_PORT:-22} -o ControlMaster=auto -o ControlPath=${CS} -o ControlPersist=600"
cleanup() { ssh -O exit -o ControlPath="${CS}" "${SSH_USER}@${SSH_HOST}" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> Kod kopyalanıyor (rsync) → ${SSH_USER}@${SSH_HOST}:${APP_DIR}"
rsync -az --delete -e "ssh ${SSH_OPTS}" \
  --exclude ".git" --exclude "node_modules" --exclude "dist" \
  --exclude "logs" --exclude "scratchpad" --exclude "secure.md" \
  --exclude "apps/api/.env" --exclude "apps/api/dist" --exclude "apps/web/dist" \
  ./ "${SSH_USER}@${SSH_HOST}:${APP_DIR}/"

echo "==> Üretim ayarı yükleniyor (apps/api/.env)"
rsync -az -e "ssh ${SSH_OPTS}" \
  deploy/env/api.env.production "${SSH_USER}@${SSH_HOST}:${APP_DIR}/apps/api/.env"

echo "==> Sunucuda uygulama adımları (npm ci → migrate → build → pm2 reload) — KESİNTİSİZ"
# _app-steps.sh kendi içinde nvm'yi yükler; sudo gerekmez.
ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "cd ${APP_DIR} && bash deploy/_app-steps.sh"

echo "==> Bitti. (filomonline-web :5198 + filomonline-api :5199 kesintisiz yenilendi)"
echo "    Doğrulama: https://${DOMAIN}/login ve https://${DOMAIN}/api/v1/health → 200 beklenir."
