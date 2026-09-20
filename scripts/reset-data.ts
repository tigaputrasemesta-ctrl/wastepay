import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Menghapus data lama...");
  
  // Hapus semua data yang bergantung pada Pelanggan, Petugas, Kendaraan, Wilayah
  await prisma.duitkuTransaction.deleteMany();
  await prisma.pembayaran.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.komplain.deleteMany();
  await prisma.tagihan.deleteMany();
  await prisma.pengangkutan.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.rute.deleteMany();
  await prisma.lokasiPetugas.deleteMany();
  await prisma.lokasiKendaraan.deleteMany();
  
  await prisma.pelanggan.deleteMany();
  await prisma.kendaraan.deleteMany();
  await prisma.petugas.deleteMany();
  await prisma.wilayah.deleteMany();
  await prisma.titikTransit?.deleteMany?.().catch(() => {});
  await prisma.tpa?.deleteMany?.().catch(() => {});
  await prisma.kategoriTarif.deleteMany();
  await prisma.paket.deleteMany();

  console.log("Data lama berhasil dihapus.");

  // 1. Setup Master Data (Kategori, Paket)
  console.log("Setup Kategori & Paket...");
  await prisma.kategoriTarif.createMany({
    data: [
      { kategori: "rumah_tangga", label: "Rumah Tangga", tarif: 30000, deskripsi: "Angkut 2x seminggu" },
      { kategori: "bisnis", label: "Bisnis / Toko", tarif: 75000, deskripsi: "Angkut 3x seminggu" },
      { kategori: "kost", label: "Kost", tarif: 50000, deskripsi: "Kost / Kontrakan" }
    ]
  });

  const paketA = await prisma.paket.create({ data: { nama: "Paket Reguler", harga: 30000 } });

  // 2. Buat Wilayah
  console.log("Membuat area konsumen...");
  const wilayahKalibaru = await prisma.wilayah.create({
    data: { nama: "Kalibaru - Sektor A", kelurahan: "Kalibaru", kecamatan: "Cilodong", kota: "Depok", rt: "01", rw: "02" },
  });
  const wilayahCilodong = await prisma.wilayah.create({
    data: { nama: "Cilodong Indah", kelurahan: "Cilodong", kecamatan: "Cilodong", kota: "Depok", rt: "03", rw: "05" },
  });

  // 3. Buat Petugas & Rute
  console.log("Membuat petugas dan rute...");
  const petugas1 = await prisma.petugas.create({
    data: { nama: "Bang Udin", noTelepon: "081234567890", jabatan: "angkut,tagih", wilayahId: wilayahKalibaru.id, aktif: true },
  });
  await prisma.petugas.create({
    data: { nama: "Mang Jajang", noTelepon: "089876543210", jabatan: "angkut", wilayahId: wilayahKalibaru.id, aktif: true },
  });
  const petugas3 = await prisma.petugas.create({
    data: { nama: "Pak Sholeh", noTelepon: "082233445566", jabatan: "angkut", wilayahId: wilayahCilodong.id, aktif: true },
  });

  const ruteKalibaru = await prisma.rute.create({
    data: { nama: "Rute Pagi Kalibaru", hari: "Senin, Kamis", jam: "06:00", aktif: true, wilayahId: wilayahKalibaru.id, petugasId: petugas1.id }
  });
  const ruteCilodong = await prisma.rute.create({
    data: { nama: "Rute Siang Cilodong", hari: "Selasa, Jumat", jam: "13:00", aktif: true, wilayahId: wilayahCilodong.id, petugasId: petugas3.id }
  });

  // 4. Buat Kendaraan (Mobil)
  console.log("Membuat kendaraan...");
  await prisma.kendaraan.create({
    data: { nama: "Mobil Pickup Cyber", platNomor: "B 1234 CYB", jenis: "pickup", kapasitas: 1500, aktif: true, petugasId: petugas1.id },
  });
  await prisma.kendaraan.create({
    data: { nama: "Dump Truck Neo", platNomor: "B 9999 NXZ", jenis: "dump_truck", kapasitas: 5000, aktif: true, petugasId: petugas3.id },
  });

  // 5. Buat TPA / Transit
  try {
    await prisma.titikTransit?.create?.({
      data: { nama: "TPS Cilodong", alamat: "Jl. Raya Cilodong No. 8", latitude: -6.435, longitude: 106.840, aktif: true }
    });
    await prisma.tpa?.create?.({
      data: { nama: "TPA Galuga (Cabang)", alamat: "Pinggiran Depok", kota: "Depok", jarak: 15, aktif: true }
    });
  } catch {
    // Script dev: gagal membuat titik transit/TPA tidak menghentikan seed
  }

  // 6. Buat Konsumen (Pelanggan)
  console.log("Membuat konsumen (Total: 25)...");
  
  // Koordinat basis Cilodong Kalibaru: -6.442, 106.835
  const baseLat = -6.442;
  const baseLng = 106.835;
  
  const pelangganData: any[] = [];

  for(let i=1; i<=25; i++) {
    // Sebagian besar aktif, beberapa calon, beberapa libur
    let status = "aktif";
    if (i === 5 || i === 12) status = "calon";
    if (i === 18) status = "nonaktif";
    if (i === 22) status = "libur";

    // 5 Pelanggan sengaja NO-GEO (tidak punya koordinat)
    const isNoGeo = [3, 8, 15, 20, 24].includes(i);
    const lat = isNoGeo ? null : baseLat + (Math.random() * 0.01 - 0.005);
    const lng = isNoGeo ? null : baseLng + (Math.random() * 0.01 - 0.005);

    const isKalibaru = i <= 15;
    const wilId = isKalibaru ? wilayahKalibaru.id : wilayahCilodong.id;
    const ruteId = isKalibaru ? ruteKalibaru.id : ruteCilodong.id;
    const kategori = i % 7 === 0 ? "bisnis" : i % 5 === 0 ? "kost" : "rumah_tangga";

    const plg = await prisma.pelanggan.create({
      data: {
        nama: `Pelanggan Cyber ${i}`,
        noTelepon: `0811000${String(i).padStart(4, '0')}`,
        kategori,
        alamat: isKalibaru ? `Jl. Neon Kalibaru Blok ${i}` : `Jl. Cilodong Raya Gang ${i}`,
        rtRw: `00${(i % 5) + 1}/00${(i % 3) + 1}`,
        kodePelanggan: `0811000${String(i).padStart(4, '0')}`,
        patokanLokasi: `Dekat Tiang Listrik No ${i}`,
        wilayahId: wilId,
        paketId: paketA.id,
        status,
        latitude: lat,
        longitude: lng,
        koordinatSumber: isNoGeo ? null : "gps_perangkat",
      }
    });
    pelangganData.push(plg);

    // Buat Jadwal untuk yang tidak nonaktif/calon
    if (status === "aktif" || status === "libur") {
      await prisma.jadwal.create({
        data: {
          hari: isKalibaru ? "Senin" : "Selasa",
          pelangganId: plg.id,
          ruteId: ruteId
        }
      });
      // Buat tagihan dummy bulan ini
      await prisma.tagihan.create({
        data: {
          noInvoice: `INV/${plg.kodePelanggan}/202608`,
          bulan: 8, tahun: 2026, jumlah: kategori === "bisnis" ? 75000 : 30000,
          status: i % 2 === 0 ? "lunas" : "belum_bayar", // Sebagian lunas
          jatuhTempo: new Date("2026-08-10"),
          pelangganId: plg.id
        }
      });
    }
  }

  // 7. Buat Komplain Dummy
  console.log("Membuat data komplain...");
  await prisma.komplain.create({
    data: { jenis: "tidak_diangkut", deskripsi: "Sampah udah numpuk 3 hari belum diambil bang Udin!", status: "baru", pelangganId: pelangganData[0].id }
  });
  await prisma.komplain.create({
    data: { jenis: "sampah_menumpuk", deskripsi: "Tempat sampah jebol, butuh diganti plastik", status: "diproses", tanggapan: "Siap, besok sekalian jalan dibawakan", pelangganId: pelangganData[6].id }
  });

  // 8. Buat Pengangkutan Dummy
  console.log("Membuat riwayat pengangkutan...");
  await prisma.pengangkutan.create({
    data: { tanggal: new Date(), status: "diambil", volume: 1.5, berat: 10, jenisSampah: "campuran", pelangganId: pelangganData[1].id, petugasId: petugas1.id }
  });

  console.log("=== RESET LENGKAP SELESAI ===");
  console.log(`Total Wilayah: 2`);
  console.log(`Total Petugas: 3`);
  console.log(`Total Kendaraan: 2`);
  console.log(`Total Pelanggan: 25`);
  console.log(`(5 Pelanggan diatur sebagai NO-GEO)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
