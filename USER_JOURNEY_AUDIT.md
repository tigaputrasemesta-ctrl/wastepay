# USER JOURNEY AUDIT — UPS HERU & O2W HERO

> **Audit Basis**: Static inspection of Next.js App Router pages, client components, `src/proxy.ts`, API route handlers, and live `curl` HTTP/HTML probes on `https://upsheru.com` and `https://o2whero.com`.
> **Runtime Verification Boundary**: End-to-end interactive browser execution (Playwright / Chrome DevTools UI clicks, form submissions, QRIS modal rendering, GPS triggers) is **`NOT VERIFIED`** in this environment (`ECONNREFUSED 127.0.0.1:9222` on Android ARM64 Termux). Success/failure states below reflect verified source code paths and live HTTP/HTML responses.

---

## Summary Matrix

| Journey ID | Platform | Journey | Verified Flow Status | Critical Bottlenecks / Missing Transitions |
|---|---|---|---|---|
| **UJ-U1** | UPS HERU | Customer checks bill | **Functional (Fragile Privacy/Tenant Scoping)** | Unscoped `getTagihanByNoInvoice(invoice)` (`tagihan-detail/route.ts#L66`); reachable on `o2whero.com/bayar` (`src/proxy.ts#L474`) |
| **UJ-U2** | UPS HERU | Customer pays (QRIS / VA) | **Partially Verified (Code Present)** | `bayar/page.tsx#L1354` contains dummy WhatsApp fallback `wa.me/6281234567890` |
| **UJ-U3** | UPS HERU | Payment confirmation | **Partially Verified (Fragile)** | Relies on `/bayar` flow & Duitku callback/polling; full end-to-end gateway webhook settlement **`NOT VERIFIED`** |
| **UJ-U4** | UPS HERU | Customer submits complaint | **BROKEN (`P0`)** | UI asks for `"Nomor WhatsApp / Kode Pelanggan"` (`"Contoh: 081234567890"`), backend queries `kodePelanggan` only & ignores `noTelepon` / `body.noWa` |
| **UJ-U5** | UPS HERU | Customer tracks truck | **BROKEN ON LIVE / NAVIGATION (`P1`)** | Public nav comments out `/lacak` (`PublicNavbar.tsx`); live `https://upsheru.com/lacak` returns `307 -> https://upsheru.com/` |
| **UJ-U6** | UPS HERU | Admin processes complaint | **Functional w/ Hardcoded Leak (`P1`)** | `komplain/page.tsx#L49-50` hardcodes `GRUP_PENGADUAN_ID = "120363430666363149@g.us"` and `"UPS HERU"` branding |
| **UJ-U7** | UPS HERU | Officer completes pickup | **Offline Broken (`P1`)** | `offline-queue.ts` exports queue helpers, zero usages in `m/angkut/page.tsx`; offline photo/GPS pickups do not persist via queue |
| **UJ-O1** | O2W HERO | Visitor explores product | **Partially Verified (Mobile Nav Gap)** | `O2WHeroCorePortal.tsx` desktop nav uses `hidden lg:flex` with no mobile hamburger menu; broken `/logo.png` & `/og-image.png` (`404`) |
| **UJ-O2** | O2W HERO | Visitor requests demo | **Partial / Split CTA** | `#daftar` on `O2WHeroCorePortal.tsx` handles registration; `/mitra` returns `404` on live `https://o2whero.com/mitra` (exists uncommitted locally) |
| **UJ-O3** | O2W HERO | Partner registers | **Functional (`POST`) / Broken Live `/mitra`** | `POST /api/core/mitra/register` whitelisted at `src/proxy.ts#L501`; standalone `https://o2whero.com/mitra` returns `404` live |
| **UJ-O4** | O2W HERO | Admin verifies partner | **BROKEN (`P0`)** | `CoreSaaSDashboard.tsx#L61` calls `PATCH /api/core/mitra/register`, but `PATCH:/api/core/mitra/register` is missing from `API_ROLE_MAP` -> `403` |
| **UJ-O5** | O2W HERO | Tenant gets provisioned | **Blocked by UJ-O4 (`P0`) / Split Paths** | Partner verification approval (`PATCH /api/core/mitra/register`) fails `403`; separate provisioning exists in `(admin)/tenants/page.tsx` |
| **UJ-O6** | O2W HERO | Tenant configures organization | **Fragile / Branding Leaks (`P1`)** | `(admin)/pengaturan/page.tsx` + multi-tenant leaks (`Sidebar.tsx#L394`, `(public)/layout.tsx`, `tarif/page.tsx` unscoped) |
| **UJ-O7** | O2W HERO | Tenant activates subscription | **Pricing & Entitlement Conflict (`P1`)** | Landing sells Starter `349rb`, Kemitraan `2 Jt + 10%`, Enterprise `4,99 Jt`; backend/billing uses `349k / 1.25M / 2.99M` |
| **UJ-O8** | O2W HERO | Tenant accesses dashboard | **Unscoped Aggregate Data (`P0`)** | `dashboard/page.tsx#L83-256` `getStats()` queries Prisma without `tenantId`; non-`superadmin` blocked from `o2whero.com` (`core_restricted`) |

