import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { kategori, label, tarif, deskripsi } = body;

    const data: Prisma.KategoriTarifUpdateInput = {};
    if (kategori !== undefined) data.kategori = kategori;
    if (label !== undefined) data.label = label;
    if (tarif !== undefined) data.tarif = parseFloat(tarif);
    if (deskripsi !== undefined) data.deskripsi = deskripsi;

    const updated = await prisma.kategoriTarif.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate tarif" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.kategoriTarif.delete({ where: { id } });
    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
