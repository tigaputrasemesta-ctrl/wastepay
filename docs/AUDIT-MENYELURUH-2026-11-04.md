# Audit WastePay — 4 November 2026

## Ringkasan

- Baseline: branch `master`, commit `6360513`; working tree bersih sebelum audit.
- Stack aktual: Next.js 16.2.11, React 19.2.4, Prisma 7, PostgreSQL melalui `@prisma/adapter-pg`; Flutter untuk aplikasi native, serta kode Capacitor/web mobile.
- Kesimpulan: pengujian unit lulus, tetapi kontrol akses, integritas pembayaran, dan laporan masih memiliki masalah prioritas tinggi. Kelulusan unit test bukan bukti kesiapan produksi.
- Tidak ada perubahan kode aplikasi, mutasi database sungguhan, transaksi Duitku, pengiriman WhatsApp, atau pemeriksaan eksploitasi terhadap deployment produksi.
- Sebanyak **13 pemeriksaan terisolasi memakai mock** mengonfirmasi perilaku kode. Pemeriksaan tersebut tidak membuktikan insiden atau eksploitasi produksi.

### Hasil pemeriksaan

| Pemeriksaan | Hasil |
|---|---|
| `npm test` | Lulus: 16 file, 202 test |
| `npm run typecheck` | Lulus, exit 0 |
| `npm run lint` | Gagal: 2 error, 14 warning |
| `npm run check:classes` | Gagal: 347 temuan heuristik kelas/kontras; bukan 347 bug fungsional terverifikasi |
| Route API vs `API_ROLE_MAP` | 7 kombinasi bisnis dan 7 handler `OPTIONS` tidak terdaftar |
| Reproduksi terisolasi | 13 pemeriksaan lulus dalam menunjukkan perilaku bermasalah |
| `npm audit --package-lock-only --ignore-scripts --json` | Timeout 90 detik; status kerentanan dependensi belum diketahui |
| Build produksi / E2E / DB integration | Tidak dijalankan dalam audit ini |
| Flutter analyze/test/build | Tidak dijalankan: `flutter` dan `dart` tidak tersedia |

Build tidak dijalankan untuk menghindari prerender/akses eksternal melalui konfigurasi lingkungan yang belum diisolasi. Verifikasi berikutnya harus memakai DB uji, gateway sandbox, dan provider notifikasi stub.

## Prioritas

- **P1:** keamanan data, otorisasi, dan integritas keuangan; perbaiki sebelum rilis berikutnya.
- **P2:** keandalan fitur, konfigurasi, operasi, dan konsistensi bisnis.
- **P3:** kualitas UI, dokumentasi, dan otomatisasi verifikasi.

## P1 — Keamanan dan integritas

### F01 — Webhook WhatsApp tidak diautentikasi

**Bukti:** `src/app/api/publik/wa-webhook/route.ts:48,106,119,135`; `src/lib/server/wa-bot-service.ts:27,390`.

POST mempercayai `sender` dari body tanpa signature/shared secret maupun rate limit. Handler mencari pelanggan berdasarkan nomor tersebut, menjalankan bot, mengirim WhatsApp, dan mengembalikan `reply` serta `pelangganId` ke pemanggil. Intent jadwal dapat mengandung alamat; intent tagihan mengandung data pelanggan/tagihan. Intent komplain dapat membuat tiket atas nama pelanggan.

**Dampak:** pemalsuan identitas pelanggan pada webhook, pembacaan balasan privat langsung dari HTTP, spam biaya/pesan provider, tiket palsu.

**Verifikasi:** mock membuktikan request tanpa kredensial menjalankan bot dan fungsi kirim serta mendapatkan balasan. Tidak ada WhatsApp sungguhan dikirim.

**Perbaikan:** autentikasi webhook sesuai kemampuan provider; validasi sebelum parsing/lookup; anti-replay/deduplikasi event; rate limit; hilangkan balasan privat dari respons HTTP publik. Jika provider tidak mendukung signature, gunakan secret endpoint/header yang kuat dan pembatasan jaringan yang terverifikasi.

### F02 — `trackingToken` bocor ke pembaca daftar/detail petugas

**Bukti:** `src/app/api/petugas/route.ts:10,44,52`; `src/app/api/petugas/[id]/route.ts:11,22`; `prisma/schema.prisma:193`; `src/app/api/mobile/tracking/route.ts`.

