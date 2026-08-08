// Seed ulang data dummy WastePay — 4 area di Depok (Beji & Pancoran Mas), 12 konsumen/area.
// Menghapus SEMUA data operasional lama, lalu membuat data baru yang realistis.
// Catatan: akun User & Pengaturan TIDAK dihapus (agar login tetap jalan).
//
// Jalankan: node scripts/seed-dummy.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const BULAN_INI = 8; // Agustus
const TAHUN_INI = 2026;
const BULAN_LALU = 7;

// ── Area: 4 wilayah berbeda di Kota Depok (koordinat asli sekitar Beji & Pancoran Mas)
const AREA = [
  {
    nama: "RT 01 / RW 03",
    rt: "01", rw: "03", kelurahan: "Beji", kecamatan: "Beji", kota: "Depok",
    base: { lat: -6.3892, lng: 106.8195 },
    rute: { nama: "Rute Beji RT 01", hari: "Senin, Kamis", jam: "07:00", petugas: "Slamet Riyadi" },
    hari: ["Senin", "Kamis"],
  },
  {
    nama: "RT 02 / RW 03",
    rt: "02", rw: "03", kelurahan: "Beji", kecamatan: "Beji", kota: "Depok",
    base: { lat: -6.3925, lng: 106.823 },
    rute: { nama: "Rute Beji RT 02", hari: "Selasa, Jumat", jam: "07:30", petugas: "Joko Susilo" },
    hari: ["Selasa", "Jumat"],
  },
  {
    nama: "RT 04 / RW 05",
    rt: "04", rw: "05", kelurahan: "Pancoran Mas", kecamatan: "Pancoran Mas", kota: "Depok",
    base: { lat: -6.4065, lng: 106.8275 },
    rute: { nama: "Rute Pancoran Mas RT 04", hari: "Rabu, Sabtu", jam: "07:00", petugas: "Bambang Haryanto" },
    hari: ["Rabu", "Sabtu"],
  },
  {
    nama: "RT 05 / RW 05",
    rt: "05", rw: "05", kelurahan: "Pancoran Mas", kecamatan: "Pancoran Mas", kota: "Depok",
    base: { lat: -6.41, lng: 106.8315 },
    rute: { nama: "Rute Pancoran Mas RT 05", hari: "Senin, Kamis", jam: "08:00", petugas: "Dedi Kurniawan" },
    hari: ["Senin", "Kamis"],
  },
];

