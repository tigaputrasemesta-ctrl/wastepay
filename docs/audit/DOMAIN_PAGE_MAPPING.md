# Pemetaan Fungsi dan Pemisahan Domain: O2W HERO vs UPS HERU (Phase 2)

**Project**: O2W HERO — repository `wastepay`  
**Prinsip Arsitektur**: Single Codebase, Multiple Domains, Database-per-Tenant  
**Auditor**: Senior Software Architect & Multi-Tenant SaaS Architect  
**Tanggal**: 15 November 2026  

---

## 1. Domain Separation Architecture

| Aspek | O2W HERO (Control Plane) | UPS HERU (Tenant Pilot Plane) |
|:---|:---|:---|
| **Peran Sistem** | Parent SaaS Hub / Control Tower | Tenant Percontohan (Pilot Operational Unit) |
| **Domain Resmi** | `o2whero.com`, `core.o2whero.com` | `upsheru.com`, `depok.upsheru.com` |
| **Subdomain Mitra Lain** | `*.o2whero.com` | `upsheru.o2whero.com` (alias) |
| **Fokus Bisnis** | Manajemen mitra, lisensi, subscription, revenue platform, billing SaaS, DLH compliance | Operasional sampah harian: warga, armada, rute, retribusi, kasir, dan TPS 3R |
| **Isolasi Database** | Core Database (tabel `Tenant`, `TenantLedger`, `MitraRegistration`, `AuditLog`) | Tenant Database/Schema (tabel `Pelanggan`, `Tagihan`, `Pengangkutan`, `Kendaraan`) |
| **Role Pengguna** | `superadmin` (Platform Management) | `admin`, `kasir`, `petugas`, warga/pelanggan |

---

## 2. Area A: O2W HERO — Control Plane

Hasil audit dan evaluasi 21 fungsi utama SaaS Control Tower terhadap modul aktual di repository:

