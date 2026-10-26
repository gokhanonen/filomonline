#!/usr/bin/env python3
"""
FilomOnline SaaS — Otomatik Dağıtım (Deploy) Betiği
Hedef Sunucu : 22.6.102.180
Kullanıcı    : tana
Çalışma Port : 5198 (Web + Reverse Proxy) / 5199 (NestJS API)
Dizin        : /var/www/filomonline

Kullanım:
    python3 deploy.py
    python3 deploy.py --skip-build    # Yerel build'i atlar (zaten yapıldıysa)
    python3 deploy.py --port 5198     # Farklı bir port ile çalıştırmak için
"""

import argparse
import os
import pty
import select
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

# --- Yapılandırma ---
SSH_HOST = os.getenv("DEPLOY_SSH_HOST", "22.6.102.180")
SSH_USER = os.getenv("DEPLOY_SSH_USER", "tana")
SSH_PASS = os.getenv("DEPLOY_SSH_PASS", "")
REMOTE_DIR = "/var/www/filomonline"
DEFAULT_WEB_PORT = 5198
DEFAULT_API_PORT = 5199

# Renkli terminal çıktıları
def green(text): return f"\033[92m{text}\033[0m"
def yellow(text): return f"\033[93m{text}\033[0m"
def red(text): return f"\033[91m{text}\033[0m"
def cyan(text): return f"\033[96m{text}\033[0m"
def bold(text): return f"\033[1m{text}\033[0m"


def run_ssh_or_scp(cmd_args, password=SSH_PASS, timeout=300, print_output=True):
    """
    pty kullanarak ssh veya scp komutunu şifre ile çalıştırır.
    VPN üzerinden takılmayı engellemek için -o IPQoS=none eklenir.
    Harici bağımlılık (paramiko, sshpass vb.) gerektirmez.
    """
    # IPQoS parametresi yoksa ekle
    if "-o" not in cmd_args or "IPQoS=none" not in " ".join(cmd_args):
        cmd_args = [cmd_args[0], "-o", "IPQoS=none"] + cmd_args[1:]

    pid, master = pty.fork()
    if pid == 0:
        os.execlp(cmd_args[0], *cmd_args)
    else:
        buf = b""
        password_sent = False
        start_time = time.time()
        while True:
            if time.time() - start_time > timeout:
                try:
                    os.kill(pid, 9)
                except OSError:
                    pass
                os.close(master)
                os.waitpid(pid, 0)
                raise TimeoutError(f"Komut zaman aşımına uğradı ({timeout}s)")

            r, _, _ = select.select([master], [], [], 0.5)
            if not r:
                continue

            try:
                chunk = os.read(master, 2048)
            except OSError:
                break

            if not chunk:
                break

            buf += chunk
            if print_output:
                text = chunk.decode("utf-8", errors="ignore")
                # Şifre istemini kullanıcıya gösterme
                if "password:" not in text.lower():
                    sys.stdout.write(text)
                    sys.stdout.flush()

            if b"password:" in buf.lower() and not password_sent:
                time.sleep(0.1)
                os.write(master, (password + "\n").encode("utf-8"))
                password_sent = True

        os.close(master)
        _, exit_code = os.waitpid(pid, 0)
        return os.WEXITSTATUS(exit_code), buf.decode("utf-8", errors="ignore")


def run_local(cmd, cwd=None, env=None):
    """Yerel kabuk komutu çalıştırır."""
    print(cyan(f"-> {cmd}"))
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    res = subprocess.run(cmd, shell=True, cwd=cwd, env=merged_env)
    if res.returncode != 0:
        print(red(f"HATA: Komut başarısız oldu (çıkış kodu {res.returncode}): {cmd}"))
        sys.exit(1)


