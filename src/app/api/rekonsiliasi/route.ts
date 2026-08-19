import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET() {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rekonsiliasi = await prisma.rekonsiliasi.findMany({
    orderBy: { tanggal: "desc" },
    take: 30,
    include: {
      user: { select: { id: true, nama: true } },
    },
  });

  return NextResponse.json(rekonsiliasi);
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { totalTunaiFisik, catatan } = body;

    // Calculate today's totals
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Total payments today
    const pemasukanAgg = await prisma.pembayaran.aggregate({
      where: {
        tanggal: { gte: todayStart, lt: todayEnd },
        status: "terverifikasi",
      },
      _sum: { jumlah: true },
    });

    // Total expenses today
    const pengeluaranAgg = await prisma.pengeluaran.aggregate({
      where: {
        tanggal: { gte: todayStart, lt: todayEnd },
      },
      _sum: { jumlah: true },
    });

    const totalPemasukan = pemasukanAgg._sum.jumlah || 0;
    const totalPengeluaran = pengeluaranAgg._sum.jumlah || 0;

    // Total tunai from sistem (only tunai payments)
    const tunaiAgg = await prisma.pembayaran.aggregate({
      where: {
        tanggal: { gte: todayStart, lt: todayEnd },
        metode: "tunai",
        status: "terverifikasi",
      },
      _sum: { jumlah: true },
    });
    const totalTunaiSistem = tunaiAgg._sum.jumlah || 0;

    const fisik = totalTunaiFisik !== undefined ? parseFloat(totalTunaiFisik) : null;
    const selisih = fisik !== null ? totalTunaiSistem - fisik : null;

    const rekonsiliasi = await prisma.rekonsiliasi.create({
      data: {
        totalPemasukan,
        totalPengeluaran,
        totalTunaiSistem,
        totalTunaiFisik: fisik,
        selisih,
        catatan,
        userId: user.id,
      },
    });

    return NextResponse.json(rekonsiliasi, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat rekonsiliasi" }, { status: 500 });
  }
}