---

## PART A — UPS HERU USER JOURNEYS

### UJ-U1: Customer Checks Bill
* **Entry Point**:
  1. `https://upsheru.com/` -> `CivicHeroWidget` quick bill search (`src/components/CivicHeroWidget.tsx`)
  2. Direct link/navbar -> `/bayar` (`src/app/(public)/bayar/page.tsx`) or `/bayar-tagihan` (`src/app/bayar-tagihan/page.tsx`)
  3. **Leakage Entry**: `https://o2whero.com/bayar` returns HTTP `200` (`UPS:true O2W:false`) via `src/proxy.ts#L474`.
* **Screens**:
  * Screen 1: Public landing (`src/app/page.tsx`) or `/bayar` (`src/app/(public)/bayar/page.tsx`).
  * Screen 2: Inline/detail bill summary inside `/bayar` (and `h1=""` observed on live `https://upsheru.com/bayar` and `https://o2whero.com/bayar`).
* **User Action**: Enters customer code or WhatsApp/phone query and submits bill lookup.
* **API Dependencies**:
  * `src/app/api/publik/tagihan/route.ts`
  * `src/app/api/publik/tagihan-detail/route.ts`
* **Success State (Verified in Code)**:
  * Returns bill summary/invoice details rendered in `/bayar` UI for payment selection.
* **Failure State (Verified in Code)**:
  * Shows empty/not-found feedback when lookup yields no matching invoice; live browser error states **`NOT VERIFIED`**.
  * **Security/Isolation Defect**: `getTagihanByNoInvoice(invoice)` in `src/app/api/publik/tagihan-detail/route.ts#L66` omits `tenantId` scoping (consistent with `Tagihan` lacking `tenantId` in `MULTITENANT_AUDIT.md`), and `src/proxy.ts#L474` explicitly bypasses host/core boundary checks for `/bayar`.
* **Missing Transitions**:
  * Missing clean host guard preventing SaaS apex domain `o2whero.com/bayar` from serving UPS HERU consumer billing.
  * Missing semantic `<h1>` on `/bayar` (`h1=""` observed on live HTTP probe).

---

### UJ-U2: Customer Pays (QRIS / Virtual Account)
* **Entry Point**: `/bayar` (`src/app/(public)/bayar/page.tsx`) after bill lookup succeeds (or `/bayar-tagihan` entry).
* **Screens**:
  * Screen 1: Bill & period selection view in `/bayar/page.tsx`.
  * Screen 2: Payment method selector + Duitku QRIS / VA view inside `/bayar/page.tsx`.
