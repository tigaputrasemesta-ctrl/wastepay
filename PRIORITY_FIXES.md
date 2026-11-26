# PRIORITY_FIXES.md — Master P0–P4 Remediation Backlog (O2W HERO & UPS HERU)

> **Priority Scale**:
> - **P0**: Security vulnerability, cross-tenant data leakage, or critical platform boundary failure
> - **P1**: Core customer, officer, operator, or SaaS admin user journey broken
> - **P2**: Major UX/UI, responsive overflow, contrast/accessibility, or functional stub problem
> - **P3**: Visual consistency, SEO hygiene, legacy route cleanup, or design-system polish
> - **P4**: Nice-to-have product enhancement
>
> **Verification & Evidence Rule**: Static findings reference observed source lines, `npm run check:classes` (`886` issues), `tsc --noEmit` (`0` errors), `vitest` (`323/323` passed), and live HTTP/HTML `curl` probes. Interactive browser screenshots / Lighthouse / axe-core runtime runs are **`NOT VERIFIED`** (`ECONNREFUSED 127.0.0.1:9222` on Android ARM64 Termux).

---

## Quick Master Priority Index

| Master ID | Source Ref(s) | Severity | Platform Scope | Route(s) | Short Title | Complexity |
|---|---|---|---|---|---|---|
| **PF-01** | `O-01`, `MT-UI-01` | **P0** | O2W HERO / Multi-Tenant | `o2whero.com/bayar`, `/login`, `(public)/*` | Public/Unauthenticated `isCore` Boundary Bypass & UPS HERU Leak | M |
| **PF-02** | `MT-UI-02` | **P0** | Multi-Tenant / Both | `/dashboard`, `/tarif`, `/daftar`, `/`, `/api/publik/tagihan-detail` | Global Prisma Queries Missing `tenantId` Filtering | L |
| **PF-03** | `O-03`, `MT-UI-03` | **P0** | O2W HERO | `/api/core/*`, `/api/pelanggan`, `/api/tagihan` | Proxy `API_ROLE_MAP` Mismatch (`50` vs `100`), Exposed Tenant APIs on `isCore`, & Blocked `PATCH /api/core/mitra/register` (`403`) | S |
| **PF-04** | `U-01` | **P1** | UPS HERU | `/pengaduan`, `/api/publik/pengaduan` | Complaint Form Prompts for WhatsApp Number, API Queries `kodePelanggan` Only | S |
| **PF-05** | `O-02` | **P1** | O2W HERO | `/login` | `/login` SSR Renders `"Masuk Petugas \| UPS HERU Depok"` & `"UPS HERU Portal"` on `o2whero.com` | S |
| **PF-06** | `U-02` | **P1** | UPS HERU | `/lacak`, `/coverage` | Disabled Live Fleet Tracking & Service Coverage (`307 -> /`) | M |
| **PF-07** | `U-03` | **P1** | UPS HERU | `/tarif` vs `/` | Conflicting Household Tariff (`Rp 50.000` vs `Rp 40.000`) | S |
| **PF-08** | `U-04` | **P1** | UPS HERU | `/m/angkut` | Offline Pickup Queue (`offline-queue.ts`) Unwired from Driver Cockpit | M |
| **PF-09** | `U-05` | **P1** | UPS HERU | `/bayar` (`#L1354`) | Dummy WhatsApp Fallback `wa.me/6281234567890` in Payment Error State | S |
| **PF-10** | `O-04` | **P1** | O2W HERO | `/`, `/subscriptions`, `/saas-billing`, `/api/core/control-tower` | SaaS Pricing Tier & Billing Math Mismatch (`Rp 2 Jt + 10%` / `4,99 Jt` vs `1,25 Jt` / `2,99 Jt`) | S |
| **PF-11** | `O-05` | **P1** | O2W HERO | `/users` | `PAGE_ROLES["/users"] = 100` Locks Out Tenant Admins (`admin: 50`) | M |
| **PF-12** | `O-11`, `MT-UI-04` | **P1** | O2W HERO / Multi-Tenant | `/sitemap.xml`, `/robots.txt`, `/logo.png`, `/og-image.png` | `o2whero.com` SEO Serves `upsheru.com` URLs + Live `404` Brand Assets (`/ups_heru_logo.jpg`, `/og-image.png`, `/logo.png`) | S |
| **PF-13** | `MT-UI-05`, `O-10` | **P1** | Multi-Tenant / Both | `Sidebar`, `AdminCommandSearch`, `komplain`, `pelanggan`, `ai-command`, `/m` | Hardcoded `"UPS HERU"`, `"Depok"`, & WhatsApp Group ID Across Shared Shells | M |
| **PF-14** | `O-06` | **P2** | O2W HERO | `/mitra`, `/` | Local `O2WHeroCorePortal` v2 & `/mitra` Undeployed (`404` Live on `o2whero.com/mitra`) | M |
| **PF-15** | `O-07` | **P2** | O2W HERO | `/` (`O2WHeroCorePortal`) | Missing Mobile/Tablet Navigation Menu Below `lg` (`1024px`) | S |
| **PF-16** | `O-08` | **P2** | O2W HERO | `/saas-billing`, `/revenue`, `/tenant-roi`, `/environmental-impact` | Core SaaS BI Tables Lack `overflow-x-auto` & Mobile Card Fallbacks | S |
| **PF-17** | `O-09` | **P2** | O2W HERO | `/platform-settings` | Maintenance/Backup/Audit Feature Flag Toggles Are Ephemeral `useState` Mocks | M |
| **PF-18** | `O-12` | **P2** | O2W HERO | `(admin)` Tenant Scope | Missing Tenant Self-Service Subscription, Quota Usage, Branding UI & Unused `fitur` Entitlements | L |
| **PF-19** | `U-06`, `U-09` | **P2** | UPS HERU | `/unduh`, `/m/report`, `/m/pengaduan` | Duplicate Nested `<header>` Chrome Inside Layout Shells | S |
| **PF-20** | `U-08` | **P2** | UPS HERU | `/bayar` | Missing SSR `<h1>` (`h1=""` Live) & Zero Dark-Mode Variants | M |
| **PF-21** | Design System | **P2** | Both | Codebase-Wide (`src/`) | **886** `npm run check:classes` Failures (473 Tailwind v4 Invalid Classes + 413 WCAG AA Contrast Violations) | L |
| **PF-22** | Responsive | **P2** | Both | `AdminMobileResponsiveShell`, Modals, `NotificationBell` | Mobile `360px` Topbar Crowding + Undersized (`24–36px`) Touch Targets & Non-Escape Inline Modals | M |
| **PF-23** | Maintainability | **P2** | Both | `next.config.ts`, Monolith Pages | `typescript: { ignoreBuildErrors: true }` + `1,000–2,824` LOC Monolith Pages & `globals.css` `!important` Overrides | L |
| **PF-24** | `U-07`, `U-10`, `U-11`, `U-12` | **P3** | UPS HERU | `/pickup`, `/marketplace`, `/daftar`, `/m/*`, `/tarif` | Double `<title>` Suffix, Blocking `alert()`, Hidden Dual-Role `Survei` Tab, `PILOT_TENANT` `/ups_heru_logo.jpg` Path | S |
| **PF-25** | Hygiene | **P3** | Both | `(admin)` Redirects, `/bayar-tagihan`, `/driver/peta`, `/peta` | 7 Legacy Redirect Stubs, Duplicate `/bayar-tagihan`, 3 Map Aliases, Unmapped `/driver/peta` in `PAGE_ROLES`, Random Core BI Gradients | M |
| **PF-26** | Enhancements | **P4** | Both | `/ecosystem-map`, `/bayar`, `/` (`o2whero.com`) | Interactive Map on `/ecosystem-map`, Inline QRIS QR Code Modal in `/bayar`, Real Product Screenshots & Interactive Demo on `o2whero.com` | M–L |

