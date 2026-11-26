# REDESIGN_ROADMAP.md — Phased Implementation Plan, Performance/A11y Summary & Consolidated Scorecard

> **Scope**: Dual-track execution roadmap for **UPS HERU** (`upsheru.com`) and **O2W HERO** (`o2whero.com`) without erasing either brand's identity, paired with verified Part 8 Performance/Accessibility evidence and Part 9 0–100 Scorecard.
> **Audit Integrity Rule**: Every metric below strictly separates **Verified Observed Facts** (code inspection, `tsc --noEmit`, `vitest`, `npm run check:classes`, live `curl` HTTP/HTML) from **Unverified Runtime Checks (`NOT VERIFIED`)** and **Recommendations**.

---

## PART A — VERIFIED PERFORMANCE & ACCESSIBILITY SUMMARY (Part 8)

### 1. Verified Technical Baseline (Observed Tool Outputs)
- **TypeScript (`node ./node_modules/typescript/bin/tsc --noEmit`)**: Exit code `0` (`0` errors), **yet** [next.config.ts](file:///data/data/com.termux/files/home/wastepay/next.config.ts) retains `typescript: { ignoreBuildErrors: true }`.
- **Automated Unit Tests (`node ./node_modules/vitest/vitest.mjs run`)**: `33` test files passed, **`323/323` tests passed**. *(Note: End-to-end UI Playwright browser suite not run locally due to Android ARM64 Chromium boundary).*
- **Tailwind & WCAG Static Lint (`npm run check:classes`)**: **`886` total issues**:
  - `473` invalid Tailwind v4 classes silently ignored by Tailwind `3.4.19`: `shadow-xs` (`414`), `shadow-2xs` (`31`), `backdrop-blur-xs` (`24`), `outline-hidden` (`4`).
  - `413` WCAG AA contrast violations: `bg-emerald-500/600` + `text-white` (`135`), `text-emerald-600` (`223`), `text-amber-600` (`55`).
- **Live HTTP/HTML Probes (`curl`)**:
  - `https://o2whero.com/` (`200 OK`, `732ms` TTFB, `49.6KB` HTML), `/login` (`200`, `90ms`), `/bayar` (`200`, `30ms`, leaked UPS HERU), `/mitra` (`404`), `/og-image.png` (`404`), `/logo.png` (`404`).
  - `https://upsheru.com/` (`200 OK`, `184ms`, `189.7KB` HTML), `/bayar` (`200`, `22ms`, `h1=""`), `/daftar` (`200`, `45ms`), `/tarif` (`200`, `81ms`), `/unduh` (`200`, `37ms`, `headers:2`), `/lacak` (`307 -> /`), `/coverage` (`307 -> /`), `/ups_heru_logo.jpg` (`404`).

### 2. Performance Inspection
- **Image Optimization**: `next.config.ts` sets `images: { unoptimized: true }`; `src/app/page.tsx` renders raw `<img>` tags for external Unsplash images (plus verified `404` on `/og-image.png`, `/logo.png`, `/ups_heru_logo.jpg`).
- **Lazy Loading & Client Bundles**: Several core/admin routes are massive single-file `"use client"` monoliths (`tagihan` `2,824` LOC, `pelanggan` `2,430` LOC, `rute` `2,234` LOC, `pengaturan` `1,876` LOC, `bayar` `1,673` LOC, `tenants` `1,623` LOC, `O2WHeroCorePortal` `1,338` LOC), increasing JS hydration weight. Public `/` relies on `force-dynamic` SSR (`headers()` + live DB), raising `o2whero.com/` TTFB to `732ms` vs cached `20–90ms` pages.
- **Font Loading**: `Inter` (`layout.tsx`) defines `display: "swap"`, while `JetBrains_Mono` omits `display: "swap"`. Some Leaflet/tooltip styles fall back to system fonts.
- **Re-renders & Runtime CWV (LCP / INP / CLS / Bundle Size)**: Exact browser runtime metrics are **`NOT VERIFIED`** (no Chromium/Lighthouse running locally).

### 3. Accessibility & SEO Inspection
- **Positive Controls Observed**: Skip link `#main-content` in `layout.tsx`, `prefers-reduced-motion` handling in `globals.css`, `SlideToConfirm` `h-14` (`56px`), `<label htmlFor>` present on `PengaduanForm` and `/login`, `Escape` handling on `ConfirmDialog` & `ui/dialog.tsx`.
- **Verified Accessibility Gaps**:
  - `413` color-contrast errors from `check:classes`.
  - Empty `<h1>` on `/bayar` SSR (`h1=""` live due to `<Suspense>` wrapper).
  - Unbound `<label>` fields in `O2WHeroCorePortal.tsx`, `/mitra`, `/bayar`, `/m/survei`; missing `aria-expanded` on FAQ accordions in `O2WHeroCorePortal.tsx`.
  - **20+** inline `fixed inset-0` modals without focus-trap or `Escape` handler; undersized touch hit-areas (`24–36px`) on `"✕"` close icons, topbar toggles, and mobile drawer triggers.
  - Native `alert()` used in `/marketplace`.
  - `o2whero.com/sitemap.xml` & `robots.txt` emit `upsheru.com` URLs; duplicate `<header>` landmarks on `/unduh`, `/m/report`, `/m/pengaduan`; duplicate `<title>` suffixes on `/pickup`, `/marketplace`, `/daftar`.
- **Screen Reader / `axe-core` / Keyboard Tab Audit**: Runtime execution is **`NOT VERIFIED`**.

---

## PART B — CONSOLIDATED PART 9 SCORECARD (0–100)

*(Values reproduced strictly from [UI_UX_AUDIT_UPSHERU.md](file:///data/data/com.termux/files/home/wastepay/UI_UX_AUDIT_UPSHERU.md) and [UI_UX_AUDIT_O2WHERO.md](file:///data/data/com.termux/files/home/wastepay/UI_UX_AUDIT_O2WHERO.md); unverified runtime browser dimensions marked **`NOT VERIFIED`**).*

| Category | UPS HERU Score | O2W HERO Score | Verification Scope | Key Observed Drivers |
|---|---|---|---|---|
| **Visual Design** | **72 / 100** | **76 / 100** | Partial (Code + CSS/HTML; visual screenshots **NOT VERIFIED**) | Clean brand aesthetics, penalized by 473 stripped Tailwind v4 classes (`shadow-xs`, `backdrop-blur-xs`), half-dark UPS public UI, & missing O2W screenshots/`404` OG images |
| **UX** | **64 / 100** | **62 / 100** | Verified via Code & API Flow Trace | Good wizards/cockpits vs broken `/pengaduan` WA lookup, disabled `/lacak` & `/coverage`, `PATCH /api/core/mitra/register` `403`, fake `/platform-settings` toggles, no tenant self-serve billing |
| **Navigation** | **68 / 100** | **60 / 100** | Verified | `PublicNavbar` + `AdminShell` isolation vs double headers on `/unduh`/`/m/report`/`/m/pengaduan`, O2W missing `< lg` mobile nav, `ai-command` orphaned in Core sidebar, `o2whero.com/bayar` leak |
| **Responsive Design** | **65 / 100** | **62 / 100** | Static Code Inspection Only (Pixel `360–1440px` render **NOT VERIFIED**) | Tenant admin card fallbacks vs un-wrapped Core BI tables (`saas-billing`, `revenue`, `tenant-roi`, `environmental-impact`), `360px` topbar congestion, `16px !important` mobile input rule |
| **Functionality** | **70 / 100** | **65 / 100** | Verified (`323/323` Vitest pass) | Working DB CRUD/QRIS/pickup core vs broken `/pengaduan` lookup, unwired `offline-queue.ts`, blocked partner approval `PATCH`, conflicting pricing math |
| **Accessibility** | **55 / 100** | **58 / 100** | Static (`check:classes` + Code); screen reader / `axe-core` **NOT VERIFIED** | Skip-link & `prefers-reduced-motion` vs **413 contrast failures**, `/bayar` `h1=""`, unbound `<label>`s, inline non-Escape modals, 24–36px touch targets |
| **Performance** | **NOT VERIFIED** *(Static Risk Flagged)* | **NOT VERIFIED** *(Static Risk Flagged)* | Live TTFB only (`20–732ms`); CWV / LCP / CLS / Bundle **NOT VERIFIED** | `images: { unoptimized: true }`, raw `<img>`, `force-dynamic` public `/` (`732ms` on O2W), 1,300–2,824 LOC `"use client"` monoliths |
| **Design Consistency** | **58 / 100** | **64 / 100** | Verified | Under-used `ui/` (3 primitives), 4 competing button systems, inline modals, `globals.css` `!important` overrides, 5 discordant Core BI banner hues, cross-brand leaks |
| **Business Conversion** | **66 / 100** | **70 / 100** | Verified | Strong CTAs & ROI calculator vs conflicting `/tarif` (`40k` vs `50k`), disabled `/lacak`, live `/mitra` `404`, wrong sitemap domain, pricing mismatch (`2 Jt` vs `1,25 Jt`) |
| **Maintainability** | **52 / 100** | **58 / 100** | Verified (`tsc` 0 errors; `ignoreBuildErrors: true`) | `ignoreBuildErrors: true`, 7 monolith pages (`1.3k–2.8k` LOC), `886` `check:classes` failures, 7 redirect stubs, duplicated pricing & `"UPS HERU"` string literals |

---

## PART C — CLEAR IMPLEMENTATION SEQUENCE (DUAL-TRACK ROADMAP)

> **Facts vs. Recommendations**: All defect citations refer to verified code/HTTP probes above. Effort estimates, phase groupings, and target KPIs below are architectural **Recommendations**.

```
[Phase 0: P0/P1 Hotfixes (Week 1)] ──▶ [Phase 1: Multi-Tenant & Design System Foundation (Weeks 2–3)]
                                                        │
        ┌───────────────────────────────────────────────┴───────────────────────────────────────────────┐
        ▼                                                                                               ▼
[Phase 2A: UPS HERU Citizen & Officer UX (Weeks 4–5)]                               [Phase 2B: O2W HERO SaaS Self-Serve & BI (Weeks 4–6)]
        │                                                                                               │
        └───────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                        ▼
                       [Phase 3: Dual-Brand Polish, Playwright VPS Verification & Release (Weeks 7–8)]
```

---

### TRACK 1: SHARED PLATFORM & MULTI-TENANT SECURITY PREREQUISITES (Unblocks Both Brands)

#### Phase 0 — Critical Security & Broken Core Flows (Target: Days 1–5)
1. **Harden `src/proxy.ts` (`PF-01`, `PF-03`)**:
   - Move `isCore` boundary checks **above** `/bayar` (L474) and unauthenticated `NextResponse.next()` (L726–736). Reject/redirect consumer routes on `o2whero.com`.
   - Register `"PATCH:/api/core/mitra/register": 100` in `API_ROLE_MAP`; elevate `/api/core/tenants`, `/api/core/control-tower`, `/api/core/crm`, `/api/core/billing` from `50` -> `100`; remove `/api/pelanggan` & `/api/tagihan` from `isAllowedCoreApi`.
   - Map `/driver/peta` in `PAGE_ROLES` (`10`).
2. **Scope Prisma Queries by `tenantId` (`PF-02`)**:
   - Update `dashboard/page.tsx` `getStats(tenantId)` to filter by session `tenantId`.
   - Scope `tarif/page.tsx`, `daftar/page.tsx`, `page.tsx`, `peta/page.tsx`, and `/api/publik/tagihan-detail` (`getTagihanByNoInvoice`) by resolved host `tenantId`.
   - Plan & test `MULTITENANT_AUDIT.md` Phase 2 schema migrations for remaining 14 models in staging.
3. **Remove `ignoreBuildErrors: true` (`PF-23`)**: Enforce strict `tsc` during `next build` (already `0` errors today).

#### Phase 1 — Multi-Tenant Isolation & Design Token Repair (Target: Weeks 2–3)
1. **Dynamic Host Branding & SEO (`PF-05`, `PF-12`, `PF-13`)**:
   - Replace static `"UPS HERU"` metadata in `layout.tsx`, `(public)/layout.tsx`, and `login/layout.tsx` with `resolveTenantByHost(host)`.
   - Fix `sitemap.ts` and `robots.ts` to emit host-relative URLs via `headers()`.
   - Add missing `/images/o2w-logo.png`, `/og-image.png`, and fix `PILOT_TENANT.branding.logoUrl` -> `"/ups-heru-logo.jpg"`.
   - Inject `TenantBrandingContext` across `(admin)` and `/m`, stripping hardcoded `"UPS HERU"`, `"Depok"`, and `GRUP_PENGADUAN_ID = "120363430666363149@g.us"`.
2. **Design System & `check:classes` Zero-Error Sprint (`PF-21`, `PF-22`)**:
   - Replace all **473** Tailwind v4 classes (`shadow-xs` -> `shadow-sm`, `shadow-2xs` -> `shadow-sm`, `backdrop-blur-xs` -> `backdrop-blur-sm`, `outline-hidden` -> `outline-none focus-visible:ring-2`).
   - Fix all **413** contrast pairings (`bg-emerald-700 text-white`, `text-emerald-700`, `text-amber-800`).
   - Expand `src/components/ui/` (`Button`, `Dialog`, `Sheet`, `FormField`, `DataTable`, `Badge`) with CSS variables per brand (`data-brand="upsheru"` vs `data-brand="o2whero"`) and `44x44px` minimum mobile hit-areas.

---

### TRACK 2: UPS HERU IMPLEMENTATION SEQUENCE (`upsheru.com`)

| Stage | Target Workstream | Master Fixes | Concrete Actions | Measurable Exit Gate |
|---|---|---|---|---|
| **Stage U1** *(Week 1)* | **Fix Broken Citizen Journeys** | `PF-04`, `PF-07`, `PF-09` | 1. Support normalized WhatsApp (`08xx`/`628xx`) + `kodePelanggan` + `tenantId` in `/api/publik/pengaduan` (remove hardcoded `, Depok`).<br>2. Remove hardcoded `Rp 50.000` override in `tarif/page.tsx` so `/` and `/tarif` match.<br>3. Replace dummy `wa.me/6281234567890` in `bayar/page.tsx#L1354` with tenant WA. | Citizen complaint works with WA number; `/tarif` matches DB; zero dummy WA links. |
| **Stage U2** *(Weeks 2–3)* | **Driver Offline Reliability & Mobile Shell Cleanup** | `PF-08`, `PF-19`, `PF-24` | 1. Wire `src/lib/offline-queue.ts` (`queueOfflinePickup`, `syncOfflineQueueToServer`) into `m/angkut/page.tsx` with pending-sync UI indicator.<br>2. Strip duplicate nested `<header>` chrome from `/unduh`, `/m/report`, `/m/pengaduan`.<br>3. Expose `/m/survei` to dual-role (`isAngkut && isSurvei`) officers; swap `alert()` in `/marketplace` for `useToast()`. | Offline pickup persists in IndexedDB and syncs on reconnect; `/unduh` & `/m/*` have 1 `<header>`. |
| **Stage U3** *(Weeks 4–5)* | **Public Trust, Dark Mode & Checkout UX** | `PF-06`, `PF-20`, `PF-24` | 1. Restore `/lacak` & `/coverage` behind feature flags (or remove cleanly from `sitemap.ts` + claims).<br>2. Lift `<h1>` outside `<Suspense>` in `/bayar/page.tsx` and complete `dark:` variants across `(public)` sections & `CivicHeroWidget`.<br>3. Deduplicate `<title>` templates on `/pickup`, `/marketplace`, `/daftar`; consolidate `/bayar-tagihan` -> `/bayar`. | Live `<h1>` in `/bayar` SSR; dark mode visually consistent on all public pages. |
| **Stage U4** *(Weeks 6–7)* | **Operator Monolith Split & QRIS Polish** | `PF-22`, `PF-23`, `PF-25`, `PF-26` | 1. Split `tagihan/page.tsx` (`2,824` LOC), `pelanggan/page.tsx` (`2,430` LOC), `rute/page.tsx` (`2,234` LOC), and `bayar/page.tsx` (`1,673` LOC) onto shared `ui/DataTable` & `ui/Dialog`.<br>2. Remove 7 redirect stubs via `next.config.ts` redirects.<br>3. Add inline QRIS QR modal with countdown/polling in `/bayar`. | `check:classes` = `0`; `360px` mobile topbar uncrowded; inline QRIS scan works. |

---

### TRACK 3: O2W HERO IMPLEMENTATION SEQUENCE (`o2whero.com`)

| Stage | Target Workstream | Master Fixes | Concrete Actions | Measurable Exit Gate |
|---|---|---|---|---|
| **Stage O1** *(Week 1)* | **Stop Brand Bleed & Unblock Partner Approval** | `PF-01`, `PF-03`, `PF-05`, `PF-10` | 1. Ensure `o2whero.com/login` SSRs `"O2W HERO Portal"` (zero UPS HERU strings).<br>2. Unblock `PATCH /api/core/mitra/register` (`403` -> `200` for superadmin) and link partner approval directly to `/tenants` provisioning.<br>3. Unify SaaS pricing tiers in `src/lib/saas-plans.ts` across landing, ROI calculator, `/subscriptions`, `/saas-billing`, and `/api/core/control-tower`. | `o2whero.com` serves 0% UPS HERU copy; Superadmin approves partner in 1 click; pricing 100% consistent. |
| **Stage O2** *(Weeks 2–3)* | **Enterprise Landing Release, Mobile Nav & SEO Fix** | `PF-12`, `PF-14`, `PF-15` | 1. Add `<1024px` mobile drawer navigation to `O2WHeroCorePortal.tsx` and accessible `htmlFor` + `aria-expanded` attributes.<br>2. Deploy `/mitra` styled cleanly with O2W HERO dark shell (not UPS HERU `PublicLayout`) and fix `404` `/og-image.png` & `/logo.png`.<br>3. Verify `o2whero.com/sitemap.xml` & `robots.txt` emit `o2whero.com` URLs. | `200 OK` on `/mitra`, `/og-image.png`, `/logo.png`; mobile nav usable at `360px` & `768px`. |
| **Stage O3** *(Weeks 4–6)* | **Tenant SaaS Self-Service & Core BI Mobile Parity** | `PF-11`, `PF-16`, `PF-17`, `PF-18` | 1. Lower `PAGE_ROLES["/users"]` to `50` with strict tenant scoping so Tenant Admins manage their own staff.<br>2. Enforce `TenantConfig.fitur` flags in `Sidebar` and `AdminMobileResponsiveShell`.<br>3. Launch Tenant `/langganan` self-service plan/invoice/usage UI + tenant branding uploader in `/pengaturan`.<br>4. Wrap Core BI tables (`/saas-billing`, `/revenue`, `/tenant-roi`, `/environmental-impact`) in `overflow-x-auto` + mobile cards; back `/platform-settings` toggles with persistence (or read-only infra telemetry) and fix `ai-command` `CORE_GROUP_MAP`. | Tenant Admins self-manage staff, branding, and subscription usage; zero BI table clipping on `360px`; module entitlements enforced. |
| **Stage O4** *(Weeks 7–8)* | **Control Tower Polish & Visual Proof** | `PF-25`, `PF-26` | 1. Unify Core BI header gradients onto consistent `slate-950` + `sky`/`emerald` system.<br>2. Add real Indonesia choropleth/Leaflet map to `/ecosystem-map`.<br>3. Add real high-DPI Control Tower & Driver Cockpit screenshots + Book Demo path to `O2WHeroCorePortal.tsx`. | Cohesive enterprise SaaS aesthetic across all 14 Core Control Tower routes. |

---

## PART D — POST-IMPLEMENTATION VERIFICATION PROTOCOL (Cloud `github-vps` Gate)

Because Android ARM64 Termux cannot launch Chromium Playwright binaries locally (`ECONNREFUSED 127.0.0.1:9222`), **every sprint merge above should be gated on an `x86_64` Ubuntu runner (`github-vps`)** running:
1. `node ./node_modules/typescript/bin/tsc --noEmit` (`0` errors, without `ignoreBuildErrors: true`)
2. `npm run check:classes` (`0` Tailwind v4 / WCAG contrast failures)
3. `node ./node_modules/vitest/vitest.mjs run` (all unit & multi-tenant isolation tests pass)
4. Playwright visual & responsive matrix (`360x800`, `390x844`, `430x932`, `768x1024`, `1366x768`, `1440x900`) verifying `scrollWidth <= clientWidth`, screenshot captures, and multi-tenant host isolation across `o2whero.com` vs `upsheru.com` vs test subdomain.
5. `axe-core` + Lighthouse CI verifying Accessibility (`>= 90`), SEO (`>= 90`), and Core Web Vitals (`LCP`, `INP`, `CLS`).