// ── 12 konsumen per area (nama, kategori, patokan)
const KONSUMEN = [
  { n: "H. Ahmad Fauzi", k: "rumah_tangga", pat: "Sebelah masjid Jami Al-Barokah" },
  { n: "Ibu Siti Rahmawati", k: "rumah_tangga", pat: "Gang samping Pos RT" },
  { n: "Bpk. Dedi Supriyadi", k: "rumah_tangga", pat: "Depan lapangan voli" },
  { n: "Ibu Ratna Sari Dewi", k: "rumah_tangga", pat: null },
  { n: "Bpk. Agus Salim", k: "rumah_tangga", pat: "Dekat mushola An-Nur" },
  { n: "Ibu Yuli Astuti", k: "rumah_tangga", pat: null },
  { n: "Bpk. Bambang Prasetyo", k: "rumah_tangga", pat: "Pagar hijau, dekat SD" },
  { n: "Ibu Dewi Lestari", k: "rumah_tangga", pat: null },
  { n: "Bpk. Hendra Gunawan", k: "rumah_tangga", pat: "Sebelah warung klontong" },
  { n: "Ibu Nining Sunarsih", k: "rumah_tangga", pat: null },
  { n: "Bpk. Jajang Sukmara", k: "rumah_tangga", pat: "Belakang kantor RW" },
  { n: "Warung Bu Tini", k: "bisnis", pat: "Pojok gang, dekat pasar" },
  { n: "Bpk. Ujang Hermawan", k: "rumah_tangga", pat: null },
  { n: "Ibu Eneng Komalasari", k: "rumah_tangga", pat: "Depan TK Melati" },
  { n: "Bpk. Rudi Hartono", k: "rumah_tangga", pat: null },
  { n: "Ibu Susi Susilowati", k: "rumah_tangga", pat: "Dekat pom air umum" },
  { n: "Bpk. Taufik Hidayat", k: "rumah_tangga", pat: null },
  { n: "Ibu Nur Aisyah", k: "rumah_tangga", pat: "Gang 3, rumah bata merah" },
  { n: "Bpk. Andi Firmansyah", k: "rumah_tangga", pat: null },
  { n: "Ibu Rina Marlina", k: "rumah_tangga", pat: "Sebelah kios pulsa" },
  { n: "Bpk. Cecep Somantri", k: "rumah_tangga", pat: null },
  { n: "Ibu Lilis Suryani", k: "rumah_tangga", pat: "Depan lapangan badminton" },
  { n: "Kos Pak Eko", k: "kost", pat: "Sebelah Indomaret" },
  { n: "Bpk. Maman Abdurrahman", k: "rumah_tangga", pat: null },
  { n: "Ibu Hj. Nani Suhaeni", k: "rumah_tangga", pat: "Depan kantor kelurahan" },
  { n: "Bpk. Dadang Iskandar", k: "rumah_tangga", pat: null },
  { n: "Ibu Wiwin Winarti", k: "rumah_tangga", pat: "Gang Dahlia nomor 3" },
  { n: "Bpk. Eep Hidayat", k: "rumah_tangga", pat: null },
  { n: "Ibu Tuti Herawati", k: "rumah_tangga", pat: "Sebelah toko bangunan" },
  { n: "Bpk. Yayat Ruhiyat", k: "rumah_tangga", pat: null },
  { n: "Ibu Aan Sunarti", k: "rumah_tangga", pat: "Dekat gardu listrik" },
  { n: "Bpk. Heri Kurnia", k: "rumah_tangga", pat: null },
  { n: "Ibu Cucu Sukaesih", k: "rumah_tangga", pat: "Depan rumah kosong" },
  { n: "Bpk. Deni Ramdani", k: "rumah_tangga", pat: null },
  { n: "RM Sederhana Bu Aci", k: "rm_makan", pat: "Pinggir jalan raya" },
  { n: "Bpk. Uus Ruswandi", k: "rumah_tangga", pat: null },
  { n: "Bpk. Asep Saepudin", k: "rumah_tangga", pat: "Belakang masjid Al-Hidayah" },
  { n: "Ibu Oom Komariah", k: "rumah_tangga", pat: null },
  { n: "Bpk. Endang Suhendar", k: "rumah_tangga", pat: "Gang Kenanga" },
  { n: "Ibu Imas Masitoh", k: "rumah_tangga", pat: null },
  { n: "Bpk. Nanang Kosim", k: "rumah_tangga", pat: "Dekat posyandu" },
  { n: "Ibu Erna Wati", k: "rumah_tangga", pat: null },
  { n: "Bpk. Wawan Setiawan", k: "rumah_tangga", pat: "Sebelah bengkel motor" },
  { n: "Ibu Pipih Sopiah", k: "rumah_tangga", pat: null },
  { n: "Bpk. Tedi Mulyadi", k: "rumah_tangga", pat: "Depan gapura RT" },
  { n: "Ibu Yeti Rohayati", k: "rumah_tangga", pat: null },
  { n: "Toko Sembako Pak Yadi", k: "bisnis", pat: "Pojok jalan, dekat sekolah" },
  { n: "Ibu Ida Farida", k: "rumah_tangga", pat: null },
];

const TARIF = {
  rumah_tangga: 30000,
  kost: 50000,
  bisnis: 75000,
  rm_makan: 60000,
};

// Beberapa pelanggan tidak punya koordinat (untuk status "belum terpetakan")
const TANPA_KOORD = new Set([3, 10, 14, 27, 38, 44]); // indeks pelanggan (0-based)

function koordinat(areaIdx, i) {
  const { lat, lng } = AREA[areaIdx].base;
  return {
    lat: +(lat + Math.floor(i / 4) * 0.0016 + (i % 2) * 0.0006 + ((i * 7) % 10) * 0.00008).toFixed(6),
    lng: +(lng + (i % 4) * 0.0016 + ((i * 13) % 10) * 0.00008).toFixed(6),
  };
}

