const { Client } = require("pg");
const rawConnectionString = "postgresql://postgres.melqztzdrcsiiimrwhky:WastePay2026SecurePass!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT w.* 
    FROM "Wilayah" w
    JOIN "Kelurahan" k ON w."kelurahanId" = k.id
    WHERE k.nama ILIKE '%Mekar Jaya%' AND w.rt = '01' AND w.rw = '02';
  `);
  console.log(res.rows);
  await client.end();
}
main();
