import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

export interface KontrolDbInfo {
  id: number;
  kodePelanggan: string;
  nama: string;
  status: string;
  alamat: string;
  kelurahan: string;
  wilayah: string;
  kategori: string;
  tarif: number;
}

export interface KontrolStaffInfo {
  role: string;
  jabatan: string;
  nama: string;
  catatan?: string;
}

export interface KontrolContact {
  id: string; // normalized phone (628xxx)
  phone: string; // 08xxx-xxxx-xxxx
  normPhone: string; // 628xxx
  savedName: string;
  publicName: string;
  displayName: string;
  isBusiness: boolean;
  source: 'hp_admin' | 'hp_petugas' | 'keduanya';
  sourceLabel: string;
  isRegistered: boolean;
  isStaff: boolean;
  labels: string[];
  indicatedArea: string;
  dbInfo?: KontrolDbInfo;
  staffInfo?: KontrolStaffInfo;
}

export interface DataKontrolSummary {
  totalKontak: number;
  sudahTerdaftar: number;
  belumTerdaftar: number;
  petugasDanKru: number;
  hpAdminCount: number;
  hpPetugasCount: number;
  keduanyaCount: number;
  berlabelKhususCount: number;
}

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('08')) clean = '62' + clean.slice(1);
  else if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

export function formatPhoneIndo(phone: string): string {
  if (!phone) return '-';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) clean = '0' + clean.slice(2);
  if (clean.length >= 10) return clean.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  return clean;
}

function splitCsvRow(line: string): string[] {
  const re = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
  const values: string[] = [];
  let match;
  while ((match = re.exec(line)) !== null) {
    let val = match[1];
    if (val === undefined) break;
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/""/g, '"');
    }
    values.push(val);
    if (re.lastIndex >= line.length) break;
  }
  return values;
}

