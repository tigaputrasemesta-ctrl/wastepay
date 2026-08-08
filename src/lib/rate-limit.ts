/**
 * Rate limiter sederhana in-memory (per proses dev).
 * Untuk production multi-instance, gunakan store terdistribusi (Redis dll).
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_ATTEMPTS = 6;

const buckets = new Map<string, { count: number; resetAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

/** Periksa + catat percobaan. Return true jika masih diizinkan. */
export function allowAttempt(key: string): boolean {
  cleanup();
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_ATTEMPTS) return false;
  b.count += 1;
  return true;
}

/** Detik tersisa sampai window reset (untuk pesan error). */
export function retryAfterSeconds(key: string): number {
  const b = buckets.get(key);
  if (!b) return 0;
  return Math.max(0, Math.ceil((b.resetAt - Date.now()) / 1000));
}
