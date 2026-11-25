import "dotenv/config";
import pkgPg from "pg";
const Pool = pkgPg.Pool || pkgPg.default?.Pool || pkgPg;
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const rawDbUrl = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
if (!rawDbUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const cleanDbUrl = rawDbUrl.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: { rejectUnauthorized: false },
});

async function saveBase64ToFile(str, subfolder, id) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const isDataUri = trimmed.startsWith("data:image/");
  const isRawBase64 = !trimmed.startsWith("/") && !trimmed.startsWith("http") && trimmed.length > 500;

  if (!isDataUri && !isRawBase64) return null;

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
    if (buffer.length < 20) return null;

    const hash = crypto.randomBytes(6).toString("hex");
    const filename = `${subfolder}_${id}_${Date.now()}_${hash}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);

    await mkdir(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);
    await writeFile(fullPath, buffer);

    return { url: `/uploads/${subfolder}/${filename}`, size: buffer.length };
  } catch (e) {
    console.error(`Failed to save image for ${subfolder} id ${id}:`, e.message);
    return null;
  }
}

async function runMigration() {
  console.log("=== MEMULAI MIGRASI BASE64 IMAGE KE FILE STORAGE (DIRECT SQL) ===");
  let totalSavedBytes = 0;
  let totalMigrated = 0;

  const client = await pool.connect();
  try {
    // 1. Pelanggan (fotoRumah)
    console.log("\n[1/3] Memeriksa foto rumah pelanggan...");
    const { rows: pelangganList } = await client.query('SELECT id, "fotoRumah" FROM "Pelanggan" WHERE "fotoRumah" IS NOT NULL');
    const base64Pelanggan = pelangganList.filter(
      (p) => p.fotoRumah && (p.fotoRumah.startsWith("data:image") || (!p.fotoRumah.startsWith("/") && !p.fotoRumah.startsWith("http") && p.fotoRumah.length > 500))
    );
    console.log(`Ditemukan ${base64Pelanggan.length} foto rumah Base64.`);

    for (const p of base64Pelanggan) {
      const res = await saveBase64ToFile(p.fotoRumah, "pelanggan", p.id);
      if (res) {
        await client.query('UPDATE "Pelanggan" SET "fotoRumah" = $1 WHERE id = $2', [res.url, p.id]);
        totalSavedBytes += p.fotoRumah.length;
        totalMigrated++;
      }
    }

    // 2. Pembayaran (buktiBayar)
    console.log("\n[2/3] Memeriksa bukti bayar...");
    const { rows: pembayaranList } = await client.query('SELECT id, "buktiBayar" FROM "Pembayaran" WHERE "buktiBayar" IS NOT NULL');
    const base64Pembayaran = pembayaranList.filter(
      (b) => b.buktiBayar && (b.buktiBayar.startsWith("data:image") || (!b.buktiBayar.startsWith("/") && !b.buktiBayar.startsWith("http") && b.buktiBayar.length > 500))
    );
    console.log(`Ditemukan ${base64Pembayaran.length} bukti bayar Base64.`);

    for (const b of base64Pembayaran) {
      const res = await saveBase64ToFile(b.buktiBayar, "pembayaran", b.id);
      if (res) {
        await client.query('UPDATE "Pembayaran" SET "buktiBayar" = $1 WHERE id = $2', [res.url, b.id]);
        totalSavedBytes += b.buktiBayar.length;
        totalMigrated++;
      }
    }

    // 3. Komplain (foto)
    console.log("\n[3/3] Memeriksa foto komplain...");
    const { rows: komplainList } = await client.query('SELECT id, foto FROM "Komplain" WHERE foto IS NOT NULL');
    const base64Komplain = komplainList.filter(
      (k) => k.foto && (k.foto.startsWith("data:image") || (!k.foto.startsWith("/") && !k.foto.startsWith("http") && k.foto.length > 500))
    );
    console.log(`Ditemukan ${base64Komplain.length} foto komplain Base64.`);

    for (const k of base64Komplain) {
      const res = await saveBase64ToFile(k.foto, "komplain", k.id);
      if (res) {
        await client.query('UPDATE "Komplain" SET foto = $1 WHERE id = $2', [res.url, k.id]);
        totalSavedBytes += k.foto.length;
        totalMigrated++;
      }
    }

    console.log("\n=======================================================");
    console.log(`MIGRASI BERHASIL!`);
    console.log(`Total record dimigrasikan: ${totalMigrated}`);
    console.log(`Estimasi string data Base64 dibersihkan dari DB: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log("=======================================================");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
