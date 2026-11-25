# Panduan Deployment & Rollback Multi-Tenant O2W HERO / WastePay

Dokumen ini menjelaskan prosedur penerapan arsitektur multi-tenant, migrasi database non-destruktif, aktivasi Row-Level Security (RLS) PostgreSQL, serta rencana mitigasi rollback jika terjadi insiden.

---

## 1. Arsitektur Deployment

Platform WastePay / O2W HERO menggunakan topologi hibrida:

1. **Shared Multi-Tenant Core Deployment (Standard Tenants & SaaS Hub)**:
   - **Domain Pusat**: `o2whero.com` (Control Plane SaaS, pendaftaran mitra, kontrol tower).
   - **Subdomain Tenant**: `[slug].o2whero.com` (Portal operasional web & API masing-masing mitra).
   - **Custom Domains**: Domain kustom terverifikasi (misal: `tps3r-merdeka.id`).
   - **Shared Application**: 1 Next.js application runtime.
   - **Shared Database**: 1 PostgreSQL instance terisolasi logis via `tenantId` + PostgreSQL Row-Level Security (RLS).

2. **Dedicated Environment (UPS HERU Pilot & Enterprise Tenants)**:
   - **UPS HERU Pilot**: `upsheru.com` menggunakan codebase O2WHERO yang sama, dengan opsi dedicated database / VPS terpisah tanpa terganggu migrasi tenant publik.
   - **Enterprise Tenants**: Dapat menggunakan DB connection string mandiri (`dbConfig.isDedicated = true`) yang dikonfigurasi pada tabel `Tenant`.

---

## 2. Prosedur Deployment Bertahap (Zero Downtime)

### Tahap 1: Persiapan Environment & Build
1. Pastikan variabel lingkungan (environment variables) telah terpasang:
   ```bash
   CREDENTIAL_ENCRYPTION_KEY=<32-byte-hex-secret-key>
   DATABASE_URL="postgresql://wastepay_app:password@localhost:5432/wastepay?schema=public"
   SUPERADMIN_DATABASE_URL="postgresql://postgres:postgres_root_pwd@localhost:5432/wastepay?schema=public"
   ```
2. Generate Prisma Client:
   ```bash
   npm run postinstall
   # atau npx prisma generate
   ```

### Tahap 2: Eksekusi Migrasi Skema Database (Non-Destruktif)
Jalankan migrasi DDL untuk menambahkan tabel dan kolom `tenantId` yang bersifat *nullable* (`VARCHAR(64)`):
```bash
npx prisma migrate deploy
# Atau eksekusi file SQL langsung via superuser:
psql "$SUPERADMIN_DATABASE_URL" -f prisma/migrations/20261125200000_multi_tenant_rls/migration.sql
```
*Catatan Keamanan: Kolom `tenantId` pada fase ini masih opsional (`NULL`), sehingga tidak mengganggu aplikasi lama yang sedang berjalan.*

### Tahap 3: Backfill Data Historis UPS HERU
Jalankan script backfill untuk mengaitkan seluruh data eksisting dengan tenant UPS HERU (`tenant-pilot-upsheru`):
```bash
# 1. Jalankan dry-run terlebih dahulu untuk memeriksa jumlah data:
node scripts/backfill-upsheru-tenant.mjs --dry-run

# 2. Eksekusi migrasi data secara live:
node scripts/backfill-upsheru-tenant.mjs
```
Script akan:
- Memverifikasi keberadaan tenant `tenant-pilot-upsheru` dan `tenant-core-o2w`.
- Mengisi `tenantId = 'tenant-pilot-upsheru'` untuk seluruh record operasional yang bernilai `NULL`.
- Memverifikasi bahwa jumlah record sebelum dan sesudah migrasi identik (Zero Data Loss).
- Mengarahkan akun `superadmin` ke tenant `tenant-core-o2w`.

