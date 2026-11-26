# UI_UX_AUDIT_O2WHERO.md — Comprehensive UI/UX Audit: O2W HERO (`o2whero.com`)

> **Target Brand**: O2W HERO (Enterprise Multi-Tenant SaaS Platform for Waste Management Digital Transformation)  
> **Live URL**: `https://o2whero.com`  
> **Verification Basis**: Direct codebase inspection (`O2WHeroCorePortal.tsx`, `CoreSaaSDashboard.tsx`, `tenants/page.tsx`, `subscriptions/page.tsx`, `saas-billing/page.tsx`, `revenue/page.tsx`, `tenant-roi/page.tsx`, `crm-prospek/page.tsx`, `ecosystem-map/page.tsx`, `notifikasi-saas/page.tsx`, `environmental-impact/page.tsx`, `platform-settings/page.tsx`, `users/page.tsx`, `audit-log/page.tsx`, `src/proxy.ts`) + live HTTP probes on `https://o2whero.com`. Browser screenshot/Lighthouse checks are **NOT VERIFIED**.

---

## 1. Executive Summary

O2W HERO (`o2whero.com`) positions itself as an enterprise SaaS Control Tower for TPS3R, Bank Sampah, and municipal waste operators across Indonesia, anchored by a high-contrast dark slate-950/emerald marketing portal (`O2WHeroCorePortal.tsx`) and a dedicated 14-module SaaS Control Tower (`CoreSaaSDashboard` + Super Admin routes).

However, **critical product, security, and brand-isolation gaps** undermine its enterprise SaaS readiness:
1. **Uncommitted Landing Rewrite & Live 404s**: Live `https://o2whero.com/` still serves an older version (`title="O2WHERO — Ekosistem Digital..."`), `https://o2whero.com/mitra` returns **404**, and `https://o2whero.com/og-image.png` & `/logo.png` return **404**.
2. **Severe Brand Leakage on Core Sub-Routes (P0/P1)**:
   - Live `https://o2whero.com/login` renders **`title="Masuk Petugas | UPS HERU Depok"`** and **`<h1>UPS HERU Portal</h1>`** in SSR HTML!
   - Live `https://o2whero.com/bayar` returns **HTTP 200** with full **UPS HERU Depok** branding! (Unauthenticated visitors on `o2whero.com` can open any `(public)` route—`/bayar`, `/daftar`, `/tarif`, `/pengaduan`, `/pickup`, `/marketplace`, `/unduh`—and see UPS HERU!)
3. **Broken Partner Approval Endpoint (`PATCH /api/core/mitra/register`) (P1)**: `CoreSaaSDashboard.tsx` calls `PATCH /api/core/mitra/register`, which is **not registered in `API_ROLE_MAP`** in `src/proxy.ts` -> proxy fails closed with `403 Forbidden: rute tidak terdaftar`!
4. **Pricing & Tier Mismatch Across SaaS Control Plane (P1)**: Marketing page sells `"Kemitraan All-in-One (Rp 2 Jt/bln + 10% Komisi)"` & `"Enterprise (Rp 4,99 Jt/bln)"`, while `/subscriptions`, `/saas-billing`, `/tenant-roi`, and `/api/core/control-tower` compute **`Pro = Rp 1.250.000/bln`** and **`Enterprise = Rp 2.990.000/bln`**.
5. **Non-Functional / Stubbed Admin Controls**: `/platform-settings` feature toggles are ephemeral `useState` booleans (never saved), `/ecosystem-map` has no map, and **there is no Tenant Self-Service Portal** (`tenant onboarding`, `subscription management`, `usage monitoring`, and `module entitlements` for tenant admins do not exist as self-service UI).

---

## 2. Detailed Evaluation by Surface

### A. Marketing Website (`https://o2whero.com`)

