---
name: web-app-architect
description: >-
  Expert guide for designing, architecting, and building fullstack web applications. Covers modern frontend
  (React 19, Next.js App Router, Vue 3, Tailwind CSS, TypeScript), robust backend APIs (REST, tRPC, GraphQL),
  database modeling (Prisma, Drizzle, PostgreSQL), and state management. Use whenever building, scaffolding,
  or refactoring web applications.
---

# Web Application Architect & Fullstack Mastery

This skill provides production-tested architectural blueprints, state management patterns, and fullstack conventions for building world-class web applications.

---

## 1. Modern Frontend Architecture (Next.js / React)

### A. The Server/Client Component Boundary (RSC)
- **Default to React Server Components (RSC)**:
  - Keep data fetching, database access, heavy dependencies, and sensitive environment variables on the server.
  - Generates zero client JavaScript bundle.
- **Push `'use client'` to the Leaves**:
  - Only wrap interactive components (buttons with state, modals, forms using hooks) in `'use client'`.
  - Pass server-rendered children into client wrappers via `children` prop to preserve streaming and server rendering benefits.

```tsx
// Server Component (Default)
import { ProductGallery } from './ProductGallery'; // 'use client' component
import { db } from '@/lib/db';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">{product.title}</h1>
      {/* Interactive client component receives serialized server data */}
      <ProductGallery images={product.images} initialLikes={product.likes} />
    </main>
  );
}
```

### B. State Management Triad
1. **Server Cache / Server State**:
   - Next.js fetch cache or TanStack Query (React Query) for server-synced data.
   - Built-in deduplication, background revalidation, and caching.
2. **URL Search Parameters**:
   - Filters, pagination, active tabs, search keywords.
   - Ensures copy-pasting the URL preserves the exact user view.
3. **Local / Global Client State**:
   - Local: `useState`, `useReducer`.
   - Cross-component / App-wide: Zustand (clean, lightweight, no boilerplate).

---

## 2. Robust Backend & API Architecture

### A. Schema Validation at the Edge
Always validate payloads with Zod before running business logic:

```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }).trim().toLowerCase(),
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Must contain at least one number" }),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

### B. Database Schema & Query Optimization
- **Foreign Keys**: Always declare indexes on foreign keys to avoid full table scans during joins.
- **Transactions**: Wrap related write operations in an atomic transaction:
```typescript
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.inventory.decrementStock({ items: orderData.items });
  await tx.auditLog.record({ action: 'ORDER_CREATED', orderId: order.id });
});
```
- **Avoid N+1 Queries**: Use `include` or batch queries (`DataLoader`) instead of querying the database inside a `map` loop.

---

## References & Deep Dives
- [Frontend Mastery Guide](./references/frontend_mastery.md)
- [Backend Mastery Guide](./references/backend_mastery.md)
- [Fullstack Architectural Patterns](./references/fullstack_patterns.md)