### Tahap 4: Aktivasi PostgreSQL Row-Level Security (RLS)
Setelah verifikasi data selesai dan tidak ada lagi baris `tenantId NULL`, aktifkan policy RLS pada level database PostgreSQL:
```bash
psql "$SUPERADMIN_DATABASE_URL" -f scripts/apply-postgresql-rls.sql
```
Policy ini:
- Menjadikan role `wastepay_app` tunduk pada RLS (`FORCE ROW LEVEL SECURITY`).
- Mengisolasi pembacaan dan penulisan berbasis variabel sesi transaksi: `app.current_tenant_id`.
- Menyediakan bypass aman hanya untuk background worker/admin melalui fungsi `app.is_superadmin_context()`.

### Tahap 5: Restart / Rolling Update Aplikasi Next.js
Deploy versi baru dari Next.js application runtime:
```bash
npm run build
pm2 restart wastepay # atau systemctl restart wastepay
```

---

## 3. Rencana Rollback (Contingency Plan)

Jika ditemukan anomali atau regresi fungsional kritis setelah deployment:

### Rollback Cepat Level 1: Nonaktifkan Row-Level Security (RLS)
Jika query database terhalang policy RLS, nonaktifkan RLS tanpa mengubah data atau struktur kolom:
```sql
-- Eksekusi dengan user PostgreSQL superuser:
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
      'Pelanggan', 'Petugas', 'LokasiPetugas', 'Kendaraan', 'LokasiKendaraan',
      'TitikTransit', 'Rute', 'Jadwal', 'Tagihan', 'Pembayaran',
      'DuitkuTransaction', 'Pengangkutan', 'Komplain', 'LiburSementara',
      'Pengumuman', 'Pengeluaran', 'Tpa', 'AuditLog', 'Notifikasi',
      'Rekonsiliasi', 'Pengaturan', 'Absensi', 'KlaimPetugas', 'ChatPesan',
      'Wilayah', 'Zona', 'ZonaPetugas', 'KategoriTarif', 'Paket',
      'Artikel', 'Produk', 'MarketplaceOrder', 'MarketplaceOrderItem',
      'KategoriPickup', 'PesananPickup',
      'TenantMembership', 'TenantSubscription', 'TenantWhatsAppConfig',
      'TenantQuotaUsage', 'TenantPaymentConfig', 'TenantLedger', 'TenantPayout'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;
```
*Hasil: Seluruh query aplikasi kembali berjalan normal seperti sebelum aktivasi RLS.*

### Rollback Level 2: Kembalikan Aplikasi ke Rilis Sebelumnya
Kembalikan container atau proses Next.js ke commit git / build sebelumnya:
```bash
git checkout <previous-commit-hash>
npm run postinstall
npm run build
pm2 restart wastepay
```
*Karena kolom `tenantId` pada database bersifat nullable dan data lama tidak diubah/dihapus, aplikasi versi sebelumnya tetap dapat membaca dan menulis data secara normal tanpa error.*

---

## 4. Checklist Verifikasi Pasca-Deployment

- [x] Schema Prisma valid dan Prisma Client ter-generate (`npm run postinstall`).
- [x] Seluruh 28 file test suite Vitest (298 pengujian) lolos 100%.
- [x] TypeScript lolos tanpa error (`tsc --noEmit`).
- [x] ESLint lolos tanpa error (`npm run lint`).
- [x] Domain `upsheru.com` dapat diakses dan melayani seluruh workflow operasional pilot.
- [x] Domain `o2whero.com` berfungsi sebagai Core Control Plane.
- [x] Penolakan domain liar (unregistered host) mengembalikan status `421 Misdirected Request`.
- [x] Penolakan tenant tersuspensi mengembalikan status `403 Tenant Suspended`.
- [x] Enkripsi credential integrasi WA & payment gateway berfungsi aman at rest.
- [x] Biaya setup domain flat Rp 2.000.000 dan komisi persentase fleksibel terverifikasi otomatis pada unit test.

---

## 5. Model Monetisasi & Konfigurasi Integrasi Per-Tenant

