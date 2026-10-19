import {
  jarakMeter,
  titikDalamPoligon,
  deteksiZona,
  cariKecamatanTitik,
  type Titik,
} from "@/lib/geo";
import { DEPOK_BOUNDS } from "@/lib/zona-depok";

export type CoverageStatus = "AKTIF" | "PERLUASAN" | "TERSEDIA_SURVEI" | "LUAR_KOTA";

export type ActiveBlock = {
  id: string;
  nama: string;
  kelurahan: string;
  kecamatan: string;
  lat: number;
  lng: number;
  pelangganCount: number;
  warna: string;
  status: "AKTIF" | "PERLUASAN";
  jadwal: string;
  armada: string;
  radiusMeter: number;
};

export type KelurahanCoverage = {
  nama: string;
  kecamatan: string;
  status: "AKTIF" | "PERLUASAN" | "TERSEDIA_SURVEI";
  pelangganCount: number;
  zonaCount: number;
  jadwal: string;
  armada: string;
  deskripsi: string;
  lat: number;
  lng: number;
};

export type NearbyClusterRecommendation = {
  id: string;
  nama: string;
  kelurahan: string;
  kecamatan: string;
  lat: number;
  lng: number;
  pelangganCount: number;
  jarakMeter: number;
  jadwal: string;
  armada: string;
  status: "AKTIF" | "PERLUASAN";
  alasanRekomendasi: string;
};

export type CoverageCheckResult = {
  status: CoverageStatus;
  statusLabel: string;
  kelurahan: string;
  kecamatan: string;
  zonaTerdekat: string;
  jarakMeter: number;
  terlayani: boolean;
  jadwalPengangkutan: string;
  armada: string;
  pesan: string;
  ctaText: string;
  ctaUrl: string;
  whatsappUrl: string;
  rekomendasiSekitar: NearbyClusterRecommendation[];
};

