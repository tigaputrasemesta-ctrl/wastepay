import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const JENIS_VALID = ["dump_truck", "pickup", "gerobak"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  // ?lokasi=1 → sertakan lokasi terakhir tiap kendaraan (utk peta realtime)
  const withLokasi = url.searchParams.get("lokasi") === "1";

  const kendaraan = await prisma.kendaraan.findMany({
    where: { deletedAt: null },
    include: {
      petugas: { select: { id: true, nama: true } },
      _count: { select: { pengangkutan: true } },
      ...(withLokasi
        ? {
            lokasi: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { latitude: true, longitude: true, akurasi: true, createdAt: true },
            },
          }
        : {}),
    },
    orderBy: [{ jenis: "asc" }, { nama: "asc" }],
  });

  if (withLokasi) {
    return NextResponse.json(
      kendaraan.map((k) => ({
        id: k.id,
        nama: k.nama,
        platNomor: k.platNomor,
        jenis: k.jenis,
        kapasitas: k.kapasitas,
        aktif: k.aktif,
        petugas: k.petugas,
        latitude: k.lokasi[0]?.latitude ?? null,
        longitude: k.lokasi[0]?.longitude ?? null,
        akurasi: k.lokasi[0]?.akurasi ?? null,
        updatedAt: k.lokasi[0]?.createdAt ?? null,
      }))
    );
  }

  return NextResponse.json(kendaraan);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, platNomor, jenis, kapasitas, petugasId } = body;

    if (!nama) {
      return NextResponse.json({ error: "Nama kendaraan harus diisi" }, { status: 400 });
    }
    if (jenis && !JENIS_VALID.includes(jenis)) {
      return NextResponse.json({ error: "Jenis kendaraan tidak valid" }, { status: 400 });
    }

    const kendaraan = await prisma.kendaraan.create({
      data: {
        nama,
        platNomor: platNomor || null,
        jenis: jenis || "dump_truck",
        kapasitas: kapasitas ? parseFloat(kapasitas) : null,
        petugasId: petugasId ? parseInt(petugasId) : null,
      },
      include: { petugas: { select: { id: true, nama: true } } },
    });

    await logAudit("create", "Kendaraan", kendaraan.id, undefined, { nama: kendaraan.nama, jenis: kendaraan.jenis });
    return NextResponse.json(kendaraan, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah kendaraan" }, { status: 500 });
  }
}
