import { timingSafeEqual } from "crypto";

/**
 * Validasi token akses "TV mode" (wallboard / layar besar) menggunakan
 * perbandingan constant-time agar token tidak bisa ditebak via timing attack.
 *
 * Token disimpan di env `TV_VIEW_TOKEN` (server-only, tidak pernah dikirim
 * ke client selain lewat URL/header saat akses halaman).
 */
export function tvTokenValid(token: string | null | undefined): boolean {
  const expected = process.env.TV_VIEW_TOKEN?.trim();
  if (!expected || !token) return false;

  const a = Buffer.from(token.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