| Section | Implementation (`O2WHeroCorePortal.tsx` local vs live) | Findings |
|---|---|---|
| **Header & Navigation** | Sticky dark glass header (`O2W HERO`, `SaaS TPS3R`), 6 anchor links (`#solusi`, `#simulasi`, `#perbandingan`, `#contoh-nyata`, `#harga`, `#faq`), `Masuk Portal` (`/login`), `Gabung Mitra` (`#daftar`) | **Missing Mobile Nav**: Nav links are `hidden lg:flex`, with **zero hamburger/mobile menu** for `<1024px`! |
| **Hero & Value Proposition** | Headline `"Otomatiskan TPS3R Anda & Raih Penerimaan Iuran 98%+"`, dual CTA (`#daftar` + `upsheru.com`), 4 proof metric cards (`1.253 KK`, `Rp 43,8 Jt`, `98,4%`, `0 Jam`) | Clear Bahasa Indonesia B2B positioning. Note: `1.253 KK` metric differs from `upsheru.com`'s `2.450+ KK`. Live site serves older pre-rewrite copy. |
| **Product Explanation & Role Showcase** | 4 interactive tabs (`Pengurus TPS3R`, `Supir & Armada`, `Warga & Nasabah`, `Bendahara Kas`) with mock UI cards | Good role storytelling, **but zero real product screenshots** or interactive sandbox preview. |
| **Benefits & Interactive ROI Calculator** | `#simulasi` interactive sliders (`500–5.000 KK` & `Rp 20.000–80.000`) calculating gross, Rp 2 Jt subscription, 10% commission, and net cash | Strong conversion tool. **Defect**: Formula assumes fixed Rp 2 Jt + 10% regardless of KK tier (even if `500 KK` fits Starter Rp 349k). |
| **Case Study (`UPS HERU`) & Pricing** | `#contoh-nyata` spotlight + 3-tier pricing (`Starter Rp 349k`, `Kemitraan All-in-One Rp 2 Jt + 10%`, `Enterprise Rp 4,99 Jt`) + Pilot banner | **Critical Pricing Conflict** with `/subscriptions` (`Pro Rp 1.250.000`) & `/api/core/control-tower` (`enterprise: 2990000`). |
| **Registration Form & FAQ** | `#daftar` inline form (`POST /api/core/mitra/register`) + 6-item accordion FAQ | No dedicated "Request Demo" booking flow (only partnership signup); inline `#daftar` works well; `/mitra` standalone page is 404 live and uses light-mode UPS HERU layout locally. |
| **Metadata, Assets & SEO** | Local `generateMetadata` references `https://o2whero.com/og-image.png` & JSON-LD `logo: https://o2whero.com/logo.png` | **Both `/og-image.png` and `/logo.png` return 404 live!** `sitemap.xml` & `robots.txt` on `o2whero.com` return `https://upsheru.com/...`! |

### B. SaaS Product / Tenant Self-Service Experience (`Admin` on Tenant Domain)

| Expected SaaS Capability | Current State in Codebase | Audit Finding |
|---|---|---|
| **Login (`/login`)** | Shared `/login` page with client-side `useEffect` checking `o2whero.com` vs tenant | **SSR Brand Leak**: Initial HTML renders `"UPS HERU Portal"` and `<title>Masuk Petugas | UPS HERU Depok</title>` on `o2whero.com/login`. No "Forgot Password" or SSO/magic-link flow. |
| **Registration (`/mitra` / `#daftar`)** | Public `MitraRegistration` lead form -> manual admin approval | **No self-serve signup** with instant trial provisioning or email verification. |
| **Tenant Onboarding** | Manual: Superadmin opens `/crm-prospek` -> clicks "Provision" -> redirects to `/tenants?action=create` | No guided tenant onboarding checklist inside a new tenant's `/dashboard` (e.g., configure logo, bank account, WA device, tariffs). |
| **Tenant Dashboard (`/dashboard`)** | Operational TPS3R dashboard (`getStats()`) | **No tenant isolation in `getStats()`** (queries global tables without `tenantId`). |
| **Subscription Management & Usage Monitoring** | **Missing for Tenants!** Only Superadmin has `/subscriptions` and `/saas-billing` (blocked for tenants by `proxy.ts`) | Tenants cannot view their current plan, pay their own SaaS monthly invoice, or track WA/KK quota usage (except WA quota buried inside `/pengaturan`). |
| **Tenant Settings (`/pengaturan`)** | 1,876-line page mixing Wilayah RT/RW, Tax/Denda, WA Templates, Dual WA, Google Contacts, and Change Password | **No Tenant Branding UI** (tenant cannot edit `namaMitra`, `logoUrl`, `warnaTema`) and **no Payment Payout Bank UI** for tenants (only Superadmin can edit `paymentConfig` on `/tenants`). |
| **User & Role Management (`/users`)** | `/users` is restricted to **`superadmin` (`100`) only** in `PAGE_ROLES` (`src/proxy.ts#L54`)! | **P1 SaaS Gap**: Tenant Admins (`admin: 50`) **cannot access `/users`** to manage their own cashiers or staff accounts, even though `API_ROLE_MAP` allows `GET/POST/PUT/DELETE /api/users` at level `50`! |
| **Module Entitlements** | `TenantConfig.fitur` flags (`retribusiSampah`, `tabunganSampah`, `jemputSampah`, `jualOfftaker`, `qrisDuitku`, `whatsappNotif`) exist in `types.ts` | **Unused in UI!** `Sidebar.tsx` and `AdminMobileResponsiveShell.tsx` never check `tenant.fitur` entitlements—all modules show regardless of plan tier (`Starter` vs `Pro` vs `Enterprise`). |