| No | Modul Target | Route URL Aktual | File Komponen | Status Evaluasi | Keterangan & Catatan Arsitektur |
|:--:|:---|:---|:---|:---:|:---|
| 1 | **Executive Dashboard** | `/dashboard` | `src/components/core/CoreSaaSDashboard.tsx` | **Tersedia (P0)** | Terhubung ke `/api/core/control-tower`, menyajikan MRR, Total Mitra, Total KK terlayani, dan kesehatan sistem tanpa data dummy. |
| 2 | **Tenant Management** | `/tenants` | `src/app/(admin)/tenants/page.tsx` | **Tersedia (P0)** | Registrasi mitra, daftar tenant terdaftar, status (aktif/suspend/trial), dan kontrol kuota. |
| 3 | **Add Tenant** | `/tenants` (Modal) | `src/app/(admin)/tenants/page.tsx` | **Tersedia (P0)** | Modal pendaftaran mitra baru dengan pembuatan tenant ID, penetapan subdomain, dan paket. |
| 4 | **Tenant Detail** | `/tenants` (Card & Drawer) | `src/app/(admin)/tenants/page.tsx` | **Tersedia (P0)** | Menampilkan profil mitra, PIC, nomor WhatsApp, email, dan tanggal aktivasi. |
| 5 | **Domain Management** | `/tenants` | `src/app/(admin)/tenants/page.tsx` | **Tersedia (P0)** | Pengaturan subdomain `*.o2whero.com` dan custom domain mandiri tersinkronisasi ke tabel `TenantDomain`. |
| 6 | **Database Management** | `/tenants` | `src/app/(admin)/tenants/page.tsx` | **Tersedia (P0)** | Pengaturan connection string database terisolasi (`dbConnectionString`) dan schema pooler (`dbSchemaName`). |
| 7 | **Subscription Management** | `/subscriptions` | `src/app/(admin)/subscriptions/page.tsx` | **Tersedia (P0)** | Monitoring masa aktif langganan, auto-renewal warning, dan kapasitas kuota warga per mitra. |
| 8 | **Package Management** | `/subscriptions` | `src/app/(admin)/subscriptions/page.tsx` | **Tersedia (P0)** | Konfigurasi tier paket: Starter (Rp349rb), Pro (Rp1,25jt), Enterprise (Rp1,99jt), dan Government (DLH). |
| 9 | **Billing & Invoice** | `/saas-billing` | `src/app/(admin)/saas-billing/page.tsx` | **Tersedia (P0)** | Terkoneksi ke `TenantLedger` dan `/api/core/billing`, dilengkapi modal penerbitan faktur tagihan SaaS. |
| 10 | **Revenue Dashboard** | `/revenue` | `src/app/(admin)/revenue/page.tsx` | **Tersedia (P0)** | Menampilkan 4 revenue stream (SaaS MRR, micro-fee QRIS/VA, marketplace fee, kontrak pemerintah). |
| 11 | **Payment Monitoring** | `/revenue` | `src/app/(admin)/revenue/page.tsx` | **Tersedia (P0)** | Pemisahan tegas antara GMV Transaksi, Dana Escrow milik mitra, fee gateway, dan Pendapatan Bersih O2W. |
| 12 | **Tenant Performance & ROI** | `/tenant-roi` | `src/app/(admin)/tenant-roi/page.tsx` | **Tersedia (P0)** | Menghitung collection rate riil, rasio pembayaran digital, kebocoran kas, dan efisiensi armada per tenant. |
| 13 | **CRM & Prospects** | `/crm-prospek` | `src/app/(admin)/crm-prospek/page.tsx` | **Tersedia (P1)** | Pipeline pendaftaran kemitraan baru langsung dari database tabel `MitraRegistration`. |
| 14 | **Partnership Management** | `/crm-prospek` | `src/app/(admin)/crm-prospek/page.tsx` | **Tersedia (P1)** | Status onboarding calon mitra: Baru, Review DLH/Pemda, Disetujui, Aktif Beroperasi. |
| 15 | **Marketplace Management** | `/manajemen-marketplace` | `src/app/(admin)/manajemen-marketplace/page.tsx` | **Tersedia (P1)** | Mengelola order material daur ulang, kompos, botol PET, maggot BSF, dan komisi platform. |
| 16 | **Environmental Impact** | `/environmental-impact` | `src/app/(admin)/environmental-impact/page.tsx` | **Tersedia (P1)** | Menghitung total tonase sampah terkumpul, terpilah, didaur ulang, dan reduksi emisi karbon CO2e. |
| 17 | **Government / DLH Dashboard** | `/environmental-impact` | `src/app/(admin)/environmental-impact/page.tsx` | **Tersedia (P1)** | Fungsi ekspor data berformat baku SIPSN KLHK untuk pelaporan dinas lingkungan hidup daerah. |
| 18 | **User & Role Management** | `/users` | `src/app/(admin)/users/page.tsx` | **Tersedia (P0)** | Manajemen pengguna platform O2W Hero terisolasi dari staf supir/knek mitra lewat multi-tenant tabs. |
| 19 | **Audit Logs** | `/audit-log` | `src/app/(admin)/audit-log/page.tsx` | **Tersedia (P0)** | Tracking seluruh aktivitas superadmin, mutasi data, login, dan aksi krusial sistem. |
| 20 | **System Monitoring** | `/platform-settings` | `src/app/(admin)/platform-settings/page.tsx` | **Tersedia (P0)** | Uptime API, konektivitas PostgreSQL pooler Supabase, pemakaian memory, dan status background job. |
| 21 | **Platform Settings** | `/platform-settings` | `src/app/(admin)/platform-settings/page.tsx` | **Tersedia (P0)** | Pengaturan global, status lisensi platform, dan konfigurasi environment Next.js/Prisma. |

---

## 3. Area B: UPS HERU — Tenant Operational Plane

Daftar modul operasional TPS 3R yang berjalan eksklusif pada domain tenant (`upsheru.com`):