Query petugas memakai `include` tanpa proyeksi scalar; seluruh scalar termasuk `trackingToken` ikut direspons. Proxy mengizinkan GET daftar/detail untuk level 10. Endpoint tracking menerima token tersebut untuk menentukan petugas tanpa perlu sesi user.

**Dampak:** petugas berprivilege rendah dapat memperoleh token petugas lain dan mengirim lokasi atas nama petugas tersebut.

**Verifikasi:** mock daftar membuktikan token terserialisasi; mock tracking membuktikan token dapat menulis lokasi petugas lain tanpa sesi.

**Perbaikan:** gunakan allowlist `select`, jangan respons token melalui CRUD umum, rotasi token yang berpotensi terekspos setelah perbaikan, batasi endpoint provisioning token ke pemilik/admin. Tracking juga perlu memeriksa `deletedAt`, keterkaitan akun aktif, batas koordinat, dan rate limit.

### F03 — Foto rumah publik berdasarkan ID berurutan

**Bukti:** bypass `src/proxy.ts:355` sekitar pengecualian `/api/peta/foto-rumah`; handler `src/app/api/peta/foto-rumah/route.ts:11,65`.

Tidak ada autentikasi di handler. ID cukup untuk mendapat foto; mode JSON juga mengembalikan nama dan data gambar. Tidak ada filter `deletedAt`. Respons gambar base64 diberi cache publik CDN hingga 7 hari ditambah stale window.

**Dampak:** enumerasi foto rumah/nama, termasuk data pelanggan yang telah soft-delete; penghapusan akses tidak segera menghilangkan salinan cache.

**Verifikasi:** mock request tanpa sesi mengembalikan nama dan foto.

**Perbaikan:** wajib sesi dan scope, atau signed URL berumur pendek jika memang publik; filter soft-delete; jangan gunakan cache publik untuk data privat; evaluasi purge cache terdampak.

### F04 — Revokasi sesi gagal tertutup dan role JWT bisa usang

**Bukti:** `src/lib/auth.ts:129–142`; `src/proxy.ts:303–328`; `src/app/api/users/route.ts`.

- `getSession()` menerima token jika user tidak ditemukan atau lookup DB melempar error.
- `loadSessionUser()` pada proxy juga fallback ke payload saat user tidak ditemukan/DB error.
- `getSession()` mengembalikan role dari JWT, bukan role DB terkini.
- Perubahan role melalui users PUT tidak menaikkan `tokenVersion`.
- Claim versi `v` bersifat opsional pada pemeriksaan revokasi.

**Dampak:** token user terhapus tetap diterima oleh bagian autentikasi; saat lookup DB gagal, pencabutan/penurunan hak dapat diabaikan. Ketika DB sehat, proxy memakai role terkini, sehingga dampak role JWT usang bergantung pada endpoint yang dilewati dan pemeriksaan handler; bukan bypass universal.

**Verifikasi:** mock mengonfirmasi `getSession()` menerima user null dan error DB.

**Perbaikan:** tolak user tidak ada, akun nonaktif, versi hilang/tidak cocok; kegagalan DB harus memberi 503/penolakan aman, bukan mempertahankan otorisasi lama; pakai data user terkini; naikkan versi ketika role/status keamanan berubah.

### F05 — Petugas tagih dapat menyetujui pembayaran sendiri

**Bukti:** `src/proxy.ts` aturan `PUT:/api/pembayaran/` level 10; `src/app/api/pembayaran/[id]/route.ts:103–115`; `src/app/api/pembayaran/route.ts` alur tunai petugas pending.

Petugas berjabatan `tagih` boleh memverifikasi pembayaran. Ini bertentangan dengan tujuan kode POST yang menunggu verifikasi admin setelah penyetoran/rekonsiliasi. PUT tidak membatasi metode pembayaran petugas ke tunai. Scope wilayah juga dinonaktifkan secara global lewat `PETUGAS_SCOPE_ALL`.

**Dampak:** pemisahan tugas penerima uang dan pemeriksa setoran tidak efektif; petugas bisa mengesahkan pembayaran non-gateway pending tanpa bukti penerimaan dana oleh admin.

**Verifikasi:** mock petugas tagih berhasil menandai pembayaran terverifikasi.