export function detectLocation(savedName: string): string {
  const s = savedName.toLowerCase();
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

// Master Known Staff
const KNOWN_STAFF_RECORD: Record<string, KontrolStaffInfo> = {
  '6281400782617': { role: 'admin', nama: 'UPS HERU / ADMIN PUSAT', jabatan: 'Admin WhatsApp Pusat', catatan: 'HP Admin Utama (@upsheru)' },
  '6289688151473': { role: 'petugas', nama: 'SURVEI NOVI (TEAM NOVI DOYOK)', jabatan: 'survei,tagih,knek', catatan: 'HP Pengirim Blast Calon Pelanggan' },
  '6281532843224': { role: 'superadmin', nama: 'BANG HERU (CEO)', jabatan: 'CEO WastePay', catatan: 'Pimpinan & Pelanggan ID 177' },
  '6289602950531': { role: 'petugas', nama: 'AGO DRIVER (TEAM AGO)', jabatan: 'survei,angkut', catatan: 'Driver Lapangan' },
  '6282125115021': { role: 'petugas', nama: 'TEAM AGO (AFIFAH)', jabatan: 'survei,angkut', catatan: 'Tim Operasional Driver Ago' },
  '62895385058054': { role: 'petugas', nama: 'RYAN DUMP TRUCK (TEAM RIYAN JABA)', jabatan: 'angkut,survei', catatan: 'Driver Dump Truck' },
  '6289675528057': { role: 'petugas', nama: 'CEPOT DRIVER (TEAM CEPOT)', jabatan: 'angkut,survei', catatan: 'Driver Lapangan' },
  '6285353286062': { role: 'petugas', nama: 'ADIT PICKUP', jabatan: 'survei,angkut', catatan: 'Knek / Driver Pickup' },
  '6289502703352': { role: 'petugas', nama: 'PAUNG KNEK', jabatan: 'angkut,survei', catatan: 'Knek Lapangan' },
  '6289675424339': { role: 'petugas', nama: 'DANI KNEK', jabatan: 'angkut,survei', catatan: 'Knek Lapangan' },
  '6285716251003': { role: 'superadmin', nama: 'ROHMAT EKO / OMAX', jabatan: 'tagih,survei', catatan: 'Super Admin (Petugas ID 39)' },
  '6285836415075': { role: 'petugas', nama: 'RAMA', jabatan: 'survei', catatan: 'Petugas Lapangan Survey' },
  '6285781219141': { role: 'petugas', nama: 'PIAT DRIVER (CHIMORRY)', jabatan: 'angkut,survei', catatan: 'Driver Lapangan' },
  '6287742667520': { role: 'petugas', nama: 'AWAL DRIVER (TEAM AWAL)', jabatan: 'angkut,survei', catatan: 'Driver Lapangan' },
  '6283182628794': { role: 'petugas', nama: 'TEAM ODON', jabatan: 'angkut,survei', catatan: 'Kru Lapangan (Team Odon)' },
  '6288290624931': { role: 'internal', nama: 'NCE NYA BANGHERU', jabatan: 'Keluarga / Internal', catatan: 'Kontak Internal Manajemen' },
};

export const DEVICE_CONFIG = {
  admin: {
    phone: '081400782617',
    label: 'HP Admin Utama (081400782617)',
    token: process.env.WA_API_KEY?.trim() || 'yZeWGJymbrnTpub2x5rL',
    isPrimaryAdmin: true,
  },
  petugas: {
    phone: '089688151473',
    label: 'HP Petugas Survei (089688151473 - Novi)',
    token: '8n46RV2x9GosQYgtAS1j',
    isPrimaryAdmin: false,
  },
};

/**
 * Membaca data kontak dari berkas CSV / JSON di server
 */
export async function getKontrolContacts(): Promise<{
  contacts: KontrolContact[];
  summary: DataKontrolSummary;
  devices: typeof DEVICE_CONFIG;
}> {
  // 1. Ambil data database Pelanggan secara LIVE
  const allDbPelanggan = await prisma.pelanggan.findMany({
    select: {
      id: true,
      nama: true,
      noTelepon: true,
      kodePelanggan: true,
      status: true,
      alamat: true,
      kategori: true,
      customTarif: true,
      kelurahan: { select: { nama: true } },
      wilayah: { select: { nama: true } },
    },
  });

  const dbByPhone = new Map<string, typeof allDbPelanggan[0]>();
  const dbByKode = new Map<string, typeof allDbPelanggan[0]>();
  for (const p of allDbPelanggan) {
    const np = normalizePhone(p.noTelepon);
    if (np) dbByPhone.set(np, p);
    const nk = normalizePhone(p.kodePelanggan);
    if (nk) dbByKode.set(nk, p);
  }

  // 2. Ambil data Petugas & User DB
  const dbPetugas = await prisma.petugas.findMany({
    include: { user: { select: { id: true, nama: true, role: true, noTelepon: true } } },
  });
  const dbUsers = await prisma.user.findMany({
    select: { id: true, nama: true, role: true, noTelepon: true },
  });

  const staffMap = new Map<string, KontrolStaffInfo>();
  for (const [p, info] of Object.entries(KNOWN_STAFF_RECORD)) {
    staffMap.set(p, info);
  }
  for (const p of dbPetugas) {
    const np = normalizePhone(p.noTelepon);
    if (np && !staffMap.has(np)) {
      staffMap.set(np, {
        role: p.user?.role || 'petugas',
        nama: p.nama,
        jabatan: p.jabatan || 'Petugas Lapangan',
        catatan: `Petugas ID: ${p.id}`,
      });
    }
  }
  for (const u of dbUsers) {
    const nu = normalizePhone(u.noTelepon);
    if (nu && !staffMap.has(nu)) {
      staffMap.set(nu, {
        role: u.role,
        nama: u.nama,
        jabatan: u.role.toUpperCase(),
        catatan: `User ID: ${u.id}`,
      });
    }
  }

  // 3. Baca data HP Admin
  const contactsMap = new Map<string, {
    rawPhone: string;
    savedName: string;
    publicName: string;
    isBusiness: boolean;
    labels: string[];
    sourceAdmin: boolean;
    sourcePetugas: boolean;
  }>();

  const adminCsvPaths = [
    path.resolve('data/kontak-hp-admin-081400782617/kontak_mentah_hp_admin.csv'),
    path.resolve('scratch/admin_phone_contacts.csv'),
  ];
  for (const p of adminCsvPaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
      for (let i = 1; i < lines.length; i++) {
        const v = splitCsvRow(lines[i]);
        if (v.length < 3) continue;
        const rawPhone = (v[2] || '').trim();
        const norm = normalizePhone(rawPhone);
        if (!norm || norm.length < 9) continue;
        if (norm.includes('1313555') || (v[0] && v[0] !== '62' && v[0] !== 'ID')) continue; // skip non-indo

        const savedName = (v[5] || '').trim();
        const publicName = (v[6] || '').trim();
        const isBusiness = v[7] === 'true';
        let labels: string[] = [];
        if (v[9] && v[9] !== '[]') {
          try {
            const parsed = JSON.parse(v[9]);
            if (Array.isArray(parsed)) labels = parsed;
          } catch {
            labels = [v[9]];
          }
        }

        if (!contactsMap.has(norm)) {
          contactsMap.set(norm, {
            rawPhone,
            savedName,
            publicName,
            isBusiness,
            labels,
            sourceAdmin: true,
            sourcePetugas: false,
          });
        } else {
          const cur = contactsMap.get(norm)!;
          cur.sourceAdmin = true;
          if (labels.length > 0) cur.labels = Array.from(new Set([...cur.labels, ...labels]));
          if (!cur.savedName && savedName) cur.savedName = savedName;
          if (!cur.publicName && publicName) cur.publicName = publicName;
        }
      }
      break;
    }
  }

  // 4. Baca data HP Petugas Survei
  const petugasCsvPaths = [
    path.resolve('data/kontak-hp-petugas-089688151473/kontak_mentah_hp_petugas.csv'),
    path.resolve('data/blast-calon-089688151473/target_pelanggan_belum_terdaftar.csv'),
  ];
  for (const p of petugasCsvPaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
      for (let i = 1; i < lines.length; i++) {
        const v = splitCsvRow(lines[i]);
        if (v.length < 3) continue;
        let rawPhone = (v[2] || '').trim();
        if (p.includes('target_pelanggan_belum_terdaftar.csv')) {
          rawPhone = (v[2] || v[1] || '').trim();
        }
        const norm = normalizePhone(rawPhone);
        if (!norm || norm.length < 9) continue;
        if (norm.includes('1313555') || (v[0] && v[0] !== '62' && v[0] !== 'ID' && !v[0].startsWith('+62'))) continue;

        let savedName = (v[5] || '').trim();
        let publicName = (v[6] || '').trim();
        let isBusiness = v[7] === 'true';
        let labels: string[] = [];
        if (v[9] && v[9] !== '[]') {
          try {
            const parsed = JSON.parse(v[9]);
            if (Array.isArray(parsed)) labels = parsed;
          } catch {
            labels = [v[9]];
          }
        }
        if (p.includes('target_pelanggan_belum_terdaftar.csv')) {
          savedName = (v[3] || '').trim();
          publicName = (v[4] || '').trim();
          isBusiness = (v[5] || '').includes('Bisnis');
        }

        if (!contactsMap.has(norm)) {
          contactsMap.set(norm, {
            rawPhone,
            savedName,
            publicName,
            isBusiness,
            labels,
            sourceAdmin: false,
            sourcePetugas: true,
          });
        } else {
          const cur = contactsMap.get(norm)!;
          cur.sourcePetugas = true;
          if (labels.length > 0) cur.labels = Array.from(new Set([...cur.labels, ...labels]));
          if (!cur.savedName && savedName) cur.savedName = savedName;
          if (!cur.publicName && publicName) cur.publicName = publicName;
        }
      }
      break;
    }
  }

  // 5. Rakit kontak hasil gabungan dengan Live DB Matching
  const contactList: KontrolContact[] = [];

  let countSudah = 0;
  let countBelum = 0;
  let countStaff = 0;
  let countAdmin = 0;
  let countPetugas = 0;
  let countKeduanya = 0;
  let countBerlabel = 0;

  for (const [normPhone, c] of contactsMap.entries()) {
    const isStaff = staffMap.has(normPhone) ||
      c.savedName.toLowerCase().startsWith('team ') ||
      c.savedName.toLowerCase().includes('knek') ||
      c.savedName.toLowerCase().includes('driver') ||
      c.savedName.toLowerCase().includes('bang heru');

    const dbMatch = dbByPhone.get(normPhone) || dbByKode.get(normPhone);
    const isRegistered = !!dbMatch;

    let source: 'hp_admin' | 'hp_petugas' | 'keduanya' = 'hp_admin';
    let sourceLabel = 'HP Admin';
    if (c.sourceAdmin && c.sourcePetugas) {
      source = 'keduanya';
      sourceLabel = 'HP Admin & Petugas';
      countKeduanya++;
    } else if (c.sourcePetugas) {
      source = 'hp_petugas';
      sourceLabel = 'HP Petugas (Novi)';
      countPetugas++;
    } else {
      countAdmin++;
    }

    if (isStaff) countStaff++;
    else if (isRegistered) countSudah++;
    else countBelum++;

    if (c.labels.length > 0) countBerlabel++;

    const dispName = c.savedName && c.savedName !== '-' 
      ? c.savedName 
      : (c.publicName && c.publicName !== '-' ? c.publicName : formatPhoneIndo(normPhone));

    const item: KontrolContact = {
      id: normPhone,
      phone: formatPhoneIndo(normPhone),
      normPhone,
      savedName: c.savedName || '-',
      publicName: c.publicName || '-',
      displayName: dispName,
      isBusiness: c.isBusiness,
      source,
      sourceLabel,
      isRegistered,
      isStaff,
      labels: c.labels,
      indicatedArea: detectLocation(c.savedName),
      dbInfo: dbMatch ? {
        id: dbMatch.id,
        kodePelanggan: dbMatch.kodePelanggan,
        nama: dbMatch.nama,
        status: dbMatch.status,
        alamat: dbMatch.alamat || '-',
        kelurahan: dbMatch.kelurahan?.nama || '-',
        wilayah: dbMatch.wilayah?.nama || '-',
        kategori: dbMatch.kategori,
        tarif: dbMatch.customTarif || (dbMatch.kategori === 'level_1' ? 40000 : 50000),
      } : undefined,
      staffInfo: isStaff ? (staffMap.get(normPhone) || {
        role: 'petugas',
        nama: dispName,
        jabatan: 'Tim Lapangan / Kru',
        catatan: 'Terdeteksi dari nama kontak',
      }) : undefined,
    };

    contactList.push(item);
  }

  // Sort: belum terdaftar di atas, kemudian yang punya indikasi wilayah, kemudian nama
  contactList.sort((a, b) => {
    if (a.isStaff !== b.isStaff) return a.isStaff ? 1 : -1;
    if (a.isRegistered !== b.isRegistered) return a.isRegistered ? 1 : -1;
    if (a.labels.length !== b.labels.length) return b.labels.length - a.labels.length;
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    contacts: contactList,
    summary: {
      totalKontak: contactList.length,
      sudahTerdaftar: countSudah,
      belumTerdaftar: countBelum,
      petugasDanKru: countStaff,
      hpAdminCount: countAdmin,
      hpPetugasCount: countPetugas,
      keduanyaCount: countKeduanya,
      berlabelKhususCount: countBerlabel,
    },
    devices: DEVICE_CONFIG,
  };
}

