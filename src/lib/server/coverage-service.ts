import { prisma } from "@/lib/prisma";
import { KECAMATAN_DEPOK } from "@/lib/kecamatan-depok";
import { DEPOK_BOUNDS } from "@/lib/zona-depok";
import {
  BLOK_OPERASIONAL_AKTIF,
  KELURAHAN_COVERAGE_LIST,
  QUICK_SEARCH_LOCATIONS,
  checkCoverageLocation,
  type ActiveBlock,
  type KelurahanCoverage,
  type CoverageCheckResult,
  type CoverageStatus,
} from "@/lib/coverage-shared";

export {
  BLOK_OPERASIONAL_AKTIF,
  KELURAHAN_COVERAGE_LIST,
  QUICK_SEARCH_LOCATIONS,
  checkCoverageLocation,
  type ActiveBlock,
  type KelurahanCoverage,
  type CoverageCheckResult,
  type CoverageStatus,
};

/**
 * Data lengkap agregasi coverage untuk endpoint /api/publik/coverage
 */
export async function getCoverageData() {
  let liveCustomerCount = 562;
  let livePins: [number, number][] = [];

  try {
    const [count, rawPins] = await Promise.all([
      prisma.pelanggan.count({ where: { status: "aktif" } }),
      prisma.pelanggan.findMany({
        where: {
          status: { in: ["aktif", "terjadwal"] },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { latitude: true, longitude: true },
        take: 600,
      }),
    ]);

    if (count > 0) liveCustomerCount = count;

    if (rawPins.length > 0) {
      // Privacy-anonymized: round to 3 decimals (~110m grid)
      livePins = rawPins
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => [
          Number(p.latitude!.toFixed(3)),
          Number(p.longitude!.toFixed(3)),
        ]);
    }
  } catch {
    // Database transient / offline fallback
  }

  // Jika livePins kosong (fallback build / db error), gunakan synthetic grid dari 23 blok
  if (livePins.length === 0) {
    livePins = BLOK_OPERASIONAL_AKTIF.map((b) => [
      Number(b.lat.toFixed(3)),
      Number(b.lng.toFixed(3)),
    ]);
  }

  // Ringkasan kecamatan di Kota Depok
  const kecamatanData = KECAMATAN_DEPOK.map((k) => {
    const isCilodong = k.nama.toUpperCase() === "CILODONG";
    const isSukmajaya = k.nama.toUpperCase() === "SUKMA JAYA" || k.nama.toUpperCase() === "SUKMAJAYA";

    let status: CoverageStatus = "TERSEDIA_SURVEI";
    let statusLabel = "Dapat Mengajukan Survei";
    let warna = "#64748b";

    if (isCilodong) {
      status = "AKTIF";
      statusLabel = "Terlayani Penuh (Jadwal Rutin)";
      warna = "#10b981";
    } else if (isSukmajaya) {
      status = "PERLUASAN";
      statusLabel = "Area Perluasan Rintisan";
      warna = "#f59e0b";
    }

    return {
      kode: k.kode,
      nama: k.nama,
      status,
      statusLabel,
      warna,
      koordinat: k.koordinat,
    };
  });

  return {
    meta: {
      title: "Starlink-Style Coverage Area Map — UPS HERU Depok",
      updatedAt: new Date().toISOString(),
      coverageArea: "Kota Depok, Jawa Barat",
    },
    stats: {
      totalRumahTerlayani: liveCustomerCount,
      totalKelurahanAktif: 4,
      totalBlokOperasional: 23,
      frekuensiPengangkutan: "2-3x / Pekan",
      jaminanKetepatan: "100% Terjadwal & Real-Time",
    },
    kelurahan: KELURAHAN_COVERAGE_LIST,
    blokOperasional: BLOK_OPERASIONAL_AKTIF,
    kecamatan: kecamatanData,
    quickLocations: QUICK_SEARCH_LOCATIONS,
    serviceGrid: livePins,
    depokBounds: DEPOK_BOUNDS,
  };
}