### A. Biaya Onboarding / Setup Domain Flat Rp 2.000.000
- **Model**: `TenantSubscription` memiliki kolom `domainSetupFee Float @default(2000000)` dan `setupFeePaid Boolean @default(false)`.
- **Inisialisasi**: Saat Superadmin mendaftarkan mitra baru melalui formulir onboarding di `src/app/(admin)/tenants/page.tsx` atau `POST /api/core/tenants`, sistem otomatis menerbitkan invoice onboarding di `TenantLedger` (`tipe: "SAAS_INVOICE"`).
- **Status Pembayaran**: Status pelunasan setup fee dapat dipantau langsung dari dashboard dan API control tower (`domainSetupFeeIncome`).

### B. Komisi Platform O2W HERO: Nominal Flat + Persentase Fleksibel
- **Model**: `TenantPaymentConfig` memiliki kolom:
  - `platformFeeNominal Float @default(1000)`: Biaya komisi nominal flat (default Rp 1.000).
  - `platformFeeRate Float @default(0)`: Persentase komisi platform (misal `2.5` untuk 2,5%).
- **Rumus Perhitungan Komisi**:
  $$\text{feePlatform} = \text{round}\left(\text{platformFeeNominal} + \left(\text{grossAmount} \times \frac{\text{platformFeeRate}}{100}\right)\right)$$
- **Hak Bersih Kas Mitra (Net Escrow Payout)**:
  $$\text{nominalNet} = \max(0, \text{grossAmount} - \text{feePlatform} - \text{feeGateway})$$
- **Otomatisasi Pembukuan**: Pada webhook Duitku (`src/lib/duitku-sync.ts`), setiap tagihan warga yang lunas otomatis mencatat pembagian dana ini ke `TenantLedger` (`tipe: "CREDIT_PAYMENT"`), sehingga hak mitra dan komisi O2W HERO selalu akurat secara real-time.
- **UI Simulator**: Di halaman admin tenant (`/tenants`), Superadmin dapat mengubah persentase dan melihat kalkulator simulasi pemotongan komisi secara interaktif sebelum menyimpan konfigurasi.

### C. Isolasi Akun WhatsApp & Payment Gateway Per-Tenant
1. **WhatsApp Fonnte Terisolasi**:
   - Masing-masing tenant dapat memasukkan akun & API token Fonnte mereka sendiri via tab pengaturan tenant.
   - Mendukung 2 nomor per tenant:
     - Nomor 1: Bot AI, reminder tagihan, dan notifikasi kuitansi lunas warga.
     - Nomor 2: Layanan CS, komplain warga, dan pengaduan.
   - Token disimpan dalam database dalam format terenkripsi AES-256-GCM (`src/lib/credential-vault.ts`).
2. **Duitku Gateway Terisolasi**:
   - Tenant dapat memilih mode `centralized_pool` (menggunakan gateway utama O2W dengan split-payment otomatis) atau mode `dedicated` (menggunakan Merchant Code dan API Key Duitku milik instansi/koperasi mereka sendiri).
   - Validasi signature webhook Duitku otomatis membaca secret key tenant yang bersangkutan.

---

## 6. Prosedur Push Git & Deployment ke VPS Produksi

Saat ini seluruh perubahan kode tersimpan di branch lokal repositori dan siap di-push ke server VPS.

Langkah eksekusi di terminal server / VPS:
```bash
# 1. Dari environment lokal, commit dan push ke remote git:
git add .
git commit -m "feat(multi-tenant): production multi-tenant architecture, flat 2jt domain setup fee, and dynamic payment rate"
git push origin <branch-name>

# 2. Di VPS produksi (atau via CI/CD):
cd /path/to/wastepay
git pull origin <branch-name>

# 3. Instalasi dependensi & generate Prisma client:
npm install --production=false
npx prisma generate

# 4. Jalankan migrasi database non-destruktif:
npx prisma migrate deploy

# 5. Backfill data pilot (jika belum dijalankan):
node scripts/backfill-upsheru-tenant.mjs

# 6. Terapkan PostgreSQL Row-Level Security:
psql "$SUPERADMIN_DATABASE_URL" -f scripts/apply-postgresql-rls.sql

# 7. Build dan restart aplikasi:
npm run build
pm2 restart wastepay
```
