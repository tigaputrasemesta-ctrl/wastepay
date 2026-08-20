import "dotenv/config";
import pg from "pg";

// ── Data master tarif (sumber kebenaran) ─────────────────────────────────────
const KATEGORI = [
  { kategori: "rumah_tangga",     label: "Rumah Tangga",              tarif: 50000,  deskripsi: "Rumah hunian keluarga biasa, sampah domestik harian standar (organik & anorganik rumah tangga)." },
  { kategori: "kost",             label: "Kost / Kontrakan",          tarif: 40000,  deskripsi: "Rumah kost/kontrakan dengan beberapa kamar sewa; volume sampah dihitung per bangunan, bukan per penghuni." },
  { kategori: "bisnis_kelas_1",   label: "Bisnis / Toko Kelas 1",     tarif: 50000,  deskripsi: "Usaha skala kecil: toko kelontong, minimarket, kios, warung retail dengan volume sampah harian rendah–sedang." },
  { kategori: "bisnis_kelas_2",   label: "Bisnis / Toko Kelas 2",     tarif: 100000, deskripsi: "Usaha skala menengah: toko grosir, ruko multi-unit, showroom dengan volume sampah lebih tinggi dari Kelas 1." },
  { kategori: "bisnis_kelas_3",   label: "Bisnis / Toko Kelas 3",     tarif: 200000, deskripsi: "Usaha skala besar: supermarket, department store, atau bisnis dengan produksi sampah harian tinggi dan butuh pengangkutan lebih sering." },
  { kategori: "perkantoran_kecil", label: "Perkantoran Kecil",        tarif: 100000, deskripsi: "Kantor dengan jumlah karyawan terbatas (±1–10 orang), umumnya sampah kertas/administrasi, volume rendah." },
  { kategori: "perkantoran_sedang", label: "Perkantoran Sedang",      tarif: 200000, deskripsi: "Kantor menengah (±11–30 karyawan), volume sampah kertas & non-organik lebih besar." },
  { kategori: "perkantoran_besar", label: "Perkantoran Besar",        tarif: 350000, deskripsi: "Gedung perkantoran/kantor pusat dengan banyak karyawan, produksi sampah tinggi dan rutin." },
  { kategori: "restoran",         label: "Rumah Makan / Restoran",    tarif: 75000,  deskripsi: "Usaha kuliner dengan sampah organik/sisa makanan tinggi, butuh pengangkutan lebih sering karena risiko bau." },
  { kategori: "warung",           label: "Warung Kecil",              tarif: 30000,  deskripsi: "Warung makan/jajanan skala mikro, volume sampah rendah, biasanya operasional rumahan." },
  { kategori: "sekolah",          label: "Sekolah / Lembaga Pendidikan", tarif: 75000, deskripsi: "Sekolah, kampus, atau tempat kursus; sampah kertas, plastik kemasan jajanan, dan sampah umum area publik." },
  { kategori: "klinik",           label: "Klinik / Puskesmas",        tarif: 100000, deskripsi: "Fasilitas kesehatan skala kecil-menengah; perlu penanganan khusus jika ada sampah medis (dipisah dari sampah umum)." },
  { kategori: "rumah_sakit",      label: "Rumah Sakit",               tarif: 500000, deskripsi: "Fasilitas kesehatan besar dengan volume tinggi dan potensi limbah medis yang butuh penanganan khusus/berizin." },
  { kategori: "hotel",            label: "Hotel / Penginapan",        tarif: 250000, deskripsi: "Akomodasi dengan banyak kamar/tamu, volume sampah tinggi dan kontinu setiap hari." },
  { kategori: "pasar_kios",       label: "Pasar / Kios",              tarif: 25000,  deskripsi: "Kios di area pasar tradisional/modern, tarif per unit kios, volume sampah bervariasi tergantung jenis dagangan." },
  { kategori: "tempat_ibadah",    label: "Tempat Ibadah",             tarif: 20000,  deskripsi: "Masjid, gereja, vihara, dll; umumnya tarif rendah/subsidi karena sifat non-komersial." },
  { kategori: "industri",         label: "Industri / Pabrik",         tarif: 750000, deskripsi: "Fasilitas produksi dengan volume sampah besar dan berpotensi mengandung limbah non-domestik (perlu cek regulasi limbah B3 terpisah)." },
  { kategori: "fasum",            label: "Fasilitas Umum (RT/RW)",    tarif: 15000,  deskripsi: "Pos ronda, balai warga, taman RT/RW; tarif nominal karena penggunaan bersama dan volume kecil." },
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
