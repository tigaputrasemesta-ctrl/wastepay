# RESPONSIVE_AUDIT.md — Multi-Viewport & Android Mobile UX Audit

> **Target Viewports**: Mobile `360px`, `390px`, `430px`; Tablet `768px`; Laptop `1366px`; Desktop `1440px`  
> **Priority**: Android mobile experience (Chrome Android + Capacitor/Flutter WebView)  
> **Verification Status**:  
> - **Static Layout, Breakpoint, Table, Modal, Touch-Target & CSS Analysis**: **VERIFIED** via source code inspection across `src/app/**`, `src/components/**`, and `src/app/globals.css`.  
> - **Live Browser Pixel Rendering & ScrollWidth Measurements (`360px`–`1440px`)**: **NOT VERIFIED** (no headless Chromium/Playwright runtime available on Android ARM64 Termux).

---

## 1. Breakpoint & Shell Architecture Overview

| Shell | `< 768px` (360 / 390 / 430px) | `768px` (`md`) | `1366px` / `1440px` |
|---|---|---|---|
| **UPS HERU Public (`PublicLayout` + `PublicNavbar`)** | Sticky top bar: logo + `ThemeToggle` + compact `Daftar` button (`min-h-[38px]`) + hamburger drawer | Switches to full horizontal desktop nav (`md:flex`) + `Daftar Warga Baru` + `Masuk Petugas` | Max container `max-w-6xl` (`1152px`) centered |
| **O2W HERO Landing (`O2WHeroCorePortal`)** | Sticky header with logo + `Masuk Portal` + `Gabung Mitra`. **Nav links are `hidden lg:flex` (NO mobile menu!)** | **Same issue at 768px (`md`)**: Desktop nav remains hidden until `1024px` (`lg`), leaving tablet & mobile without section navigation | Full 6-link nav bar visible inside `max-w-6xl` |
| **Admin Portal (`AdminMobileResponsiveShell`)** | Mobile top bar (`h-14`) + `AdminCommandSearch` (`w-36`) + `NotificationBell` + `StatusBar` + fixed 4/5-tab bottom bar (`h-16 pb-safe`) + slide-up drawer | Switches at `md:` (`768px`) to persistent `Sidebar` (`w-64` or collapsed `w-[72px]`) + `h-16` top bar | Full sidebar + `flex-1` main scroll pane |
| **Field Officer (`/m/*` `MobileLayout`)** | Fullscreen `h-dvh` (`w-full max-w-[430px]`) + `header` + `BottomNav` (`pb-safe`) | Centered simulated smartphone frame (`sm:max-w-[430px] sm:h-[880px] sm:rounded-[38px]`) | Centered smartphone frame with `"Dashboard Web ↗"` helper bar |

---

## 2. Viewport-by-Viewport Findings