// 23 Blok & Zona Aktif Operasional UPS HERU Kota Depok
export const BLOK_OPERASIONAL_AKTIF: ActiveBlock[] = [
  // Kelurahan Kalibaru (Pusat Hub Operasional)
  {
    id: "kal-setu",
    nama: "Blok Setu + Rafael Pete",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.44081,
    lng: 106.83624,
    pelangganCount: 143,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 850,
  },
  {
    id: "kal-dmiles",
    nama: "Blok Bawah Dmiles + SMP 6",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.43687,
    lng: 106.83186,
    pelangganCount: 82,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 750,
  },
  {
    id: "kal-santri",
    nama: "Blok Perumahan Santri",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.44071,
    lng: 106.8365,
    pelangganCount: 36,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 600,
  },
  {
    id: "kal-ykp",
    nama: "Blok YKP Kelapa",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.43745,
    lng: 106.84163,
    pelangganCount: 33,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 02",
    radiusMeter: 650,
  },
  {
    id: "kal-cilodong-raya",
    nama: "Blok Jl. Raya Cilodong",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.44018,
    lng: 106.8385,
    pelangganCount: 16,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 600,
  },
  {
    id: "kal-bulak",
    nama: "Blok Kampung Bulak",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.44554,
    lng: 106.83747,
    pelangganCount: 16,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 02",
    radiusMeter: 550,
  },
  {
    id: "kal-niman",
    nama: "Blok Gang Niman",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.43599,
    lng: 106.84222,
    pelangganCount: 11,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Pick-Up 03",
    radiusMeter: 450,
  },
  {
    id: "kal-sarin",
    nama: "Gang Sarin",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.43908,
    lng: 106.84035,
    pelangganCount: 8,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Pick-Up 03",
    radiusMeter: 400,
  },
  {
    id: "kal-hpuah",
    nama: "Blok H Puah",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.43922,
    lng: 106.83531,
    pelangganCount: 7,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 400,
  },
  {
    id: "kal-umar",
    nama: "Blok Gang Umar",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.43725,
    lng: 106.83884,
    pelangganCount: 5,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Pick-Up 03",
    radiusMeter: 400,
  },
  {
    id: "kal-menteng",
    nama: "Blok Gang Menteng",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.4379,
    lng: 106.834,
    pelangganCount: 5,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 400,
  },
  {
    id: "kal-thr",
    nama: "Blok THR",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.438,
    lng: 106.839,
    pelangganCount: 6,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 02",
    radiusMeter: 400,
  },
  {
    id: "kal-bmk",
    nama: "Blok Perumahan BMK",
    kelurahan: "Kalibaru",
    kecamatan: "Cilodong",
    lat: -6.435,
    lng: 106.833,
    pelangganCount: 4,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01",
    radiusMeter: 450,
  },

  // Kelurahan Cilodong
  {
    id: "cil-bakung",
    nama: "Blok Bakung",
    kelurahan: "Cilodong",
    kecamatan: "Cilodong",
    lat: -6.43454,
    lng: 106.83601,
    pelangganCount: 65,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Selasa, Kamis, Minggu",
    armada: "Truk Armada 02",
    radiusMeter: 700,
  },
  {
    id: "cil-raya-bakung",
    nama: "Blok Jl. Raya Bakung",
    kelurahan: "Cilodong",
    kecamatan: "Cilodong",
    lat: -6.43689,
    lng: 106.83474,
    pelangganCount: 8,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Selasa, Kamis, Minggu",
    armada: "Truk Armada 02",
    radiusMeter: 500,
  },

  // Kelurahan Kalimulya
  {
    id: "klm-sasak",
    nama: "Blok Sasak",
    kelurahan: "Kalimulya",
    kecamatan: "Cilodong",
    lat: -6.43476,
    lng: 106.82466,
    pelangganCount: 42,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin & Kamis",
    armada: "Pick-Up 03",
    radiusMeter: 750,
  },
  {
    id: "klm-tabroni",
    nama: "Blok Tabroni",
    kelurahan: "Kalimulya",
    kecamatan: "Cilodong",
    lat: -6.43013,
    lng: 106.82044,
    pelangganCount: 6,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Senin & Kamis",
    armada: "Pick-Up 03",
    radiusMeter: 450,
  },

  // Kelurahan Jatimulya
  {
    id: "jtm-kebon-duren",
    nama: "Blok Jl. Raya Kebon Duren",
    kelurahan: "Jatimulya",
    kecamatan: "Cilodong",
    lat: -6.43338,
    lng: 106.82212,
    pelangganCount: 15,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Rabu & Sabtu",
    armada: "Pick-Up 03",
    radiusMeter: 500,
  },
  {
    id: "jtm-kp-sawah",
    nama: "Blok Kampung Sawah",
    kelurahan: "Jatimulya",
    kecamatan: "Cilodong",
    lat: -6.44648,
    lng: 106.82844,
    pelangganCount: 8,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Rabu & Sabtu",
    armada: "Pick-Up 03",
    radiusMeter: 500,
  },
  {
    id: "jtm-samit",
    nama: "Blok Samit Jatimulya",
    kelurahan: "Jatimulya",
    kecamatan: "Cilodong",
    lat: -6.445,
    lng: 106.827,
    pelangganCount: 3,
    warna: "#10b981",
    status: "AKTIF",
    jadwal: "Rabu & Sabtu",
    armada: "Pick-Up 03",
    radiusMeter: 450,
  },

  // Area Perluasan: Sukmajaya (Mekar Jaya)
  {
    id: "skm-mekar-jaya",
    nama: "Blok Mekar Jaya (Rintisan)",
    kelurahan: "Mekar Jaya",
    kecamatan: "Sukmajaya",
    lat: -6.402,
    lng: 106.84,
    pelangganCount: 5,
    warna: "#f59e0b",
    status: "PERLUASAN",
    jadwal: "Selasa & Jumat",
    armada: "Armada Perintis",
    radiusMeter: 600,
  },
];

