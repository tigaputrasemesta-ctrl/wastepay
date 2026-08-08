# O2W Hero Zero Waste (SPLYNX)

> Sistem manajemen retribusi/pembayaran sampah berbasis web — siklus lengkap untuk satu badan pengelola sampah (TPST / RT / RW / perusahaan). Kode internal: `wastepay`.

O2W Hero Zero Waste menangani seluruh alur pengelolaan iuran sampah: **pendaftaran pelanggan → penagihan bulanan → pembayaran (tunai & non-tunai via Duitku) → penjadwalan pengangkutan → komplain → laporan keuangan → rekonsiliasi kas → notifikasi WhatsApp**.

## Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router + Turbopack) |
| UI | React 19, Tailwind CSS 3, komponen client custom |
| Bahasa | TypeScript 5 |
| ORM / DB | Prisma 7 + `@prisma/adapter-libsql` → SQLite (`dev.db`) |
| Auth | JWT (`jose`, HS256) via cookie `session` httpOnly, password `bcryptjs` (12 rounds) |
| RBAC | Middleware `src/proxy.ts` (fail-closed, 4 level role) |
| Payment | Duitku Payment Gateway (HMAC-SHA256, sandbox/production) |
| WhatsApp | Provider Fonnte-style (opsional via env, fallback link `wa.me`) |
| Testing | Vitest (unit) |

## Quick Start

```bash
npm install
cp .env.example .env   # sesuaikan DATABASE_URL & JWT_SECRET
npx prisma migrate deploy
npm run dev            # http://localhost:3000
```

Seed admin (password sekali pakai ditampilkan di response):

```bash
curl -X POST http://localhost:3000/api/auth/seed
```

## Scripts

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm run start` | Build & production |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run reminder` | Kirim reminder tagihan via WA (`scripts/reminder-wa.mjs`) |
| `python scripts/retheme.py` | Re-tema massal token UI lama → design system industrial |
| `node scripts/seed-dummy.mjs` | Reset penuh data dummy (4 area, 48 pelanggan) |
| `node scripts/link-zonasi.mjs` | Sinkron Wilayah 63 RT RTRW ke DB (non-destruktif) |
| `node scripts/link-petugas-login.mjs` | Link akun login → profil petugas + jabatan |
| `node scripts/seed-operasional.mjs` | Seed kendaraan & titik transit (idempotent) |

## Peta Wilayah (GIS)

Halaman `/peta` menyediakan peta operasional Kota Depok:

