#!/usr/bin/env node
/**
 * CLI Script: Kirim WhatsApp Tagihan ke 28 Pelanggan Belum Ada Riwayat Chat
 * UPS HERU Kota Depok
 * 
 * Penggunaan:
 *   node scripts/kirim-chat-28-uncontacted.mjs           # Mode Dry-Run (Simulasi Aman, Tanpa Mengirim)
 *   node scripts/kirim-chat-28-uncontacted.mjs --send    # LIVE SENDING via Fonnte API (Delay 12-20s)
 *   node scripts/kirim-chat-28-uncontacted.mjs --status  # Cek Status Device Fonnte & Kuota
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const DATA_FILE = path.join(ROOT_DIR, 'data', 'target_28_uncontacted.json');
const LOG_FILE = path.join(ROOT_DIR, 'data', 'blast_28_uncontacted_log.json');

const FONNTE_API_URL = process.env.WA_API_URL || 'https://api.fonnte.com/send';
const FONNTE_TOKEN = process.env.WA_API_KEY || 'yZeWGJymbrnTpub2x5rL'; // UPSHERU.COM 081400782617

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(minSec = 12, maxSec = 20) {
  return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
}

function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch (e) {
      return { sent: {}, failed: {} };
    }
  }
  return { sent: {}, failed: {} };
}

function saveLog(log) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

async function checkDeviceStatus() {
  try {
    const res = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN }
    });
    return await res.json();
  } catch (err) {
    return { status: false, reason: err.message };
  }
}

async function sendWhatsApp(targetPhone, message) {
  const res = await fetch(FONNTE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: FONNTE_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target: targetPhone,
      message: message,
      countryCode: '62'
    })
  });
  return await res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const isSendMode = args.includes('--send');
  const isStatusMode = args.includes('--status');

  console.log('='.repeat(65));
  console.log(' 🚀 BLAST WHATSAPP TAGIHAN — 28 PELANGGAN BELUM ADA CHAT');
  console.log('    UPS HERU Kota Depok');
  console.log('='.repeat(65));

  // 1. Cek Koneksi Device Fonnte
  console.log('\n📡 Memeriksa status koneksi Fonnte API...');
  const devStatus = await checkDeviceStatus();
  console.log(`   • Device       : ${devStatus.device || '-'}`);
  console.log(`   • Nama Akun    : ${devStatus.name || '-'}`);
  console.log(`   • Status       : ${devStatus.device_status || (devStatus.status ? 'Aktif' : 'Terputus')}`);
  console.log(`   • Sisa Kuota   : ${devStatus.quota || '0'} pesan`);
  console.log(`   • Masa Berlaku : ${devStatus.expired || '-'}`);

  if (isStatusMode) {
    console.log('\n✅ Pengecekan status selesai.');
    return;
  }

  if (devStatus.device_status !== 'connect' && !devStatus.status) {
    console.error('\n❌ ERROR: Device Fonnte tidak terhubung (disconnect). Periksa koneksi WhatsApp Admin!');
    process.exit(1);
  }

  // 2. Load Target Data
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`\n❌ ERROR: File data tidak ditemukan di ${DATA_FILE}`);
    process.exit(1);
  }

  const targets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const log = loadLog();

  console.log(`\n📋 Total target: ${targets.length} pelanggan`);
  console.log(`   • Sudah dikirim : ${Object.keys(log.sent || {}).length}`);
  console.log(`   • Gagal         : ${Object.keys(log.failed || {}).length}`);

  if (!isSendMode) {
    console.log('\n' + '='.repeat(65));
    console.log(' 🛡️ MODE DRY-RUN AKTIF (SIMULASI — TIDAK ADA PESAN TERKIRIM)');
    console.log('   Jalankan dengan perintah berikut untuk mengirim pesan riil:');
    console.log('   node scripts/kirim-chat-28-uncontacted.mjs --send');
    console.log('='.repeat(65) + '\n');

    targets.forEach((c, idx) => {
      const alreadySent = !!log.sent[c.waPhone];
      console.log(`[#${c.id}] ${c.nama} (${c.phone}) - Zona: ${c.zona} - Rp ${c.nominal.toLocaleString('id-ID')} ${alreadySent ? '✅ (Pernah Kirim)' : '⏳ (Siap Kirim)'}`);
    });

    console.log('\n📝 CONTOH PESAN YANG AKAN DIKIRIM (Pelanggan #1):');
    console.log('-'.repeat(55));
    console.log(targets[0].messageText);
    console.log('-'.repeat(55));
    return;
  }

  // 3. Live Sending Mode
  console.log('\n⚠️ PERHATIAN: Memulai LIVE SENDING ke nomor target...');
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];

    if (log.sent[c.waPhone]) {
      console.log(`[${i + 1}/${targets.length}] ⏭️ Melewati ${c.nama} (${c.waPhone}) — Sudah terkirim sebelumnya.`);
      skipCount++;
      continue;
    }

    console.log(`\n[${i + 1}/${targets.length}] 📤 Mengirim ke ${c.nama} (${c.waPhone}) - Rp ${c.nominal.toLocaleString('id-ID')}...`);

    try {
      const res = await sendWhatsApp(c.waPhone, c.messageText);
      if (res && (res.status === true || res.status === 'true')) {
        console.log(`   ✅ Berhasil terkirim! ID Pesan: ${res.id || '-'}`);
        log.sent[c.waPhone] = {
          id: c.id,
          nama: c.nama,
          zona: c.zona,
          nominal: c.nominal,
          invoiceNo: c.invoiceNo,
          sentAt: new Date().toISOString(),
          response: res
        };
        successCount++;
      } else {
        console.warn(`   ⚠️ Gagal mengirim: ${JSON.stringify(res)}`);
        log.failed[c.waPhone] = {
          id: c.id,
          nama: c.nama,
          failedAt: new Date().toISOString(),
          response: res
        };
        failCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error koneksi: ${err.message}`);
      log.failed[c.waPhone] = {
        id: c.id,
        nama: c.nama,
        failedAt: new Date().toISOString(),
        error: err.message
      };
      failCount++;
    }

    saveLog(log);

    // Jeda keamanan antar pesan (kecuali di nomor terakhir)
    if (i < targets.length - 1) {
      const delayMs = getRandomDelay(12, 20);
      console.log(`   ⏳ Menunggu jeda aman ${(delayMs / 1000).toFixed(1)} detik sebelum pesan berikutnya...`);
      await sleep(delayMs);
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log(' 🎉 PENGIRIMAN SELESAI!');
  console.log(`   • Berhasil : ${successCount}`);
  console.log(`   • Gagal    : ${failCount}`);
  console.log(`   • Dilewati : ${skipCount}`);
  console.log(`   • Log disimpan di: ${LOG_FILE}`);
  console.log('='.repeat(65));
}

main().catch(console.error);
