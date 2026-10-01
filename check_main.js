const { Client } = require("pg");
const rawConnectionString = "postgresql://postgres.melqztzdrcsiiimrwhky:WastePay2026SecurePass!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT p.id, p.nama, p."wilayahId", w."zonaId" as "wilayah_zonaId", j."ruteId", j.hari
    FROM "Pelanggan" p
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    LEFT JOIN "Jadwal" j ON p.id = j."pelangganId"
    WHERE p.nama = 'Test Main Branch'
    ORDER BY p.id DESC
    LIMIT 1;
  `);
  console.log(res.rows);
  await client.end();
}
main();
