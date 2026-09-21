import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const body = await req.json();
    
    // We only allow updating certain fields
    const { judul, isi, kategori, gambar, diterbitkan } = body;
    const updateData: any = {};
    if (judul !== undefined) updateData.judul = judul;
    if (isi !== undefined) updateData.isi = isi;
    if (kategori !== undefined) updateData.kategori = kategori;
    if (gambar !== undefined) updateData.gambar = gambar;
    if (diterbitkan !== undefined) updateData.diterbitkan = Boolean(diterbitkan);

    const updated = await prisma.artikel.update({
      where: { id: Number(resolvedParams.id) },
      data: updateData,
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengupdate artikel: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    await prisma.artikel.delete({
      where: { id: Number(resolvedParams.id) },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menghapus artikel: " + error.message }, { status: 500 });
  }
}