### C. Platform Super Admin (`o2whero.com` Control Tower)

| Module | Route | Evaluation & Gaps |
|---|---|---|
| **Control Tower Dashboard** | `/dashboard` (`CoreSaaSDashboard`) | Clean dark hero + 4 KPI cards + 4 SaaS financial/ESG cards + Mitra list + Pending Registrations. **Bugs**: `PATCH /api/core/mitra/register` blocked by `proxy.ts` (`403`); `Sidebar.tsx` hardcodes `"Tenant: UPS HERU"`; `ai-command` is missing from `CORE_GROUP_MAP` so it never shows in Core sidebar. |
| **Tenant Management & Provisioning** | `/tenants` | Comprehensive CRUD, Dual WA Fonnte device check, Payment/Commission config, safe slug-confirmed delete. **Gap**: 1,623-line client file; non-pilot tenants' operational stats default to `0` or hardcoded `upsheru` checks in BI pages. |
| **Tenant Verification (CRM)** | `/crm-prospek` | Tracks `MitraRegistration` stages (`menunggu_review` -> `dihubungi` -> `demo` -> `disetujui` -> `provisioned`) + "Buat Tenant" link to `/tenants?action=create`. |
| **Domain Management** | `/tenants` modal | Supports `customDomain` & `subdomain` on creation, **but no UI to add/verify/remove `TenantDomain` records or check SSL/DNS propagation post-creation**. |
| **Subscription, Billing & Revenue** | `/subscriptions`, `/saas-billing`, `/revenue`, `/tenant-roi` | Rich metrics and CSV export on `/subscriptions`. **Gaps**: Tables on `/saas-billing`, `/revenue`, `/tenant-roi`, and `/environmental-impact` lack `overflow-x-auto` (broken on mobile); `/tenant-roi` & `/environmental-impact` hardcode `t.slug === "upsheru"` to display real metrics while other tenants show `0` / `"—"`. |
| **Platform Monitoring & Audit Logs** | `/platform-settings`, `/notifikasi-saas`, `/audit-log` | `/platform-settings` feature toggles (`Maintenance Mode`, `Auto-Backup`, `Audit Trail`) are **non-persistent UI mocks** (`useState` only). `/ecosystem-map` lacks a real map (uses region cards). |

---

## 3. Issue Register (O2W HERO)

