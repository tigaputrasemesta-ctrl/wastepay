# MULTI-TENANT UI AUDIT — O2W HERO & UPS HERU

> **Context**: Cross-references existing backend gap inventory ([MULTITENANT_AUDIT.md](file:///data/data/com.termux/files/home/wastepay/MULTITENANT_AUDIT.md): 34 Prisma models with `tenantId`, 14 without — including `Tagihan`, `DuitkuTransaction`, and e-commerce models) against UI, layout, routing, branding, navigation, and live HTTP behavior on `https://o2whero.com` and `https://upsheru.com`.
> **Verification Status**: Static code audit + live `curl` HTTP/HTML inspection complete; interactive multi-tenant browser sessions across custom subdomains **`NOT VERIFIED`**.

---

## Executive Summary

**Overall Multi-Tenant UI Isolation Status: CRITICAL LEAKAGE (`P0` / FAIL)**

While backend proxy guards (`src/proxy.ts`) and tenant config (`src/lib/tenant/config.ts`) establish the foundation for Core (`o2whero.com`) vs Tenant (`upsheru.com`) separation, **UPS HERU branding and unscoped queries leak heavily across public pages, SEO endpoints, auth login, admin components, field officer mobile views, and Core SaaS views**. Even on `https://o2whero.com`, live probes confirm `/login` renders `"Masuk Petugas | UPS HERU Depok"` and `/bayar` renders UPS HERU Depok consumer billing.

---

## Part 7 Audit Matrix (9 Required Dimensions)

| # | Audit Dimension | Status | Verified Findings & Evidence | Severity |
|---|---|---|---|---|
| 1 | **Tenant Branding Isolation** | **FAIL** | `(public)/layout.tsx` hardcodes UPS HERU Depok banner, title template `"%s \| UPS HERU Depok"`, & footer WA `6281400782617`. Live `o2whero.com/login` renders `title="Masuk Petugas \| UPS HERU Depok"`, `h1="UPS HERU Portal"`. `o2whero.com/bayar` returns `UPS:true O2W:false`. | **P0** |
| 2 | **Tenant Navigation Isolation** | **FAIL** | `PublicNavbar.tsx` hardcodes `NAV_ITEMS` assuming UPS HERU public routes; unauthenticated `(public)` requests on `o2whero.com` bypass `if (tenantCtx.isCore)` in `src/proxy.ts#L726-736` vs `#L764`. `CORE_PRIMARY_MOBILE_TABS` (4 tabs) vs `PRIMARY_MOBILE_TABS` (5 tabs) separates mobile admin nav, while `Sidebar.tsx#L228-291` omits `"ai-command"` from `CORE_GROUP_MAP`. | **P1** |
| 3 | **Tenant-Specific Configuration** | **FAIL** | `tarif/page.tsx` & `daftar/page.tsx` query `kategoriTarif` & `paket` without `tenantId`; `page.tsx` queries `artikel` & `pengumuman` without `tenantId`; `pengaduan/route.ts#L93` hardcodes `, Depok`; `komplain/page.tsx#L49-50` hardcodes `GRUP_PENGADUAN_ID = "120363430666363149@g.us"`; `bayar/page.tsx#L1354` hardcodes `wa.me/6281234567890`. | **P1** |
| 4 | **Role-Based Menu Visibility** | **PARTIAL PASS** | `Sidebar.tsx` filters 44 `menuConfig` items via `RBAC` roles (`superadmin` 100, `admin` 50, `kasir` 20, `petugas` 10) + `CORE_ALLOWED_KEYS` / `CORE_EXCLUSIVE_KEYS`. Defect: `CORE_ALLOWED_KEYS` includes `"ai-command"` missing from `CORE_GROUP_MAP`, and `ai-command/page.tsx#L100,114` leaks `"UPSHERU"` agent names. | **P2** |
| 5 | **Tenant-Specific Billing** | **FAIL** | Backend models `Tagihan` and `DuitkuTransaction` lack `tenantId` (`MULTITENANT_AUDIT.md`); `api/publik/tagihan-detail/route.ts#L66` (`getTagihanByNoInvoice`) omits `tenantId`; `/bayar` bypasses `isCore` check in `src/proxy.ts#L474`. SaaS pricing conflicts between `O2WHeroCorePortal.tsx` and `subscriptions/page.tsx` + `saas-billing/page.tsx`. | **P0** |
| 6 | **Tenant-Specific Dashboards** | **FAIL** | `src/app/(admin)/dashboard/page.tsx#L83-256` `getStats()` queries Prisma models without `tenantId` scoping. `Sidebar.tsx#L394` hardcodes `"Tenant: UPS HERU"` in Core switcher; `AdminCommandSearch.tsx#L723` hardcodes `"UPS HERU Quick Command"`. | **P0** |
| 7 | **Platform Super Admin Separation** | **PARTIAL FAIL** | `src/proxy.ts#L748-758` blocks non-`superadmin` on `isCore` (`?error=core_restricted`), and `control-tower/route.ts#L18` checks `session.role !== "superadmin"`. **However**, `src/proxy.ts#L90-103` maps `/api/core/tenants`, `/api/core/control-tower`, `/api/core/crm`, `/api/core/billing` to level `50` (`admin`) instead of `100` (`superadmin`), `#L673-690` allows `/api/pelanggan` & `/api/tagihan` on `isCore`, and `PATCH:/api/core/mitra/register` is missing -> `403`. | **P0** |
| 8 | **Tenant Switching Authorization** | **PARTIAL PASS** | `src/proxy.ts#L748-758` enforces `user.tenantId !== tenantCtx.tenant.id` redirect (`?error=tenant_mismatch`). However, UI switcher text in `Sidebar.tsx#L394` is hardcoded (`"UPS HERU"`) and cross-tenant switching UI workflows across real multi-tenant domains are **`NOT VERIFIED`**. | **P2** |
| 9 | **Domain-Based Branding** | **FAIL** | `layout.tsx` hardcodes `apple: "/ups-heru-logo.jpg"`; `sitemap.ts` & `robots.ts` on `o2whero.com` output `https://upsheru.com/...`; `CORE_TENANT.branding.logoUrl` (`/images/o2w-logo.png`) & `PILOT_TENANT.branding.logoUrl` (`/ups_heru_logo.jpg`) 404; `O2WHeroCorePortal.tsx` JSON-LD points to `o2whero.com/logo.png` (404). | **P0** |

---

## Verified UPS HERU Leakage Inventory (Must Not Appear in Other Tenants or O2W HERO)

| ID | File & Line | Hardcoded Leakage | Appears Where |
|---|---|---|---|
| **MT-01** | `src/app/(public)/layout.tsx` (L1–96) | `"%s \| UPS HERU Depok"` title template, `"UPS HERU Depok"` top banner, `"6281400782617"` WhatsApp footer | All `(public)` routes including unauthenticated hits on `o2whero.com` |
| **MT-02** | `src/app/login/page.tsx` & `login/layout.tsx` | `"Masuk Petugas \| UPS HERU Depok"` & `<h1>UPS HERU Portal</h1>` | Live `https://o2whero.com/login` (`UPS:true O2W:false`) & any tenant domain |
| **MT-03** | `src/proxy.ts#L474` & `src/proxy.ts#L726-736` | `/bayar` returns early before `isCore`; unauthenticated non-admin returns `NextResponse.next()` before `if (tenantCtx.isCore)` at L764 | Live `https://o2whero.com/bayar` serves UPS HERU bill checker |
| **MT-04** | `src/app/sitemap.ts` & `src/app/robots.ts` | Outputs `https://upsheru.com/...` URLs statically | Live `https://o2whero.com/sitemap.xml` & `robots.txt` |
| **MT-05** | `src/app/layout.tsx` (L1–124) | `apple: "/ups-heru-logo.jpg"` root icon metadata | Global root `<head>` across Core & all tenants |
| **MT-06** | `src/components/Sidebar.tsx#L394` | Hardcoded `"Tenant: UPS HERU"` in Core context switcher | Superadmin sidebar |
| **MT-07** | `src/components/admin/AdminCommandSearch.tsx#L723` | `"UPS HERU Quick Command"` modal title | Every tenant admin's command palette (`Cmd+K`) |
| **MT-08** | `src/app/(admin)/ai-command/page.tsx#L100,114` | `"B2B SDR Agent UPSHERU"`, `"Content Strategist UPSHERU"` | Core SaaS AI Command & admin views |
| **MT-09** | `src/app/(admin)/pelanggan/page.tsx#L147` | `"UPS HERU DEPOK"` printed on barcode/QR sticker | All tenant customer sticker exports |
| **MT-10** | `src/app/(admin)/komplain/page.tsx#L49-50` | `GRUP_PENGADUAN_ID = "120363430666363149@g.us"` & `"UPS HERU"` | All tenant admin complaint escalations |
| **MT-11** | `src/app/api/publik/pengaduan/route.ts#L93` | Appends hardcoded `, Depok` | Public complaint creation across tenants |
| **MT-12** | `src/app/m/page.tsx#L209` & `m/report/page.tsx#L128` | `"UPS HERU Kota Depok"` & `"WastePay"` | Mobile field officer portals of every tenant |

---

## Detailed Multi-Tenant Issue Specifications

### MT-UI-01: Unauthenticated Routes & `/bayar` Bypass `isCore` Host Isolation (`P0`)
* **Evidence**: Live `curl https://o2whero.com/bayar` (`200`, `UPS:true O2W:false`), `curl https://o2whero.com/login` (`200`, `title="Masuk Petugas | UPS HERU Depok"`). Static: `src/proxy.ts#L474`, `#L726-736`, `#L764`.
* **Route**: `/bayar`, `/login`, all `(public)/*` routes accessed on `o2whero.com`.
* **Component**: `src/proxy.ts`, `src/app/(public)/layout.tsx`, `src/app/login/layout.tsx`.
* **Problem**: Early returns for `/bayar` (L474) and unauthenticated non-admin pages (L726–736) execute **before** `if (tenantCtx.isCore)` (L764).
* **User Impact**: Enterprise prospects landing on `o2whero.com/login` or mistyping a route see `"UPS HERU Depok"` consumer waste portal instead of O2W HERO SaaS.
* **Business Impact**: Severe B2B credibility damage and brand confusion between the SaaS vendor and one municipal tenant.
* **Severity**: **P0**
* **Recommended Solution**: Move `isCore` host gate & tenant context header injection **before** public bypasses; block/redirect consumer UPS HERU routes (`/bayar`, `/daftar`, `/pengaduan`, `/tarif`, `/pickup`, `/marketplace`) on Core hosts, and make `login/layout.tsx` + `(public)/layout.tsx` dynamically consume `resolveTenantFromHeaders()`.
* **Estimated Complexity**: **M**
* **Acceptance Criteria**:
  1. `curl -s https://o2whero.com/login` returns O2W HERO metadata (`O2W:true`, `UPS:false`).
  2. `https://o2whero.com/bayar` returns `404` or redirects cleanly to `o2whero.com` / tenant finder.
  3. Any provisioned custom domain displays its own DB tenant name, logo, and WhatsApp in `(public)/layout.tsx` and `/login`.

### MT-UI-02: Tenant Admin Dashboard `getStats()` & Public Queries Lack `tenantId` Filtering (`P0`)
* **Evidence**: Static inspection of `src/app/(admin)/dashboard/page.tsx#L83-256`, `src/app/api/publik/tagihan-detail/route.ts#L66`, `src/app/(public)/tarif/page.tsx`, `src/app/(public)/daftar/page.tsx`, `src/app/page.tsx`, corroborated by `MULTITENANT_AUDIT.md`.
* **Route**: `/dashboard`, `/tarif`, `/daftar`, `/`, `/api/publik/tagihan-detail`.
* **Component**: `dashboard/page.tsx` (`getStats`), `tagihan-detail/route.ts` (`getTagihanByNoInvoice`), public SSR pages.
* **Problem**: Server queries read `Tagihan`, `Pelanggan`, `KategoriTarif`, `Paket`, `Artikel`, `Pengumuman` globally without `where: { tenantId }`.
* **User Impact**: Tenant B admins see Tenant A financial totals/KPIs; public visitors on Tenant B see Tenant A tariffs/articles.
* **Business Impact**: Cross-tenant data leak / regulatory failure preventing multi-tenant SaaS onboarding.
* **Severity**: **P0**
* **Recommended Solution**: Require explicit `tenantId` argument on `getStats(tenantId)` and all SSR/public helper functions; complete schema `tenantId` backfill for the 14 remaining models documented in `MULTITENANT_AUDIT.md`.
* **Estimated Complexity**: **L**
* **Acceptance Criteria**:
  1. Unit/integration test proves Tenant A queries never return Tenant B `Tagihan`, `Pelanggan`, `KategoriTarif`, `Paket`, or `Artikel` rows.
  2. `dashboard/page.tsx` `getStats` fails loudly if `session.tenantId` is absent.

### MT-UI-03: Proxy RBAC Role Mismatch & Core API Leak on `isCore` (`P0`)
* **Evidence**: `src/proxy.ts#L90-103`, `#L673-690`, `#L708`; `src/components/core/CoreSaaSDashboard.tsx#L61`.
* **Route**: `/api/core/tenants`, `/api/core/control-tower`, `/api/core/crm`, `/api/core/billing`, `/api/core/mitra/register`, `/api/pelanggan`, `/api/tagihan`.
* **Component**: `src/proxy.ts` (`API_ROLE_MAP`, `isAllowedCoreApi`), `CoreSaaSDashboard.tsx`.
* **Problem**: Proxy maps Core APIs to role `50` instead of `100`, exposes tenant operational APIs (`/api/pelanggan`, `/api/tagihan`) on `isCore`, and omits `PATCH:/api/core/mitra/register` causing `403`.
* **User Impact**: Superadmins cannot approve partner registrations via dashboard UI; middleware permits wrong role tier to reach Core API handlers.
* **Business Impact**: Broken partner onboarding + privilege boundary erosion.
* **Severity**: **P0**
* **Recommended Solution**: Set all `/api/core/*` entries (except public `POST:/api/core/mitra/register`) in `API_ROLE_MAP` to `100` (`superadmin`), add `PATCH:/api/core/mitra/register` at `100`, and remove `/api/pelanggan` + `/api/tagihan` from `isAllowedCoreApi` on `isCore`.
* **Estimated Complexity**: **S**
* **Acceptance Criteria**:
  1. Non-superadmin receives `403` from proxy on `/api/core/control-tower` and `/api/core/tenants`.
  2. `PATCH /api/core/mitra/register` succeeds for `superadmin`.

### MT-UI-04: Broken Brand Logo Assets, Static SEO Sitemap & Config Drift (`P1`)
* **Evidence**: Live `404` on `o2whero.com/logo.png`, `o2whero.com/og-image.png`, `upsheru.com/ups_heru_logo.jpg`. Static: `src/lib/tenant/config.ts#L49,87`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/seo.ts`.
* **Route**: `/sitemap.xml`, `/robots.txt`, `/logo.png`, `/og-image.png`, global header logos.
* **Component**: `tenant/config.ts`, `sitemap.ts`, `robots.ts`, `O2WHeroCorePortal.tsx`.
* **Problem**: Tenant logo config paths point to missing files (`/images/o2w-logo.png`, `/ups_heru_logo.jpg`), while `sitemap.ts`/`robots.ts` emit `https://upsheru.com` URLs on `o2whero.com`.
* **User Impact**: Broken header/JSON-LD images; search engines crawl `o2whero.com` and index `upsheru.com` URLs.
* **Business Impact**: SEO cannibalization and broken brand polish.
* **Severity**: **P1**
* **Recommended Solution**: Fix `PILOT_TENANT.branding.logoUrl` to `/ups-heru-logo.jpg`, add real `/images/o2w-logo.png` + `/og-image.png` assets, and compute `sitemap.ts`/`robots.ts` `baseUrl` dynamically from incoming `headers()` host.
* **Estimated Complexity**: **S**
* **Acceptance Criteria**:
  1. `curl -I https://o2whero.com/og-image.png` and `/images/o2w-logo.png` return `200`.
  2. `https://o2whero.com/sitemap.xml` lists `https://o2whero.com/...` URLs only.

### MT-UI-05: Hardcoded UPS HERU Text Across Shared Admin & Field Officer Components (`P1`)
* **Evidence**: `Sidebar.tsx#L394`, `AdminCommandSearch.tsx#L723`, `ai-command/page.tsx#L100,114`, `pelanggan/page.tsx#L147`, `komplain/page.tsx#L49-50`, `m/page.tsx#L209`, `m/report/page.tsx#L128`.
* **Route**: `/dashboard`, `/komplain`, `/pelanggan`, `/ai-command`, `/m`, `/m/report`, global `(admin)/*`.
* **Component**: `Sidebar`, `AdminCommandSearch`, `PelangganPage`, `KomplainPage`, `AICommandPage`, `MobileHomePage`.
* **Problem**: Tenant brand name, sticker header, WhatsApp group ID, and city `"Depok"` are hardcoded string literals instead of tenant context properties.
* **User Impact**: Any non-UPS-HERU tenant sees `"UPS HERU"`, `"UPS HERU DEPOK"`, and complaints escalate to UPS HERU's WhatsApp group!
* **Business Impact**: Prevents white-label SaaS resale to any municipality or BUMDes outside UPS HERU.
* **Severity**: **P1**
* **Recommended Solution**: Inject `tenant` context from `(admin)/layout.tsx` and `/m/layout.tsx` via React Context/props (`tenant.name`, `tenant.city`, `tenant.whatsapp`, `tenant.logoUrl`) and eliminate all literal `"UPS HERU"` strings in shared code.
* **Estimated Complexity**: **M**
* **Acceptance Criteria**:
  1. Repo-wide search for `UPS HERU` / `upsheru` in `src/components/` and `src/app/(admin)/` returns zero matches outside tenant seed/fallback config.
  2. Sidebar `"ai-command"` item has an entry in `CORE_GROUP_MAP`.