// Data Kelurahan Terlayani
export const KELURAHAN_COVERAGE_LIST: KelurahanCoverage[] = [
  {
    nama: "Kalibaru",
    kecamatan: "Cilodong",
    status: "AKTIF",
    pelangganCount: 447,
    zonaCount: 14,
    jadwal: "Senin, Rabu, Sabtu",
    armada: "Truk Armada 01 & 02",
    deskripsi: "Pusat jaringan operasional utama UPS HERU. Seluruh perumahan dan jalan terlayani 3x sepekan.",
    lat: -6.4385,
    lng: 106.8355,
  },
  {
    nama: "Cilodong",
    kecamatan: "Cilodong",
    status: "AKTIF",
    pelangganCount: 54,
    zonaCount: 2,
    jadwal: "Selasa, Kamis, Minggu",
    armada: "Truk Armada 02",
    deskripsi: "Cakupan aktif meliputi Jl. Raya Cilodong, Blok Bakung, dan lingkungan sekitarnya.",
    lat: -6.4345,
    lng: 106.836,
  },
  {
    nama: "Kalimulya",
    kecamatan: "Cilodong",
    status: "AKTIF",
    pelangganCount: 47,
    zonaCount: 2,
    jadwal: "Senin & Kamis",
    armada: "Pick-Up Hidrolik 03",
    deskripsi: "Cakupan aktif mencakup Blok Sasak, Blok Tabroni, dan perumahan area Kalimulya.",
    lat: -6.4335,
    lng: 106.823,
  },
  {
    nama: "Jatimulya",
    kecamatan: "Cilodong",
    status: "AKTIF",
    pelangganCount: 26,
    zonaCount: 3,
    jadwal: "Rabu & Sabtu",
    armada: "Pick-Up Hidrolik 03",
    deskripsi: "Cakupan aktif meliputi Jl. Raya Kebon Duren, Kampung Sawah, dan sekitarnya.",
    lat: -6.442,
    lng: 106.827,
  },
  {
    nama: "Sukamaju",
    kecamatan: "Cilodong",
    status: "PERLUASAN",
    pelangganCount: 0,
    zonaCount: 0,
    jadwal: "Persiapan Tahap 1",
    armada: "Rute Perluasan",
    deskripsi: "Dalam proses survei jalur dan pendataan warga untuk pembukaan rute armada baru.",
    lat: -6.414,
    lng: 106.854,
  },
  {
    nama: "Mekar Jaya",
    kecamatan: "Sukmajaya",
    status: "PERLUASAN",
    pelangganCount: 5,
    zonaCount: 1,
    jadwal: "Selasa & Jumat",
    armada: "Armada Perintis",
    deskripsi: "Wilayah rintisan perluasan di Sukmajaya. Terbuka pendaftaran untuk percepatan rute penuh.",
    lat: -6.402,
    lng: 106.84,
  },
];

// Landmark & Shortcut Pencarian Cepat Depok
export const QUICK_SEARCH_LOCATIONS = [
  { label: "Kalibaru (Pusat UPS HERU)", lat: -6.4385, lng: 106.8355, kelurahan: "Kalibaru", status: "AKTIF" },
  { label: "Perumahan Dmiles & SMPN 6", lat: -6.43687, lng: 106.83186, kelurahan: "Kalibaru", status: "AKTIF" },
  { label: "Blok Bakung & Jl. Raya Bakung", lat: -6.43454, lng: 106.83601, kelurahan: "Cilodong", status: "AKTIF" },
  { label: "Setu Cilodong & Sekitarnya", lat: -6.44081, lng: 106.83624, kelurahan: "Kalibaru", status: "AKTIF" },
  { label: "Blok Sasak Kalimulya", lat: -6.43476, lng: 106.82466, kelurahan: "Kalimulya", status: "AKTIF" },
  { label: "Jl. Raya Kebon Duren Jatimulya", lat: -6.43338, lng: 106.82212, kelurahan: "Jatimulya", status: "AKTIF" },
  { label: "Grand Depok City (GDC) Sektor Timur", lat: -6.425, lng: 106.828, kelurahan: "Kalimulya", status: "PERLUASAN" },
  { label: "Alun-Alun Kota Depok (GDC)", lat: -6.431, lng: 106.831, kelurahan: "Kalibaru", status: "AKTIF" },
  { label: "Pasar Pucung Cilodong", lat: -6.429, lng: 106.839, kelurahan: "Cilodong", status: "AKTIF" },
  { label: "Kecamatan Sukmajaya (Mekar Jaya)", lat: -6.402, lng: 106.84, kelurahan: "Mekar Jaya", status: "PERLUASAN" },
  { label: "Kecamatan Pancoran Mas", lat: -6.398, lng: 106.814, kelurahan: "Pancoran Mas", status: "TERSEDIA_SURVEI" },
  { label: "Kecamatan Tapos", lat: -6.425, lng: 106.878, kelurahan: "Tapos", status: "TERSEDIA_SURVEI" },
  { label: "Kecamatan Cipayung", lat: -6.439, lng: 106.804, kelurahan: "Cipayung", status: "TERSEDIA_SURVEI" },
];

/**
 * Cek status cakupan untuk titik koordinat [lat, lng].
 * Menghitung jarak ke 23 blok operasional dan mengecek poligon kecamatan.
 */
