# API_TENANT_MAPPING.md: Pemetaan & Spesifikasi Endpoint API O2W HERO
> **Standar**: RESTful Multi-Tenant API Binding  
> **Cakupan**: 100+ Route Handlers di `src/app/api/`  
> **Status**: Terpetakan & Terverifikasi

---

## 1. Skema Ekstraksi Tenant Context pada API

Setiap route handler mengekstrak identitas tenant melalui 4 metode tergantung konteks permintaan:

1. **`HOST_HEADER`**: Diekstrak dari header HTTP `Host` / `x-forwarded-host` via `resolveTenantByHost(rawHost)`. Digunakan pada seluruh endpoint publik dan halaman portal web mitra.
2. **`SESSION_JWT`**: Diekstrak dari sesi cookie login terenkripsi `session.tenantId`. Digunakan pada endpoint operasional internal (admin, kasir, petugas).
3. **`GATEWAY_INVOICE`**: Diekstrak dari format prefix nomor pesanan pembayaran (e.g. `INV-UPS-2026-XXXX`). Digunakan pada callback webhook pihak ketiga (Duitku / Midtrans).
4. **`DEVICE_WA_ID`**: Diekstrak dari nomor WhatsApp penerima (ID instance bot) pada webhook pesan masuk.

---

## 2. Pemetaan Lengkap Endpoint API

### Kategori 1: SaaS Control Plane APIs (`/api/core/*`)
*Host Resmi: `o2whero.com` / `admin.o2whero.com` | Khusus Superadmin (Level 100)*

| Method | Endpoint Path | Role Min | Sumber Tenant | Fungsi & Perlindungan Isolasi |
|---|---|:---:|:---:|---|
| `GET` | `/api/core/tenants` | 50 | Global | Menampilkan daftar seluruh mitra, status langganan, dan tipe pengelola. |
| `POST` | `/api/core/tenants` | 100 | Global | Registrasi dan *provisioning* tenant mitra baru. |
| `GET` | `/api/core/tenants/[id]` | 50 | Parameter `[id]` | Mengambil detail konfigurasi satu tenant tertentu. |
| `PATCH` | `/api/core/tenants/[id]` | 100 | Parameter `[id]` | Memperbarui paket, status (aktif/suspend), atau domain mitra. |
| `DELETE`| `/api/core/tenants/[id]` | 100 | Parameter `[id]` | Menghapus atau menonaktifkan tenant mitra. |
| `GET` | `/api/core/control-tower` | 50 | Global | Ringkasan metrik kesehatan sistem: error rate, load, dan performa armada global. |
| `GET` | `/api/core/billing` | 50 | Global | Daftar tagihan langganan SaaS O2W HERO kepada mitra. |
| `POST` | `/api/core/billing` | 100 | Parameter | Menerbitkan invoice langganan bulanan O2W HERO. |
| `GET` | `/api/core/subscriptions/reports` | 50 | Global | Analisis pertumbuhan MRR (Monthly Recurring Revenue) dan retensi mitra. |
| `GET` | `/api/core/crm` | 50 | Global | Manajemen pipeline calon mitra TPS3R dan Bank Sampah. |

---

### Kategori 2: Autentikasi & Akun Staf (`/api/auth/*` & `/api/users/*`)

| Method | Endpoint Path | Role Min | Sumber Tenant | Fungsi & Perlindungan Isolasi |
|---|---|:---:|:---:|---|
| `POST` | `/api/auth/login` | Publik | `HOST_HEADER` | Login pengguna. Verifikasi email/password terikat pada tenant host. Menolak login jika user bukan staf tenant bersangkutan. |
| `POST` | `/api/auth/logout` | 10 | `SESSION_JWT` | Menghapus cookie sesi login secara aman (HTTP-Only, SameSite). |
| `GET` | `/api/auth/me` | 10 | `SESSION_JWT` | Mengembalikan profil staf aktif beserta `tenantId` dan daftar izin role. |
| `POST` | `/api/auth/ganti-password` | 10 | `SESSION_JWT` | Ganti password mandiri. Menghasilkan token version baru untuk membatalkan sesi lama. |
| `GET` | `/api/users` | 50 | `SESSION_JWT` | Admin mitra melihat daftar staf di tenant-nya sendiri (`where: { tenantId }`). |
| `POST` | `/api/users` | 50 | `SESSION_JWT` | Admin mitra menambahkan staf baru ke tenant miliknya. |
| `PUT` | `/api/users` | 50 | `SESSION_JWT` | Edit data staf tenant. Dilindungi `assertTenantOwnership`. |
| `DELETE`| `/api/users` | 50 | `SESSION_JWT` | Nonaktifkan staf tenant. Dilarang menghapus akun superadmin. |

---

### Kategori 3: Finansial, Pelanggan, & Tagihan