**Perbaikan:** verifikasi hanya admin/superadmin atau peran independen yang disepakati; simpan `recordedById` terpisah dari `verifiedById`; larang self-approval; terapkan scope di handler.

### F06 — Banyak pembayaran dapat diverifikasi untuk tagihan yang sama

**Bukti:** `src/app/api/pembayaran/[id]/route.ts:153–173`; `src/lib/duitku-sync.ts:70–96`; `src/app/api/publik/duitku/transaction/route.ts:91,122,134`.

PUT memverifikasi record pending lebih dulu, lalu hanya melewati update tagihan jika sudah lunas. Tidak menolak record kedua. Pemeriksaan status pembayaran di luar transaksi tidak melindungi request bersamaan. Jalur sinkronisasi Duitku juga bisa memverifikasi transaksi lain meskipun tagihan sudah lunas.

Pembuatan checkout memanggil provider sebelum menyimpan DB; sesi baru menandai sesi lama ditolak secara lokal tanpa membatalkan checkout provider. Callback sukses untuk sesi lama tetap bisa mengubah pembayaran ditolak menjadi terverifikasi. Mengabaikan callback sukses bukan solusi: uang yang benar-benar diterima harus dicatat sebagai overpayment/refund liability, bukan hilang.

**Dampak:** kas/pendapatan layanan dapat terhitung ganda; checkout ganda tetap dapat dibayar; pembayaran untuk tagihan dibatalkan juga dapat mengubah status menjadi lunas.

**Verifikasi:** mock memverifikasi pembayaran kedua pada tagihan sudah lunas. Risiko race dan checkout provider ditetapkan dari alur kode; belum dites terhadap DB/provider sungguhan.

**Perbaikan:** transaksi dengan penguncian/conditional transition, idempotency key, constraint/model alokasi pembayaran, validasi nominal terbaru, jalur overpayment/reversal eksplisit. Batalkan atau tandai superseded checkout di provider jika didukung. Jangan menyamakan satu pembayaran tambahan dengan pendapatan layanan tambahan.

### F07 — Penyegaran tunggakan dapat menimpa status lunas

**Bukti:** `src/lib/tagihan.ts:22–30,48–50`.

Updater membaca tagihan unpaid, kemudian menulis `status: tunggakan` hanya berdasarkan ID. Pembayaran yang melunasi tagihan di sela baca/tulis dapat tertimpa. `lastRun` juga diset sebelum operasi berhasil sehingga kegagalan menunda retry hingga 5 menit.

**Dampak:** tagihan yang telah dibayar kembali terlihat menunggak, berisiko ditagih ulang dan merusak laporan.

**Verifikasi:** mock interleaving mengonfirmasi status lunas berubah menjadi tunggakan.

**Perbaikan:** `updateMany` dengan kondisi status unpaid + `deletedAt: null`, sertakan pemeriksaan state/versi; catat throttle setelah berhasil dan gunakan single-flight bila perlu.

### F08 — Halaman cetak melewati batas role halaman utama

**Bukti:** `src/app/laporan-cetak/page.tsx:28–39`; `src/app/laporan-pembayaran-cetak/page.tsx:21–22`; `src/app/pelanggan-cetak/page.tsx:39–40`; `src/app/absensi-cetak/page.tsx:42–43`; `PAGE_ROLES` pada `src/proxy.ts`.

Halaman tersebut hanya meminta sesi, tanpa minimum role. Prefix `/laporan` tidak mencakup `/laporan-cetak` karena proxy memakai kecocokan exact atau prefix dengan `/`.

**Dampak:** role petugas dapat membuka laporan keuangan/daftar pelanggan atau absensi yang pembatasannya lebih ketat di halaman utama. Ini temuan statis; render halaman dengan DB uji belum dijalankan.

**Perbaikan:** guard server-side berbasis role dan scope pada setiap halaman cetak; inventarisasi semua route standalone, jangan hanya mengandalkan menu.

### F09 — Tagihan dibatalkan masuk pendapatan dan piutang laporan

**Bukti:** `src/lib/laporan.ts:122,312–317,332`.

Query periode hanya menyaring `deletedAt`, tidak mengeluarkan `dibatalkan`. Semua jumlah dijumlahkan sebagai pendapatan akrual; filter `status !== lunas` memasukkan invoice dibatalkan sebagai unpaid.

**Dampak:** revenue, laba, piutang, jumlah belum bayar, dan KPI turunannya terlalu tinggi.

