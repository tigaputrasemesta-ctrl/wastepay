import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ARTIKEL, getArticleCoverImage } from "@/lib/default-articles";

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

  try {
    let validPenulisId: number | null = null;
    if (session?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true },
      }).catch(() => null);
      if (u) validPenulisId = u.id;
    }

    // Pastikan seluruh 5 artikel SEO unggulan selalu tersedia di database
    if (!search) {
      for (const item of DEFAULT_ARTIKEL) {
        const existing = await prisma.artikel.findUnique({
          where: { slug: item.slug },
          select: { id: true, gambar: true },
        }).catch(() => null);

        if (!existing) {
          await prisma.artikel.create({
            data: {
              slug: item.slug,
              judul: item.judul,
              isi: item.isi,
              kategori: item.kategori,
              gambar: item.gambar,
              diterbitkan: item.diterbitkan,
              penulisId: validPenulisId,
            },
          }).catch(() => null);
        } else if (!existing.gambar && item.gambar) {
          await prisma.artikel.update({
            where: { id: existing.id },
            data: { gambar: item.gambar },
          }).catch(() => null);
        }
      }
    }

    const artikel = await prisma.artikel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { penulis: { select: { nama: true } } },
    });

    const enriched = artikel.map((a) => ({
      ...a,
      gambar: getArticleCoverImage(a.gambar, a.kategori),
    }));

    return NextResponse.json(enriched);
  } catch {
    // Fallback jika database belum terkoneksi / cold start
    const enrichedDefault = DEFAULT_ARTIKEL.map((a) => ({
      ...a,
      gambar: getArticleCoverImage(a.gambar, a.kategori),
    }));
    return NextResponse.json(enrichedDefault);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Dukungan 1-click sync / re-seed 5 artikel SEO unggulan
    if (body.action === "sync") {
      let validPenulisId: number | null = null;
      if (session?.id) {
        const u = await prisma.user.findUnique({
          where: { id: session.id },
          select: { id: true },
        }).catch(() => null);
        if (u) validPenulisId = u.id;
      }

      let count = 0;
      for (const item of DEFAULT_ARTIKEL) {
        await prisma.artikel.upsert({
          where: { slug: item.slug },
          create: {
            slug: item.slug,
            judul: item.judul,
            isi: item.isi,
            kategori: item.kategori,
            gambar: item.gambar,
            diterbitkan: true,
            penulisId: validPenulisId,
          },
          update: {
            judul: item.judul,
            isi: item.isi,
            kategori: item.kategori,
            gambar: item.gambar,
            diterbitkan: true,
          },
        }).catch(() => null);
        count++;
      }

      return NextResponse.json({ ok: true, synced: count });
    }

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

    const assignedGambar = gambar && typeof gambar === "string" && gambar.trim()
      ? gambar.trim()
      : getArticleCoverImage(null, kategori);

    const artikel = await prisma.artikel.create({
      data: {
        judul: judulTrimmed,
        slug,
        isi: isiTrimmed,
        kategori: kategori || "edukasi",
        gambar: assignedGambar,
        diterbitkan: Boolean(diterbitkan),
        penulisId: validPenulisId,
      },
    });

    return NextResponse.json({ ok: true, data: artikel });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal menyimpan artikel: " + error.message }, { status: 500 });
  }
}
