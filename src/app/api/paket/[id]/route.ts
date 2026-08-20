import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { kode, nama, harga, deskripsi } = body;

    const data: Record<string, unknown> = {};
    if (kode !== undefined) data.kode = String(kode).trim() !== "" ? String(kode).trim() : null;
    if (nama !== undefined) data.nama = nama;
    if (harga !== undefined) {
      data.harga =
        harga !== null && String(harga).trim() !== "" ? parseFloat(harga) : null;
    }
    if (deskripsi !== undefined) data.deskripsi = deskripsi;

    const paket = await prisma.paket.update({
      where: { id },
      data,
    });

    return NextResponse.json(paket);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate paket" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.paket.delete({ where: { id } });
    return NextResponse.json({ message: "Paket berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus paket" }, { status: 500 });
  }
}
