// Seed data dummy untuk verifikasi live production.
// Aman & idempotent: semua data uji diberi marker "[TEST]" / kode "TES-*"
// dan dihapus dulu sebelum di-insert ulang. Akun demo di-upsert.
//
// Jalankan:
//   node scripts/seed-dummy.mjs
// Hapus data uji saja (tanpa reseed):
//   CLEANUP_ONLY=1 node scripts/seed-dummy.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
  connectionTimeoutMillis: 20000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const log = (...a) => console.log(...a);
const step = (s) => log("\n\u25B6", s);

// ---------------------------------------------------------------------------
// Data pelanggan uji (koordinat di sekitar Depok, -6.40..-6.43 / 106.81..106.84)
// ---------------------------------------------------------------------------
const PELANGGAN = [
  { kode: "TES-001", nama: "[TEST] Rumah Bpk Andi", telp: "0812-1000-001", kategori: "rumah_tangga", alamat: "Jl. Merdeka No. 1, Cilodong", rtRw: "001/002", patokan: "Depan warung hijau", wilayah: 73, status: "aktif", lat: -6.3990, lng: 106.8230 },
  { kode: "TES-002", nama: "[TEST] Toko Sembako Jaya", telp: "0812-1000-002", kategori: "bisnis", alamat: "Jl. Raya Cilodong No. 10", rtRw: "001/002", patokan: "Samping ATM", wilayah: 73, status: "aktif", lat: -6.4002, lng: 106.8245 },
  { kode: "TES-003", nama: "[TEST] Kost Putri Melati", telp: "0812-1000-003", kategori: "kost", alamat: "Gg. Melati No. 3", rtRw: "002/002", patokan: "Gerbang biru", wilayah: 73, status: "aktif", lat: -6.4010, lng: 106.8250 },
  { kode: "TES-004", nama: "[TEST] RM Padang Sederhana", telp: "0812-1000-004", kategori: "rm_makan", alamat: "Jl. Cilodong No. 25", rtRw: "002/002", patokan: "Depan minimarket", wilayah: 73, status: "aktif", lat: -6.3995, lng: 106.8260 },
  { kode: "TES-005", nama: "[TEST] SDN Cilodong 1", telp: "0812-1000-005", kategori: "sekolah", alamat: "Jl. Pendidikan No. 5", rtRw: "001/003", patokan: "Gerbang putih", wilayah: 74, status: "aktif", lat: -6.4245, lng: 106.8320 },
  { kode: "TES-006", nama: "[TEST] Rumah Ibu Sari", telp: "0812-1000-006", kategori: "rumah_tangga", alamat: "Jl. Anggrek No. 8", rtRw: "002/003", patokan: "Pagar coklat", wilayah: 74, status: "aktif", lat: -6.4250, lng: 106.8330 },
  { kode: "TES-007", nama: "[TEST] Kantor Jasa Konsultan", telp: "0812-1000-007", kategori: "perkantoran", alamat: "Jl. Raya Kalimulya No. 12", rtRw: "003/003", patokan: "Lantai 2", wilayah: 74, status: "aktif", lat: -6.4260, lng: 106.8340 },
  { kode: "TES-008", nama: "[TEST] Rumah Bpk Budi (Libur)", telp: "0812-1000-008", kategori: "rumah_tangga", alamat: "Jl. Melati No. 4", rtRw: "002/002", patokan: null, wilayah: 73, status: "libur", lat: -6.4020, lng: 106.8235 },
  { kode: "TES-009", nama: "[TEST] Rumah Bpk Candra", telp: "0812-1000-009", kategori: "rumah_tangga", alamat: "Jl. Kenanga No. 6", rtRw: "003/002", patokan: null, wilayah: 73, status: "aktif", lat: -6.4015, lng: 106.8265 },
  { kode: "TES-010", nama: "[TEST] Warung Kopi Nusantara", telp: "0812-1000-010", kategori: "rm_makan", alamat: "Jl. Cilodong No. 30", rtRw: "001/002", patokan: "Teras kayu", wilayah: 73, status: "aktif", lat: -6.4000, lng: 106.8270 },
  { kode: "TES-011", nama: "[TEST] Calon Pelanggan A (Survey)", telp: "0812-1000-011", kategori: "rumah_tangga", alamat: "Jl. Baru No. 1", rtRw: null, patokan: null, wilayah: null, status: "calon", lat: -6.4270, lng: 106.8360 },
  { kode: "TES-012", nama: "[TEST] Calon Pelanggan B (Survey)", telp: "0812-1000-012", kategori: "bisnis", alamat: "Jl. Baru No. 2", rtRw: null, patokan: null, wilayah: null, status: "calon", lat: -6.4275, lng: 106.8370 },
  { kode: "TES-013", nama: "[TEST] Rumah Nonaktif", telp: "0812-1000-013", kategori: "rumah_tangga", alamat: "Jl. Lama No. 9", rtRw: "004/002", patokan: null, wilayah: 73, status: "nonaktif", lat: -6.4030, lng: 106.8220 },
  { kode: "TES-014", nama: "[TEST] Dapur MBG Industri", telp: "0812-1000-014", kategori: "industri", alamat: "Kawasan Cilodong Blok A", rtRw: null, patokan: "Gedung abu-abu", wilayah: 74, status: "aktif", lat: -6.4265, lng: 106.8350, paketId: 14 },
];

