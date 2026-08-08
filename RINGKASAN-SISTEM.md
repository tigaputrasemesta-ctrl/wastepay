# Ringkasan Sistem WastePay

> Dokumen ini dibuat untuk dianalisis oleh AI lain / developer baru.
> Tanggal ringkasan: berdasarkan kondisi codebase saat ini (git: local, belum diverifikasi vs git history).

---

## 1. Gambaran Umum

**WastePay** adalah sistem manajemen retribusi/pembayaran sampah berbasis web (bahasa Indonesia) untuk satu badan pengelola sampah (mis. TPST/RT/RW/perusahaan). Mencakup siklus lengkap: pendaftaran pelanggan → penagihan bulanan → pembayaran (tunai & non-tunai) → penjadwalan pengangkutan → komplain → laporan keuangan → rekonsiliasi kas.

### Stack Teknologi
| Layer | Teknologi |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, Tailwind CSS 3.4, komponen client-side custom (tanpa UI library) |
| Bahasa | TypeScript 5 |
| ORM / DB | Prisma 7 + adapter `@prisma/adapter-libsql` → SQLite (`dev.db`) |
| Auth | JWT (`jose`, HS256) via httpOnly cookie `session`, password `bcryptjs` (12 rounds) |
| Middleware | Next.js `proxy.ts` (RBAC fail-closed untuk API) |
| Testing | Vitest (unit) |
| Integrasi eksternal | WhatsApp via provider API (Fonnte-style, opsional via env) |

### Env yang dipakai (`.env`)
- `DATABASE_URL` — SQLite connection string
- `JWT_SECRET` — kunci JWT; **wajib** ada di production (server menolak start kalau kosong); di dev dibuat acak per-proses
- `WA_API_KEY`, `WA_API_URL` — integrasi WhatsApp (opsional; kosong → fallback link `wa.me`)
- `ADMIN_PHONE` — nomor WhatsApp admin/helpdesk untuk notifikasi internal; dipakai saat ada **pendaftaran baru** (`pendaftaran_masuk` dikirim ke nomor ini, pola skylite: data registrasi diteruskan ke helpdesk). Kosong → notifikasi admin dilewati
- `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_IS_PRODUCTION` — Duitku Payment Gateway (redirect ke halaman pembayaran Duitku); signature HMAC-SHA256, endpoint `sandbox.duitku.com` / `passport.duitku.com` (lihat `src/lib/duitku.ts`)

---

## 2. Arsitektur & Pola Kode

```
src/
├── app/
│   ├── (admin)/            # Halaman admin (di-protect middleware)
│   │   ├── dashboard, daftar, pelanggan(+[id]), tagihan, petugas, rute,
│   │   │   jadwal, pengangkutan, komplain, pengeluaran, laporan, pengumuman,
│   │   │   notifikasi, rekonsiliasi, tpa, pengaturan, users, audit-log
│   │   └── layout.tsx      # Layout + Sidebar
│   ├── (public)/           # Halaman publik: bayar, layout
│   ├── api/                # REST API per-modul (lihat tabel §4)
│   ├── login/              # Halaman login
│   ├── page.tsx            # redirect("/dashboard")
│   └── layout.tsx, globals.css
├── components/             # Sidebar, Toast, ConfirmDialog, CoordinatePicker
├── hooks/useUser.ts        # Client hook ambil sesi user
├── lib/
│   ├── auth.ts             # hash/verify password, createSession, getSession, login
│   ├── rbac.ts             # ROLE_HIERARCHY, hasRole, getAllowedMenus
│   ├── server-rbac.ts      # requireRole() untuk API route handler
│   ├── secret.ts           # load JWT_SECRET (prod wajib, dev ephemeral)
│   ├── prisma.ts           # PrismaClient singleton + adapter libsql
│   ├── audit.ts            # logAudit() (create/update/delete, JSON lama/baru, dipotong 4KB)
│   ├── tagihan.ts          # updateTunggakan() (denda 2%/bulan), totalTagihan()
│   └── utils.ts            # formatRupiah, formatDate, cn, dll
├── proxy.ts                # Middleware: auth + RBAC halaman & API
└── tests/unit.test.ts      # Unit test (vitest)
```

