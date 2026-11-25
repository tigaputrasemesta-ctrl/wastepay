# Cetak Biru Operasional & Arsitektur Multi-Tenant O2W HERO
## (O2W Hero Comprehensive Operational & Multi-Tenant Architecture Blueprint)

Dokumen ini merupakan panduan arsitektur dan standar operasional resmi (**SOP**) untuk ekosistem **O2W HERO** (`o2whero.com` dan portal tenant mitra seperti `upsheru.com`). Cetak biru ini mengadaptasi dan menyempurnakan model multi-outlet terintegrasi (seperti pada platform Smartlink) yang disesuaikan secara khusus untuk industri persampahan, ekonomi sirkular, TPS3R, dan Bank Sampah di Indonesia.

---

## I. Perbandingan Paradigma: Smartlink vs O2W HERO

| Parameter | Smartlink (Bisnis Laundry) | O2W HERO (Bisnis Persampahan & TPS3R) |
| :--- | :--- | :--- |
| **Pusat / Induk** | SmartOwner Platform (`dashboard.smartlink.id`) | O2W HERO Core Platform (`o2whero.com` / `tenant-core-o2w`) |
| **Tenant / Unit** | Outlet Laundry / Cabang Kemitraan | Mitra Pengelola (TPS3R, Bank Sampah, Swasta, DLH) |
| **Model Alur Nilai** | *Satu Arah*: Konsumen bayar jasa cuci | *Dua Arah (Dual-Flow)*: Warga bayar retribusi jasa angkut DAN/ATAU warga menerima saldo tabungan dari setor sampah daur ulang |
| **Struktur Spasial** | Lokasi outlet fisik (toko/kios) | Hirarki Wilayah Geospasial: Kota $\rightarrow$ Kelurahan $\rightarrow$ RW $\rightarrow$ RT $\rightarrow$ Zona $\rightarrow$ Rute Armada |
| **Armada & Logistik** | Kurir motor antar-jemput baju | Truk Engkel, Armroll Kontainer, Gerobak Motor (Cator) dengan rute terjadwal |
| **Integrasi IoT** | Smart Relay mesin cuci & pengering (*Snapbridge*) | Timbangan Gantung Digital (Bluetooth), Timbangan Jembatan Truk TPA, GPS Tracker Armada |
| **Penagihan (Billing)** | Transaksi per nota / kiloan langsung | Retribusi bulanan berkala per KK, Blast WA tagihan massal per RT, Bayar Kolektif via Pengurus RT |
| **Layanan Pengaduan** | Kerusakan pakaian / komplain cucian | Sampah tidak terangkut, jadwal terlewat, sampah liar menumpuk dengan foto geolokasi |
| **Monetisasi Platform** | Biaya lisensi per outlet + token M-Koin | Biaya Onboarding Domain (Rp 2.000.000) + Micro-Fee Komisi per Transaksi Lunas (Rp 1.000 + 0%) |

---

## II. Hirarki & Arsitektur 4 Pilar O2W HERO

```mermaid
graph TD
    subgraph Pilar 1: O2W HERO Core Platform (o2whero.com)
        CoreAdmin["Superadmin Core (o2whero.com)"]
        Onboard["Onboarding Mitra & Provisioning Domain"]
        FeeEngine["Platform Fee Engine & Virtual Ledger"]
        GatewayPool["Duitku Centralized Payment Pool"]
        WAPool["Monitoring Kuota WhatsApp & Alert Overdraft"]
    end

    subgraph Pilar 2: Portal Tenant / Mitra (contoh: upsheru.com)
        TenantAdmin["Admin & Direksi Mitra (Tenant Portal)"]
        GeoData["Master Wilayah (Kelurahan/RW/RT) & Pelanggan"]
        TarifPaket["Katalog Tarif (Rumah Tangga/Bisnis/Kost)"]
        JadwalRute["Penjadwalan Ritase & Penugasan Armada"]
        Keuangan["Pembukuan Kas, Laba Rugi, & Pengeluaran"]
    end

    subgraph Pilar 3: Operasional Lapangan (Petugas & Driver)
        DriverApp["Driver / Cator Mobile Web (/m/angkut, /driver/peta)"]
        AbsensiGPS["Absensi Geotagging & Shift Kerja (/m/absen)"]
        TimbanganIoT["Pencatatan Volume (m3) & Berat Timbangan (kg)"]
        KlaimBBM["Klaim Pengeluaran Operasional & BBM (/m/klaim)"]
    end

    subgraph Pilar 4: Layanan Publik & Warga (Masyarakat)
        WargaPortal["Portal Cek Tagihan Publik (/bayar)"]
        DuitkuQRIS["Pembayaran QRIS / VA / E-Wallet Instan"]
        DualWABot["WhatsApp Notifikasi (Bot Tagihan & CS Pengaduan)"]
        AduanPublik["Form Pengaduan Sampah Tercecer (/pengaduan)"]
    end

    CoreAdmin --> TenantAdmin
    TenantAdmin --> DriverApp
    TenantAdmin --> WargaPortal
    DriverApp --> TimbanganIoT
    WargaPortal --> DuitkuQRIS
    DuitkuQRIS --> GatewayPool
    GatewayPool --> FeeEngine
```

