# DESIGN_SYSTEM_AUDIT.md — Visual Design & Component Architecture Audit

> **Scope**: Independent evaluation of **UPS HERU** (`upsheru.com`) and **O2W HERO** (`o2whero.com`) design tokens, Tailwind v3 configuration, shared UI primitives, CSS overrides, and visual consistency.  
> **Key Automated Evidence**: `npm run check:classes` reports **886 issues** across `src/` (473 silently ignored Tailwind v4-only classes + 413 WCAG AA contrast violations).

---

## 1. Brand Identity Separation (Do Not Force Identical Branding)

| Dimension | UPS HERU (Community/Municipal Operator) | O2W HERO (Enterprise Multi-Tenant SaaS) |
|---|---|---|
| **Audience** | Residents, RT/RW leaders, SME shops, drivers, municipal cashiers | TPS3R directors, DLH/government officials, Waste Bank managers, SaaS Superadmins |
| **Visual Tone** | Civic trust, approachable clarity, high outdoor readability (mobile field & citizens) | High-tech precision, authority, financial & ESG intelligence |
| **Recommended Light/Dark Surface** | Light-first civic surface (`#f8fafc` / `#ffffff`) with deep forest teal (`#0c3d3a`, `#0d7a75`) + accessible emerald (`#047857`) | Dark-first marketing (`#020617` slate-950) & crisp SaaS Control Tower (`sky-600` / `teal-500` / `emerald-500` accents) |
| **Current Leakages** | Admin shell & `globals.css` mix `emerald`, `sky`, and `zinc` tokens; `/m/report` & `/m/pengaduan` switch to `rose-800`/`emerald-800` headers | `o2whero.com/login` & `/bayar` leak UPS HERU green/white; `Sidebar` uses `"UPS HERU"`; `O2WHeroCorePortal` & `CoreSaaSDashboard` mix `emerald` and `sky` inconsistently |

---

## 2. Design Token & Tailwind Configuration Audit

