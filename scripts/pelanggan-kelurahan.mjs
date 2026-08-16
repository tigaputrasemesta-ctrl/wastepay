// Pelanggan di-anchor langsung ke Kelurahan (wilayahId jadi legacy).
// - Tambah Kelurahan.kode (prefix kode pelanggan)
// - Tambah Pelanggan.kelurahanId
// - Backfill keduanya dari data Wilayah lama
import "dotenv/config";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE "Kelurahan" ADD COLUMN IF NOT EXISTS "kode" TEXT`);
  await client.query(`ALTER TABLE "Pelanggan" ADD COLUMN IF NOT EXISTS "kelurahanId" INTEGER`);

  // Backfill kode kelurahan dari wilayah utama (kode paling awal per kelurahan)
  const kode = await client.query(`
    UPDATE "Kelurahan" k SET "kode" = sub.kode FROM (
      SELECT DISTINCT ON ("kelurahanId") "kelurahanId", "kode"
      FROM "Wilayah"
      WHERE "kelurahanId" IS NOT NULL AND "kode" IS NOT NULL AND "kode" <> ''
      ORDER BY "kelurahanId", id
    ) sub
    WHERE sub."kelurahanId" = k.id AND k."kode" IS NULL
  `);

  // Backfill pelanggan.kelurahanId dari wilayah
  const back = await client.query(`
    UPDATE "Pelanggan" p SET "kelurahanId" = w."kelurahanId"
    FROM "Wilayah" w WHERE w.id = p."wilayahId" AND p."kelurahanId" IS NULL
  `);

  // Buat unique index bila belum ada (Kelurahan.kode unique di schema)
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Kelurahan_kode_key" ON "Kelurahan"("kode")`);

  await client.query("COMMIT");
  console.log("OK. Kelurahan.kode di-backfill:", kode.rowCount);
  console.log("Pelanggan.kelurahanId di-backfill:", back.rowCount);
  const sisa = await client.query(`SELECT COUNT(*)::int c FROM "Pelanggan" WHERE "kelurahanId" IS NULL`);
  console.log("Sisa pelanggan tanpa kelurahanId:", sisa.rows[0].c);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("ERR:", e.message);
} finally {
  client.release();
  await pool.end();
}
