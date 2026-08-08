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
    const { status, tanggapan, resolvedById } = body;

    const komplain = await prisma.komplain.update({
      where: { id },
      data: {
        status: status || "diproses",
        tanggapan,
        resolvedById: resolvedById ? parseInt(resolvedById) : null,
      },
    });

    await logAudit("update", "Komplain", id, { id }, { status: komplain.status });
    return NextResponse.json(komplain);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate komplain" }, { status: 500 });
  }
}