* **User Action**: Selects unpaid bill(s) and payment channel, initiates payment request.
* **API Dependencies**:
  * `src/app/api/publik/duitku/transaction/route.ts`
* **Success State (Verified in Code)**:
  * Generates Duitku transaction payload / QRIS / VA instructions for customer payment.
  * **E2E Checkout Verification**: Live payment completion against sandbox/production Duitku **`NOT VERIFIED`**.
* **Failure State (Verified in Code)**:
  * Displays error alert on failed transaction creation; displays WhatsApp help CTA if stuck.
  * **Verified Defect**: `src/app/(public)/bayar/page.tsx#L1354` links to dummy placeholder `wa.me/6281234567890` instead of tenant-configured `whatsapp` (`6281400782617` or DB tenant setting).
* **Missing Transitions**:
  * Tenant-scoped WhatsApp support handoff when payment creation or QRIS scan fails.
  * Guaranteed shared checkout UX between `/bayar` and `/bayar-tagihan`.

---

### UJ-U3: Payment Confirmation
* **Entry Point**: Post-payment view within `src/app/(public)/bayar/page.tsx` after submitting Duitku QRIS/VA transaction.
* **Screens**:
  * Screen 1: Active QRIS / VA waiting state in `/bayar/page.tsx`.
  * Screen 2: Confirmation / paid receipt state in `/bayar/page.tsx`.
* **User Action**: Completes payment in external wallet/bank app and checks/refreshes payment status.
* **API Dependencies**:
  * `src/app/api/publik/duitku/transaction/route.ts`
  * `src/app/api/publik/tagihan-detail/route.ts`
  * *(Webhook callback route exists in app routing; live callback execution **`NOT VERIFIED`**).*
* **Success State**:
  * Invoice status updates to paid; customer sees settled confirmation state (UI layout verified statically; live gateway webhook transition **`NOT VERIFIED`**).
* **Failure State**:
  * Timeout / unpaid / expired QRIS state; help CTA falls back to dummy `wa.me/6281234567890` (`bayar/page.tsx#L1354`) if customer seeks manual confirmation.
* **Missing Transitions**:
  * Dedicated shareable/printable receipt route or explicit post-payment status deep link across tenant domains without UPS HERU fallback branding.

---

### UJ-U4: Customer Submits Complaint
* **Entry Point**:
  1. `PublicNavbar` -> `/pengaduan` (`https://upsheru.com/pengaduan` returns `200`)
  2. `FloatingWhatsApp` alternative support path
* **Screens**:
  * Screen 1: `/pengaduan` (`src/app/(public)/pengaduan/page.tsx`) rendering `PengaduanForm` (`src/components/PengaduanForm.tsx`).
* **User Action**:
  * Sees field label `"Nomor WhatsApp / Kode Pelanggan"` with placeholder `"Contoh: 081234567890"` (`PengaduanForm.tsx#L94-101`), enters their WhatsApp number, selects complaint category/description, and submits.
* **API Dependencies**:
  * `POST /api/publik/pengaduan` (`src/app/api/publik/pengaduan/route.ts`)
* **Success State**:
  * **REACHABLE ONLY IF CUSTOMER ENTERS EXACT `kodePelanggan`**:
    * `route.ts#L33`: `const kodePelanggan = String(body.kodePelanggan ?? "").trim().toUpperCase();`
    * `route.ts#L51-52`: `await prisma.pelanggan.findFirst({ where: { kodePelanggan, deletedAt: null }, ... })`
    * If matched, inserts complaint and appends hardcoded `, Depok` at `route.ts#L93`.
* **Failure State (`P0` Broken Core Journey)**:
  * Any customer following the UI prompt (`"Contoh: 081234567890"`) and entering a phone/WhatsApp number fails lookup because `route.ts#L51-52` checks **only** `kodePelanggan` and ignores `noTelepon` / `body.noWa`.
  * Missing `tenantId` isolation in lookup (`findFirst({ where: { kodePelanggan, deletedAt: null } })`).
