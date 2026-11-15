# Matriks Autentikasi dan Otorisasi Multi-Tenant (Phase 5)

**Project**: O2W HERO — repository `wastepay`  
**Auditor**: Application Security Auditor & Senior Software Architect  
**Tanggal**: 15 November 2026  

---

## 1. Spesifikasi Mekanisme Keamanan Sistem

### 1.1 Hierarki Peran (Role Hierarchy)
Tingkat kewenangan terpusat di `src/lib/rbac.ts`:
- **`superadmin`** (Level 100): Akses penuh platform O2W HERO Control Plane, registrasi tenant, konfigurasi database, penagihan SaaS, dan audit log.
- **`admin`** (Level 50): Administrator operasional unit TPS 3R/Bank Sampah mitra. Mengelola warga, supir, armada, tarif, dan kasir loket.
- **`kasir`** (Level 20): Kasir loket pembayaran iuran sampah, cetak kwitansi, lookup data warga, dan broadcast WA tagihan.
- **`petugas`** (Level 10): Driver/knek armada penjemputan sampah, input ritase/timbangan sampah, presensi GPS, dan klaim BBM.
- **`publik`** (Level 0): Warga umum (tracking armada `/lacak`, pengaduan `/pengaduan`, pembayaran online `/bayar`).

### 1.2 Proteksi Autentikasi & Sesi
1. **Pemisahan Login Multi-Domain (`api/auth/login/route.ts`)**:
   - Staf operasional tenant dilarang login di domain Core `o2whero.com` (HTTP 403: `"Akun operasional mitra tidak dapat login di Core SaaS Hub"`).
   - Akun yang terikat pada `tenantId` tertentu dilarang login pada portal tenant lain (HTTP 403: `"Akun ini tidak terdaftar pada layanan [NamaMitra]"`).
2. **Karakteristik Cookie JWT**:
   - `httpOnly: true` (mencegah pencurian token melalui serangan XSS).
   - `secure: true` pada koneksi HTTPS produksi.
   - `sameSite: "lax"` (mitigasi serangan CSRF).
3. **Session Revocation & Token Versioning**:
   - Setiap perubahan kata sandi (`PUT /api/users` atau reset password) menaikkan nilai `tokenVersion` (+1) di database.
   - Fungsi `loadSessionUser` di proxy secara ketat mencocokkan `user.tokenVersion === payload.v`. Seluruh sesi aktif lama otomatis kedaluwarsa seketika.
4. **Proteksi Brute-Force**:
   - Rate limiting berbasis in-memory/sliding window per IP dan email (`login:[email]:[ip]`) dengan HTTP 429 Too Many Requests.

---

## 2. Matriks Hak Akses Halaman (Page Authorization Matrix)

