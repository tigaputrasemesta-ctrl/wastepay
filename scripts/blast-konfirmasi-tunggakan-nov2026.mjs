#!/usr/bin/env node
/**
 * Blast WhatsApp Konfirmasi Pembayaran Tunggakan November 2026 (Tanpa Link)
 * 
 * Target: Warga status 'tunggakan' bulan November 2026
 * Pengirim: Fonnte WhatsApp API (0814-0078-2617 / UPSHERU.COM)
 * Kebijakan Pesan: ZERO LINKS (Tanpa tautan/URL apa pun demi kenyamanan & kepercayaan warga)
 *
 * Penggunaan:
 *   node scripts/blast-konfirmasi-tunggakan-nov2026.mjs                 # Mode Default: Dry-Run (Simulasi & Buat Report)
 *   node scripts/blast-konfirmasi-tunggakan-nov2026.mjs --status        # Cek status checkpoint & kuota Fonnte
 *   node scripts/blast-konfirmasi-tunggakan-nov2026.mjs --test --phone=08xxxx # Tes kirim 1 pesan ke nomor tester
 *   node scripts/blast-konfirmasi-tunggakan-nov2026.mjs --send          # LIVE SENDING (Hanya jika disetujui user)
 *   node scripts/blast-konfirmasi-tunggakan-nov2026.mjs --send --limit=10 # Kirim batch 10 pesan
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const FONNTE_TOKEN = process.env.WA_API_KEY?.trim() || 'yZeWGJymbrnTpub2x5rL';
const FONNTE_URL = 'https://api.fonnte.com/send';
const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';

const TARGET_FILE = path.join(ROOT_DIR, 'data', 'target_tunggakan_nov2026.json');
const CHECKPOINT_FILE = path.join(ROOT_DIR, 'data', 'checkpoint_konfirmasi_tunggakan_nov2026.json');
const REPORT_TERKIRIM_CSV = path.join(ROOT_DIR, 'data', 'report_tunggakan_nov2026_terkirim.csv');
const REPORT_TIDAK_TERKIRIM_CSV = path.join(ROOT_DIR, 'data', 'report_tunggakan_nov2026_tidak_terkirim.csv');
const LOG_FILE = path.join(ROOT_DIR, 'data', 'blast_konfirmasi_tunggakan_nov2026.log');

const DELAY_MS = 2500; // 2.5 detik jeda per pesan agar aman dari spam detection WA
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function logToFile(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

export function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

/**
 * Pilihan Format Pesan Ramah (ZERO LINKS - Tanpa Link Apa Pun)
 */
export function buildMessage(customer, templateOption = 1) {
  const nama = customer.nama ? customer.nama.trim() : 'Kakak';
  const nominal = formatRupiah(customer.jumlah);
  const inv = customer.noInvoice || `INV/${customer.kodePelanggan}/202611`;

  if (templateOption === 2) {
    // Opsi 2: To-the-Point & Ringkas
    return `Selamat siang Kak *${nama}*, salam dari UPS HERU Kota Depok 🙏

Kami ingin konfirmasi untuk iuran pengangkutan sampah periode *November 2026* sebesar *${nominal}* (No. Tagihan: ${inv}).

Di pencatatan sistem kami, tagihan ini belum terkonfirmasi lunas. Apabila Kakak sudah melakukan pembayaran (baik tunai kepada petugas keliling atau via transfer), mohon bantuannya untuk membalas chat ini ya Kak agar data pembayaran dapat langsung kami perbarui.

Ditunggu responnya ya Kak. Terima kasih banyak atas perhatian dan kerja samanya! 🙏✨
—
*Admin Operasional UPS HERU*`;
  }

  if (templateOption === 3) {
    // Opsi 3: Santai & Pendek
    return `Selamat siang Kak *${nama}* 😊🙏

Semoga sehat selalu ya Kak. Kami dari admin UPS HERU ingin menanyakan terkait iuran sampah bulan *November 2026* sebesar *${nominal}*.

Apakah kemarin sudah dibayarkan Kak? Jika sudah, mohon respon chat ini ya Kak agar kami bantu catatkan lunas di sistem. Namun jika belum atau ada kendala pengangkutan di rumah, silakan infokan ke kami di sini ya Kak.

Terima kasih banyak Kak ${nama}! 🤝
—
*UPS HERU Depok*`;
  }

  // Opsi 1 (Rekomendasi Utama: Sopan, Menghargai Warga, Lengkap & Zero Link)
  return `Selamat siang Kak *${nama}* 🙏😊

Mohon maaf mengganggu waktunya sebentar ya Kak. Kami dari tim admin UPS HERU ingin konfirmasi terkait iuran kebersihan sampah untuk periode *November 2026* sebesar *${nominal}* (No. Tagihan: ${inv}).

Apabila Kakak sudah melakukan pembayaran (baik titip tunai ke petugas lapangan saat pengangkutan atau via transfer bank/QRIS), mohon bantuannya untuk merespon chat ini ya Kak agar pembukuan di sistem kami bisa segera disesuaikan lunas.

Namun jika belum sempat atau ada kendala terkait jadwal pengangkutan sampah di rumah Kakak, silakan langsung balas pesan ini ya Kak, tim kami siap membantu sepenuh hati. 🤝

Ditunggu respon chatnya ya Kak. Terima kasih banyak atas perhatian dan kerja samanya! Sehat selalu sekeluarga 🙏✨
—
*Admin UPS HERU Kota Depok*`;
}

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

