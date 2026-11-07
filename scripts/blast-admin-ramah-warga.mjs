#!/usr/bin/env node
/**
 * Blast WhatsApp Ramah Warga via HP Admin (0814-0078-2617)
 * 
 * Pengirim: HP Admin Utama / Nomor Resmi UPS HERU (0814-0078-2617)
 * Nada Pesan: Bahasa Santai, Ramah, Jelas ("Bahasa Bayi" / Awam Warga)
 * Referensi Petugas: Mas Doyok / Nopi (0896-8815-1473)
 * Target: Calon pelanggan yang belum terdaftar di database & belum terkirim checkpoint
 *
 * Penggunaan:
 *   node scripts/blast-admin-ramah-warga.mjs --status                 # Cek target & checkpoint
 *   node scripts/blast-admin-ramah-warga.mjs                          # Simulasi Dry-Run
 *   node scripts/blast-admin-ramah-warga.mjs --test --phone=08xxxx    # Test kirim 1 nomor
 *   node scripts/blast-admin-ramah-warga.mjs --send                   # LIVE SENDING semua target
 *   node scripts/blast-admin-ramah-warga.mjs --send --limit=50        # LIVE SENDING batch 50 target
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const CHECKPOINT_FILES = [
  path.join(ROOT_DIR, 'data', 'blast_sent_checkpoints.json'),
  path.join(ROOT_DIR, 'scratch', 'blast_sent_checkpoints.json'),
];

// Load env jika belum terload
if (!process.env.WA_API_KEY || !process.env.DATABASE_URL) {
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

const PETUGAS_LAPANGAN = {
  nama: 'Mas Doyok / Nopi',
  phone: '089688151473',
  displayPhone: '0896-8815-1473',
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

export function formatPhoneIndo(phone) {
  if (!phone) return '-';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) clean = '0' + clean.slice(2);
  if (clean.length >= 10) return clean.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  return clean;
}

/**
 * Template Pesan Ramah Warga ("Bahasa Bayi" / Bahasa Santai & Jelas)
 */
export function buildRamahMessage(namaTarget) {
  const cleanNama = namaTarget && namaTarget !== '-' && !namaTarget.toLowerCase().includes('konsumen') 
    ? namaTarget.trim() 
    : 'Bapak/Ibu Warga';

  return `*PEMBERITAHUAN RESMI — UPS HERU DEPOK* 🚛
Layanan Pengangkutan Sampah Warga

Halo Bapak/Ibu ${cleanNama} yang baik, salam sehat selalu yaa! 😊🙏

Mohon izin mengganggu sebentar. Ini pesan resmi dari *Admin Pusat UPS HERU* (Nomor Resmi: 0814-0078-2617).

Bapak/Ibu jangan kaget yaa menerima pesan dari nomor resmi ini. Petugas lapangan yang biasa keliling angkut sampah di rumah Bapak/Ibu tetap tim kesayangan kita, yaitu *Mas Doyok / Nopi* (WhatsApp: 0896-8815-1473).

Sekarang jadwal penjemputan dan pencatatan pembayaran sampah warga sudah masuk ke sistem online rapi, biar sampah rumah Bapak/Ibu tidak pernah kelewat lagi!

Bagi rumah Bapak/Ibu yang nomornya belum tercatat di sistem, yuk luangkan waktu *1 menit* untuk daftar mandiri (GRATIS tanpa biaya):

👉 *Klik Link Daftar Cepat:*
https://upsheru.com/daftar
_(Cukup isi nama & alamat saja, gampang banget kok!)_

✨ *Kenapa Enak Banget Kalau Sudah Terdaftar?*
1. 🚛 *Sampah Pasti Terjemput:* Rumah Bapak/Ibu otomatis muncul di peta GPS supir truk kami. Jadi sampah dijamin rutin diangkut walau supir berganti.
2. 🧾 *Kuitansi Rapi Langsung di WA:* Bukti pembayaran otomatis terkirim ke WhatsApp Bapak/Ibu. Iuran tetap sama, bisa bayar tunai ke Mas Doyok / Nopi atau transfer/QRIS tanpa takut kuitansi kertas hilang/basah lagi.
3. ⚡ *Lapor Sampah Cepat:* Kalau ada sampah ketinggalan, tinggal lapor lewat WA langsung cepat dijemput kembali.

💡 *Bingung atau Gaptek Mau Daftar?*
Tenang saja yaa, Bapak/Ibu bisa:
• Balas langsung pesan WA ini dengan sebutkan nama & alamat rumah, ATAU
• Hubungi / titip minta tolong didaftarkan sama *Mas Doyok / Nopi* di WhatsApp: 0896-8815-1473 saat jadwal jemput sampah di depan rumah.

Terima kasih banyak atas dukungannya menjaga kebersihan lingkungan bersama kami! 💚
_Salam hangat, Tim UPS HERU & Mas Doyok / Nopi_`;
}