**Verifikasi:** mock satu invoice dibatalkan Rp50.000 menghasilkan pendapatan dan accrued receivable Rp50.000.

**Perbaikan:** definisikan status eligible akuntansi; pisahkan void/cancellation/credit adjustment; tambahkan regression test semua status.

### F10 — Laporan historis bukan snapshot akhir periode

**Bukti:** `src/lib/laporan.ts:53,122,178–185,381–382`.

Aging memakai waktu saat ini, bukan tanggal akhir periode laporan. Piutang menggunakan status tagihan saat ini; pembayaran yang terjadi setelah akhir periode dapat menghilangkan piutang historis. Cohort/denominator aktif juga memakai kondisi sekarang.

**Dampak:** membuka ulang laporan bulan yang sama pada waktu berbeda menghasilkan aging, CKPN, dan piutang berbeda tanpa koreksi periode yang eksplisit.

**Verifikasi:** mock laporan Februari 2020 menempatkan jatuh tempo Januari 2020 ke bucket >180 hari berdasarkan waktu sekarang, bukan bucket akhir Februari.

**Perbaikan:** hitung ledger as-of periode; gunakan pembayaran/reversal bertanggal sampai cutoff; tetapkan kebijakan akhir periode dan snapshot bila diperlukan. Label PSAK tidak cukup untuk menjamin kepatuhan akuntansi.

## P2 — Fitur, konfigurasi, dan operasi

### F11 — Route proxy hilang memblokir fitur dan preflight

**Bukti:** perbandingan seluruh ekspor route dengan `API_ROLE_MAP`; reproduksi mock proxy untuk superadmin.

Tujuh kombinasi bisnis ditolak 403 `Forbidden: rute tidak terdaftar`:

```text
GET  /api/pembayaran/[id]
GET  /api/pengaturan
POST /api/pengaturan
GET  /api/survei
PUT  /api/survei/[id]
POST /api/upload
POST /api/notifikasi/retry
```

Tujuh handler `OPTIONS` juga tidak terdaftar: `/api/absensi`, `/api/admin/artikel`, `/api/artikel`, `/api/fill`, `/api/pelanggan/export`, `/api/pengaturan`, `/api/peta`. Browser preflight tanpa token ditolak 401 sebelum mencapai handler; token pun tidak menyelesaikan aturan method yang hilang.

**Perbaikan:** cocokkan rule dengan kontrak handler; tangani OPTIONS yang sah sebelum auth; tambah test seluruh matriks route/method/role. Jangan asal membuka `PUT /api/survei/[id]`: handler saat ini bisa mengubah `status`, `kategori`, `customTarif` tanpa guard jabatan/scope/validasi bisnis memadai.

### F12 — Pajak, denda, dan biaya admin tidak konsisten dengan Pengaturan

**Bukti:** `src/lib/invoice-format.ts:77–80`; `src/lib/tagihan.ts:37`; `src/lib/server/wastepay-api-route-handlers.ts:74–92`; `src/app/api/publik/duitku/transaction/route.ts:83–87`.

Pengaturan menyimpan pajak/denda/biaya admin tetapi `hitungRincian` mengabaikan pajak+denda, updater memaksa denda nol, QRIS hardcode Rp1.500. Alur pelunasan manual tagihan dan bot masih menambahkan `denda` tersimpan. Nilai setting juga disimpan sebagai string tanpa batas range dan tanpa transaksi bersama.

**Verifikasi:** mock `hitungRincian(50000, 10000, 0.11)` mengembalikan Rp50.000, pajak/denda nol.

**Perbaikan:** putuskan aturan bisnis resmi. Jika pajak/denda memang dihapus, hapus/nonaktifkan setting dan semua penjumlahan lama; jika configurable, gunakan satu kalkulator server dengan validasi angka finite/range dan snapshot tarif pada invoice. Samakan UI, bot, gateway, laporan, dan kwitansi.

### F13 — Bot hanya memeriksa enam tagihan terakhir

**Bukti:** `src/lib/server/wa-bot-service.ts:257–289`.

Bot mengambil enam invoice terbaru lalu menyatakan seluruh tagihan lunas jika enam itu paid. Tunggakan lebih lama tidak diperiksa; total outstanding juga terpotong.

**Verifikasi:** mock mengonfirmasi query `take: 6` dan respons klaim seluruh tagihan lunas.

