/**
 * Script untuk menandai dan mengekstrak 520 kontak calon pelanggan
 * yang tertunda (belum terkirim) saat putaran pertama blast WhatsApp
 * akibat Fonnte HP Petugas terputus.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const CHECKPOINT_FILE = path.join(ROOT_DIR, 'scratch', 'blast_sent_checkpoints.json');

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

function formatPhoneIndo(phone) {
  if (!phone) return '-';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) clean = '0' + clean.slice(2);
  if (clean.length >= 10) return clean.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  return clean;
}

function detectLocation(savedName) {
  const s = (savedName || '').toLowerCase();
  if (s.includes('tabroni')) return 'Blok Tabroni';
  if (s.includes('smp6') || s.includes('smp 6') || s.includes('smp.6')) return 'Blok Bawah Dmiles + SMP 6';
  if (s.includes('sasak')) return 'Blok Sasak';
  if (s.includes('ykp')) return 'Blok YKP Kelapa';
  if (s.includes('bakung')) return 'Blok Bakung';
  if (s.includes('setu')) return 'Blok Setu';
  if (s.includes('pete')) return 'Blok Pete';
  if (s.includes('niman') || s.includes('gg.niman')) return 'Blok Gg Niman';
  if (s.includes('kp.bulak') || s.includes('kp bulak') || s.includes('kampung bulak')) return 'Blok Kp Bulak';
  if (s.includes('kp.sawah') || s.includes('kp sawah') || s.includes('kampung sawah')) return 'Blok Kampung Sawah';
  if (s.includes('cilodong')) return 'Blok Jl. Raya Cilodong';
  if (s.includes('gang umar') || s.includes('gg umar') || s.includes('gg.umar') || s.includes('c8 umar') || s.includes('b2 gang umar')) return 'Blok Gang Umar';
  if (s.includes('santri')) return 'Perumahan Santri';
  if (s.includes('sarin') || s.includes('gg.sarin')) return 'Blok Sarin';
  if (s.includes('agisna')) return 'Blok Agisna';
  if (s.includes('bmk')) return 'Perumahan BMK';
  if (s.includes('thr')) return 'Blok THR';
  if (s.includes('kibeng')) return 'Blok Kibeng';
  if (s.includes('talang baduri')) return 'Blok Talang Baduri';
  if (s.includes('saphire') || s.includes('sapire')) return 'Perumahan Saphire';
  if (s.includes('trevista')) return 'Trevista Premier / D Miles';
  if (s.includes('desari')) return 'Cluster Desari Bawah';
  if (s.includes('berdikari')) return 'Perum Berdikari';
  if (s.includes('kebun duren')) return 'Kebun Duren';
  if (s.includes('mts')) return 'Blok MTS';
  return '-';
}

async function main() {
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

  const alreadySent = new Set(JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')));

  // 1. Admin targets
  const adminCsvPath = path.join(ROOT_DIR, 'data/kontak-hp-admin-081400782617/pelanggan_belum_terdaftar.csv');
  const adminLines = fs.readFileSync(adminCsvPath, 'utf8').split(/\r?\n/).slice(1);
  const seenAdmin = new Set();
  for (const line of adminLines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    const norm = normalizePhone(parts[4] || parts[3]);
    if (!norm || norm.length < 9) continue;
    seenAdmin.add(norm);
  }

  // 2. Petugas targets
  const petugasCsvPath = path.join(ROOT_DIR, 'data/kontak-hp-petugas-089688151473/pelanggan_belum_terdaftar.csv');
  const petugasLines = fs.readFileSync(petugasCsvPath, 'utf8').split(/\r?\n/).slice(1);
  const pending520 = [];

  for (const line of petugasLines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    const norm = normalizePhone(parts[0]);
    if (!norm || norm.length < 9) continue;
    if (KNOWN_STAFF.has(norm) || dbPhones.has(norm) || seenAdmin.has(norm) || alreadySent.has(norm)) continue;
    
    const savedName = (parts[2] || '').replace(/"/g, '').trim();
    const displayName = savedName && savedName !== '-' ? savedName : 'Pelanggan Setia UPS HERU';
    const indicatedArea = detectLocation(savedName);

    pending520.push({
      index: pending520.length + 1,
      normPhone: norm,
      phone: formatPhoneIndo(norm),
      displayName,
      savedName,
      indicatedArea,
      senderDevice: '089688151473',
      senderLabel: 'HP Petugas Survei (0896-8815-1473 - Novi)',
      status: 'pending_resend',
      keterangan: 'Tertunda karena koneksi device Fonnte terputus saat blast putaran pertama',
    });
  }

  console.log(`====================================================`);
  console.log(`📋 REKAP PENANDAAN KONTAK TERTUNDA BLAST`);
  console.log(`Total Kontak Ditandai: ${pending520.length} nomor`);
  console.log(`Pengirim Device      : 0896-8815-1473 (Novi)`);
  console.log(`Status               : 🟡 PENDING RESEND`);
  console.log(`====================================================`);

  // Simpan format JSON
  fs.writeFileSync(path.join(ROOT_DIR, 'data/kontak_pending_resend_520.json'), JSON.stringify(pending520, null, 2));
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch/kontak_pending_resend_520.json'), JSON.stringify(pending520, null, 2));

  // Simpan format CSV
  const csvHeader = 'No,Nomor WhatsApp (E164),Format Tampilan,Nama Pelanggan,Nama Kontak HP,Perkiraan Wilayah,Pengirim Device,Status Blast,Keterangan\n';
  const csvRows = pending520.map(c => 
    `"${c.index}","${c.normPhone}","${c.phone}","${c.displayName.replace(/"/g, '""')}","${c.savedName.replace(/"/g, '""')}","${c.indicatedArea}","${c.senderDevice}","${c.status}","${c.keterangan}"`
  ).join('\n');
  fs.writeFileSync(path.join(ROOT_DIR, 'data/kontak_pending_resend_520.csv'), csvHeader + csvRows);
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch/kontak_pending_resend_520.csv'), csvHeader + csvRows);

  console.log('✅ File berhasil disimpan:');
  console.log(' - data/kontak_pending_resend_520.json');
  console.log(' - data/kontak_pending_resend_520.csv');
  console.log(' - scratch/kontak_pending_resend_520.json');
  console.log(' - scratch/kontak_pending_resend_520.csv');
}

main().catch(console.error);
