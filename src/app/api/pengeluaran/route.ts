import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");

  const where: Prisma.PengeluaranWhereInput = {};
  if (bulan && tahun) {
    const startDate = new Date(parseInt(tahun!), parseInt(bulan!) - 1, 1);
    const endDate = new Date(parseInt(tahun!), parseInt(bulan!), 0);
    where.tanggal = { gte: startDate, lte: endDate };
  }

  const pengeluaran = await prisma.pengeluaran.findMany({
    where,
    orderBy: { tanggal: "desc" },
    include: { dicatatBy: { select: { id: true, nama: true } } },
  });

  const total = pengeluaran.reduce((sum, p) => sum + p.jumlah, 0);

  return NextResponse.json({ data: pengeluaran, total });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, kategori, jumlah, keterangan, bukti } = body;

    if (!kategori || !jumlah || !keterangan) {
      return NextResponse.json({ error: "Kategori, jumlah, dan keterangan harus diisi" }, { status: 400 });
    }

    // Atribusi pencatat dari session, bukan body (anti spoofing)
    const user = await getSession();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const pengeluaran = await prisma.pengeluaran.create({
      data: {
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        kategori,
        jumlah: parseFloat(jumlah),
        keterangan,
        bukti,
        dicatatById: user.id,
      },
    });

    await logAudit("create", "Pengeluaran", pengeluaran.id, undefined, { kategori: pengeluaran.kategori, jumlah: pengeluaran.jumlah });
    return NextResponse.json(pengeluaran, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mencatat pengeluaran" }, { status: 500 });
  }
}
