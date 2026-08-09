// Migrasi data dari dev.db (SQLite, era lokal) → Supabase (Postgres production).
// - Menyalin SEMUA tabel kecuali User (di production sudah ada set user sendiri).
// - Menjaga ID asli agar relasi (FK) tetap valid.
// - Skip baris yang ID-nya sudah ada (aman dijalankan ulang / idempotent).
// - Setelah insert, sequence Postgres disinkronkan ke MAX(id).
//
// Jalankan: node scripts/migrate-devdb-to-supabase.mjs
import "dotenv/config";
import { createClient } from "@libsql/client";
import { Pool } from "pg";

const local = createClient({ url: "file:./dev.db" });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
  max: 5,
});

// Tabel yang dimigrasi (urutan = prioritas FK: referensi dulu, baru yang mereferensikan).
// User sengaja TIDAK dimigrasi — production sudah punya akun sendiri.
const TABLES = [
  "Wilayah",
  "KategoriTarif",
  "Paket",
  "Tpa",
  "TitikTransit",
  "Pelanggan",
  "Petugas",
  "Kendaraan", // FK → Petugas
  "Rute",
  "Jadwal",
  "Tagihan",
  "Pembayaran",
  "Pengangkutan",
  "Komplain",
  "Pengumuman",
  "Pengeluaran",
  "Rekonsiliasi",
  "Pengaturan",
];

function toPgValue(v, col) {
  if (v === null || v === undefined) return null;
  // Boolean di SQLite disimpan 0/1
  if (col.endsWith("aktif") || col === "penting" || col === "isLunas" || col === "selesai" || col === "dibaca") {
    return !!v;
  }
  // Timestamp ISO "2026-08-09T00:18:50.631+00:00"
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return v; // Postgres menerima ISO 8601
  }
  return v;
}

async function migrateTable(name) {
  const rows = await local.execute(`SELECT * FROM "${name}"`);
  if (rows.rows.length === 0) {
    console.log(`${name}: 0 baris (skip)`);
    return { inserted: 0, skipped: 0 };
  }
  const cols = Object.keys(rows.rows[0]);
  const hasId = cols.includes("id");

  let inserted = 0;
  let skipped = 0;
  for (const row of rows.rows) {
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const paramList = cols.map((_, i) => `$${i + 1}`).join(", ");
    const values = cols.map((c) => toPgValue(row[c], c));
    try {
      await pool.query(
        `INSERT INTO "${name}" (${colList}) VALUES (${paramList}) ON CONFLICT ("id") DO NOTHING`,
        values
      );
      inserted++;
    } catch (e) {
      // Konflik non-id (mis. unique constraint lain) → laporkan, jangan gagalkan semua
      if (hasId && /duplicate key|unique/i.test(e.message)) {
        skipped++;
        console.log(`  ${name} id=${row.id}: skip (${e.message.slice(0, 80)})`);
      } else {
        console.error(`  ${name} id=${row.id}: GAGAL — ${e.message.slice(0, 160)}`);
      }
    }
  }

  // Sinkronkan sequence
  if (hasId) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('"${name}"', 'id'), (SELECT COALESCE(MAX(id),1) FROM "${name}"))`
    );
  }
  console.log(`${name}: ${rows.rows.length} dibaca → ${inserted} dimasukkan, ${skipped} skip`);
  return { inserted, skipped };
}

async function main() {
  let total = 0;
  for (const t of TABLES) {
    const r = await migrateTable(t);
    total += r.inserted;
  }
  console.log(`\nSelesai. Total baris dimasukkan: ${total}`);
  await pool.end();
  local.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
