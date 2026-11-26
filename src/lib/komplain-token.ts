import { createHash, timingSafeEqual } from "crypto";

function getKomplainSecret(): string {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "wastepay-komplain-secret-key-2026";
}

/**
 * Generate token aman 16-karakter untuk tautan 1-Klik Petugas tanpa perlu login.
 */
export function generateKomplainToken(komplainId: number, pelangganId: number): string {
  const secret = getKomplainSecret();
  return createHash("sha256")
    .update(`${secret}:komplain:${komplainId}:pelanggan:${pelangganId}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Validasi token penyelesaian komplain secara constant-time (anti timing-attack).
 */
export function verifyKomplainToken(
  token: string | null | undefined,
  komplainId: number,
  pelangganId: number
): boolean {
  if (!token || typeof token !== "string") return false;
  const candidate = token.trim().toLowerCase();
  const expected = generateKomplainToken(komplainId, pelangganId).toLowerCase();

  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