const TARIF = {
  rumah_tangga: 40000,
  bisnis: 75000,
  kost: 50000,
  rm_makan: 75000,
  sekolah: 75000,
  perkantoran: 100000,
  industri: 100000,
  lainnya: 50000,
};

const AKTIF = PELANGGAN.filter((p) => p.status === "aktif");

async function cleanup() {
  step("Hapus data uji lama (marker [TEST] / TES-*)");
  const t = { startsWith: "TES-" };
  await prisma.pembayaran.deleteMany({ where: { tagihan: { pelanggan: { kodePelanggan: t } } } });
  await prisma.tagihan.deleteMany({ where: { pelanggan: { kodePelanggan: t } } });
  await prisma.pengangkutan.deleteMany({
    where: { OR: [{ pelanggan: { kodePelanggan: t } }, { kendaraan: { nama: { startsWith: "[TEST]" } } }] },
  });
  await prisma.jadwal.deleteMany({
    where: { OR: [{ rute: { nama: { startsWith: "[TEST]" } } }, { pelanggan: { kodePelanggan: t } }] },
  });
  await prisma.komplain.deleteMany({ where: { pelanggan: { kodePelanggan: t } } });
  await prisma.liburSementara.deleteMany({ where: { pelanggan: { kodePelanggan: t } } });
  await prisma.notifikasi.deleteMany({ where: { pelanggan: { kodePelanggan: t } } });
  await prisma.pelanggan.deleteMany({ where: { kodePelanggan: t } });
  await prisma.rute.deleteMany({ where: { nama: { startsWith: "[TEST]" } } });
  await prisma.lokasiKendaraan.deleteMany({ where: { kendaraan: { nama: { startsWith: "[TEST]" } } } });
  await prisma.kendaraan.deleteMany({ where: { nama: { startsWith: "[TEST]" } } });
  await prisma.tpa.deleteMany({ where: { nama: { startsWith: "[TEST]" } } });
  await prisma.pengumuman.deleteMany({ where: { judul: { startsWith: "[TEST]" } } });
  await prisma.klaimPetugas.deleteMany({ where: { keterangan: { startsWith: "[TEST]" } } });
  await prisma.chatPesan.deleteMany({ where: { isi: { startsWith: "[TEST]" } } });
  await prisma.absensi.deleteMany({ where: { petugas: { nama: { startsWith: "[TEST]" } } } });

  // ---- Akun demo & profil petugas demo -----------------------------------
  // Hapus lokasi petugas demo, profil petugas, lalu user demo (FK order aman).
  await prisma.lokasiPetugas.deleteMany({ where: { petugas: { nama: { startsWith: "[TEST]" } } } });
  await prisma.petugas.deleteMany({ where: { nama: { startsWith: "[TEST]" } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@wastepay.local" } } });
  log("  ok — data uji & akun demo bersih");
}

async function seed() {
  await cleanup();

  // ---- 1. Akun demo ------------------------------------------------------
  step("Akun demo (upsert)");
  const pw = await bcrypt.hash("demo123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "demo-admin@wastepay.local" },
    update: { password: pw, role: "admin", aktif: true },
    create: { email: "demo-admin@wastepay.local", password: pw, nama: "[TEST] Demo Admin", role: "admin", aktif: true },
  });
  const petugasUser = await prisma.user.upsert({
    where: { email: "demo-petugas@wastepay.local" },
    update: { password: pw, role: "petugas", aktif: true },
    create: { email: "demo-petugas@wastepay.local", password: pw, nama: "[TEST] Demo Petugas", role: "petugas", aktif: true },
  });
  const profilPetugas = await prisma.petugas.upsert({
    where: { userId: petugasUser.id },
    update: { nama: "[TEST] Demo Petugas", jabatan: "angkut,tagih,survei", aktif: true, wilayahId: 73 },
    create: {
      nama: "[TEST] Demo Petugas",
      noTelepon: "0812-2000-0001",
      email: "demo-petugas@wastepay.local",
      jabatan: "angkut,tagih,survei",
      aktif: true,
      wilayahId: 73,
      userId: petugasUser.id,
    },
  });
  log("  demo-admin  :", admin.email, "/ demo123 (id", admin.id + ")");
  log("  demo-petugas:", petugasUser.email, "/ demo123 (id", petugasUser.id, ", petugas id", profilPetugas.id + ")");

  // ---- 2. Kendaraan aktif ------------------------------------------------
  step("Kendaraan uji");
  const dump = await prisma.kendaraan.create({
    data: { nama: "[TEST] Dump Truck 01", platNomor: "B 9001 O2W", jenis: "dump_truck", kapasitas: 5000, aktif: true, petugasId: profilPetugas.id },
  });
  const pickup = await prisma.kendaraan.create({
    data: { nama: "[TEST] Pickup 02", platNomor: "B 9002 O2W", jenis: "pickup", kapasitas: 1000, aktif: true, petugasId: profilPetugas.id },
  });
  log("  dump truck id", dump.id, "| pickup id", pickup.id);

  // ---- 3. TPA -------------------------------------------------------------
  step("TPA uji");
  const tpa1 = await prisma.tpa.create({ data: { nama: "[TEST] TPA Cipayung", alamat: "Cipayung, Depok", kota: "Depok", jarak: 12, aktif: true } });
  const tpa2 = await prisma.tpa.create({ data: { nama: "[TEST] TPA Sawangan", alamat: "Sawangan, Depok", kota: "Depok", jarak: 15, aktif: true } });
  log("  TPA ids", tpa1.id, tpa2.id);

  // ---- 4. Pelanggan -------------------------------------------------------
  step("Pelanggan uji (" + PELANGGAN.length + ")");
  const byKode = {};
  for (const p of PELANGGAN) {
    const created = await prisma.pelanggan.create({
      data: {
        nama: p.nama,
        noTelepon: p.telp,
        kategori: p.kategori,
        alamat: p.alamat,
        rtRw: p.rtRw,
        kodePelanggan: p.kode,
        patokanLokasi: p.patokan,
        latitude: p.lat,
        longitude: p.lng,
        koordinatSumber: "manual",
        penanggungjawab: p.nama.replace("[TEST] ", ""),
        status: p.status,
        wilayahId: p.wilayah,
        paketId: p.paketId ?? null,
      },
    });
    byKode[p.kode] = created;
  }
  log("  contoh:", PELANGGAN.slice(0, 3).map((p) => p.kode + " (id " + byKode[p.kode].id + ")").join(", "));

  // ---- 5. Rute + Jadwal ---------------------------------------------------
  step("Rute & Jadwal uji");
  const rute73 = await prisma.rute.create({
    data: { nama: "[TEST] Rute Kalibaru (Sen/Rab/Jum)", hari: "Senin,Rabu,Jumat", jam: "06:00", aktif: true, wilayahId: 73, petugasId: profilPetugas.id },
  });
  const rute74 = await prisma.rute.create({
    data: { nama: "[TEST] Rute Cilodong (Sel/Kam)", hari: "Selasa,Kamis", jam: "06:30", aktif: true, wilayahId: 74, petugasId: profilPetugas.id },
  });
  for (const p of AKTIF) {
    if (p.wilayah === 73) {
      await prisma.jadwal.create({ data: { hari: "Senin", jam: "06:00", aktif: true, pelangganId: byKode[p.kode].id, ruteId: rute73.id } });
    } else if (p.wilayah === 74) {
      await prisma.jadwal.create({ data: { hari: "Selasa", jam: "06:30", aktif: true, pelangganId: byKode[p.kode].id, ruteId: rute74.id } });
    }
  }
  log("  rute ids", rute73.id, rute74.id);

  // ---- 6. Tagihan + Pembayaran --------------------------------------------
  step("Tagihan & Pembayaran uji");
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1;
  const prevYear = thisMonth === 1 ? thisYear - 1 : thisYear;
  const yyyymm = (y, m) => `${y}${String(m).padStart(2, "0")}`;
  const invoice = (kode, y, m) => `INV/${kode.replace(/-/g, "")}/${yyyymm(y, m)}`;
  const jatuhTempo = (y, m) => new Date(y, m - 1, 10, 12, 0, 0);

  // status tagihan per kode (bulan berjalan)
  const statusBulanIni = {
    "TES-001": "belum_bayar", "TES-002": "belum_bayar", "TES-003": "belum_bayar",
    "TES-004": "belum_bayar", "TES-005": "belum_bayar", "TES-006": "lunas",
    "TES-007": "belum_bayar", "TES-009": "tunggakan", "TES-010": "lunas", "TES-014": "belum_bayar",
  };

  let nTagihan = 0, nBayar = 0;
  for (const p of AKTIF) {
    const jumlah = p.paketId ? 1500000 : (TARIF[p.kategori] ?? 50000);
    // Bulan lalu → lunas + pembayaran
    const prev = await prisma.tagihan.create({
      data: {
        noInvoice: invoice(p.kode, prevYear, prevMonth),
        bulan: prevMonth, tahun: prevYear, jumlah,
        status: "lunas", jatuhTempo: jatuhTempo(prevYear, prevMonth),
        tanggalLunas: new Date(prevYear, prevMonth - 1, 5, 9, 0, 0),
        pelangganId: byKode[p.kode].id,
      },
    });
    await prisma.pembayaran.create({
      data: {
        tanggal: new Date(prevYear, prevMonth - 1, 5, 9, 0, 0),
        jumlah, metode: "transfer", buktiBayar: null,
        status: "terverifikasi", tagihanId: prev.id, pelangganId: byKode[p.kode].id,
        verifiedById: admin.id,
      },
    });
    nTagihan++; nBayar++;

    // Bulan ini
    const st = statusBulanIni[p.kode] ?? "belum_bayar";
    const cur = await prisma.tagihan.create({
      data: {
        noInvoice: invoice(p.kode, thisYear, thisMonth),
        bulan: thisMonth, tahun: thisYear, jumlah,
        status: st, jatuhTempo: jatuhTempo(thisYear, thisMonth),
        tanggalLunas: st === "lunas" ? now : null,
        pelangganId: byKode[p.kode].id,
      },
    });
    nTagihan++;
    if (st === "lunas") {
      await prisma.pembayaran.create({
        data: {
          tanggal: now, jumlah, metode: "qris", buktiBayar: null,
          status: "terverifikasi", tagihanId: cur.id, pelangganId: byKode[p.kode].id,
          verifiedById: admin.id,
        },
      });
      nBayar++;
    }
  }
  log("  tagihan:", nTagihan, "| pembayaran:", nBayar);

  // ---- 7. Pengangkutan (lapor angkut) -------------------------------------
  step("Pengangkutan uji (lapor angkut)");
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const kemarin = new Date(hariIni); kemarin.setDate(kemarin.getDate() - 1);
  const angkutData = [
    { kode: "TES-001", tgl: hariIni, status: "diambil", vol: 1.5, berat: 45, jenis: "campuran", catatan: null },
    { kode: "TES-002", tgl: hariIni, status: "diambil", vol: 3.0, berat: 90, jenis: "anorganik", catatan: null },
    { kode: "TES-003", tgl: hariIni, status: "kosong", vol: null, berat: null, jenis: null, catatan: "[TEST] Rumah kosong" },
    { kode: "TES-004", tgl: hariIni, status: "tidak_diangkut", vol: null, berat: null, jenis: null, catatan: "[TEST] Akses tertutup" },
    { kode: "TES-005", tgl: hariIni, status: "diambil", vol: 2.0, berat: 60, jenis: "organik", catatan: null },
    { kode: "TES-001", tgl: kemarin, status: "diambil", vol: 1.5, berat: 44, jenis: "campuran", catatan: null },
    { kode: "TES-006", tgl: kemarin, status: "diambil", vol: 1.0, berat: 30, jenis: "campuran", catatan: null },
  ];
  for (const a of angkutData) {
    const p = byKode[a.kode];
    await prisma.pengangkutan.create({
      data: {
        tanggal: a.tgl, status: a.status, volume: a.vol, berat: a.berat, jenisSampah: a.jenis,
        catatan: a.catatan, fotoBukti: null, latitude: p.latitude, longitude: p.longitude,
        pelangganId: p.id, petugasId: profilPetugas.id, kendaraanId: dump.id,
        tpaId: a.status === "diambil" ? tpa1.id : null,
      },
    });
  }
  log("  pengangkutan:", angkutData.length);

  // ---- 8. Absensi ---------------------------------------------------------
  step("Absensi uji");
  for (const [i, jab] of [["angkut", "angkut,tagih,survei"]]) {
    await prisma.absensi.create({
      data: {
        petugasId: profilPetugas.id, waktuMasuk: new Date(hariIni.getTime() + 2 * 3600e3),
        lokasiMasuk: JSON.stringify({ lat: -6.4005, lng: 106.8242, accuracy: 12 }),
        status: "hadir",
      },
    });
  }
  log("  absensi: 1 (hadir)");

  // ---- 9. Klaim -----------------------------------------------------------
  step("Klaim uji");
  await prisma.klaimPetugas.create({
    data: {
      petugasId: profilPetugas.id, tanggal: now, kategori: "bbm", nominal: 150000,
      keterangan: "[TEST] BBM dump truck hari ini", status: "menunggu",
    },
  });
  await prisma.klaimPetugas.create({
    data: {
      petugasId: profilPetugas.id, tanggal: kemarin, kategori: "perawatan", nominal: 300000,
      keterangan: "[TEST] Servis rem pickup", status: "disetujui",
      catatanAdmin: "OK, disetujui", diperiksaById: admin.id, waktuDiperiksa: now,
    },
  });
  log("  klaim: 2");

  // ---- 10. Chat -----------------------------------------------------------
  step("Chat uji (petugas <-> admin)");
  await prisma.chatPesan.createMany({
    data: [
      { petugasId: profilPetugas.id, userId: null, dariPetugas: true, isi: "[TEST] Pak, TES-003 kosong, tidak ada orang di rumah", dibaca: true, createdAt: new Date(hariIni.getTime() + 3 * 3600e3) },
      { petugasId: profilPetugas.id, userId: admin.id, dariPetugas: false, isi: "[TEST] Noted, catat status KOSONG ya", dibaca: true, createdAt: new Date(hariIni.getTime() + 3.1 * 3600e3) },
      { petugasId: profilPetugas.id, userId: null, dariPetugas: true, isi: "[TEST] Siap, sudah saya laporkan", dibaca: true, createdAt: new Date(hariIni.getTime() + 3.2 * 3600e3) },
      { petugasId: profilPetugas.id, userId: null, dariPetugas: true, isi: "[TEST] Mohon info rute tambahan wilayah Cilodong", dibaca: false, createdAt: now },
    ],
  });
  log("  chat: 4 pesan (1 belum dibaca)");

  // ---- 11. Pengumuman -----------------------------------------------------
  step("Pengumuman uji");
  await prisma.pengumuman.create({
    data: { judul: "[TEST] Jadwal angkut libur Idul Adha", isi: "Angkut diliburkan 1 hari. Tetap lapor jika ada tumpukan.", penting: true, untukWilayahId: null, createdById: admin.id },
  });
  await prisma.pengumuman.create({
    data: { judul: "[TEST] Info penutupan TPS sementara", isi: "TPS Cipayung tutup sementara, alihkan ke Sawangan.", penting: false, untukWilayahId: 73, createdById: admin.id },
  });
  log("  pengumuman: 2");

  // ---- 12. Komplain -------------------------------------------------------
  step("Komplain uji");
  await prisma.komplain.create({
    data: { jenis: "tidak_diangkut", deskripsi: "[TEST] Sampah belum diangkut 2 hari", status: "baru", pelangganId: byKode["TES-001"].id },
  });
  await prisma.komplain.create({
    data: { jenis: "sampah_menumpuk", deskripsi: "[TEST] Tong sampah rusak", status: "selesai", tanggapan: "Sudah diganti", pelangganId: byKode["TES-004"].id, resolvedById: admin.id },
  });
  log("  komplain: 2");

  // ---- 13. Lokasi (map hidup) ---------------------------------------------
  step("Lokasi uji (map)");
  const lokasiPetugas = [
    [-6.4005, 106.8242], [-6.4010, 106.8248], [-6.4015, 106.8253],
  ];
  for (const [lat, lng] of lokasiPetugas) {
    await prisma.lokasiPetugas.create({
      data: { petugasId: profilPetugas.id, latitude: lat, longitude: lng, akurasi: 10, sumber: "gps_perangkat", createdAt: new Date(hariIni.getTime() + 4 * 3600e3) },
    });
  }
  for (const [lat, lng] of [[-6.4005, 106.8242], [-6.4012, 106.8250]]) {
    await prisma.lokasiKendaraan.create({
      data: { kendaraanId: dump.id, latitude: lat, longitude: lng, akurasi: 15, sumber: "gps_perangkat", createdAt: new Date(hariIni.getTime() + 4 * 3600e3) },
    });
  }
  log("  lokasiPetugas: +3 | lokasiKendaraan: +2");

  // ---- Rangkuman ----------------------------------------------------------
  log("\n======================================================");
  log("SEED SELESAI. Akun demo untuk login:");
  log("  Admin   : demo-admin@wastepay.local   / demo123");
  log("  Petugas : demo-petugas@wastepay.local / demo123  (angkut+tagih+survei)");
  log("  Kode pelanggan uji: TES-001 .. TES-014 (ketik cepat di /m/lapor)");
  log("======================================================");
}

async function main() {
  try {
    if (process.env.CLEANUP_ONLY === "1") {
      await cleanup();
      log("\nCleanup selesai (data uji dihapus).");
    } else {
      await seed();
    }
  } catch (e) {
    console.error("\nERROR:", e?.message ?? e);
    if (e?.meta) console.error("meta:", JSON.stringify(e.meta));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