| Role | Domain Scope | Route / Halaman | Read (Lihat) | Create (Tambah) | Update (Ubah) | Delete (Hapus) | Catatan Keamanan |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| **Superadmin** | `o2whero.com` | `/dashboard` (Executive) | ✅ | — | — | — | Full platform analytics |
| **Superadmin** | `o2whero.com` | `/tenants` | ✅ | ✅ | ✅ | ✅ | CRUD mitra & connection string DB |
| **Superadmin** | `o2whero.com` | `/subscriptions` | ✅ | ✅ | ✅ | — | Konfigurasi tier paket & lisensi |
| **Superadmin** | `o2whero.com` | `/saas-billing` | ✅ | ✅ | ✅ | — | Terbit & verifikasi invoice SaaS |
| **Superadmin** | `o2whero.com` | `/revenue` | ✅ | — | — | — | Audit GMV vs Escrow vs Net Fee |
| **Superadmin** | `o2whero.com` | `/tenant-roi` | ✅ | — | — | — | Metrik performa per mitra |
| **Superadmin** | `o2whero.com` | `/crm-prospek` | ✅ | ✅ | ✅ | — | Pipeline kemitraan baru |
| **Superadmin** | `o2whero.com` | `/environmental-impact` | ✅ | — | — | — | Ekspor format baku SIPSN KLHK |
| **Superadmin** | `o2whero.com` | `/users` | ✅ | ✅ | ✅ | ✅ | Manajemen akun admin O2W Core |
| **Superadmin** | `o2whero.com` | `/audit-log` | ✅ | — | — | — | Read-only audit trail server |
| **Superadmin** | `o2whero.com` | `/platform-settings` | ✅ | — | ✅ | — | Database pooler & system health |
| **Admin Tenant** | `upsheru.com` | `/dashboard` (Operasional) | ✅ | — | — | — | KPI operasional unit lokal |
| **Admin Tenant** | `upsheru.com` | `/pelanggan` & `/registrasi` | ✅ | ✅ | ✅ | ✅ | Master data warga lokal |
| **Admin Tenant** | `upsheru.com` | `/tagihan` | ✅ | ✅ | ✅ | — | Billing & verifikasi lunas |
| **Admin Tenant** | `upsheru.com` | `/pengangkutan` | ✅ | ✅ | ✅ | — | Ritase & log timbangan sampah |
| **Admin Tenant** | `upsheru.com` | `/rute` & `/jadwal` | ✅ | ✅ | ✅ | ✅ | Penugasan rute supir armada |
| **Admin Tenant** | `upsheru.com` | `/kendaraan` & `/transit` | ✅ | ✅ | ✅ | ✅ | Manajemen armada & titik kumpul |
| **Admin Tenant** | `upsheru.com` | `/petugas` | ✅ | ✅ | ✅ | ✅ | Akun supir/knek unit lokal |
| **Admin Tenant** | `upsheru.com` | `/absensi` | ✅ | — | ✅ | — | Verifikasi presensi lapangan |
| **Admin Tenant** | `upsheru.com` | `/klaim` | ✅ | — | ✅ | — | Approval klaim BBM/reimburse |
| **Admin Tenant** | `upsheru.com` | `/pengeluaran` | ✅ | ✅ | ✅ | ✅ | Pengeluaran operasional unit |
| **Admin Tenant** | `upsheru.com` | `/laporan` & `/rekonsiliasi` | ✅ | ✅ | ✅ | — | Tutup buku kasir & rekonsiliasi |
| **Admin Tenant** | `upsheru.com` | `/pengaturan` | ✅ | — | ✅ | — | Setting dual WhatsApp unit |
| **Admin Tenant** | `upsheru.com` | `/o2whero.com/*` (Core) | ❌ | ❌ | ❌ | ❌ | **Ditolak oleh Proxy (403 Forbidden)** |
| **Kasir** | `upsheru.com` | `/dashboard` | ✅ | — | — | — | Ringkasan iuran tertagih |
| **Kasir** | `upsheru.com` | `/tagihan` & `/kwitansi` | ✅ | ✅ | ✅ | — | Loket pembayaran & cetak bukti |
| **Kasir** | `upsheru.com` | `/pelanggan` | ✅ | — | — | — | Lookup status iuran (Read-Only) |
| **Kasir** | `upsheru.com` | `/laporan` | ✅ | — | — | — | Rekap kas harian kasir |
| **Kasir** | `upsheru.com` | `/sticker` | ✅ | — | — | — | Cetak stiker QR rumah warga |
| **Kasir** | `upsheru.com` | `/notifikasi` | ✅ | ✅ | — | — | Kirim notifikasi bukti bayar WA |
| **Kasir** | `upsheru.com` | Menu Admin/Core | ❌ | ❌ | ❌ | ❌ | **Ditolak oleh Proxy (Redirect/403)** |
| **Petugas Lapangan** | `upsheru.com` | `/peta` & `/driver/peta` | ✅ | — | — | — | Peta navigasi rute jalan |
| **Petugas Lapangan** | `upsheru.com` | `/pengangkutan` (`/m/angkut`) | ✅ | ✅ | — | — | Input timbangan ritase |
| **Petugas Lapangan** | `upsheru.com` | `/absensi` (`/m/absen`) | ✅ | ✅ | — | — | Presensi selfie & koordinat GPS |
| **Petugas Lapangan** | `upsheru.com` | `/klaim` (`/m/klaim`) | ✅ | ✅ | — | — | Ajukan klaim bensin/tambal ban |
| **Petugas Lapangan** | `upsheru.com` | `/survei` (`/m/survei`) | ✅ | ✅ | ✅ | — | Input foto calon pelanggan baru |
| **Petugas Lapangan** | `upsheru.com` | `/chat` (`/m/chat`) | ✅ | ✅ | — | — | Chat koordinasi dispatcher |
| **Petugas Lapangan** | `upsheru.com` | `/komplain` (`/m/pengaduan`) | ✅ | — | ✅ | — | Update status sampah terangkut |
| **Petugas Lapangan** | `upsheru.com` | Menu Keuangan/Admin/Core | ❌ | ❌ | ❌ | ❌ | **Ditolak oleh Proxy (403 Forbidden)** |

