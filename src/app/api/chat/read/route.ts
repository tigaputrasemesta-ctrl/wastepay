import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Tandai pesan dibaca.
 * - Petugas membuka thread-nya → semua pesan DARI admin (dariPetugas=false) dibaca.
 * - Admin membuka thread petugas → semua pesan DARI petugas (dariPetugas=true) dibaca.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    if (session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { id: true },
      });
      if (!profil) {
        return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
      }
      await prisma.chatPesan.updateMany({
        where: { petugasId: profil.id, dariPetugas: false, dibaca: false },
        data: { dibaca: true },
      });
      return NextResponse.json({ ok: true });
    }

    const pid = parseInt(body.petugasId);
    if (!Number.isFinite(pid)) {
      return NextResponse.json({ error: "petugasId tidak valid" }, { status: 400 });
    }
    await prisma.chatPesan.updateMany({
      where: { petugasId: pid, dariPetugas: true, dibaca: false },
      data: { dibaca: true },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menandai dibaca" }, { status: 500 });
  }
}