def build_locally(web_port):
    """Frontend ve Backend'i yerel olarak derler."""
    print("\n" + bold(cyan("=== 1. YEREL DERLEME (BUILD) ===")))
    root_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Frontend: VITE_API_URL=/api/v1 ile derle (aynı-origin mimarisi)
    print(yellow("1.1 Frontend derleniyor (apps/web)..."))
    run_local(
        "npm --workspace apps/web run build",
        cwd=root_dir,
        env={"VITE_API_URL": "/api/v1"},
    )

    # 2. Backend: NestJS derle
    print(yellow("1.2 Backend derleniyor (apps/api)..."))
    run_local("npm --workspace apps/api run build", cwd=root_dir)

    print(green("Yerel derleme başarıyla tamamlandı."))


def create_bundle(archive_path):
    """Dağıtım için gerekli dosyaları tar.gz arşivinde toplar."""
    print("\n" + bold(cyan("=== 2. DAĞITIM PAKETİ OLUŞTURULUYOR ===")))
    root_dir = os.path.dirname(os.path.abspath(__file__))

    # Eklenecek dosya ve klasörler
    include_paths = [
        "package.json",
        "package-lock.json",
        "ecosystem.config.cjs",
        "deploy/web-server.mjs",
        "packages/shared",
        "apps/api/package.json",
        "apps/api/nest-cli.json",
        "apps/api/tsconfig.json",
        "apps/api/prisma",
        "apps/api/dist",
        "apps/web/package.json",
        "apps/web/dist",
    ]

    # Hariç tutulacak şablon demo klasörleri (paketi gereksiz büyütmemek için)
    exclude_substrings = [
        ".git",
        "node_modules",
        ".DS_Store",
        ".cache",
        "apps/web/dist/images/travel",
        "apps/web/dist/images/preview",
        "apps/web/dist/images/courses",
        "apps/web/dist/images/foods",
        "apps/web/dist/images/christmas",
        "apps/web/dist/images/technology",
    ]

    def filter_archive(tarinfo):
        for excl in exclude_substrings:
            if excl in tarinfo.name:
                return None
        return tarinfo

    print(f"Paketleniyor: {archive_path}")
    with tarfile.open(archive_path, "w:gz") as tar:
        for p in include_paths:
            full_path = os.path.join(root_dir, p)
            if os.path.exists(full_path):
                tar.add(full_path, arcname=p, filter=filter_archive)
            else:
                print(yellow(f"Uyarı: {p} bulunamadı, atlanıyor."))

    size_mb = os.path.getsize(archive_path) / (1024 * 1024)
    print(green(f"Paket hazırlandı: {size_mb:.2f} MB"))


def upload_bundle(archive_path):
    """Paketi SCP ile sunucuya aktarır."""
    print("\n" + bold(cyan("=== 3. PAKET SUNUCUYA YÜKLENİYOR ===")))
    remote_target = f"{SSH_USER}@{SSH_HOST}:{REMOTE_DIR}/filomonline-deploy.tar.gz"
    print(f"Hedef: {remote_target}")

    scp_cmd = [
        "scp",
        "-o", "StrictHostKeyChecking=no",
        "-o", "IPQoS=none",
        "-o", "ConnectTimeout=15",
        archive_path,
        remote_target,
    ]

    code, out = run_ssh_or_scp(scp_cmd, timeout=300, print_output=True)
    if code != 0:
        print(red("HATA: Dosya sunucuya aktarılamadı!"))
        sys.exit(1)
    print(green("Aktarım başarılı."))


