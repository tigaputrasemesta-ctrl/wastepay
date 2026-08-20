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
    const { hari, jam, aktif, pelangganId, ruteId } = body;

    const data: Record<string, unknown> = {};
    if (hari !== undefined) data.hari = hari;
    if (jam !== undefined) data.jam = jam;
    if (aktif !== undefined) data.aktif = aktif;
    if (pelangganId !== undefined) data.pelangganId = parseInt(pelangganId);
    if (ruteId !== undefined) data.ruteId = parseInt(ruteId);

    const jadwal = await prisma.jadwal.update({
      where: { id },
      data,
      include: {
        pelanggan: { select: { id: true, nama: true } },
        rute: { select: { id: true, nama: true, hari: true } },
      },
    });

    await logAudit("update", "Jadwal", id, { id }, {});
    return NextResponse.json(jadwal);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate jadwal" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID jadwal tidak valid" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pengangkutan.updateMany({
        where: { jadwalId: id },
        data: { jadwalId: null },
      });
      await tx.jadwal.delete({ where: { id } });
    });

    await logAudit("delete", "Jadwal", id, { id }, undefined);
    return NextResponse.json({ message: "Jadwal berhasil dihapus" });
  } catch (err: unknown) {
    console.error("DELETE /api/jadwal/[id] error:", err);
    const message = (err as Error)?.message || "Gagal menghapus jadwal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
