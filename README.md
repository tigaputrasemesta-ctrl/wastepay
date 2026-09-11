# UPS HERU - SISTEM MANAJEMEN PENGELOLAAN SAMPAH 🚛♻️

[![Production Status](https://img.shields.io/badge/Production-Live%20on%20Vercel-success.svg)](https://tpsheru.vercel.app)
[![Framework](https://img.shields.io/badge/Next.js-16.2%20(App%20Router)-black.svg)](https://nextjs.org)
[![UI Engine](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Database](https://img.shields.io/badge/Prisma%207-PostgreSQL%20(Supabase)-38bdf8.svg)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178c6.svg)](https://www.typescriptlang.org)
[![Testing](https://img.shields.io/badge/Vitest-59%2F59%20Passing-green.svg)](#pengujian-otomatis)

**UPS HERU** (*Unit Pengolahan Sampah HERU*) adalah platform web enterprise fullstack terpadu untuk digitalisasi dan otomasi operasional pengelolaan sampah di Kota Depok. Sistem ini mencakup siklus harian lengkap: **pendaftaran mandiri warga → survei lokasi ber-geotag → penjadwalan & rute armada truk → penagihan bulanan & denda otomatis → pembayaran online (Duitku) & tunai kasir → pelacakan live GPS armada → tiket pengaduan komplain → rekonsiliasi kas fisik vs sistem → notifikasi WhatsApp**.

---

## 📍 Identitas Resmi Operasional

- **Entitas**: UPS HERU (Unit Pengolahan Sampah HERU)
- **Kantor Operasional & UPS**: Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414
- **Koordinat GIS**: `-6.424838, 106.832667`
- **WhatsApp Resmi**: [+62 814-0078-2617](https://wa.me/6281400782617)
- **Email Dukungan**: [cv.herozerowaste@gmail.com](mailto:cv.herozerowaste@gmail.com)
- **Website Resmi**: [https://tpsheru.vercel.app](https://tpsheru.vercel.app)

---

## 🔄 Alur Siklus Bisnis Sistem

```text
[Warga Daftar di Web (/daftar)]
            │
            ▼
[Petugas Survei Geotag Lokasi & Verifikasi (/survei)]
            │
            ▼
[Generate Tagihan Bulanan + Nomor Invoice Unik (INV/...)]
            │
            ├──────────────────────────┐
            ▼                          ▼
 [Bayar Online via Duitku]     [Bayar Tunai ke Petugas/Kasir]
   (QRIS/VA/E-Wallet Lunas)       (Kasir Verifikasi & Catat Uang)
            │                          │
            └─────────────┬────────────┘
                          ▼
            [Kwitansi & Faktur Digital Terbit]
            [Penjemputan Sampah Harian via Truk GPS]
            [Rekonsiliasi Kas Harian & Laporan Laba Rugi]
```

---

## 🛠️ Stack Teknologi & Arsitektur

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 16.2 (App Router + Turbopack) | Server Components (RSC) & Server Actions untuk kecepatan maksimal |
| **UI Library** | React 19 & Tailwind CSS 3.4 | Desain kustom Neo-Brutalist & Swiss Grid (tanpa bloat library eksternal) |
| **Bahasa Pemrograman** | TypeScript 5 (Strict Mode) | Validasi tipe data end-to-end tanpa toleransi error |
| **ORM & Database** | Prisma 7.9.0 via `@prisma/adapter-pg` | PostgreSQL (Supabase Connection Pooler, Serverless-ready) |
| **Autentikasi** | JWT (`jose` HS256) & `bcryptjs` | Sesi berbasis cookie `httpOnly`, `secure`, `sameSite=lax` (7 hari expiry) |
| **Otorisasi & RBAC** | Middleware `src/proxy.ts` | Arsitektur *fail-closed* 4-tingkat role |
| **Payment Gateway** | Duitku Payment API | Mendukung QRIS, Virtual Account, E-Wallet, dan live status check |
| **Notifikasi Gateway** | WhatsApp Provider API & wa.me | Broadcast pengingat tagihan, kwitansi, dan pemberitahuan komplain |
| **Aplikasi Mobile** | Capacitor 6.0 | Wrapper webview untuk Android APK (`/m` interface) |
| **Pengujian** | Vitest 4.1 | Unit testing komprehensif logika bisnis dan keamanan |

---

## 🚀 Fitur Lengkap Aplikasi

### 1. Portal Publik (Warga & Pelanggan)
- **Landing Page Interaktif (`/`)**: Desain Neo-Brutalist modern dengan animasi truk sampah, transparansi layanan, estimasi kalkulator tarif, dan kontak resmi.
- **Pendaftaran Warga Baru (`/daftar`)**: Form pendaftaran mandiri dengan pencocokan otomatis anchor wilayah (Kelurahan & RT/RW di Depok) dan proteksi rate limit.
- **Pembayaran Tagihan Digital (`/bayar-tagihan?invoice=...`)**: Kartu tagihan bergaya modern (skylite pattern). Warga dapat langsung memilih metode pembayaran online via Duitku (QRIS, OVO, ShopeePay, Virtual Account) atau upload struk manual.
- **Faktur Retribusi Printable (`/invoice-tagihan?invoice=...`)**: Lembar faktur retribusi standar resmi ukuran A4 siap cetak (`window.print()`) lengkap dengan QR code verifikasi keabsahan, rincian PPN 11%, dan tanda tangan digital bendahara.
- **Pelacakan Armada Truk Sampah (`/lacak`)**: Peta live monitoring posisi armada penjemput sampah secara real-time seperti ojek online.
- **Lapor Cepat & Komplain (`/pengaduan`)**: Form aduan sampah menumpuk atau terlewat disertai upload foto bukti dan lokasi koordinat GPS.
- **Transparansi Tarif (`/tarif`)**: Daftar tarif retribusi sampah transparan per level kategori.

### 2. Portal Admin & Kasir (Control Panel)
- **Lonceng Notifikasi Real-time (`NotificationBell`)**: Komponen header interaktif yang otomatis menyegarkan data setiap 30 detik:
  - 💳 **Pembayaran Pending**: Jumlah transfer yang butuh verifikasi struk kasir.
  - 📋 **Calon Warga Baru**: Pendaftaran mandiri yang butuh disurvei.
  - ⚠️ **Komplain Baru**: Laporan sampah warga yang butuh penanganan segera.
- **Dashboard Eksekutif (`/dashboard`)**: Metrik KPI bulan berjalan, grafik perbandingan pemasukan vs pengeluaran 6 bulan terakhir (Pure CSS tanpa charting library berat), dan daftar top tunggakan.
- **Manajemen Pelanggan (`/pelanggan`, `/pelanggan/[id]`)**: CRUD 2.000+ pelanggan, override custom tarif, riwayat invoice, foto rumah, dan ekstraksi koordinat GPS otomatis dari data EXIF kamera HP.
- **Billing & Tagihan Massal (`/tagihan`)**: Generate massal tagihan bulanan satu klik, perhitungan denda otomatis 2%/bulan keterlambatan, dan pencatatan pembayaran tunai di loket.
- **Cetak Massal Surat Tagihan (`/tagihan-cetak`)**: Lembar tagihan cetak fisik per RT yang rapi untuk dibawa petugas penagih ke rumah warga.
- **Cetak Stiker Barcode (`/sticker`)**: Cetak stiker label ukuran A6 ber-barcode CODE128 untuk ditempel di pagar/tong sampah rumah pelanggan.
- **Peta Operasional GIS (`/peta`, `/peta/tv`)**:
  - Zonasi Voronoi dari 63 titik RT RTRW Depok.
  - Garis rute pengangkutan algoritma *nearest-neighbor*.
  - Pemantauan posisi live GPS petugas dan armada dump truck di lapangan.
- **Manajemen Petugas & 3 Jabatan (`/petugas`)**:
  - 🚛 **Petugas Angkut**: Bertugas mengambil sampah sesuai rute dan memancarkan GPS.
  - 💵 **Petugas Tagih**: Menagih iuran tunai di wilayahnya (`?saya=1`) untuk rekonsiliasi kas.
  - 📸 **Petugas Survei**: Memvalidasi lokasi rumah calon pelanggan baru (`/survei`).
- **Penjadwalan & Rute (`/rute`, `/jadwal`)**: Pengelompokan jalur ritase truk per hari dan jam operasional.
- **Manajemen Pengangkutan (`/pengangkutan`)**: Pencatatan ritase sampah (volume m³, berat kg, jenis sampah, foto bukti pengambilan).
- **Pusat Komplain Warga (`/komplain`)**: Tindak lanjut komplain, penugasan petugas, dan kirim tanggapan langsung ke WhatsApp pelapor.
- **Pengeluaran Operasional (`/pengeluaran`)**: Pembukuan biaya BBM armada, servis truk, gaji kru, dan retribusi pembuangan TPA.
- **Rekonsiliasi Kas Harian (`/rekonsiliasi`)**: Audit fisik uang tunai di laci kasir terhadap uang masuk di sistem guna mencegah selisih atau kebocoran dana.
- **Laporan Finansial (`/laporan`)**: Rekapitulasi laba rugi, buku besar arus kas, dan ekspor data CSV.
- **Manajemen User & Audit Log (`/users`, `/audit-log`)**: Kelola hak akses akun dan rekam jejak digital setiap aksi (create, update, delete) untuk akuntabilitas.

### 3. Portal Mobile Petugas Lapangan (`/m` & APK)
- Antarmuka webview ultra-ringan khusus perangkat smartphone petugas di lapangan.
- Daftar tugas penjemputan per rumah (`/m`) dengan tombol satu-klik "Sudah Diangkut", "Rumah Kosong", atau "Akses Tertutup".
- Pelacakan background GPS bawaan untuk memperbarui posisi armada ke server.

---

## 🔒 Sistem Keamanan (Defense-in-Depth)

1. **Proxy RBAC Fail-Closed**: Seluruh rute API diproteksi di [`src/proxy.ts`](./src/proxy.ts). Setiap route yang tidak terdaftar eksplisit di whitelist otomatis ditolak (`403 Forbidden`).
2. **Hierarki 4 Level Role**:
   - `superadmin` (Level 100): Akses penuh termasuk User Management dan Audit Log.
   - `admin` (Level 50): Akses ke seluruh operasional bisnis, armada, dan pengaturan.
   - `kasir` (Level 20): Akses ke Dashboard, Tagihan, Laporan, dan Notifikasi.
   - `petugas` (Level 10): Akses terbatas ke Pengangkutan, Jadwal, Peta, dan Komplain.
3. **Perlindungan Mutasi CSRF**: Validasi header `Origin` dan `Referer` pada semua request mutasi (`POST`/`PUT`/`DELETE`) yang membawa cookie sesi.
4. **Validasi Signature Gateway Duitku**: Callback pembayaran diverifikasi menggunakan hashing kriptografi **HMAC-SHA256** (`merchantCode + amount + merchantOrderId + apiKey`).
5. **Anti-IDOR & OrderId Acak**: Order ID transaksi pembayaran dibuat acak ber-entropy tinggi (`DW-{pembayaranId}-{timestamp}`) untuk mencegah enumerasi tagihan.
6. **Rate Limiting Ketat**: Pembatasan percobaan login (maksimal 6 kali per 15 menit) dan pengaduan publik untuk memitigasi serangan brute-force dan spam bot.
7. **Soft Delete**: Data Pelanggan, Petugas, Tagihan, dan Pengangkutan menggunakan kolom `deletedAt` sehingga histori keuangan tetap utuh.

---

## 📁 Struktur Direktori Codebase

```text
wastepay/
├── .agents/                    # Konfigurasi Kognitif Claude & Skills Spesialis AGY
│   ├── rules/                  # Aturan penalaran, web app, & coding standards
│   └── skills/                 # 18 Modular skills (Prisma, React, Security, TDD, dll)
├── android/                    # Konfigurasi project Capacitor Android Native
├── prisma/
│   ├── schema.prisma           # 19 Data Models PostgreSQL
│   └── migrations/             # Riwayat migrasi database
├── public/                     # Asset statis, logo, icon, dan APK Android
├── scripts/                    # Script otomatisasi, seed, dan cron billing WA
├── src/
│   ├── app/
│   │   ├── (admin)/            # 20 Halaman operasional Admin & Kasir
│   │   ├── (public)/           # Portal warga (daftar, bayar, lacak, tarif, komplain)
│   │   ├── api/                # 50+ Endpoint REST API Next.js Route Handlers
│   │   │   └── notifikasi/summary/ # API Ringkasan Notifikasi Real-time
│   │   ├── invoice-tagihan/    # Halaman faktur A4 printable
│   │   ├── m/                  # Portal mobile khusus kru lapangan
│   │   └── layout.tsx, page.tsx
│   ├── components/             # Komponen UI Neo-Brutalist (NotificationBell, Peta, dsb)
│   ├── lib/                    # Business logic (auth, prisma, duitku, wa, invoice, rbac)
│   └── proxy.ts                # Middleware fail-closed keamanan utama
├── tests/                      # Suite pengujian Vitest (59 unit tests)
├── AGENTS.md / GEMINI.md       # Root Agent Directives
└── README.md                   # Dokumentasi Utama Sistem
```

---

## ⚙️ Variabel Lingkungan (`.env`)

```env
# Database PostgreSQL (Supabase Connection Pooler)
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"

# Keamanan JWT
JWT_SECRET="kunci-rahasia-jwt-produksi-minimal-32-karakter"

# Duitku Payment Gateway (Opsional untuk pembayaran online)
DUITKU_MERCHANT_CODE="D12345"
DUITKU_API_KEY="api_key_dari_dashboard_duitku"
DUITKU_IS_PRODUCTION="true"

# WhatsApp Provider Gateway (Fonnte / WhatsApp API)
WA_API_KEY="token_whatsapp_provider"
WA_API_URL="https://api.fonnte.com/send"
ADMIN_PHONE="081400782617"
WA_BLAST_DELAY_MS="1200"

# Domain & Identitas Aplikasi
NEXT_PUBLIC_APP_URL="https://tpsheru.vercel.app"
COMPANY_NAME="UPS HERU"
COMPANY_EMAIL="cv.herozerowaste@gmail.com"
COMPANY_WHATSAPP="+62 814-0078-2617"
COMPANY_ADDRESS="Jl. Kandang Ayam, Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414"
```

---

## 💻 Panduan Instalasi Lokal

1. **Clone Repository**:
   ```bash
   git clone https://github.com/tigaputrasemesta-ctrl/wastepay.git
   cd wastepay
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:3000`.

---

## 🧪 Pengujian Otomatis

Jalankan pengujian unit test dengan Vitest:
```bash
npm test
```
*Hasil: 59 passed (100% lulus).*

Validasi tipe data TypeScript:
```bash
npm run typecheck
```
*Hasil: 0 errors.*

---

## 📄 Lisensi & Hak Cipta

© 2026 **UPS HERU** — Didukung oleh **CV Tiga Putra Semesta**.  
Hak cipta dilindungi undang-undang. Sistem Pengelolaan Persampahan Modern & Ramah Lingkungan Kota Depok.
