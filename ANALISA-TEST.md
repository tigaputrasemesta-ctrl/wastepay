# ANALISA & LAPORAN LIVE TEST — WastePay

> Tanggal: 6 Agustus 2026 (WIB)
> Metode: uji live API + dummy data lengkap pada `dev.db` (SQLite), mode Midtrans **production**.

---

## 1. Ringkasan Eksekutif

Sistem **berfungsi dengan baik secara keseluruhan**. Dari 22 area yang diuji, mayoritas lolos
dengan validasi yang benar. Ditemukan **1 bug nyata** (halaman detail pelanggan rusak — sudah
diperbaiki), **1 bug API minor** (koersi boolean), dan **3 catatan perbaikan** (kebijakan tagihan
pelanggan nonaktif/libur, verifikasi manual pembayaran Midtrans, atribusi user dari body request).

---

## 2. Dummy Data yang Dibuat (siap dijelajahi)

| Master Data | Jumlah | Detail |
|---|---|---|
| Wilayah | 3 | RT 01, RT 02, Blok B |
| Kategori Tarif | 8 | semua kategori (sudah ada) |
| Paket | 4 | A–D (sudah ada) |
| Petugas | 2 | Petugas Joko (RT 01), Petugas Siti (RT 02) |
| Rute | 2 | Rute A – RT 01 (Sen/Rab/Jum 07:00), Rute B – RT 02 (Sel/Kam/Sab 07:30) |
| TPA | 2 | TPA utama + TPA Cipayung |
| **Pelanggan** | **12 aktif** | 6,7,8,9,10,11 (geotag + koordinat), 12 (libur), 13 (nonaktif), 1,2,3 (lama), 5 (tes live) |
| Jadwal | 7 | pelanggan → rute per hari |
| Tagihan | 16 | Juli–Agustus; 2 tunggakan (denda 2%/bln) |
| Pembayaran | 9 | tunai, qris, ewallet, midtrans |
| Pengangkutan | 3 | diambil, tidak_diangkut, kosong |
| Komplain | 1 | alur baru → diproses → selesai |
| Pengeluaran | 2 | BBM 150rb, gaji 800rb |
| Pengumuman | 1 | "Jadwal libur Idul Adha" (penting) |
| Notifikasi | 1 | status pending + link wa.me (WA API belum diisi) |
| Rekonsiliasi | 1 | selisih terhitung otomatis |
| Users | 3 | admin (superadmin), kasir@wastepay.id, petugas@wastepay.id |

**Akun test**: `kasir@wastepay.id / kasir123` (kasir), `petugas@wastepay.id / petugas123` (petugas).

---

## 3. Hasil Pengujian per Fitur

