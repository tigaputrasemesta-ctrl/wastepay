import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruteId = searchParams.get("ruteId");
  const pelangganId = searchParams.get("pelangganId");
  const hari = searchParams.get("hari");

  const where: Record<string, unknown> = {};
  if (ruteId) where.ruteId = parseInt(ruteId);
  if (pelangganId) where.pelangganId = parseInt(pelangganId);
  if (hari) where.hari = hari;

  const jadwal = await prisma.jadwal.findMany({
    where,
    include: {
      pelanggan: { select: { id: true, nama: true, alamat: true, noTelepon: true, fotoRumah: true, patokanLokasi: true, latitude: true, longitude: true } },
      rute: {
        select: {
          id: true,
          nama: true,
          hari: true,
          jam: true,
          kelurahan: { select: { id: true, nama: true } },
          zona: { select: { id: true, nama: true } },
          zonas: { select: { id: true, nama: true } },
        },
      },
      _count: { select: { pengangkutan: true } },
    },
    orderBy: [{ rute: { nama: "asc" } }, { hari: "asc" }, { pelanggan: { nama: "asc" } }],
  });

  return NextResponse.json(jadwal);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hari, jam, pelangganId, ruteId } = body;

    if (!hari || !pelangganId || !ruteId) {
      return NextResponse.json(
        { error: "Hari, pelanggan, dan rute harus diisi" },
        { status: 400 }
      );
    }

    // Cek duplikat
    const existing = await prisma.jadwal.findUnique({
      where: {
        pelangganId_ruteId_hari: {
          pelangganId: parseInt(pelangganId),
          ruteId: parseInt(ruteId),
          hari,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Jadwal sudah ada untuk pelanggan, rute, dan hari yang sama" },
        { status: 400 }
      );
    }

    const jadwal = await prisma.jadwal.create({
      data: {
        hari,
        jam,
        pelangganId: parseInt(pelangganId),
        ruteId: parseInt(ruteId),
      },
      include: {
        pelanggan: { select: { id: true, nama: true } },
        rute: { select: { id: true, nama: true, hari: true } },
      },
    });

    await logAudit("create", "Jadwal", jadwal.id, undefined, { pelangganId: jadwal.pelangganId, ruteId: jadwal.ruteId });
    return NextResponse.json(jadwal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}
