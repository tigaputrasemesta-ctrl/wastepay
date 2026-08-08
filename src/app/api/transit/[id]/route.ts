import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, alamat, latitude, longitude, catatan, aktif } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (alamat !== undefined) data.alamat = alamat || null;
    if (latitude !== undefined) data.latitude = parseFloat(latitude);
    if (longitude !== undefined) data.longitude = parseFloat(longitude);
    if (catatan !== undefined) data.catatan = catatan || null;
    if (aktif !== undefined) data.aktif = aktif;

    const titik = await prisma.titikTransit.update({ where: { id }, data });
    await logAudit("update", "TitikTransit", id, { id }, { nama: titik.nama, aktif: titik.aktif });
    return NextResponse.json(titik);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate titik transit" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const id = parseInt((await params).id);
    await prisma.titikTransit.delete({ where: { id } });
    await logAudit("delete", "TitikTransit", id, { id }, undefined);
    return NextResponse.json({ message: "Titik transit dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus titik transit" }, { status: 500 });
  }
}