| # | Fitur | Hasil | Keterangan |
|---|---|---|---|
| 1 | Login/JWT/RBAC proxy | ✅ | kasir & petugas diblokir sesuai level (403) |
| 2 | Users (superadmin) | ✅ | buat kasir + petugas |
| 3 | Wilayah CRUD | ✅ | |
| 4 | Kategori tarif | ✅ | 8 kategori lengkap |
| 5 | Paket | ✅ | |
| 6 | Petugas CRUD | ✅ | |
| 7 | Rute CRUD + toggle aktif | ✅ | |
| 8 | Pelanggan CRUD + **geotag** (foto, lat/lng, sumber, akurasi) | ✅ | detail geotag tersimpan & terbaca |
| 9 | Jadwal (unik per pelanggan+rute+hari) | ✅ | duplikat ditolak 400 |
| 10 | Generate tagihan massal | ✅ | skip yang sudah ada; **filter aktif** |
| 11 | Denda tunggakan 2%/bulan | ✅ | 50.000→+1.000, 100.000→+2.000 |
| 12 | Pembayaran tunai → langsung lunas | ✅ | |
| 13 | Pembayaran non-tunai → pending → verifikasi | ✅ | |
| 14 | Validasi nominal minimum | ✅ | nominal < tagihan ditolak |
| 15 | Pembayaran publik (upload bukti) | ✅ | status pending |
| 16 | Midtrans Snap (production) | ✅ | token asli, reuse transaksi pending, live-check |
| 17 | Webhook Midtrans (signature SHA-512) | ✅ | signature palsu → 400 |
| 18 | Pengangkutan (petugas boleh catat, delete admin) | ✅ | RBAC 10/50 |
| 19 | Komplain (baru→proses→selesai) | ✅ | |
| 20 | Pengeluaran | ⚠️ | butuh `dicatatById` dari body (lihat §4.4) |
| 21 | Pengumuman | ⚠️ | `penting` string → 500 (lihat §4.2) |
| 22 | Notifikasi WhatsApp | ✅ | fallback link wa.me (WA_API_KEY kosong) |
| 23 | Rekonsiliasi | ✅ | total dihitung ulang dari DB |
| 24 | Laporan export CSV | ✅ | BOM UTF-8, ringkasan + rincian |
| 25 | Audit log | ✅ | lengkap dengan user & timestamp |
| 26 | API publik (cek tagihan by kode) | ✅ | kode salah → 404, tagihan lunas ditolak |
| 27 | **Invoice digital ala skylite.id** (noInvoice otomatis, /bayar-tagihan, /invoice-tagihan) | ✅ | lihat §3.1 |

---

## 3.1 Hasil Pengujian Fitur Invoice (pola skylite.id)

| # | Skenario | Hasil |
|---|---|---|
| 1 | `noInvoice` otomatis `INV/{kode}/{YYYYMM}` saat generate tagihan (manual + massal) | ✅ | semua tagihan baru punya nomor |
| 2 | Backfill 17 tagihan lama | ✅ | `scripts/backfill-no-invoice.mjs` — 17 backfill, 0 duplikat |
| 3 | `GET /api/publik/tagihan-detail?invoice=` | ✅ | 200 + rincian (PPN 11%: 30.000 → 3.300, total 33.300); invoice salah → 404 |
| 4 | `/bayar-tagihan?invoice=` — kartu status (No. Tagihan, Atas Nama, Periode, Total +PPN, Jatuh Tempo) | ✅ | 200 |
| 5 | Status lunas di /bayar-tagihan + /invoice-tagihan (INV/P000001/202607) | ✅ | "sudah dibayar dan dilunaskan" + metode QRIS + tanggal |
| 6 | `/invoice-tagihan?invoice=` — printable: logo, penerbit, ditujukan kepada, tabel layanan, TOTAL, QR, footer | ✅ | SSR penuh; tombol print window.print() |
| 7 | Integrasi admin: nomor invoice + link di halaman /tagihan | ✅ | kasir bisa buka link invoice |
| 8 | Build production | ✅ | TypeScript clean; hanya butuh Suspense wrapper untuk `useSearchParams` di /bayar-tagihan (sudah diperbaiki) |
| 9 | Deklarasi global `Window.snap` duplikat (bayar vs bayar-tagihan) | ✅ | dipindah ke `src/types/midtrans.d.ts` (shared) |

---

## 4. Temuan & Rekomendasi

### 4.1 🔴 BUG — Halaman detail pelanggan rusak (SUDAH DIPERBAIKI)
- **Gejala**: `GET /api/pelanggan/[id]` (juga `petugas/[id]`, `rute/[id]`, `wilayah/[id]`)
  mengembalikan **403 "rute tidak terdaftar"** — proxy fail-closed tidak punya aturan
  `GET:/api/xxx/` (prefix) untuk sub-path `[id]`. Halaman `/pelanggan/[id]` diam-diam
  redirect balik ke daftar (karena `res.ok` false).
- **Perbaikan**: tambah `GET:/api/pelanggan/`, `GET:/api/petugas/`, `GET:/api/rute/`,
  `GET:/api/wilayah/` ke `src/proxy.ts` (level 10). Sudah diverifikasi 200 setelah fix.
