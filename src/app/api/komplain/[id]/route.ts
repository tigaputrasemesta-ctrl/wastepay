import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { status, tanggapan } = body;

    // Status valid
    const STATUS_VALID = ["baru", "proses", "selesai", "ditolak"];
    if (status && !STATUS_VALID.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    // resolvedById dari session — bukan dari body (anti spoofing)
    const session = await getSession();

    const komplain = await prisma.komplain.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(tanggapan !== undefined ? { tanggapan } : {}),
        ...(status === "selesai" || status === "ditolak"
          ? { resolvedById: session?.id ?? null }
          : {}),
      },
    });

    await logAudit("update", "Komplain", id, { id }, { status: komplain.status });
    return NextResponse.json(komplain);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate komplain" }, { status: 500 });
  }
}
