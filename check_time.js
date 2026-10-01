const { Client } = require("pg");
const rawConnectionString = "postgresql://postgres.melqztzdrcsiiimrwhky:WastePay2026SecurePass!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT id, nama, "createdAt", "wilayahId" FROM "Pelanggan" WHERE nama = 'Test AI Auto';
  `);
  console.log(res.rows);
  await client.end();
}
main();