| ID | Route | Component | Problem | User Impact | Business Impact | Sev | Recommended Solution | Complexity | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|---|---|
| O-01 | `o2whero.com/*` (unauth public routes) | `src/proxy.ts` & `(public)/layout.tsx` | Unauthenticated requests to `/bayar`, `/daftar`, `/tarif`, `/pengaduan`, `/pickup`, `/marketplace`, `/unduh` on `o2whero.com` bypass `isCore` guard and render UPS HERU pages | Visitors on `o2whero.com` see Depok municipal waste billing instead of O2W HERO SaaS | Severe brand confusion; exposes pilot tenant portal on main SaaS domain | **P0** | Block or rewrite tenant-only `(public)` routes on `isCore` host before auth check, and make `PublicLayout` tenant-aware | Medium | `https://o2whero.com/bayar` redirects to `/` or shows O2W portal selector—never UPS HERU |
| O-02 | `/login` on `o2whero.com` | `login/layout.tsx` & `login/page.tsx` | SSR renders `"Masuk Petugas | UPS HERU Depok"` and `"UPS HERU Portal"` before client `useEffect` runs | Superadmins & B2B prospects see UPS HERU branding flash & wrong `<title>` | **P1** | Convert `login/layout.tsx` or `login/page.tsx` metadata/header to read `headers()` via `resolveTenantByHost(host)` on the server | Low | `curl -s https://o2whero.com/login` returns `<title>Masuk Portal | O2W HERO</title>` and `"O2W HERO Platform"` in SSR HTML |
| O-03 | `/dashboard` (Core) | `CoreSaaSDashboard.tsx` & `src/proxy.ts` | `PATCH /api/core/mitra/register` is missing from `API_ROLE_MAP` in `src/proxy.ts` | Superadmin clicking Approve/Reject in `CoreSaaSDashboard` fails silently with `403` | Broken partner onboarding approval workflow | **P1** | Add `"PATCH:/api/core/mitra/register": 100` to `API_ROLE_MAP` and tighten handler check to `superadmin` only | Low | Approving a `MitraRegistration` from `CoreSaaSDashboard` returns `200` and persists status |
| O-04 | `/subscriptions`, `/saas-billing`, `/tenant-roi` | `subscriptions/page.tsx`, `control-tower/route.ts` | Pricing mismatch: Landing sells `Kemitraan All-in-One Rp 2 Jt + 10%` & `Enterprise Rp 4,99 Jt`; Control Tower uses `Pro Rp 1,25 Jt` & `Enterprise Rp 2,99 Jt` | Superadmin billing & ROI math contradict public sales promises | Revenue/invoice inaccuracies and prospect distrust | **P1** | Centralize SaaS tier pricing constants in `src/lib/saas-plans.ts` shared by marketing, billing, and control tower | Low | All pages & APIs display identical tier names, monthly prices, and commission rates |
| O-05 | `/users` | `src/proxy.ts#L54` | `PAGE_ROLES["/users"] = 100` blocks Tenant `admin` (`50`) from accessing `/users` even though `/api/users` allows `50` | Tenant Admins cannot create or deactivate cashiers/staff via UI | Onboarding bottleneck requiring Superadmin intervention for every tenant staff account | **P1** | Lower `PAGE_ROLES["/users"]` to `50` and scope `users/page.tsx` UI for `admin` to their own `tenantId` (no Core tab) | Medium | Tenant `admin` can open `/users` and manage staff exclusively within their `tenantId` |
| O-06 | `/mitra`, `/og-image.png`, `/logo.png` | `O2WHeroCorePortal.tsx`, `src/app/page.tsx` | Live `o2whero.com` returns `404` for `/mitra`, `/og-image.png`, and `/logo.png` | Broken social share previews, invalid JSON-LD logo, dead partner link | Hurts B2B SEO & social link sharing on WhatsApp/LinkedIn | **P2** | Point OG image to `/opengraph-image` (or add static `public/og-image.png` & `logo.png`), deploy `/mitra` with O2W dark theme | Low | `200 OK` on `/mitra` and all OG/JSON-LD image URLs |
| O-07 | `/` (`o2whero.com`) | `O2WHeroCorePortal.tsx` | Desktop nav hidden below `lg` (`hidden lg:flex`) with no mobile hamburger menu | Mobile/tablet visitors (<1024px) cannot jump to `#simulasi`, `#harga`, or `#faq` | Lower mobile B2B conversion | **P2** | Add responsive mobile drawer/menu toggle in `O2WHeroCorePortal` header | Low | Viewports 360px–768px have accessible navigation menu for all landing anchors |
| O-08 | `/saas-billing`, `/revenue`, `/tenant-roi`, `/environmental-impact` | Respective `page.tsx` files | Wide 6-column `<table>` elements rendered without `overflow-x-auto` wrapper | Horizontal page overflow or clipped financial numbers on mobile/tablet | Unusable SaaS BI dashboards on smartphones | **P2** | Wrap tables in `<div className="overflow-x-auto">` and add mobile summary cards | Low | Zero horizontal overflow (`scrollWidth <= clientWidth`) at 360px–768px |
| O-09 | `/platform-settings` | `platform-settings/page.tsx` | Maintenance Mode, Auto-Backup, and Audit Trail toggles only update local React state | Superadmin believes toggles change server state when nothing persists | Operational risk during maintenance windows | **P2** | Either back toggles with `/api/core/platform-settings` DB/config persistence or label clearly as read-only status | Medium | Toggling & reloading page preserves state (or shows real infra status) |
| O-10 | Core `Sidebar` & `ai-command` | `Sidebar.tsx`, `ai-command/page.tsx` | `ai-command` omitted from `CORE_GROUP_MAP`; `Sidebar` hardcodes `"Tenant: UPS HERU"`; `ai-command` hardcodes `"UPSHERU"` in prompts | `ai-command` is unreachable from Core sidebar; Core shell leaks pilot tenant name | Poor multi-tenant SaaS polish | **P2** | Map `ai-command` in `CORE_GROUP_MAP`, replace `"Tenant: UPS HERU"` with dynamic tenant selector/label, parameterize AI prompts | Low | Core sidebar displays AI Hub and dynamic tenant context without hardcoded `"UPS HERU"` |
| O-11 | `/sitemap.xml`, `/robots.txt` | `sitemap.ts`, `robots.ts` | `getSiteUrl()` called without host -> `o2whero.com/sitemap.xml` serves `https://upsheru.com/...` URLs | Search engines crawling `o2whero.com` index `upsheru.com` URLs instead | Severe B2B SaaS SEO degradation | **P1** | Read `headers()` host in `sitemap.ts` and `robots.ts` and emit host-specific URLs (`o2whero.com` vs tenant) | Medium | `curl https://o2whero.com/sitemap.xml` lists `https://o2whero.com/` and `https://o2whero.com/mitra` |
| O-12 | Tenant SaaS Self-Service | `(admin)` tenant scope | Missing tenant self-service pages for subscription plan/billing, quota usage, branding, and feature entitlements (`TenantConfig.fitur`) | Tenants must ask Superadmin to view quota, pay SaaS fee, or change branding | High support overhead; blocks self-serve PLG SaaS growth | **P2** | Add `/langganan` (tenant billing & quota view) and branding section in `/pengaturan`; enforce `fitur` entitlements in `Sidebar` | High | Tenant admin can view plan, usage, and update logo/colors on their own portal |