---

## Detailed Fix Specifications (All 10 Mandatory Audit Fields)

### [PF-01] `P0` — Public & Unauthenticated `isCore` Boundary Bypass Leaking UPS HERU on `o2whero.com`
- **Visual / Verification Evidence**: Live `curl https://o2whero.com/bayar` returned HTTP `200` (`44.6KB`, `UPS:true O2W:false`); `curl https://o2whero.com/login` returned HTTP `200` (`title="Masuk Petugas | UPS HERU Depok"`). Static: [src/proxy.ts#L474](file:///data/data/com.termux/files/home/wastepay/src/proxy.ts#L474), [src/proxy.ts#L726-L736](file:///data/data/com.termux/files/home/wastepay/src/proxy.ts#L726-L736), [src/app/(public)/layout.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/layout.tsx). Browser screenshots: **`NOT VERIFIED`**.
- **Route**: `https://o2whero.com/bayar`, `/daftar`, `/tarif`, `/pengaduan`, `/pickup`, `/marketplace`, `/unduh`.
- **Component**: `src/proxy.ts`, `src/app/(public)/layout.tsx`.
- **Problem**: `src/proxy.ts#L474` returns `NextResponse.next()` for `/bayar` before host checks, and `#L726-736` returns `NextResponse.next()` for all unauthenticated non-admin routes before `if (tenantCtx.isCore)` runs at `#L764`. Furthermore `(public)/layout.tsx` hardcodes UPS HERU banner, metadata template, and WhatsApp footer.
- **User Impact**: Enterprise prospects clicking or navigating sub-routes on `o2whero.com` suddenly land on `"UPS HERU Depok"` municipal consumer waste pages.
- **Business Impact**: Severe B2B SaaS credibility loss and confusion between vendor brand (`O2W HERO`) and pilot customer (`UPS HERU`).
- **Severity**: **P0**
- **Recommended Solution**: Move `if (tenantCtx.isCore)` route restriction **before** `/bayar` and unauthenticated `NextResponse.next()` bypasses in `src/proxy.ts`; redirect or return `404` for tenant-only `(public)` paths on `o2whero.com`; make `(public)/layout.tsx` resolve tenant metadata/footer dynamically via host headers.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. `GET https://o2whero.com/bayar`, `/tarif`, `/daftar`, `/pengaduan`, `/pickup`, `/marketplace` return `404` or redirect cleanly to `https://o2whero.com/`.
  2. Unauthenticated public routes on any custom tenant domain render that tenant's name, WA, and logo — zero occurrences of `"UPS HERU Depok"` on Core or other tenants.

---

### [PF-02] `P0` — Global Prisma Queries Missing `tenantId` Isolation
- **Visual / Verification Evidence**: Static inspection of [src/app/(admin)/dashboard/page.tsx#L83-L256](file:///data/data/com.termux/files/home/wastepay/src/app/(admin)/dashboard/page.tsx#L83-L256), [src/app/api/publik/tagihan-detail/route.ts#L66](file:///data/data/com.termux/files/home/wastepay/src/app/api/publik/tagihan-detail/route.ts#L66), [src/app/(public)/tarif/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/tarif/page.tsx), [src/app/(public)/daftar/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/daftar/page.tsx), [src/app/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/page.tsx), and [MULTITENANT_AUDIT.md](file:///data/data/com.termux/files/home/wastepay/MULTITENANT_AUDIT.md). Visual browser state: **`NOT VERIFIED`**.
- **Route**: `/dashboard`, `/tarif`, `/daftar`, `/`, `/peta`, `/api/publik/tagihan-detail`.
- **Component**: Server `getStats()`, `getTagihanByNoInvoice()`, public RSC data loaders.
- **Problem**: Multiple SSR data loaders and `tagihan-detail` lookup query `Tagihan`, `Pelanggan`, `KategoriTarif`, `Paket`, `Artikel`, `Pengumuman` without `where: { tenantId }` scoping (14 Prisma models still lack `tenantId` per `MULTITENANT_AUDIT.md`).
- **User Impact**: Tenant B admins see aggregate numbers across tenants; public users on Tenant B risk seeing Tenant A tariffs, articles, or invoice records.
- **Business Impact**: Cross-tenant privacy breach / SaaS compliance blocker for municipal/enterprise tenants.
- **Severity**: **P0**
- **Recommended Solution**: Parameterize `getStats(tenantId)` using session `tenantId`; resolve `tenantId` from request host in `/`, `/tarif`, `/daftar`, `/artikel`, and `/api/publik/*`; complete the `tenantId` schema/query scoping roadmap in `MULTITENANT_AUDIT.md` (note: do not run DB migrations inside audit phase).
- **Estimated Complexity**: **Large (L)**
- **Acceptance Criteria**:
  1. Integration tests verify Tenant A dashboard KPIs and public `/tarif`/`/daftar` exclude Tenant B rows.
  2. `getTagihanByNoInvoice(invoice, tenantId)` rejects cross-tenant invoice lookups (`404`).

---

### [PF-03] `P0` — Proxy `API_ROLE_MAP` Privilege Mismatch, Leaked Operational APIs on `isCore`, & Blocked Partner Approval (`403`)
- **Visual / Verification Evidence**: Static inspection of [src/proxy.ts#L90-L103](file:///data/data/com.termux/files/home/wastepay/src/proxy.ts#L90-L103), `#L501`, `#L673-690`, `#L708`; [src/components/core/CoreSaaSDashboard.tsx#L61](file:///data/data/com.termux/files/home/wastepay/src/components/core/CoreSaaSDashboard.tsx#L61); [src/app/api/core/control-tower/route.ts#L18](file:///data/data/com.termux/files/home/wastepay/src/app/api/core/control-tower/route.ts#L18). Runtime UI click: **`NOT VERIFIED`**.
- **Route**: `/api/core/mitra/register`, `/api/core/tenants`, `/api/core/control-tower`, `/api/core/crm`, `/api/core/billing`, `/api/pelanggan`, `/api/tagihan`.
- **Component**: `src/proxy.ts` (`API_ROLE_MAP`, `isAllowedCoreApi`), `CoreSaaSDashboard`.
- **Problem**: (1) `PATCH:/api/core/mitra/register` is missing from `API_ROLE_MAP`, so proxy line 708 fails closed with `403` when `CoreSaaSDashboard` approves/rejects partners. (2) `/api/core/tenants`, `/api/core/control-tower`, `/api/core/crm`, and `/api/core/billing` are mapped to role `50` (`admin`) instead of `100` (`superadmin`). (3) `isAllowedCoreApi` on `isCore` allows `/api/pelanggan` and `/api/tagihan`.
- **User Impact**: Superadmins cannot verify/approve partner registrations from the Control Tower dashboard; wrong RBAC tier exists at gateway layer.
- **Business Impact**: Partner onboarding funnel breaks in Super Admin UI and violates least-privilege defense-in-depth.
- **Severity**: **P0**
- **Recommended Solution**: Add `"PATCH:/api/core/mitra/register": 100` to `API_ROLE_MAP`; elevate all `/api/core/*` admin endpoints in `API_ROLE_MAP` from `50` to `100`; remove `/api/pelanggan` and `/api/tagihan` from `isAllowedCoreApi`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. `PATCH /api/core/mitra/register` returns `200` for `superadmin` and `403` for `admin`/`kasir`/`petugas`.
  2. Proxy rejects role `50` on `/api/core/tenants`, `/api/core/control-tower`, `/api/core/crm`, `/api/core/billing` with `403`.
  3. `/api/pelanggan` and `/api/tagihan` on `o2whero.com` return `403` / `404`.

---

### [PF-04] `P1` — Customer Complaint WhatsApp Lookup Failure
- **Visual / Verification Evidence**: Static inspection of [src/components/PengaduanForm.tsx#L94-L101](file:///data/data/com.termux/files/home/wastepay/src/components/PengaduanForm.tsx#L94-L101) & [src/app/api/publik/pengaduan/route.ts#L33,L51-52](file:///data/data/com.termux/files/home/wastepay/src/app/api/publik/pengaduan/route.ts#L33). Live browser form test: **`NOT VERIFIED`**.
- **Route**: `/pengaduan`, `/api/publik/pengaduan`.
- **Component**: `PengaduanForm`, `POST /api/publik/pengaduan`.
- **Problem**: Input field prompts citizens for `"Nomor WhatsApp / Kode Pelanggan"` with placeholder `"Contoh: 081234567890"`, yet `route.ts` reads only `kodePelanggan` (`findFirst({ where: { kodePelanggan, deletedAt: null } })`) and ignores `noTelepon` / `body.noWa` (while also omitting `tenantId`).
- **User Impact**: Nearly every citizen entering their WhatsApp phone number fails validation (`404`) and cannot lodge missed-pickup complaints.
- **Business Impact**: Broken citizen service SLA and manual WhatsApp CS overload.
- **Severity**: **P1**
- **Recommended Solution**: Normalize `08xx`/`628xx` phone variants in `/api/publik/pengaduan`, match `OR: [{ kodePelanggan }, { noTelepon }]` scoped by `tenantId`, and remove hardcoded `, Depok` at `route.ts#L93`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Submitting `081234567890` or `6281234567890` in `PengaduanForm` matches matching `Pelanggan.noTelepon` and creates complaint (`201`).
  2. Complaint lookup is strictly scoped to resolved host `tenantId`.

---

### [PF-05] `P1` — `/login` SSR Renders UPS HERU Title & Header on `o2whero.com`
- **Visual / Verification Evidence**: Live `curl https://o2whero.com/login` returned HTTP `200`, `<title>Masuk Petugas | UPS HERU Depok</title>`, `<h1>UPS HERU Portal</h1>` (`UPS:true O2W:false`). Static: `src/app/login/layout.tsx`, `src/app/login/page.tsx`.
- **Route**: `/login`.
- **Component**: `LoginLayout`, `LoginPage`.
- **Problem**: Metadata is statically set to UPS HERU Depok (`%s | UPS HERU Depok` inherited or set in `login/layout.tsx`) and SSR initial HTML renders `"UPS HERU Portal"` before client `useEffect` switches branding.
- **User Impact**: B2B tenants and O2W HERO Superadmins see UPS HERU branding flash and browser tab titles on `o2whero.com/login`.
- **Business Impact**: Undermines O2W HERO SaaS multi-tenant identity during authentication and login link shares.
- **Severity**: **P1**
- **Recommended Solution**: Convert `login/layout.tsx` `generateMetadata()` and `login/page.tsx` (via server wrapper) to resolve `tenant` from `headers()` on the server before SSR output.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. `curl -s https://o2whero.com/login` contains `"O2W HERO"` branding and zero `"UPS HERU"` strings in initial SSR HTML.
  2. `curl -s https://upsheru.com/login` retains UPS HERU branding.

---

### [PF-06] `P1` — Live Fleet Tracking (`/lacak`) & Coverage (`/coverage`) Hard-Redirect to `/`
- **Visual / Verification Evidence**: Live `curl -I https://upsheru.com/lacak` & `/coverage` returned HTTP `307 -> https://upsheru.com/`. Static: `src/app/(public)/lacak/page.tsx`, `coverage/page.tsx`, `PublicNavbar.tsx`, `sitemap.ts`.
- **Route**: `/lacak`, `/coverage`.
- **Component**: `LacakPage`, `CoveragePage`, `PublicNavbar`.
- **Problem**: Both pages exist with `LacakJemputan` and `CoverageExplorer` UI components, but top-level `redirect("/")` kills both routes while `PublicNavbar` comments them out and `sitemap.ts` still advertises `/lacak`.
- **User Impact**: Citizens expecting live GPS truck ETA / zone coverage checks get silently bounced to `/`.
- **Business Impact**: Erodes credibility of digitalized collection tracking marketing claims and wastes SEO crawl equity.
- **Severity**: **P1**
- **Recommended Solution**: Either restore `/lacak` & `/coverage` behind tenant feature flags (`fitur.jemputSampah`) with clean UI & navbar links, or remove them cleanly from `sitemap.ts` and marketing copy until live ops telemetry is ready.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Visiting `/lacak` and `/coverage` does not unexpectedly bounce to `/` if listed in `sitemap.ts`.
  2. `PublicNavbar` links match active public routes without broken promises.

---

### [PF-07] `P1` — Contradictory Citizen Tariff Display (`Rp 50.000` vs `Rp 40.000`)
- **Visual / Verification Evidence**: Static inspection of [src/app/(public)/tarif/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/tarif/page.tsx) vs [src/app/page.tsx](file:///data/data/com.termux/files/home/wastepay/src/app/page.tsx).
- **Route**: `/tarif`, `/`.
- **Component**: `TarifPage`, `HomePage`.
- **Problem**: `/tarif` hardcodes `level_1` (Rumah Tangga) override to `Rp 50.000`, contradicting the `Paket Langganan` sidebar on the same page and the homepage card stating `Rp 40.000/bulan`. Also lacks `tenantId` filtering on `kategoriTarif` & `paket`.
- **User Impact**: Prospective residents see two conflicting base prices before registering.
- **Business Impact**: Support disputes during registration and billing activation.
- **Severity**: **P1**
- **Recommended Solution**: Remove the hardcoded `50000` override in `tarif/page.tsx` and query `KategoriTarif` + `Paket` strictly scoped by resolved `tenantId`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Base residential tariff displayed on `/` and `/tarif` matches database values for the active tenant.

---

### [PF-08] `P1` — Field Officer Offline Queue Implemented But Disconnected from `/m/angkut`
- **Visual / Verification Evidence**: Static inspection confirming `src/lib/offline-queue.ts` exports `queueOfflinePickup`, `syncOfflineQueueToServer`, `getPendingOfflineActions`, and `removeOfflineAction` with **zero imports/usages** in `src/app/m/angkut/page.tsx`. Mobile offline browser runtime: **`NOT VERIFIED`**.
- **Route**: `/m/angkut`.
- **Component**: `MobileAngkutPage`, `src/lib/offline-queue.ts`, `src/lib/use-offline-sync.ts`.
- **Problem**: Drivers in narrow alleys/cellular dead zones receive connection errors instead of queued offline pickup + GPS/photo persistence.
- **User Impact**: Field officers lose completed pickup logs or must repeatedly retry manually.
- **Business Impact**: Missing collection proof, inaccurate daily tonnage, and false citizen complaints.
- **Severity**: **P1**
- **Recommended Solution**: Import `queueOfflinePickup` & `syncOfflineQueueToServer` into `m/angkut/page.tsx`, queue failed offline network submissions in IndexedDB, show pending sync count badge, and auto-flush on `window` `online` event.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Turning off network in browser DevTools and sliding to confirm pickup stores payload in `wastepay_driver_db` and displays `"Menunggu Sinkronisasi (1)"`.
  2. Restoring network automatically syncs queue and updates pending count to `0`.

---

### [PF-09] `P1` — Dummy WhatsApp Number `6281234567890` in Payment Error UI
- **Visual / Verification Evidence**: Static inspection of [src/app/(public)/bayar/page.tsx#L1354](file:///data/data/com.termux/files/home/wastepay/src/app/(public)/bayar/page.tsx#L1354).
- **Route**: `/bayar`.
- **Component**: `BayarPage` error help Bento Grid card.
- **Problem**: When bill lookup fails or customer needs help, the `"Hubungi CS"` link points to placeholder `wa.me/6281234567890` instead of tenant WhatsApp (`6281400782617` for UPS HERU).
- **User Impact**: Citizens needing urgent billing assistance message a non-existent dummy number.
- **Business Impact**: Lost retribusi collection recovery and citizen frustration.
- **Severity**: **P1**
- **Recommended Solution**: Inject active tenant's `whatsappKontak` into `/bayar` from server/tenant config, replacing `6281234567890`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Search for `6281234567890` returns zero matches across `src/`.
  2. `/bayar` help button links to dynamic tenant WhatsApp URL.

---

### [PF-10] `P1` — Conflicting SaaS Subscription Tier Pricing Across O2W HERO
- **Visual / Verification Evidence**: Static inspection of `O2WHeroCorePortal.tsx` vs `src/app/(admin)/subscriptions/page.tsx`, `saas-billing/page.tsx#L52`, and `src/app/api/core/control-tower/route.ts#L96-L102`.
- **Route**: `/`, `/subscriptions`, `/saas-billing`, `/tenant-roi`, `/api/core/control-tower`.
- **Component**: `O2WHeroCorePortal`, `SubscriptionsPage`, `SaasBillingPage`, `control-tower` API.
- **Problem**: Marketing sells `Starter 349rb`, `Kemitraan All-in-One Rp 2 Jt + 10%`, and `Enterprise Rp 4,99 Jt`; Control Tower & billing pages calculate `starter: 349000`, `pro: 1250000`, `enterprise: 2990000`. Meanwhile `#simulasi` ROI slider applies Rp 2 Jt + 10% even at `500 KK`.
- **User Impact**: Prospects and billing invoices reflect contradictory pricing and tier names.
- **Business Impact**: Contract/invoicing discrepancies and sales trust erosion.
- **Severity**: **P1**
- **Recommended Solution**: Extract canonical pricing definitions into `src/lib/saas-plans.ts` imported by marketing, ROI calculator, billing, and APIs.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Single plan config file drives `O2WHeroCorePortal.tsx`, `/subscriptions`, `/saas-billing`, and `/api/core/control-tower`.

---

### [PF-11] `P1` — Tenant Admins Blocked From User Management (`/users`)
- **Visual / Verification Evidence**: Static inspection of `src/proxy.ts#L54` (`PAGE_ROLES["/users"] = 100`) vs `API_ROLE_MAP` allowing level `50` on `/api/users` and `src/app/(admin)/users/page.tsx`.
- **Route**: `/users`.
- **Component**: `src/proxy.ts`, `UsersPage`.
- **Problem**: `PAGE_ROLES["/users"]` requires `100` (`superadmin`), locking out tenant `admin` (`50`) from creating cashiers (`kasir`) or field officers (`petugas`) in UI.
- **User Impact**: Tenants cannot manage their own staff accounts and must submit support tickets to Superadmin.
- **Business Impact**: Support bottleneck preventing autonomous tenant scaling.
- **Severity**: **P1**
- **Recommended Solution**: Update `PAGE_ROLES["/users"]` to `50`, and conditionally scope `UsersPage` UI when `session.role !== "superadmin"` to the active `session.tenantId` without exposing cross-tenant selectors or `superadmin` role options.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Tenant `admin` (`50`) can open `/users` and create/edit `admin`/`kasir`/`petugas` users strictly within their `tenantId`.
  2. Tenant `admin` cannot view users of other tenants or assign `superadmin`.

---

### [PF-12] `P1` — `o2whero.com` SEO Outputs `upsheru.com` URLs & Missing Logo/OG Assets (`404`)
- **Visual / Verification Evidence**: Live `curl https://o2whero.com/sitemap.xml` & `robots.txt` output `https://upsheru.com/...`; live HTTP `404` on `o2whero.com/logo.png`, `o2whero.com/og-image.png`, `upsheru.com/ups_heru_logo.jpg`. Static: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/tenant/config.ts#L49,87`, `src/app/layout.tsx`.
- **Route**: `/sitemap.xml`, `/robots.txt`, `/og-image.png`, `/logo.png`, global `<head>`.
- **Component**: `sitemap.ts`, `robots.ts`, `tenant/config.ts`, `RootLayout`, `O2WHeroCorePortal`.
- **Problem**: `sitemap.ts`/`robots.ts` ignore incoming host and hardcode `upsheru.com`; root `layout.tsx` sets `apple: "/ups-heru-logo.jpg"`; `CORE_TENANT` & `PILOT_TENANT` point to missing image files (`/images/o2w-logo.png`, `/ups_heru_logo.jpg`).
- **User Impact**: Broken header logos in dynamic tenant shells, missing social cards on WhatsApp/LinkedIn, wrong canonical URLs indexed by Google.
- **Business Impact**: SEO cannibalization and broken B2B social distribution.
- **Severity**: **P1**
- **Recommended Solution**: Compute dynamic `baseUrl` via `headers()` in `sitemap.ts`/`robots.ts`, fix `PILOT_TENANT.branding.logoUrl` to `"/ups-heru-logo.jpg"`, add real `/images/o2w-logo.png` & `/og-image.png` (or route OG tags to `/opengraph-image`), and derive `apple` icon dynamically per host.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. `o2whero.com/sitemap.xml` and `robots.txt` reference `https://o2whero.com/...` only.
  2. All logo/OG URLs referenced in config & JSON-LD return `200 OK`.

---

### [PF-13] `P1` — Hardcoded UPS HERU Branding, Depok City & WA Group ID in Shared Admin & Mobile Shells
- **Visual / Verification Evidence**: Static inspection of `Sidebar.tsx#L394`, `AdminCommandSearch.tsx#L723`, `ai-command/page.tsx#L100,114`, `pelanggan/page.tsx#L147`, `komplain/page.tsx#L49-50`, `pengaturan/page.tsx`, `laporan/page.tsx`, `absensi/page.tsx`, `m/page.tsx#L209`, `m/report/page.tsx#L128`.
- **Route**: All `(admin)/*` and `/m/*` routes.
- **Component**: `Sidebar`, `AdminCommandSearch`, `PelangganPage`, `KomplainPage`, `AICommandPage`, `PengaturanPage`, `MobileHomePage`.
- **Problem**: Shared multi-tenant operational components hardcode `"Tenant: UPS HERU"`, `"UPS HERU Quick Command"`, `"UPS HERU DEPOK"`, `"B2B SDR Agent UPSHERU"`, `"UPS HERU Kota Depok"`, `KECAMATAN_DEPOK`, and `GRUP_PENGADUAN_ID = "120363430666363149@g.us"`.
- **User Impact**: Non-UPS-HERU tenants see UPS HERU branding and risk routing WhatsApp complaint alerts to UPS HERU's internal operations group!
- **Business Impact**: Blocks clean multi-tenant commercial rollout.
- **Severity**: **P1**
- **Recommended Solution**: Provide active `TenantBrandingContext` from `(admin)/layout.tsx` and `m/layout.tsx`, and read `settings.whatsappGroupId` / `tenant.city` / `tenant.name` everywhere instead of literals.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Zero literal `"UPS HERU"` or `"120363430666363149@g.us"` occurrences in `src/components/` and shared `(admin)`/`/m` UI files.

---

### [PF-14] `P2` — Deploy Synchronized O2W HERO Portal v2 & `/mitra` Route (Resolve Live `404`)
- **Visual / Verification Evidence**: Live `curl https://o2whero.com/` serves older copy (`49.6KB`), and `https://o2whero.com/mitra` returns HTTP `404` while uncommitted local `src/app/(public)/mitra/page.tsx` exists and wraps registration in light-mode UPS HERU `(public)/layout.tsx`.
- **Route**: `/`, `/mitra`.
- **Component**: `O2WHeroCorePortal.tsx`, `mitra/page.tsx`, `(public)/layout.tsx`.
- **Problem**: Local uncommitted `/mitra` and updated `O2WHeroCorePortal.tsx` are out of sync with live `o2whero.com`; additionally, local `mitra/page.tsx` inherits UPS HERU's light `(public)/layout.tsx`!
- **User Impact**: Links to `/mitra` fail `404` live; local `/mitra` mixes UPS HERU chrome with O2W HERO B2B signup.
- **Business Impact**: Broken B2B acquisition links and visual identity mismatch.
- **Severity**: **P2**
- **Recommended Solution**: Give `/mitra` O2W HERO layout styling (outside UPS HERU chrome or once `PublicLayout` is tenant-themed) and review/release uncommitted landing fixes through standard review workflow.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. `https://o2whero.com/mitra` returns `200 OK` with O2W HERO dark/enterprise layout (`UPS:false`).

---

### [PF-15] `P2` — Missing Mobile/Tablet Navigation Menu on `O2WHeroCorePortal`
- **Visual / Verification Evidence**: Static inspection of [src/components/core/O2WHeroCorePortal.tsx#L225-L286](file:///data/data/com.termux/files/home/wastepay/src/components/core/O2WHeroCorePortal.tsx#L225-L286). Live mobile pixel behavior: **`NOT VERIFIED`**.
- **Route**: `/` on `o2whero.com`.
- **Component**: `O2WHeroCorePortal`.
- **Problem**: Navigation anchor links (`#solusi`, `#simulasi`, `#perbandingan`, `#contoh-nyata`, `#harga`, `#faq`) use `hidden lg:flex` with no hamburger toggle for `<1024px` (`360px`–`768px` tablet).
- **User Impact**: Mobile and tablet decision-makers cannot jump directly to Pricing, ROI Calculator, or FAQ from the sticky bar.
- **Business Impact**: Reduced mobile B2B landing engagement and conversion.
- **Severity**: **P2**
- **Recommended Solution**: Add an accessible hamburger menu button (`md:hidden` / `lg:hidden`) toggling a dark mobile sheet/drawer with `min-h-[44px]` link rows.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Viewports `360px`, `390px`, `430px`, and `768px` display a working mobile nav trigger exposing all 6 anchor sections + CTA buttons.

---

### [PF-16] `P2` — Core SaaS BI Tables Lack Horizontal Scroll Wrappers & Mobile Views
- **Visual / Verification Evidence**: Static inspection of `saas-billing/page.tsx`, `revenue/page.tsx`, `tenant-roi/page.tsx`, and `environmental-impact/page.tsx`. Mobile viewport overflow test: **`NOT VERIFIED`**.
- **Route**: `/saas-billing`, `/revenue`, `/tenant-roi`, `/environmental-impact`.
- **Component**: Inline tables in Core BI pages.
- **Problem**: Multi-column `<table>` elements sit directly inside `overflow-hidden` cards without `overflow-x-auto` or `md:hidden` mobile summary cards.
- **User Impact**: Financial & ESG columns get clipped on `<768px` phones/tablets.
- **Business Impact**: Superadmins cannot inspect billing or revenue tables on mobile.
- **Severity**: **P2**
- **Recommended Solution**: Extract shared `DataTable` component wrapping `<table>` in `overflow-x-auto` and optionally rendering mobile summary cards below `md:`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. All 4 Core BI pages show zero clipped columns and zero body horizontal overflow at `360px`, `390px`, `430px`, `768px`.

---

### [PF-17] `P2` — Non-Persistent Feature Toggles on `/platform-settings`
- **Visual / Verification Evidence**: Static inspection of `src/app/(admin)/platform-settings/page.tsx`.
- **Route**: `/platform-settings`.
- **Component**: `PlatformSettingsPage`.
- **Problem**: Toggles (`maintenanceMode`, `autoBackupEnabled`, `debugLogEnabled`) mutate ephemeral React `useState` without persisting to any API/DB record.
- **User Impact**: Superadmin expects maintenance mode or audit logging toggles to persist across reloads, when nothing actually changed on the server.
- **Business Impact**: Operational safety hazard during platform incidents.
- **Severity**: **P2**
- **Recommended Solution**: Either implement `/api/core/platform-settings` DB persistence or replace fake toggles with honest read-only infrastructure telemetry cards.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Settings persist across full browser refresh (or read-only telemetry clearly forbids interactive toggle illusion).

---

### [PF-18] `P2` — Missing Tenant Self-Service Subscription/Branding Portal & Unused `fitur` Entitlements
- **Visual / Verification Evidence**: Static inspection of `src/lib/tenant/types.ts` (`TenantConfig.fitur`), `Sidebar.tsx`, `AdminMobileResponsiveShell.tsx`, `pengaturan/page.tsx`.
- **Route**: `(admin)` tenant portal, `/pengaturan`, proposed `/langganan`.
- **Component**: `Sidebar`, `PengaturanPage`.
- **Problem**: Tenants have no self-service UI to view/upgrade plan tier, pay monthly SaaS invoices, monitor KK/WA quota, or edit branding (`namaMitra`, `logoUrl`, `warnaTema`) and payout bank info. Furthermore, `TenantConfig.fitur` entitlement flags are completely ignored by `Sidebar`.
- **User Impact**: Every plan check, branding tweak, or module restriction requires manual Superadmin work.
- **Business Impact**: High SaaS support cost; inability to enforce tier differentiation (`Starter` vs `Kemitraan` vs `Enterprise`).
- **Severity**: **P2**
- **Recommended Solution**: Gate `Sidebar` & route access by `tenant.fitur`, add tenant branding + payout fields in `/pengaturan`, and create tenant-facing `/langganan` SaaS billing & usage dashboard.
- **Estimated Complexity**: **Large (L)**
- **Acceptance Criteria**:
  1. Disabling `fitur.tabunganSampah` or `fitur.jualOfftaker` removes gated links from tenant `Sidebar`.
  2. Tenant admin can inspect plan usage and download SaaS invoices without Superadmin escalation.

---

### [PF-19] `P2` — Duplicate `<header>` Elements on `/unduh`, `/m/report`, & `/m/pengaduan`
- **Visual / Verification Evidence**: Live `curl https://upsheru.com/unduh` returned `headers:2` in HTML. Static: `unduh/page.tsx`, `m/report/page.tsx`, `m/pengaduan/page.tsx`.
- **Route**: `/unduh`, `/m/report`, `/m/pengaduan`.
- **Component**: `UnduhPage`, `MobileReportPage`, `MobilePengaduanPage`.
- **Problem**: Pages render redundant full-width `<header>` / sticky chrome inside parent layouts (`PublicLayout` and `MobileLayout`) that already provide persistent top headers and padding.
- **User Impact**: Double stacked headers eat limited vertical space on `360px` Android screens and confuse landmarks for screen readers.
- **Business Impact**: Degraded driver mobile ergonomics and landmark accessibility failures.
- **Severity**: **P2**
- **Recommended Solution**: Remove inner `<header>` and `min-h-screen` wrappers from these 3 leaf pages, using a compact sub-header title block matching `/m/absen`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Live `/unduh`, `/m/report`, and `/m/pengaduan` render exactly **1** top `<header>` bar.

---

### [PF-20] `P2` — `/bayar` Missing SSR `<h1>` & Public Pages Lack Dark-Mode Parity
- **Visual / Verification Evidence**: Live `curl https://upsheru.com/bayar` returned `h1=""` (blocked by `Suspense` fallback). Static: `bayar/page.tsx`, `src/app/page.tsx`, `CivicHeroWidget.tsx`, `artikel/page.tsx`.
- **Route**: `/bayar`, `/`, `/artikel`.
- **Component**: `BayarPage`, `HomePage`, `CivicHeroWidget`, `ArtikelPage`.
- **Problem**: `PublicNavbar` exposes a prominent `ThemeToggle`, yet half of UPS HERU public sections (`#problem`, `#solusi`, `#tarif`, `#wilayah`, `#alur`, `#faq`, `CivicHeroWidget`, `/bayar`, `/artikel`) lack `dark:` variants, and `/bayar` hides its `<h1>` inside a client `<Suspense>` boundary.
- **User Impact**: Toggling dark mode breaks contrast across public sections; screen readers & SEO crawlers miss `<h1>` on `/bayar`.
- **Business Impact**: Broken visual polish in dark mode and weakened SEO structure on core payment page.
- **Severity**: **P2**
- **Recommended Solution**: Lift `<h1>` hero header on `/bayar` outside `<Suspense>` into static/SSR markup and systematically add `dark:` surface/text tokens across all `(public)` components (or scope `ThemeToggle` consistently).
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. SSR HTML of `/bayar` contains semantic `<h1>`.
  2. Toggling dark mode across `/`, `/bayar`, `/tarif`, `/artikel` exhibits zero bright-white block clashes.

---

### [PF-21] `P2` — 886 `check:classes` Violations (473 Tailwind v4 Invalid Classes + 413 WCAG Contrast Failures)
- **Visual / Verification Evidence**: Observed `npm run check:classes` output: **886 issues** (`shadow-xs`: 414, `shadow-2xs`: 31, `backdrop-blur-xs`: 24, `outline-hidden`: 4, `bg-emerald-500/600` + `text-white`: 135, `text-emerald-600`: 223, `text-amber-600`: 55). Affected files include `ui/button.tsx`, `globals.css`, `CivicHeroWidget.tsx`, `AdminCommandSearch.tsx`, `CoreSaaSDashboard.tsx`, `tenants/page.tsx`, `bayar/page.tsx`, `O2WHeroCorePortal.tsx`.
- **Route**: Global (`src/`).
- **Component**: Design tokens, `ui/button.tsx`, `.btn-*`, `.thumb-button-*`, page components.
- **Problem**: Tailwind v4 class names (`shadow-xs`, `shadow-2xs`, `backdrop-blur-xs`, `outline-hidden`) are silently dropped by Tailwind `3.4.19`, removing depth/focus rings, while 413 emerald/amber pairings fall below WCAG 4.5:1 AA contrast.
- **User Impact**: Low-contrast buttons/status text hurt outdoor sunlight readability on Android phones; inputs/buttons lose subtle borders/shadows and focus visibility.
- **Business Impact**: Accessibility non-compliance and degraded outdoor usability for field drivers and elderly residents.
- **Severity**: **P2**
- **Recommended Solution**: Replace `shadow-xs`/`2xs` -> `shadow-sm`, `backdrop-blur-xs` -> `backdrop-blur-sm`, `outline-hidden` -> `outline-none focus-visible:ring-2`; shift `bg-emerald-500/600` + `text-white` to `bg-emerald-700` (5.48:1) and `text-emerald-600`/`text-amber-600` to `-700`/`-800` variants (or dark ink on bright surfaces).
- **Estimated Complexity**: **Large (L)**
- **Acceptance Criteria**:
  1. `npm run check:classes` passes with **0** warnings/errors.
  2. `ui/button.tsx` passes contrast and valid Tailwind v3 class checks.

---

### [PF-22] `P2` — `360px` Admin Topbar Crowding, Undersized Touch Targets & Non-Escape Inline Modals
- **Visual / Verification Evidence**: Static inspection of [AdminMobileResponsiveShell.tsx#L293-L348](file:///data/data/com.termux/files/home/wastepay/src/components/admin/AdminMobileResponsiveShell.tsx#L293-L348), `PublicNavbar.tsx`, `NotificationBell.tsx#L133`, `m/layout.tsx`, and inline `fixed inset-0` modals in `bayar`, `tenants`, `saas-billing`, `pelanggan`, `tagihan`. Runtime touch hit-area check: **`NOT VERIFIED`**.
- **Route**: All `(admin)/*`, `/m/*`, `/bayar`, `/marketplace`.
- **Component**: `AdminMobileResponsiveShell`, `PublicNavbar`, `NotificationBell`, inline modals.
- **Problem**: (1) Admin mobile topbar packs 7 horizontal elements (incl. `w-36` search & `hh:mm:ss` clock) at `360px`. (2) Menu buttons (`h-9 w-9` `36px`), `ThemeToggle` (`36px`), modal `"✕"` buttons (`~24–28px`), and `/m` `"Keluar"` fail `44x44px` touch guidelines. (3) Inline modals skip `Escape` dismissal, `aria-modal`, and focus trapping; `O2WHeroCorePortal`, `mitra/page.tsx`, `m/survei` miss `<label htmlFor>`.
- **User Impact**: Mis-taps on Android screens, clipped header text at `360px`, and keyboard/screen-reader modal traps.
- **Business Impact**: Slower operator workflows and accessibility defects.
- **Severity**: **P2**
- **Recommended Solution**: Compact admin mobile topbar (move sync status & seconds clock out of top bar under `sm:`), upgrade interactive icon buttons to `min-h-[44px] min-w-[44px]`, and consolidate all inline modals onto `ui/dialog.tsx`.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Every interactive button/link meets `>= 44x44px` hit target on `<768px`.
  2. All modals support `Escape` close, `aria-modal="true"`, and focus restoration.
  3. Zero horizontal crowding on `360px` admin topbar verified via Playwright screenshot.

---

### [PF-23] `P2` — Build Type Safety Bypass (`ignoreBuildErrors: true`), Monolith Pages, & CSS `!important` Engine
- **Visual / Verification Evidence**: Static inspection of [next.config.ts](file:///data/data/com.termux/files/home/wastepay/next.config.ts), [src/app/globals.css#L330-L631](file:///data/data/com.termux/files/home/wastepay/src/app/globals.css#L330-L631), `tagihan/page.tsx` (2,824 LOC), `pelanggan/page.tsx` (2,430 LOC), `rute/page.tsx` (2,234 LOC), `pengaturan/page.tsx` (1,876 LOC), `bayar/page.tsx` (1,673 LOC), `tenants/page.tsx` (1,623 LOC), `O2WHeroCorePortal.tsx` (1,338 LOC). Observed `tsc --noEmit` currently passes (`0` errors).
- **Route**: Repo-wide.
- **Component**: `next.config.ts`, `globals.css`, monolithic pages.
- **Problem**: `ignoreBuildErrors: true` allows type regressions to deploy silently; massive 1,300–2,800 line `"use client"` files inflate client bundles and duplicate modals/tables; `globals.css` `!important` brute-force dark overrides fight component styles.
- **User Impact**: Larger JS bundles on low-end Android devices and fragile regressions when modifying UI.
- **Business Impact**: High engineering velocity drag and onboarding difficulty.
- **Severity**: **P2**
- **Recommended Solution**: Turn off `ignoreBuildErrors: true` (since `tsc` already passes `0` errors today!), incrementally split monolith pages into feature subcomponents + server shells, and retire `!important` dark-mode rules once `src/components/ui/` primitives replace legacy markup.
- **Estimated Complexity**: **Large (L)**
- **Acceptance Criteria**:
  1. `next.config.ts` removes `ignoreBuildErrors: true` and `next build` passes strict TypeScript checks.
  2. No feature page exceeds ~400–500 LOC after modular extraction.

---

### [PF-24] `P3` — UPS HERU UX & Polish Fixes (`<title>` Duplication, `alert()`, Mobile Dual-Role `Survei`, Logo Path)
- **Visual / Verification Evidence**: Live `curl` titles (`"Portal Layanan Warga | UPS HERU Depok | UPS HERU Depok"` on `/pickup` & `/marketplace`; `"Daftar Jasa Angkut Sampah Depok - UPS HERU | UPS HERU Depok"` on `/daftar`), `404` on `/ups_heru_logo.jpg`. Static: `marketplace/page.tsx#L111`, `m/layout.tsx#L79`, `src/lib/tenant/config.ts#L87`.
- **Route**: `/pickup`, `/marketplace`, `/daftar`, `/m/*`, `PILOT_TENANT` config.
- **Component**: `PublicLayout`, page `metadata`, `MarketplacePage`, `m/layout.tsx`, `tenant/config.ts`.
- **Problem**: Duplicate brand suffix in `<title>`; blocking `window.alert()` on stock limit; dual-role `isAngkut && isSurvei` officers cannot see `Survei` bottom nav tab; `PILOT_TENANT.branding.logoUrl` points to 404 `/ups_heru_logo.jpg`.
- **User Impact**: Messy browser tabs, jarring Android native alerts, hidden survey workflow for dual-role officers, broken fallback logo URL.
- **Business Impact**: Unpolished citizen & field staff UX.
- **Severity**: **P3**
- **Recommended Solution**: Clean title strings so template adds brand once; swap `alert()` for `useToast()`; add secondary mobile menu sheet or show `Survei` tab whenever `isSurvei`; fix `PILOT_TENANT.branding.logoUrl` to `"/ups-heru-logo.jpg"`.
- **Estimated Complexity**: **Small (S)**
- **Acceptance Criteria**:
  1. Zero duplicate brand names in `<title>` across all `(public)` pages.
  2. Zero `alert()` calls in `/marketplace`.
  3. Dual-role users reach `/m/survei` within 2 taps.

---

### [PF-25] `P3` — Route Hygiene, Legacy Redirect Cleanup, Unmapped `/driver/peta` & Header Palette Harmonization
- **Visual / Verification Evidence**: Static inspection of `src/proxy.ts` (`PAGE_ROLES` omits `/driver/peta`), `Sidebar.tsx` (`sticker` -> `/pelanggan-cetak`), `(admin)` redirect stubs (`/jadwal`, `/pengumuman`, `/sticker`, `/survei`, `/tpa`, `/transit`), orphaned `/manajemen-produk`, duplicate `/bayar-tagihan`, 3 map aliases, and 5 mismatched Core BI header hues (`sky-950`, `emerald-950`, `indigo-950`, `teal-950`, `rose-950`).
- **Route**: `/driver/peta`, `/bayar-tagihan`, `/manajemen-produk`, 6 `(admin)` redirect stubs, 3 map aliases, Core BI headers.
- **Component**: `src/proxy.ts`, `Sidebar.tsx`, Core BI pages.
- **Problem**: Dead redirect stubs clutter sidebar/repo; `/driver/peta` is missing from `PAGE_ROLES` in `src/proxy.ts`; `/bayar-tagihan` duplicates `/bayar`; Core BI pages lack cohesive palette consistency; emojis used inside UI buttons instead of `lucide-react`.
- **User Impact**: Confusing deep links and uneven enterprise visual polish.
- **Business Impact**: Higher maintenance cost and weaker design coherence.
- **Severity**: **P3**
- **Recommended Solution**: Map `/driver/peta` in `PAGE_ROLES` (`10`), replace `Sidebar` links to stubs with direct `?tab=` URLs + HTTP redirects in `next.config.ts`, unify Core BI headers to `slate-950` + `sky`/`emerald` tokens, and swap button emojis for `lucide-react` icons.
- **Estimated Complexity**: **Medium (M)**
- **Acceptance Criteria**:
  1. Zero unmapped operational routes in `PAGE_ROLES`.
  2. Redirect stubs consolidated cleanly in `next.config.ts`.

---

### [PF-26] `P4` — High-Value Product Enhancements (Inline QRIS Modal, Interactive Ecosystem Map, O2W Sandbox/Screenshots)
- **Visual / Verification Evidence**: Static inspection of `/bayar/page.tsx` (`window.location.href = data.paymentUrl`), `ecosystem-map/page.tsx` (flat cards without map), `O2WHeroCorePortal.tsx` (CSS mock cards without real screenshots).
- **Route**: `/bayar`, `/ecosystem-map`, `/` (`o2whero.com`).
- **Component**: `BayarPage`, `EcosystemMapPage`, `O2WHeroCorePortal`.
- **Problem**: QRIS redirects off-site to Duitku; `/ecosystem-map` renders text cards despite its name; `O2WHeroCorePortal` lacks authentic product screenshots or interactive walkthroughs.
- **User Impact**: Higher payment drop-off on external redirect; weaker spatial telemetry in Control Tower; less tangible SaaS product proof for enterprise buyers.
- **Business Impact**: Missed checkout conversion & B2B demo conversion upside.
- **Severity**: **P4**
- **Recommended Solution**: Render Duitku QRIS QR string directly inside an accessible modal on `/bayar` with countdown + instant status polling; add Indonesia Leaflet/SVG choropleth map on `/ecosystem-map`; embed crisp high-DPI product screenshots of Control Tower & Driver Cockpit on `o2whero.com`.
- **Estimated Complexity**: **Medium–Large (M–L)**
- **Acceptance Criteria**:
  1. Citizens can scan QRIS without leaving `upsheru.com/bayar`.
  2. `/ecosystem-map` plots active tenants visually across provinces.