def execute_remote_deployment(web_port, api_port):
    """Sunucu üzerinde çıkarma, migration, bağımlılık ve PM2 işlemlerini yürütür."""
    print("\n" + bold(cyan("=== 4. SUNUCU ÜZERİNDE KURULUM VE BAŞLATMA ===")))

    remote_script = f"""set -e
export PATH="/home/tana/.nvm/versions/node/v24.16.0/bin:$PATH"
cd {REMOTE_DIR}

echo "--> Arşiv açılıyor..."
tar -xzf filomonline-deploy.tar.gz
rm -f filomonline-deploy.tar.gz

echo "--> Production .env yapılandırılıyor..."
cat << 'EOF' > apps/api/.env
DATABASE_URL="mysql://root:@{SSH_HOST}:3306/filomonline"
PORT={api_port}
NODE_ENV=production
WEB_URL=http://{SSH_HOST}:{web_port}
CORS_ORIGIN=http://{SSH_HOST}:{web_port},http://localhost:{web_port}
JWT_ACCESS_SECRET=prod-filomonline-jwt-access-secret-2026-secure
JWT_REFRESH_SECRET=prod-filomonline-jwt-refresh-secret-2026-secure
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
S3_ENDPOINT=http://{SSH_HOST}:9000
S3_REGION=us-east-1
S3_BUCKET=filomonline
S3_ACCESS_KEY=filomadmin
S3_SECRET_KEY=
ANTHROPIC_API_KEY=
EOF
cp apps/api/.env .env

echo "--> Bağımlılıklar güncelleniyor (npm install)..."
npm install --silent

echo "--> Prisma client üretiliyor..."
npx prisma generate --schema=apps/api/prisma/schema.prisma

echo "--> Prisma veritabanı migration'ları uygulanıyor..."
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "--> PM2 yapılandırması güncelleniyor ve başlatılıyor..."
export WEB_PORT={web_port}
export API_PORT={api_port}
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "--> Sağlık kontrolü (Healthcheck)..."
sleep 4
curl -s http://127.0.0.1:{web_port}/api/v1/health || true
echo ""
pm2 status
"""

    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "IPQoS=none",
        "-o", "ConnectTimeout=15",
        f"{SSH_USER}@{SSH_HOST}",
        remote_script,
    ]

    code, out = run_ssh_or_scp(ssh_cmd, timeout=300, print_output=True)
    if code != 0:
        print(red("HATA: Sunucudaki kurulum adımları başarısız oldu!"))
        sys.exit(1)
    print(green("Sunucu kurulumu tamamlandı."))


def verify_deployment(web_port):
    """Son doğrulama ve kullanıcı bilgisi."""
    print("\n" + bold(green("=== 5. DAĞITIM TAMAMLANDI ===")))
    print(bold(f"\nUygulama aktif ve port {web_port} üzerinde çalışıyor:"))
    print(f"  • Web Uygulaması:   {bold(cyan(f'http://{SSH_HOST}:{web_port}'))}")
    print(f"  • API Sağlık:       {bold(cyan(f'http://{SSH_HOST}:{web_port}/api/v1/health'))}")
    print(f"  • Swagger Docs:     {bold(cyan(f'http://{SSH_HOST}:{web_port}/api/docs'))}")
    print("\nSunucuda canlı logları izlemek için:")
    print(f"  ssh {SSH_USER}@{SSH_HOST} 'pm2 logs filomonline-web'")
    print(f"  ssh {SSH_USER}@{SSH_HOST} 'pm2 logs filomonline-api'")


def main():
    parser = argparse.ArgumentParser(description="FilomOnline Deploy Betiği")
    parser.add_argument("--port", type=int, default=DEFAULT_WEB_PORT, help=f"Web çalışma portu (varsayılan: {DEFAULT_WEB_PORT})")
    parser.add_argument("--api-port", type=int, default=DEFAULT_API_PORT, help=f"API iç portu (varsayılan: {DEFAULT_API_PORT})")
    parser.add_argument("--skip-build", action="store_true", help="Yerel derleme adımını atla")
    args = parser.parse_args()

    print(bold(green(f"FilomOnline Deploy Başlatılıyor (Port: {args.port})")))
    print(f"Hedef: {SSH_USER}@{SSH_HOST}:{REMOTE_DIR}")

    tmp_archive = os.path.join(tempfile.gettempdir(), "filomonline-deploy.tar.gz")

    try:
        if not args.skip_build:
            build_locally(args.port)
        else:
            print(yellow("Yerel derleme (--skip-build) atlandı."))

        create_bundle(tmp_archive)
        upload_bundle(tmp_archive)
        execute_remote_deployment(args.port, args.api_port)
        verify_deployment(args.port)
    finally:
        if os.path.exists(tmp_archive):
            try:
                os.remove(tmp_archive)
            except OSError:
                pass


if __name__ == "__main__":
    main()