### Alur Auth
1. POST `/api/auth/login` → cek email+password → buat JWT (exp 7 hari) → set cookie `session`.
2. `proxy.ts` verifikasi token tiap request (halaman & API).
3. Route handler API pakai `getSession()` + `hasRole()` (double-check, walau middleware sudah cek).

### RBAC — 4 Role
| Role | Level | Menu |
|---|---|---|
| `superadmin` | 100 | Semua + **users**, **audit-log** |
| `admin` | 50 | Semua menu bisnis |
| `kasir` | 20 | dashboard, tagihan, laporan, notifikasi |
| `petugas` | 10 | dashboard, pengangkutan, jadwal, komplain |

**Proxy API (fail-closed)**: `API_ROLE_MAP` berisi `METHOD:path → level minimum`. Route API yang TIDAK terdaftar → ditolak 403. Prefix `/` (mis. `PUT:/api/pelanggan/`) berlaku untuk sub-path `/[id]`. `/api/auth/*` & `/api/publik/*` di-skip di proxy (dicek di handler).

**Keamanan lain**: audit log otomatis di hampir semua mutasi; soft-delete (`deletedAt`) pada Pelanggan, Petugas, Tagihan, Pengangkutan; validasi nominal pembayaran; limit ukuran upload bukti (2MB); script rotasi password admin.

---

## 3. Data Model (Prisma — 19 model)

| Model | Field penting / Catatan |
|---|---|
| **User** | email unik, password (hash), role, noTelepon, foto, aktif. Relasi: verifikasi pembayaran, resolve komplain, buat pengumuman/pengeluaran/notifikasi/rekonsiliasi/audit |
| **Wilayah** | nama (RT 01, Blok A), rt/rw/kelurahan/kecamatan/kota. Dipakai pelanggan, petugas, rute, pengumuman |
| **KategoriTarif** | kategori unik (`rumah_tangga`, `bisnis`, `kost`, `sekolah`, `rm_makan`, `perkantoran`, `industri`, `lainnya`), tarif default/bulan |
| **Paket** | nama, harga, deskripsi (frekuensi layanan) |
| **Pelanggan** | nama, noTelepon, kategori, alamat, rtRw, **kodePelanggan unik** (untuk barcode/pencarian publik), fotoRumah, patokanLokasi, **latitude/longitude** (rute), **koordinatSumber** (exif_foto/gps_perangkat/manual), **koordinatAkurasi** (m), penanggungjawab, referal, **customTarif** (override), status `aktif/nonaktif/libur`, soft-delete |
| **Petugas** | nama, noTelepon, foto, email, aktif, wilayahId, soft-delete |
| **Rute** | nama, hari (comma-separated), jam, aktif, wilayah, petugas |
| **Jadwal** | hari, jam, pelanggan + rute, unik `(pelangganId, ruteId, hari)` |
| **Tagihan** | bulan, tahun, jumlah, **denda**, status `belum_bayar/lunas/tunggakan/dibatalkan`, jatuhTempo (default tgl 15), tanggalLunas, unik `(pelangganId, bulan, tahun)`, soft-delete |
| **Pembayaran** | tanggal, jumlah, metode `transfer/ewallet/qris/virtual_account/tunai/duitku`, buktiBayar (foto), status `terverifikasi/pending/ditolak`, verifiedBy (admin); pembayaran gateway (Duitku) diverifikasi otomatis via callback/live-check, TIDAK bisa diverifikasi manual |
| **Pengangkutan** | tanggal, status `terjadwal/diambil/tidak_diangkut/kosong`, volume m³, berat kg, jenisSampah `organik/anorganik/b3/campuran`, catatan kendala, fotoBukti, relasi pelanggan/petugas/jadwal/TPA, soft-delete |
| **Komplain** | jenis `tidak_diangkut/sampah_menumpuk/lainnya`, deskripsi, foto, status `baru/diproses/selesai`, tanggapan, resolvedBy |
| **LiburSementara** | tanggalMulai–Selesai, alasan (mudik, renovasi) |
| **Pengumuman** | judul, isi, penting, untukWilayahId (null = semua), createdBy |
| **Pengeluaran** | kategori `bbm/gaji_petugas/perawatan/operasional/lainnya`, jumlah, keterangan, bukti, dicatatBy |
| **Tpa** | nama, alamat, kota, jarak (km), aktif |
| **AuditLog** | aksi `create/update/delete`, entitas, entitasId, dataLama/dataBaru (JSON ≤4KB), userId |
| **Notifikasi** | tipe `tagihan_jatuh_tempo/jadwal_pengangkutan/komplain_diproses/pengumuman`, judul, pesan, penerima (no telp), status `pending/terkirim/gagal`, error, dikirimPada |
| **Rekonsiliasi** | tanggal, totalPemasukan, totalPengeluaran, totalTunaiSistem, totalTunaiFisik, selisih, catatan |
| **DuitkuTransaction** | orderId unik (`DW-{pembayaranId}-{ts}`), relasi 1-1 ke Pembayaran, paymentUrl (redirect), reference, paymentMethod (channel, mis. `VC`/`QR`/`OVO`), statusCode (`00` sukses/`01` pending/`02` batal — konteks callback vs cek status berbeda), statusMessage, amount, rawResponse (JSON ≤4KB) |
| **Pengaturan** | key/value (settings umum) |