* **Missing Transitions**:
  * Phone-number normalization + `OR: [{ kodePelanggan }, { noTelepon }]` lookup scoped by `tenantId`.
  * Complaint ticket tracking ID handoff so customers can inspect SLA status after submitting.

---

### UJ-U5: Customer Tracks Truck
* **Entry Point**:
  * Expected from `PublicNavbar` -> `/lacak` (`src/app/(public)/lacak/page.tsx`), rendering `LacakJemputan` (`src/components/LacakJemputan.tsx`).
* **Screens**:
  * `/lacak` (`src/app/(public)/lacak/page.tsx`) — locally present, but **`PublicNavbar.tsx` comments out `/lacak` & `/coverage`**, and **live `https://upsheru.com/lacak` returns HTTP `307 -> https://upsheru.com/`**.
* **User Action**: Customer looks for live pickup truck schedule/location in public nav or visits `/lacak`.
* **API Dependencies**:
  * Internal tracking endpoints consumed by `LacakJemputan.tsx` (exact live response **`NOT VERIFIED`** due to `307` redirect on production).
* **Success State**:
  * **Broken in Live Production (`P1`)**: Live users visiting `/lacak` are immediately bounced via `307` redirect back to `https://upsheru.com/` and cannot discover `/lacak` or `/coverage` in `PublicNavbar`.
* **Failure State**:
  * Silent redirect to homepage with zero explanation why tracking is unavailable; customer forced onto WhatsApp.
* **Missing Transitions**:
  * Restoring `/lacak` visibility in `PublicNavbar` (or tenant feature-gating it cleanly with an informative status page) and verifying live route deployment parity with local codebase.

---

### UJ-U6: Admin Processes Complaint
* **Entry Point**: Admin login `/login` -> Sidebar (`Komplain` / `/komplain`, `src/app/(admin)/komplain/page.tsx`).
* **Screens**:
  * Screen 1: `/login` (`src/app/login/page.tsx`)
  * Screen 2: `/komplain` (`src/app/(admin)/komplain/page.tsx`) wrapped in `AdminShell` (`AdminMobileResponsiveShell`).
* **User Action**: Views incoming complaints, updates status/assignment, or forwards/escalates notification to operations WhatsApp group.
* **API Dependencies**:
  * Complaint admin API routes invoked by `komplain/page.tsx` + WhatsApp notification dispatch.
* **Success State (Verified in Code)**:
  * Updates complaint resolution state inside admin table/panel.
  * **Verified Tenant Leakage (`P1`)**: `komplain/page.tsx#L49-50` hardcodes `GRUP_PENGADUAN_ID = "120363430666363149@g.us"` and `"UPS HERU"`, causing non-UPS-HERU tenants to dispatch or label complaints with UPS HERU identifiers.
* **Failure State**:
  * Unreachable customer complaints in the first place if created via broken UJ-U4 WA lookup (`pengaduan/route.ts`); cross-tenant notification leakage when multi-tenant operators handle tickets.
* **Missing Transitions**:
  * Tenant-scoped `settings.whatsappGroupId` lookup instead of hardcoded `"120363430666363149@g.us"`.
  * Automated SLA breach badge/escalation state synchronization back to customer view.

---

### UJ-U7: Officer Completes Pickup
* **Entry Point**: Mobile officer login `/login` -> Mobile Shell `/m` (`src/app/m/layout.tsx`, `src/app/m/page.tsx`) -> `Angkut` tab (`/m/angkut`, `src/app/m/angkut/page.tsx`).
* **Screens**:
  * Screen 1: `/m` cockpit (`src/app/m/page.tsx` / `GojekDriverCockpit.tsx`)
  * Screen 2: `/m/angkut` (`src/app/m/angkut/page.tsx`) with `SlideToConfirm.tsx` and `CameraGps.tsx`
  * Screen 3: `/m/report` or `/m/absen` (`BackgroundTracker.tsx`, `MobileTracker.tsx`)
