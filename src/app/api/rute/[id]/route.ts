import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const rute = await prisma.rute.findUnique({
      where: { id },
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
        zona: { select: { id: true, nama: true, kelurahanId: true } },
        zonas: { select: { id: true, nama: true, kelurahanId: true } },
        petugas: { select: { id: true, nama: true } },
        jadwal: {
          include: { pelanggan: { select: { id: true, nama: true, alamat: true } } },
        },
      },
    });
    if (!rute) {
      return NextResponse.json({ error: "Rute tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(rute);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data rute" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, hari, jam, aktif, kelurahanId, kelurahanIds, petugasId, zonaId, zonaIds } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (nama !== undefined) data.nama = nama;
    if (hari !== undefined) data.hari = hari;
    if (jam !== undefined) data.jam = jam;
    if (aktif !== undefined) data.aktif = toBoolean(aktif);
    
    // Determine the final list of kelurahan IDs
    let currentKelurahanIds: number[] = [];
    if (kelurahanIds !== undefined || kelurahanId !== undefined) {
      if (kelurahanIds && Array.isArray(kelurahanIds)) {
        currentKelurahanIds = kelurahanIds.map((k: string) => parseInt(k)).filter(n => !isNaN(n));
      } else if (kelurahanId) {
        currentKelurahanIds = [parseInt(kelurahanId)];
      }
      
      data.kelurahanId = currentKelurahanIds.length > 0 ? currentKelurahanIds[0] : null;
      data.kelurahans = { set: currentKelurahanIds.map(id => ({ id })) };
      data.wilayahId = null; // wilayahId is deprecated for route scopes
    }
    
    if (petugasId !== undefined) data.petugasId = petugasId ? parseInt(petugasId) : null;
    
    if (zonaIds !== undefined || zonaId !== undefined) {
      const parsedZonaIds: number[] = [];
      if (zonaIds && Array.isArray(zonaIds)) {
        parsedZonaIds.push(...zonaIds.map((z: string) => parseInt(z)).filter(n => !isNaN(n)));
      } else if (zonaId) {
        parsedZonaIds.push(parseInt(zonaId));
      }
      
      if (parsedZonaIds.length > 0) {
        // If kelurahan is not being updated in this request, fetch existing kelurahans
        if (currentKelurahanIds.length === 0) {
           const target = await prisma.rute.findUnique({ where: { id }, select: { kelurahans: { select: { id: true } } } });
           if (target?.kelurahans) {
             currentKelurahanIds = target.kelurahans.map(k => k.id);
           }
        }
        
        const zonas = await prisma.zona.findMany({ where: { id: { in: parsedZonaIds } }, select: { kelurahanId: true } });
        // Make sure every zona belongs to at least one of the selected kelurahans
        if (zonas.some((z) => !currentKelurahanIds.includes(z.kelurahanId))) {
          return NextResponse.json({ error: "Beberapa zona tidak sesuai dengan kelurahan yang dipilih" }, { status: 400 });
        }
      }
      
      data.zonaId = parsedZonaIds.length > 0 ? parsedZonaIds[0] : null;
      data.zonas = { set: parsedZonaIds.map(id => ({ id })) };
    }

    const rute = await prisma.rute.update({
      where: { id },
      data,
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
        zona: { select: { id: true, nama: true } },
        petugas: { select: { id: true, nama: true } },
      },
    });

    await logAudit("update", "Rute", id, { id }, { nama: rute.nama, aktif: rute.aktif });
    return NextResponse.json(rute);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate rute" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    const rute = await prisma.rute.findUnique({
      where: { id },
      select: { id: true, nama: true },
    });
    if (!rute) {
      return NextResponse.json({ error: "Rute tidak ditemukan" }, { status: 404 });
    }

    // Cascade delete aman: unlink pengangkutan dari jadwal rute ini, hapus jadwal, lalu hapus rute
    await prisma.$transaction(async (tx) => {
      const jadwals = await tx.jadwal.findMany({
        where: { ruteId: id },
        select: { id: true },
      });

      if (jadwals.length > 0) {
        const jadwalIds = jadwals.map((j) => j.id);
        await tx.pengangkutan.updateMany({
          where: { jadwalId: { in: jadwalIds } },
          data: { jadwalId: null },
        });
        await tx.jadwal.deleteMany({
          where: { ruteId: id },
        });
      }

      await tx.rute.delete({
        where: { id },
      });
    });

    await logAudit("delete", "Rute", id, { id, nama: rute.nama }, undefined);
    return NextResponse.json({ message: "Rute berhasil dihapus" });
  } catch (err: unknown) {
    console.error("DELETE /api/rute/[id] error:", err);
    const message = (err as Error)?.message || "Gagal menghapus rute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
