# Panduan Hardening Keamanan 1 VPS + 1 Database PostgreSQL (O2W HERO & Multi-Tenant)

Dokumen ini merupakan panduan teknis operasional dan konfigurasi keamanan untuk menjalankan **O2W HERO (Core SaaS)**, **UPS HERU**, dan puluhan tenant mitra lainnya secara aman dan terisolasi pada arsitektur **1 VPS + 1 Multi-Tenant PostgreSQL Database**.

---

## 1. PostgreSQL Row-Level Security (RLS) & Non-Superuser Role

### Masalah Keamanan Superuser
Dalam PostgreSQL, role berstatus `SUPERUSER` secara default **mengabaikan (bypass)** seluruh aturan Row-Level Security (RLS), meskipun tabel diberi instruksi `FORCE ROW LEVEL SECURITY`. Jika aplikasi Next.js/Prisma terhubung menggunakan akun `postgres` (superuser), RLS tidak akan aktif, sehingga isolasi antar tenant dapat runtuh.

### Solusi: Role Aplikasi Non-Superuser (`wastepay_app`)
Jalankan skrip SQL berikut di database produksi untuk membuat role khusus aplikasi yang tunduk 100% pada RLS:

```sql
-- 1. Buat role non-superuser khusus aplikasi
CREATE ROLE wastepay_app WITH LOGIN PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT_MINIMAL_32_KARAKTER';

-- 2. Berikan hak akses pada database dan skema
GRANT CONNECT ON DATABASE wastepay TO wastepay_app;
GRANT USAGE ON SCHEMA public TO wastepay_app;

-- 3. Berikan hak SELECT, INSERT, UPDATE, DELETE pada semua tabel yang ada
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wastepay_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO wastepay_app;

-- 4. Tetapkan hak akses otomatis untuk tabel baru di masa mendatang
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wastepay_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO wastepay_app;

-- 5. Kunci agar role wastepay_app WAJIB mengikuti RLS (tanpa celah bypass)
ALTER ROLE wastepay_app NOBYPASSRLS;

-- 6. Verifikasi status role
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'wastepay_app';
```

### Konfigurasi `.env` Aplikasi:
```env
# Koneksi aplikasi wajib menggunakan role non-superuser wastepay_app
DATABASE_URL="postgresql://wastepay_app:PASSWORD_KUAT@127.0.0.1:5432/wastepay?schema=public&connection_limit=20"
```

---

## 2. Reverse Proxy Caddy / Nginx: Anti-Spoofing & On-Demand TLS

Aplikasi Next.js berjalan di Docker container yang terikat ke `127.0.0.1:3000` (hanya dapat diakses secara lokal). Reverse proxy menangani terminasi SSL, rate limiting, dan sanitasi header.

### A. Konfigurasi Caddy (`/etc/caddy/Caddyfile`)
Caddy menyediakan **On-Demand TLS** otomatis untuk domain custom tenant mitra tanpa konfigurasi manual:

```caddy
{
    # On-demand TLS: Otomatis menerbitkan sertifikat Let's Encrypt untuk domain custom mitra
    on_demand_tls {
        ask http://127.0.0.1:3000/api/core/tenants/verify-domain
        interval 2m
        burst 5
    }
    email admin@o2whero.com
}

# 1. Core SaaS Platform & Wildcard Subdomain
o2whero.com, *.o2whero.com {
    encode gzip zstd

    # Header Keamanan
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # Proxy ke aplikasi Next.js
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
}

# 2. Pilot Tenant UPS HERU
upsheru.com, www.upsheru.com {
    encode gzip zstd

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
}

# 3. Custom Domain Tenant Mitra Lainnya (On-Demand TLS)
:443 {
    tls {
        on_demand
    }

    encode gzip zstd

    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
}
```

### B. Konfigurasi Nginx Alternatif (`/etc/nginx/sites-available/wastepay`)
```nginx
# Rate limiting zone per IP dan per Host (mencegah noisy neighbor)
limit_req_zone $binary_remote_addr zone=ip_limit:10m rate=15r/s;
limit_req_zone $host zone=tenant_limit:10m rate=100r/s;

server {
    listen 80;
    server_name o2whero.com *.o2whero.com upsheru.com *.upsheru.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name o2whero.com *.o2whero.com upsheru.com *.upsheru.com;

    ssl_certificate /etc/letsencrypt/live/o2whero.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/o2whero.com/privkey.pem;

    # Anti Noisy-Neighbor Rate Limiting
    limit_req zone=ip_limit burst=30 nodelay;
    limit_req zone=tenant_limit burst=150 nodelay;

    # Proteksi Host Header Spoofing
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. Firewall UFW & Isolasi Jaringan VPS

Database PostgreSQL dan Redis **TIDAK BOLEH** terekspos ke internet publik.

```bash
# 1. Reset aturan UFW ke default deny incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Izinkan hanya port publik penting
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Caddy/Nginx'
sudo ufw allow 443/tcp comment 'HTTPS Caddy/Nginx'

# 3. Pastikan port 5432 (Postgres) dan 6379 (Redis) TIDAK diizinkan dari luar
sudo ufw delete allow 5432/tcp 2>/dev/null || true
sudo ufw delete allow 6379/tcp 2>/dev/null || true

# 4. Aktifkan firewall
sudo ufw --force enable
sudo ufw status verbose
```

---

## 4. Perlindungan Docker Port Binding

Di `docker-compose.yml`, bind port **hanya** ke `127.0.0.1`:

```yaml
services:
  wastepay:
    container_name: wastepay-app
    ports:
      # BENAR (Hanya bisa diakses dari internal host)
      - "127.0.0.1:3000:3000"
      # SALAH (Bahaya: membypass UFW jika dipasang "3000:3000")
```

---

## 5. Otomatisasi Backup Terenkripsi Harian (pg_dump + GPG)

Buat skrip `/opt/scripts/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/wastepay"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/wastepay_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"
GPG_PASSPHRASE="PASSPHRASE_ENKRIPSI_BACKUP_SANGAT_AMAN"

mkdir -p "${BACKUP_DIR}"

# 1. Dump database PostgreSQL
docker exec -t wastepay-postgres pg_dump -U postgres wastepay | gzip > "${BACKUP_FILE}"

# 2. Enkripsi file backup dengan AES256
gpg --batch --yes --passphrase "${GPG_PASSPHRASE}" --symmetric --cipher-algo AES256 -o "${ENCRYPTED_FILE}" "${BACKUP_FILE}"
rm -f "${BACKUP_FILE}"

# 3. Hapus backup yang lebih tua dari 30 hari
find "${BACKUP_DIR}" -name "*.sql.gz.gpg" -type f -mtime +30 -delete

echo "[$(date)] Backup database berhasil disimpan dan dienkripsi: ${ENCRYPTED_FILE}"
```

Pasang di crontab:
```bash
0 2 * * * /opt/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
```