* **User Action**: Selects route/customer stop, captures GPS + camera photo evidence (`CameraGps.tsx`), slides to confirm pickup (`SlideToConfirm.tsx`).
* **API Dependencies**:
  * Pickup submission API called by `/m/angkut/page.tsx`; offline queue library `src/lib/offline-queue.ts` + `src/lib/use-offline-sync.ts`.
* **Success State (Online)**:
  * Photo + GPS coordinates submitted directly to server while device has stable cellular connectivity.
* **Failure State (Offline / Poor Signal — `P1`)**:
  * `src/lib/offline-queue.ts` exports `queueOfflinePickup`, `syncOfflineQueueToServer`, `getPendingOfflineActions`, and `removeOfflineAction`, **but `src/app/m/angkut/page.tsx` has zero usages of `offline-queue.ts`**. When signal drops in residential alleys, pickup confirmation/photo capture cannot reliably queue and auto-reconcile through `offline-queue.ts`.
  * Brand leakage: `m/page.tsx#L209` and `m/report/page.tsx#L128` hardcode `"UPS HERU Kota Depok"` & `"WastePay"`.
* **Missing Transitions**:
  * Offline queue enqueue on network error in `m/angkut/page.tsx` + visible per-item retry/sync indicator using `use-offline-sync.ts`.
  * Tenant-dynamic header/footer in `/m` shell (`m/layout.tsx` / `m/page.tsx`).

---

## PART B — O2W HERO USER JOURNEYS

### UJ-O1: Visitor Explores Product
* **Entry Point**: `https://o2whero.com/` (`src/app/page.tsx` branching on `tenantCtx.isCore` -> `src/components/core/O2WHeroCorePortal.tsx`).
* **Screens**:
  * Screen 1: `O2WHeroCorePortal.tsx` hero, 4 role tabs, interactive ROI calculator (`kalkulatorKK` x `kalkulatorTarif`), `upsheru.com` case study (`1.253 KK`), pricing comparison, 6 FAQs.
* **User Action**: Navigates sections, switches role tabs, drags ROI slider, compares plans, inspects FAQ.
* **API Dependencies**:
  * None for initial SSR render (`src/app/page.tsx` executes `generateMetadata()` and renders `O2WHeroCorePortal`); **broken SEO endpoints**: `sitemap.ts` and `robots.ts` emit `https://upsheru.com/...` URLs on `o2whero.com`.
* **Success State**:
  * Desktop visitors (`>= 1024px`) view dark `slate-950` SaaS landing (`200`, `49.6KB` live HTML), role tabs, and ROI calculator.
* **Failure State**:
  * **Mobile Navigation Missing**: Top nav bar in `O2WHeroCorePortal.tsx` uses `hidden lg:flex` with no mobile hamburger drawer — `<1024px` visitors lose top section navigation.
  * **Broken Brand Assets**: `o2whero.com/logo.png` (referenced in JSON-LD) and `o2whero.com/og-image.png` return HTTP `404`; `CORE_TENANT.branding.logoUrl` (`/images/o2w-logo.png`) does not exist in `public/`.
  * **Leaked UPS HERU Pages**: Visiting `/bayar`, `/login`, `/tarif`, etc. on `o2whero.com` loads UPS HERU branding (`src/proxy.ts#L474`, `#L726-736`).
* **Missing Transitions**:
  * Mobile drawer navigation for `< lg` viewports.
  * Host-aware `sitemap.ts`, `robots.ts`, and real `/images/o2w-logo.png` + `/og-image.png` assets.

---

### UJ-O2: Visitor Requests Demo
* **Entry Point**: CTA buttons in `O2WHeroCorePortal.tsx` scrolling to `#daftar` or linking to partner registration.
* **Screens**:
  * Screen 1: `#daftar` anchor section inside `O2WHeroCorePortal.tsx` (`src/components/core/O2WHeroCorePortal.tsx`)
  * Screen 2 (Local Uncommitted Only): `/mitra` (`src/app/(public)/mitra/page.tsx`) — returns **`404` on live `https://o2whero.com/mitra`**.
