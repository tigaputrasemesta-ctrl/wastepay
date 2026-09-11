# Fullstack Architectural Patterns

## 1. Server Actions vs. API Routes (Next.js)
- **Use Server Actions** for form mutations, RPC-like operations, and tightly coupled UI mutations.
  - Always validate input with Zod inside the action.
  - Always verify user authentication and permissions inside the action.
  - Use `revalidatePath` or `revalidateTag` to purge cached views.
- **Use API Routes (`/api/...`)** for:
  - Public webhooks (Stripe, GitHub, Slack).
  - External mobile app consumers.
  - Streaming endpoints or file upload handlers.

## 2. Database Connection Management
In serverless or edge environments, database connection pooling is critical.
- Use connection poolers like PgBouncer, Prisma Accelerate, or Supabase connection pooling to prevent exceeding database connection limits.
