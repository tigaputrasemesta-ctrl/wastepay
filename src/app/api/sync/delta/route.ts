import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/delta?since=<ISO_TIMESTAMP>&entities=pelanggan,tagihan,komplain,pengangkutan
 * Mengembalikan HANYA data yang bertambah, berubah, atau dihapus sejak timestamp terakhir sinkronisasi.
 * Menghemat bandwidth hingga 99% dan membebaskan Supabase connection pool.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");

    if (!sinceParam) {
      return NextResponse.json(
        { error: "Parameter 'since' wajib diisi (ISO timestamp format)" },
        { status: 400 }
      );
    }

    const sinceDate = new Date(sinceParam);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { error: "Format timestamp 'since' tidak valid" },
        { status: 400 }
      );
    }

    const serverTime = new Date().toISOString();
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "250")));

    const entitiesParam = searchParams.get("entities") || "pelanggan,tagihan,komplain,pengangkutan,zona,rute";
    const entities = entitiesParam.split(",").map((e) => e.trim().toLowerCase());

    const deltaData: Record<string, unknown[]> = {};
    const deletedItems: { entity: string; id: number }[] = [];
    const deltaCounts: Record<string, number> = {};

    // 1. Delta Pelanggan
    if (entities.includes("pelanggan")) {
      const [updatedPelanggan, deletedPelanggan] = await Promise.all([
        prisma.pelanggan.findMany({
          where: {
            updatedAt: { gte: sinceDate },
            deletedAt: null,
          },
          take: limit,
          select: {
            id: true,
            kodePelanggan: true,
            nama: true,
            noTelepon: true,
            kategori: true,
            alamat: true,
            rtRw: true,
            patokanLokasi: true,
            fotoRumah: true,
            latitude: true,
            longitude: true,
            koordinatSumber: true,
            koordinatAkurasi: true,
            penanggungjawab: true,
            referal: true,
            customTarif: true,
            status: true,
            catatan: true,
            wilayahId: true,
            kelurahanId: true,
            paketId: true,
            updatedAt: true,
            createdAt: true,
            wilayah: {
              select: {
                id: true,
                nama: true,
                zonaId: true,
                zona: { select: { id: true, nama: true, warna: true } },
              },
            },
            kelurahan: {
              select: { id: true, nama: true },
            },
            paket: {
              select: { id: true, nama: true, harga: true },
            },
          },
          orderBy: { updatedAt: "asc" },
        }),
        prisma.pelanggan.findMany({
          where: {
            deletedAt: { gte: sinceDate },
          },
          select: { id: true },
          take: limit,
        }),
      ]);

      deltaData.pelanggan = updatedPelanggan.map((p) => ({
        ...p,
        fotoRumah: p.fotoRumah
          ? p.fotoRumah.startsWith("http")
            ? p.fotoRumah
            : `/api/pelanggan/${p.id}/foto`
          : null,
      }));
      deltaCounts.pelanggan = updatedPelanggan.length + deletedPelanggan.length;
      deletedPelanggan.forEach((p) => {
        deletedItems.push({ entity: "pelanggan", id: p.id });
      });
    }

    // 2. Delta Tagihan
    if (entities.includes("tagihan")) {
      const [updatedTagihan, deletedTagihan] = await Promise.all([
        prisma.tagihan.findMany({
          where: {
            updatedAt: { gte: sinceDate },
            deletedAt: null,
          },
          take: limit,
          select: {
            id: true,
            noInvoice: true,
            bulan: true,
            tahun: true,
            jumlah: true,
            denda: true,
            status: true,
            jatuhTempo: true,
            tanggalLunas: true,
            pelangganId: true,
            updatedAt: true,
            pelanggan: {
              select: {
                id: true,
                nama: true,
                kodePelanggan: true,
                noTelepon: true,
              },
            },
          },
          orderBy: { updatedAt: "asc" },
        }),
        prisma.tagihan.findMany({
          where: {
            deletedAt: { gte: sinceDate },
          },
          select: { id: true },
          take: limit,
        }),
      ]);

      deltaData.tagihan = updatedTagihan;
      deltaCounts.tagihan = updatedTagihan.length + deletedTagihan.length;
      deletedTagihan.forEach((t) => {
        deletedItems.push({ entity: "tagihan", id: t.id });
      });
    }

    // 3. Delta Komplain
    if (entities.includes("komplain")) {
      const updatedKomplain = await prisma.komplain.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
        take: limit,
        select: {
          id: true,
          jenis: true,
          deskripsi: true,
          foto: true,
          status: true,
          tanggapan: true,
          pelangganId: true,
          createdAt: true,
          updatedAt: true,
          pelanggan: {
            select: {
              id: true,
              nama: true,
              kodePelanggan: true,
              noTelepon: true,
              alamat: true,
            },
          },
        },
        orderBy: { updatedAt: "asc" },
      });

      deltaData.komplain = updatedKomplain;
      deltaCounts.komplain = updatedKomplain.length;
    }

    // 4. Delta Pengangkutan
    if (entities.includes("pengangkutan")) {
      const [updatedPengangkutan, deletedPengangkutan] = await Promise.all([
        prisma.pengangkutan.findMany({
          where: {
            updatedAt: { gte: sinceDate },
            deletedAt: null,
          },
          take: limit,
          select: {
            id: true,
            tanggal: true,
            status: true,
            volume: true,
            berat: true,
            catatan: true,
            fotoBukti: true,
            pelangganId: true,
            petugasId: true,
            kendaraanId: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "asc" },
        }),
        prisma.pengangkutan.findMany({
          where: {
            deletedAt: { gte: sinceDate },
          },
          select: { id: true },
          take: limit,
        }),
      ]);

      deltaData.pengangkutan = updatedPengangkutan;
      deltaCounts.pengangkutan = updatedPengangkutan.length + deletedPengangkutan.length;
      deletedPengangkutan.forEach((pg) => {
        deletedItems.push({ entity: "pengangkutan", id: pg.id });
      });
    }

    // 5. Delta Zona & Rute
    if (entities.includes("zona")) {
      const updatedZona = await prisma.zona.findMany({
        where: { updatedAt: { gte: sinceDate } },
        take: limit,
        select: {
          id: true,
          nama: true,
          warna: true,
          kelurahanId: true,
          updatedAt: true,
        },
      });
      deltaData.zona = updatedZona;
      deltaCounts.zona = updatedZona.length;
    }

    if (entities.includes("rute")) {
      const updatedRute = await prisma.rute.findMany({
        where: { updatedAt: { gte: sinceDate } },
        take: limit,
        select: {
          id: true,
          nama: true,
          hari: true,
          jam: true,
          aktif: true,
          petugasId: true,
          petugas: { select: { id: true, nama: true } },
          kendaraanId: true,
          zonas: { select: { id: true, nama: true, warna: true } },
          updatedAt: true,
        },
      });
      deltaData.rute = updatedRute;
      deltaCounts.rute = updatedRute.length;
    }

    const totalChanges =
      Object.values(deltaCounts).reduce((acc, curr) => acc + curr, 0) +
      deletedItems.length;

    return NextResponse.json({
      ok: true,
      serverTime,
      since: sinceParam,
      hasChanges: totalChanges > 0,
      totalChanges,
      deltaCounts,
      data: deltaData,
      deleted: deletedItems,
    });
  } catch (error) {
    console.error("[API Sync Delta] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memproses delta sync" },
      { status: 500 }
    );
  }
}