* **User Action**: Clicks demo / onboarding CTA to submit organization details.
* **API Dependencies**:
  * `POST /api/core/mitra/register` (`src/app/api/core/mitra/register/route.ts`)
* **Success State**:
  * Submitting `#daftar` calls `POST /api/core/mitra/register` and shows confirmation state inside `O2WHeroCorePortal.tsx`.
* **Failure State**:
  * Live links/bookmarks to `https://o2whero.com/mitra` fail with HTTP `404`.
  * No distinct demo-scheduling path (calendar slot / WhatsApp sales routing) separated from full partner/tenant registration.
* **Missing Transitions**:
  * Dedicated published `/mitra` or `/demo` route wired into live deployment + clear split between `"Book Demo"` vs `"Register Operator Tenant"`.

---

### UJ-O3: Partner Registers
* **Entry Point**: `#daftar` form in `O2WHeroCorePortal.tsx` (or `/mitra` in local uncommitted tree `src/app/(public)/mitra/page.tsx`).
* **Screens**:
  * Screen 1: Registration form (organization/bumdes/dlh details, contact WhatsApp, email, subdomain/plan intent).
* **User Action**: Fills partner intake fields and submits form.
* **API Dependencies**:
  * `POST /api/core/mitra/register` (`src/proxy.ts#L501` explicitly whitelists `POST` for registration).
* **Success State**:
  * Creates pending partner/prospek record (`POST /api/core/mitra/register/route.ts`) and notifies applicant of pending verification.
* **Failure State**:
  * `/mitra` returns `404` on live `o2whero.com` and `upsheru.com`.
  * No email/WhatsApp verification status lookup link for applicants waiting on approval.
* **Missing Transitions**:
  * Application status tracker / instant confirmation receipt with SLA expectation + next onboarding checklist.

---

### UJ-O4: Admin Verifies Partner
* **Entry Point**: Super Admin login on `o2whero.com/login` -> `CoreSaaSDashboard` (`/dashboard` rendered on Core host, `src/components/core/CoreSaaSDashboard.tsx`) or `/crm-prospek` (`src/app/(admin)/crm-prospek/page.tsx`).
* **Screens**:
  * Screen 1: `o2whero.com/login` (renders `"Masuk Petugas | UPS HERU Depok"` / `h1="UPS HERU Portal"` live!)
  * Screen 2: `CoreSaaSDashboard.tsx` pending mitra queue
  * Screen 3: `/crm-prospek` (`src/app/(admin)/crm-prospek/page.tsx`)
* **User Action**: Superadmin reviews partner registration and clicks Approve / Reject.
* **API Dependencies**:
  * `GET /api/core/control-tower` (`src/app/api/core/control-tower/route.ts`)
  * `PATCH /api/core/mitra/register` (`src/components/core/CoreSaaSDashboard.tsx#L61`)
* **Success State**:
  * **CURRENTLY UNREACHABLE VIA `CoreSaaSDashboard` (`P0`)**.
* **Failure State (`P0` Core SaaS Failure)**:
  * `CoreSaaSDashboard.tsx#L61` sends `PATCH /api/core/mitra/register`.
  * `src/proxy.ts` whitelists `POST:/api/core/mitra/register` at L501, **omits `PATCH:/api/core/mitra/register` from `API_ROLE_MAP` (L75–371)**, and fail-closes at `L708` with `403 Forbidden: rute tidak terdaftar`!
* **Missing Transitions**:
  * Register `PATCH:/api/core/mitra/register` in `API_ROLE_MAP` with role level `100` (`superadmin`).
  * Automated handoff from partner approval (`PATCH /api/core/mitra/register`) directly into tenant provisioning (`UJ-O5`).

---

