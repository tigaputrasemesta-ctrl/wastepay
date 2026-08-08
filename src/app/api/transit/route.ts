import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/** Titik transit (lapak) — tempat dump truck standby / pemindahan sampah. */
export async function GET() {
  const transit = await prisma.titikTransit.findMany({
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(transit);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, alamat, latitude, longitude, catatan } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama titik transit harus diisi" }, { status: 400 });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    const titik = await prisma.titikTransit.create({
      data: { nama, alamat: alamat || null, latitude: lat, longitude: lng, catatan: catatan || null },
    });
    await logAudit("create", "TitikTransit", titik.id, undefined, { nama: titik.nama });
    return NextResponse.json(titik, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah titik transit" }, { status: 500 });
  }
}
