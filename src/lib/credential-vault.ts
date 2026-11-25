import crypto from "crypto";
import { JWT_SECRET_STRING } from "./secret";

/**
 * Vault Kredensial Terenkripsi untuk Multi-Tenant Integration Secrets (AES-256-GCM)
 * Mengamankan WA API Key, Duitku API Key, dan token webhook saat disimpan di database PostgreSQL.
 */

// Kunci enkripsi 32-byte diturunkan menggunakan SHA-256 dari SECRET
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || JWT_SECRET_STRING || "wastepay-credential-encryption-key-32";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
const ALGORITHM = "aes-256-gcm";

/**
 * Mengenkripsi plaintext sensitif menjadi string terenkripsi: "enc:iv:tag:ciphertext"
 */
export function encryptCredential(plaintext: string | null | undefined): string | null {
  if (!plaintext || typeof plaintext !== "string" || plaintext.trim().length === 0) {
    return null;
  }

  // Jika sudah terenkripsi, jangan enkripsi ulang
  if (plaintext.startsWith("enc:")) {
    return plaintext;
  }

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag().toString("hex");
    return `enc:${iv.toString("hex")}:${tag}:${encrypted}`;
  } catch (err) {
    console.error("[CredentialVault Encryption Error]", err);
    return plaintext;
  }
}

/**
 * Mendekripsi string ciphertext kembali ke plaintext original.
 * Jika string belum terenkripsi (legacy plaintext), kembalikan langsung dengan aman.
 */
export function decryptCredential(ciphertext: string | null | undefined): string {
  if (!ciphertext || typeof ciphertext !== "string" || ciphertext.trim().length === 0) {
    return "";
  }

  // Jika bukan format terenkripsi (legacy data), kembalikan apa adanya
  if (!ciphertext.startsWith("enc:")) {
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 4) return ciphertext;

    const [, ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.warn("[CredentialVault Decryption Failed, returning fallback]", err);
    return "";
  }
}
