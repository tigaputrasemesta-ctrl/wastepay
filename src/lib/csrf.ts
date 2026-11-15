/**
 * CSRF protection — pertahanan berbasis Origin/Referer untuk API mutasi
 * yang memakai cookie sesi (JWT httpOnly).
 *
 * Mengapa cukup? Sesi O2W dikirim via cookie (SameSite=Lax). Serangan
 * CSRF klasik memanfaatkan cookie yang terkirim otomatis pada request
 * cross-site. Pertahanan standar:
 *   1. SameSite=Lax (sudah ada) — memblokir POST cross-site di browser modern.
 *   2. Validasi Origin/Referer (ini) — lapis kedua untuk browser yang
 *      melewati SameSite maupun saat cookie `SameSite=None` di masa depan.
 *
 * Aturan:
 *   - Header `Origin` ada  → harus masuk daftar origin yang diizinkan.
 *   - Tanpa `Origin`       → fallback ke header `Referer` (jika ada).
 *   - Tanpa keduanya       → diizinkan (non-browser client: cron, script,
 *     curl — bukan vektor CSRF).
 *   - `Origin: null`       → ditolak (iframe sandbox / context aneh).
 */

/** Ambil origin (skema + host + port) dari URL absolut; null jika invalid. */
export function extractOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Verifikasi asal request mutasi.
 * @param origin Header `Origin` (boleh null).
 * @param referer Header `Referer` (boleh null).
 * @param allowedOrigins Daftar origin milik aplikasi (array atau Set).
 */
export function isSameOriginRequest(
  origin: string | null,
  referer: string | null,
  allowedOrigins: string[] | Set<string>
): boolean {
  const check = (val: string) => {
    const clean = val.trim();
    if (allowedOrigins instanceof Set) {
      if (allowedOrigins.has(clean)) return true;
      const normalized = extractOrigin(clean);
      return normalized !== null && allowedOrigins.has(normalized);
    }
    if (allowedOrigins.includes(clean)) return true;
    const normalized = extractOrigin(clean);
    return normalized !== null && allowedOrigins.includes(normalized);
  };

  if (origin) {
    if (origin === "null") return false;
    return check(origin);
  }
  if (referer) {
    const refOrigin = extractOrigin(referer);
    return refOrigin !== null && refOrigin !== "null" && check(refOrigin);
  }
  return true;
}