export function loadCheckpoints() {
  const set = new Set();
  for (const cf of CHECKPOINT_FILES) {
    if (fs.existsSync(cf)) {
      try {
        const arr = JSON.parse(fs.readFileSync(cf, 'utf8'));
        if (Array.isArray(arr)) {
          arr.forEach(p => {
            const norm = normalizePhone(p);
            if (norm) set.add(norm);
          });
        }
      } catch {}
    }
  }
  return set;
}

export function saveCheckpoint(phone) {
  const norm = normalizePhone(phone);
  if (!norm) return;
  const current = loadCheckpoints();
  current.add(norm);
  const arr = Array.from(current);
  for (const cf of CHECKPOINT_FILES) {
    try {
      fs.mkdirSync(path.dirname(cf), { recursive: true });
      fs.writeFileSync(cf, JSON.stringify(arr, null, 2));
    } catch {}
  }
}

export async function getLiveDbPhones() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('⚠️ DATABASE_URL tidak ditemukan di environment.');
    return new Set();
  }

  try {
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    const res = await pool.query('SELECT "noTelepon", "kodePelanggan" FROM "Pelanggan" WHERE "deletedAt" IS NULL');
    const set = new Set();
    for (const r of res.rows) {
      if (r.noTelepon) set.add(normalizePhone(r.noTelepon));
      if (r.kodePelanggan) set.add(normalizePhone(r.kodePelanggan));
    }
    await pool.end();
    return set;
  } catch (err) {
    console.error('⚠️ Gagal terhubung ke Database Live:', err.message);
    return new Set();
  }
}

export async function prepareAdminBlastTargets() {
  const dbPhones = await getLiveDbPhones();
  const alreadySent = loadCheckpoints();
  const targetMap = new Map();

  // Helper untuk membaca CSV
  function ingestCsv(filePath, phoneIndex, nameIndex, sourceTag) {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',');
      const rawPhone = parts[phoneIndex];
      const norm = normalizePhone(rawPhone);
      if (!norm || norm.length < 9) continue;
      if (KNOWN_STAFF.has(norm) || dbPhones.has(norm) || alreadySent.has(norm)) continue;

      const rawName = (parts[nameIndex] || '').replace(/\"/g, '').trim();
      if (!targetMap.has(norm)) {
        targetMap.set(norm, {
          phone: norm,
          name: rawName,
          source: sourceTag,
        });
      } else {
        const existing = targetMap.get(norm);
        if ((!existing.name || existing.name === '-') && rawName) {
          existing.name = rawName;
        }
      }
    }
  }

  // 1. Target dari CSV Petugas (518 sisa kontak yang belum terdaftar)
  ingestCsv(
    path.join(ROOT_DIR, 'data/kontak-hp-petugas-089688151473/pelanggan_belum_terdaftar.csv'),
    0, // phone di col 0
    2, // name di col 2
    'hp_petugas'
  );

  // 2. Target dari CSV Admin (jika ada yang belum)
  ingestCsv(
    path.join(ROOT_DIR, 'data/kontak-hp-admin-081400782617/pelanggan_belum_terdaftar.csv'),
    4, // phone di col 4
    1, // name di col 1
    'hp_admin'
  );

  // 3. Target dari kontak_pending_resend_520.json jika masih ada yang terselip
  const pendingFile = path.join(ROOT_DIR, 'data/kontak_pending_resend_520.json');
  if (fs.existsSync(pendingFile)) {
    try {
      const arr = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const norm = normalizePhone(item.normPhone || item.phone);
          if (!norm || norm.length < 9) continue;
          if (KNOWN_STAFF.has(norm) || dbPhones.has(norm) || alreadySent.has(norm)) continue;
          if (!targetMap.has(norm)) {
            targetMap.set(norm, {
              phone: norm,
              name: item.displayName || item.name || '',
              source: 'pending_520',
            });
          }
        }
      }
    } catch {}
  }

  const targets = Array.from(targetMap.values());
  return {
    targets,
    totalTarget: targets.length,
    alreadySentCount: alreadySent.size,
    dbRegisteredCount: dbPhones.size,
  };
}