---

## III. 8 Alur Operasional Detail (End-to-End Flows)

### Flow 1: Onboarding Tenant & White-Label Domain Setup
1. **Registrasi Mitra**:
   - Calon mitra (TPS3R/Bank Sampah/Vendor) mendaftar mandiri via form kemitraan atau di-input oleh tim sales O2W Core di `/tenants`.
   - Data wajib: Nama Mitra, Penanggung Jawab, Kontak WA, Email, Alamat, Tipe Pengelola (`tps3r`, `bank_sampah`, `swasta`, `dlh`), dan Wilayah Layanan.
2. **Paket & Monitisasi Domain**:
   - Memilih paket langganan (`percontohan`, `basic`, `pro`, `enterprise`).
   - Penetapan biaya setup domain kustom (standar Rp 2.000.000 flat). Status pembayaran dicatat di `TenantSubscription.setupFeePaid`.
3. **Provisioning Domain & Reverse Proxy**:
   - Domain kustom (misal `upsheru.com`) diarahkan ke IP VPS SumoPod (`43.173.40.166`).
   - Caddy Server secara otomatis menerbitkan sertifikat SSL Let's Encrypt TLS tanpa intervensi manual.
   - Record `TenantDomain` dibuat dengan status `isPrimary: true, sslStatus: 'active'`.
4. **Akun Administrator Tenant**:
   - Sistem membuat akun Admin pertama mitra dan menghubungkannya ke `TenantMembership` (`role: 'admin', aktif: true`).

---

### Flow 2: Setup Wilayah, Zonasi Geospasial, & Basis Data Warga
1. **Hirarki Spasial**:
   - **Kelurahan**: Master kelurahan dengan kode unik (contoh: `HRJ` untuk Harjamukti).
   - **Wilayah / RW / RT**: Pemetaan unit perumahan warga (misal RW 01 s/d RW 15).
   - **Zona Operasional**: Pengelompokan wilayah berdasarkan kapasitas armada (misal Zona Utara, Zona Perumahan A).
2. **Master Pelanggan / Warga**:
   - Data warga mencakup: Nama Kepala Keluarga/Usaha, Nomor WhatsApp, Alamat Lengkap, RT/RW, Kategori Tarif (`rumah_tangga`, `bisnis`, `kost`), dan Koordinat GPS Rumah.
   - Penomoran Kode Pelanggan Unik otomatis dengan format: `KODE_KELURAHAN + TAHUN + NOMOR_URUT` (contoh: `HRJ-26-00125`).
   - Fitur QR Code Rumah: Barcode/QR dapat dicetak dan ditempel di pagar rumah warga untuk verifikasi angkut cepat oleh petugas.

---

### Flow 3: Dual Transaksi Ekonomi Sampah (Retribusi vs Bank Sampah)
Karakteristik unik O2W HERO yang membedakannya dari sistem POS biasa:

```
[ Warga / Nasabah ]
    │
    ├── (A) Membayar Jasa Angkut Bulanan ───────► [ Kas Masuk Mitra (Retribusi) ]
    │                                                   │ (Dipotong Fee O2W Rp 1.000)
    └── (B) Menyetor Sampah Terpilah ───────────► [ Saldo Tabungan Bank Sampah ]
              (Kardus, Plastik, Logam)                  │
                                                        ├── 1. Ditarik Tunai
                                                        └── 2. Auto-Debit Bayar Tagihan (Cross-Offset)
```