---

## 4. Fitur & Fungsi per Modul (API + UI)

### 4.1 Auth & User
- **POST /api/auth/login** — login email+password → JWT cookie.
- **POST /api/auth/logout** — hapus sesi.
- **GET /api/auth/me** — ambil user aktif.
- **POST /api/auth/ganti-password** — ubah password sendiri.
- **POST /api/auth/seed** (superadmin) — seeding akun awal.
- **Users** (superadmin only): CRUD user, atur role.

### 4.2 Pelanggan
- CRUD penuh, **soft-delete**, upload foto rumah, pilih koordinat via peta (`CoordinatePicker`).
- **Foto geotag**: ambil foto depan rumah (kamera/galeri) → koordinat GPS dari EXIF foto otomatis terbaca (`exifr`) → fallback GPS perangkat / manual. Foto otomatis dikompres ke JPEG max 1024px (hemat DB). Sumber koordinat (`exif_foto`/`gps_perangkat`/`manual`) + akurasi (m) tersimpan & tampil di detail. Koordinat ini jadi acuan rute pengangkutan (tombol "Buka rute di Google Maps" di halaman Rute & foto rumah tampil di Jadwal untuk memudahkan petugas menemukan rumah).
- Tarif: **prioritas `customTarif` → `paket.harga` → `kategoriTarif.tarif`**.
- Kode pelanggan unik (untuk pencarian publik/barcode).
- Status aktif/nonaktif/libur; fitur **libur sementara** (mudik/renovasi, rentang tanggal).
- Filter per wilayah, kategori, status.

### 4.3 Tagihan (Billing) — jantung sistem
- **POST /api/tagihan/generate** (admin) — generate massal tagihan bulan berjalan untuk semua pelanggan aktif; skip yang sudah ada; audit log hasil.
- **GET /api/tagihan/tunggakan** & fungsi `updateTunggakan()` — otomatis menandai tagihan lewat jatuh tempo jadi `tunggakan` + **denda 2%/bulan keterlambatan** (dihitung saat akses/generate).
- Status: belum_bayar → lunas / tunggakan / dibatalkan; jatuh tempo default tgl 15.
- CRUD manual per tagihan (admin).