---

## 4. Category Scores — O2W HERO

> **Rule**: Scores reflect observed code + live HTTP/static checks only. Runtime browser visual/Lighthouse/axe checks are **NOT VERIFIED**.

| Category | Score (0–100) | Verification Status | Evidence Summary |
|---|---|---|---|
| **Visual Design** | **76 / 100** | Partially Verified (code + live HTML; visual render **NOT VERIFIED**) | Cohesive dark `slate-950` + emerald/sky Control Tower aesthetic (`O2WHeroCorePortal` & `CoreSaaSDashboard`), reduced by missing real product screenshots and `404` `/og-image.png` & `/logo.png`. |
| **UX** | **62 / 100** | Verified via Code & API Flow Trace | Clear B2B landing narrative & ROI calculator, offset by `PATCH /api/core/mitra/register` `403` failure, non-persistent `/platform-settings` toggles, missing tenant self-service portal, and `/users` blocked for tenant admins. |
| **Navigation** | **60 / 100** | Verified | Core `Sidebar` & `AdminMobileResponsiveShell` isolate Core vs Tenant menus cleanly, **but** O2W landing lacks mobile navigation below `lg`, `ai-command` is omitted from `CORE_GROUP_MAP`, and `o2whero.com/bayar` leaks UPS HERU navigation. |
| **Responsive Design** | **62 / 100** | Static Code Inspection Only (Live viewport render **NOT VERIFIED**) | Grid cards stack cleanly (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), **but** 4 Core BI tables lack `overflow-x-auto` and landing header hides links under `1024px` without a hamburger menu. |
| **Functionality** | **65 / 100** | Verified | `CoreSaaSDashboard` & `/tenants` CRUD/Fonnte check work against DB, **but** partner approval `PATCH` is blocked by `proxy.ts`, `/platform-settings` toggles are mock state, `/ecosystem-map` lacks a map, and pricing tiers conflict. |
| **Accessibility** | **58 / 100** | Static Audit (`check:classes` + code); screen reader/axe **NOT VERIFIED** | `O2WHeroCorePortal.tsx` has 4 `bg-emerald-500` + white/dark contrast issues flagged by `check:classes`, FAQ `<button>` lacks `aria-expanded`, and form `<label>` lacks `htmlFor` bindings. |
| **Performance** | **NOT VERIFIED (Static Risk Flagged)** | Live `/` TTFB `732ms`; CWV/LCP/Bundle **NOT VERIFIED** | Entire 1,338-line `O2WHeroCorePortal.tsx` is a single `"use client"` bundle; `next.config.ts` disables image optimization. |
| **Design Consistency** | **64 / 100** | Verified | Dark Control Tower theme (`sky`/`emerald` on `slate-950`) is fairly consistent across Core pages, **but** `/login`, `/bayar`, `/mitra`, and `Sidebar` leak light/UPS HERU emerald styles, and `Core` BI headers vary randomly (`sky-950`, `emerald-950`, `indigo-950`, `teal-950`, `rose-950`). |
| **Business Conversion** | **70 / 100** | Verified | Strong Indonesian copy, ROI calculator, before/after comparison, and pilot proof (`upsheru.com`), undermined by `/mitra` `404` live, `sitemap.xml` pointing to `upsheru.com`, and pricing mismatch (`2 Jt` vs `1,25 Jt`). |
| **Maintainability** | **58 / 100** | Verified | `tenants/page.tsx` (1,623 LOC) and `O2WHeroCorePortal.tsx` (1,338 LOC) are monolithic client files; pricing constants are duplicated in 4+ places; `upsheru` slug is hardcoded in BI metrics. |