1. **Jalur A: Retribusi Jasa Angkut (Revenue Inflow)**:
   - Warga membayar iuran bulanan tetap (misal Rp 35.000 - Rp 50.000/bulan) untuk pengambilan sampah 2-3 kali seminggu.
2. **Jalur B: Tabungan Bank Sampah (Circular Incentive Outflow)**:
   - Warga memilah sampah anorganik di rumah.
   - Petugas/kasir menimbang sampah per kategori dengan harga per kg yang terdaftar di sistem.
   - Nilai rupiah masuk ke buku tabungan digital nasabah.
3. **Mekanisme Cross-Offset (Potong Otomatis)**:
   - Warga dapat memilih opsi: Saldo tabungan sampah secara otomatis memotong tagihan retribusi bulanan mereka. Jika saldo cukup, iuran menjadi Rp 0 (gratis iuran karena rajin memilah).

---

### Flow 4: Logistik Lapangan, Armada, & IoT Timbangan
1. **Penjadwalan Ritase (Dispatch Engine)**:
   - Admin tenant membuat jadwal rutin: Hari pengangkutan (Senin-Kamis atau Selasa-Jumat), jam operasional, armada kendaraan (plat nomor cator/truk), dan petugas penanggung jawab.
2. **Operasional Mobile Petugas**:
   - Petugas lapangan login di `/m/absen` (validasi radius GPS lokasi kantor/pool).
   - Membuka menu `/m/angkut` atau `/driver/peta` untuk melihat urutan titik rute hari ini.
   - Di setiap rumah: Petugas menandai status (`diambil`, `tidak_diangkut`, `kosong`), mencatat estimasi volume ($m^3$) atau berat (kg).
3. **Penyaluran ke TPS3R & Pembuangan Residu ke TPA**:
   - Sampah dibawa ke fasilitas TPS3R untuk dipilah (Organik masuk komposting / Biokonversi Maggot BSF; Daur ulang masuk gudang pencacah).
   - Residu yang tidak dapat diolah diangkut menggunakan truk kontainer ke TPA. Petugas mencatat nomor tiket timbangan TPA, tonase residu, dan biaya tipping fee di menu `/tpa`.

---

### Flow 5: Penagihan Otomatis, Duitku Gateway, & Dual-Number WhatsApp Engine
1. **Siklus Generate Tagihan Bulanan**:
   - Pada tanggal 1 setiap bulan, sistem otomatis membuat tagihan periode berjalan untuk seluruh warga aktif.
   - Batas jatuh tempo default tanggal 15 setiap bulan.
2. **Dual-Number WhatsApp Gateway Architecture**:
   - **Nomor 1 (Bot Otomatisasi)**:
     - Mengirimkan pesan tagihan massal (*Blast WA*) dengan rincian bulan, jumlah tagihan, dan tautan pembayaran kilat.
     - Mengirimkan Kuitansi Resmi Lunas berformat PDF segera setelah pembayaran terverifikasi.
   - **Nomor 2 (Customer Service & Pengaduan)**:
     - Nomor interaktif untuk menerima pertanyaan warga dan keluhan operasional lapangan.
     - Terhubung ke grup WhatsApp internal pengawas TPS3R jika ada komplain darurat.
3. **Payment Gateway Duitku (Centralized Pool vs Dedicated)**:
   - **Centralized Pool**: Mitra tidak perlu mengurus izin BI/PJP sendiri. Semua dana pembayaran masuk ke akun pool O2W HERO, lalu dialokasikan ke virtual ledger mitra secara real-time.
   - **Metode**: QRIS Dinamis, Virtual Account (BCA, Mandiri, BRI, BNI), dan E-Wallet (GoPay, OVO, ShopeePay, DANA).
   - **Biaya Admin Transaksi**: Ditanggung warga secara transparan (QRIS default Rp 1.500, VA Rp 3.500).

---

### Flow 6: Manajemen Pengaduan & Layanan Pelanggan (SLA Response)
1. **Laporan Masuk**:
   - Warga melapor melalui form publik `https://[domain-mitra]/pengaduan` atau WhatsApp CS.
   - Kategori pengaduan: *Sampah Belum Terangkut*, *Sampah Liar Menumpuk*, *Ceceran Air Lindi*, atau *Perilaku Petugas*.
   - Warga melampirkan foto bukti dan titik koordinat otomatis dari ponsel.
