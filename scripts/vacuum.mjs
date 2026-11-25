import "dotenv/config";
import pkgPg from "pg";
const Pool = pkgPg.Pool || pkgPg.default?.Pool || pkgPg;

const rawDbUrl = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
const cleanDbUrl = rawDbUrl.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: { rejectUnauthorized: false },
});

async function runVacuum() {
  const client = await pool.connect();
  try {
    console.log("Menjalankan VACUUM ANALYZE pada tabel Pelanggan, Pembayaran, Komplain...");
    await client.query('VACUUM ANALYZE "Pelanggan"');
    await client.query('VACUUM ANALYZE "Pembayaran"');
    await client.query('VACUUM ANALYZE "Komplain"');
    console.log("VACUUM ANALYZE BERHASIL!");
  } finally {
    client.release();
    await pool.end();
  }
}

runVacuum().catch(console.error);