| No | Modul Operasional | Route URL | File Sumber | Role yang Diizinkan | Proteksi Terhadap O2W HERO |
|:--:|:---|:---|:---|:---:|:---|
| 1 | **Dashboard Operasional** | `/dashboard` | `src/app/(admin)/dashboard/page.tsx` | `kasir`, `admin`, `superadmin` | Otomatis berganti ke view UPS HERU jika diakses via `upsheru.com`. |
| 2 | **Data Pelanggan / Warga** | `/pelanggan`, `/pelanggan/[id]` | `src/app/(admin)/pelanggan/page.tsx` | `kasir`, `admin`, `superadmin` | Diblokir di `o2whero.com` oleh `proxy.ts`, diarahkan ke dashboard. |
| 3 | **Pendaftaran Warga Baru** | `/registrasi` | `src/app/(admin)/registrasi/page.tsx` | `admin`, `superadmin` | Operasional lokal pendaftaran warga TPS 3R. |
| 4 | **Tagihan & Kasir Loket** | `/tagihan` | `src/app/(admin)/tagihan/page.tsx` | Semua role (`petugas`, `kasir`, `admin`) | Menangani pembayaran tunai & QRIS Duitku warga. |
| 5 | **Pengangkutan & Timbangan** | `/pengangkutan` | `src/app/(admin)/pengangkutan/page.tsx` | Semua role (`petugas`, `admin`) | Input ritase truk/gerobak dan berat timbang sampah. |
| 6 | **Rute & Penugasan Armada** | `/rute` | `src/app/(admin)/rute/page.tsx` | `admin`, `superadmin` | Pola rute jalan per kelurahan dan supir penanggung jawab. |
| 7 | **Jadwal Pengangkutan** | `/jadwal` | `src/app/(admin)/jadwal/page.tsx` | Semua role | Kalender ritase harian per RW/RT. |
| 8 | **Kendaraan & Armada Truk** | `/kendaraan` | `src/app/(admin)/kendaraan/page.tsx` | `admin`, `superadmin` | Nomor polisi, kapasitas m3, odometer, dan status servis armada. |
| 9 | **Titik Transit / Dump Point**| `/transit` | `src/app/(admin)/transit/page.tsx` | `admin`, `superadmin` | Titik kumpul sampah antara sebelum dibawa ke TPS 3R/TPA. |
| 10 | **GIS Pemetaan Rumah** | `/peta` | `src/app/(admin)/peta/page.tsx` | Semua role | Visualisasi koordinat GPS rumah warga, status lunas/tunggakan. |
| 11 | **Survei Calon Pelanggan** | `/survei`, `/survei/[id]` | `src/app/(admin)/survei/page.tsx` | Semua role | Foto rumah dan tagging koordinat calon pelanggan baru. |
| 12 | **Petugas & Driver** | `/petugas` | `src/app/(admin)/petugas/page.tsx` | `admin`, `superadmin` | Profil staf operasional lapangan, SIM, dan referral warga. |
| 13 | **Presensi GPS Driver** | `/absensi` | `src/app/(admin)/absensi/page.tsx` | Semua role | Jam masuk, foto selfie, koordinat lokasi absen supir/knek. |
| 14 | **Klaim BBM & Operasional** | `/klaim` | `src/app/(admin)/klaim/page.tsx` | Semua role | Pengajuan biaya bensin/tambal ban oleh supir armada. |
| 15 | **Biaya Pengeluaran TPS 3R** | `/pengeluaran` | `src/app/(admin)/pengeluaran/page.tsx` | `admin`, `superadmin` | Pencatatan kas keluar listrik, oli mesin pencacah, solar. |
| 16 | **Laporan Keuangan Unit** | `/laporan` | `src/app/(admin)/laporan/page.tsx` | `kasir`, `admin` | Rekap kas masuk iuran sampah vs kas keluar operasional. |
| 17 | **Rekonsiliasi Kasir & Bank** | `/rekonsiliasi` | `src/app/(admin)/rekonsiliasi/page.tsx` | `admin`, `superadmin` | Tutup buku harian kasir loket vs mutasi rekening. |
| 18 | **Monitoring TPA Cipayung** | `/tpa` | `src/app/(admin)/tpa/page.tsx` | `admin`, `superadmin` | Catatan ritase pembuangan residu akhir ke TPA pemerintah. |
| 19 | **Chat Lapangan** | `/chat` | `src/app/(admin)/chat/page.tsx` | `admin`, `petugas` | Komunikasi pesan instan antara kantor TPS 3R dan supir. |
| 20 | **Pengaturan Tarif Retribusi**| `/manajemen-tarif` | `src/app/(admin)/manajemen-tarif/page.tsx` | `admin`, `superadmin` | Besaran iuran per kategori: Rumah Tangga, Ruko, Niaga. |
| 21 | **Pengumuman Warga** | `/pengumuman` | `src/app/(admin)/pengumuman/page.tsx` | `admin`, `superadmin` | Notifikasi jadwal libur hari raya atau info iuran. |
| 22 | **Broadcast WhatsApp** | `/notifikasi` | `src/app/(admin)/notifikasi/page.tsx` | `kasir`, `admin` | Pengiriman reminder tagihan dan bukti lunas ke nomor HP warga. |
| 23 | **Kontrol Kontak WA** | `/data-kontrol` | `src/app/(admin)/data-kontrol/page.tsx` | `admin`, `superadmin` | Sinkronisasi kontak nomor HP warga ke Google Contacts. |
| 24 | **Pickup Insidental** | `/pickup-insidental` | `src/app/(admin)/pickup-insidental/page.tsx` | `admin`, `superadmin` | Layanan pangkas pohon / puing sampah besar warga. |
| 25 | **Marketplace Kompos & BSF** | `/manajemen-marketplace` | `src/app/(admin)/manajemen-marketplace/page.tsx`| `admin`, `superadmin` | Penjualan produk daur ulang unit ke offtaker/pembeli. |
| 26 | **Katalog Produk** | `/manajemen-produk` | `src/app/(admin)/manajemen-produk/page.tsx` | `admin`, `superadmin` | Foto, stok, dan harga kompos/maggot BSF per kg. |
| 27 | **CMS Artikel Edukasi** | `/manajemen-artikel` | `src/app/(admin)/manajemen-artikel/page.tsx` | `admin`, `superadmin` | Publikasi berita pilah sampah untuk warga Depok. |
| 28 | **Pengaturan Tenant & WA** | `/pengaturan` | `src/app/(admin)/pengaturan/page.tsx` | `admin`, `superadmin` | Konfigurasi dual nomor WhatsApp dan nama unit UPS HERU. |
| 29 | **Zona & Wilayah Kerja** | `/zona` | `src/app/(admin)/zona/page.tsx` | `admin`, `superadmin` | Pemetaan kecamatan dan kelurahan di Kota Depok. |
| 30 | **Cetak Sticker Barcode** | `/sticker` | `src/app/(admin)/sticker/page.tsx` | `kasir`, `admin` | Cetak stiker QR pelanggan untuk ditempel di pagar rumah. |
| 31 | **Komplain / Aduan Warga** | `/komplain` | `src/app/(admin)/komplain/page.tsx` | Semua role | Penanganan keluhan sampah belum terangkut dari warga. |

---

## 4. Evaluasi & Temuan Pemisahan Domain

1. **Pemisahan Navigasi & Sidebar**:
   - Berhasil dipisahkan menggunakan konstanta `CORE_ALLOWED_KEYS` di `Sidebar.tsx`.
   - Domain `o2whero.com` hanya memuat 6 grup menu Control Plane.
   - Domain `upsheru.com` hanya memuat menu operasional persampahan.
2. **Pencegahan Akses Ilegal di Server-Side (`src/proxy.ts`)**:
   - Jika pengguna di domain `o2whero.com` mencoba mengetikkan URL operasional (misal `/pelanggan` atau `/tagihan`), proxy secara otomatis mendeteksi `tenantCtx.isCore` dan mengalihkan (`redirect`) ke `/dashboard?notice=tenant_scope_only`.
   - Jika staf operasional tenant mitra mencoba mengakses API Core (`/api/core/*`), server mengembalikan respons `403 Forbidden`.
3. **Penyelarasan Komponen Terintegrasi**:
   - Modul `Marketplace Management` dan `CMS Edukasi` dirancang fleksibel: dapat digunakan di tingkat tenant untuk menjual produk lokal masing-masing, maupun dipantau secara agregat di Control Tower Core O2W HERO.
