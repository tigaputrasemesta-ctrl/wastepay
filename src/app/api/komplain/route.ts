import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "300") || 300, 500);

  const komplain = await prisma.komplain.findMany({
    where: status && status !== "semua" ? { status } : undefined,
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          alamat: true,
          noTelepon: true,
          kodePelanggan: true,
          latitude: true,
          longitude: true,
        },
      },
      resolvedBy: { select: { id: true, nama: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  return NextResponse.json(komplain);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jenis, deskripsi, foto, pelangganId } = body;

    if (!deskripsi || !pelangganId) {
      return NextResponse.json({ error: "Deskripsi dan pelanggan harus diisi" }, { status: 400 });
    }

    const komplain = await prisma.komplain.create({
      data: {
        jenis: jenis || "tidak_diangkut",
        deskripsi,
        foto,
        status: "baru",
        pelangganId: parseInt(pelangganId),
      },
      include: {
        pelanggan: { select: { id: true, nama: true } },
      },
    });

    return NextResponse.json(komplain, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat komplain" }, { status: 500 });
  }
}