### 4.3.b Invoice & Tagihan Digital (pola skylite.id)
- **Nomor invoice otomatis**: `INV/{kodePelanggan}/{YYYYMM}` (contoh `INV/P000014/202608`) — dibuat otomatis saat tagihan dibuat (manual, massal, maupun generate bulanan) via `generateNoInvoice()` di `src/lib/invoice.ts`; field `noInvoice` unik di model `Tagihan` (migrasi `20260806020000_add_no_invoice`, backfill 17 tagihan lama via `scripts/backfill-no-invoice.mjs`).
- **Halaman publik `/bayar-tagihan?invoice=...`** — kartu status tagihan ala skylite.id: No. Tagihan, Atas Nama, Periode, Total (+PPN 11%), Denda, Jatuh Tempo; jika lunas → kartu hijau "sudah dibayar dan dilunaskan pada" + tombol "Lihat Bukti Pembayaran"; jika belum → pilih metode (daftar channel aktif dari Duitku via `GET /api/publik/duitku/methods`, fallback `DUITKU_METHODS`) + tombol **Bayar Online** → POST `/api/publik/duitku/transaction` pakai `kode` + `tagihanId` + `paymentMethod` → redirect ke `paymentUrl`.
- **Halaman invoice printable `/invoice-tagihan?invoice=...`** (server component, standalone tanpa navbar): logo + nomor invoice, penerbit (WASTEPAY), ditujukan kepada (nama/HP/ID pelanggan), tabel layanan (Subtotal + PPN 11% = TOTAL), status dibayar/metode/tanggal lunas, QR code verifikasi, footer; tombol "Unduh Tagihan" = `window.print()`. CSS khusus di `src/app/invoice-tagihan/invoice.css` (layout skylite).
- **API publik**: `GET /api/publik/tagihan-detail?invoice=...` → detail tagihan + rincian PPN + pembayaran lunas (404 jika tidak ada); dipakai kedua halaman di atas.
- **Integrasi admin**: halaman `/tagihan` menampilkan nomor invoice dengan link langsung ke halaman invoice.

### 4.4 Pembayaran
- **POST /api/pembayaran** — dua jalur:
  - **Tunai** (kasir/admin mencatat) → langsung `terverifikasi` + tagihan `lunas` (transaksi DB).
  - **Non-tunai** (transfer/ewallet/QRIS/VA) → status `pending`, menunggu verifikasi admin via PUT `/api/pembayaran/[id]` → verifikasi/reset.
- Validasi: nominal tidak boleh < tagihan+denda; tagihan harus cocok dengan pelanggan; tagihan lunas/dibatalkan ditolak.
- **Jalur publik**: `/bayar` (tanpa login) — pelanggan input kode → lihat daftar tagihan → pilih metode → upload bukti (maks ~2MB) → status pending → diverifikasi admin. API: POST `/api/publik/bayar`, GET `/api/publik/tagihan`.
- **Pembayaran online (Duitku, menggantikan Midtrans)**: tombol "Bayar Online" di `/bayar-tagihan` → POST `/api/publik/duitku/transaction` (buat Pembayaran pending `metode: duitku` + `DuitkuTransaction`, call `v2/inquiry`, reuse transaksi pending) → **redirect pelanggan ke `paymentUrl` Duitku** → **callback POST `/api/publik/duitku/notification`** diverifikasi signature **HMAC-SHA256** (`merchantCode+amount+merchantOrderId`) → `resultCode 00` → Pembayaran `terverifikasi` + Tagihan `lunas` otomatis (transaksi DB); `resultCode 01` (callback) → `ditolak`. GET `/api/publik/duitku/status` melakukan **live-check langsung ke Duitku** (`transactionStatus`, `statusCode 00/01/02`) sebagai fallback saat callback tidak terjangkau. Status konfigurasi admin: GET `/api/duitku/status` (halaman Pengaturan). Redirect (`returnUrl`) hanya informasi — status TIDAK diupdate dari redirect (bisa dimanipulasi).

### 4.5 Petugas, Rute, Jadwal, Pengangkutan
- **Petugas**: CRUD, terikat wilayah, soft-delete.
- **Rute**: nama, hari, jam, petugas, wilayah, aktif.
- **Jadwal**: assign pelanggan ke rute per hari (unik per pelanggan+rute+hari).
- **Pengangkutan**: catat pengambilan sampah — status `terjadwal/diambil/tidak_diangkut/kosong`, volume (m³), berat (kg), jenis sampah, catatan kendala (rumah kosong, akses tertutup), foto bukti, tautan ke TPA & petugas. **Petugas lapangan boleh membuat/mengubah** (level 10); delete hanya admin.