### UJ-O5: Tenant Gets Provisioned
* **Entry Point**: Super Admin Sidebar -> `Tenants` (`/tenants`, `src/app/(admin)/tenants/page.tsx`).
* **Screens**:
  * Screen 1: `/tenants` management view (`src/app/(admin)/tenants/page.tsx`)
  * Related Screens: `/ecosystem-map` (`ecosystem-map/page.tsx`), `/platform-settings` (`platform-settings/page.tsx`)
* **User Action**: Superadmin creates or provisions a tenant record, assigns domain/subdomain, plan, and admin credentials.
* **API Dependencies**:
  * `/api/core/tenants` (`src/proxy.ts#L90` maps `GET:/api/core/tenants` to level `50` instead of `100`, though handlers check `superadmin`).
* **Success State (Verified in Code)**:
  * Creates tenant entry managed in `/tenants`.
* **Failure State**:
  * Disconnected from broken `UJ-O4` approval button (`PATCH /api/core/mitra/register` -> `403`).
  * Domain-based branding breaks for new tenants if `/login` or `(public)` layout is accessed without tenant-aware layout/assets (`(public)/layout.tsx` hardcodes UPS HERU banner/footer/title; `CORE_TENANT` & `PILOT_TENANT` logo paths 404).
* **Missing Transitions**:
  * One-click `"Approve & Provision Tenant"` flow from pending partner queue -> automated subdomain verification -> welcome credentials & onboarding link dispatch.

---

### UJ-O6: Tenant Configures Organization
* **Entry Point**: Tenant Admin logs into tenant domain (`/login`) -> Sidebar -> `Pengaturan` (`/pengaturan`, `src/app/(admin)/pengaturan/page.tsx`), `Manajemen Tarif` (`/manajemen-tarif/page.tsx`), `Users` (`/users/page.tsx`).
* **Screens**:
  * `/pengaturan` (`src/app/(admin)/pengaturan/page.tsx`)
  * `/manajemen-tarif` (`src/app/(admin)/manajemen-tarif/page.tsx`)
  * `/manajemen-marketplace` (`src/app/(admin)/manajemen-marketplace/page.tsx`)
  * `/users` (`src/app/(admin)/users/page.tsx`)
* **User Action**: Updates organization branding, tariffs, WhatsApp number/group, and operator staff accounts.
* **API Dependencies**:
  * Tenant config & master data endpoints.
* **Success State**:
  * Persists org settings; **HOWEVER**, downstream public/admin UI ignores many settings due to hardcodes and missing `tenantId` filters.
* **Failure State (Verified Branding & Isolation Defects)**:
  * Public tariff & signup pages (`src/app/(public)/tarif/page.tsx`, `src/app/(public)/daftar/page.tsx`) query `prisma.kategoriTarif.findMany()` & `prisma.paket.findMany()` **without `tenantId`** — showing cross-tenant tariffs.
  * `(public)/layout.tsx` always renders `"UPS HERU Depok"` banner, metadata template `"%s | UPS HERU Depok"`, and `6281400782617`.
  * `AdminCommandSearch.tsx#L723` displays `"UPS HERU Quick Command"`, `pelanggan/page.tsx#L147` prints `"UPS HERU DEPOK"` on stickers, `komplain/page.tsx#L49-50` hardcodes UPS HERU WA group.
* **Missing Transitions**:
  * Guided post-provisioning Tenant Onboarding Wizard (`Brand & Domain -> Tariffs -> Payment Gateway -> Staff Invite -> Go Live`).

---

### UJ-O7: Tenant Activates Subscription
* **Entry Point**:
  * Self-serve marketing expectations on `o2whero.com` (`O2WHeroCorePortal.tsx` pricing section)
  * Superadmin billing/subscription consoles: `/subscriptions` (`src/app/(admin)/subscriptions/page.tsx`) and `/saas-billing` (`src/app/(admin)/saas-billing/page.tsx`)