### A. Mobile `360px` (Android Budget / Compact Devices — Highest Risk)
1. **Admin Topbar Congestion ([AdminMobileResponsiveShell.tsx#L293-L348](file:///data/data/com.termux/files/home/wastepay/src/components/admin/AdminMobileResponsiveShell.tsx#L293-L348))**:
   - At `360px`, the mobile top bar packs **7 elements** horizontally: Menu button (`36px`), Logo (`28px`) + `brandName`, `AdminCommandSearch` (`w-36` = `144px`), `AdminSyncIndicator`, `ThemeToggle`, `NotificationBell` (`36px`), and `StatusBar` (`hh:mm:ss WIB`, ~`85px`). Total width easily exceeds `360px`, squeezing `brandName` and `AdminCommandSearch` or forcing clipping.
2. **O2W HERO Header Action Buttons ([O2WHeroCorePortal.tsx#L225-L286](file:///data/data/com.termux/files/home/wastepay/src/components/core/O2WHeroCorePortal.tsx#L225-L286))**:
   - Logo + subtitle (`"Platform Sampah & Ekonomi Sirkular"`) + `"Masuk Portal"` + `"Gabung Mitra"` on a single row at `360px` leaves zero room and risks wrapping or squeezing text.
3. **Core SaaS BI Tables Without `overflow-x-auto` (P2)**:
   - `saas-billing/page.tsx`, `revenue/page.tsx`, `tenant-roi/page.tsx`, and `environmental-impact/page.tsx` render 5–6 column `<table>` elements inside `overflow-hidden` cards without `overflow-x-auto` or mobile card fallbacks. At `360px–430px`, right-hand columns are clipped or break layout.
4. **Notification Dropdown Width (`NotificationBell.tsx#L133`)**:
   - Dropdown uses `w-80 sm:w-96` (`320px`). Positioned `right-0` inside a padded right cluster at `360px`, it sits very close to the left screen edge.
5. **Field Officer Bottom Nav (`m/layout.tsx#L74-L111`)**:
   - When `isAngkut` is true, **6 items** (`Beranda`, `Angkut`, `Report`, `Aduan`, `Klaim`, `Absen`) fit horizontally at `360px` using `text-[9px]` (`60px` each), which is tight for gloved/wet fingers and below recommended legibility.
6. **Redundant Nested Headers on `/m/report` & `/m/pengaduan`**:
   - Both pages render full-width `sticky top-0` headers *inside* `MobileLayout`'s `<main className="px-3.5 py-2.5 pb-20">`, leaving visible `14px` white side margins around colored gradient headers at `360px–430px`.

### B. Mobile `390px` & `430px` (Modern Android & Large Phones)
- **Public `/bayar` Search Input ([bayar/page.tsx#L1277-L1300](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/bayar/page.tsx#L1277-L1300))**:
  - Uses `pr-32` (`128px` right padding) with an absolute-positioned `"Periksa"` button inside the input. Works at `390px/430px`, though long numbers + `"Memeriksa..."` state can collide at `360px`.
- **Tariff Table on `/tarif` ([tarif/page.tsx#L116-L139](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/tarif/page.tsx#L116-L139))**:
  - Uses a 12-column CSS grid (`col-span-6` / `col-span-3` / `col-span-3`) with `px-6`. On `360px–430px`, `col-span-3` (`~75px`) squeezes currency values like `Rp 100.000` and schedule text tightly.
- **Mobile Input Font-Size Rule (`globals.css#L209-L219`)**:
  - Forces `font-size: 16px !important` on `input`, `select`, `textarea` under `768px`. Good for preventing iOS Safari auto-zoom, **but** overrides compact `text-xs` inputs inside `MobileAngkut` search bars, `AdminCommandSearch`, and `m/report` `grid-cols-2` date/vehicle selectors, causing tall or clipped input text on Android.

### C. Tablet `768px` (`md`)
- **`md:flex` Sidebar + Narrow Content Pane**:
  - At `768px`, `Sidebar` (`w-64` = `256px`) leaves **`512px`** for the main content pane!
  - In `dashboard/page.tsx`, `laporan/page.tsx`, `pelanggan/page.tsx`, and `tagihan/page.tsx`, `lg:grid-cols-4` drops to `sm:grid-cols-2`, and dense horizontal filter bars (`flex-wrap`) wrap awkwardly inside `512px` unless the user manually collapses the sidebar (`w-[72px]`).
- **O2W HERO Landing (`768px`)**:
  - Still shows **zero navigation links** because `nav` uses `hidden lg:flex` (`1024px` breakpoint) instead of `md:flex`.

### D. Laptop `1366px` & Desktop `1440px`
- **Public & O2W HERO**: `max-w-6xl` (`1152px`) and `max-w-5xl` (`1024px`) center cleanly with generous breathing room.
- **Admin Portal**: Sidebar (`256px`) leaves `1110px` (`1366px`) and `1184px` (`1440px`) — ample width for 4-column KPI grids and multi-column tables (`pelanggan`, `tagihan`, `rute`, `laporan`).
- **Minor issue at `1366px`**: `Sidebar.tsx` renders 25+ items across 5 groups vertically, requiring sidebar scrolling on `768px`-tall `1366x768` laptops.

---

## 3. Touch Target, Modal & Mobile Form Matrix

| Aspect | Audit Evidence | Verdict |
|---|---|---|
| **Touch Targets (`>= 44x44px` Android Material / WCAG 2.5.5)** | - **Pass**: `SlideToConfirm` (`h-14` = `56px`), `.thumb-button-primary` (`h-12 sm:h-14`), `CivicHeroWidget` tabs (`min-h-[44px]`), `PublicNavbar` mobile CTA (`min-h-[38px]` — slightly under `44px`).<br>- **Fail**: `PublicNavbar` desktop/mobile `ThemeToggle` (`p-2` / `w-9 h-9` = `36px`), `AdminMobileResponsiveShell` topbar menu button (`h-9 w-9` = `36px`), modal close `"✕"` buttons (`p-1` = ~`24–28px`!), `m/layout.tsx` `"Keluar"` (`py-1`), `FloatingWhatsApp` tooltip `"✕"`. | **Needs Improvement (Many 24–36px targets)** |
| **Table Responsiveness** | - **Good**: `pelanggan`, `tagihan`, `rekonsiliasi`, `pengeluaran`, `audit-log`, `komplain` provide `hidden md:block` table + `md:hidden` mobile cards or `overflow-x-auto`.<br>- **Broken**: `saas-billing`, `revenue`, `tenant-roi`, `environmental-impact` lack `overflow-x-auto` and mobile card views. | **Mixed (Tenant Admin Good, Core BI Broken)** |
| **Modal Dimensions** | - `ui/dialog.tsx` & `ConfirmDialog.tsx` use `p-4`, `max-h-[90vh]`, `overflow-y-auto`.<br>- `globals.css#L607-L617` forces `.fixed.inset-0[class*="z-50"] { overflow-y: auto !important; }`.<br>- **Gap**: Inline modals in `tenants/page.tsx` and `bayar/page.tsx` do not trap focus or close on `Escape`. | **Acceptable** |
| **Mobile Form Usability** | - `FormDaftar.tsx` uses 4 guided steps + `inputMode` + GPS/EXIF.<br>- `bayar/page.tsx` uses `inputMode="tel"` & auto-normalizes `08xx -> 628xx`.<br>- **Gap**: `globals.css` `16px !important` rule inflates compact inline filter inputs under `768px`. | **Good on Public Wizards, Fair on Admin Filters** |

---

## 4. Prioritized Responsive Fixes

1. **[P2]** Wrap `<table>` in `overflow-x-auto` (and add mobile card fallback) on `/saas-billing`, `/revenue`, `/tenant-roi`, `/environmental-impact`.
2. **[P2]** Add mobile/tablet hamburger menu to `O2WHeroCorePortal.tsx` for `<1024px`.
3. **[P2]** Declutter `AdminMobileResponsiveShell` mobile topbar (`<390px`): hide `StatusBar` seconds or move `AdminSyncIndicator` label into drawer/popover so `360px` screens don't crowd.
4. **[P2]** Remove duplicate `min-h-screen` & sticky top headers inside `/m/report` and `/m/pengaduan`.
5. **[P3]** Standardize `/tarif` table into stacked mobile cards below `sm:` (`640px`).
6. **[P3]** Increase modal close buttons (`"✕"`), `AdminMobileResponsiveShell` menu button, and `PublicNavbar` mobile CTA to minimum `44x44px` (`h-11 w-11` / `min-h-[44px]`) touch hit-areas.
7. **[P3]** Run automated Playwright viewport tests (`360x800`, `390x844`, `430x932`, `768x1024`, `1366x768`, `1440x900`) on `github-vps` (`Ubuntu x86_64`) to empirically verify zero `scrollWidth > clientWidth` regressions.
