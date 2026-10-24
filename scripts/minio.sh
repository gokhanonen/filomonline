#!/usr/bin/env bash
# Yerel MinIO (S3 uyumlu depolama) başlatıcı.
# Binary'ler tools/ içinde Go ile kaynaktan derlendi (dl.min.io topluluk binary'lerini
# artık sunmuyor). Veri ./.minio-data altında (gitignore'lu).
#
# Kullanım:  ./scripts/minio.sh
#   S3 API : http://localhost:9000
#   Konsol : http://localhost:9001  (kullanıcı/şifre: filomadmin / filomadmin)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-filomadmin}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-filomadmin}"

exec "$ROOT/tools/minio" server "$ROOT/.minio-data" \
  --address ":9000" --console-address ":9001"