* **Screens**:
  * `O2WHeroCorePortal.tsx` pricing table (`Starter Rp 349.000`, `Kemitraan All-in-One Rp 2.000.000 + 10%`, `Enterprise Rp 4.990.000`)
  * `/subscriptions` (`starter: 349000`, `pro: 1250000`, `enterprise: 2990000`)
  * `/saas-billing` (defaults to `1250000`)
* **User Action**: Tenant wants to select/upgrade/pay subscription plan; or Superadmin creates/updates tenant subscription & invoice.
* **API Dependencies**:
  * `/api/core/billing` & `/api/core/control-tower` (`src/app/api/core/control-tower/route.ts#L96-102`)
* **Success State**:
  * Superadmin can manually manage subscriptions/invoices in `/subscriptions` and `/saas-billing`.
* **Failure State (`P1` Commercial & Product Defect)**:
  * **Conflicting Pricing Tiers**: Marketing promises `Kemitraan Rp 2.000.000 + 10%` and `Enterprise Rp 4.990.000`, while backend & billing UI calculate `pro: 1.250.000` and `enterprise: 2.990.000`.
  * **No Self-Serve Tenant Billing Screen**: Tenant admins lack a self-service SaaS subscription activation/upgrade/invoice portal (existing `/subscriptions` and `/saas-billing` are Core Superadmin pages gated out of normal tenant sidebars).
* **Missing Transitions**:
  * Single source of truth pricing catalog shared between `O2WHeroCorePortal.tsx`, `control-tower/route.ts`, `subscriptions/page.tsx`, and `saas-billing/page.tsx`.
  * Tenant-facing `"Plan & Billing"` settings view with automated subscription activation/payment.

---

### UJ-O8: Tenant Accesses Dashboard
* **Entry Point**: `/login` (`src/app/login/page.tsx`) -> `/dashboard` (`src/app/(admin)/dashboard/page.tsx`).
* **Screens**:
  * Screen 1: `/login` (`o2whero.com/login` currently displays `"Masuk Petugas | UPS HERU Depok"` and `<h1>UPS HERU Portal</h1>`!)
  * Screen 2: `/dashboard` (`src/app/(admin)/dashboard/page.tsx`) wrapped in `AdminShell` (`Sidebar.tsx` + `AdminMobileResponsiveShell.tsx`).
* **User Action**: Tenant admin/kasir logs into their domain and inspects KPIs, customers, billing, and operations.
* **API Dependencies**:
  * Server-side `getStats()` in `src/app/(admin)/dashboard/page.tsx#L83-256` + client fetches.
* **Success State**:
  * Renders KPI dashboard for authenticated session (`src/app/(admin)/layout.tsx` checks `getSession()`).
  * If an authenticated non-`superadmin` attempts to visit `o2whero.com`, `src/proxy.ts#L748-758` redirects to `/login?error=core_restricted` (or `?error=tenant_mismatch` for wrong tenant host).
* **Failure State (`P0` Data Isolation Leak)**:
  * **`dashboard/page.tsx#L83-256` `getStats()` runs Prisma queries without `tenantId` filtering**, exposing aggregate KPIs across tenants to logged-in tenant dashboards.
  * Multiple shared Prisma models (`Tagihan`, `DuitkuTransaction`, e-commerce models per `MULTITENANT_AUDIT.md`) still lack `tenantId` isolation.
  * Core SaaS exception edge cases: `Sidebar.tsx` includes `"ai-command"` in `CORE_ALLOWED_KEYS` but omits it from `CORE_GROUP_MAP`, and `Sidebar.tsx#L394` hardcodes `"Tenant: UPS HERU"`.
* **Missing Transitions**:
  * `login/page.tsx` tenant-aware branding + friendly messaging for `?error=core_restricted` and `?error=tenant_mismatch`.
  * Strict `tenantId` enforcement inside `dashboard/page.tsx` `getStats()` and every shared admin query.
