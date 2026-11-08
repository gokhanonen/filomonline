#!/usr/bin/env bash
# Prod DB yedeği (mysqldump). Parolayı apps/api/.env'den okur, ASLA ekrana yazmaz.
# Çıktı: backups/filomonline_<timestamp>.sql
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups

TS="$(date +%Y%m%d_%H%M%S)" node -e '
const fs = require("fs");
const { spawnSync } = require("child_process");
const env = fs.readFileSync("apps/api/.env", "utf8");
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error("DATABASE_URL bulunamadi"); process.exit(1); }
const url = m[1].trim().replace(/^"|"$/g, "");
const u = new URL(url);
const out = "backups/filomonline_" + process.env.TS + ".sql";
const fd = fs.openSync(out, "w");
const r = spawnSync("mysqldump", [
  "-h", u.hostname, "-P", u.port || "3306",
  "-u", decodeURIComponent(u.username),
  "--single-transaction", "--no-tablespaces", "--routines",
  decodeURIComponent(u.pathname.slice(1)),
], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) }, stdio: ["ignore", fd, "inherit"] });
fs.closeSync(fd);
if (r.error) { console.error("mysqldump calismadi:", r.error.message); process.exit(1); }
if (r.status !== 0) { console.error("mysqldump exit", r.status); process.exit(r.status || 1); }
const sz = fs.statSync(out).size;
console.log("BACKUP-OK", out, sz, "bytes");
'