### 4.6 Komplain
- Pelanggan (lewat petugas/admin) mencatat komplain: tidak_diangkut / sampah_menumpuk / lainnya + foto.
- Alur status: baru → diproses → selesai, dengan tanggapan & siapa yang menyelesaikan.

### 4.7 Keuangan
- **Pengeluaran**: catat biaya operasional (bbm, gaji petugas, perawatan, operasional, lainnya) + bukti.
- **Laporan**: ringkasan keuangan bulanan (pemasukan, pengeluaran, saldo bersih) + **export CSV** (`/api/laporan/export?bulan=&tahun=`) berisi: ringkasan keuangan, daftar tagihan, daftar pembayaran, daftar pengangkutan, daftar tagihan menunggak. Format CSV dengan BOM UTF-8 (kompatibel Excel).
- **Rekonsiliasi harian** (admin): sistem menghitung total pemasukan terverifikasi hari ini, total pengeluaran, dan **total tunai menurut sistem**; admin input nominal tunai fisik → selisih dihitung & disimpan.

### 4.8 Komunikasi & Notifikasi
- **Pengumuman**: judul, isi, flag penting, sasaran per wilayah (null = semua).
- **Notifikasi WhatsApp**: kirim ke pelanggan spesifik atau massal ke semua aktif. Jika `WA_API_KEY` & `WA_API_URL` terisi → kirim otomatis via provider (status terkirim/gagal disimpan). Jika tidak → record `pending` + API mengembalikan **link `wa.me`** untuk kirim manual. Format pesan: `*judul*\n\npesan\n\n— Wastepay`.

### 4.9 Superadmin Only
- **Users**: kelola akun.
- **Audit Log**: riwayat semua mutasi (aksi, entitas, id, data lama/baru, user, waktu).

### 4.10 Referensi / Konfigurasi
- **Wilayah**: CRUD.
- **KategoriTarif**: CRUD tarif default per kategori.
- **Paket**: CRUD paket layanan + `POST /api/paket/seed` (superadmin).
- **Tpa**: CRUD tempat pembuangan akhir.
- **Pengaturan**: key-value settings.

---

## 5. Alur Bisnis Utama (end-to-end)

1. **Onboarding**: Admin buat wilayah → petugas → rute → daftarkan pelanggan (kategori/paket/koordinat/kode) → jadwalkan (pelanggan + rute + hari).
2. **Tagihan**: Awal bulan → admin jalankan "generate tagihan" → semua pelanggan aktif dapat tagihan (jatuh tempo tgl 15). Lewat tgl 15 → otomatis tunggakan + denda 2%/bulan.
3. **Pembayaran**: Tunai dicatat kasir (langsung lunas); non-tunai via halaman publik `/bayar` upload bukti → admin verifikasi → lunas.
4. **Operasional**: Petugas mencatat pengangkutan per jadwal (diambil/tidak diangkut/kosong + foto); komplain diproses.
5. **Keuangan**: Pengeluaran dicatat; laporan bulanan di-export CSV; rekonsiliasi tunai harian; audit trail lengkap.

---

## 6. Keamanan yang Sudah Ada
- JWT httpOnly cookie, exp 7 hari; JWT_SECRET wajib di production.
- RBAC 4 level; middleware fail-closed untuk API (rute tak terdaftar = 403).
- Double-check role di handler API (`getSession` + `hasRole`/`requireRole`).
- Password di-hash bcrypt (12 rounds); script rotasi password admin.
- Audit log semua mutasi (tidak pernah menggagalkan operasi utama).
- Soft delete pada data sensitif.
- Validasi input: kelengkapan data, kecocokan relasi, nominal minimum, ukuran upload.