**Perbaikan:** query seluruh outstanding untuk aggregate, limit hanya rincian tampilan; tampilkan jumlah periode tambahan.

### F14 — Laporan memiliki batas tanggal, soft-delete, dan satuan operasional tidak konsisten

**Bukti:** `src/lib/laporan.ts:51–52,128–158,411–424`.

- Batas bulan memakai timezone lokal server, bukan WIB eksplisit. Deployment UTC menggeser klasifikasi sekitar tengah malam WIB.
- Agregat pengangkutan tidak menyaring `deletedAt`.
- `totalRitase` dihitung dari jumlah record pengangkutan pelanggan, bukan perjalanan kendaraan yang dibuktikan unik.
- Collection rate membandingkan penerimaan bruto (termasuk biaya admin/kelebihan pembayaran) dengan pokok tagihan; pembayaran di muka periode ini tidak masuk pembilang yang sama. Makna metrik harus didefinisikan, bukan dipakai sebagai persentase pelunasan tanpa penjelasan.

**Perbaikan:** helper rentang WIB bersama; filter soft-delete; entitas/ID ritase yang benar; pisahkan kas, pokok iuran, pajak/fee, dan allocation revenue.

### F15 — TLS database tidak memverifikasi sertifikat

**Bukti:** `src/lib/prisma.ts:21–22` memakai `rejectUnauthorized: false` pada production/host tertentu.

**Dampak:** koneksi terenkripsi tetapi identitas server DB tidak diverifikasi; meningkatkan risiko MITM bila jalur jaringan/DNS terganggu.

**Perbaikan:** gunakan CA provider dan verifikasi sertifikat; dokumentasikan pengecualian hanya jika ada kontrol jaringan yang setara dan persetujuan eksplisit.

### F16 — Histori migrasi campur SQLite dan PostgreSQL

**Bukti:** `prisma/migrations/migration_lock.toml` PostgreSQL; migrasi awal memakai `AUTOINCREMENT`, `PRAGMA`, rebuild tabel SQLite, sedangkan migrasi baru memakai `SERIAL` PostgreSQL.

**Dampak:** rantai migrasi tidak dapat direplay apa adanya pada PostgreSQL kosong. Keberadaan `ensureArmadaRuteSchema()` yang melakukan DDL saat request dan menelan error juga menandakan migrasi belum menjadi sumber kebenaran tunggal.

**Perbaikan:** buat baseline PostgreSQL yang direview dan diuji pada DB kosong; jangan menjalankan reset pada DB produksi; validasi checksum/status migrasi dan skenario upgrade memakai salinan DB. Hapus runtime DDL setelah baseline stabil.

### F17 — Penyimpanan dan masa berlaku sesi mobile tidak konsisten

**Bukti:** `src/app/api/auth/login/route.ts:35–49`; `src/lib/auth.ts:34–53`; `src/app/api/auth/mobile-restore/route.ts:47`; `src/components/mobile/MobileSessionGuard.tsx:16`; `src/components/Sidebar.tsx:165–169`.

- Cookie petugas 90 hari tetapi JWT hasil login tetap 7 hari; restore setelah JWT expired tidak dapat berhasil.
- Endpoint restore dapat menerbitkan JWT 90 hari untuk semua role, bukan hanya petugas; tidak ada refresh-token terpisah/absolute session lifetime.
- Web menyimpan bearer token di `localStorage`, sehingga XSS bisa membacanya.
- Sidebar logout hanya menghapus cookie lewat API; tidak menghapus token lokal maupun cache offline. Jalur logout `/m` menghapus token, tetapi kebijakan tidak seragam.
- Flutter sudah memakai `FlutterSecureStorage`: ini kontrol positif, jangan disamakan dengan web localStorage.

**Perbaikan:** access token singkat + refresh rotation/revocation, storage aman native, cookie HttpOnly untuk web; satu fungsi logout yang membersihkan token dan cache sesuai kebijakan privasi. Jangan memperpanjang sesi admin menjadi 90 hari tanpa kebijakan eksplisit.

### F18 — Allowlist CORS terlalu luas

**Bukti:** `src/lib/server/wastepay-backend-core-services.ts:47–59`.

