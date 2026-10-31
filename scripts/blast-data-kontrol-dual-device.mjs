/**
 * Script Blast WhatsApp Dual-Device untuk Data Kontrol UPS HERU
 * 
 * Device 1: HP Admin (081400782617)  - 326 target
 * Device 2: HP Petugas (089688151473) - 721 target
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const CHECKPOINT_FILE = path.join(ROOT_DIR, 'scratch', 'blast_sent_checkpoints.json');

const DEVICE_ADMIN = {
  phone: '081400782617',
  label: 'HP Admin Utama (081400782617)',
  token: process.env.WA_API_KEY?.trim() || 'yZeWGJymbrnTpub2x5rL',
};

const DEVICE_PETUGAS = {
  phone: '089688151473',
  label: 'HP Petugas Survei (089688151473 - Novi)',
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
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      return new Set(data);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

function saveCheckpoint(phone) {
  const current = loadCheckpoints();
  current.add(phone);
  fs.mkdirSync(path.dirname(CHECKPOINT_FILE), { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(Array.from(current), null, 2));
}

async function getLiveDbPhones() {
  const envText = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
  let dbUrl = '';
  for (const line of envText.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/['\"]/g, '').trim();
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

export async function prepareTargets() {
  const dbPhones = await getLiveDbPhones();
  const alreadySent = loadCheckpoints();

  // 1. Admin targets
  const adminCsvPath = path.join(ROOT_DIR, 'data/kontak-hp-admin-081400782617/pelanggan_belum_terdaftar.csv');
  const adminLines = fs.readFileSync(adminCsvPath, 'utf8').split(/\r?\n/).slice(1);
  const targetsAdmin = [];
  for (const line of adminLines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    const norm = normalizePhone(parts[4] || parts[3]);
    if (!norm || norm.length < 9) continue;
    if (KNOWN_STAFF.has(norm) || dbPhones.has(norm) || alreadySent.has(norm)) continue;
    targetsAdmin.push({
      phone: norm,
      name: (parts[1] || '').replace(/\"/g, '').trim(),
      source: 'hp_admin',
    });
  }

  // 2. Petugas targets
  const petugasCsvPath = path.join(ROOT_DIR, 'data/kontak-hp-petugas-089688151473/pelanggan_belum_terdaftar.csv');
  const petugasLines = fs.readFileSync(petugasCsvPath, 'utf8').split(/\r?\n/).slice(1);
  const targetsPetugas = [];
  const seenAdmin = new Set(targetsAdmin.map(t => t.phone));
  for (const line of petugasLines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    const norm = normalizePhone(parts[0]);
    if (!norm || norm.length < 9) continue;
    if (KNOWN_STAFF.has(norm) || dbPhones.has(norm) || seenAdmin.has(norm) || alreadySent.has(norm)) continue;
    targetsPetugas.push({
      phone: norm,
      name: (parts[2] || '').replace(/\"/g, '').trim(),
      source: 'hp_petugas',
    });
  }

  return { targetsAdmin, targetsPetugas, alreadySentCount: alreadySent.size };
}

async function sendWorker(device, targets, isDryRun = true, delayMs = 3500) {
  console.log(`\n🚀 [WORKER ${device.label}] Memulai pengiriman ke ${targets.length} target (DryRun: ${isDryRun})...`);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const msg = buildMessage(t.name);

    if (isDryRun) {
      if (i < 3 || i === targets.length - 1) {
        console.log(`[DRY-RUN ${device.phone}] [${i + 1}/${targets.length}] -> ${t.phone} (${t.name || '-'})`);
      }
      sent++;
    } else {
      try {
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: device.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: t.phone,
            message: msg,
            countryCode: '62',
            delay: '2',
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data && data.status !== false) {
          sent++;
          saveCheckpoint(t.phone);
          console.log(`[SENT ${device.phone}] [${i + 1}/${targets.length}] -> ${t.phone} (${t.name || '-'})`);
        } else {
          failed++;
          console.error(`[FAIL ${device.phone}] [${i + 1}/${targets.length}] -> ${t.phone}: ${data?.reason || data?.message || res.status}`);
        }
      } catch (err) {
        failed++;
        console.error(`[ERR ${device.phone}] [${i + 1}/${targets.length}] -> ${t.phone}: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return { sent, failed };
}

async function main() {
  const isSend = process.argv.includes('--send');
  const isDryRun = !isSend;
  const isTest = process.argv.includes('--test');

  const { targetsAdmin, targetsPetugas, alreadySentCount } = await prepareTargets();

  console.log('====================================================');
  console.log('🤖 BLAST WHATSAPP DUAL-DEVICE — DATA KONTROL UPS HERU');
  console.log(`📱 Device Admin   : ${DEVICE_ADMIN.phone} (${targetsAdmin.length} target)`);
  console.log(`📱 Device Petugas : ${DEVICE_PETUGAS.phone} (${targetsPetugas.length} target)`);
  console.log(`🎯 Total Target   : ${targetsAdmin.length + targetsPetugas.length} nomor`);
  if (alreadySentCount > 0) {
    console.log(`ℹ️ Checkpoint     : ${alreadySentCount} nomor sudah pernah terkirim (dilewati otomatis)`);
  }
  console.log(`⚙️ Mode           : ${isDryRun ? '🟡 DRY-RUN (SIMULASI AMAN)' : '🟢 LIVE SENDING'}`);
  console.log('====================================================');

  if (isTest) {
    const testPhone = process.argv.find(a => a.startsWith('--phone='))?.split('=')[1] || '085716251003';
    console.log(`\n🧪 Mengirim pesan uji coba ke ${testPhone}...`);
    const testMsg = buildMessage('Uji Coba Sistem');
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: DEVICE_ADMIN.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: normalizePhone(testPhone),
        message: testMsg,
        countryCode: '62',
      }),
    });
    const d = await res.json().catch(() => null);
    console.log('Hasil Test:', d);
    return;
  }

  if (isDryRun) {
    console.log('\n[SIMULASI DRY RUN]');
    await sendWorker(DEVICE_ADMIN, targetsAdmin.slice(0, 5), true);
    await sendWorker(DEVICE_PETUGAS, targetsPetugas.slice(0, 5), true);
    console.log('\n✅ Simulasi dry-run selesai. Jalankan dengan argumen --send untuk mulai pengiriman riil.');
    return;
  }

  // Live Sending: Jalankan worker admin dan worker petugas secara paralel
  console.log('\n🚀 MEMULAI PENGIRIMAN PARALEL...');
  const [resAdmin, resPetugas] = await Promise.all([
    sendWorker(DEVICE_ADMIN, targetsAdmin, false, 3500),
    sendWorker(DEVICE_PETUGAS, targetsPetugas, false, 3500),
  ]);

  console.log('\n====================================================');
  console.log('🎉 PENGIRIMAN BLAST SELESAI');
  console.log(`Admin   : ${resAdmin.sent} terkirim, ${resAdmin.failed} gagal`);
  console.log(`Petugas : ${resPetugas.sent} terkirim, ${resPetugas.failed} gagal`);
  console.log('====================================================');
}

main().catch(console.error);
