import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allowAttempt } from "@/lib/rate-limit";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";

export const dynamic = "force-dynamic";

/**
 * Lokasi realtime kendaraan (dump truck / pickup).
 * - POST: pengemudi (petugas ter-link) mengirim posisi kendaraannya
 * - GET:  lokasi terakhir semua kendaraan aktif (peta realtime, polling)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // Rate limit per petugas — cegah spam titik lokasi kendaraan
    if (!(await allowAttempt(`lokasi-kendaraan:${session.id}`, { max: 60, windowMs: 5 * 60 * 1000 }))) {
      return NextResponse.json({ error: "Terlalu banyak kirim lokasi" }, { status: 429 });
    }

    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
    }

    const body = await request.json();
    const kendaraanId = parseInt(body.kendaraanId);
    const lat = parseFloat(body.latitude);
    const lng = parseFloat(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    // Pengemudi hanya boleh update lokasi kendaraan yang ditugaskan padanya
    const kendaraan = await prisma.kendaraan.findFirst({
      where: { id: kendaraanId, deletedAt: null, aktif: true },
      select: { id: true, petugasId: true },
    });
    if (!kendaraan) {
      return NextResponse.json({ error: "Kendaraan tidak ditemukan" }, { status: 404 });
    }
    if (kendaraan.petugasId !== profil.id) {
      return NextResponse.json(
        { error: "Anda bukan pengemudi kendaraan ini" },
        { status: 403 }
      );
    }

    await prisma.lokasiKendaraan.create({
      data: {
        kendaraanId: kendaraan.id,
        latitude: lat,
        longitude: lng,
        akurasi: body.akurasi ? parseFloat(body.akurasi) : null,
        sumber: body.sumber || "gps_perangkat",
      },
    });

    // Pruning: sisakan maks 500 titik per kendaraan
    const lama = await prisma.lokasiKendaraan.findMany({
      where: { kendaraanId: kendaraan.id },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      skip: 500,
    });
    if (lama.length > 0) {
      await prisma.lokasiKendaraan.deleteMany({
        where: { id: { in: lama.map((x) => x.id) } },
      });
    }

    return NextResponse.json({ ok: true, kendaraanId: kendaraan.id });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan lokasi kendaraan" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // Scope: petugas hanya melihat kendaraan yang pengemudinya SEKELURAHAN
    // (anti bocor lokasi armada lintas zona). Admin/kasir/superadmin lihat semua.
    const kelurahanPetugas =
      session.role === "petugas" && !PETUGAS_SCOPE_ALL
        ? await getPetugasKelurahan(session.id)
        : null;
    if (session.role === "petugas" && !PETUGAS_SCOPE_ALL && kelurahanPetugas == null) {
      return NextResponse.json([]);
    }

    const semua = await prisma.lokasiKendaraan.findMany({
      where:
        kelurahanPetugas != null
          ? { kendaraan: { aktif: true, petugas: { wilayah: { kelurahanId: kelurahanPetugas } } } }
          : undefined,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        akurasi: true,
        sumber: true,
        createdAt: true,
        kendaraan: {
          select: {
            id: true,
            nama: true,
            platNomor: true,
            jenis: true,
            aktif: true,
            petugas: { select: { id: true, nama: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const terakhir = new Map<number, (typeof semua)[number]>();
    for (const t of semua) {
      if (t.kendaraan.aktif && !terakhir.has(t.kendaraan.id)) {
        terakhir.set(t.kendaraan.id, t);
      }
    }

    return NextResponse.json(
      [...terakhir.values()].map((t) => ({
        kendaraanId: t.kendaraan.id,
        nama: t.kendaraan.nama,
        platNomor: t.kendaraan.platNomor,
        jenis: t.kendaraan.jenis,
        pengemudi: t.kendaraan.petugas?.nama ?? null,
        latitude: t.latitude,
        longitude: t.longitude,
        akurasi: t.akurasi,
        updatedAt: t.createdAt,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Gagal mengambil lokasi kendaraan" }, { status: 500 });
  }
}
