import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allowAttempt } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Lokasi realtime petugas lapangan.
 * - POST: petugas login mengirim posisi GPS (dari navigator.geolocation)
 * - GET:  lokasi terakhir semua petugas (untuk peta realtime, polling)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // Rate limit per petugas: polling GPS ~30 detik → 60/5 menit cukup longgar,
    // sekaligus mencegah spam titik lokasi (banjir DB).
    if (!(await allowAttempt(`lokasi-petugas:${session.id}`, { max: 60, windowMs: 5 * 60 * 1000 }))) {
      return NextResponse.json({ error: "Terlalu banyak kirim lokasi" }, { status: 429 });
    }

    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true, jabatan: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun ini belum ter-link ke profil petugas" }, { status: 403 });
    }

    const body = await request.json();
    const lat = parseFloat(body.latitude);
    const lng = parseFloat(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    await prisma.lokasiPetugas.create({
      data: {
        petugasId: profil.id,
        latitude: lat,
        longitude: lng,
        akurasi: body.akurasi ? parseFloat(body.akurasi) : null,
        sumber: body.sumber || "gps_perangkat",
      },
    });

    // Pruning: sisakan maks 500 titik per petugas (peta hanya butuh titik terakhir)
    const lama = await prisma.lokasiPetugas.findMany({
      where: { petugasId: profil.id },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      skip: 500,
    });
    if (lama.length > 0) {
      await prisma.lokasiPetugas.deleteMany({
        where: { id: { in: lama.map((x) => x.id) } },
      });
    }

    return NextResponse.json({ ok: true, petugasId: profil.id });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan lokasi" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // Scope: petugas hanya melihat lokasi petugas SEWILAYAH (anti bocor PII GPS lintas zona).
    // Admin/kasir/superadmin melihat semua.
    const wilayahPetugas =
      session.role === "petugas"
        ? (
            await prisma.petugas.findUnique({
              where: { userId: session.id },
              select: { wilayahId: true },
            })
          )?.wilayahId ?? null
        : null;
    if (session.role === "petugas" && wilayahPetugas == null) {
      return NextResponse.json([]);
    }

    // Lokasi terakhir per petugas (aktif) — untuk marker peta
    const semua = await prisma.lokasiPetugas.findMany({
      where:
        wilayahPetugas != null
          ? { petugas: { wilayahId: wilayahPetugas, aktif: true } }
          : undefined,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        akurasi: true,
        sumber: true,
        createdAt: true,
        petugas: { select: { id: true, nama: true, jabatan: true, aktif: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Ambil 1 titik terakhir per petugas aktif
    const terakhir = new Map<number, (typeof semua)[number]>();
    for (const t of semua) {
      if (t.petugas.aktif && !terakhir.has(t.petugas.id)) {
        terakhir.set(t.petugas.id, t);
      }
    }

    return NextResponse.json(
      [...terakhir.values()].map((t) => ({
        petugasId: t.petugas.id,
        nama: t.petugas.nama,
        jabatan: t.petugas.jabatan,
        latitude: t.latitude,
        longitude: t.longitude,
        akurasi: t.akurasi,
        sumber: t.sumber,
        updatedAt: t.createdAt,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Gagal mengambil lokasi" }, { status: 500 });
  }
}
