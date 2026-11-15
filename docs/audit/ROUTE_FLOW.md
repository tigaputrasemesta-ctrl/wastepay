# Master Route Map & Navigation Flow Architecture (Phase 3)

**Project**: O2W HERO — repository `wastepay`  
**Auditor**: Senior Software Architect, Next.js Engineer, & Application Security Auditor  
**Tanggal**: 15 November 2026  

---

## 1. Diagram Alur Utama (End-to-End Pipeline)

Diagram berikut merepresentasikan alur lengkap dari saat pengguna mengakses domain, resolusi multi-tenant di proxy, verifikasi otentikasi JWT, pemeriksaan permission RBAC, rendering sidebar, hingga eksekusi API dan query database:

```mermaid
flowchart TD
    User([Pengguna Mengakses URL]) --> ReqHost[Deteksi Host & Header Domain]
    ReqHost --> DomResolver{Domain Resolver\nconfig.ts / server-resolver.ts}
    
    DomResolver -->|o2whero.com / core.*| CoreContext[Set Tenant: CORE_TENANT\nisCore = true]
    DomResolver -->|upsheru.com / *.upsheru.com| PilotContext[Set Tenant: PILOT_UPSHERU\nisCore = false, isPilot = true]
    DomResolver -->|Domain Tenant Lain| DbTenantResolver[Lookup DB: TenantDomain & Tenant]
    DbTenantResolver -->|Ditemukan Aktif| DynamicContext[Set Tenant Dinamis\nisCore = false]
    DbTenantResolver -->|Tidak Dikenal| RejectDomain[HTTP 421 Misdirected Request]

    CoreContext --> AuthGate{Pemeriksaan JWT Cookie\nproxy.ts}
    PilotContext --> AuthGate
    DynamicContext --> AuthGate

    AuthGate -->|Publik Route| PublicPage[Render Landing / Public Portal]
    AuthGate -->|Belum Login & Admin Route| RedirectLogin[Redirect ke /login]
    AuthGate -->|Cookie Valid| VerifySession[Verifikasi Token JWT & Revocation DB]

    VerifySession -->|Token Revoked / Nonaktif| RevokeRedirect[Redirect /login?error=sesi]
    VerifySession -->|Session OK| TenantBoundaryCheck{Tenant Boundary Check}

    TenantBoundaryCheck -->|Bukan Superadmin & Akses Core| BlockCore[Redirect /login?error=core_restricted]
    TenantBoundaryCheck -->|User Tenant Lain| BlockTenantMismatch[Redirect /login?error=tenant_mismatch]
    TenantBoundaryCheck -->|Valid Tenant / Superadmin| RoleCheck{Role Permission Check\nPAGE_ROLES / rbac.ts}

    RoleCheck -->|Level Tidak Cukup| DenyAccess[Redirect ke /dashboard atau /peta]
    RoleCheck -->|Level Memenuhi| CoreFilterCheck{Domain o2whero.com?}

    CoreFilterCheck -->|Ya & Rute Operasional| BlockOperationalOnCore[Redirect /dashboard?notice=tenant_scope_only]
    CoreFilterCheck -->|Ya & Rute Core / Bukan Core| RenderLayout[Render Admin Layout & Sidebar]

    RenderLayout --> PageView[Render Page Component]
    PageView --> ApiCall[Pemanggilan API Route /api/*]

    ApiCall --> ProxyApiGuard{Proxy API Gatekeeper\nAPI_ROLE_MAP}
    ProxyApiGuard -->|Unauthorized / Forbidden| HttpError[Response 401 / 403]
    ProxyApiGuard -->|Lolos Guard| ApiHandler[Eksekusi Route Handler]

    ApiHandler --> DbRouter{Target Database}
    DbRouter -->|Core System\nTenant / Billing / CRM| CorePostgres[(Core PostgreSQL Database)]
    DbRouter -->|Operasional Tenant\nPelanggan / Tagihan / Truk| TenantPostgres[(Tenant Dedicated DB / Schema)]
```

---

## 2. Diagram Navigasi Berdasarkan Peran (Role-Based Flow)

### 2.1 Navigasi O2W HERO Superadmin (`isCore = true`, Role: `superadmin`)

```mermaid
flowchart LR
    subgraph O2W_SUPERADMIN["O2W HERO Superadmin (o2whero.com)"]
        direction TB
        L1[OVERVIEW] --> D1["/dashboard (Executive Control Tower)"]
        L1 --> D2["/ecosystem-map (Peta Persebaran Mitra)"]
        L1 --> D3["/notifikasi-saas (Alert & Insiden SaaS)"]
        
        L2[SAAS MANAGEMENT] --> S1["/tenants (Tenant Registry & DB Config)"]
        L2 --> S2["/subscriptions (Paket & Lisensi)"]
        L2 --> S3["/saas-billing (Invoicing & Piutang SaaS)"]
        
        L3[BUSINESS INTELLIGENCE] --> B1["/revenue (Revenue Intelligence & Escrow)"]
        L3 --> B2["/tenant-roi (Performa & Analitik ROI)"]
        
        L4[PARTNERSHIP & GROWTH] --> G1["/crm-prospek (CRM Pipeline & Lead)"]
        L4 --> G2["/manajemen-marketplace (Circular Economy)"]
        
        L5[IMPACT & GOVERNMENT] --> I1["/environmental-impact (Dampak & SIPSN)"]
        
        L6[SYSTEM ADMINISTRATION] --> A1["/users (Kelola Akun Admin Platform)"]
        L6 --> A2["/audit-log (Audit Log Aktivitas)"]
        L6 --> A3["/platform-settings (Infra & Monitoring)"]
    end
```