| Method | Endpoint Path | Role Min | Sumber Tenant | Fungsi & Perlindungan Isolasi |
|---|---|:---:|:---:|---|
| `GET` | `/api/pelanggan` | 10 | `SESSION_JWT` | Daftar warga terlayani. Petugas lapangan difilter per Kelurahan; kasir/admin difilter per `tenantId`. |
| `POST` | `/api/pelanggan` | 50 | `SESSION_JWT` | Tambah pelanggan baru. Otomatis menetapkan `tenantId = session.tenantId`. |
| `GET` | `/api/pelanggan/[id]` | 10 | `SESSION_JWT` | Detail warga. Validasi `assertTenantOwnership(pelanggan, session.tenantId)`. |
| `PUT` | `/api/pelanggan/[id]` | 10 | `SESSION_JWT` | Update data warga / hasil survei lapangan. |
| `DELETE`| `/api/pelanggan/[id]` | 50 | `SESSION_JWT` | Soft delete warga (`deletedAt = now()`). |
| `GET` | `/api/tagihan` | 10 | `SESSION_JWT` | Daftar tagihan iuran bulanan. Wajib menyertakan `where: { tenantId }`. |
| `POST` | `/api/tagihan/generate` | 50 | `SESSION_JWT` | Penerbitan tagihan massal otomatis setiap awal bulan untuk seluruh warga aktif tenant. |
| `POST` | `/api/tagihan/bayar-multi` | 20 | `SESSION_JWT` | Pembayaran kolektif kasir untuk multi-rumah / RT. |
| `GET` | `/api/pembayaran` | 10 | `SESSION_JWT` | Log transaksi pembayaran iuran yang diterima via kasir atau QRIS. |
| `POST` | `/api/pembayaran` | 10 | `SESSION_JWT` | Pencatatan penerimaan uang kasir. Otomatis mencetak kuitansi dan update status tagihan. |
| `GET` | `/api/pengeluaran` | 50 | `SESSION_JWT` | Buku kas pengeluaran operasional (bensin, solar, gaji, perbaikan armada). |
| `POST` | `/api/pengeluaran` | 50 | `SESSION_JWT` | Catat pengeluaran baru dengan lampiran struk foto. |

---

### Kategori 4: Logistik, Armada, & Rute Lapangan

| Method | Endpoint Path | Role Min | Sumber Tenant | Fungsi & Perlindungan Isolasi |
|---|---|:---:|:---:|---|
| `GET` | `/api/kendaraan` | 10 | `SESSION_JWT` | Daftar armada (Dump Truck, Cator, Gerobak Motor) milik tenant. |
| `POST` | `/api/kendaraan` | 50 | `SESSION_JWT` | Registrasi nomor polisi dan jenis kendaraan baru. |
| `POST` | `/api/kendaraan/lokasi` | 10 | `SESSION_JWT` | Pengemudi mengirimkan koordinat GPS realtime via Android APK. |
| `GET` | `/api/kendaraan/lokasi` | 10 | `SESSION_JWT` | Peta monitoring posisi seluruh truk sampah tenant yang sedang bergerak. |
| `GET` | `/api/rute` | 10 | `SESSION_JWT` | Daftar rute penarikan sampah terjadwal. |
| `POST` | `/api/pengangkutan` | 10 | `SESSION_JWT` | Catat hasil angkutan harian (timbangan kg/karung dan status terangkut). |
| `GET` | `/api/tpa` | 50 | `SESSION_JWT` | Rekap buang sampah ke Tempat Pemrosesan Akhir (TPA) & biaya retribusi truk. |
| `POST` | `/api/absensi` | 10 | `SESSION_JWT` | Absen masuk/pulang supir dan kenek dengan verifikasi radius GPS pool. |
| `POST` | `/api/klaim` | 10 | `SESSION_JWT` | Pengajuan klaim uang bensin atau tambal ban oleh petugas lapangan. |

---

### Kategori 5: Endpoint Publik & Integrasi Eksternal (`/api/publik/*`)

| Method | Endpoint Path | Autentikasi | Sumber Tenant | Fungsi & Perlindungan Isolasi |
|---|---|:---:|:---:|---|
| `GET` | `/api/publik/tagihan` | Bebas | `HOST_HEADER` | Warga cek tagihan mandiri dengan nomor WhatsApp pada domain portal mitra. |
| `POST` | `/api/publik/bayar` | Bebas | `HOST_HEADER` | Warga meminta QRIS / Virtual Account untuk melunasi tagihannya. |
| `POST` | `/api/publik/duitku/notification` | Signature | `GATEWAY_INVOICE` | Webhook notifikasi pembayaran sukses dari Duitku. Verifikasi signature merchant dan split komisi. |
| `POST` | `/api/publik/wa-webhook` | Secret Token | `DEVICE_WA_ID` | Webhook pesan masuk WhatsApp. Bot interaktif membalas sesuai data tenant pemilik nomor WA. |
| `POST` | `/api/publik/pengaduan` | Bebas | `HOST_HEADER` | Warga kirim laporan sampah tercecer / belum diangkut dengan foto bukti. |
| `POST` | `/api/publik/daftar` | Bebas | `HOST_HEADER` | Warga baru mendaftar langganan angkut sampah mandiri secara online. |
| `GET` | `/api/publik/coverage` | Bebas | `HOST_HEADER` | Pengecekan apakah alamat warga masuk dalam area cakupan layanan mitra terkait. |

---

### Kategori 6: Mobile APK Lapangan (`/api/mobile/*` & `/api/m/*`)

| Method | Endpoint Path | Autentikasi | Sumber Tenant | Fungsi & Perlindungan Isolasi |
|---|---|:---:|:---:|---|
| `POST` | `/api/mobile/tracking` | Token Header | `SESSION_JWT` | Background location tracker Android APK (berjalan di background saat layar mati). |
| `GET` | `/api/m/pickup/tugas` | Sesi Petugas | `SESSION_JWT` | Menampilkan antrean tugas penarikan sampah hari ini di HP supir. |
| `POST` | `/api/m/pickup/selesai` | Sesi Petugas | `SESSION_JWT` | Supir mengonfirmasi sampah telah diangkut dengan upload foto. |
| `POST` | `/api/m/report-armada` | Sesi Petugas | `SESSION_JWT` | Lapor kendala armada di jalan (ban bocor, mogok, jalan ditutup). |