---

## 3. Matriks Otorisasi Endpoint API Kunci

```text
API ENDPOINT                         MIN ROLE     CORE-ALLOWED?    TENANT SCOPED?
---------------------------------------------------------------------------------
GET    /api/core/control-tower       100          YES              Cross-Tenant
GET    /api/core/tenants             100          YES              Core Platform
POST   /api/core/tenants             100          YES              Core Platform
GET    /api/core/billing             100          YES              Core Platform
POST   /api/core/billing             100          YES              Core Platform
GET    /api/core/crm                 100          YES              Core Platform
POST   /api/core/crm                 100          YES              Core Platform
GET    /api/users                    50 (scoped)  YES              Scoped by Tenant
POST   /api/users                    100          YES              Scoped by Tenant
PUT    /api/users                    100          YES              Scoped by Tenant
DELETE /api/users                    100          YES              Scoped by Tenant
GET    /api/audit-log                100          YES              Core Platform
GET    /api/pelanggan                20           NO (Blocked)     Tenant Isolated
POST   /api/pelanggan                50           NO (Blocked)     Tenant Isolated
GET    /api/tagihan                  10           NO (Blocked)     Tenant Isolated
POST   /api/tagihan                  50           NO (Blocked)     Tenant Isolated
POST   /api/tagihan/blast-rt         50           NO (Blocked)     Tenant Isolated
POST   /api/pembayaran               10           NO (Blocked)     Tenant Isolated
GET    /api/pengangkutan             10           NO (Blocked)     Tenant Isolated
POST   /api/pengangkutan/lapor       10           NO (Blocked)     Tenant Isolated
POST   /api/absensi                  10           NO (Blocked)     Tenant Isolated
POST   /api/klaim                    10           NO (Blocked)     Tenant Isolated
GET    /api/rekonsiliasi             50           NO (Blocked)     Tenant Isolated
```

---

## 4. Evaluasi & Temuan Keamanan Phase 5

1. **Prinsip Least Privilege**: Diterapkan secara ketat. Petugas lapangan tidak dapat membaca rincian keuangan iuran warga; kasir tidak dapat mengubah konfigurasi tarif atau pengaturan WhatsApp tenant; admin tenant tidak dapat mengakses modul Core O2W HERO.
2. **Perlindungan Terhadap Token Theft**: Penyimpanan token di cookie `HttpOnly` dengan flag `Secure` dan proteksi `SameSite: Lax` menutup celah pencurian sesi melalui JavaScript browser (XSS).
3. **Pemisahan Server-Side**: Otorisasi ditegakkan di layer middleware proxy (`src/proxy.ts`) dan route handler API masing-masing, tidak hanya mengandalkan penyembunyian komponen di frontend.
