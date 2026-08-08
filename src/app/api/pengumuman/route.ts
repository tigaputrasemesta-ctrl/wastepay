import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { toBoolean } from "@/lib/utils";

export async function GET() {
  const pengumuman = await prisma.pengumuman.findMany({
    include: {
      createdBy: { select: { id: true, nama: true } },
      untukWilayah: { select: { id: true, nama: true } },
    },
    orderBy: [{ penting: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(pengumuman);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { judul, isi, penting, untukWilayahId } = body;

    // Atribusi pembuat dari session, bukan body (anti spoofing)
    const user = await getSession();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    if (!judul || !isi) {
      return NextResponse.json({ error: "Judul dan isi harus diisi" }, { status: 400 });
    }

    const pengumuman = await prisma.pengumuman.create({
      data: {
        judul,
        isi,
        penting: toBoolean(penting),
        untukWilayahId: untukWilayahId ? parseInt(untukWilayahId) : null,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, nama: true } },
        untukWilayah: { select: { id: true, nama: true } },
      },
    });

    await logAudit("create", "Pengumuman", pengumuman.id, undefined, { judul: pengumuman.judul, penting: pengumuman.penting });
    return NextResponse.json(pengumuman, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat pengumuman" }, { status: 500 });
  }
}