export function checkCoverageLocation(lat: number, lng: number): CoverageCheckResult {
  const p: Titik = [lat, lng];

  // 1. Validasi batas Kota Depok
  const dalamBboxDepok =
    lat >= DEPOK_BOUNDS.minLat &&
    lat <= DEPOK_BOUNDS.maxLat &&
    lng >= DEPOK_BOUNDS.minLng &&
    lng <= DEPOK_BOUNDS.maxLng;

  const kec = cariKecamatanTitik(p);
  const zonaDeteksi = deteksiZona(p);

  const namaKecamatan = kec?.nama || zonaDeteksi?.kecamatan || "Kota Depok";
  const namaKelurahan = zonaDeteksi?.kelurahan || (kec?.nama === "CILODONG" ? "Cilodong" : "Depok");

  // Hitung jarak ke seluruh 23 blok operasional & urutkan dari yang terdekat
  const sortedBlocks: NearbyClusterRecommendation[] = BLOK_OPERASIONAL_AKTIF.map((b) => {
    const d = Math.round(jarakMeter(p, [b.lat, b.lng]));
    let alasan = "Klaster rute operasional terdekat di wilayah ini.";
    if (d <= 250) {
      alasan = `Sangat dekat (±${d}m)! Truk armada sudah rutin melintasi jalan ini (${b.jadwal}).`;
    } else if (d <= 650) {
      alasan = `Dalam lingkar rute aktif (±${d}m). Pendaftaran rumah baru langsung diintegrasikan dengan jadwal warga sekitar.`;
    } else if (d <= 1500) {
      alasan = `Berjarak ±${(d / 1000).toFixed(1)} km dari ${b.nama}. Rute penjemputan mudah disambungkan ke jalan rumah Anda.`;
    } else {
      alasan = `Klaster aktif terdekat di Kel. ${b.kelurahan} (±${(d / 1000).toFixed(1)} km).`;
    }
    return {
      id: b.id,
      nama: b.nama,
      kelurahan: b.kelurahan,
      kecamatan: b.kecamatan,
      lat: b.lat,
      lng: b.lng,
      pelangganCount: b.pelangganCount,
      jarakMeter: d,
      jadwal: b.jadwal,
      armada: b.armada,
      status: b.status,
      alasanRekomendasi: alasan,
    };
  }).sort((a, b) => a.jarakMeter - b.jarakMeter);

  const blokTerdekat = sortedBlocks[0];
  const jarakRound = blokTerdekat.jarakMeter;
  const rekomendasiSekitar = sortedBlocks.slice(0, 4);

  // Jika di luar batas Kota Depok dan sangat jauh dari blok terdekat (> 7 km)
  if (!dalamBboxDepok && jarakRound > 7000) {
    const waText = encodeURIComponent(
      `Halo CS UPS HERU, saya ingin menanyakan cakupan layanan sampah untuk area di luar Depok (Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}). Apakah ada rencana ekspansi armada ke area kami?`
    );
    return {
      status: "LUAR_KOTA",
      statusLabel: "Di Luar Jangkauan Layanan",
      kelurahan: namaKelurahan,
      kecamatan: namaKecamatan,
      zonaTerdekat: blokTerdekat.nama,
      jarakMeter: jarakRound,
      terlayani: false,
      jadwalPengangkutan: "-",
      armada: "-",
      pesan: `Koordinat ini berada di luar batas operasional Kota Depok (berjarak ±${(jarakRound / 1000).toFixed(1)} km dari klaster warga terdaftar terdekat: ${blokTerdekat.nama}).`,
      ctaText: "Konsultasi Wilayah Khusus via WA",
      ctaUrl: `https://wa.me/6281400782617?text=${waText}`,
      whatsappUrl: `https://wa.me/6281400782617?text=${waText}`,
      rekomendasiSekitar,
    };
  }

  // A. TERLAYANI AKTIF:
  // Masuk radius blok operasional aktif (di Cilodong/Kalibaru/Kalimulya/Jatimulya)
  const isInsideActiveBlockRadius =
    blokTerdekat.status === "AKTIF" && jarakRound <= 750;
  const isNearActiveHub =
    blokTerdekat.status === "AKTIF" &&
    jarakRound <= 1200 &&
    ["Kalibaru", "Cilodong", "Kalimulya", "Jatimulya"].includes(blokTerdekat.kelurahan);

  if (isInsideActiveBlockRadius || isNearActiveHub) {
    const regUrl = `/daftar?kelurahan=${encodeURIComponent(blokTerdekat.kelurahan)}&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&zona=${encodeURIComponent(blokTerdekat.nama)}`;
    const waText = encodeURIComponent(
      `Halo UPS HERU, saya mengecek peta cakupan di https://upsheru.com/coverage dan lokasi saya (${blokTerdekat.nama}, Kel. ${blokTerdekat.kelurahan}) sudah TERLAYANI AKTIF. Saya ingin mendaftar langganan pengangkutan sampah warga.`
    );

    return {
      status: "AKTIF",
      statusLabel: "Terlayani Aktif (Jalur Sudah Lewat)",
      kelurahan: blokTerdekat.kelurahan,
      kecamatan: blokTerdekat.kecamatan,
      zonaTerdekat: blokTerdekat.nama,
      jarakMeter: jarakRound,
      terlayani: true,
      jadwalPengangkutan: blokTerdekat.jadwal,
      armada: blokTerdekat.armada,
      pesan: `Kabar baik! Lokasi Anda berada di sekitar area warga terdaftar (${blokTerdekat.nama} — ${blokTerdekat.pelangganCount} KK aktif). Armada kami melayani penjemputan rutin ${blokTerdekat.jadwal}.`,
      ctaText: "Daftar Berlangganan Sekarang",
      ctaUrl: regUrl,
      whatsappUrl: `https://wa.me/6281400782617?text=${waText}`,
      rekomendasiSekitar,
    };
  }

  // B. AREA PERLUASAN:
  // Jarak 1.2 km – 3.5 km dari hub aktif atau berada di Kecamatan Sukmajaya / Sukamaju
  if (jarakRound <= 3500 || namaKecamatan.toUpperCase() === "SUKMAJAYA" || namaKelurahan.toLowerCase() === "sukamaju") {
    const regUrl = `/daftar?status=calon&kelurahan=${encodeURIComponent(namaKelurahan)}&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`;
    const waText = encodeURIComponent(
      `Halo Tim UPS HERU, saya ingin mendaftarkan lingkungan/rumah saya di Kel. ${namaKelurahan}, Kec. ${namaKecamatan} (berjarak ±${(jarakRound / 1000).toFixed(1)} km dari ${blokTerdekat.nama}) untuk prioritas PERLUASAN RUTE pengangkutan sampah.`
    );

    return {
      status: "PERLUASAN",
      statusLabel: "Area Rencana Perluasan",
      kelurahan: namaKelurahan,
      kecamatan: namaKecamatan,
      zonaTerdekat: blokTerdekat.nama,
      jarakMeter: jarakRound,
      terlayani: false,
      jadwalPengangkutan: "Persiapan Jalur Armada",
      armada: "Rute Perluasan Bertahap",
      pesan: `Lokasi Anda berjarak ±${(jarakRound / 1000).toFixed(1)} km dari rute aktif (${blokTerdekat.nama} - ${blokTerdekat.pelangganCount} KK terdaftar). Daftarkan alamat Anda sekarang untuk mempercepat pembukaan jadwal penjemputan resmi!`,
      ctaText: "Ajukan Pembukaan Rute Baru",
      ctaUrl: regUrl,
      whatsappUrl: `https://wa.me/6281400782617?text=${waText}`,
      rekomendasiSekitar,
    };
  }

  // C. TERSEDIA UNTUK USULAN SURVEI:
  // Di dalam Kota Depok tapi > 3.5 km dari rute aktif (misal Sawangan, Beji, Cinere, Tapos)
  const regUrl = `/daftar?status=calon&kelurahan=${encodeURIComponent(namaKelurahan)}&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`;
  const waText = encodeURIComponent(
    `Halo Pengelola UPS HERU, kami warga di Kel. ${namaKelurahan}, Kec. ${namaKecamatan} Kota Depok berminat menggunakan jasa pengangkutan sampah UPS HERU. Mohon info syarat pembukaan rute kolektif RT/RW/Perumahan.`
  );

  return {
    status: "TERSEDIA_SURVEI",
    statusLabel: "Tersedia untuk Pengajuan Survei",
    kelurahan: namaKelurahan,
    kecamatan: namaKecamatan,
    zonaTerdekat: blokTerdekat.nama,
    jarakMeter: jarakRound,
    terlayani: false,
    jadwalPengangkutan: "Menunggu Kuota Kolektif",
    armada: "Armada Survey Wilayah",
    pesan: `Wilayah ${namaKelurahan} (${namaKecamatan}) dapat dilayani dengan skema kolektif perumahan atau pengurus RT/RW. Klaster warga terdaftar terdekat berada di ${blokTerdekat.nama} (±${(jarakRound / 1000).toFixed(1)} km).`,
    ctaText: "Ajukan Survei Kolektif RT/RW",
    ctaUrl: regUrl,
    whatsappUrl: `https://wa.me/6281400782617?text=${waText}`,
    rekomendasiSekitar,
  };
}