### 2.2 Navigasi UPS HERU Admin Unit (`upsheru.com`, Role: `admin`)

```mermaid
flowchart LR
    subgraph UPSHERU_ADMIN["UPS HERU Admin (upsheru.com)"]
        direction TB
        M1[Menu Utama] --> U1["/dashboard (Operasional TPS 3R)"]
        
        M2[Operasional & Armada] --> OP1["/pengangkutan (Ritase & Timbang)"]
        M2 --> OP2["/rute (Rute Penjemputan)"]
        M2 --> OP3["/jadwal (Jadwal Pengangkutan)"]
        M2 --> OP4["/kendaraan (Armada Truk & Tosa)"]
        M2 --> OP5["/transit (Titik Kumpul Transit)"]
        M2 --> OP6["/pickup-insidental (Pickup Sampah Besar)"]
        
        M3[Pelanggan & Layanan] --> P1["/pelanggan (Master Data Warga)"]
        M3 --> P2["/registrasi (Pendaftaran Warga)"]
        M3 --> P3["/peta (GIS Sebaran Rumah)"]
        M3 --> P4["/zona (Zona RT/RW)"]
        M3 --> P5["/survei (Verifikasi Lapangan)"]
        M3 --> P6["/komplain (Aduan Warga)"]
        
        M4[Keuangan & Kasir] --> K1["/tagihan (Billing & Kasir)"]
        M4 --> K2["/pengeluaran (Biaya Operasional)"]
        M4 --> K3["/laporan (Laporan Kas Masuk/Keluar)"]
        M4 --> K4["/rekonsiliasi (Rekonsiliasi Bank)"]
        M4 --> K5["/manajemen-tarif (Setting Tarif Iuran)"]
        M4 --> K6["/manajemen-marketplace (Toko Daur Ulang)"]
        
        M5[Personalia & Sistem] --> S1["/petugas (Data Staf & Supir)"]
        M5 --> S2["/absensi (Presensi GPS Lapangan)"]
        M5 --> S3["/klaim (Klaim Biaya Petugas)"]
        M5 --> S4["/pengaturan (Setting Tenant & WA Gateway)"]
        M5 --> S5["/notifikasi (Broadcast WhatsApp)"]
    end
```

### 2.3 Navigasi UPS HERU Kasir Loket (`upsheru.com`, Role: `kasir`)

```mermaid
flowchart TD
    subgraph UPSHERU_KASIR["UPS HERU Kasir (upsheru.com)"]
        K_Dash["/dashboard (Monitoring Iuran Hari Ini)"]
        K_Tagihan["/tagihan (Loket Kasir & Cetak Bukti Bayar)"]
        K_Pelanggan["/pelanggan (Lookup Status Iuran Warga)"]
        K_Laporan["/laporan (Rekapitulasi Penerimaan Kasir)"]
        K_Sticker["/sticker (Cetak Stiker QR Rumah)"]
        K_Notif["/notifikasi (Kirim Bukti Kwitansi WA)"]
    end
```

### 2.4 Navigasi UPS HERU Petugas Lapangan / Supir (Mobile & Desktop, Role: `petugas`)

```mermaid
flowchart TD
    subgraph UPSHERU_PETUGAS["UPS HERU Driver / Knek Lapangan"]
        P_Peta["/peta & /driver/peta (Navigasi Rute Jalan & Rumah)"]
        P_Angkut["/pengangkutan & /m/angkut (Input Timbangan Sampah)"]
        P_Absen["/absensi & /m/absen (Selfie Masuk/Pulang GPS)"]
        P_Klaim["/klaim & /m/klaim (Klaim Bensin & Ban)"]
        P_Survei["/survei & /m/survei (Verifikasi Titik Baru)"]
        P_Chat["/chat & /m/chat (Koordinasi Dispatcher)"]
        P_Komplain["/komplain & /m/pengaduan (Cek Titik Sampah Tercecer)"]
    end
```

---

## 3. Temuan Audit Link & Navigation Gaps

Berdasarkan audit mendalam terhadap seluruh komponen navigasi:

1. **Gap di `AdminMobileResponsiveShell.tsx`**:
   - Menu drawer mobile untuk Core O2W HERO (`CORE_SECONDARY_MENU_ITEMS`) sebelumnya hanya memuat 4 menu awal, belum menyertakan 9 modul SaaS Control Tower yang baru (`/ecosystem-map`, `/notifikasi-saas`, `/subscriptions`, `/saas-billing`, `/revenue`, `/tenant-roi`, `/crm-prospek`, `/environmental-impact`, `/platform-settings`).
2. **Gap di `AdminCommandSearch.tsx` (Ctrl+K Command Palette)**:
   - Filter whitelist perintah Core (`isCore`) sebelumnya dibatasi ketat hanya pada `["/dashboard", "/tenants", "/users", "/audit-log"]`. Modul billing, revenue, CRM, dan environmental impact tidak dapat dicari lewat shortcut keyboard.
3. **Link Hardcode Domain**:
   - Ditemukan beberapa tautan balik di portal publik (seperti `/bayar` dan `/lacak`) yang menggunakan anchor hardcode. Perlu dipastikan selalu menggunakan URL helper `resolveTenantByHost` agar otomatis mengikuti tenant aktif (`upsheru.com` atau subdomain mitra lainnya).
