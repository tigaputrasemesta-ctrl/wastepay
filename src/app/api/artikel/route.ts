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
  const search = searchParams.get("search") || "";

  const where = {
    OR: [
      { judul: { contains: search } },
      { isi: { contains: search } },
    ],
  };

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

    if (!judul || !isi) {
      return NextResponse.json({ error: "Judul dan isi wajib diisi" }, { status: 400 });
    }

    let baseSlug = judul.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.artikel.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const artikel = await prisma.artikel.create({
      data: {
        judul,
        slug,
        isi,
        kategori: kategori || "edukasi",
        gambar: gambar || null,
        diterbitkan: diterbitkan || false,
        penulisId: session.id,
      },
    });

    return NextResponse.json({ ok: true, data: artikel });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menyimpan artikel: " + error.message }, { status: 500 });
  }
}
