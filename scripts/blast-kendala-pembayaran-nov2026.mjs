#!/usr/bin/env node
/**
 * Blast WhatsApp Fonnte: Tanya Kendala Pembayaran (November 2026)
 *
 * Sasaran: Pelanggan aktif yang tertunggak & belum lunas bulan November 2026
 * Pembuka: "Selamat siang Kak [Nama]. Apakah ada kendala di pembayaran..."
 * Pengirim: HP Admin UPS HERU via Fonnte API (0814-0078-2617)
 *
 * Fitur Aman:
 *   - Auto Checkpoint: Catat nomor yang sudah terkirim agar tidak dobel kirim
 *   - Normalisasi No Telp: Format 628xxx valid
 *   - Rate Limiting: Delay 2 detik antar pesan agar akun WA aman
 *   - Opsi Filter: --limit, --status (hanya tunggakan atau belum_bayar), --kelurahan, --zona
 *   - Mode Test: --test --phone=08xxxx untuk coba kirim ke 1 nomor dulu
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Load environment variables
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '').trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
const FONNTE_TOKEN = process.env.WA_API_KEY?.trim() || 'yZeWGJymbrnTpub2x5rL';
const FONNTE_URL = process.env.WA_API_URL?.trim() || 'https://api.fonnte.com/send';
const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';
const APP_BASE = 'https://upsheru.com';

const CHECKPOINT_FILE = path.join(ROOT_DIR, 'data', 'blast_kendala_nov2026_checkpoints.json');

const LOG_FILE = path.join(ROOT_DIR, 'data', 'blast_kendala_nov2026.log');

function logToFile(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

const DELAY_MS = 2000; // 2 detik delay antar pesan
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Normalisasi nomor telepon ke format 628xxx
export function normalizePhone(raw) {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (clean.startsWith('08')) clean = '62' + clean.slice(1);
  else if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

export function formatRupiah(num) {
  return 'Rp ' + Math.round(num || 0).toLocaleString('id-ID');
}

// Load Checkpoint
function loadCheckpoints() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      return new Set(data.sent || []);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

// Save Checkpoint
function saveCheckpoints(sentSet) {
  const dir = path.dirname(CHECKPOINT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify({ sent: Array.from(sentSet), updatedAt: new Date().toISOString() }, null, 2)
  );
}

// Format Pesan Ramah Kendala Pembayaran
export function buildMessage(customer) {
  const nama = customer.nama ? customer.nama.trim() : 'Kakak';
  const tagihan = formatRupiah(customer.jumlah);
  const inv = customer.noInvoice || `INV/${customer.kodePelanggan}/202611`;
  const paymentLink = `${APP_BASE}/bayar-tagihan?invoice=${encodeURIComponent(inv)}`;
  const statusLabel = customer.status === 'tunggakan' ? 'telah melewati tanggal jatuh tempo' : 'jatuh tempo pada bulan ini';

  return `Selamat siang Kak *${nama}* 😊🙏

Apakah ada kendala di pembayaran iuran pengangkutan sampah UPS HERU untuk periode *November 2026*?

Berikut rincian tagihan Kakak:
📄 *No. Tagihan* : ${inv}
💰 *Total Tagihan* : ${tagihan}
📌 *Status* : ${customer.status === 'tunggakan' ? 'Menunggak' : 'Belum Lunas'} (${statusLabel})

Untuk kemudahan pembayaran, Kakak bisa langsung bayar via QRIS (semua Bank / GoPay / OVO / Dana / ShopeePay) melalui tautan resmi ini:
👉 ${paymentLink}
*(Scan QRIS otomatis terverifikasi lunas tanpa perlu kirim struk konfirmasi)*

Atau melalui portal mandiri:
👉 https://upsheru.com/bayar

Jika Kakak mengalami kendala aplikasi, butuh keringanan pembayaran, atau sampah di rumah ada yang belum terangkut, silakan langsung balas pesan WhatsApp ini ya Kak. Tim kami siap membantu sepenuh hati. 🤝

Terima kasih banyak atas perhatian dan kerja samanya Kak ${nama}! 🙏✨
—
*UPS HERU Kota Depok*
Pusat Bantuan & Pengaduan: https://upsheru.com/pengaduan
Website: www.upsheru.com`;
}

// Cek Koneksi Device Fonnte
async function checkFonnteDevice() {
  try {
    const res = await fetch(FONNTE_DEVICE_URL, {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
    });
    return await res.json();
  } catch (err) {
    return { status: false, error: err.message };
  }
}

// Kirim Pesan via Fonnte
async function sendFonnteMessage(targetPhone, message) {
  try {
    const res = await fetch(FONNTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: FONNTE_TOKEN,
      },
      body: JSON.stringify({
        target: targetPhone,
        message: message,
        countryCode: '62',
      }),
    });
    return await res.json();
  } catch (err) {
    return { status: false, reason: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isSend = args.includes('--send');
  const isTest = args.includes('--test');
  const phoneArg = args.find((a) => a.startsWith('--phone='))?.split('=')[1];
  const limitArg = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
  const kelurahanArg = args.find((a) => a.startsWith('--kelurahan='))?.split('=')[1]?.toLowerCase();
  const statusFilter = args.find((a) => a.startsWith('--status='))?.split('=')[1]?.toLowerCase();

  console.log('====================================================');
  console.log('   BLAST FONNTE: KENDALA PEMBAYARAN NOVEMBER 2026   ');
  console.log('====================================================');

  // 1. Cek Koneksi Device Fonnte
  console.log('\n🔍 Memeriksa koneksi Fonnte...');
  const dev = await checkFonnteDevice();
  console.log(`📱 Device      : ${dev.device || '-'} (${dev.name || '-'})`);
  console.log(`📡 Status      : ${dev.device_status || (dev.status ? 'OK' : 'Error')}`);
  console.log(`🎟️ Sisa Kuota  : ${dev.quota ?? '-'}`);

  if (dev.device_status && dev.device_status !== 'connect') {
    console.error('❌ Peringatan: Device WhatsApp terputus dari Fonnte. Sambungkan terlebih dahulu.');
    if (isSend) process.exit(1);
  }

  // 2. Mode Test Pengiriman ke 1 Nomor
  if (isTest) {
    const target = normalizePhone(phoneArg);
    if (!target) {
      console.error('❌ Mohon sertakan nomor tujuan test: --test --phone=08xxxxxxxxxx');
      process.exit(1);
    }
    console.log(`\n🧪 Mengirim pesan uji coba ke ${target}...`);
    const sampleCustomer = {
      nama: 'Warga Contoh',
      jumlah: 50000,
      noInvoice: 'INV/CONTOH/202611',
      status: 'tunggakan',
      kodePelanggan: '08123456789',
    };
    const testMsg = buildMessage(sampleCustomer);
    console.log('\n--- ISI PESAN UJI COBA ---');
    console.log(testMsg);
    console.log('---------------------------\n');

    const result = await sendFonnteMessage(target, testMsg);
    console.log('Hasil Respon Fonnte:', result);
    process.exit(0);
  }

  // 3. Ambil data dari Database
  const pool = new Pool({ connectionString: DATABASE_URL });
  const dbRes = await pool.query(`
    SELECT 
      p.id as "pelangganId",
      p."kodePelanggan",
      p.nama,
      p."noTelepon",
      COALESCE(k.nama, 'Tanpa Kelurahan') as kelurahan,
      COALESCE(w.nama, 'Tanpa Zona') as zona,
      p."rtRw",
      t.status,
      t.jumlah,
      to_char(t."jatuhTempo", 'YYYY-MM-DD') as jatuh_tempo,
      t."noInvoice"
    FROM "Tagihan" t
    JOIN "Pelanggan" p ON t."pelangganId" = p.id
    LEFT JOIN "Kelurahan" k ON p."kelurahanId" = k.id
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    WHERE t.tahun = 2026 AND t.bulan = 11 AND t."deletedAt" IS NULL AND p."deletedAt" IS NULL AND p.status = 'aktif'
      AND t.status IN ('belum_bayar', 'tunggakan')
    ORDER BY t.status DESC, t.jumlah DESC, p.nama ASC;
  `);
  await pool.end();

  let customers = dbRes.rows;

  // Filter bila ada opsi
  if (kelurahanArg) {
    customers = customers.filter((c) => c.kelurahan.toLowerCase().includes(kelurahanArg));
  }
  if (statusFilter) {
    customers = customers.filter((c) => c.status.toLowerCase() === statusFilter);
  }

  // Muat Checkpoint
  const checkpoints = loadCheckpoints();
  const unhandled = customers.filter((c) => {
    const p = normalizePhone(c.noTelepon);
    return p && !checkpoints.has(p);
  });

  console.log(`\n📊 Total Tagihan Belum Lunas : ${customers.length}`);
  console.log(`   - Sudah pernah dikirim  : ${checkpoints.size}`);
  console.log(`   - Belum dikirim         : ${unhandled.length}`);

  let targets = unhandled;
  if (limitArg > 0) {
    targets = targets.slice(0, limitArg);
    console.log(`🎯 Dibatasi (limit)        : ${targets.length} target`);
  }

  // Jika bukan mode --send, jalankan Simulasi (Dry Run)
  if (!isSend) {
    console.log('\n====================================================');
    console.log('               MODE SIMULASI (DRY RUN)              ');
    console.log('====================================================');
    console.log('Pesan TIDAK dikirim. Gunakan argumen berikut untuk eksekusi:');
    console.log('  1. Test kirim 1 nomor : node scripts/blast-kendala-pembayaran-nov2026.mjs --test --phone=08xxxxxxxx');
    console.log('  2. Kirim bertahap 10  : node scripts/blast-kendala-pembayaran-nov2026.mjs --send --limit=10');
    console.log('  3. Kirim per kelurahan: node scripts/blast-kendala-pembayaran-nov2026.mjs --send --kelurahan=Cilodong');
    console.log('  4. Kirim semua target : node scripts/blast-kendala-pembayaran-nov2026.mjs --send');
    console.log('----------------------------------------------------');

    if (targets.length > 0) {
      console.log('\nPreview Pesan untuk Target Pertama:');
      console.log(`Penerima: ${targets[0].nama} (${targets[0].noTelepon} - ${targets[0].kelurahan})`);
      console.log('----------------------------------------------------');
      console.log(buildMessage(targets[0]));
      console.log('----------------------------------------------------');
    }
    process.exit(0);
  }

  // LIVE SENDING
  console.log(`\n🚀 MEMULAI PENGIRIMAN LIVE KE ${targets.length} NOMOR...`);
  logToFile(`START BLAST: Total ${targets.length} target`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const cust = targets[i];
    const phone = normalizePhone(cust.noTelepon);
    const msg = buildMessage(cust);

    process.stdout.write(`[${i + 1}/${targets.length}] Kirim ke ${cust.nama} (${phone})... `);

    const res = await sendFonnteMessage(phone, msg);
    if (res && res.status) {
      console.log('✅ Terkirim');
      logToFile(`SUCCESS: [${i + 1}/${targets.length}] ${cust.nama} (${phone}) - ${cust.noInvoice}`);
      checkpoints.add(phone);
      saveCheckpoints(checkpoints);
      successCount++;
    } else {
      const reason = res?.reason || JSON.stringify(res);
      console.log(`❌ Gagal: ${reason}`);
      logToFile(`FAIL: [${i + 1}/${targets.length}] ${cust.nama} (${phone}) - Reason: ${reason}`);
      failCount++;

      // Jika terputus perangkat, jangan diteruskan agar kuota / flow aman
      if (reason && reason.toLowerCase().includes('device disconnected')) {
        console.error('⚠️ Device terdeteksi disconnected! Hentikan blast sementara.');
        logToFile('ABORT: Device disconnected');
        break;
      }
    }

    if (i < targets.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n====================================================');
  console.log('               PENGIRIMAN SELESAI                   ');
  console.log('====================================================');
  console.log(`✅ Berhasil Terkirim : ${successCount}`);
  console.log(`❌ Gagal            : ${failCount}`);
  console.log(`💾 Checkpoint Saved : ${checkpoints.size} nomor`);
  logToFile(`FINISH: Berhasil ${successCount}, Gagal ${failCount}, Checkpoint: ${checkpoints.size}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
