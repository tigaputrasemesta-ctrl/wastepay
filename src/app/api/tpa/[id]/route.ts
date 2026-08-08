import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.nama !== undefined) data.nama = body.nama;
    if (body.alamat !== undefined) data.alamat = body.alamat;
    if (body.kota !== undefined) data.kota = body.kota;
    if (body.jarak !== undefined) data.jarak = parseFloat(body.jarak);
    if (body.aktif !== undefined) data.aktif = body.aktif === true;

    const tpa = await prisma.tpa.update({
      where: { id },
      data,
    });

    await logAudit("update", "TPA", id, { id }, { nama: tpa.nama });
    return NextResponse.json(tpa);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate TPA" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = parseInt((await params).id);
    await prisma.tpa.delete({ where: { id } });
    await logAudit("delete", "TPA", id, { id }, undefined);
    return NextResponse.json({ message: "TPA berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus TPA" }, { status: 500 });
  }
}