## 7. Celah / Hal yang Perlu Diverifikasi (catatan analis)
- **Belum ada CSRF protection** untuk API mutasi berbasis cookie.
- **Rate limiting belum ada** (login & upload bukti publik bisa di-spam).
- **CORS tidak dikonfigurasi** — perlu dipastikan cookie `SameSite`/`Secure` di production.
- `GET /api/publik/tagihan` — pastikan hanya menampilkan data milik kode tersebut (sudah by-kode, perlu dicek leak data via enumerasi kode).
- **Duitku**: callback sudah diverifikasi signature (HMAC-SHA256); sebaiknya whitelist IP outgoing Duitku di firewall (production: 182.23.85.8-10/.13/.14, 103.177.101.184-186/.189/.190; sandbox: 182.23.85.11/.12, 103.177.101.187/.188). Endpoint `transactionStatus` punya hit-rate limit — jangan dipanggil berulang (cron); blokir ±1 jam saat melewati batas. Callback retry maks 5x lalu email notifikasi.
- Bukti bayar disimpan sebagai base64 di DB (bukan file/object storage) → berpotensi membengkakkan DB; tidak ada ukuran limit saat admin upload.
- **Tidak ada migration untuk Notifikasi `penerima`**, dsb — perlu `prisma migrate dev`/`db push` sebelum run di environment lain.
- Belum ada backup DB otomatis (hanya `scripts/backup.bat`).
- **WhatsApp**: satu pintu `kirimNotifikasi()` di `src/lib/wa.ts` (kirim via provider + simpan record). Alur otomatis: (1) daftar-online → konfirmasi ke pelanggan + `pendaftaran_masuk` ke `ADMIN_PHONE`; (2) generate tagihan → invoice + link bayar (`WA_AUTO_SEND`); (3) reminder H-3/H-1 & tunggakan via `scripts/reminder-wa.mjs` — terdaftar di Windows Task Scheduler sebagai `WastepayReminderWA` (tiap hari 09:00); (4) pembayaran diterima/ditolak → konfirmasi. Tanpa `WA_API_KEY` → record `pending` + link `wa.me`.
- Status `ditolak` pada Pembayaran: alur reset/refund belum terlihat jelas.
- Tidak ada pagination pada beberapa list API (mis. notifikasi `take: 50`, pelanggan tanpa pagination).

## 8. Testing
- `tests/unit.test.ts` (vitest): unit test `rbac` (hasRole, getAllowedMenus), `utils` (formatRupiah, cn), `tagihan` (totalTagihan).
- Script: `npm test` (vitest run), `npm run lint` (eslint), `npm run build`.
- **Belum ada** integration test untuk API routes maupun E2E.

## 9. Cara Menjalankan
```bash
npm install
# siapkan .env (DATABASE_URL, JWT_SECRET)
npx prisma migrate deploy   # atau prisma db push untuk dev cepat
npm run dev                 # http://localhost:3000
npm test                    # unit test
npm run build && npm start  # production
```

## 10. Rencana Pengembangan yang Wajar (saran)
1. Pagination + filter server-side untuk list besar (pelanggan, tagihan, pembayaran).
2. Upload bukti ke object storage / public folder, bukan base64 di DB.
3. Rate limit login & endpoint publik; CSRF token.
4. Cron/scheduled job: **generate tagihan otomatis tiap tanggal 1** + reminder H-3/H-1 + penanda tunggakan sudah jalan (`scripts/reminder-wa.mjs` + Task Scheduler `WastepayReminderWA` tiap hari 09:00; konfigurasi `TAGIHAN_GENERATE_DAY/BULAN/TAHUN/ENABLED`). Sisa: penanda tunggakan saat GET (sebagian sudah).
5. Dashboard: tambah grafik tren pemasukan/pengeluaran, top tunggakan.
6. Notifikasi: template pesan per tipe (jatuh tempo, jadwal, komplain).
7. Multi-tenant / multi-wilayah isolasi data.
8. Laporan: format PDF/XLSX, laporan per wilayah/petugas.