- **Zonasi kelurahan** — sel Voronoi dari 63 titik RT RTRW nyata (data `find-nearest` RTRW), warna ramp hijau→teal per kecamatan.
- **Batas kecamatan resmi** — poligon BPS 2015 (11 kecamatan) + label nama saat zoom kota.
- **Titik RT RTRW** — dot muncul saat zoom ≥ 13, tooltip berisi jumlah pelanggan terdekat.
- **Auto-zonasi pelanggan** — setiap pin menampilkan kelurahan/kecamatan terdeteksi dari koordinat (RT RTRW terdekat + validasi polygon), plus jarak ke RT.
- **Rute pengangkutan** — pilih rute → garis urutan tetangga-terdekat, titik start/akhir, estimasi total jarak, zoom otomatis ke area rute.
- **Pengaduan live** — komplain warga tampil real-time di peta (polling 15 detik): pin merah/amber/hijau per status, list + tab filter, klik → terbang ke lokasi, popup berisi detail + tombol hubungi WA. Form publik ada di landing page (`/` → #pengaduan) dengan validasi kode pelanggan + rate-limit per IP + notifikasi WA ke operator.
- **Anti-tumpuk** — pin pelanggan digabung jadi cluster (diamond lime); panel kiri bisa dicuitkan (peta auto-invalidateSize); layer bisa dimatikan satu per satu.
- **Lokasi realtime petugas** — petugas ber-jabatan `angkut` menekan tombol *Mulai Lacak GPS* (komponen `LacakLokasi`), posisi dikirim tiap 10 detik ke `POST /api/petugas/lokasi`; peta polling 10 detik → marker truk 🚛 dengan pulsasi lime bergerak realtime, tooltip nama + jabatan + akurasi, panel info "n PETUGAS ONLINE · UPDATE … WIB".
- **Model operasi 2 tingkat (lapak ↔ TPA)** — `/api/kendaraan` + `/api/transit`:
  - **Titik transit / lapak** (▲ amber): tempat dump truck standby sebelum berangkat ke TPA. CRUD di `/kendaraan` (admin) dengan pemilih koordinat.
  - **Kendaraan** 🚛 dump truck / 🛺 pickup / gerobak: punya plat nomor, kapasitas, pengemudi (`Petugas`), soft-delete. Marker di peta dengan warna per jenis + tooltip plat & pengemudi.
  - **Alur**: pickup kecil angkut dari rumah → setor ke lapak → dump truck buang ke TPA. Saat petugas menandai pickup "sudah diambil" di `/pengangkutan`, ia wajib memilih kendaraannya; `kendaraanId` tersimpan di riwayat pengangkutan (guard: kendaraan harus miliknya).
  - **Lokasi realtime kendaraan** — petugas pilih kendaraan di `LacakLokasi`; posisi dikirim ke `POST /api/kendaraan/lokasi` (guard pengemudi, pruning 500 titik) → marker truk bergerak di peta (polling 15 dtk).
  - **Direktori petugas online** — panel kiri peta: daftar petugas online + kendaraan + lapak, klik → terbang ke lokasi.
- **Stiker nomor pelanggan** — halaman `/sticker` (kasir+): pilih pelanggan per wilayah → cetak label A6 (kode besar + barcode CODE128 via `jsbarcode`) untuk ditempel di rumah; petugas angkut tinggal scan saat pickup.

Data RT RTRW: `src/lib/geojson/rt-rtrw-depok.json` (sumber tunggal). Batas kecamatan: `src/lib/geojson/depok-kecamatan.json`. Logika geo: `src/lib/geo.ts`.

## Dashboard

- Kartu statistik bulan berjalan (pelanggan, tagihan, terkumpul, komplain) + tingkat penagihan.
- **Grafik tren 6 bulan** pemasukan (pembayaran terverifikasi) vs pengeluaran — bar chart pure CSS, tanpa library.
- **Top tunggakan** — 5 pelanggan dengan total utang tertinggi (termasuk denda), agregasi otomatis dari DB.

## Petugas & Jabatan

- `Petugas` kini punya **jabatan** (`angkut` | `tagih` | `survei`, bisa rangkap via koma) dan **link akun login** (`Petugas.userId @unique`) — menghapus bug laten di mana filter "tugas saya" memakai `user.id` padahal harus `Petugas.id`.
- Halaman `/petugas` (admin): badge jabatan + form multi-checkbox + dropdown link akun login (akun role `petugas` yang belum terpakai).
- **Petugas Angkut** — `/pengangkutan?`saya=1"` daftar tugas miliknya; update pickup otomatis tercatat atas namanya + koordinat GPS; lokasi realtime di peta (tombol *Mulai Lacak GPS*).
- **Petugas Tagih** — halaman `/tagihan` berubah jadi *Tagihan Saya*: hanya tagihan pelanggan di wilayahnya (`?saya=1`); form bayar terkunci ke **Tunai** (dicatat `verifiedById` = akun petugas → tercatat utk rekonsiliasi kas harian); bisa verifikasi pembayaran pending di wilayahnya. Guard: tanpa jabatan `tagih` → 403.
- **Petugas Survei** — halaman baru `/survei`: daftar calon (`status=calon`), modal survei dengan **GeotagPhoto** (foto rumah + koordinat EXIF/GPS/manual) → *Simpan & Aktifkan*. Guard: wajib jabatan `survei` + whitelist field (petugas hanya bisa sentuh foto/geo/alamat/status, bukan tarif/kategori).
- API pengangkutan: petugas login otomatis tercatat sebagai `petugasId` (dari profil ter-link), endpoint `?saya=1` untuk "tugas saya", pickup bisa menyimpan koordinat GPS perangkat; `kendaraanId` opsional (pickup memakai kendaraan mana).
- Skrip `scripts/link-petugas-login.mjs` — contoh/link manual akun → profil. Skrip `scripts/seed-operasional.mjs` — seed kendaraan & lapak nyata (idempotent).

## Environment Variables

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite connection string |
| `JWT_SECRET` | ✅ | Kunci JWT; production menolak start jika kosong |
| `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_IS_PRODUCTION` | ⛔ (opsional) | Payment gateway; tanpa ini pembayaran online nonaktif |
| `WA_API_KEY`, `WA_API_URL`, `WA_AUTO_SEND`, `WA_BLAST_DELAY_MS` | ⛔ | Notifikasi WhatsApp; kosong → fallback `wa.me` |
| `ADMIN_PHONE` | ⛔ | Nomor helpdesk untuk notifikasi pendaftaran baru |
| `NEXT_PUBLIC_APP_URL` | ⛔ | URL publik untuk callback Duitku |
| `COMPANY_*` | ⛔ | Identitas brand di invoice & landing page (`COMPANY_NAME`, `COMPANY_EMAIL`, `COMPANY_WHATSAPP`, `COMPANY_ADDRESS`) |

## Arsitektur

```
src/
├── proxy.ts              # Middleware RBAC (fail-closed) + CSRF untuk API mutasi
├── app/
│   ├── (admin)/          # 19 halaman admin (dashboard, tagihan, pelanggan, ...)
│   ├── (public)/         # Halaman publik (cek tagihan, bayar, daftar online)
│   ├── api/              # 50+ route API (auth, CRUD, duitku, publik, laporan)
│   ├── invoice-tagihan/  # Invoice printable (A4, via window.print)
│   └── page.tsx          # Landing page publik (brand O2W Hero Zero Waste)
├── components/           # Sidebar, Toast, ConfirmDialog, GeotagPhoto, ...
├── lib/                  # prisma, auth, csrf, duitku, invoice, captcha, rate-limit, ...
└── types/
```

### Keamanan (sudah diterapkan)

- **RBAC fail-closed** — route API yang tidak terdaftar ditolak 403; akses per-role (superadmin 100 → petugas 10)
- **CSRF protection** — validasi Origin/Referer untuk semua API mutasi ber-cookie (`src/lib/csrf.ts`, dipasang di `proxy.ts`); non-browser client (cron/script) tetap diizinkan
- **Webhook Duitku** — signature HMAC-SHA256 diverifikasi + jumlah callback dicocokkan dengan transaksi tersimpan
- **OrderId Duitku acak** — tidak dapat dienumerasi (cegah IDOR pada endpoint status publik)
- **Rate limit login** — 6 percobaan / 15 menit per email+IP (`src/lib/rate-limit.ts`); rate limit juga aktif di form pengaduan publik
- **Security headers** — CSP, X-Frame-Options DENY, nosniff, Referrer-Policy (lihat `next.config.ts`)
- **Endpoint publik disaring** — `/api/publik/tagihan-detail` tidak mengekspos alamat/no. telepon/riwayat pembayaran
- **Captcha + honeypot** — form daftar online (HMAC server-side, `src/lib/captcha.ts`)
- **Cookie** — httpOnly + sameSite=lax; password bcrypt 12 rounds
- **Ganti password** — wajib password lama, min 8 karakter

## Desain

UI bertema **"Unit Pengelola Sampah — Control Room"**: industrial dark (asphalt), aksen safety-lime, tipografi Anton/Archivo/JetBrains Mono, sudut chamfer, strip hazard, grain overlay. Design system ada di `src/app/globals.css` (`.panel`, `.chamfer`, `.stencil`, `.badge`, `.tbl`, `.btn`).

## Testing

```bash
npm test
```

Unit tests ada di `tests/` (Vitest). Tambahkan test baru untuk logika murni (rate limit, kalkulasi invoice, captcha, csrf, dll).

---

**O2W Hero Zero Waste © 2026** — Pengelolaan Retribusi Sampah
