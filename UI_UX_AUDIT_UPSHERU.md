# UI_UX_AUDIT_UPSHERU.md — Comprehensive UI/UX Audit: UPS HERU (`upsheru.com`)

> **Target Brand**: UPS HERU (Unit Pengolahan Sampah TPS 3R Kalibaru, Kota Depok)  
> **Brand Positioning**: Professional municipal/community waste collection operator & digital retribusi service  
> **Live URL**: `https://upsheru.com`  
> **Verification Basis**: Direct codebase inspection + live HTTP/HTML probes + static checks (`npm run check:classes`, `vitest`, `tsc`). Visual browser screenshots/Lighthouse runtime metrics are **NOT VERIFIED** (no Chromium/Playwright runtime available on Android ARM64 Termux).

---

## 1. Executive Summary

UPS HERU delivers a strong domain-adapted value proposition across citizen services, operator workflows, and a GoPartner-inspired mobile driver cockpit (`/m/angkut`). However, live verification and source inspection revealed **critical journey blockers, contradictory pricing, disabled citizen features, broken dark-mode parity, and 886 Tailwind/WCAG issues across `src/`**.

### Key Live & Codebase Findings
- **Live HTTP Verification (`https://upsheru.com`)**:
  - `200 OK`: `/`, `/bayar`, `/daftar`, `/tarif`, `/pengaduan`, `/pickup`, `/marketplace`, `/unduh`, `/artikel`, `/ups-heru-logo.jpg`
  - `307 Redirect -> /`: `/lacak`, `/coverage` (both disabled)
  - `404 Not Found`: `/ups_heru_logo.jpg` (referenced by `PILOT_TENANT.branding.logoUrl` in [src/lib/tenant/config.ts#L87](file:///data/data/com.termux/files/home/wastepay/src/lib/tenant/config.ts#L87)), `/mitra`

---

## 2. Detailed Evaluation by Surface

### A. Public Website (`upsheru.com`)

| Area | Route(s) | Current Strength | Identified Issues |
|---|---|---|---|
| **Homepage & Profile** | `/` ([page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/page.tsx)) | Clear editorial hero + interactive `CivicHeroWidget`, 4 problem cards (`01–04`), 4 solution cards, 3 service tiers, circular products showcase, 5 Depok kelurahan schedules, announcements, articles, FAQ | 1. Dark mode toggle in `PublicNavbar` breaks half the page (sections `#problem`, `#solusi`, `#tarif`, `#wilayah`, `#alur`, `#faq`, and `CivicHeroWidget` lack `dark:` variants).<br>2. Stats mismatch: Hero widget claims `2.450+ KK` while O2W HERO cites `1.253 KK`.<br>3. Homepage says Rumah Tangga starts at **Rp 40.000/bulan**, conflicting with `/tarif`. |
| **Service Info & Tariffs** | `/tarif` ([tarif/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/tarif/page.tsx)) | Clean 2-column layout with "Mulai Dari" highlight card & commercial packages sidebar | **Contradictory Pricing (P1)**: `level_1` (Rumah Tangga) is hardcoded to **Rp 50.000**, while `Paket Langganan` in the same file & homepage tier card say **Rp 40.000**. |
| **Customer Registration** | `/daftar` ([daftar/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/daftar/page.tsx), [FormDaftar.tsx](file:///data/data/com.termux/files/home/wastepay/src/components/FormDaftar.tsx)) | Guided 4-step wizard (`Kontak -> Paket -> Alamat -> Validasi`), automatic WA number check (`08xx`/`628xx`), EXIF GPS extraction from house photos | Title renders duplicate brand: `"Daftar Jasa Angkut Sampah Depok - UPS HERU | UPS HERU Depok"`. |
| **Bill Checking & Payment / QRIS** | `/bayar` ([bayar/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/bayar/page.tsx)), `/bayar-tagihan` | Rich status badges (`Lunas`, `Menunggu Verifikasi Admin`, `Belum Bayar`), collective lock anti-double-pay guard, Duitku status sync button, truck loading animation | 1. Pure client component with `Suspense` fallback renders empty `<h1>` during SSR (`h1=""` verified live).<br>2. Placeholder WhatsApp `6281234567890` in error help Bento Grid ([bayar/page.tsx#L1354](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/bayar/page.tsx#L1354)).<br>3. No inline QRIS QR image modal — redirects away to external Duitku checkout URL.<br>4. Zero `dark:` styling. |
| **Fleet Tracking & Coverage** | `/lacak`, `/coverage` | Well-designed `LacakJemputan` & `CoverageExplorer` components exist in codebase | **Both routes hard-redirect `307 -> /`**. `sitemap.ts` still advertises `/lacak`, hurting SEO & user expectation. |
| **Complaints** | `/pengaduan` ([pengaduan/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/pengaduan/page.tsx), [PengaduanForm.tsx](file:///data/data/com.termux/files/home/wastepay/src/components/PengaduanForm.tsx)) | Camera + gallery dual upload buttons, step-by-step guidance | **P1 Broken Core Journey**: Input asks for `"Nomor WhatsApp / Kode Pelanggan"` (`placeholder="Contoh: 081234567890"`), but `/api/publik/pengaduan` **only** searches `kodePelanggan` (`404` for every WhatsApp number!). Optional `noWa` field is ignored by the API. |
| **Marketplace & Bulk Pickup** | `/marketplace`, `/pickup` | Dedicated single-seller circular store and 5-category bulk pickup calculator with GPS auto-detect | 1. Both pages show double `<title>` suffix live (`"Portal Layanan Warga | UPS HERU Depok | UPS HERU Depok"`).<br>2. `/marketplace` uses blocking browser `alert()` for stock limits ([marketplace/page.tsx#L111](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/marketplace/page.tsx#L111)). |
| **Mobile Download Page** | `/unduh` ([unduh/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/unduh/page.tsx)) | Clear separation between Driver Native APK and Admin Offline-First APK | **Double `<header>` Bug (P2)**: Verified live (`headers:2` in HTML response) because `unduh/page.tsx` renders its own `<header>` inside `PublicLayout`. Also shows legacy `"W"` logo badge instead of UPS HERU logo. |

### B. Customer Experience Assessment
- **Is bill checking easy?** **Mostly Yes**, via `CivicHeroWidget` on `/` or `/bayar` with auto-normalization of `08xx` -> `628xx`. However, error-state support link goes to dummy `6281234567890`.
- **Is payment flow understandable?** **Moderate.** The 3-tier state (`Unpaid` vs `Pending Manual Verification` vs `Collective Lock`) is clear, though the `/bayar` page has 4 competing action buttons per unpaid bill row (`Bayar via QRIS / Bank`, `Cetak Faktur`, `Cek Gateway`, `Sudah Transfer Bank?`) and forces external redirect to Duitku instead of displaying an inline QRIS code.
- **Is payment status clear?** **Yes**, with distinct color-coded `StatusBadge` pills and gateway sync banner.
- **Is QRIS displayed correctly?** **Partially.** `qris.png` logo is shown on the method selector (`keMetodeBayar`), and `PanduanCaraBayarQris` explains how to scan, but the actual QRIS payment code is rendered off-site on Duitku (`window.location.href = data.paymentUrl`), not inline.
- **Is complaint submission easy?** **Broken for most citizens (P1)** because WhatsApp number input fails lookup at `/api/publik/pengaduan`.
- **Can customers track collection?** **No (P1)** — `/lacak` redirects to `/`, and `CivicHeroWidget` falls back to `"Konfirmasi Posisi Truk via WhatsApp"`.
- **Is WhatsApp support accessible?** **Yes, with one defect**: `FloatingWhatsApp` (`6281400782617`), Navbar mobile drawer, and Footer all connect to `6281400782617`, except `/bayar` error Bento card links to `6281234567890` and `/pengaduan` has no direct WA fallback.

### C. Operator Dashboard (`(admin)` on `upsheru.com`)
- **KPI Cards (`/dashboard`)**: Rich 1,103-line operational server component covering customers, monthly billing, collections, complaints, attendance, expenses, fleet, gateway pending, and kelurahan collection rate. **Critical Gap**: `getStats()` queries Prisma without `tenantId` scoping.
- **Customer & Billing Management (`/pelanggan`, `/tagihan`)**: Functionally comprehensive (bulk actions, CSV import/export, barcode stickers, collective billing, WA blast), but monolithic client files (`2,430` and `2,824` lines) with dense filter bars and inline `<style>` / modal bloat.
- **Payment Reconciliation & Reporting (`/rekonsiliasi`, `/laporan`, `/pengeluaran`)**: Functional desktop tables and mobile card views on `/rekonsiliasi` & `/pengeluaran`, though lacking explicit `dark:` classes (relying on CSS `!important` overrides in `globals.css`).
- **Fleet, Routes, Attendance, Complaints (`/kendaraan`, `/rute`, `/absensi`, `/komplain`)**: Consolidated tabs on `/rute` (`?tab=jadwal`) and `/kendaraan` (`?tab=transit`, `?tab=tpa`) work well, **but legacy menu items** (`/jadwal`, `/survei`, `/tpa`, `/transit`, `/sticker`) still exist in `Sidebar.tsx` pointing to redirect stubs or inconsistent targets (`sticker` -> `/pelanggan-cetak` vs `/sticker` -> `/pelanggan?tab=sticker`).

### D. Field Officer Experience (`/m/*`)
- **Mobile-first interface & large action buttons**: Strong GoPartner-inspired layout (`max-w-[430px]`, `SlideToConfirm` `h-14`, `thumb-button-primary` `h-12 sm:h-14`).
- **Route list, Pickup status & GPS**: `GojekDriverCockpit` + `useProximityPickup` (`<20m` default radius, sound/TTS/haptic feedback, wake lock, OSRM road routing, QR scanner, 1-tap pickup & quick skip presets).
- **Photo evidence**: `CameraGps` supports native `@capacitor/camera`, `<input capture="environment">` fallback, client-side canvas compression (`1024px`), and `exifr` GPS EXIF extraction.
- **Offline support & sync status (CRITICAL GAP)**:
  - `src/lib/offline-queue.ts` (`wastepay_driver_db` IndexedDB store-and-forward engine) is **never imported or invoked** anywhere in `src/app/m/angkut/page.tsx`! A driver in a cellular dead-zone gets `"Kendala koneksi saat mencatat"` instead of queued offline persistence.
  - Meanwhile, `AdminSyncIndicator` (`useOfflineSync`) only caches read-only customer master/delta data (`pelanggan`) for offline admin lookup.
- **Navigation defects in `/m/layout.tsx`**:
  - `Survei` tab is hidden whenever `isAngkut` is true (`isSurvei && !isAngkut`), blocking dual-role officers & admins testing `/m`.
  - `m/report/page.tsx` and `m/pengaduan/page.tsx` render a second full-screen sticky header inside `MobileLayout`'s already-padded `<main>`.

---

## 3. Issue Register (UPS HERU)

| ID | Route | Component | Problem | User Impact | Business Impact | Sev | Recommended Solution | Complexity | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|---|---|
| U-01 | `/pengaduan` | `PengaduanForm` & `/api/publik/pengaduan` | Form labels input `"Nomor WhatsApp / Kode Pelanggan"`, but API only queries `kodePelanggan` | Citizens entering WA number always get 404 error | Lost missed-pickup reports; citizens flood CS WhatsApp manually | **P1** | Normalize & match both `kodePelanggan` and `noTelepon` (plus `tenantId`) in `/api/publik/pengaduan` | Low | Submitting `/pengaduan` with `08xx` or `628xx` resolves customer and creates `Komplain` (`201`) |
| U-02 | `/lacak`, `/coverage` | `lacak/page.tsx`, `coverage/page.tsx` | Both routes immediately `redirect("/")` while linked in `sitemap.ts` & marketing copy | Customers clicking live tracking links bounce back to homepage | Broken trust on "pelacakan armada live GPS" promise | **P1** | Re-enable `/lacak` & `/coverage` or remove from `sitemap.ts` and update marketing claims | Medium | Visiting `/lacak` & `/coverage` renders interactive map or returns clean `410`/removed state |
| U-03 | `/tarif` vs `/` | `tarif/page.tsx` vs `app/page.tsx` | `/tarif` hardcodes `level_1` to `Rp 50.000` while homepage & `Paket Langganan` state `Rp 40.000` | Citizens see conflicting monthly prices on official pages | Confusion during registration, billing disputes | **P1** | Remove hardcoded `50000` override in `tarif/page.tsx`; read single source of truth from DB per `tenantId` | Low | `/tarif` and `/` show identical base tariff from `KategoriTarif`/`Paket` |
| U-04 | `/m/angkut` | `m/angkut/page.tsx` & `offline-queue.ts` | `queueOfflinePickup()` is implemented in `src/lib/offline-queue.ts` but never wired into `m/angkut` | Field officers lose pickup logs in gang/basement dead zones | Incomplete daily route metrics & false missed-pickup complaints | **P1** | Wire `queueOfflinePickup` on network failure/offline and add pending-sync badge + `syncOfflineQueueToServer` on `online` | Medium | Tapping pickup while offline queues action in IndexedDB and auto-syncs upon reconnect |
| U-05 | `/bayar` | `bayar/page.tsx#L1354` | Error Bento Grid links WA Help button to dummy `6281234567890` | Citizens unable to find bills tap a dead/wrong WhatsApp number | Failed retribusi payments & frustrated residents | **P1** | Replace `6281234567890` with tenant `whatsappKontak` (`6281400782617` for UPS HERU) | Low | Clicking "Bantuan CS" on `/bayar` error state opens tenant's real WA support number |
| U-06 | `/unduh` | `unduh/page.tsx` | Renders its own `<header>` inside `PublicLayout`, creating 2 headers (`headers:2` live) | Cluttered mobile viewport, confusing double navigation, wrong `"W"` logo | Poor driver onboarding experience | **P2** | Remove duplicate `<header>` from `unduh/page.tsx` and rely on `PublicLayout` | Low | `https://upsheru.com/unduh` renders exactly 1 `<header>` |
| U-07 | `/pickup`, `/marketplace`, `/daftar` | `PublicLayout` + page metadata | Double title suffix `"| UPS HERU Depok | UPS HERU Depok"` and `"UPS HERU | UPS HERU Depok"` | Truncated browser tabs and diluted SEO snippets | Lower CTR from search results | **P3** | Remove redundant `| UPS HERU Depok` from page titles; define clean `metadata` on `/pickup` & `/marketplace` | Low | Every `(public)` route renders single clean `Title | <Tenant Name>` |
| U-08 | `/bayar` | `bayar/page.tsx` | `Suspense` fallback renders without `<h1>` (`h1=""` in SSR HTML); no inline QRIS modal; no dark mode | Poor SSR SEO/a11y heading hierarchy; jarring white flash when dark mode is toggled | Reduced checkout clarity & accessibility score | **P2** | Render page header/`<h1>` outside `<Suspense>`, add dark mode variants, and consider inline QRIS display | Medium | SSR HTML for `/bayar` includes `<h1>` and respects `.dark` theme |
| U-09 | `/m/report`, `/m/pengaduan` | `m/report/page.tsx`, `m/pengaduan/page.tsx` | Full-screen `min-h-screen` + sticky headers nested inside `MobileLayout` padded `<main>` | Double top headers on mobile screen, wasted vertical space | Cluttered field officer UX | **P2** | Strip outer `min-h-screen` and redundant top chrome; use compact page sub-header matching `m/absen` | Low | `/m/report` and `/m/pengaduan` show single top header from `MobileLayout` |
| U-10 | `/m/*` | `m/layout.tsx#L79` | Bottom nav hides `Survei` when `isAngkut` is true (`isSurvei && !isAngkut`) | Dual-role officers & admins cannot access Survey from bottom nav | Operational friction for multi-role field staff | **P3** | Group secondary mobile tools in a compact "Lainnya" sheet or show `Survei` tab whenever `isSurvei` | Low | Dual-role users can reach `/m/survei` in 1–2 taps |
| U-11 | `/marketplace` | `marketplace/page.tsx#L111` | Uses native `window.alert()` when cart quantity exceeds stock | Jarring native dialog on Android WebView/Chrome | Unpolished e-commerce checkout | **P3** | Replace `alert()` with `useToast()` warning | Low | Exceeding stock displays non-blocking toast notification |
| U-12 | `PILOT_TENANT` | `src/lib/tenant/config.ts#L87` | `logoUrl` points to `/ups_heru_logo.jpg` (`404` live) instead of `/ups-heru-logo.jpg` (`200` live) | Broken logo `<img>` whenever `PILOT_TENANT.branding.logoUrl` is rendered dynamically | Broken brand trust on dynamic tenant shells | **P2** | Update `PILOT_TENANT.branding.logoUrl` to `"/ups-heru-logo.jpg"` | Low | `GET /ups-heru-logo.jpg` matches `PILOT_TENANT.branding.logoUrl` with HTTP 200 |

---

## 4. Category Scores — UPS HERU

> **Rule**: Scores reflect observed code + live HTTP/static checks only. Runtime browser visual/Lighthouse/axe checks are **NOT VERIFIED**.

| Category | Score (0–100) | Verification Status | Evidence Summary |
|---|---|---|---|
| **Visual Design** | **72 / 100** | Partially Verified (code + live CSS/HTML; visual render **NOT VERIFIED**) | Modern CleanTech emerald/teal palette and editorial landing layout (`src/app/page.tsx`), but 473 Tailwind v4 invalid classes (`shadow-xs`, `backdrop-blur-xs`) are stripped by Tailwind v3, and public dark mode is half-implemented. |
| **UX** | **64 / 100** | Verified via Code & API Flow Trace | Good 4-step registration wizard & GoPartner driver cockpit, offset by broken WA complaint lookup (`/pengaduan`), disabled `/lacak` & `/coverage`, conflicting `/tarif` prices, and unwired offline pickup queue. |
| **Navigation** | **68 / 100** | Verified | `PublicNavbar` + mobile drawer are well-structured, but `/unduh` renders 2 headers, `/m/report` & `/m/pengaduan` nest duplicate headers, and `Sidebar` links to 5 legacy redirect stub routes. |
| **Responsive Design** | **65 / 100** | Static Code Inspection Only (Live viewport render **NOT VERIFIED**) | Mobile card views exist on several admin pages and `/m/*` uses a 430px phone frame; however, public/mobile CSS overrides (`font-size: 16px !important` under 768px) and unverified 360px/390px rendering limit confidence. |
| **Functionality** | **70 / 100** | Verified via API/Test/Live Probing (`323/323` unit tests pass) | Core billing, QRIS gateway, pickup, marketplace, and 323 unit tests work; `/pengaduan` WA lookup, `/lacak`, `/coverage`, and `/m/angkut` offline queue are broken/disabled. |
| **Accessibility** | **55 / 100** | Static Audit (`check:classes` + code); screen reader/axe **NOT VERIFIED** | Has skip-link `#main-content` and `prefers-reduced-motion`, but **413 contrast failures** (`bg-emerald-500/600` + `text-white`, `text-emerald-600`, `text-amber-600`), missing `<h1>` in `/bayar` SSR, and unlabelled icon-only buttons on some admin pages. |
| **Performance** | **NOT VERIFIED (Static Risk Flagged)** | TTFB probed (`20–184ms`); Core Web Vitals/LCP/CLS/Bundle **NOT VERIFIED** | `next.config.ts` sets `images: { unoptimized: true }`, `src/app/page.tsx` uses raw `<img>` for Unsplash product photos, `force-dynamic` disables static caching on public landing pages, and 1,600–2,800 LOC client pages increase JS bundle cost. |
| **Design Consistency** | **58 / 100** | Verified | `src/components/ui/` has only 3 primitives (`button`, `dialog`, `skeleton`) which are mostly unused; modals, tables, and buttons are duplicated ad-hoc across 91 pages alongside `globals.css` `!important` brute-force overrides. |
| **Business Conversion** | **66 / 100** | Verified | Clear CTAs on homepage (`/daftar`, `/pickup`, `#produk-olahan`) and `CivicHeroWidget`, weakened by conflicting Rp 40k vs Rp 50k tariffs, disabled `/lacak`, and broken `/pengaduan` WA lookup. |
| **Maintainability** | **52 / 100** | Verified (`tsc` 0 errors, `ignoreBuildErrors: true`) | Multiple 1,300–2,824-line monolithic `"use client"` pages (`tagihan`, `pelanggan`, `rute`, `pengaturan`, `bayar`), 886 `check:classes` failures, `ignoreBuildErrors: true` in `next.config.ts`, and 7 redirect stub pages. |
