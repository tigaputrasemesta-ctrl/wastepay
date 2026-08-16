// Simplify: petugas diassign per Kelurahan saja (wilayahId jadi opsional/legacy).
// - ALTER wilayahId DROP NOT NULL
// - Backfill kelurahanId dari wilayah lama bila masih NULL
import "dotenv/config";
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE "Petugas" ALTER COLUMN "wilayahId" DROP NOT NULL`);
  const back = await client.query(`UPDATE "Petugas" p SET "kelurahanId" = w."kelurahanId" FROM "Wilayah" w WHERE w.id = p."wilayahId" AND p."kelurahanId" IS NULL`);
  await client.query("COMMIT");
  console.log("OK. Petugas dengan kelurahanId di-backfill:", back.rowCount);
  const c = await client.query(`SELECT COUNT(*)::int c FROM "Petugas" WHERE "kelurahanId" IS NULL`);
  console.log("Sisa petugas tanpa kelurahanId:", c.rows[0].c);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("ERR:", e.message);
} finally {
  client.release();
  await pool.end();
}
