# Master Inventarisasi Seluruh Page dan Route (Phase 1)

**Project**: O2W HERO — repository `wastepay`  
**Total Pages**: 87 Halaman  
**Total API Routes**: 141 Endpoint  
**Auditor**: Senior Software Architect & Multi-Tenant SaaS Architect  
**Tanggal**: 15 November 2026  

---

## 1. Master Route Inventory Table

| No | Domain Lingkup | Route URL | Nama Halaman | File Sumber | Role Akses | Endpoint API Terkait | Model Database | Status |
|:--:|:---|:---|:---|:---|:---|:---|:---|:---:|
| 1 | **O2W HERO** | `/dashboard` | Executive Dashboard | `src/app/(admin)/dashboard/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `Tenant`, `Pelanggan`, `Tagihan`, `Pembayaran` | **Functional** |
| 2 | **O2W HERO** | `/tenants` | Tenant Registry & DB | `src/app/(admin)/tenants/page.tsx` | `superadmin` (100) | `/api/core/tenants`, `/api/core/tenants/[id]/settings` | `Tenant`, `TenantDomain`, `TenantWaConfig` | **Functional** |
| 3 | **O2W HERO** | `/ecosystem-map` | Peta Ekosistem Mitra | `src/app/(admin)/ecosystem-map/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `Tenant`, `Pelanggan` | **Functional** |
| 4 | **O2W HERO** | `/notifikasi-saas` | Alert & Insiden SaaS | `src/app/(admin)/notifikasi-saas/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `TenantQuotaUsage`, `Notifikasi` | **Functional** |
| 5 | **O2W HERO** | `/subscriptions` | Paket & Langganan | `src/app/(admin)/subscriptions/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `Tenant`, `Pelanggan`, `TenantLedger` | **Functional** |
| 6 | **O2W HERO** | `/saas-billing` | SaaS Billing & Invoice | `src/app/(admin)/saas-billing/page.tsx` | `superadmin` (100) | `/api/core/billing` | `TenantLedger`, `Tenant` | **Functional** |
| 7 | **O2W HERO** | `/revenue` | Revenue Intelligence | `src/app/(admin)/revenue/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `Pembayaran`, `DuitkuTransaction`, `Tenant` | **Functional** |
| 8 | **O2W HERO** | `/tenant-roi` | Tenant Performance & ROI | `src/app/(admin)/tenant-roi/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `Tagihan`, `Pembayaran`, `Tenant` | **Functional** |
| 9 | **O2W HERO** | `/crm-prospek` | CRM & Pipeline Lead | `src/app/(admin)/crm-prospek/page.tsx` | `superadmin` (100) | `/api/core/crm` | `MitraRegistration` | **Functional** |
| 10 | **O2W HERO** | `/environmental-impact` | Dampak Lingkungan (SIPSN) | `src/app/(admin)/environmental-impact/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `Pengangkutan`, `Pelanggan` | **Functional** |
| 11 | **O2W HERO** | `/platform-settings` | Platform & Infra Health | `src/app/(admin)/platform-settings/page.tsx` | `superadmin` (100) | `/api/core/control-tower` | `User`, `AuditLog`, PostgreSQL Pooler | **Functional** |
| 12 | **O2W HERO** | `/users` | Kelola Akun Admin Platform | `src/app/(admin)/users/page.tsx` | `superadmin` (100) | `/api/users` | `User`, `Tenant` | **Functional** |
| 13 | **O2W HERO** | `/audit-log` | Audit Log Sistem | `src/app/(admin)/audit-log/page.tsx` | `superadmin` (100) | `/api/audit-log` | `AuditLog`, `User` | **Functional** |
| 14 | **UPS HERU** | `/dashboard` | Dashboard Operasional | `src/app/(admin)/dashboard/page.tsx` | `kasir+` (20, 50, 100) | `/api/pelanggan`, `/api/tagihan`, `/api/notifikasi/summary` | `Pelanggan`, `Tagihan`, `Pengangkutan` | **Functional** |
| 15 | **UPS HERU** | `/pelanggan` | Data Warga & Pelanggan | `src/app/(admin)/pelanggan/page.tsx` | `kasir+` (20, 50, 100) | `/api/pelanggan`, `/api/wilayah`, `/api/kategori-tarif` | `Pelanggan`, `Wilayah`, `KategoriTarif` | **Functional** |
| 16 | **UPS HERU** | `/pelanggan/[id]` | Detail Profil & Tagihan Warga | `src/app/(admin)/pelanggan/[id]/page.tsx` | `kasir+` (20, 50, 100) | `/api/pelanggan/[id]`, `/api/tagihan` | `Pelanggan`, `Tagihan`, `Pembayaran` | **Functional** |
| 17 | **UPS HERU** | `/registrasi` | Formulir Pendaftaran Warga | `src/app/(admin)/registrasi/page.tsx` | `admin+` (50, 100) | `/api/pelanggan`, `/api/kelurahan` | `Pelanggan`, `Kelurahan` | **Functional** |
| 18 | **UPS HERU** | `/tagihan` | Billing & Kasir Loket | `src/app/(admin)/tagihan/page.tsx` | Semua role (10+) | `/api/tagihan`, `/api/pembayaran` | `Tagihan`, `Pembayaran`, `Pelanggan` | **Functional** |
| 19 | **UPS HERU** | `/pengangkutan` | Ritase & Timbang Sampah | `src/app/(admin)/pengangkutan/page.tsx` | Semua role (10+) | `/api/pengangkutan`, `/api/kendaraan` | `Pengangkutan`, `Kendaraan`, `Petugas` | **Functional** |
| 20 | **UPS HERU** | `/rute` | Rute Pengangkutan Armada | `src/app/(admin)/rute/page.tsx` | `admin+` (50, 100) | `/api/rute`, `/api/rute/sync` | `Rute`, `Petugas`, `Wilayah` | **Functional** |
| 21 | **UPS HERU** | `/jadwal` | Kalender Jadwal Angkut | `src/app/(admin)/jadwal/page.tsx` | Semua role (10+) | `/api/jadwal`, `/api/wilayah` | `JadwalPengangkutan`, `Wilayah` | **Functional** |
| 22 | **UPS HERU** | `/kendaraan` | Manajemen Armada Truk/Tosa | `src/app/(admin)/kendaraan/page.tsx` | `admin+` (50, 100) | `/api/kendaraan` | `Kendaraan` | **Functional** |
| 23 | **UPS HERU** | `/transit` | Titik Transit & TPS Antara | `src/app/(admin)/transit/page.tsx` | `admin+` (50, 100) | `/api/transit` | `TitikTransit`, `Wilayah` | **Functional** |
| 24 | **UPS HERU** | `/peta` | GIS Pemetaan Rumah Warga | `src/app/(admin)/peta/page.tsx` | Semua role (10+) | `/api/peta`, `/api/petugas/lokasi` | `Pelanggan`, `Petugas`, `TitikTransit` | **Functional** |
| 25 | **UPS HERU** | `/survei` | Survei Calon Pelanggan | `src/app/(admin)/survei/page.tsx` | Semua role (10+) | `/api/survei` | `Pelanggan`, `Petugas` | **Functional** |
| 26 | **UPS HERU** | `/survei/[id]` | Detail Verifikasi Survei | `src/app/(admin)/survei/[id]/page.tsx` | Semua role (10+) | `/api/survei/[id]` | `Pelanggan` | **Functional** |
| 27 | **UPS HERU** | `/petugas` | Manajemen Driver & Staf | `src/app/(admin)/petugas/page.tsx` | `admin+` (50, 100) | `/api/petugas` | `Petugas`, `User`, `Wilayah` | **Functional** |
| 28 | **UPS HERU** | `/absensi` | Presensi GPS Petugas | `src/app/(admin)/absensi/page.tsx` | Semua role (10+) | `/api/absensi` | `AbsensiPetugas`, `Petugas` | **Functional** |
| 29 | **UPS HERU** | `/klaim` | Klaim Biaya Operasional BBM | `src/app/(admin)/klaim/page.tsx` | Semua role (10+) | `/api/klaim` | `KlaimPetugas`, `Petugas` | **Functional** |
| 30 | **UPS HERU** | `/pengeluaran` | Biaya Operasional TPS 3R | `src/app/(admin)/pengeluaran/page.tsx` | `admin+` (50, 100) | `/api/pengeluaran` | `Pengeluaran`, `User` | **Functional** |
| 31 | **UPS HERU** | `/laporan` | Laporan Keuangan & Kas | `src/app/(admin)/laporan/page.tsx` | `kasir+` (20, 50, 100) | `/api/pembayaran`, `/api/pengeluaran` | `Pembayaran`, `Pengeluaran` | **Functional** |
| 32 | **UPS HERU** | `/rekonsiliasi` | Rekonsiliasi Kasir & Bank | `src/app/(admin)/rekonsiliasi/page.tsx` | `admin+` (50, 100) | `/api/rekonsiliasi` | `Rekonsiliasi`, `Pembayaran` | **Functional** |
| 33 | **UPS HERU** | `/tpa` | Monitoring Ritase TPA Cipayung | `src/app/(admin)/tpa/page.tsx` | `admin+` (50, 100) | `/api/tpa` | `RitaseTpa`, `Kendaraan` | **Functional** |
| 34 | **UPS HERU** | `/chat` | Chat Internal Lapangan | `src/app/(admin)/chat/page.tsx` | `admin+` (50, 100) | `/api/chat`, `/api/chat/read` | `ChatPesan`, `User` | **Functional** |
| 35 | **UPS HERU** | `/manajemen-tarif` | Pengaturan Tarif Retribusi | `src/app/(admin)/manajemen-tarif/page.tsx` | `admin+` (50, 100) | `/api/kategori-tarif`, `/api/paket` | `KategoriTarif`, `PaketIuran` | **Functional** |
| 36 | **UPS HERU** | `/pengumuman` | Papan Pengumuman Warga | `src/app/(admin)/pengumuman/page.tsx` | `admin+` (50, 100) | `/api/pengumuman` | `Pengumuman`, `User` | **Functional** |
| 37 | **UPS HERU** | `/notifikasi` | Broadcast WhatsApp Warga | `src/app/(admin)/notifikasi/page.tsx` | `kasir+` (20, 50, 100) | `/api/notifikasi`, `/api/notifikasi/retry` | `Notifikasi`, `Pelanggan` | **Functional** |
| 38 | **UPS HERU** | `/data-kontrol` | Kontrol Nomor Kontak WA | `src/app/(admin)/data-kontrol/page.tsx` | `admin+` (50, 100) | `/api/data-kontrol`, `/api/data-kontrol/blast` | `Pelanggan` | **Functional** |
| 39 | **UPS HERU** | `/pickup-insidental` | Pesanan Jemput Sampah Besar | `src/app/(admin)/pickup-insidental/page.tsx` | `admin+` (50, 100) | `/api/admin/pickup/orders` | `OrderPickup`, `KategoriPickup` | **Functional** |
| 40 | **UPS HERU** | `/manajemen-marketplace`| Kelola Pesanan Toko Daur Ulang | `src/app/(admin)/manajemen-marketplace/page.tsx` | `admin+` (50, 100) | `/api/admin/marketplace/orders` | `Order`, `OrderItem` | **Functional** |
| 41 | **UPS HERU** | `/manajemen-produk` | Katalog Produk Kompos/BSF | `src/app/(admin)/manajemen-produk/page.tsx` | `admin+` (50, 100) | `/api/admin/marketplace/produk` | `ProdukMarketplace` | **Functional** |
| 42 | **UPS HERU** | `/manajemen-artikel` | CMS Berita & Edukasi 3R | `src/app/(admin)/manajemen-artikel/page.tsx` | `admin+` (50, 100) | `/api/admin/artikel` | `Artikel`, `User` | **Functional** |
| 43 | **UPS HERU** | `/pengaturan` | Setting Tenant & Dual WA Gateway | `src/app/(admin)/pengaturan/page.tsx` | `admin+` (50, 100) | `/api/pengaturan`, `/api/core/tenants/[id]/settings` | `TenantWaConfig`, `TenantPaymentConfig` | **Functional** |
| 44 | **UPS HERU** | `/zona` | Master Zona & Sektor | `src/app/(admin)/zona/page.tsx` | `admin+` (50, 100) | `/api/zona`, `/api/kelurahan` | `Zona`, `Kelurahan` | **Functional** |
| 45 | **UPS HERU** | `/sticker` | Cetak QR & Barcode Warga | `src/app/(admin)/sticker/page.tsx` | `kasir+` (20, 50, 100) | `/api/pelanggan` | `Pelanggan` | **Functional** |
| 46 | **UPS HERU** | `/komplain` | Manajemen Aduan Warga | `src/app/(admin)/komplain/page.tsx` | Semua role (10+) | `/api/komplain` | `Komplain`, `Pelanggan` | **Functional** |
| 47 | **Publik / Warga** | `/` | Portal Utama / Home | `src/app/page.tsx` | Publik (0) | Internal / Tenant Resolver | `Tenant` | **Functional** |
| 48 | **Publik / Warga** | `/login` | Gerbang Masuk Akun | `src/app/login/page.tsx` | Publik (0) | `/api/auth/login` | `User`, `Tenant` | **Functional** |
| 49 | **Publik / Warga** | `/lacak` | Tracking Posisi Armada Truk | `src/app/(public)/lacak/page.tsx` | Publik (0) | `/api/kendaraan/lokasi` | `Kendaraan` | **Functional** |
| 50 | **Publik / Warga** | `/pengaduan` | Pengaduan Sampah Tercecer | `src/app/(public)/pengaduan/page.tsx` | Publik (0) | `/api/publik/pengaduan` | `Komplain` | **Functional** |
| 51 | **Publik / Warga** | `/pickup` | Jemput Sampah Insidental | `src/app/(public)/pickup/page.tsx` | Publik (0) | `/api/pickup/order` | `OrderPickup` | **Functional** |
| 52 | **Publik / Warga** | `/pickup/order/[noOrder]` | Status Pickup Sampah | `src/app/(public)/pickup/order/[noOrder]/page.tsx` | Publik (0) | `/api/pickup/order/[noOrder]` | `OrderPickup` | **Functional** |
| 53 | **Publik / Warga** | `/marketplace` | Toko Produk Daur Ulang | `src/app/(public)/marketplace/page.tsx` | Publik (0) | `/api/marketplace/produk` | `ProdukMarketplace` | **Functional** |
| 54 | **Publik / Warga** | `/marketplace/[slug]` | Detail Produk | `src/app/(public)/marketplace/[slug]/page.tsx` | Publik (0) | `/api/marketplace/produk/[id]` | `ProdukMarketplace` | **Functional** |
| 55 | **Publik / Warga** | `/marketplace/order/[noPesanan]` | Faktur Belanja | `src/app/(public)/marketplace/order/[noPesanan]/page.tsx` | Publik (0) | `/api/marketplace/order/[noPesanan]` | `Order`, `DuitkuTransaction` | **Functional** |
| 56 | **Publik / Warga** | `/artikel` | Berita & Tips Edukasi | `src/app/(public)/artikel/page.tsx` | Publik (0) | `/api/artikel` | `Artikel` | **Functional** |
| 57 | **Publik / Warga** | `/artikel/[slug]` | Baca Artikel | `src/app/(public)/artikel/[slug]/page.tsx` | Publik (0) | `/api/artikel/[id]` | `Artikel` | **Functional** |
| 58 | **Publik / Warga** | `/coverage` | Cek Wilayah Terlayani | `src/app/(public)/coverage/page.tsx` | Publik (0) | `/api/publik/coverage` | `Wilayah` | **Functional** |
| 59 | **Publik / Warga** | `/daftar` | Pendaftaran Pelanggan Baru | `src/app/(public)/daftar/page.tsx` | Publik (0) | `/api/publik/daftar` | `Pelanggan` | **Functional** |
| 60 | **Publik / Warga** | `/tarif` | Daftar Tarif Resmi Iuran | `src/app/(public)/tarif/page.tsx` | Publik (0) | `/api/publik/produk` | `KategoriTarif` | **Functional** |
| 61 | **Publik / Warga** | `/unduh` | Download APK & Brosur | `src/app/(public)/unduh/page.tsx` | Publik (0) | File static | Static | **Functional** |
| 62 | **Publik / Warga** | `/bayar` | Cek & Bayar Tagihan Online | `src/app/(public)/bayar/page.tsx` | Publik (0) | `/api/publik/tagihan`, `/api/publik/duitku/transaction` | `Tagihan`, `DuitkuTransaction` | **Functional** |
| 63 | **Publik / Warga** | `/bayar-tagihan` | Portal Bayar QRIS Warga | `src/app/(public)/bayar-tagihan/page.tsx` | Publik (0) | `/api/publik/tagihan` | `Tagihan` | **Functional** |
| 64 | **Mobile Petugas** | `/m` | Beranda Aplikasi Driver | `src/app/m/page.tsx` | Petugas (10+) | `/api/petugas/me` | `Petugas`, `Pengangkutan` | **Functional** |
| 65 | **Mobile Petugas** | `/m/absen` | Selfie GPS Absen Masuk/Pulang | `src/app/m/absen/page.tsx` | Petugas (10+) | `/api/absensi` | `AbsensiPetugas` | **Functional** |
| 66 | **Mobile Petugas** | `/m/angkut` | Input Timbangan & Ritase | `src/app/m/angkut/page.tsx` | Petugas (10+) | `/api/pengangkutan/lapor` | `Pengangkutan` | **Functional** |
| 67 | **Mobile Petugas** | `/m/chat` | Chat Driver ke Admin | `src/app/m/chat/page.tsx` | Petugas (10+) | `/api/chat` | `ChatPesan` | **Functional** |
| 68 | **Mobile Petugas** | `/m/klaim` | Klaim Tambal Ban / BBM | `src/app/m/klaim/page.tsx` | Petugas (10+) | `/api/klaim` | `KlaimPetugas` | **Functional** |
| 69 | **Mobile Petugas** | `/m/lapor` | Lapor Insiden Jalanan | `src/app/m/lapor/page.tsx` | Petugas (10+) | `/api/m/report-armada` | `LaporanInsiden` | **Functional** |
| 70 | **Mobile Petugas** | `/m/notifikasi` | Pemberitahuan Tugas Masuk | `src/app/m/notifikasi/page.tsx` | Petugas (10+) | `/api/notifikasi` | `Notifikasi` | **Functional** |
| 71 | **Mobile Petugas** | `/m/pengaduan` | Keluhan Warga di Sektor Ini | `src/app/m/pengaduan/page.tsx` | Petugas (10+) | `/api/komplain` | `Komplain` | **Functional** |
| 72 | **Mobile Petugas** | `/m/pickup` | Penugasan Jemput Sampah | `src/app/m/pickup/page.tsx` | Petugas (10+) | `/api/m/pickup/tugas` | `OrderPickup` | **Functional** |
| 73 | **Mobile Petugas** | `/m/report` | Riwayat Kinerja Petugas | `src/app/m/report/page.tsx` | Petugas (10+) | `/api/petugas/me` | `Petugas` | **Functional** |
| 74 | **Mobile Petugas** | `/m/survei` | Input Survei Calon Pelanggan | `src/app/m/survei/page.tsx` | Petugas (10+) | `/api/survei` | `Pelanggan` | **Functional** |
| 75 | **Cetak / Print** | `/absensi-cetak` | Lembar Rekap Presensi | `src/app/absensi-cetak/page.tsx` | `admin+` (50) | `/api/absensi` | `AbsensiPetugas` | **Functional** |
| 76 | **Cetak / Print** | `/driver/peta` | Lembar Peta Rute Supir | `src/app/driver/peta/page.tsx` | `petugas+` (10) | `/api/rute` | `Rute` | **Functional** |
| 77 | **Cetak / Print** | `/invoice-tagihan` | Invoice Tagihan Iuran | `src/app/invoice-tagihan/page.tsx` | `kasir+` (20) | `/api/tagihan` | `Tagihan` | **Functional** |
| 78 | **Cetak / Print** | `/klaim-cetak/[id]` | Form Pencairan Klaim | `src/app/klaim-cetak/[id]/page.tsx` | `admin+` (50) | `/api/klaim` | `KlaimPetugas` | **Functional** |
| 79 | **Cetak / Print** | `/kwitansi/[id]` | Kwitansi Resmi Lunas | `src/app/kwitansi/[id]/page.tsx` | Semua (0+) | `/api/pembayaran/[id]` | `Pembayaran` | **Functional** |
| 80 | **Cetak / Print** | `/laporan-cetak` | Format Cetak Laporan Keuangan | `src/app/laporan-cetak/page.tsx` | `kasir+` (20) | `/api/laporan/export` | `Pembayaran`, `Pengeluaran` | **Functional** |
| 81 | **Cetak / Print** | `/laporan-pembayaran-cetak` | Rekap Pembayaran Kasir | `src/app/laporan-pembayaran-cetak/page.tsx` | `kasir+` (20) | `/api/pembayaran` | `Pembayaran` | **Functional** |
| 82 | **Cetak / Print** | `/pelanggan-cetak` | Buku Induk Warga | `src/app/pelanggan-cetak/page.tsx` | `kasir+` (20) | `/api/pelanggan` | `Pelanggan` | **Functional** |
| 83 | **Cetak / Print** | `/pengeluaran-cetak/[id]` | Bukti Kas Keluar | `src/app/pengeluaran-cetak/[id]/page.tsx` | `admin+` (50) | `/api/pengeluaran/[id]` | `Pengeluaran` | **Functional** |
| 84 | **Cetak / Print** | `/peta/tv` | TV Monitoring Command Center | `src/app/peta/tv/page.tsx` | Semua (10+) | `/api/publik/tv-peta` | `Pelanggan`, `Kendaraan` | **Functional** |
| 85 | **Cetak / Print** | `/rekap-rt-cetak` | Rekapitulasi Tagihan per RT | `src/app/rekap-rt-cetak/page.tsx` | `kasir+` (20) | `/api/tagihan` | `Tagihan`, `Pelanggan` | **Functional** |
| 86 | **Cetak / Print** | `/rekonsiliasi-cetak/[id]` | Berita Acara Rekonsiliasi Kas | `src/app/rekonsiliasi-cetak/[id]/page.tsx` | `admin+` (50) | `/api/rekonsiliasi` | `Rekonsiliasi` | **Functional** |
| 87 | **Cetak / Print** | `/surat-jalan` & `/tagihan-cetak` | Surat Jalan Ritase & Tagihan | `src/app/surat-jalan/page.tsx`, `tagihan-cetak/page.tsx` | `kasir+` (20) | `/api/pengangkutan`, `/api/tagihan` | `Pengangkutan`, `Tagihan` | **Functional** |

---

## 2. Rangkuman Metrik Inventarisasi

- **Total Page**: 87 file `page.tsx`
- **Total Route API**: 141 file `route.ts`
- **Kategori Halaman**:
  - O2W HERO Core SaaS: 13 modul
  - UPS HERU Tenant Operasional: 33 modul
  - Publik & Portal Warga: 17 halaman
  - PWA Mobile Petugas (`/m/*`): 11 halaman
  - Printable Documents: 13 layout cetak
- **Status Fungsional**: 87/87 Functional (0 broken build error, 0 compile syntax failure).
