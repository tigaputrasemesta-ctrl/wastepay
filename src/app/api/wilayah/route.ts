import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kelurahanIdParam = url.searchParams.get("kelurahanId");
    const searchParam = url.searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    if (kelurahanIdParam) {
      const parsed = parseInt(kelurahanIdParam, 10);
      if (!isNaN(parsed)) {
        where.kelurahanId = parsed;
      }
    }

    if (searchParam) {
      where.nama = { contains: searchParam, mode: "insensitive" };
    }

    const wilayah = await prisma.wilayah.findMany({
      where,
      orderBy: { nama: "asc" },
      include: {
        kelurahanRef: { select: { id: true, nama: true, kecamatan: true, kota: true } },
        zona: { select: { id: true, nama: true, warna: true } },
        _count: { select: { pelanggan: true, rute: true } },
      },
    });

    return NextResponse.json(wilayah);
  } catch (error) {
    console.error("Error fetching wilayah:", error);
    return NextResponse.json({ error: "Gagal mengambil data wilayah" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, rt, rw, kelurahanId, zonaId } = body;

    if (!nama || typeof nama !== "string" || !nama.trim()) {
      return NextResponse.json({ error: "Nama blok pickup / wilayah harus diisi" }, { status: 400 });
    }
    if (!kelurahanId) {
      return NextResponse.json({ error: "Kelurahan harus dipilih" }, { status: 400 });
    }

    const parsedKelurahanId = parseInt(kelurahanId, 10);
    if (isNaN(parsedKelurahanId)) {
      return NextResponse.json({ error: "Kelurahan tidak valid" }, { status: 400 });
    }

    const trimmedNama = nama.trim().replace(/\s+/g, " ");

    // Validasi duplikasi: cegah blok dengan nama sama di kelurahan yang sama
    const existing = await prisma.wilayah.findFirst({
      where: {
        kelurahanId: parsedKelurahanId,
        nama: { equals: trimmedNama, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Blok pickup "${trimmedNama}" sudah terdaftar di kelurahan ini. Gunakan nama yang berbeda atau pilih blok yang sudah ada.`,
        },
        { status: 409 }
      );
    }

    // Ambil data kelurahan untuk denormalisasi (kompatibilitas pelaporan lama)
    const kelurahan = await prisma.kelurahan.findUnique({
      where: { id: parsedKelurahanId },
      select: { nama: true, kecamatan: true, kota: true },
    });

    const parsedZonaId = zonaId ? parseInt(zonaId, 10) : null;

    const wilayah = await prisma.wilayah.create({
      data: {
        nama: trimmedNama,
        rt: rt ? String(rt).trim() : null,
        rw: rw ? String(rw).trim() : null,
        kelurahanId: parsedKelurahanId,
        kelurahan: kelurahan?.nama || null,
        kecamatan: kelurahan?.kecamatan || null,
        kota: kelurahan?.kota || "Kota Depok",
        zonaId: !isNaN(parsedZonaId as number) ? parsedZonaId : null,
      },
      include: {
        kelurahanRef: { select: { id: true, nama: true, kecamatan: true, kota: true } },
        zona: { select: { id: true, nama: true, warna: true } },
        _count: { select: { pelanggan: true, rute: true } },
      },
    });

    await logAudit("create", "Wilayah", wilayah.id, undefined, {
      nama: wilayah.nama,
      kelurahanId: parsedKelurahanId,
      kecamatan: kelurahan?.kecamatan,
    });

    return NextResponse.json(wilayah, { status: 201 });
  } catch (error) {
    console.error("Error creating wilayah:", error);
    return NextResponse.json({ error: "Gagal menambah blok pickup / wilayah" }, { status: 500 });
  }
}
