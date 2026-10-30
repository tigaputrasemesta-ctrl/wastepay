/**
 * Script Pengiriman Blast WhatsApp untuk Calon Pelanggan Belum Terdaftar
 * 
 * KHUSUS Device: 089688151473 (Token Fonnte: 8n46RV2x9GosQYgtAS1j)
 * DILARANG menggunakan nomor admin utama 081400782617.
 * 
 * Penggunaan:
 *   node scripts/blast-calon-089688151473.mjs --dry-run      (Uji coba simulasi tanpa kirim)
 *   node scripts/blast-calon-089688151473.mjs --send         (Kirim pesan terjadwal)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data', 'blast-calon-089688151473');
const TARGET_FILE = path.join(DATA_DIR, 'target_pelanggan_belum_terdaftar.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const targets = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));

const isSendMode = process.argv.includes('--send');
const isDryRun = !isSendMode || process.argv.includes('--dry-run');

console.log('================================================================');
console.log('🤖 KAMPANYE BLAST CALON PELANGGAN BELUM TERDAFTAR');
console.log(`📱 Device Pengirim : ${config.sender.devicePhone} (Fonnte API)`);
console.log(`🔑 Token Device    : ${config.sender.fonnteToken.slice(0, 6)}...`);
console.log(`🎯 Total Target    : ${targets.length} nomor`);
console.log(`⚙️ Mode            : ${isDryRun ? '🟡 DRY-RUN (SIMULASI AMAN)' : '🟢 LIVE SEND'}`);
console.log('================================================================\n');

// Validasi Keamanan: Pastikan nomor admin tidak ada di daftar target
const FORBIDDEN_ADMIN = '081400782617';
for (const t of targets) {
  if (t.nomorHpStandar.replace(/\D/g, '') === FORBIDDEN_ADMIN || t.nomorHpWa62.includes(FORBIDDEN_ADMIN)) {
    throw new Error(`[KEAMANAN KRITIS] Terdeteksi nomor admin ${FORBIDDEN_ADMIN} dalam target! Pengiriman dibatalkan.`);
  }
}

function buildMessage(target) {
  const sapaan = target.namaKontak && target.namaKontak !== '-' ? `Bapak/Ibu *${target.namaKontak}*` : 'Bapak/Ibu';
  const wilayahStr = target.indikasiWilayah && target.indikasiWilayah !== '-' ? `di *${target.indikasiWilayah}*` : 'di lingkungan Anda';

  return `Halo ${sapaan} 👋

Salam hangat dari Layanan Pengangkutan Kebersihan Lingkungan — *UPS HERU (WastePay Depok)*. 🚛♻️

Kami menginformasikan bahwa untuk meningkatkan keteraturan jadwal penjemputan sampah dan kemudahan pembayaran iuran ${wilayahStr}, layanan kini telah terintegrasi secara digital.

Bagi Bapak/Ibu yang ingin mendaftar atau memastikan rumahnya tercatat dalam jadwal operasional armada kami, silakan melakukan pendaftaran mandiri melalui tautan resmi kami:
👉 *https://upsheru.com/daftar*

Atau dapat mengecek jangkauan area operasional di:
🌐 *https://upsheru.com/coverage*

Ada pertanyaan atau butuh bantuan pendaftaran? Cukup balas pesan WhatsApp ini ya, tim kami siap membantu. 🙏

Terima kasih atas kerja samanya menjaga kebersihan lingkungan bersama.
— Tim Layanan UPS HERU Depok`;
}

async function run() {
  console.log(`Memproses ${targets.length} target...\n`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const msg = buildMessage(t);
    const targetPhone = t.nomorHpWa62;

    if (isDryRun) {
      console.log(`[DRY-RUN ${i + 1}/${targets.length}] -> ${targetPhone} (${t.namaKontak} | ${t.indikasiWilayah})`);
      if (i === 0) {
        console.log('\n--- PREVIEW PESAN PERTAMA ---');
        console.log(msg);
        console.log('-----------------------------\n');
      }
      successCount++;
    } else {
      console.log(`[MENGIRIM ${i + 1}/${targets.length}] -> ${targetPhone} (${t.namaKontak})...`);
      try {
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            Authorization: config.sender.fonnteToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: targetPhone,
            message: msg,
            delay: '5', // 5 detik delay bawaan Fonnte
            countryCode: '62',
          }),
        });
        const resJson = await res.json();
        if (resJson.status) {
          console.log(`  ✅ Terkirim: ID ${resJson.id || 'OK'}`);
          successCount++;
        } else {
          console.log(`  ❌ Gagal Fonnte: ${resJson.reason || JSON.stringify(resJson)}`);
          failCount++;
        }
      } catch (err) {
        console.error(`  ❌ Error Network:`, err.message);
        failCount++;
      }

      // Delay lokal tambahan antar pesan (5 detik)
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n================ HASIL RINGKASAN ================');
  console.log(`Total Target: ${targets.length}`);
  console.log(`Sukses: ${successCount}`);
  console.log(`Gagal : ${failCount}`);
  if (isDryRun) {
    console.log('\n💡 Ini adalah simulasi DRY-RUN. Pesan belum benar-benar dikirimkan.');
    console.log('Untuk mengirim, jalankan dengan flag --send.');
  }
}

run();
