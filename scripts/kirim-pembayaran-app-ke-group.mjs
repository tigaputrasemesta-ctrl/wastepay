import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { Pool } from "pg";

const TARGET_GROUP = "120363432695009362@g.us"; // UPS HERU PEMBAYARAN VIA APP
const FONNTE_API_KEY = process.env.WA_API_KEY || "yZeWGJymbrnTpub2x5rL";
const FONNTE_API_URL = process.env.WA_API_URL || "https://api.fonnte.com/send";

const rawConnectionString = process.env.DATABASE_URL?.trim();
if (!rawConnectionString) {
  console.error("DATABASE_URL is not defined in env!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, ""),
  ssl: { rejectUnauthorized: false },
});

const DUITKU_CODE_NAMES = {
  VC: "Credit Card",
  BK: "BCA KlikPay",
  M1: "Mandiri Virtual Account",
  BT: "Permata Virtual Account",
  B1: "CIMB Niaga Virtual Account",
  A1: "ATM Bersama",
  I1: "BNI Virtual Account",
  VA: "Maybank Virtual Account",
  OV: "OVO",
  OVO: "OVO",
  DA: "DANA",
  DANA: "DANA",
  SA: "ShopeePay App",
  SP: "ShopeePay",
  SL: "ShopeePay",
  LQ: "LinkAja",
  LA: "LinkAja (QRIS)",
  LF: "LinkAja Fixed",
  OL: "OVO (Direct)",
  SQ: "QRIS",
  BC: "BCA Virtual Account",
  BR: "BRI Virtual Account",
  NC: "Bank Neo Commerce / BNC VA",
  B2: "Danamon Virtual Account",
  FT: "Pegadaian / ALFA / POS",
};

