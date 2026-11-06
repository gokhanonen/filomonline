#!/usr/bin/env bash
# Uygulama adımları — UYGULAMA KULLANICISI (tana) ile çalışır (sudo YOK).
# deploy.sh (rutin) ya da _sunucu-kur.sh (ilk kurulum) çağırır.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . deploy/config.env; set +a

# node/npm nvm altında olabilir; login olmayan kabukta PATH'te olmayabilir → yükle.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "   -> npm ci"
npm ci --include=dev

echo "   -> prisma migrate deploy"
npm --workspace apps/api run prisma:generate
( cd apps/api && npx prisma migrate deploy )

echo "   -> build (API + web)"
npm run build:api
npm run build:web

echo "   -> MinIO bucket"
( cd apps/api && MINIO_LOCAL="http://${MINIO_UPSTREAM}" node ../../deploy/ensure-bucket.cjs ) || true

# ⚠️ KURAL: Canlı süreçleri (filomonline-web/filomonline-api) ASLA pm2 delete etme.
# startOrReload = yoksa başlat, varsa YERİNDE yenile (kesintisiz). Portlar sabit: web 5198, api 5199.
echo "   -> PM2: filomonline-web (5198) + filomonline-api (5199) startOrReload"
mkdir -p logs
# Yanlış tek-API kurulumundan kalma süreç varsa yalnız onu temizle (canlıya dokunmaz)
pm2 delete filom-api >/dev/null 2>&1 || true
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