### A. Tailwind v3 vs Tailwind v4 Drift (`tailwind.config.ts` & `package.json`)
- **Installed Version**: `"tailwindcss": "^3.4.19"` ([package.json#L87](file:///data/data/com.termux/files/home/wastepay/package.json#L87)).
- **Broken Tailwind v4 Classes in `src/` (473 total occurrences silently dropped by v3)**:
  - `shadow-xs`: **414** occurrences (including `globals.css`, `ui/button.tsx`, `CivicHeroWidget.tsx`, `AdminCommandSearch.tsx`, `CoreSaaSDashboard.tsx`, `tenants/page.tsx`) -> **renders zero box-shadow!**
  - `shadow-2xs`: **31** occurrences (mostly `bayar/page.tsx`) -> **renders zero box-shadow!**
  - `backdrop-blur-xs`: **24** occurrences (e.g., `tenant-roi/page.tsx`, `saas-billing/page.tsx`) -> **renders zero backdrop blur!**
  - `outline-hidden`: **4** occurrences (`saas-billing/page.tsx`, `crm-prospek/page.tsx`, `ecosystem-map/page.tsx`, `notifikasi-saas/page.tsx`) -> **browser default outline remains!**

### B. Color System & Contrast (`check:classes` — 413 WCAG Failures)
- **`tailwind.config.ts` defines unused semantic palettes**: `brand-*`, `ocean-*`, `surface.*`, `ink.*`, `wp.*` (`#0F3D3E`, `#10B981`, `#F59E0B`, `#E11D48`, `#020617`) — most components bypass them and hardcode `#0d7a75`, `#0c3d3a`, `#124b47`, `#00AA13`, or Tailwind `emerald-*` / `slate-*`.
- **WCAG AA Contrast Violations Detected by `scripts/check-tailwind-classes.mjs`**:
  - `bg-emerald-500` / `bg-emerald-600` paired with `text-white`: **135 occurrences** (2.9:1–3.8:1 contrast; fails 4.5:1 AA). Includes `.thumb-button-primary`, `.btn-primary`, `.hm-btn-green`, and `src/components/ui/button.tsx` (`variant="default"` & `"success"`!).
  - `text-emerald-600` on light surfaces: **223 occurrences** (3.8:1 < 4.5:1).
  - `text-amber-600` on amber/light surfaces: **55 occurrences** (3.1:1 < 4.5:1).

### C. Typography, Fonts & Spacing
- **Fonts (`src/app/layout.tsx`)**: `Inter` (`--font-inter`) and `JetBrains_Mono` (`--font-jetbrains`) loaded via `next/font/google`.
- **Inconsistency**: `Inter` uses `display: "swap"`, whereas `JetBrains_Mono` omits `display: "swap"`. Some Leaflet/tooltip CSS in `globals.css` and `GojekDriverCockpit.tsx` falls back to `ui-sans-serif, system-ui, sans-serif` instead of `var(--font-inter)`.
- **Micro-text Overuse**: Heavy use of `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]` across `m/layout.tsx`, `m/page.tsx`, `m/absen/page.tsx`, `O2WHeroCorePortal.tsx`, and `Sidebar.tsx` hurts legibility on outdoor Android screens.
- **Border Radius Drift**: Mixes `rounded-lg` (buttons in `globals.css` forced via line 522!), `rounded-xl` (cards/buttons), `rounded-2xl` (cards/modals), `rounded-3xl` (landing sections & modals), and `rounded-[2rem]` (`/daftar` cards).
- **CSS `!important` Anti-Pattern (`src/app/globals.css#L330-L631`)**:
  - Global selectors override legacy neo-brutalist classes (`.border-black`, `.bg-yellow-300`, `.bg-green-400`), table headers, button border radii (`button:not([class*="rounded-full"])`), and dark mode (`.dark .bg-white`, `.dark input`, `.dark table`).
  - **Side effect**: Makes predictable per-component styling brittle, forces `background-color: #18181b !important` on dark inputs, and breaks custom button/badge styling across public vs admin pages.

---

## 3. Component Audit & Duplication Inventory

| Pattern | Current State in `src/` | Duplication / Inconsistency Findings |
|---|---|---|
| **UI Primitives (`src/components/ui/`)** | Only **3** components exist: `button.tsx`, `dialog.tsx`, `skeleton.tsx` | `Button` & `Dialog` are almost **never used** across the 91 pages! `button.tsx` itself uses `bg-emerald-600` (fails WCAG AA) and `shadow-xs` (broken in Tailwind v3). |
| **Buttons** | 4 competing systems: `.btn-*` (`globals.css`), `.hm-btn*` (`globals.css`), `.thumb-button-*` (`globals.css`), `ui/button.tsx`, plus hundreds of inline Tailwind strings | Every page invents its own padding, height (`h-9`, `h-10`, `h-11`, `h-12`, `py-2`, `py-2.5`, `py-3`, `py-3.5`), and radius (`rounded-lg`, `rounded-xl`, `rounded-2xl`). |
| **Cards** | `.app-card`, `.hm-card`, `.app-card-interactive`, plus inline `bg-white rounded-2xl/3xl border ...` | Public UPS HERU uses `rounded-2xl`/`rounded-3xl`; Admin uses `rounded-2xl`; Core BI mixes `rounded-2xl` and `rounded-3xl` headers with 5 different gradient hues (`sky-950`, `emerald-950`, `indigo-950`, `teal-950`, `rose-950`). |
| **Modals / Drawers** | `ui/dialog.tsx`, `ConfirmDialog.tsx`, plus **20+ inline `fixed inset-0` modals** in `pelanggan`, `tagihan`, `tenants`, `saas-billing`, `crm-prospek`, `bayar`, `rute`, `kendaraan`, `komplain` | Inline modals inconsistently implement `Escape` key closing, focus trapping, `aria-modal="true"`, and scroll locking (`ConfirmDialog` & `ui/dialog.tsx` handle `Escape`, while inline modals in `bayar/page.tsx`, `tenants/page.tsx`, `saas-billing/page.tsx` do **not**). |
| **Inputs & Forms** | `.input` (`globals.css`) vs inline `px-3.5 py-2.5 ...` vs `px-4 py-3 ...` | Some forms bind `<label htmlFor>` (`PengaduanForm`, `login`), while `O2WHeroCorePortal.tsx`, `mitra/page.tsx`, `bayar/page.tsx`, `m/survei/page.tsx` omit `htmlFor`/`id` pairs. |
| **Tables** | Custom `<table>` in every page + `TableSkeleton` used only in `saas-billing` and `crm-prospek` | Desktop tables lack consistent sticky headers, sort indicators, and horizontal scroll wrappers in 4 Core BI pages (`saas-billing`, `revenue`, `tenant-roi`, `environmental-impact`). |
| **Icons** | `lucide-react` (`^1.31.0`) mixed with **raw inline `<svg>`** (`m/layout.tsx`, `pengeluaran/page.tsx`, `Toast.tsx`, `ConfirmDialog.tsx`) and **Unicode emojis** (`🚛`, `⏳`, `✓`, `🎉`, `💬`, `📄`, `🖨️`) | Mixing Lucide stroke icons with emojis inside production buttons and badges creates inconsistent visual tone, especially in enterprise SaaS (`CoreSaaSDashboard` vs `bayar` vs `laporan`). |
| **Toast Notifications** | `ToastProvider` (`useToast` hook + global `toast()` singleton) | `marketplace/page.tsx` still calls native `alert()`. `m/pengaduan/page.tsx` mixes `toast()` and an inline `toastMsg` banner. |
| **Empty, Loading & Error States** | `AnimatedDumpTruck` (`/bayar`), `TableSkeleton` (2 pages), plain text `"Memuat..."` (most admin pages), `error.tsx` & `not-found.tsx` | Most admin tables show plain `"Memuat..."` instead of skeletons; `not-found.tsx` hardcodes `"UPS HERU"`; `bayar/page.tsx` renders an empty `<h1>` during loading. |

---

## 4. Recommended Dual-Brand Design System Architecture

To preserve distinct identities without duplicating logic, implement a **Shared Structural Primitive Layer + Dual Theme Tokens** (`@theme` CSS variables per host):

### A. Shared Primitives (`src/components/ui/`)
Expand `src/components/ui/` (aligned with shadcn/ui + Radix accessibility) to replace ad-hoc inline markup:
1. `Button` (fix `shadow-xs` -> `shadow-sm`, `bg-emerald-600` -> `bg-emerald-700` or `--brand-primary` token)
2. `Dialog` / `Sheet` (enforce `Escape` close, backdrop click, `aria-modal`, focus trap — retire inline `fixed inset-0` modals)
3. `Card` (`Card`, `CardHeader`, `CardTitle`, `CardContent`)
4. `Input` / `Select` / `Textarea` / `FormField` (enforces `htmlFor`, `aria-describedby` error text, `min-h-[44px]` touch target on mobile)
5. `DataTable` (responsive container `overflow-x-auto` + optional mobile card slot + `TableSkeleton` loading + unified `EmptyState`)
6. `Badge` / `StatusPill` (semantic tokens: `success`, `warning`, `danger`, `info`, `neutral` with >=4.5:1 contrast)

### B. Brand Token Profiles (CSS Variables on `<html>` or Layout Wrapper)
- **UPS HERU Profile (`data-brand="upsheru"` / tenant default)**:
  - Primary: `#047857` (`emerald-700`, contrast 5.48:1 with white) & Forest Teal `#0c3d3a` / `#0d7a75`
  - Surface: `#f8fafc` (light) / `#09090b` (dark — explicitly opt-in or fix all public pages to support `.dark`)
  - Radius: `rounded-xl` (controls) / `rounded-2xl` (cards)
  - Voice: Friendly civic trust, clear Indonesian labels, `lucide-react` icons replacing raw emojis in CTAs
- **O2W HERO Profile (`data-brand="o2whero"`)**:
  - Primary: `#0284c7` (`sky-600` / `#0369a1` `sky-700` for white text AA) + `#10b981` (`emerald-500` on dark `slate-950` surfaces with `slate-950` dark text!)
  - Surface: `#020617` (`slate-950`) for marketing; clean `slate-50` / `zinc-950` + unified `sky-950` Control Tower banner (replace 5 discordant header gradients)
  - Radius: `rounded-xl` (controls) / `rounded-2xl` (cards)

### C. Immediate CSS Cleanup Checklist
1. Remove all 473 Tailwind v4 class usages (`shadow-xs`, `shadow-2xs`, `backdrop-blur-xs`, `outline-hidden`) or migrate intentionally to Tailwind v4.
2. Fix all 413 contrast violations so `npm run check:classes` passes with `0` errors.
3. Replace `globals.css` `!important` dark-mode & radius overrides with explicit component primitives over 2–3 sprints.
