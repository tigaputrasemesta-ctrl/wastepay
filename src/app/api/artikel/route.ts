import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";

  const where = search
    ? {
        OR: [
          { judul: { contains: search } },
          { isi: { contains: search } },
        ],
      }
    : {};

  const artikel = await prisma.artikel.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { penulis: { select: { nama: true } } },
  });

  return NextResponse.json(artikel);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { judul, isi, kategori, gambar, diterbitkan } = body;

    const judulTrimmed = String(judul || "").trim();
    const isiTrimmed = String(isi || "").trim();

    if (!judulTrimmed || !isiTrimmed) {
      return NextResponse.json({ error: "Judul dan isi artikel wajib diisi" }, { status: 400 });
    }

    let baseSlug = judulTrimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!baseSlug) {
      baseSlug = `artikel-${Date.now()}`;
    }

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.artikel.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Validasi penulisId agar foreign key tidak error
    let validPenulisId: number | null = null;
    if (session?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true },
      });
      if (u) validPenulisId = u.id;
    }

    const artikel = await prisma.artikel.create({
      data: {
        judul: judulTrimmed,
        slug,
        isi: isiTrimmed,
        kategori: kategori || "edukasi",
        gambar: gambar && typeof gambar === "string" && gambar.trim() ? gambar.trim() : null,
        diterbitkan: Boolean(diterbitkan),
        penulisId: validPenulisId,
      },
    });

    return NextResponse.json({ ok: true, data: artikel });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menyimpan artikel: " + error.message }, { status: 500 });
  }
}
