import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruteId = searchParams.get("ruteId");
  const pelangganId = searchParams.get("pelangganId");
  const hari = searchParams.get("hari");

  const where: Record<string, unknown> = {};
  if (ruteId) where.ruteId = parseInt(ruteId);
  if (pelangganId) where.pelangganId = parseInt(pelangganId);
  if (hari) where.hari = hari;

  const jadwal = await prisma.jadwal.findMany({
    where,
    include: {
      pelanggan: { select: { id: true, nama: true, alamat: true, noTelepon: true, fotoRumah: true, patokanLokasi: true, latitude: true, longitude: true } },
      rute: {
        select: {
          id: true,
          nama: true,
          hari: true,
          jam: true,
          kelurahan: { select: { id: true, nama: true } },
          zona: { select: { id: true, nama: true } },
          zonas: { select: { id: true, nama: true } },
        },
      },
      _count: { select: { pengangkutan: true } },
    },
    orderBy: [{ rute: { nama: "asc" } }, { hari: "asc" }, { pelanggan: { nama: "asc" } }],
  });

  return NextResponse.json(jadwal);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hari, jam, pelangganId, ruteId } = body;

    if (!hari || !pelangganId || !ruteId) {
      return NextResponse.json(
        { error: "Hari, pelanggan, dan rute harus diisi" },
        { status: 400 }
      );
    }

    const pId = parseInt(String(pelangganId));
    const rId = parseInt(String(ruteId));
    if (isNaN(pId) || isNaN(rId)) {
      return NextResponse.json({ error: "ID pelanggan atau rute tidak valid" }, { status: 400 });
    }

    let hariList: string[] = [];
    if (Array.isArray(hari)) {
      hariList = hari.map((h) => String(h).trim()).filter(Boolean);
    } else if (typeof hari === "string") {
      hariList = hari.split(",").map((h) => h.trim()).filter(Boolean);
    }

    if (hariList.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu hari" }, { status: 400 });
    }

    const results: any[] = [];
    for (const h of hariList) {
      const res = await prisma.jadwal.upsert({
        where: {
          pelangganId_ruteId_hari: {
            pelangganId: pId,
            ruteId: rId,
            hari: h,
          },
        },
        create: {
          pelangganId: pId,
          ruteId: rId,
          hari: h,
          jam: jam ? String(jam).trim() : null,
          aktif: true,
        },
        update: {
          aktif: true,
          jam: jam ? String(jam).trim() : undefined,
        },
        include: {
          pelanggan: { select: { id: true, nama: true } },
          rute: { select: { id: true, nama: true, hari: true } },
        },
      });
      results.push(res);
    }

    await logAudit("create", "Jadwal", results[0].id, undefined, {
      pelangganId: pId,
      ruteId: rId,
      hari: hariList,
    });

    return NextResponse.json(results.length === 1 ? results[0] : results, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/jadwal error:", err);
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}
