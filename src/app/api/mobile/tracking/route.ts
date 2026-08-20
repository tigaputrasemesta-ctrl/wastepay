import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Menerima posisi GPS dari service background (native) aplikasi Android.
 * Autentikasi via header `x-tracking-token` (token per petugas), karena service
 * native tidak membawa cookie session webview.
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-tracking-token");
    if (!token) {
      return NextResponse.json({ error: "Token tidak ada" }, { status: 401 });
    }

    const petugas = await prisma.petugas.findUnique({
      where: { trackingToken: token },
      select: { id: true, aktif: true },
    });
    if (!petugas || !petugas.aktif) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
    }

    const body = await request.json();
    const lat = parseFloat(body.latitude);
    const lng = parseFloat(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    await prisma.lokasiPetugas.create({
      data: {
        petugasId: petugas.id,
        latitude: lat,
        longitude: lng,
        akurasi: body.akurasi ? parseFloat(body.akurasi) : null,
        sumber: body.sumber || "background",
      },
    });

    // Pruning: sisakan maks 500 titik per petugas.
    const lama = await prisma.lokasiPetugas.findMany({
      where: { petugasId: petugas.id },
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
