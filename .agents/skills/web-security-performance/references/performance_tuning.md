# Performance Tuning & Optimization Guide

## 1. Caching Strategies
- **Static Assets**: `Cache-Control: public, max-age=31536000, immutable` (for hashed assets).
- **Dynamic API responses**: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- **Database Query Caching**: Cache expensive aggregation queries in Redis with time-to-live (TTL) and key invalidation on mutation.

## 2. React Rendering Optimization
- Do not wrap every component in `React.memo`. Use memoization only when:
  - The component renders often with identical props.
  - The component tree below is expensive.
- Avoid passing inline object literals or new function instances to memoized child components.