async function main() {
  console.log("⏳ Membersihkan data lama...");

  // Hapus urut FK-safe (User & Pengaturan dipertahankan)
  const urutan = [
    "duitkuTransaction", "pembayaran", "tagihan", "komplain", "pengangkutan",
    "liburSementara", "notifikasi", "jadwal", "rute", "pelanggan", "petugas",
    "pengumuman", "pengeluaran", "auditLog", "rekonsiliasi", "tpa",
    "wilayah", "kategoriTarif", "paket",
  ];
  for (const m of urutan) {
    const del = await prisma[m].deleteMany({});
    console.log(`  - ${m}: ${del.count} dihapus`);
  }

  // ── Master ──
  console.log("\n📦 Membuat data master...");
  for (const [k, label, tarif, desc] of [
    ["rumah_tangga", "Rumah Tangga", 30000, "Rumah tinggal, angkut 2x seminggu"],
    ["bisnis", "Bisnis / Toko", 75000, "Toko / usaha kecil, angkut 3x seminggu"],
    ["kost", "Kost", 50000, "Kost / kontrakan, angkut 2x seminggu"],
    ["sekolah", "Sekolah", 100000, "Sekolah / lembaga pendidikan"],
    ["rm_makan", "Rumah Makan", 60000, "RM / warung makan, angkut setiap hari"],
    ["perkantoran", "Perkantoran", 150000, "Kantor / perkantoran"],
    ["industri", "Industri", 250000, "Industri / pabrik"],
    ["lainnya", "Lainnya", 40000, "Kategori lainnya"],
  ]) {
    await prisma.kategoriTarif.create({ data: { kategori: k, label, tarif, deskripsi: desc } });
  }
  for (const [nama, harga, deskripsi] of [
    ["Paket A", 30000, "Angkut 2x seminggu"],
    ["Paket B", 40000, "Angkut 3x seminggu"],
    ["Paket C", 75000, "Angkut setiap hari"],
  ]) {
    await prisma.paket.create({ data: { nama, harga, deskripsi } });
  }
  const tpa = await prisma.tpa.create({
    data: { nama: "TPA Cipayung", alamat: "Jl. Raya Cipayung, Kec. Cipayung", kota: "Depok", jarak: 12 },
  });

  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  const adminId = users.find((u) => u.role === "superadmin")?.id ?? users[0]?.id;
  const kasirId = users.find((u) => u.role === "kasir")?.id ?? adminId;
  if (!adminId) throw new Error("Tidak ada akun User — jalankan seed admin dulu (POST /api/auth/seed)");

  // ── Wilayah + Petugas + Rute ──
  console.log("📍 Membuat 4 wilayah (12 konsumen/area)...");
  const wilayahMap = {};
  const petugasMap = {};
  for (let a = 0; a < AREA.length; a++) {
    const ar = AREA[a];
    const wilayah = await prisma.wilayah.create({
      data: {
        nama: ar.nama, rt: ar.rt, rw: ar.rw,
        kelurahan: ar.kelurahan, kecamatan: ar.kecamatan, kota: ar.kota,
      },
    });
    wilayahMap[a] = wilayah;
    const petugas = await prisma.petugas.create({
      data: {
        nama: ar.rute.petugas,
        noTelepon: `08123456780${a + 1}`,
        email: `petugas${a + 1}.herozerowaste@gmail.com`,
        jabatan: a === 0 ? "angkut" : a === 1 ? "angkut,tagih" : a === 2 ? "angkut,survei" : "angkut",
        aktif: true,
        wilayahId: wilayah.id,
      },
    });
    petugasMap[a] = petugas;
    await prisma.rute.create({
      data: {
        nama: ar.rute.nama, hari: ar.rute.hari, jam: ar.rute.jam,
        aktif: true, wilayahId: wilayah.id, petugasId: petugas.id,
      },
    });
  }

  // ── Wilayah referensi: 63 RT RTRW Kota Depok (data zonasi asli) ──
  console.log("🗺️  Membuat 63 wilayah referensi RT RTRW...");
  const RT = JSON.parse(
    readFileSync(join(__dirname, "..", "src", "lib", "geojson", "rt-rtrw-depok.json"), "utf8")
  );
  for (const rt of RT) {
    await prisma.wilayah.create({
      data: {
        nama: `RT RTRW #${rt.id} — KEL ${rt.kelurahan.toUpperCase()}`,
        rt: rt.id,
        rw: null,
        kelurahan: rt.kelurahan,
        kecamatan: rt.kecamatan,
        kota: "Kota Depok",
      },
    });
  }

  // ── Pelanggan + Jadwal ──
  console.log("🏠 Membuat 48 pelanggan + jadwal...");
  const paketA = await prisma.paket.findFirst({ where: { nama: "Paket A" } });
  const pelangganList = [];
  let kodeSeq = 1;
  for (let a = 0; a < AREA.length; a++) {
    for (let i = 0; i < 12; i++) {
      const k = KONSUMEN[a * 12 + i];
      const idx = a * 12 + i;
      const kode = `P${String(kodeSeq++).padStart(6, "0")}`;
      const hasKoord = !TANPA_KOORD.has(idx);
      const c = hasKoord ? koordinat(a, i) : null;
      const status = idx === 44 ? "nonaktif" : idx === 3 ? "calon" : "aktif";

      const plg = await prisma.pelanggan.create({
        data: {
          nama: k.n, noTelepon: `0813${String(10000000 + idx * 13791).slice(0, 8)}`,
          kategori: k.k, alamat: `Jl. ${AREA[a].kelurahan} No. ${i + 1}`,
          rtRw: `${AREA[a].rt}/${AREA[a].rw}`, kodePelanggan: kode,
          patokanLokasi: k.pat, latitude: c?.lat ?? null, longitude: c?.lng ?? null,
          koordinatSumber: c ? (idx % 4 === 0 ? "manual" : "gps_perangkat") : null,
          koordinatAkurasi: c ? 5 + (idx % 6) : null,
          penanggungjawab: k.k === "rumah_tangga" ? k.n.replace(/^(Bpk\.|Ibu|H\.|Hj\.)\s*/, "") : k.n,
          referal: idx === 5 ? "Ahmad Fauzi" : idx === 33 ? "Hj. Nani Suhaeni" : null,
          customTarif: idx === 8 ? 25000 : idx === 21 ? 45000 : null,
          status, wilayahId: wilayahMap[a].id, paketId: paketA.id,
        },
      });
      pelangganList.push({ ...plg, areaIdx: a, baseIdx: i });

      const rute = await prisma.rute.findFirst({ where: { wilayahId: wilayahMap[a].id } });
      await prisma.jadwal.create({
        data: {
          hari: AREA[a].hari[i % 2], jam: AREA[a].rute.jam, aktif: true,
          pelangganId: plg.id, ruteId: rute.id,
        },
      });
    }
  }

  // ── Tagihan (Agustus + tunggakan Juli) ──
  console.log("🧾 Membuat tagihan Agustus 2026 + tunggakan Juli...");
  const tagihanList = [];
  for (const plg of pelangganList) {
    if (plg.status === "nonaktif" || plg.status === "calon") continue;
    const base = plg.customTarif ?? TARIF[plg.kategori] ?? 30000;
    const noInvoice = `INV/${plg.kodePelanggan}/${TAHUN_INI}${String(BULAN_INI).padStart(2, "0")}`;
    const isLunas = plg.baseIdx % 3 === 1; // ~1/3 lunas bulan ini
    const tagihan = await prisma.tagihan.create({
      data: {
        noInvoice, bulan: BULAN_INI, tahun: TAHUN_INI,
        jumlah: base, denda: null,
        status: isLunas ? "lunas" : "belum_bayar",
        jatuhTempo: new Date(TAHUN_INI, BULAN_INI - 1, 10),
        tanggalLunas: isLunas ? new Date(TAHUN_INI, BULAN_INI - 1, 2 + plg.baseIdx % 6) : null,
        keterangan: `Iuran sampah Agustus 2026`,
        pelangganId: plg.id,
      },
    });
    tagihanList.push({ ...tagihan, plg });

    // Tunggakan Juli untuk ~1/3 pelanggan yang belum bayar bulan ini
    if (!isLunas && plg.baseIdx % 3 === 2) {
      const denda = Math.round(base * 0.02);
      await prisma.tagihan.create({
        data: {
          noInvoice: `INV/${plg.kodePelanggan}/${TAHUN_INI}${String(BULAN_LALU).padStart(2, "0")}`,
          bulan: BULAN_LALU, tahun: TAHUN_INI,
          jumlah: base, denda,
          status: "tunggakan",
          jatuhTempo: new Date(TAHUN_INI, BULAN_LALU - 1, 10),
          tanggalLunas: null,
          keterangan: `Iuran sampah Juli 2026 (tunggakan)`,
          pelangganId: plg.id,
        },
      });
    }
  }

  // ── Pembayaran (untuk yang lunas) + transaksi Duitku ──
  console.log("💳 Membuat pembayaran...");
  const metodeList = ["tunai", "tunai", "tunai", "transfer", "qris", "duitku"];
  let duitkuSeq = 1;
  for (const tg of tagihanList) {
    if (tg.status !== "lunas") continue;
    const ppn = Math.round((tg.jumlah * 11) / 100);
    const total = tg.jumlah + ppn;
    const metode = metodeList[tg.plg.baseIdx % metodeList.length];
    const pembayaran = await prisma.pembayaran.create({
      data: {
        tanggal: tg.tanggalLunas, jumlah: total, metode,
        status: "terverifikasi", catatan: `Pembayaran ${metode}`,
        tagihanId: tg.id, pelangganId: tg.plg.id,
        verifiedById: metode === "tunai" ? kasirId : adminId,
      },
    });
    if (metode === "duitku") {
      await prisma.duitkuTransaction.create({
        data: {
          orderId: `DW-${String(duitkuSeq++).padStart(8, "0")}`,
          pembayaranId: pembayaran.id,
          paymentMethod: tg.plg.baseIdx % 2 === 0 ? "QR" : "VC",
          statusCode: "00", statusMessage: "Success",
          amount: total, reference: `REF-${String(pembayaran.id).padStart(6, "0")}`,
          rawResponse: JSON.stringify({ seeded: true }),
        },
      });
    }
  }

  // ── Komplain, Pengangkutan, Notifikasi, dll ──
  console.log("🗂️  Membuat komplain, pengangkutan, notifikasi...");
  const [plg1, plg2, plg3] = [pelangganList[0], pelangganList[13], pelangganList[36]];
  await prisma.komplain.create({
    data: {
      jenis: "tidak_diangkut", deskripsi: "Sampah belum diangkut sejak 2 hari, sudah telp petugas tapi belum datang.",
      status: "baru", pelangganId: plg1.id,
    },
  });
  await prisma.komplain.create({
    data: {
      jenis: "sampah_menumpuk", deskripsi: "Sampah menumpuk di depan rumah karena truk tidak lewat minggu ini.",
      status: "diproses", tanggapan: "Sedang kami koordinasikan dengan petugas rute.",
      pelangganId: plg2.id, resolvedById: adminId,
    },
  });
  await prisma.komplain.create({
    data: {
      jenis: "lainnya", deskripsi: "Truk lewat tapi tidak berhenti di rumah saya.",
      status: "selesai", tanggapan: "Sudah dikonfirmasi ke petugas, keesokan harinya diangkut. Terima kasih.",
      pelangganId: plg3.id, resolvedById: adminId,
    },
  });

  const angkutStatus = ["diambil", "diambil", "terjadwal", "diambil", "terjadwal"];
  const jenisSampah = ["organik", "anorganik", "campuran", "organik", "campuran"];
  for (let i = 0; i < 10; i++) {
    const plg = pelangganList[i * 4];
    const pet = petugasMap[plg.areaIdx];
    await prisma.pengangkutan.create({
      data: {
        tanggal: new Date(TAHUN_INI, BULAN_INI - 1, 1 + i),
        status: angkutStatus[i % 5],
        volume: +(0.3 + (i % 4) * 0.25).toFixed(2),
        berat: 5 + i * 2.5,
        jenisSampah: jenisSampah[i % 5],
        catatan: i % 4 === 2 ? "Rumah kosong saat lewat" : null,
        pelangganId: plg.id, petugasId: pet.id, tpaId: tpa.id,
      },
    });
  }

  for (let i = 0; i < 4; i++) {
    const plg = pelangganList[i * 3];
    await prisma.notifikasi.create({
      data: {
        tipe: "tagihan_jatuh_tempo", judul: "Pengingat Tagihan Agustus",
        pesan: `Yth. ${plg.nama}, tagihan iuran sampah Agustus 2026 sebesar Rp${(plg.customTarif ?? TARIF[plg.kategori]).toLocaleString("id-ID")} jatuh tempo 10 Agustus.`,
        penerima: plg.noTelepon, status: "terkirim", pelangganId: plg.id,
        dikirimPada: new Date(TAHUN_INI, BULAN_INI - 1, 7), createdById: adminId,
      },
    });
  }

  await prisma.pengumuman.create({
    data: {
      judul: "Libur Angkut 17 Agustus", isi: "Pengangkutan sampah diliburkan pada 17 Agustus 2026 memperingati HUT RI ke-81. Jadwal normal kembali keesokan harinya.",
      penting: true, untukWilayahId: null, createdById: adminId,
    },
  });
  await prisma.pengumuman.create({
    data: {
      judul: "Perubahan Jadwal RT 02", isi: "Mulai bulan depan, jadwal angkut RT 02/RW 03 Beji berubah dari Selasa-Jumat menjadi Senin-Kamis.",
      penting: false, untukWilayahId: wilayahMap[1].id, createdById: adminId,
    },
  });

  await prisma.pengeluaran.create({
    data: { tanggal: new Date(TAHUN_INI, BULAN_INI - 1, 5), kategori: "bbm", jumlah: 350000, keterangan: "BBM motor operasional", dicatatById: adminId },
  });
  await prisma.pengeluaran.create({
    data: { tanggal: new Date(TAHUN_INI, BULAN_INI - 1, 10), kategori: "operasional", jumlah: 150000, keterangan: "Pembelian karung & alat", dicatatById: adminId },
  });

  await prisma.auditLog.createMany({
    data: [
      { aksi: "create", entitas: "Pelanggan", entitasId: 1, dataBaru: JSON.stringify({ seed: "dummy-v2", area: "Depok" }), userId: adminId },
      { aksi: "create", entitas: "Tagihan", entitasId: 1, dataBaru: JSON.stringify({ seed: "dummy-v2", periode: "202608" }), userId: adminId },
    ],
  });

  await prisma.rekonsiliasi.create({
    data: {
      tanggal: new Date(TAHUN_INI, BULAN_LALU - 1, 31),
      totalPemasukan: 1250000, totalPengeluaran: 2650000,
      totalTunaiSistem: 1120000, totalTunaiFisik: 1120000, selisih: 0,
      catatan: "Rekonsiliasi Juli 2026 — selisih nihil", userId: adminId,
    },
  });

  // ── Ringkasan ──
  const count = (m) => prisma[m].count();
  console.log("\n✅ SEED SELESAI — Ringkasan:");
  console.log(`  Wilayah: ${await count("wilayah")}`);
  console.log(`  Pelanggan: ${await count("pelanggan")} (${await prisma.pelanggan.count({ where: { latitude: { not: null } } })} berkoordinat)`);
  console.log(`  Petugas: ${await count("petugas")} | Rute: ${await count("rute")}`);
  console.log(`  Tagihan: ${await count("tagihan")} | Pembayaran: ${await count("pembayaran")}`);
  console.log(`  Komplain: ${await count("komplain")} | Pengangkutan: ${await count("pengangkutan")}`);
}

main()
  .catch((e) => { console.error("❌ GAGAL:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