const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatTanggalIndo(date) {
  const d = new Date(date);
  return `${d.getDate()} ${BULAN_INDO[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRupiah(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID") + ",-";
}

function labelMetode(code) {
  if (!code) return "Payment Gateway";
  return DUITKU_CODE_NAMES[code.toUpperCase()] || code;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWhatsApp(target, message) {
  const res = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: FONNTE_API_KEY,
    },
    body: JSON.stringify({
      target,
      message,
      countryCode: "62",
    }),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data && data.status !== false) {
    return { ok: true, data };
  }
  return { ok: false, error: data?.reason || data?.message || `HTTP ${res.status}` };
}

async function main() {
  console.log(`Mengambil data pembayaran via app/payment gateway sejak September 2026...`);
  
  const query = `
    SELECT 
      p.id as pembayaran_id,
      p.tanggal,
      p.jumlah,
      p.metode,
      p.status as pembayaran_status,
      p.catatan,
      t.id as tagihan_id,
      t."noInvoice",
      t.bulan,
      t.tahun,
      c.id as pelanggan_id,
      c.nama as pelanggan_nama,
      c."noTelepon" as pelanggan_telepon,
      c."kodePelanggan",
      d."paymentMethod",
      d."orderId"
    FROM "Pembayaran" p
    JOIN "Tagihan" t ON p."tagihanId" = t.id
    JOIN "Pelanggan" c ON p."pelangganId" = c.id
    LEFT JOIN "DuitkuTransaction" d ON d."pembayaranId" = p.id
    WHERE p.metode = 'duitku' AND p.status = 'terverifikasi'
      AND p.tanggal >= '2026-09-01'
    ORDER BY p.tanggal ASC
  `;

  const { rows } = await pool.query(query);
  console.log(`Ditemukan ${rows.length} transaksi pembayaran terverifikasi.`);

  let suksesKirim = 0;
  let gagalKirim = 0;
  let totalNominal = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    totalNominal += Number(r.jumlah);
    const channelName = labelMetode(r.paymentMethod);
    const invoiceNo = r.noInvoice || `#${r.tagihan_id}`;
    const custIdentifier = r.kodePelanggan ? ` (${r.kodePelanggan})` : (r.pelanggan_telepon ? ` (${r.pelanggan_telepon})` : "");
    const waktuStr = formatTanggalIndo(r.tanggal);

    const pesan = [
      `💰 *LAPORAN PEMBAYARAN MASUK — UPS HERU*`,
      ``,
      `Halo Pengelola / Owner,`,
      `Pembayaran tagihan pelanggan telah berhasil diterima & tercatat di sistem:`,
      ``,
      `📄 *No. Invoice*   : ${invoiceNo}`,
      `👤 *Pelanggan*     : ${r.pelanggan_nama}${custIdentifier}`,
      `💵 *Total Diterima* : *${formatRupiah(r.jumlah)}*`,
      `💳 *Metode*        : ${channelName} (Via App / Payment Gateway)`,
      `📅 *Waktu*         : ${waktuStr}`,
      ``,
      `📊 *Pantau Dashboard*:`,
      `👉 https://upsheru.com/pembayaran`,
      ``,
      `— Sistem Notifikasi UPS HERU`,
    ].join("\n");

    const judul = `Laporan Pembayaran: ${invoiceNo} - ${r.pelanggan_nama}`;

    console.log(`[${i + 1}/${rows.length}] Mengirim invoice ${invoiceNo} (${r.pelanggan_nama}) ke grup...`);

    const result = await sendWhatsApp(TARGET_GROUP, pesan);

    if (result.ok) {
      suksesKirim++;
      console.log(`   ✅ Terkirim`);
      // Simpan catatan notifikasi
      try {
        await pool.query(
          `INSERT INTO "Notifikasi" (tipe, judul, pesan, penerima, status, "pelangganId", "dikirimPada", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          ["laporan_pembayaran_app", judul, pesan, TARGET_GROUP, "terkirim", r.pelanggan_id]
        );
      } catch (dbErr) {
        console.error(`   ⚠️ Gagal mencatat notifikasi ke DB:`, dbErr.message);
      }
    } else {
      gagalKirim++;
      console.error(`   ❌ Gagal:`, result.error);
      try {
        await pool.query(
          `INSERT INTO "Notifikasi" (tipe, judul, pesan, penerima, status, error, "pelangganId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          ["laporan_pembayaran_app", judul, pesan, TARGET_GROUP, "gagal", result.error, r.pelanggan_id]
        );
      } catch (dbErr) {
        console.error(`   ⚠️ Gagal mencatat notifikasi error ke DB:`, dbErr.message);
      }
    }

    // Delay 1.5 detik antar pesan agar antrean Fonnte lancar dan aman
    if (i < rows.length - 1) {
      await sleep(1500);
    }
  }

  // Kirim pesan rekap penutup
  console.log(`\nMengirim pesan rekapitulasi ke grup...`);
  const pesanRekap = [
    `📊 *REKAPITULASI PEMBAYARAN VIA APP & PAYMENT GATEWAY*`,
    ``,
    `Alhamdulillah, sinkronisasi riwayat pembayaran via Aplikasi & Payment Gateway telah selesai:`,
    ``,
    `📌 *Periode*          : September s.d. Sekarang (26 Oktober 2026)`,
    `🔢 *Jumlah Transaksi* : ${rows.length} Pembayaran`,
    `💵 *Total Pemasukan*  : *${formatRupiah(totalNominal)}*`,
    `✅ *Status*           : Berhasil disinkronkan (${suksesKirim} terkirim, ${gagalKirim} gagal)`,
    ``,
    `Semua pembayaran telah tervalidasi otomatis dan tagihan berstatus LUNAS di sistem WastePay / UPS HERU.`,
    ``,
    `— Tim Operasional UPS HERU`,
  ].join("\n");

  await sleep(1500);
  const rekapResult = await sendWhatsApp(TARGET_GROUP, pesanRekap);
  if (rekapResult.ok) {
    console.log(`✅ Pesan rekapitulasi berhasil terkirim ke grup.`);
    await pool.query(
      `INSERT INTO "Notifikasi" (tipe, judul, pesan, penerima, status, "dikirimPada", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      ["laporan_pembayaran_app_rekap", "Rekapitulasi Pembayaran Via App", pesanRekap, TARGET_GROUP, "terkirim"]
    );
  } else {
    console.error(`❌ Gagal mengirim rekapitulasi:`, rekapResult.error);
  }

  console.log(`\n🎉 SELESAI! Total ${suksesKirim}/${rows.length} laporan pembayaran berhasil dikirimkan ke grup.`);
  pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  pool.end();
  process.exit(1);
});
