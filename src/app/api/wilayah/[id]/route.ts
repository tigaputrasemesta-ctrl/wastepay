import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawId = (await params).id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID wilayah tidak valid" }, { status: 400 });
    }

    const wilayah = await prisma.wilayah.findUnique({
      where: { id },
      include: {
        kelurahanRef: { select: { id: true, nama: true, kecamatan: true, kota: true } },
        zona: { select: { id: true, nama: true, warna: true } },
        _count: { select: { pelanggan: true, petugas: true, rute: true } },
      },
    });

    if (!wilayah) {
      return NextResponse.json({ error: "Wilayah tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(wilayah);
  } catch (error) {
    console.error("Error fetching wilayah detail:", error);
    return NextResponse.json({ error: "Gagal mengambil data wilayah" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawId = (await params).id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID wilayah tidak valid" }, { status: 400 });
    }

    const existingWilayah = await prisma.wilayah.findUnique({
      where: { id },
    });

    if (!existingWilayah) {
      return NextResponse.json({ error: "Wilayah tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const { nama, rt, rw, kelurahanId, zonaId } = body;

    const data: Record<string, unknown> = {};

    let targetNama = existingWilayah.nama;
    if (nama !== undefined) {
      if (typeof nama !== "string" || !nama.trim()) {
        return NextResponse.json({ error: "Nama blok pickup tidak boleh kosong" }, { status: 400 });
      }
      targetNama = nama.trim().replace(/\s+/g, " ");
      data.nama = targetNama;
    }

    let targetKelurahanId = existingWilayah.kelurahanId;
    if (kelurahanId !== undefined) {
      const parsedKelurahanId = kelurahanId ? parseInt(kelurahanId, 10) : null;
      if (kelurahanId && isNaN(parsedKelurahanId as number)) {
        return NextResponse.json({ error: "Kelurahan tidak valid" }, { status: 400 });
      }
      targetKelurahanId = parsedKelurahanId;
      data.kelurahanId = targetKelurahanId;

      if (targetKelurahanId) {
        const kel = await prisma.kelurahan.findUnique({
          where: { id: targetKelurahanId },
          select: { nama: true, kecamatan: true, kota: true },
        });
        if (kel) {
          data.kelurahan = kel.nama;
          data.kecamatan = kel.kecamatan;
          data.kota = kel.kota;
        }
      } else {
        data.kelurahan = null;
        data.kecamatan = null;
        data.kota = null;
      }
    }

    // Cek kemungkinan duplikasi dengan record lain
    if (targetKelurahanId && (nama !== undefined || kelurahanId !== undefined)) {
      const collision = await prisma.wilayah.findFirst({
        where: {
          id: { not: id },
          kelurahanId: targetKelurahanId,
          nama: { equals: targetNama, mode: "insensitive" },
        },
      });

      if (collision) {
        return NextResponse.json(
          {
            error: `Blok pickup "${targetNama}" sudah ada di kelurahan tersebut. Gunakan nama yang berbeda.`,
          },
          { status: 409 }
        );
      }
    }

    if (rt !== undefined) data.rt = rt ? String(rt).trim() : null;
    if (rw !== undefined) data.rw = rw ? String(rw).trim() : null;
    if (zonaId !== undefined) {
      const parsedZonaId = zonaId ? parseInt(zonaId, 10) : null;
      data.zonaId = !isNaN(parsedZonaId as number) ? parsedZonaId : null;
    }

    const updatedWilayah = await prisma.wilayah.update({
      where: { id },
      data,
      include: {
        kelurahanRef: { select: { id: true, nama: true, kecamatan: true, kota: true } },
        zona: { select: { id: true, nama: true, warna: true } },
        _count: { select: { pelanggan: true, rute: true } },
      },
    });

    await logAudit("update", "Wilayah", id, { id }, { nama: updatedWilayah.nama });
    return NextResponse.json(updatedWilayah);
  } catch (error) {
    console.error("Error updating wilayah:", error);
    return NextResponse.json({ error: "Gagal mengupdate blok / wilayah" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawId = (await params).id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID wilayah tidak valid" }, { status: 400 });
    }

    // Cek apakah masih ada pelanggan terdaftar pada wilayah ini
    const pelangganCount = await prisma.pelanggan.count({
      where: { wilayahId: id, deletedAt: null },
    });

    if (pelangganCount > 0) {
      return NextResponse.json(
        {
          error: `Wilayah ini tidak dapat dihapus karena masih memiliki ${pelangganCount} pelanggan aktif. Pindahkan pelanggan ke blok lain terlebih dahulu atau gunakan fitur 'Bersihkan Duplikat'.`,
        },
        { status: 400 }
      );
    }

    // Bersihkan relasi opsional lainnya agar foreign key tidak terkunci
    await prisma.petugas.updateMany({
      where: { wilayahId: id },
      data: { wilayahId: null },
    });

    await prisma.rute.updateMany({
      where: { wilayahId: id },
      data: { wilayahId: null },
    });

    await prisma.pengumuman.updateMany({
      where: { untukWilayahId: id },
      data: { untukWilayahId: null },
    });

    await prisma.wilayah.delete({ where: { id } });
    await logAudit("delete", "Wilayah", id, { id }, undefined);

    return NextResponse.json({ message: "Blok / wilayah berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting wilayah:", error);
    return NextResponse.json({ error: "Gagal menghapus blok / wilayah" }, { status: 500 });
  }
}
