import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { HARI } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Nama hari dalam Bahasa Indonesia (Senin..Minggu) untuk tanggal sekarang. */
function hariIni(): string {
  return HARI[(new Date().getDay() + 6) % 7];
}

/**
 * Pelacakan jemputan publik (gaya Gojek) untuk konsumen.
 * GET /api/publik/jemput?kode={KODE_PELANGGAN}
 *
 * Mengembalikan titik pickup pelanggan, jadwal hari ini, armada yang
 * ditugaskan (petugas + kendaraan) beserta lokasi realtime-nya — hanya
 * untuk rute milik pelanggan tersebut (tidak membocorkan armada lain).
 */
export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `jemput:${ip}`;

  // Cukup longgar untuk polling UI (refresh ~15 dtk) + banyak user sah,
  // tapi tetap menghambat enumerasi kode pelanggan.
  if (!(await allowAttempt(key, { max: 120, windowMs: 15 * 60 * 1000 }))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const kode = String(searchParams.get("kode") ?? "").trim().toUpperCase();

  if (!kode) {
    return NextResponse.json({ error: "Kode pelanggan wajib diisi." }, { status: 400 });
  }

  try {
    const pelanggan = await prisma.pelanggan.findFirst({
      where: { kodePelanggan: kode, deletedAt: null },
      select: {
        id: true,
        nama: true,
        kodePelanggan: true,
        alamat: true,
        rtRw: true,
        patokanLokasi: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!pelanggan) {
      return NextResponse.json(
        { error: "Kode pelanggan tidak ditemukan. Periksa kembali kode di kartu/barcode Anda." },
        { status: 404 }
      );
    }

    const hari = hariIni();

    // Jadwal aktif hari ini untuk pelanggan ini.
    const jadwal = await prisma.jadwal.findFirst({
      where: { pelangganId: pelanggan.id, hari, aktif: true },
      include: {
        rute: {
          select: {
            nama: true,
            jam: true,
            petugas: { select: { id: true, nama: true, jabatan: true } },
          },
        },
      },
    });

    // Catatan pengangkutan hari ini (status: terjadwal/diambil/dll).
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const angkut = await prisma.pengangkutan.findFirst({
      where: {
        pelangganId: pelanggan.id,
        deletedAt: null,
        tanggal: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
      select: { status: true, petugasId: true, kendaraanId: true },
    });

    // Armada yang ditugaskan: dari kendaraan pengangkutan hari ini (paling akurat)
    // → kalau belum ada, dari kendaraan milik petugas rute.
    const petugasId = jadwal?.rute?.petugas?.id ?? angkut?.petugasId ?? null;

    let kendaraan: { id: number; nama: string; platNomor: string | null; jenis: string } | null = null;
    let trukLokasi: { latitude: number; longitude: number; akurasi: number | null; updatedAt: string } | null = null;
    let petugasLokasi: { latitude: number; longitude: number; akurasi: number | null; updatedAt: string } | null = null;

    if (petugasId) {
      const kendaraanIds: number[] = [];

      if (angkut?.kendaraanId) {
        const k = await prisma.kendaraan.findFirst({
          where: { id: angkut.kendaraanId, aktif: true, deletedAt: null },
          select: { id: true, nama: true, platNomor: true, jenis: true },
        });
        if (k) {
          kendaraan = k;
          kendaraanIds.push(k.id);
        }
      }

      // Fallback / tambahan: kendaraan milik petugas rute.
      if (!kendaraan) {
        const kendaraanList = await prisma.kendaraan.findMany({
          where: { petugasId, aktif: true, deletedAt: null },
          select: { id: true, nama: true, platNomor: true, jenis: true },
        });
        if (kendaraanList.length > 0) {
          kendaraan = kendaraanList[0];
          for (const k of kendaraanList) kendaraanIds.push(k.id);
        }
      }

      // Lokasi realtime kendaraan (prioritas armada yang benar-benar berjalan).
      if (kendaraanIds.length > 0) {
        const lok = await prisma.lokasiKendaraan.findFirst({
          where: { kendaraanId: { in: kendaraanIds } },
          orderBy: { createdAt: "desc" },
          select: { latitude: true, longitude: true, akurasi: true, createdAt: true },
        });
        if (lok) {
          trukLokasi = {
            latitude: lok.latitude,
            longitude: lok.longitude,
            akurasi: lok.akurasi,
            updatedAt: lok.createdAt.toISOString(),
          };
        }
      }

      // Lokasi realtime petugas (jika armada tidak mengirim posisi).
      const lokPetugas = await prisma.lokasiPetugas.findFirst({
        where: { petugasId },
        orderBy: { createdAt: "desc" },
        select: { latitude: true, longitude: true, akurasi: true, createdAt: true },
      });
      if (lokPetugas) {
        petugasLokasi = {
          latitude: lokPetugas.latitude,
          longitude: lokPetugas.longitude,
          akurasi: lokPetugas.akurasi,
          updatedAt: lokPetugas.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      nama: pelanggan.nama,
      kodePelanggan: pelanggan.kodePelanggan,
      alamat: pelanggan.alamat,
      rtRw: pelanggan.rtRw,
      patokanLokasi: pelanggan.patokanLokasi,
      pickup:
        pelanggan.latitude != null && pelanggan.longitude != null
          ? { latitude: pelanggan.latitude, longitude: pelanggan.longitude }
          : null,
      jadwal: jadwal
        ? { hari: jadwal.hari, jam: jadwal.rute?.jam ?? null, rute: jadwal.rute?.nama ?? null }
        : null,
      petugas: jadwal?.rute?.petugas
        ? { nama: jadwal.rute.petugas.nama, jabatan: jadwal.rute.petugas.jabatan }
        : null,
      kendaraan,
      trukLokasi,
      petugasLokasi,
      statusPengangkutan: angkut?.status ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data. Coba lagi nanti." }, { status: 500 });
  }
}
