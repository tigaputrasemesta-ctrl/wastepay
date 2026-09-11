---
name: web-security-performance
description: >-
  Audit, harden, and optimize web applications for enterprise-grade security (OWASP Top 10, auth, CSP,
  sanitization, rate limiting) and peak performance (Core Web Vitals, SSR caching, bundle optimization, memoization).
  Use whenever reviewing code for security vulnerabilities, optimizing page load times, or preparing for production.
---

# Web Security & Performance Optimization

This skill equips Antigravity with protocols to detect security vulnerabilities, enforce defensive hygiene, and maximize web application speed and responsiveness.

---

## 1. Security Protocol (OWASP Top 10 Defense)

### A. Injection & XSS Prevention
- **Never use `dangerouslySetInnerHTML`** with unvalidated or unsanitized content. If HTML rendering is mandatory, sanitize using `DOMPurify` / `sanitize-html`.
- **SQL / NoSQL Injection**: Always use parameterized queries or trusted ORMs (Prisma, Drizzle). Never concatenate raw strings into queries.

### B. Authentication & Token Management
- Store session tokens in `HttpOnly`, `Secure`, `SameSite=Strict` (or `Lax`) cookies.
- Never store JWTs or API keys in browser `localStorage` or `sessionStorage` (vulnerable to XSS extraction).
- Implement cryptographically secure token generation (`crypto.randomBytes` or `crypto.getRandomValues`).

### C. Critical HTTP Headers
Configure security headers on every response:
```typescript
// Next.js config or Express middleware
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; object-src 'none';" }
];
```

---

## 2. Web Performance & Core Web Vitals

| Metric | Target | Primary Causes & Fixes |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | < 2.5s | Optimize hero images (modern format, priority loading, preconnect), fast server response (SSR caching). |
| **INP** (Interaction to Next Paint) | < 200ms | Avoid long tasks on main thread (> 50ms), debounce input handlers, yield to main thread with `scheduler.yield()` or `setTimeout`. |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Explicit `width` and `height` on all media/images, reserve skeleton layout space, avoid inserting DOM above viewport. |

### Bundle Optimization & Code Splitting
- Dynamically import heavy libraries (e.g., charting, rich text editors) using `next/dynamic` or `React.lazy`:
```tsx
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />,
  ssr: false
});
```

---

## References & Playbooks
- [OWASP Top 10 Detailed Defenses](./references/owasp_top10.md)
- [Performance Tuning & Profiling Checklist](./references/performance_tuning.md)