2. **Disposisi & Penanganan**:
   - Notifikasi pengaduan diteruskan ke dashboard admin dan bot WA armada setempat.
   - Status berkembang dari: `baru` $\rightarrow$ `diproses` (armada sapu jagat dikerahkan) $\rightarrow$ `selesai` (petugas mengunggah foto lokasi yang telah bersih).
   - Warga menerima notifikasi WhatsApp otomatis bahwa aduan telah ditangani lengkap dengan foto bukti penyelesaian.

---

### Flow 7: Keuangan, Escrow Virtual Ledger, Komisi O2W, & Payout Settlement
1. **Pemotongan Komisi Platform Otomatis (Real-Time)**:
   - Setiap kali warga membayar tagihan retribusi sebesar $Rp\ X$ melalui payment gateway:
     $$\text{Nominal Gross} = \text{Tagihan Warga} + \text{Biaya Admin Gateway}$$
     $$\text{Fee Gateway} = \text{Potongan Duitku}$$
     $$\text{Fee Platform O2W} = \text{platformFeeNominal (Rp 1.000)} + (\text{Tagihan} \times \text{platformFeeRate})$$
     $$\text{Hak Bersih Mitra} = \text{Nominal Tagihan} - \text{Fee Platform O2W}$$
   - Transaksi langsung tercatat di tabel `TenantLedger` dengan tipe `CREDIT_PAYMENT`.
2. **Pencairan Dana Mitra (Payout Settlement)**:
   - Dana bersih yang terkumpul di saldo virtual ledger dicairkan ke rekening bank resmi mitra (BCA/Mandiri/BRI/BNI) sesuai jadwal (`weekly` atau `manual`).
   - Admin O2W Core memproses transfer, mencatat nomor batch `PO/YYYYMMDD/XXXX`, dan mengunggah bukti transfer di tabel `TenantPayout`.

---

### Flow 8: Level Akses & RBAC (Role-Based Access Control) Persampahan

| Role | Domain Lingkup | Tanggung Jawab & Izin Menu |
| :--- | :--- | :--- |
| **Superadmin Core** | `o2whero.com` | Kontrol penuh ekosistem: Kelola semua tenant, master subscription, provisioning domain, konfigurasi fee/komisi, approval payout, audit trail sistem. |
| **Admin Tenant** | `[mitra].com` | Pemilik/Manajer TPS3R: Kelola data warga, armada, rute, tarif, absensi staf, pengeluaran kas operasional, laporan keuangan laba rugi. |
| **Kasir / Kolektor** | `[mitra].com` | Kasir Posko / Petugas Tagih: Catat pembayaran tunai pintu-ke-pintu, cetak kuitansi thermal bluetooth, verifikasi setoran tabungan bank sampah. Dilarang mengubah tarif atau menghapus data. |
| **Petugas / Driver** | `[mitra].com` (Mobile) | Supir Truk & Cator: Absensi GPS, eksekusi checklist angkut sampah di rute harian, catat timbangan volume, ajukan klaim BBM/perawatan armada. |
| **Warga / Nasabah** | Publik | Akses tanpa password: Cek tagihan mandiri, bayar via QRIS, download kuitansi PDF, lapor aduan sampah tercecer. |

---

## IV. Ringkasan Invarian Sistem (Architectural Guarantees)

1. **Multi-Tenant Data Isolation (Anti-Data Leak)**:
   - Pada domain tenant operasional (`!tenantCtx.isCore`), seluruh kueri database **wajib** menyaring `where: { tenantId: tenantCtx.tenant.id }`.
   - Data nasabah, tagihan, dan keuangan TPS3R A tidak akan pernah bocor ke TPS3R B.
2. **Idempotent Billing & Ledger Integrity**:
   - Tagihan warga dijamin unik per `(pelangganId, bulan, tahun)`.
   - Setiap mutasi saldo kas mitra dicatat dalam buku besar ganda (`TenantLedger`) dengan jejak audit permanen.
3. **Resilient Hardware & Low Connectivity Fallback**:
   - Antarmuka mobile petugas mendukung mode pencatatan cepat dengan toleransi sinyal seluler lemah di lapangan, melakukan sinkronisasi otomatis saat terhubung kembali ke jaringan.