function saveCheckpoints(sentSet) {
  const dir = path.dirname(CHECKPOINT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify({ sent: Array.from(sentSet), updatedAt: new Date().toISOString() }, null, 2)
  );
}

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

export function writeReports(terkirimList, tidakTerkirimList) {
  // 1. Tulis CSV Terkirim
  const headerTerkirim = ['No', 'ID Pelanggan', 'Nama Warga', 'No Telepon WA', 'No Invoice', 'Jumlah Tagihan', 'Zona', 'Status Pengiriman', 'Waktu Kirim', 'Keterangan'];
  const rowsTerkirim = terkirimList.map((item, idx) => [
    idx + 1,
    `"${item.pelangganId}"`,
    `"${item.nama.replace(/"/g, '""')}"`,
    `"${item.noTeleponWA}"`,
    `"${item.noInvoice}"`,
    item.jumlah,
    `"${(item.zona || '-').replace(/"/g, '""')}"`,
    `"${item.statusKirim}"`,
    `"${item.waktuKirim || new Date().toISOString()}"`,
    `"${(item.keterangan || 'Sukses').replace(/"/g, '""')}"`,
  ].join(','));
  fs.writeFileSync(REPORT_TERKIRIM_CSV, [headerTerkirim.join(','), ...rowsTerkirim].join('\n'), 'utf8');

  // 2. Tulis CSV Tidak Terkirim
  const headerTidakTerkirim = ['No', 'ID Pelanggan', 'Nama Warga', 'No Telepon Asli', 'No Invoice', 'Jumlah Tagihan', 'Zona', 'Alasan Gagal / Tidak Terkirim'];
  const rowsTidakTerkirim = tidakTerkirimList.map((item, idx) => [
    idx + 1,
    `"${item.pelangganId}"`,
    `"${item.nama.replace(/"/g, '""')}"`,
    `"${item.noTeleponAsli || item.noTelepon || '-'}"`,
    `"${item.noInvoice}"`,
    item.jumlah,
    `"${(item.zona || '-').replace(/"/g, '""')}"`,
    `"${(item.alasanGagal || item.alasanValidasi || 'Gagal').replace(/"/g, '""')}"`,
  ].join(','));
  fs.writeFileSync(REPORT_TIDAK_TERKIRIM_CSV, [headerTidakTerkirim.join(','), ...rowsTidakTerkirim].join('\n'), 'utf8');

  console.log(`\n📄 Report tersimpan rapi:`);
  console.log(`   1. Terkirim      : ${REPORT_TERKIRIM_CSV} (${terkirimList.length} data)`);
  console.log(`   2. Tidak Terkirim: ${REPORT_TIDAK_TERKIRIM_CSV} (${tidakTerkirimList.length} data)`);
}

