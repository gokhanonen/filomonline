#!/usr/bin/env bash
# Uygulama adımları — UYGULAMA KULLANICISI (tana) ile çalışır. _sunucu-kur.sh çağırır.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . deploy/config.env; set +a

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

echo "   -> Eski http kurulumunun PM2 süreçleri durduruluyor (varsa)"
pm2 delete filomonline-web filomonline-api >/dev/null 2>&1 || true

echo "   -> PM2: filom-api başlat/yenile"
mkdir -p logs
if pm2 describe "${PM2_APP}" >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save