`endsWith('upsheru.com')` menerima hostname yang bukan domain/subdomain resmi; semua origin `.vercel.app` juga dipercaya. Origin tak dikenal menghasilkan wildcard `*` bersamaan credentials `true`, kombinasi yang browser tolak untuk credentialed reads.

**Batas dampak:** proxy/CSRF dan SameSite masih membatasi banyak request; temuan ini bukan bukti universal cookie theft. Preflight yang sekarang terblokir jangan dibuka sebelum allowlist dibenahi.

**Perbaikan:** parse origin dengan URL; cocokkan scheme+hostname+port secara exact dengan deployment resmi; subdomain harus memakai batas titik; jangan respons CORS untuk origin yang tidak diizinkan.

### F19 — Backup belum membuktikan enkripsi/restorability

**Bukti:** `.github/workflows/db-backup.yml:37–53`.

Step bernama `Upload Encrypted Backup Artifact`, tetapi file hanya dikompresi `zstd`; tidak ada enkripsi isi dump di workflow. Ini tidak meniadakan kontrol enkripsi milik GitHub, tetapi klaim enkripsi payload sendiri tidak terbukti. Tidak terlihat restore-test otomatis. Pipeline tidak menyatakan `shell: bash`/`set -o pipefail` eksplisit; pastikan kegagalan `pg_dump` tidak tertutup keberhasilan kompresor pada shell yang dipakai.

**Perbaikan:** client-side encryption dengan key terkelola terpisah bila diperlukan kebijakan; explicit pipefail; alert backup gagal; restore drill DB uji; retention dan akses artifact minimum. Jangan menganggap file terkompresi sebagai backup yang telah teruji.

### F20 — Rate limit terdistribusi belum terkonfirmasi

**Bukti:** `src/lib/rate-limit.ts`; pemeriksaan keberadaan key pada `.env`, `.env.local`, `.env.production` tanpa mencetak nilai.

Ketiga file lokal tidak memiliki pasangan Upstash URL/token terisi; kode fallback ke limiter per proses. Nilai environment deployment Vercel tidak diperiksa, sehingga tidak boleh disimpulkan production pasti tanpa Redis.

**Dampak bersyarat:** pada deployment multi-instance tanpa Redis, limit bisa terpecah antar instance/restart. Invoice publik masih memakai nomor yang dapat ditebak dan merender alamat lengkap (`src/app/invoice-tagihan/page.tsx:84,215–217`); rate limit bukan otorisasi atau secret link.

**Perbaikan:** verifikasi environment deployment, limiter shared untuk jalur publik, signed/opaque invoice access token jika alamat memang privat, batas ukuran input dan deduplikasi biaya provider.

### F21 — Validasi batas input dan error disclosure belum konsisten

**Bukti:** `src/app/api/pembayaran/route.ts:95–97`; `src/app/api/publik/duitku/transaction/route.ts:186`; `src/app/api/mobile/tracking/route.ts`; `src/app/api/publik/bayar/route.ts`.

Nominal pembayaran internal hanya `parseFloat` dan perbandingan minimum, tanpa `Number.isFinite`/integer rupiah/allowlist metode. Tracking hanya memastikan finite, bukan rentang lat/lng. Pembuatan gateway mengembalikan `error.message` ke publik meskipun komentar melarangnya. Endpoint publik bisa membuat pembayaran pending tanpa bukti dan tanpa deduplikasi; status tetap pending, jadi ini bukan bukti pembayaran otomatis lunas.

**Perbaikan:** schema validation pada semua boundary; ID integer ketat, finite integer rupiah dan range; allowlist enum/metode; batas bukti sebelum alokasi besar, bukti wajib bila alur mensyaratkan, idempotency pending; error publik generik dengan correlation ID. Gunakan integer rupiah/Decimal, bukan Float, untuk kontrak keuangan baru.

## P3 — Kualitas dan cakupan pengujian

### F22 — Lint dan pemeriksaan kelas belum bersih

- `src/app/(admin)/frozen-router.tsx:9`: `react-hooks/refs`.
- `src/app/(public)/tarif/page.tsx:60`: `react-hooks/immutability`.
- 14 warning unused eslint-disable; peringatan `.eslintignore` tidak didukung ESLint 9.
- `check:classes` melaporkan 347 occurrence: kelas Tailwind v4 seperti `shadow-xs` pada proyek Tailwind v3 dan heuristik warna/kontras. Perlu verifikasi visual konteks; tidak otomatis berarti semua pasangan warna gagal WCAG.

