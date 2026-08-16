import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { namaHari } from "@/lib/utils";

/**
 * Materialisasi tugas "terjadwal" dari Jadwal harian milik rute petugas.
 *
 * Mobile petugas membaca daftar tugas dari tabel Pengangkutan, tetapi tidak
 * ada proses yang membuatkan catatan Pengangkutan status "terjadwal" dari
 * Jadwal. Akibatnya saat petugas login, daftar tugas selalu kosong walaupun
 * dia punya rute & jadwal untuk hari itu. Fungsi ini dibuat idempotent:
 * hanya membuat catatan yang belum ada (per pelanggan + tanggal).
 */
async function materializeTugasTerjadwal(petugasId: number, tanggal: Date): Promise<void> {
  const hari = namaHari(tanggal);
  const start = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
  const end = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate() + 1);

  const jadwal = await prisma.jadwal.findMany({
    where: {
      hari,
      aktif: true,
      rute: { aktif: true, petugasId },
      pelanggan: { deletedAt: null, status: "aktif" },
    },
    select: { id: true, pelangganId: true },
  });

  if (jadwal.length === 0) return;

  const pelangganIds = jadwal.map((j) => j.pelangganId);

  const [liburRows, existingRows] = await Promise.all([
    prisma.liburSementara.findMany({
      where: {
        pelangganId: { in: pelangganIds },
        tanggalMulai: { lt: end },
        tanggalSelesai: { gte: start },
      },
      select: { pelangganId: true },
    }),
    prisma.pengangkutan.findMany({
      where: {
        pelangganId: { in: pelangganIds },
        tanggal: { gte: start, lt: end },
        deletedAt: null,
      },
      select: { pelangganId: true },
    }),
  ]);

  const skip = new Set<number>();
  for (const r of liburRows) skip.add(r.pelangganId);
  for (const r of existingRows) skip.add(r.pelangganId);

  for (const j of jadwal) {
    if (skip.has(j.pelangganId)) continue;
    await prisma.pengangkutan.create({
      data: {
        tanggal: start,
        status: "terjadwal",
        pelangganId: j.pelangganId,
        petugasId,
        jadwalId: j.id,
      },
    });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tanggal = searchParams.get("tanggal");
  const petugasId = searchParams.get("petugasId");
  const status = searchParams.get("status");
  const pelangganId = searchParams.get("pelangganId");
  // ?saya=1 → petugas login: hanya tugas miliknya (resolve via link userId)
  const saya = searchParams.get("saya") === "1";

  const where: Prisma.PengangkutanWhereInput = { deletedAt: null };
  if (tanggal) {
    const d = new Date(tanggal);
    where.tanggal = {
      gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    };
  }
  if (petugasId) where.petugasId = parseInt(petugasId);
  if (saya) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });
    if (!profil) {
      return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
    }
    where.petugasId = profil.id;

    // Materialisasi tugas dari jadwal hari tsb agar petugas langsung melihat
    // daftar pickup setelah login (tanpa menunggu admin membuat catatan manual).
    const tanggalTugas = tanggal
      ? new Date(tanggal)
      : new Date();
    await materializeTugasTerjadwal(profil.id, tanggalTugas);
  }
  if (status) where.status = status;
  if (pelangganId) where.pelangganId = parseInt(pelangganId);

  const pengangkutan = await prisma.pengangkutan.findMany({
    where,
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          alamat: true,
          kodePelanggan: true,
          latitude: true,
          longitude: true,
          patokanLokasi: true,
        },
      },
      petugas: { select: { id: true, nama: true } },
      jadwal: { select: { hari: true } },
      tpa: { select: { id: true, nama: true } },
      kendaraan: { select: { id: true, nama: true, platNomor: true, jenis: true } },
    },
    orderBy: [{ tanggal: "desc" }, { pelanggan: { nama: "asc" } }],
  });

  return NextResponse.json(pengangkutan);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, status, catatan, volume, berat, jenisSampah, pelangganId, petugasId, jadwalId, fotoBukti, tpaId, latitude, longitude, kendaraanId } = body;

    if (!pelangganId) {
      return NextResponse.json({ error: "Pelanggan harus diisi" }, { status: 400 });
    }

    // Petugas login → petugasId dari profil (link userId), bukan dari body
    let petugasIdAkhir = petugasId ? parseInt(petugasId) : null;
    const kendaraanIdAkhir = kendaraanId ? parseInt(kendaraanId) : null;
    const session = await getSession();
    if (session && session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { id: true, wilayahId: true },
      });
      if (!profil) {
        return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
      }
      petugasIdAkhir = profil.id;

      // Pelanggan harus di wilayah petugas ini
      const pelangganTujuan = await prisma.pelanggan.findUnique({
        where: { id: parseInt(pelangganId) },
        select: { wilayahId: true },
      });
      if (!pelangganTujuan) {
        return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
      }
      if (pelangganTujuan.wilayahId !== profil.wilayahId) {
        return NextResponse.json(
          { error: "Pelanggan di luar wilayah Anda" },
          { status: 403 }
        );
      }

      // Kendaraan yang dipakai harus milik petugas ini (pengemudi)
      if (kendaraanIdAkhir) {
        const k = await prisma.kendaraan.findFirst({
          where: { id: kendaraanIdAkhir, deletedAt: null, petugasId: profil.id },
          select: { id: true },
        });
        if (!k) {
          return NextResponse.json({ error: "Kendaraan bukan milik Anda" }, { status: 403 });
        }
      }
    }

    const pengangkutan = await prisma.pengangkutan.create({
      data: {
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        status: status || "terjadwal",
        catatan,
        fotoBukti,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        volume: volume ? parseFloat(volume) : null,
        berat: berat ? parseFloat(berat) : null,
        jenisSampah: jenisSampah || null,
        pelangganId: parseInt(pelangganId),
        petugasId: petugasIdAkhir,
        kendaraanId: kendaraanIdAkhir,
        jadwalId: jadwalId ? parseInt(jadwalId) : null,
        tpaId: tpaId ? parseInt(tpaId) : null,
      },
      include: {
        pelanggan: { select: { id: true, nama: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        aksi: "create",
        entitas: "Pengangkutan",
        entitasId: pengangkutan.id,
        dataBaru: JSON.stringify({ pelangganId: parseInt(pelangganId), status }),
      },
    });

    return NextResponse.json(pengangkutan, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mencatat pengangkutan" }, { status: 500 });
  }
}
