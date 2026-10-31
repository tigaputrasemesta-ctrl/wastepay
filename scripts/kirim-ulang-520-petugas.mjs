#!/usr/bin/env node
/**
 * CLI Script: Kirim Ulang 520 Kontak Tertunda (Data Kontrol UPS HERU)
 * 
 * Target: 520 Calon Pelanggan asal HP Petugas (0896-8815-1473) yang tertunda
 *         karena koneksi Fonnte terputus pada pengiriman putaran pertama.
 * 
 * Penggunaan:
 *   node scripts/kirim-ulang-520-petugas.mjs          # Simulasi Dry-Run (Aman, tanpa kirim WA)
 *   node scripts/kirim-ulang-520-petugas.mjs --send   # LIVE SENDING ke sisa target tertunda
 *   node scripts/kirim-ulang-520-petugas.mjs --status # Cek status checkpoint & device
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PENDING_FILE = path.join(ROOT_DIR, 'data', 'kontak_pending_resend_520.json');
const CHECKPOINT_FILES = [
  path.join(ROOT_DIR, 'data', 'blast_sent_checkpoints.json'),
  path.join(ROOT_DIR, 'scratch', 'blast_sent_checkpoints.json'),
];

const DEVICE_PETUGAS = {
  phone: '089688151473',
  label: 'HP Petugas Survei (0896-8815-1473 - Novi)',
  token: '8n46RV2x9GosQYgtAS1j',
};

const KNOWN_STAFF = new Set([
  '6281400782617', '6289688151473', '6281532843224', '6289602950531',
  '6282125115021', '62895385058054', '6289675528057', '6285353286062',
  '6289502703352', '6289675424339', '6285716251003', '6285836415075',
  '6285781219141', '6287742667520', '6283182628794', '6288290624931'
]);

function normalizePhone(raw) {
  if (!raw) return '';
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('08')) clean = '62' + clean.slice(1);
  else if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

function buildMessage(namaTarget) {
  const nama = namaTarget && namaTarget !== '-' ? namaTarget : 'Pelanggan Setia UPS HERU';
  return `*PEMBERITAHUAN RESMI — UPS HERU DEPOK* 🚛
Layanan Terpadu Pengangkutan Sampah Warga

Yth. Bapak/Ibu ${nama},

Demi meningkatkan mutu dan kepastian layanan penjemputan sampah, saat ini sistem operasional UPS HERU telah terintegrasi secara digital.

Bagi Bapak/Ibu yang sudah berlangganan tetapi nomornya belum terdaftar di sistem, mohon meluangkan waktu 1 menit untuk aktivasi data mandiri.

✨ *Keuntungan Rumah Anda Terdaftar di Sistem:*

1️⃣ *Bayar Iuran Lebih Praktis & Transparan*
Tagihan bulanan dan kuitansi otomatis masuk ke WhatsApp. Bisa bayar online 24 jam via QRIS (semua bank & e-wallet) atau tunai ke petugas tanpa khawatir kuitansi kertas hilang.

2️⃣ *Armada Pasti Tiba, Tidak Ada Rumah Terlewat*
Titik rumah Anda otomatis terhubung ke peta navigasi truk petugas. Sampah dijamin dijemput rutin sesuai jadwal, bahkan saat supir/petugas berganti.

3️⃣ *Layanan Pengaduan Cepat (Real-Time)*
Jika sampah belum terangkut atau ada kendala, laporan langsung mendapat *Nomor Tiket Resmi* dan otomatis terkirim ke HP petugas rute di lokasi untuk segera ditindaklanjuti.

---
👉 *Aktivasi Mandiri Sekarang (1 Menit, Bebas Biaya):*
https://upsheru.com/daftar

📞 *Pusat Bantuan & Layanan Pelanggan:*
WhatsApp Admin: https://wa.me/6281400782617 (0814-0078-2617)

Terima kasih atas kerja samanya dalam menjaga kebersihan lingkungan bersama kami. 🙏
_Manajemen UPS HERU (WastePay)_`;
}

function loadCheckpoints() {
  const set = new Set();
  for (const cf of CHECKPOINT_FILES) {
    if (fs.existsSync(cf)) {
      try {
        const arr = JSON.parse(fs.readFileSync(cf, 'utf8'));
        if (Array.isArray(arr)) {
          arr.forEach(p => set.add(normalizePhone(p)));
        }
      } catch {}
    }
  }
  return set;
}

function saveCheckpoint(phone) {
  const current = loadCheckpoints();
  current.add(phone);
  const arr = Array.from(current);
  for (const cf of CHECKPOINT_FILES) {
    fs.mkdirSync(path.dirname(cf), { recursive: true });
    fs.writeFileSync(cf, JSON.stringify(arr, null, 2));
  }
}

async function getLiveDbPhones() {
  const envText = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
  let dbUrl = '';
  for (const line of envText.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/['"]/g, '').trim();
    }
  }
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const dbRes = await pool.query('SELECT "noTelepon", "kodePelanggan" FROM "Pelanggan" WHERE "deletedAt" IS NULL');
  const dbPhones = new Set();
  for (const row of dbRes.rows) {
    if (row.noTelepon) dbPhones.add(normalizePhone(row.noTelepon));
    if (row.kodePelanggan) dbPhones.add(normalizePhone(row.kodePelanggan));
  }
  await pool.end();
  return dbPhones;
}

async function checkDeviceStatus() {
  try {
    const res = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: DEVICE_PETUGAS.token },
    });
    const data = await res.json().catch(() => null);
    return data;
  } catch (err) {
    return { status: false, error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isSend = args.includes('--send');
  const isStatus = args.includes('--status');

  console.log('====================================================');
  console.log('🎯 KIRIM ULANG 520 KONTAK TERTUNDA (DATA KONTROL)');
  console.log(`📱 Pengirim : ${DEVICE_PETUGAS.label}`);
  console.log('====================================================');

  // Cek status koneksi device Fonnte
  const devStatus = await checkDeviceStatus();
  console.log(`📡 Status Koneksi Fonnte : ${devStatus?.device_status || JSON.stringify(devStatus)}`);

  if (isStatus) {
    const checkpoints = loadCheckpoints();
    console.log(`💾 Total Checkpoint Sent: ${checkpoints.size} nomor`);
    return;
  }

  if (!fs.existsSync(PENDING_FILE)) {
    console.error('❌ File data/kontak_pending_resend_520.json tidak ditemukan!');
    process.exit(1);
  }

  const allPending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  const alreadySent = loadCheckpoints();
  const dbPhones = await getLiveDbPhones();

  // Filter target aktif yang belum terkirim & belum terdaftar di DB
  const validTargets = allPending.filter((item) => {
    const p = normalizePhone(item.normPhone);
    if (!p || p.length < 9) return false;
    if (alreadySent.has(p)) return false;
    if (dbPhones.has(p)) return false;
    if (KNOWN_STAFF.has(p)) return false;
    return true;
  });

  console.log(`📊 Total Target Awal    : ${allPending.length} nomor`);
  console.log(`⏭️  Sudah Terkirim/Dilewati: ${allPending.length - validTargets.length} nomor`);
  console.log(`🎯 Sisa Siap Dikirim    : ${validTargets.length} nomor`);
  console.log(`⚙️  Mode                 : ${isSend ? '🟢 LIVE SENDING' : '🟡 DRY-RUN (SIMULASI)'}`);
  console.log('====================================================\n');

  if (validTargets.length === 0) {
    console.log('🎉 Seluruh 520 kontak sudah selesai terkirim! Tidak ada sisa kontak tertunda.');
    return;
  }

  if (!isSend) {
    console.log('Sample 5 Target yang akan dikirim:');
    validTargets.slice(0, 5).forEach((t, i) => {
      console.log(` [${i + 1}] ${t.phone} (${t.displayName}) - Wilayah: ${t.indicatedArea}`);
    });
    console.log('\n💡 Untuk mulai mengirim secara riil, jalankan:');
    console.log('   node scripts/kirim-ulang-520-petugas.mjs --send\n');
    return;
  }

  if (devStatus?.device_status === 'disconnect') {
    console.warn('\n⚠️ PERINGATAN: Device Fonnte masih terdeteksi "disconnect"!');
    console.warn('   Pastikan WhatsApp di nomor 089688151473 sudah tersambung di Fonnte sebelum melanjutkan.');
  }

  console.log(`🚀 Memulai pengiriman live ke ${validTargets.length} nomor...`);
  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < validTargets.length; i++) {
    const target = validTargets[i];
    const message = buildMessage(target.displayName);

    try {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: DEVICE_PETUGAS.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: target.normPhone,
          message,
          countryCode: '62',
        }),
      });
      const data = await res.json().catch(() => null);

      if (data && (data.status === true || data.status === 'success')) {
        sentCount++;
        saveCheckpoint(target.normPhone);
        console.log(`[SENT] [${i + 1}/${validTargets.length}] -> ${target.normPhone} (${target.displayName})`);
      } else {
        failCount++;
        const reason = data?.reason || data?.message || 'unknown error';
        console.log(`[FAIL] [${i + 1}/${validTargets.length}] -> ${target.normPhone}: ${reason}`);
        if (reason.toLowerCase().includes('disconnected') || data?.device_status === 'disconnect') {
          console.error('\n❌ Pengiriman dihentikan otomatis karena device terputus dari Fonnte.');
          break;
        }
      }
    } catch (err) {
      failCount++;
      console.log(`[ERR] [${i + 1}/${validTargets.length}] -> ${target.normPhone}: ${err.message}`);
    }

    // Delay 3.5s per message
    await new Promise((r) => setTimeout(r, 3500));
  }

  console.log('\n====================================================');
  console.log('🏁 REKAPITULASI PENGIRIMAN SELESAI');
  console.log(`Terkirim : ${sentCount}`);
  console.log(`Gagal    : ${failCount}`);
  console.log(`Sisa     : ${validTargets.length - sentCount}`);
  console.log('====================================================');
}

main().catch(console.error);