- **Saran**: audit menyeluruh map route API vs aturan proxy (route baru mudah terlupakan).

### 4.2 🟠 BUG minor — Koersi boolean lemah di API (✅ SUDAH DIPERBAIKI)
- `POST /api/pengumuman` dengan `penting: "true"` (string) → **500**; boolean asli OK.
  `POST /api/rute` **mengabaikan field `aktif`** (selalu default true).
- **Perbaikan**: helper `toBoolean(v)` di `src/lib/utils.ts` (`true/"true"/1/"1"` → true),
  dipakai di pengumuman (`penting`) dan rute (POST & PUT `aktif`; default true saat field
  tidak dikirim). Diverifikasi live: `aktif: "false"` → rute nonaktif, `penting: "true"` → 201.
  Unit test `toBoolean` ditambahkan (10 kasus).

### 4.3 🟠 Temuan — Tagihan otomatis untuk pelanggan nonaktif/libur
- Auto-generate tagihan **saat pendaftaran pelanggan** tidak memfilter `status`
  (pelanggan `libur`/`nonaktif` langsung dapat tagihan bulan berjalan — bukti: P-000012, P-000013).
  Generate massal sudah benar (filter `status: "aktif"` + `deletedAt: null`).
- **Dampak**: pelanggan libur mudik/nonaktif ikut ditagih; laporan CSV ikut menampilkannya.
- **Saran**: di `POST /api/pelanggan`, lewati auto-generate jika `status !== "aktif"`;
  pertimbangkan periode libur sementara (LiburSementara) untuk skip tagihan.

### 4.4 🟠 Temuan — Atribusi user diambil dari body, bukan session (✅ SUDAH DIPERBAIKI)
- **Perbaikan**: `POST /api/pengeluaran` (`dicatatById`) dan `POST /api/pengumuman`
  (`createdById`) kini mengambil dari `getSession()` — field dari body diabaikan.
  Diverifikasi live: POST tanpa `dicatatById`/`createdById` → 201 dengan user session.

### 4.5 🟡 Temuan operasional — Pembayaran gateway pending bisa diverifikasi manual (✅ SUDAH DIPERBAIKI)
- **Perbaikan**: (1) API `PUT /api/pembayaran/[id]` menolak verifikasi manual untuk
  `metode` berawalan `duitku` (400 + pesan jelas); (2) panel admin di `/tagihan` menampilkan
  tombol **"⟳ Cek Status Live"** (panggil `GET /api/publik/duitku/status?orderId=`)
  untuk pembayaran gateway, bukan Verifikasi/Tolak; (3) `GET /api/pembayaran` kini menyertakan
  `duitkuTransaction` (orderId, statusCode) untuk kebutuhan panel. Diverifikasi live: PUT manual
  pada pembayaran duitku pending → 400.

### 4.6 🟢 Positif (dipertahankan)
- RBAC fail-closed berfungsi: kasir tidak bisa POST pelanggan (403), petugas tidak bisa
  delete pengangkutan / verifikasi pembayaran (403), halaman terlarang redirect.
- Validasi data konsisten: nominal minimum, tagihan lunas ditolak bayar ulang, jadwal duplikat,
  kode pelanggan publik.
- Webhook Midtrans aman: signature SHA-512 divalidasi; live-check fallback berfungsi.
- Audit log lengkap (siapa, kapan, data lama/baru).

---

## 5. Catatan Lingkungan
- **Order pending di dashboard Midtrans (production)**: 5 order tes (`WP-5-...`,
  `WP-9-...`, `WP-3-...`, `WP-4-...`, `WP-CURL-TEST-1`) — tidak ada dana bergerak;
  kedaluwarsa otomatis ±24 jam.
- Webhook URL harus publik HTTPS setelah deploy; saat ini verifikasi memakai live-check.
- Admin password: `Wastepay123!` (diubah saat sesi live test) — ganti via Pengaturan.