/**
 * Eksekusi Blast WhatsApp dengan Routing Nomor Pengirim Masing-Masing
 */
export async function sendBlastWaWithRouting(params: {
  targets: Array<{
    phone: string;
    name?: string;
    source?: 'hp_admin' | 'hp_petugas' | 'keduanya';
    wilayah?: string;
  }>;
  messageTemplate: string;
  senderMode?: 'auto' | 'hp_petugas' | 'hp_admin';
  customToken?: string;
  delayMs?: number;
  dryRun?: boolean;
}): Promise<{
  totalRequested: number;
  totalSent: number;
  totalSkipped: number;
  totalFailed: number;
  details: Array<{
    phone: string;
    senderUsed: string;
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
  }>;
}> {
  const { targets, messageTemplate, senderMode = 'auto', dryRun = false, delayMs = 1500 } = params;

  // Verifikasi exclusion list (Admin, Petugas, Owner)
  const exclusionSet = new Set(Object.keys(KNOWN_STAFF_RECORD));

  // Verifikasi live registered DB untuk safety: jangan kirim blast pendaftaran ke yang sudah daftar!
  const allDb = await prisma.pelanggan.findMany({ select: { noTelepon: true, kodePelanggan: true } });
  const registeredSet = new Set<string>();
  for (const p of allDb) {
    const np = normalizePhone(p.noTelepon);
    if (np) registeredSet.add(np);
    const nk = normalizePhone(p.kodePelanggan);
    if (nk) registeredSet.add(nk);
  }

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const details: Array<{
    phone: string;
    senderUsed: string;
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
  }> = [];

  for (const target of targets) {
    const norm = normalizePhone(target.phone);
    if (!norm) {
      totalSkipped++;
      details.push({ phone: target.phone, senderUsed: '-', status: 'skipped', reason: 'Nomor tidak valid' });
      continue;
    }

    // Safety 1: Staf / Admin / Kru
    if (exclusionSet.has(norm)) {
      totalSkipped++;
      const staffInfo = KNOWN_STAFF_RECORD[norm];
      details.push({
        phone: norm,
        senderUsed: '-',
        status: 'skipped',
        reason: `Nomor internal / kru / admin (${staffInfo?.nama || 'Petugas'})`,
      });
      continue;
    }

    // Safety 2: Sudah Terdaftar di DB
    if (registeredSet.has(norm)) {
      totalSkipped++;
      details.push({ phone: norm, senderUsed: '-', status: 'skipped', reason: 'Sudah terdaftar aktif di database' });
      continue;
    }

    // Tentukan nomor pengirim & token
    let chosenSender = DEVICE_CONFIG.petugas;
    if (senderMode === 'hp_admin') {
      chosenSender = DEVICE_CONFIG.admin;
    } else if (senderMode === 'hp_petugas') {
      chosenSender = DEVICE_CONFIG.petugas;
    } else {
      // 'auto': Gunakan nomor sesuai asal kontak agar konsumen tidak bingung!
      if (target.source === 'hp_admin') {
        chosenSender = DEVICE_CONFIG.admin;
      } else {
        chosenSender = DEVICE_CONFIG.petugas;
      }
    }

    const tokenToUse = params.customToken?.trim() || chosenSender.token;

    // Format pesan
    const cleanName = target.name && target.name !== '-' ? target.name : 'Pelanggan Setia UPS HERU';
    const cleanWilayah = target.wilayah && target.wilayah !== '-' ? target.wilayah : 'lingkungan Anda';
    const personalizedMessage = messageTemplate
      .replace(/\{nama\}/gi, cleanName)
      .replace(/\{wilayah\}/gi, cleanWilayah)
      .replace(/\{link_daftar\}/gi, 'https://upsheru.com/daftar');

    try {
      const fonnteUrl = process.env.WA_API_URL?.trim() || 'https://api.fonnte.com/send';
      const res = await fetch(fonnteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: tokenToUse,
        },
        body: JSON.stringify({
          target: norm,
          message: personalizedMessage,
          countryCode: '62',
        }),
      });

      const resData = await res.json().catch(() => null);

      if (res.ok && resData && resData.status !== false) {
        totalSent++;
        details.push({ phone: norm, senderUsed: chosenSender.phone, status: 'sent' });
      } else {
        totalFailed++;
        details.push({
          phone: norm,
          senderUsed: chosenSender.phone,
          status: 'failed',
          reason: resData?.reason || resData?.message || `HTTP ${res.status}`,
        });
      }
    } catch (err) {
      totalFailed++;
      details.push({
        phone: norm,
        senderUsed: chosenSender.phone,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'Network error',
      });
    }

    // Anti-flood throttling (hanya jika pengiriman sungguhan)
    if (!dryRun && delayMs > 0 && targets.length > 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return {
    totalRequested: targets.length,
    totalSent,
    totalSkipped,
    totalFailed,
    details,
  };
}
