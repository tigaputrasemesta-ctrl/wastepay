import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Membuat/memperbarui token untuk background GPS tracking.
 *
 * Alur: petugas login di aplikasi (webview, punya session cookie) → panggil
 * endpoint ini untuk mendapat token → token dipakai oleh service native untuk
 * POST ke /api/mobile/tracking (tanpa cookie, karena berjalan headless).
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun ini belum ter-link ke profil petugas" }, { status: 403 });
    }

    const token = randomUUID();
    await prisma.petugas.update({
      where: { id: profil.id },
      data: { trackingToken: token },
    });

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Gagal membuat token tracking" }, { status: 500 });
  }
}
