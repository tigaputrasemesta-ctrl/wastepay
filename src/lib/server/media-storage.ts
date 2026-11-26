import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Mendeteksi apakah string adalah Base64 image payload.
 * Jika ya, simpan ke filesystem terisolasi per tenant (/public/uploads/tenants/[tenantId]/[subfolder]/...)
 * dan kembalikan URL statisnya.
 * Jika bukan (misal sudah berupa URL "/uploads/..." atau null), kembalikan apa adanya.
 */
export async function persistBase64Image(
  dataStr: string | null | undefined,
  subfolder: "pelanggan" | "pembayaran" | "komplain" = "pelanggan",
  tenantId?: string | null
): Promise<string | null | undefined> {
  if (!dataStr || typeof dataStr !== "string") return dataStr;

  const trimmed = dataStr.trim();
  const isDataUri = trimmed.startsWith("data:image/");
  const isRawBase64 = !trimmed.startsWith("/") && !trimmed.startsWith("http") && trimmed.length > 500;

  if (!isDataUri && !isRawBase64) {
    return dataStr; // Sudah berupa URL atau path biasa
  }

  try {
    let ext = ".jpg";
    let base64Data = trimmed;

    if (isDataUri) {
      const match = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
      if (match) {
        ext = match[1] === "png" ? ".png" : match[1] === "webp" ? ".webp" : ".jpg";
        base64Data = trimmed.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
      }
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length < 20) return dataStr; // Bukan buffer gambar valid

    const hash = crypto.randomBytes(8).toString("hex");
    const filename = `${subfolder}_${Date.now()}_${hash}${ext}`;
    
    // Segmentasi folder per tenant untuk isolasi berkas media
    const safeTenantDir = tenantId ? path.join("tenants", tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")) : "";
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeTenantDir, subfolder);

    await mkdir(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);
    await writeFile(fullPath, buffer);

    return safeTenantDir
      ? `/uploads/${safeTenantDir.replace(/\\/g, "/")}/${subfolder}/${filename}`
      : `/uploads/${subfolder}/${filename}`;
  } catch (err) {
    console.error("[persistBase64Image Error]", err);
    return null;
  }
}
