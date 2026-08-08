import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { tanggal, kategori, jumlah, keterangan, bukti } = body;

    const data: Record<string, unknown> = {};
    if (tanggal !== undefined) data.tanggal = new Date(tanggal);
    if (kategori !== undefined) data.kategori = kategori;
    if (jumlah !== undefined) data.jumlah = parseFloat(jumlah);
    if (keterangan !== undefined) data.keterangan = keterangan;
    if (bukti !== undefined) data.bukti = bukti;

    const pengeluaran = await prisma.pengeluaran.update({
      where: { id },
      data,
      include: { dicatatBy: { select: { id: true, nama: true } } },
    });

    await logAudit("update", "Pengeluaran", id, { id }, { kategori: pengeluaran.kategori, jumlah: pengeluaran.jumlah });
    return NextResponse.json(pengeluaran);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate pengeluaran" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.pengeluaran.delete({ where: { id } });
    await logAudit("delete", "Pengeluaran", id, { id }, undefined);
    return NextResponse.json({ message: "Pengeluaran berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengeluaran" }, { status: 500 });
  }
}