async function main() {
  const isSend = process.argv.includes('--send');
  const isStatus = process.argv.includes('--status');
  const isTest = process.argv.includes('--test');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
  const delayArg = process.argv.find(a => a.startsWith('--delay='));
  const delayMs = delayArg ? parseInt(delayArg.split('=')[1], 10) : 3500;

  console.log('================================================================');
  console.log('📢 BLAST WHATSAPP RAMAH WARGA (BAHASA BAYI / SANTAI) — HP ADMIN');
  console.log(`📱 Pengirim Resmi : ${DEVICE_ADMIN.label}`);
  console.log(`👷 Petugas Acuan  : ${PETUGAS_LAPANGAN.nama} (${PETUGAS_LAPANGAN.displayPhone})`);
  console.log('================================================================');

  const { targets, totalTarget, alreadySentCount, dbRegisteredCount } = await prepareAdminBlastTargets();

  console.log(`📊 Statistik Sistem:`);
  console.log(`   • Pelanggan Aktif Terdaftar di DB : ${dbRegisteredCount}`);
  console.log(`   • Kontak Sudah Pernah Terkirim   : ${alreadySentCount}`);
  console.log(`   • Target Calon Siap Di-Blast    : ${totalTarget} nomor`);
  console.log('================================================================');

  if (isStatus) {
    console.log('ℹ️ Mode Status selesai. Gunakan tanpa argumen untuk simulasi dry-run.');
    return;
  }

  if (isTest) {
    const testArg = process.argv.find(a => a.startsWith('--phone='));
    const testPhone = testArg ? testArg.split('=')[1] : '085716251003';
    const normTest = normalizePhone(testPhone);

    console.log(`\n🧪 Mengirim pesan uji coba ke ${testPhone} (${normTest})...`);
    const testMsg = buildRamahMessage('Bapak Joko / Warga Uji Coba');

    try {
      const res = await fetch(DEVICE_ADMIN.url, {
        method: 'POST',
        headers: {
          Authorization: DEVICE_ADMIN.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: normTest,
          message: testMsg,
          countryCode: '62',
        }),
      });
      const data = await res.json().catch(() => null);
      console.log('Hasil Respon Fonnte:', data);
    } catch (err) {
      console.error('Gagal kirim test:', err.message);
    }
    return;
  }

  let sendTargets = targets;
  if (limit > 0 && limit < sendTargets.length) {
    sendTargets = sendTargets.slice(0, limit);
    console.log(`⚠️ Dibatasi batch: ${limit} nomor dari total ${totalTarget} nomor.`);
  }

  if (!isSend) {
    console.log('\n🟡 MODE SIMULASI (DRY-RUN) — Tidak ada pesan WA yang dikirim.');
    console.log('Contoh 3 target pertama:');
    sendTargets.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.phone}] ${t.name || '(Tanpa Nama)'} - Sumber: ${t.source}`);
    });

    console.log('\nContoh Pesan yang Akan Diterima Warga:\n----------------------------------------');
    console.log(buildRamahMessage(sendTargets[0]?.name || 'Bapak Joko'));
    console.log('----------------------------------------');
    console.log(`\n✅ Validasi berhasil. ${sendTargets.length} target siap dikirim.`);
    console.log('👉 Untuk mulai mengirim live, jalankan:');
    console.log('   node scripts/blast-admin-ramah-warga.mjs --send');
    console.log('   (atau gunakan --limit=50 untuk mengirim bertahap)');
    return;
  }

  // LIVE SENDING
  console.log(`\n🚀 MEMULAI LIVE SENDING KE ${sendTargets.length} NOMOR...`);
  console.log(`⏱️ Jeda antar pesan: ${delayMs / 1000} detik (anti-flood/anti-ban)`);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < sendTargets.length; i++) {
    const t = sendTargets[i];
    const msg = buildRamahMessage(t.name);

    try {
      const res = await fetch(DEVICE_ADMIN.url, {
        method: 'POST',
        headers: {
          Authorization: DEVICE_ADMIN.token,
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
        console.log(`[${i + 1}/${sendTargets.length}] ✅ TERKIRIM -> ${t.phone} (${t.name || '-'})`);
      } else {
        failed++;
        console.error(`[${i + 1}/${sendTargets.length}] ❌ GAGAL -> ${t.phone}: ${data?.reason || data?.message || res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${sendTargets.length}] ❌ ERROR -> ${t.phone}: ${err.message}`);
    }

    if (i < sendTargets.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  console.log('\n================================================================');
  console.log('🎉 PENGIRIMAN BLAST SELESAI');
  console.log(`Total Diproses : ${sendTargets.length}`);
  console.log(`Berhasil       : ${sent}`);
  console.log(`Gagal          : ${failed}`);
  console.log('================================================================');
}

main().catch(console.error);