async function main() {
  const args = process.argv.slice(2);
  const isSend = args.includes('--send');
  const isTest = args.includes('--test');
  const isStatus = args.includes('--status');
  const templateOpt = parseInt(args.find((a) => a.startsWith('--opsi='))?.split('=')[1] || '1', 10);
  const phoneArg = args.find((a) => a.startsWith('--phone='))?.split('=')[1];
  const limitArg = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

  console.log('================================================================');
  console.log('   BLAST KONFIRMASI TUNGGAKAN NOVEMBER 2026 (ZERO LINKS)        ');
  console.log('================================================================\n');

  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ File target ${TARGET_FILE} tidak ditemukan!`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
  const allRecords = rawData.allRecords || [];
  const validRecords = allRecords.filter((r) => r.validWA);
  const invalidRecords = allRecords.filter((r) => !r.validWA);

  console.log(`📋 Total Target Tunggakan Pelanggan Aktif : ${allRecords.length}`);
  console.log(`   - Nomor Valid (Siap Kirim)            : ${validRecords.length}`);
  console.log(`   - Nomor Tidak Valid (Pasti Gagal)     : ${invalidRecords.length}`);

  // Mode Status
  if (isStatus) {
    const dev = await checkFonnteDevice();
    const sentSet = loadCheckpoints();
    console.log(`\n📱 Status WhatsApp Sender (Fonnte):`);
    console.log(`   - Perangkat : ${dev.device || '-'} (${dev.name || '-'})`);
    console.log(`   - Status    : ${dev.device_status || 'offline'}`);
    console.log(`   - Sisa Kuota: ${dev.quota || 0} pesan`);
    console.log(`   - Terkirim  : ${sentSet.size} / ${validRecords.length}`);
    return;
  }

  // Mode Test Kirim ke 1 Nomor HP Penguji
  if (isTest) {
    if (!phoneArg) {
      console.error('❌ Mohon cantumkan nomor tujuan uji coba: --test --phone=08xxxxxxxx');
      process.exit(1);
    }
    const sampleWarga = validRecords[0] || {
      nama: 'Warga Uji Coba',
      jumlah: 50000,
      noInvoice: 'INV/081234567890/202611',
    };
    const testMsg = buildMessage(sampleWarga, templateOpt);
    console.log(`🧪 Mengirim pesan uji coba (Opsi Template ${templateOpt}) ke: ${phoneArg}...`);
    console.log(`\n--- PREVIEW PESAN ---\n${testMsg}\n---------------------\n`);
    const res = await sendFonnteMessage(phoneArg, testMsg);
    console.log('Respon Fonnte:', res);
    return;
  }

  // Jika BUKAN --send, jalankan Simulasi Dry-Run
  if (!isSend) {
    console.log('\n🔒 MODE AMAN: DRY-RUN SIMULASI (TIDAK ADA PESAN YANG DIKIRIM)');
    console.log('   Untuk mengirim sungguhan, tambahkan flag --send setelah disetujui.\n');

    const sample = validRecords[0];
    console.log(`--- CONTOH TEMPLATE PESAN YANG AKAN DIKIRIM (Opsi ${templateOpt}) ---`);
    console.log(buildMessage(sample, templateOpt));
    console.log('------------------------------------------------------------------\n');

    // Buat laporan simulasi
    const simulasiTerkirim = validRecords.map((r) => ({
      ...r,
      statusKirim: 'Siap Dikirim (Simulasi Valid)',
      waktuKirim: new Date().toISOString(),
      keterangan: 'Format nomor valid',
    }));
    const simulasiTidakTerkirim = invalidRecords.map((r) => ({
      ...r,
      alasanGagal: r.alasanValidasi,
    }));

    writeReports(simulasiTerkirim, simulasiTidakTerkirim);
    return;
  }

  // LIVE SENDING (Hanya berjalan jika user eksplisit menyetujui)
  console.log('\n🚀 MEMULAI PENGIRIMAN SUNGGUHAN (LIVE SENDING)...');
  const dev = await checkFonnteDevice();
  if (dev.device_status !== 'connect') {
    console.error(`❌ Perangkat Fonnte ${dev.device} sedang disconnect! Blast dibatalkan.`);
    process.exit(1);
  }

  const sentSet = loadCheckpoints();
  const queue = validRecords.filter((r) => !sentSet.has(r.pelangganId));
  const finalQueue = limitArg > 0 ? queue.slice(0, limitArg) : queue;

  console.log(`🎯 Antrean siap kirim: ${finalQueue.length} warga (Sudah dikirim sebelumnya: ${sentSet.size})`);

  const listTerkirim = [];
  const listGagal = [...invalidRecords.map(r => ({ ...r, alasanGagal: r.alasanValidasi }))];

  for (let i = 0; i < finalQueue.length; i++) {
    const customer = finalQueue[i];
    const msg = buildMessage(customer, templateOpt);
    const target = customer.noTeleponWA;

    process.stdout.write(`[${i + 1}/${finalQueue.length}] Mengirim ke ${customer.nama} (${target})... `);
    const res = await sendFonnteMessage(target, msg);

    if (res.status === true || res.status === 'true') {
      console.log('✅ Sukses');
      sentSet.add(customer.pelangganId);
      listTerkirim.push({
        ...customer,
        statusKirim: 'Sukses Terkirim',
        waktuKirim: new Date().toISOString(),
        keterangan: `Fonnte ID: ${res.id || '-'}`,
      });
      logToFile(`SUKSES: ${customer.pelangganId} | ${customer.nama} | ${target} | Inv: ${customer.noInvoice}`);
    } else {
      console.log(`❌ Gagal: ${res.reason || res.message || 'Error API'}`);
      listGagal.push({
        ...customer,
        alasanGagal: `Gagal Kirim Fonnte: ${res.reason || res.message || 'Error API'}`,
      });
      logToFile(`GAGAL: ${customer.pelangganId} | ${customer.nama} | ${target} | Error: ${res.reason || res.message}`);
    }

    saveCheckpoints(sentSet);
    if (i < finalQueue.length - 1) await sleep(DELAY_MS);
  }

  writeReports(listTerkirim, listGagal);
  console.log('\n🎉 Proses blast selesai!');
}

main().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
