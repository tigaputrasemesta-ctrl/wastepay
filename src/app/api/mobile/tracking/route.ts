import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Menerima posisi GPS dari service background (native) aplikasi Android maupun sesi aktif Flutter.
 * Autentikasi via header `x-tracking-token` (token per petugas) atau sesi login petugas.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const token = request.headers.get("x-tracking-token");
    let targetPetugasId: number | null = null;

    if (token) {
      const petugas = await prisma.petugas.findUnique({
        where: { trackingToken: token },
        select: { id: true, aktif: true },
      });
      if (petugas?.aktif) targetPetugasId = petugas.id;
    } else if (session && session.role === "petugas") {
      const petugas = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { id: true, aktif: true },
      });
      if (petugas?.aktif) targetPetugasId = petugas.id;
    }

    if (!targetPetugasId) {
      return NextResponse.json({ error: "Token atau sesi tidak valid" }, { status: 401 });
    }

    const body = await request.json();
    const lat = parseFloat(body.latitude);
    const lng = parseFloat(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    await prisma.lokasiPetugas.create({
      data: {
        petugasId: targetPetugasId,
        latitude: lat,
        longitude: lng,
        akurasi: body.akurasi ? parseFloat(body.akurasi) : (body.accuracy ? parseFloat(body.accuracy) : null),
        sumber: body.sumber || "flutter_native",
      },
    });

    // Pruning: sisakan maks 500 titik per petugas.
    const lama = await prisma.lokasiPetugas.findMany({
      where: { petugasId: targetPetugasId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      skip: 500,
    });
    if (lama.length > 0) {
      await prisma.lokasiPetugas.deleteMany({
        where: { id: { in: lama.map((x) => x.id) } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan lokasi" }, { status: 500 });
  }
}
