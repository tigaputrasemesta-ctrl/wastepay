import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kendaraanIdParam = searchParams.get("kendaraanId");
    const statusParam = searchParams.get("status") || "aktif"; // 'aktif' (baru & diproses) atau 'semua' atau 'selesai'

    const allKendaraan = await prisma.kendaraan.findMany({
      where: { aktif: true, deletedAt: null },
      select: { id: true, nama: true, platNomor: true },
      orderBy: { id: "asc" },
    });

    let selectedKendaraanId = kendaraanIdParam ? parseInt(kendaraanIdParam) : null;
    if (!selectedKendaraanId && allKendaraan.length > 0) {
      selectedKendaraanId = allKendaraan[0].id;
    }

    // Ambil seluruh zona yang dilayani oleh rute kendaraan ini
    let zonaIds: number[] = [];
    if (selectedKendaraanId) {
      const rutes = await prisma.rute.findMany({
        where: { aktif: true, kendaraanId: selectedKendaraanId },
        include: {
          zona: { select: { id: true } },
          zonas: { select: { id: true } },
        },
      });

      const zSet = new Set<number>();
      for (const r of rutes) {
        if (r.zonaId) zSet.add(r.zonaId);
        if (r.zonas) r.zonas.forEach((z) => zSet.add(z.id));
      }
      zonaIds = Array.from(zSet);
    }

    const statusFilter =
      statusParam === "aktif"
        ? { in: ["baru", "proses", "diproses"] }
        : statusParam === "selesai"
        ? "selesai"
        : undefined;

    const komplainList = await prisma.komplain.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(zonaIds.length > 0
          ? {
              pelanggan: {
                wilayah: {
                  zonaId: { in: zonaIds },
                },
              },
            }
          : {}),
      },
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            alamat: true,
            noTelepon: true,
            latitude: true,
            longitude: true,
            patokanLokasi: true,
            rtRw: true,
            wilayah: { select: { nama: true, zona: { select: { nama: true } } } },
          },
        },
        resolvedBy: { select: { id: true, nama: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      daftarKendaraan: allKendaraan,
      selectedKendaraanId,
      totalKomplain: komplainList.length,
      komplain: komplainList.map((k) => ({
        id: k.id,
        jenis: k.jenis,
        deskripsi: k.deskripsi,
        foto: k.foto,
        status: k.status,
        tanggapan: k.tanggapan,
        createdAt: k.createdAt,
        pelanggan: {
          id: k.pelanggan.id,
          nama: k.pelanggan.nama,
          alamat: k.pelanggan.alamat,
          noTelepon: k.pelanggan.noTelepon,
          latitude: k.pelanggan.latitude,
          longitude: k.pelanggan.longitude,
          patokanLokasi: k.pelanggan.patokanLokasi,
          zona: k.pelanggan.wilayah?.zona?.nama || "-",
          blok: k.pelanggan.wilayah?.nama || "-",
        },
      })),
    });
  } catch (error) {
    console.error("GET /api/m/komplain-armada error:", error);
    return NextResponse.json({ error: "Gagal memuat komplain armada" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { komplainId, status, tanggapan } = body;

    if (!komplainId) {
      return NextResponse.json({ error: "ID Komplain wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.komplain.update({
      where: { id: parseInt(komplainId) },
      data: {
        status: status || "selesai",
        tanggapan: tanggapan || `Ditindaklanjuti oleh armada (${session.nama})`,
        resolvedById: session.id,
      },
      include: { pelanggan: { select: { nama: true, noTelepon: true } } },
    });

    return NextResponse.json({
      success: true,
      komplain: updated,
      message: `Komplain untuk ${updated.pelanggan.nama} berhasil diselesaikan`,
    });
  } catch (error) {
    console.error("POST /api/m/komplain-armada error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status komplain" }, { status: 500 });
  }
}
