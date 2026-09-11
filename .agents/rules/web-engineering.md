# Rule: Web Engineering & Fullstack Architecture

This rule enforces modern standards for all web applications (React, Next.js, Node, TypeScript, Python, Tailwind, Databases).

## 1. Frontend Architecture
- **State Management**:
  - Prefer server state tools (TanStack Query, SWR, Next.js cache) over storing server data in global stores.
  - Keep client state local (`useState`, `useReducer`). For cross-component state, use lightweight stores (Zustand, Jotai).
  - Sync UI state (tabs, modals, filters, pagination) with URL search parameters for navigation fidelity.
- **Component Hygiene**:
  - Colocate related files: component, styles, tests, and types in the same feature folder.
  - Split large components (> 200 lines) into focused, single-responsibility sub-components.
  - Avoid unnecessary re-renders: stabilize object references with `useMemo`/`useCallback` only when profiling or passing to memoized children/dependencies.
- **Hydration & SSR**:
  - Guard browser-only APIs (`window`, `localStorage`, `document`) behind `useEffect` or dynamic imports with `{ ssr: false }`.
  - Ensure identical markup between server render and initial client render to prevent hydration mismatches.

## 2. Backend & API Engineering
- **Request Lifecycle**:
  - Input validation -> Authentication -> Authorization -> Business Domain Logic -> Data Persistence -> Structured Response.
  - Validate all input with Zod or Pydantic. Reject invalid payloads early with `422 Unprocessable Entity` or `400 Bad Request`.
- **Database & Data Access**:
  - Never execute raw unparameterized SQL queries.
  - Use migrations for all schema modifications.
  - Manage database connection pooling properly; ensure connections are closed or returned to the pool.
  - Avoid fetching unnecessary columns (`SELECT *`); select only required fields.

## 3. Web Performance & Accessibility
- **Images & Assets**:
  - Use Next.js `<Image />` or modern picture formats (`webp`, `avif`).
  - Add descriptive `alt` text to all informative images; use `alt=""` with `aria-hidden="true"` for decorative images.
- **Forms & Inputs**:
  - Always associate `<label>` with `<input>` using `htmlFor` / `id`.
  - Provide inline validation error messages connected via `aria-describedby`.
  - Disable submit buttons during form submission to prevent duplicate transactions.
