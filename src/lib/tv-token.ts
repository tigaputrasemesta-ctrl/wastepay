import { timingSafeEqual, createHash } from "crypto";

function getDerivedTvToken(): string {
  const seed = process.env.JWT_SECRET || "wastepay-tv-view-secure-seed";
  return createHash("sha256").update(`${seed}:tv-view-token`).digest("hex").slice(0, 32);
}

/**
 * Validasi token akses "TV mode" / "Peta Keseluruhan Pelanggan" menggunakan
 * perbandingan constant-time agar token tidak bisa ditebak via timing attack.
 *
 * Token disimpan di env `TV_VIEW_TOKEN`, `MAP_VIEW_TOKEN`, atau `PETA_TOKEN`.
 */
export function tvTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  const candidate = token.trim();
  if (!candidate) return false;

  const validTokens: string[] = [
    process.env.TV_VIEW_TOKEN?.trim(),
    process.env.MAP_VIEW_TOKEN?.trim(),
    process.env.PETA_TOKEN?.trim(),
    getDerivedTvToken(),
  ].filter((t): t is string => Boolean(t && t.length > 0));

  const candidateBuf = Buffer.from(candidate);

  for (const expected of validTokens) {
    const expectedBuf = Buffer.from(expected);
    if (candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf)) {
      return true;
    }
  }

  return false;
}

/**
 * Mengambil token default aktif untuk digunakan saat men-generate URL peta ber-token.
 */
export function getDefaultMapToken(): string {
  return (
    process.env.TV_VIEW_TOKEN?.trim() ||
    process.env.MAP_VIEW_TOKEN?.trim() ||
    process.env.PETA_TOKEN?.trim() ||
    getDerivedTvToken()
  );
}
