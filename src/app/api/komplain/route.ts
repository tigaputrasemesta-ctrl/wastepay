import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "300") || 300, 500);

  // Validasi status enum
  const STATUS_VALID = ["baru", "proses", "selesai", "ditolak"];
  if (status && status !== "semua" && !STATUS_VALID.includes(status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

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
    // Defense-in-depth: butuh sesi (proxy sudah enforce level 10)
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jenis, deskripsi, foto, pelangganId } = body;

    if (!deskripsi || !pelangganId) {
      return NextResponse.json({ error: "Deskripsi dan pelanggan harus diisi" }, { status: 400 });
    }

    // Batasi ukuran foto komplain (data URL base64, maks ~2MB)
    if (foto && typeof foto === "string" && foto.length > 2_800_000) {
      return NextResponse.json({ error: "Ukuran foto terlalu besar (maks 2MB)" }, { status: 400 });
    }

    // Petugas hanya boleh membuat komplain untuk pelanggan di wilayahnya
    if (session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { wilayahId: true },
      });
      const target = await prisma.pelanggan.findUnique({
        where: { id: parseInt(pelangganId) },
        select: { wilayahId: true },
      });
      if (!profil || !target || profil.wilayahId !== target.wilayahId) {
        return NextResponse.json(
          { error: "Pelanggan di luar wilayah Anda" },
          { status: 403 }
        );
      }
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
