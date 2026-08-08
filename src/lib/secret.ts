/**
 * JWT signing key.
 *
 * Di production: WAJIB ada di env (JWT_SECRET). Jika tidak ada, server menolak
 * untuk berjalan — mencegah pemakaian secret yang bisa ditebak.
 * Di development: dibuat acak per proses (sesi akan invalid saat restart).
 */
import { randomBytes } from "crypto";

function loadJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET belum diatur. Set JWT_SECRET di environment variables sebelum production."
    );
  }

  // Dev-only: ephemeral random secret. Tambahkan JWT_SECRET di .env jika
  // ingin sesi tetap valid antar restart.
  return `dev-${randomBytes(48).toString("base64url")}`;
}

const SECRET_STRING = loadJwtSecret();

/** String mentah JWT_SECRET. */
export const JWT_SECRET_STRING = SECRET_STRING;
export const JWT_SECRET = new TextEncoder().encode(SECRET_STRING);
export const COOKIE_NAME = "session";
