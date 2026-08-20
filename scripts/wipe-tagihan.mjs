import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    console.log("Menghapus data...");
    
    const dt = await client.query('DELETE FROM "DuitkuTransaction"');
    console.log(`- ${dt.rowCount} DuitkuTransaction dihapus`);

    const p = await client.query('DELETE FROM "Pembayaran"');
    console.log(`- ${p.rowCount} Pembayaran dihapus`);

    const t = await client.query('DELETE FROM "Tagihan"');
    console.log(`- ${t.rowCount} Tagihan dihapus`);

    await client.query("COMMIT");
    console.log("Selesai menghapus semua data tagihan dan pembayaran.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Gagal:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
