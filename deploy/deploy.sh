#!/usr/bin/env bash
# FilomOnline — TEK KOMUTLA KURULUM / GÜNCELLEME  (Nginx + HTTPS)
# Kendi bilgisayarından (Mac) çalıştır:   bash deploy/deploy.sh
# Sunucu şifresi birkaç kez sorulabilir; "tana" kullanıcısının şifresini gir.
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

echo "==> Sunucuya bağlanılıyor (${SSH_USER}@${SSH_HOST}) — şifre sorulursa gir"
ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "sudo mkdir -p ${APP_DIR} && sudo chown -R ${SSH_USER}:${SSH_USER} ${APP_DIR}"

echo "==> Kod kopyalanıyor (rsync)"
rsync -az --delete -e "ssh ${SSH_OPTS}" \
  --exclude ".git" --exclude "node_modules" --exclude "dist" \
  --exclude "logs" --exclude "scratchpad" --exclude "secure.md" \
  --exclude "apps/api/.env" --exclude "apps/api/dist" --exclude "apps/web/dist" \
  ./ "${SSH_USER}@${SSH_HOST}:${APP_DIR}/"

echo "==> Üretim ayar dosyası yükleniyor (apps/api/.env)"
rsync -az -e "ssh ${SSH_OPTS}" \
  deploy/env/api.env.production "${SSH_USER}@${SSH_HOST}:${APP_DIR}/apps/api/.env"

echo "==> Sunucuda kurulum çalışıyor (root/sudo ile, birkaç dakika)..."
# -t: sudo şifre sorabilsin diye TTY ver
ssh -t ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "sudo bash ${APP_DIR}/deploy/_sunucu-kur.sh"
