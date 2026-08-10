/**
 * Rate limiter — dua lapis:
 *
 * 1. Production (env UPSTASH_REDIS_REST_URL + TOKEN di-set):
 *    sliding window di Redis (Upstash). Cache key dibagi antar instance
 *    serverless — brute-force/scraping tidak bisa dielakkan dengan
 *    berganti instance.
 *
 * 2. Development / tanpa Upstash:
 *    fallback in-memory per proses (cukup untuk dev lokal; catatan:
 *    multi-instance memerlukan Upstash/Redis).
 *
 * API: `allowAttempt(key, opts?)` async — return true jika diizinkan.
 *      `retryAfterSeconds(key)` — detik tersisa sampai window reset.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_ATTEMPTS = 6;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const useUpstash = Boolean(upstashUrl && upstashToken);

// Cache instance Ratelimit per kombinasi (max, windowMs) — Redis client dibagi.
const limiters = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;

function getLimiter(max: number, windowMs: number): Ratelimit {
  const key = `${max}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    if (!redisClient) {
      redisClient = new Redis({ url: upstashUrl!, token: upstashToken! });
    }
    const seconds = Math.max(1, Math.ceil(windowMs / 1000));
    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(max, `${seconds} s`),
      prefix: `rl:${key}`,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// Fallback in-memory (dev) — bucket per key + resetAt terakhir untuk retryAfter.
const buckets = new Map<string, { count: number; resetAt: number }>();
// resetAt terakhir yang diketahui per key (dipakai Upstash juga untuk retryAfter).
const lastResetAt = new Map<string, number>();

function cleanup() {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

/**
 * Periksa + catat percobaan. Return true jika masih diizinkan.
 *
 * Default: 6 percobaan / 15 menit (brute-force login, formulir publik).
 * Untuk use-case dengan profil lalu lintas berbeda, beri opts:
 *   - `max`      — jumlah percobaan maksimal per window.
 *   - `windowMs` — panjang window dalam milidetik.
 *
 * Contoh: cek tagihan publik (banyak user sah) → max 60 / 15 menit;
 *         pembuatan transaksi Duitku (jarang) → max 10 / 15 menit.
 */
export async function allowAttempt(
  key: string,
  opts?: { max?: number; windowMs?: number }
): Promise<boolean> {
  const max = opts?.max ?? MAX_ATTEMPTS;
  const windowMs = opts?.windowMs ?? WINDOW_MS;

  if (useUpstash) {
    const limiter = getLimiter(max, windowMs);
    const { success, reset } = await limiter.limit(key);
    lastResetAt.set(key, reset);
    return success;
  }

  cleanup();
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    lastResetAt.set(key, now + windowMs);
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

/** Detik tersisa sampai window reset (untuk pesan error). */
export function retryAfterSeconds(key: string): number {
  const reset = lastResetAt.get(key);
  if (reset) return Math.max(0, Math.ceil((reset - Date.now()) / 1000));
  const b = buckets.get(key);
  if (!b) return 0;
  return Math.max(0, Math.ceil((b.resetAt - Date.now()) / 1000));
}
