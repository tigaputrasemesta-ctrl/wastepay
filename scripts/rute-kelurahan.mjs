// Rute diassign per Kelurahan (wilayahId jadi legacy/opsional).
// - Tambah kolom kelurahanId
// - Drop NOT NULL wilayahId
// - Backfill kelurahanId dari wilayah lama
import "dotenv/config";
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE "Rute" ADD COLUMN IF NOT EXISTS "kelurahanId" INTEGER`);
  await client.query(`ALTER TABLE "Rute" ALTER COLUMN "wilayahId" DROP NOT NULL`);
  const back = await client.query(`UPDATE "Rute" r SET "kelurahanId" = w."kelurahanId" FROM "Wilayah" w WHERE w.id = r."wilayahId" AND r."kelurahanId" IS NULL`);
  await client.query("COMMIT");
  console.log("OK. Rute di-backfill kelurahanId:", back.rowCount);
  const c = await client.query(`SELECT COUNT(*)::int c FROM "Rute" WHERE "kelurahanId" IS NULL`);
  console.log("Sisa rute tanpa kelurahanId:", c.rows[0].c);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("ERR:", e.message);
} finally {
  client.release();
  await pool.end();
}
