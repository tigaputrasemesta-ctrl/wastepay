#!/usr/bin/env node
/**
 * Blast WhatsApp Konfirmasi Pembayaran Bulan Lalu (527 Kontak Eks HP Petugas)
 * 
 * Pengirim: HP Admin Utama / Nomor Resmi UPS HERU (0814-0078-2617)
 * Target: 527 Kontak dari batch awal HP Petugas (kemarin)
 * Tujuan: Memperkenalkan nomor resmi Admin, konfirmasi iuran sampah bulan lalu,
 *         dan mengajak warga registrasi mandiri.
 * 
 * Penggunaan:
 *   node scripts/blast-konfirmasi-527-admin.mjs --status
 *   node scripts/blast-konfirmasi-527-admin.mjs --dry-run
 *   node scripts/blast-konfirmasi-527-admin.mjs --test --phone=081400782617
 *   node scripts/blast-konfirmasi-527-admin.mjs --send
 *   node scripts/blast-konfirmasi-527-admin.mjs --send --limit=50
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const CHECKPOINT_FILE = path.join(ROOT_DIR, 'data', 'blast_konfirmasi_527_checkpoints.json');
const MASTER_SENT_FILE = path.join(ROOT_DIR, 'data', 'blast_sent_checkpoints.json');
const TARGET_MAP_FILE = path.join(ROOT_DIR, 'data', 'blast-calon-089688151473', 'target_pelanggan_belum_terdaftar.json');

// Load env jika belum terload
if (!process.env.WA_API_KEY) {
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
}

const DEVICE_ADMIN = {
  phone: '081400782617',
  label: 'HP Admin WhatsApp Resmi UPS HERU (0814-0078-2617)',
  token: process.env.WA_API_KEY?.trim() || 'yZeWGJymbrnTpub2x5rL',
  url: process.env.WA_API_URL?.trim() || 'https://api.fonnte.com/send',
};

const KNOWN_STAFF = new Set([
  '6281400782617', '6289688151473', '6281532843224', '6289602950531',
  '6282125115021', '62895385058054', '6289675528057', '6285353286062',
  '6289502703352', '6289675424339', '6285716251003', '6285836415075',
  '6285781219141', '6287742667520', '6283182628794', '6288290624931'
]);

export function normalizePhone(raw) {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (clean.startsWith('08')) clean = '62' + clean.slice(1);
  else if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

export function loadCheckpoints() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      if (Array.isArray(data)) return new Set(data);
    } catch {}
  }
  return new Set();
}

export function saveCheckpoint(phone) {
  const current = loadCheckpoints();
  current.add(phone);
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(Array.from(current), null, 2), 'utf8');
}

export function buildKonfirmasiMessage(namaTarget) {
  const cleanNama = namaTarget && namaTarget !== '-' && !namaTarget.toLowerCase().includes('08')
    ? namaTarget.trim()
    : 'Bapak/Ibu Warga';

  return `*PEMBERITAHUAN RESMI — UPS HERU DEPOK* 🚛
Layanan Pengangkutan Sampah Warga

Halo Bapak/Ibu ${cleanNama} yang baik, salam sehat selalu yaa! 😊🙏

Mohon izin mengganggu sebentar. Ini pesan resmi langsung dari *Admin Pusat UPS HERU* (Nomor Resmi: 0814-0078-2617).

Sebelumnya Bapak/Ibu mungkin pernah menerima pesan dari nomor HP petugas lapangan kami. Bapak/Ibu jangan khawatir yaa, petugas lapangan yang biasa keliling angkut sampah di rumah Bapak/Ibu tetap tim kesayangan kita, yaitu *Mas Doyok / Nopi* (WhatsApp: 0896-8815-1473).

Saat ini sistem pencatatan iuran dan jadwal penjemputan sampah warga sudah resmi dipusatkan ke sistem digital online agar lebih tertib, rapi, dan transparan.

📌 *PENTING: KONFIRMASI IURAN BULAN LALU*
Bagi Bapak/Ibu yang *sudah membayar iuran sampah bulan lalu* (baik bayar tunai ke Mas Doyok / Nopi atau via transfer):
👉 *Mohon bantuannya untuk konfirmasi ulang ke nomor WhatsApp Admin ini yaa.*

Cukup balas pesan ini dengan ketik:
• *Nama:* ...
• *Alamat / Blok Rumah:* ...
_(Bisa lampirkan foto struk/bukti bayar jika ada)_

Supaya tim Admin kami bisa langsung mencocokkan & menandai status *LUNAS* di sistem komputer, dan kuitansi digital resminya otomatis terbit ke WA Bapak/Ibu! 🧾✅

✨ *Bagi yang Nomor Rumahnya Belum Terdaftar:*
Yuk sempatkan waktu *1 menit* untuk daftar mandiri (GRATIS tanpa biaya):
👉 *Klik Link Daftar:* https://upsheru.com/daftar
_(Cukup isi nama & alamat saja, biar jadwal angkut sampah rumah selalu terpantau radar GPS supir)_

💡 *Bingung atau Gaptek Mau Daftar?*
Tenang saja, Bapak/Ibu cukup balas pesan ini langsung, atau titip minta tolong didaftarkan ke *Mas Doyok / Nopi* saat truk lewat depan rumah.

Terima kasih banyak atas kerja sama dan dukungannya menjaga lingkungan tetap bersih bersama kami! 💚
_Salam hangat, Tim Admin UPS HERU & Mas Doyok / Nopi_`;
}

export async function sendWhatsAppMessage(targetPhone, messageText) {
  const payload = new URLSearchParams();
  payload.append('target', targetPhone);
  payload.append('message', messageText);
  payload.append('countryCode', '62');

  const res = await fetch(DEVICE_ADMIN.url, {
    method: 'POST',
    headers: {
      'Authorization': DEVICE_ADMIN.token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status === false) {
    throw new Error(body.reason || body.message || `HTTP ${res.status}`);
  }
  return body;
}

export function loadTargetList() {
  const masterSent = JSON.parse(fs.readFileSync(MASTER_SENT_FILE, 'utf8'));
  const first527 = masterSent.slice(0, 527);

  let mapTarget = new Map();
  if (fs.existsSync(TARGET_MAP_FILE)) {
    try {
      const arr = JSON.parse(fs.readFileSync(TARGET_MAP_FILE, 'utf8'));
      if (Array.isArray(arr)) {
        arr.forEach(t => {
          let p = normalizePhone(t.nomorHpWa62 || t.phone);
          if (p) mapTarget.set(p, t.namaKontak || t.namaPublik || '');
        });
      }
    } catch {}
  }

  const alreadySent = loadCheckpoints();
  const allTargets = [];
  const pendingTargets = [];

  first527.forEach((rawPhone, idx) => {
    const p = normalizePhone(rawPhone);
    if (!p || KNOWN_STAFF.has(p)) return;

    let rawName = mapTarget.get(p) || '';
    let cleanName = rawName && rawName !== '-' && !rawName.toLowerCase().includes('08')
      ? rawName.trim()
      : 'Bapak/Ibu Warga';

    const item = {
      index: idx + 1,
      phone: p,
      name: cleanName,
    };
    allTargets.push(item);

    if (!alreadySent.has(p)) {
      pendingTargets.push(item);
    }
  });

  return {
    allTargets,
    pendingTargets,
    totalOriginal: first527.length,
    alreadySentCount: alreadySent.size,
  };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const isSendMode = args.includes('--send');
  const isStatusMode = args.includes('--status');
  const isDryRun = args.includes('--dry-run') || (!isSendMode && !isStatusMode && !args.some(a => a.startsWith('--test')));

  console.log('================================================================');
  console.log('📢 BLAST WA KONFIRMASI IURAN BULAN LALU (527 KONTAK EKS PETUGAS)');
  console.log(`📱 Pengirim Resmi : ${DEVICE_ADMIN.label}`);
  console.log(`👷 Petugas Acuan  : Mas Doyok / Nopi (0896-8815-1473)`);
  console.log('================================================================');

  const { allTargets, pendingTargets, totalOriginal, alreadySentCount } = loadTargetList();

  console.log(`📊 Statistik Target:`);
  console.log(`   • Total Kontak Batch 1 (Kemarin) : ${totalOriginal} nomor`);
  console.log(`   • Sudah Terkirim (Checkpoint)    : ${alreadySentCount} nomor`);
  console.log(`   • Sisa Siap Di-Blast Sekarang    : ${pendingTargets.length} nomor`);
  console.log('================================================================\n');

  if (isStatusMode) {
    console.log('ℹ️ Mode Status selesai.');
    process.exit(0);
  }

  // Handle single test
  const testArg = args.find(a => a.startsWith('--phone='));
  if (testArg) {
    const phone = normalizePhone(testArg.replace('--phone=', '').trim());
    console.log(`🧪 UJI COBA PENGIRIMAN 1 NOMOR: ${phone}`);
    const msg = buildKonfirmasiMessage('Warga Uji Coba');
    console.log('\n--- ISI PESAN TEST ---');
    console.log(msg);
    console.log('----------------------\n');
    try {
      const res = await sendWhatsAppMessage(phone, msg);
      console.log('✅ BERHASIL:', res);
    } catch (e) {
      console.error('❌ GAGAL:', e.message);
    }
    process.exit(0);
  }

  // Limit check
  let targetsToProcess = pendingTargets;
  const limitArg = args.find(a => a.startsWith('--limit='));
  if (limitArg) {
    const lim = parseInt(limitArg.replace('--limit=', ''), 10);
    if (!isNaN(lim) && lim > 0) {
      targetsToProcess = pendingTargets.slice(0, lim);
      console.log(`⚠️ Pembatasan Batch aktif: Memproses ${targetsToProcess.length} dari ${pendingTargets.length} sisa target.\n`);
    }
  }

  if (targetsToProcess.length === 0) {
    console.log('🎉 Semua 527 target sudah selesai terkirim (Checkpoint penuh).');
    process.exit(0);
  }

  if (isDryRun) {
    console.log(`🟡 MODE SIMULASI (DRY-RUN): Tidak ada pesan WA yang benar-benar dikirim.`);
    console.log(`Contoh Pesan untuk Target Pertama (${targetsToProcess[0].phone} - ${targetsToProcess[0].name}):\n`);
    console.log(buildKonfirmasiMessage(targetsToProcess[0].name));
    console.log('\n----------------------------------------------------------------');
    console.log(`Untuk memulai LIVE SENDING, jalankan dengan argumen --send:`);
    console.log(`  node scripts/blast-konfirmasi-527-admin.mjs --send`);
    console.log('================================================================');
    process.exit(0);
  }

  console.log(`🚀 MEMULAI LIVE SENDING KE ${targetsToProcess.length} NOMOR...`);
  console.log(`⏱️ Jeda antar pesan: 3.5 detik (anti-flood/anti-ban)\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetsToProcess.length; i++) {
    const target = targetsToProcess[i];
    const seq = `[${i + 1}/${targetsToProcess.length}]`;
    const msg = buildKonfirmasiMessage(target.name);

    try {
      await sendWhatsAppMessage(target.phone, msg);
      saveCheckpoint(target.phone);
      successCount++;
      console.log(`${seq} ✅ TERKIRIM -> ${target.phone} (${target.name})`);
    } catch (err) {
      failCount++;
      console.error(`${seq} ❌ GAGAL -> ${target.phone} (${target.name}): ${err.message}`);
    }

    if (i < targetsToProcess.length - 1) {
      await sleep(3500);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 PENGIRIMAN BLAST SELESAI');
  console.log(`Total Diproses : ${targetsToProcess.length}`);
  console.log(`Berhasil       : ${successCount}`);
  console.log(`Gagal          : ${failCount}`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('Fatal error in blast:', err);
  process.exit(1);
});
