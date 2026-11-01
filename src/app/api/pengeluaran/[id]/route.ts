import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.pengeluaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const { tanggal, kategori, jumlah, keterangan, bukti } = body;

    const data: Record<string, unknown> = {};
    if (tanggal !== undefined) data.tanggal = new Date(tanggal);
    if (kategori !== undefined) data.kategori = kategori;
    if (jumlah !== undefined) {
      const nominal = parseFloat(jumlah);
      if (!Number.isFinite(nominal) || nominal <= 0) {
        return NextResponse.json({ error: "Jumlah harus angka positif" }, { status: 400 });
      }
      data.jumlah = nominal;
    }
    if (keterangan !== undefined) data.keterangan = keterangan;
    if (bukti !== undefined) data.bukti = bukti;

    const pengeluaran = await prisma.pengeluaran.update({
      where: { id },
      data,
      include: { dicatatBy: { select: { id: true, nama: true } } },
    });

    // Catat log audit lengkap (nilai sebelum vs sesudah perubahan)
    await logAudit(
      "update",
      "Pengeluaran",
      id,
      {
        id: existing.id,
        kategori: existing.kategori,
        jumlah: existing.jumlah,
        keterangan: existing.keterangan,
        tanggal: existing.tanggal,
      },
      {
        id: pengeluaran.id,
        kategori: pengeluaran.kategori,
        jumlah: pengeluaran.jumlah,
        keterangan: pengeluaran.keterangan,
        tanggal: pengeluaran.tanggal,
      }
    );

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
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.pengeluaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });
    }

    await prisma.pengeluaran.delete({ where: { id } });

    // Simpan snapshot data lengkap yang dihapus untuk audit forensik
    await logAudit(
      "delete",
      "Pengeluaran",
      id,
      {
        id: existing.id,
        kategori: existing.kategori,
        jumlah: existing.jumlah,
        keterangan: existing.keterangan,
        tanggal: existing.tanggal,
        dicatatById: existing.dicatatById,
      },
      undefined
    );

    return NextResponse.json({ message: "Pengeluaran berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengeluaran" }, { status: 500 });
  }
}
