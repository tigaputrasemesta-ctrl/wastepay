# Rencana Perapihan dan Implementasi Arsitektur (Phase 6)

**Project**: O2W HERO — repository `wastepay`  
**Auditor**: Senior Software Architect & Next.js Engineer  
**Tanggal**: 15 November 2026  

---

## 1. Daftar Isu Berdasarkan Tingkat Keparahan (Severity Assessment)

### 🔴 CRITICAL (0 Teridentifikasi)
- **Status**: Nihil. Seluruh boundary tenant, validasi cookie JWT, isolasi token version, dan penolakan domain tidak dikenal (HTTP 421) berjalan aman.

---

### 🟠 HIGH (2 Teridentifikasi — Telah Diinventarisir untuk Diperbaiki)

1. **Gap Pencarian Cepat (Ctrl+K) di `AdminCommandSearch.tsx`**:
   - **Isu**: Whitelist rute pencarian pada domain Core O2W HERO (`isCore`) dibatasi statis hanya pada 4 rute awal (`["/dashboard", "/tenants", "/users", "/audit-log"]`).
   - **Dampak**: 9 modul baru Control Tower (`/ecosystem-map`, `/notifikasi-saas`, `/subscriptions`, `/saas-billing`, `/revenue`, `/tenant-roi`, `/crm-prospek`, `/environmental-impact`, `/platform-settings`) tidak muncul saat superadmin menggunakan fitur Command Search (Ctrl+K).
   - **Solusi**: Perluas filter whitelist `isCore` di `AdminCommandSearch.tsx` agar menyertakan seluruh 13 modul Core.

2. **Gap Menu Drawer Mobile di `AdminMobileResponsiveShell.tsx`**:
   - **Isu**: Definisi konstanta `CORE_SECONDARY_MENU_ITEMS` hanya memiliki 4 item, belum mencakup 9 modul baru Control Tower.
   - **Dampak**: Pada tampilan mobile smartphone di domain `o2whero.com`, tombol slide-up drawer menu samping tidak menampilkan modul billing, revenue, subscriptions, impact, dan settings.
   - **Solusi**: Tambahkan seluruh 9 modul Core ke dalam `CORE_SECONDARY_MENU_ITEMS` dengan grup terstruktur (Overview, SaaS Management, Business Intelligence, Partnership & Growth, Impact & Government).

---

### 🟡 MEDIUM (2 Teridentifikasi)

1. **Sinkronisasi Breadcrumb Navigasi Halaman Core**:
   - **Isu**: Beberapa halaman Core belum memiliki komponen breadcrumb terstandar yang menunjukkan hierarki posisi halaman terhadap Dashboard.
   - **Solusi**: Pasang breadcrumb konsisten di seluruh halaman Core: `Dashboard > [Grup] > [Nama Halaman]`.

2. **Format Response Error API**:
   - **Isu**: Sebagian kecil route handler mengembalikan `{ message: string }` sementara standar utama adalah `{ error: string }`.
   - **Solusi**: Standardisasi format error API handler agar seragam menggunakan `{ error: string }`.

---

### 🟢 LOW (1 Teridentifikasi)

1. **Kelengkapan Tooltip & Deskripsi Menu Sidebar**:
   - **Isu**: Beberapa ikon menu Core di sidebar collapsed mode belum memiliki tooltip aria-label yang deskriptif.
   - **Solusi**: Pastikan setiap item menu memiliki `title` dan `aria-label` yang jelas.

---

## 2. Urutan Prioritas Eksekusi Perbaikan

```text
[Langkah 1] Perbaiki Whitelist Pencarian Command Palette (src/components/admin/AdminCommandSearch.tsx)
    │
    ▼
[Langkah 2] Sinkronisasi Menu Mobile Drawer Core (src/components/admin/AdminMobileResponsiveShell.tsx)
    │
    ▼
[Langkah 3] Penataan Breadcrumb & Header Navigasi Seluruh Modul Core
    │
    ▼
[Langkah 4] Verifikasi TypeScript Check & Unit Testing (npx vitest run)
    │
    ▼
[Langkah 5] Penyusunan Laporan Audit Akhir (docs/audit/FINAL_AUDIT_REPORT.md)
```
