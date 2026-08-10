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
    const { status, tanggalLunas } = body;

    // Validasi status — nilai tak dikenal langsung 400 (bukan 500 dari Prisma)
    const STATUS_VALID = ["belum_bayar", "lunas", "tunggakan", "dibatalkan"];
    if (status && !STATUS_VALID.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const tagihan = await prisma.tagihan.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        // tanggalLunas hanya boleh di-set/di-reset saat status lunas/berubah
        ...(status === "lunas"
          ? { tanggalLunas: tanggalLunas ? new Date(tanggalLunas) : new Date() }
          : status
            ? { tanggalLunas: null }
            : {}),
      },
    });

    await logAudit("update", "Tagihan", id, undefined, { status, tanggalLunas });
    return NextResponse.json(tagihan);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate tagihan" }, { status: 500 });
  }
}
