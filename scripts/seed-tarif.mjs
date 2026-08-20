import "dotenv/config";
import pg from "pg";

// ── Data master tarif (sumber kebenaran) ─────────────────────────────────────
const KATEGORI = [
  { kategori: "level_1",  label: "Level 1",  tarif: 50000,  deskripsi: "Volume sangat kecil (rumah tangga kecil, kost, usaha mikro)." },
  { kategori: "level_2",  label: "Level 2",  tarif: 100000, deskripsi: "Volume kecil–sedang (rumah tangga besar, warung, kantor kecil)." },
  { kategori: "level_3",  label: "Level 3",  tarif: 150000, deskripsi: "Volume sedang (usaha menengah, kantor sedang, restoran kecil)." },
  { kategori: "level_4",  label: "Level 4",  tarif: 200000, deskripsi: "Volume sedang–besar (kantor besar, restoran, klinik)." },
  { kategori: "level_5",  label: "Level 5",  tarif: 250000, deskripsi: "Volume besar (hotel kecil, sekolah, minimarket)." },
  { kategori: "level_6",  label: "Level 6",  tarif: 300000, deskripsi: "Volume sangat besar (fasilitas ramai, usaha besar)." },
  { kategori: "level_7",  label: "Level 7",  tarif: 350000, deskripsi: "Volume ekstra besar (usaha skala besar, gedung multi-unit)." },
  { kategori: "level_8",  label: "Level 8",  tarif: 400000, deskripsi: "Volume sangat ekstra (kawasan komersial besar, kampus)." },
  { kategori: "level_9",  label: "Level 9",  tarif: 450000, deskripsi: "Volume maksimal (kawasan industri, rumah sakit besar)." },
  { kategori: "level_10", label: "Level 10", tarif: 500000, deskripsi: "Volume korporat (kawasan skala maksimum, multi-fasilitas)." },
];

const PAKET = [
  { kode: "paket_mbg",          nama: "Paket MBG",                 harga: 1500000, deskripsi: "Layanan khusus untuk dapur Program Makan Bergizi Gratis (MBG), volume sampah organik sisa produksi makanan skala besar, pengangkutan intensif." },
  { kode: "paket_event",        nama: "Paket Event/Hajatan",       harga: null,    deskripsi: "Layanan sekali angkut untuk acara pernikahan, hajatan, atau kegiatan besar sementara; tarif dihitung per hari/per event (variabel)." },
  { kode: "paket_konstruksi",   nama: "Paket Konstruksi/Renovasi", harga: null,    deskripsi: "Pengangkutan sampah puing bangunan, material bekas renovasi; tarif per rit angkut atau per m³ (variabel)." },
  { kode: "paket_tahunan",      nama: "Paket Langganan Tahunan",   harga: null,    deskripsi: "Diskon untuk pelanggan yang komit bayar/kontrak 1 tahun penuh, berlaku untuk kategori dasar manapun (variabel)." },
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");

    // 1) Upsert kategori tarif
    for (const k of KATEGORI) {
      await c.query(
        `INSERT INTO "KategoriTarif" (kategori, label, tarif, deskripsi, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, now(), now())
         ON CONFLICT (kategori) DO UPDATE SET label = EXCLUDED.label, tarif = EXCLUDED.tarif, deskripsi = EXCLUDED.deskripsi, "updatedAt" = now()`,
        [k.kategori, k.label, k.tarif, k.deskripsi]
      );
    }

    // 1b) Migrasi pelanggan dari skema kategori lama ke Level
    const migPelanggan = await c.query(
      `UPDATE "Pelanggan" SET kategori = 'level_1', "updatedAt" = now()
       WHERE kategori IN ('rumah_tangga','kost','bisnis','bisnis_kelas_1','bisnis_kelas_2','bisnis_kelas_3','restoran','warung','perkantoran','perkantoran_kecil','perkantoran_sedang','perkantoran_besar','sekolah','klinik','rumah_sakit','hotel','pasar_kios','tempat_ibadah','industri','fasum','lainnya')`
    );
    if (migPelanggan.rowCount > 0) console.log(`Pelanggan dimigrasi ke level_1: ${migPelanggan.rowCount} baris`);

    const kodeList = KATEGORI.map((k) => k.kategori);
    const delKat = await c.query(
      `DELETE FROM "KategoriTarif" WHERE kategori != ALL($1::text[])`,
      [kodeList]
    );
    console.log(`KategoriTarif: ${KATEGORI.length} di-upsert, ${delKat.rowCount} kode lama dihapus`);

    // 2) Rapikan baris paket MBG lama (kode masih NULL) agar tidak dobel
    const fixMbg = await c.query(
      `UPDATE "Paket" SET kode = 'paket_mbg' WHERE kode IS NULL AND (nama ILIKE '%MBG%')`
    );
    if (fixMbg.rowCount > 0) console.log(`Paket MBG lama dikasih kode paket_mbg (${fixMbg.rowCount} baris)`);

    // 3) Upsert paket
    for (const p of PAKET) {
      await c.query(
        `INSERT INTO "Paket" (kode, nama, harga, deskripsi, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, now(), now())
         ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama, harga = EXCLUDED.harga, deskripsi = EXCLUDED.deskripsi, "updatedAt" = now()`,
        [p.kode, p.nama, p.harga, p.deskripsi]
      );
    }
    console.log(`Paket: ${PAKET.length} di-upsert`);

    await c.query("COMMIT");
    console.log("Selesai. Seed tarif berhasil.");
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Gagal:", e);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