### F23 — Suite unit tidak mencakup invariant paling berisiko

202 test yang ada lulus, tetapi tidak ditemukan regression test untuk `getLaporan`, proxy-route coverage, alur persetujuan pembayaran ganda, atau interleaving updater tunggakan. Workflow yang ada berfokus APK, approval, dan backup; tidak ada gate web unit/typecheck/lint menyeluruh yang terlihat.

Tambahkan CI dengan DB uji PostgreSQL: route/role matrix, deleted/revoked users, self-approval, duplicate/late gateway callbacks, transaksi paralel, cancelled invoices, WIB month boundary, snapshot historis, serta replay migrasi.

### F24 — Dokumentasi domain lama bertentangan dengan kode

`AGENTS.md`, `RINGKASAN-SISTEM.md`, dan `ANALISA-TEST.md` masih memuat SQLite, Midtrans, denda 2%, PPN 11%, serta hasil test lama. Kode aktif menggunakan PostgreSQL/Duitku, denda dan pajak diabaikan kalkulator. Dokumen juga memuat kredensial pengujian historis: jangan menganggap sudah tidak berlaku tanpa verifikasi dan jangan menyalinnya ke laporan publik.

Perbarui arsitektur/aturan bisnis dan hapus kredensial dari dokumentasi; rotasi akun jika kredensial historis masih berlaku. Keberadaan audit lama tidak membuktikan hasil saat ini.

## Kontrol positif

- Proxy API secara umum fail-closed; route yang tidak terdaftar tidak otomatis terbuka.
- JWT diverifikasi kriptografis; cookie HttpOnly, Secure pada production, SameSite Lax.
- Password bcrypt; perubahan password menaikkan tokenVersion.
- Callback Duitku memeriksa signature dan mencocokkan amount transaksi tersimpan. Keselarasan algoritme/protokol terhadap kontrak merchant/provider belum diuji dalam audit ini; jangan menebak berdasarkan komentar yang saling berbeda.
- Gateway verified payment tidak boleh dihapus langsung; pelunasan tunai admin memakai conditional tagihan update di transaksi.
- Banyak mutasi sudah memiliki audit log dan soft-delete.
- Flutter memakai secure storage; endpoint TV memakai token khusus.
- Hanya `.env.example` tercatat oleh Git pada snapshot saat ini; ini tidak menyatakan histori repository bebas rahasia.

## Rencana perbaikan berurutan

1. Tutup/otentikasi webhook WA, hentikan kebocoran tracking token/foto rumah, dan evaluasi rotasi/purge data terdampak.
2. Benahi sesi fail-closed dan guard role halaman cetak; terapkan aturan minimum akses di handler.
3. Pisahkan penerima kas dan pemeriksa; jadikan transition pembayaran/tagihan atomik, idempoten, dan aman terhadap concurrency/overpayment.
4. Perbaiki updater tunggakan, cancelled invoice, snapshot historis, WIB boundary, dan pemisahan fee dari pendapatan layanan.
5. Rapikan kontrak setting; selesaikan guard survei sebelum membuka route proxy yang hilang; betulkan preflight/CORS.
6. Uji baseline migrasi PostgreSQL kosong dan restore backup; aktifkan CI lint/typecheck/unit/integration dengan provider stub.
7. Jalankan build/E2E web serta Flutter analyze/test/build pada lingkungan terisolasi. Lakukan audit dependensi ulang saat registry dapat dijangkau.

## Artefak audit lokal

Artefak berikut berada di luar repository, tidak memuat kredensial nyata:

- `~/tmp/wastepay-audit-repro.cjs`: runner reproduksi dengan mock, tanpa impor koneksi nyata.
- `~/tmp/wastepay-audit-repro.log`: 13 konfirmasi perilaku kode.
- `~/tmp/wastepay-typecheck.log`.
- `~/tmp/wastepay-lint.log`.

Ulangi reproduksi dari direktori mana pun dengan:

```bash
node "$HOME/tmp/wastepay-audit-repro.cjs"
```

Laporan ini bukan pengesahan kepatuhan PSAK, uji penetrasi produksi, pemeriksaan histori rahasia lengkap, atau audit dependency yang berhasil. Temuan statis dan mock harus dilanjutkan dengan regression/integration test pada DB uji sebelum penutupan temuan.
