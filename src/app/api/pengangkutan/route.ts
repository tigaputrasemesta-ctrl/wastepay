import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import { namaHari } from "@/lib/utils";
import { sinkronkanPelangganRute } from "@/lib/rute-sync";
import { ensureArmadaRuteSchema } from "@/lib/db-patch";
import { urutkanItemRute } from "@/lib/geo";

/**
 * Materialisasi tugas "terjadwal" dari Jadwal harian milik rute armada / mobil.
 *
 * Logika penjemputan berbasis armada & rute:
 * Mengambil pelanggan aktif yang memiliki jadwal pada hari layanan ini,
 * lalu mendaftarkannya ke tugas pengangkutan hari ini secara idempotent & batch.
 */
async function materializeTugasTerjadwal(opts: {
  kendaraanId?: number;
  petugasId?: number;
  tanggal: Date;
}): Promise<void> {
  const { kendaraanId, petugasId, tanggal } = opts;
  const hari = namaHari(tanggal);
  const start = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
  const end = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate() + 1);

  // Kunci Utama: ARMADA / KENDARAAN (Akun Mobil)
  const ruteWhere: Prisma.RuteWhereInput = { aktif: true };
  if (kendaraanId) {
    ruteWhere.kendaraanId = kendaraanId;
  } else if (petugasId) {
    ruteWhere.petugasId = petugasId;
  }

  // Jika kendaraanId diberikan, cari petugasId pengemudinya jika ada (sebagai penanggungjawab default)
  let effectivePetugasId = petugasId;
  if (kendaraanId && !effectivePetugasId) {
    try {
      const k = await prisma.kendaraan.findUnique({
        where: { id: kendaraanId },
        select: { petugasId: true },
      });
      if (k?.petugasId) effectivePetugasId = k.petugasId;
    } catch {
      // fallback
    }
  }

  let jadwal = await prisma.jadwal.findMany({
    where: {
      hari,
      aktif: true,
      rute: ruteWhere,
      pelanggan: { deletedAt: null, status: "aktif" },
    },
    select: { 
      id: true, 
      pelangganId: true, 
      pelanggan: { select: { wilayah: { select: { zonaId: true } } } },
      rute: { 
        select: { 
          id: true,
          zonaId: true, 
          zonas: { select: { id: true } },
          petugasId: true,
          kendaraanId: true,
        } 
      } 
    },
  });

  // Self-healing: jika jadwal penjemputan masih kosong, cek rute aktif yang melayani hari ini dan auto-sync pelanggan
  if (jadwal.length === 0) {
    try {
      const activeRoutes = await prisma.rute.findMany({
        where: {
          ...ruteWhere,
          hari: { contains: hari },
        },
        select: { id: true },
      });
      for (const r of activeRoutes) {
        await sinkronkanPelangganRute(r.id);
      }
      // Re-query setelah sinkronisasi otomatis
      jadwal = await prisma.jadwal.findMany({
        where: {
          hari,
          aktif: true,
          rute: ruteWhere,
          pelanggan: { deletedAt: null, status: "aktif" },
        },
        select: { 
          id: true, 
          pelangganId: true, 
          pelanggan: { select: { wilayah: { select: { zonaId: true } } } },
          rute: { 
            select: { 
              id: true,
              zonaId: true, 
              zonas: { select: { id: true } },
              petugasId: true,
              kendaraanId: true,
            } 
          } 
        },
      });
    } catch (syncNotice) {
      console.warn("Self-healing auto-sync notice:", syncNotice);
    }
  }

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

  const toCreate: Array<{
    tanggal: Date;
    status: string;
    pelangganId: number;
    kendaraanId: number | null;
    petugasId: number | null;
    jadwalId: number;
    zonaId: number | null;
  }> = [];

  for (const j of jadwal) {
    if (skip.has(j.pelangganId)) continue;
    skip.add(j.pelangganId);
    
    // Tentukan zona angkut: 
    // 1. Zona dari wilayah pelanggan (paling akurat)
    // 2. Jika tidak ada, fallback ke rute.zonaId
    let targetZonaId = j.pelanggan.wilayah?.zonaId || null;
    if (!targetZonaId) {
      targetZonaId = j.rute.zonaId;
    }

    const targetKendaraanId = kendaraanId || j.rute.kendaraanId || null;
    const targetPetugasId = effectivePetugasId || j.rute.petugasId || null;

    toCreate.push({
      tanggal: start,
      status: "terjadwal",
      pelangganId: j.pelangganId,
      kendaraanId: targetKendaraanId,
      petugasId: targetPetugasId,
      jadwalId: j.id,
      zonaId: targetZonaId,
    });
  }

  if (toCreate.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
      const chunk = toCreate.slice(i, i + CHUNK_SIZE);
      await prisma.pengangkutan.createMany({
        data: chunk,
      });
    }
  }
}

export async function GET(request: Request) {
  try {
    await ensureArmadaRuteSchema();
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get("tanggal");
    const petugasId = searchParams.get("petugasId");
    const kendaraanId = searchParams.get("kendaraanId");
    const status = searchParams.get("status");
    const pelangganId = searchParams.get("pelangganId");
    // ?saya=1 → petugas login: hanya tugas miliknya (resolve via link userId)
    const saya = searchParams.get("saya") === "1";

    const where: Prisma.PengangkutanWhereInput = { deletedAt: null };
    const tanggalTugas = tanggal ? new Date(tanggal) : new Date();

    if (tanggal) {
      const d = new Date(tanggal);
      where.tanggal = {
        gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    }

    try {
      if (kendaraanId) {
        const kId = parseInt(kendaraanId);
        where.kendaraanId = kId;
        // Materialisasi tugas rute armada ini untuk hari tersebut
        await materializeTugasTerjadwal({ kendaraanId: kId, tanggal: tanggalTugas });
      } else if (!saya && !pelangganId) {
        // Admin melihat penjemputan hari ini tanpa filter armada: materialisasi seluruh rute aktif hari ini
        await materializeTugasTerjadwal({ tanggal: tanggalTugas });
      }
    } catch (matErr) {
      console.warn("Materialisasi tugas terjadwal notice:", matErr);
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

      if (kendaraanId) {
        // Driver memilih/menjalankan armada spesifik
        const kId = parseInt(kendaraanId);
        where.kendaraanId = kId;
        try {
          await materializeTugasTerjadwal({ kendaraanId: kId, petugasId: profil.id, tanggal: tanggalTugas });
        } catch (matErr) {
          console.warn("Materialisasi tugas armada notice:", matErr);
        }
      } else {
        // Cek armada yang ditugaskan ke petugas ini
        const armadaList = await prisma.kendaraan.findMany({
          where: { petugasId: profil.id, aktif: true, deletedAt: null },
          select: { id: true },
        });
        const armadaIds = armadaList.map((a) => a.id);

        if (armadaIds.length > 0) {
          // Prioritaskan akun Armada/Mobil: ambil tugas milik armada yang ditugaskan
          where.kendaraanId = { in: armadaIds };
          for (const aId of armadaIds) {
            try {
              await materializeTugasTerjadwal({ kendaraanId: aId, petugasId: profil.id, tanggal: tanggalTugas });
            } catch (matErr) {
              console.warn("Materialisasi armada item notice:", matErr);
            }
          }
        } else {
          where.petugasId = profil.id;
          try {
            await materializeTugasTerjadwal({ petugasId: profil.id, tanggal: tanggalTugas });
          } catch (matErr) {
            console.warn("Materialisasi petugas notice:", matErr);
          }
        }
      }
    }
    if (status) where.status = status;
    if (pelangganId) where.pelangganId = parseInt(pelangganId);

    const pengangkutan = await prisma.pengangkutan.findMany({
      where,
      omit: { fotoBukti: true },
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
            noTelepon: true,
            tagihan: {
              where: {
                status: { in: ["tunggakan", "belum_bayar"] },
                deletedAt: null,
              },
              select: {
                id: true,
                bulan: true,
                tahun: true,
                jumlah: true,
                denda: true,
                status: true,
                jatuhTempo: true,
              },
              orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
            },
          },
        },
        petugas: { select: { id: true, nama: true } },
        jadwal: { select: { hari: true } },
        zona: { select: { id: true, nama: true } },
        tpa: { select: { id: true, nama: true } },
        kendaraan: { select: { id: true, nama: true, platNomor: true, jenis: true } },
      },
      orderBy: [{ tanggal: "desc" }, { pelanggan: { nama: "asc" } }],
    });

    // Optimalkan urutan rute penjemputan fisik lapangan (Nearest Neighbor TSP per zona)
    // agar supir tidak loncat-loncat dan urutan jalan konsisten searah jalur fisik
    type PengangkutanItem = (typeof pengangkutan)[number];
    const terurut = urutkanItemRute<PengangkutanItem>(
      pengangkutan,
      (p: PengangkutanItem) =>
        p.pelanggan.latitude && p.pelanggan.longitude
          ? [p.pelanggan.latitude, p.pelanggan.longitude]
          : null,
      (p: PengangkutanItem) => p.zonaId
    );

    const now = new Date();
    const hasil = terurut.map((p: PengangkutanItem, idx: number) => {
      const unpaid = p.pelanggan.tagihan || [];
      const tunggakanList = unpaid.filter(
        (t) => t.status === "tunggakan" || new Date(t.jatuhTempo) < now
      );
      const isMenunggak = tunggakanList.length > 0;
      const totalTunggakan = tunggakanList.reduce(
        (acc, t) => acc + (t.jumlah || 0) + (t.denda || 0),
        0
      );
      const bulanMenunggak = tunggakanList.map((t) => `${t.bulan}/${t.tahun}`);

      return {
        ...p,
        urutan: idx + 1,
        tunggakan: {
          isMenunggak,
          jumlahBulan: tunggakanList.length,
          totalNominal: totalTunggakan,
          daftarBulan: bulanMenunggak,
          bolehPickup: tunggakanList.length < 3,
        },
      };
    });

    return NextResponse.json(hasil);
  } catch (err: any) {
    console.error("GET /api/pengangkutan failure:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, status, catatan, volume, berat, jenisSampah, pelangganId, petugasId, jadwalId, fotoBukti, tpaId, latitude, longitude, kendaraanId, zonaId } = body;

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
        select: { id: true },
      });
      if (!profil) {
        return NextResponse.json({ error: "Akun belum ter-link ke profil petugas" }, { status: 403 });
      }
      petugasIdAkhir = profil.id;

      // Pelanggan harus di KELURAHAN petugas ini
      // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
      if (!PETUGAS_SCOPE_ALL) {
        const kelurahanId = await getPetugasKelurahan(session.id);
        const pelangganTujuan = await prisma.pelanggan.findUnique({
          where: { id: parseInt(pelangganId) },
          select: { kelurahanId: true },
        });
        if (!pelangganTujuan) {
          return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
        }
        if (!kelurahanId || pelangganTujuan.kelurahanId !== kelurahanId) {
          return NextResponse.json(
            { error: "Pelanggan di luar wilayah Anda" },
            { status: 403 }
          );
        }
      }

      // Kendaraan yang dipakai harus armada yang terdaftar dan aktif
      if (kendaraanIdAkhir) {
        const k = await prisma.kendaraan.findFirst({
          where: { id: kendaraanIdAkhir, deletedAt: null, aktif: true },
          select: { id: true },
        });
        if (!k) {
          return NextResponse.json({ error: "Kendaraan tidak ditemukan atau tidak aktif" }, { status: 404 });
        }
      }
    }

    // Validasi tunggakan >= 3 bulan (tidak boleh diangkut)
    if (status === "diambil") {
      const tunggakanData = await prisma.tagihan.findMany({
        where: {
          pelangganId: parseInt(pelangganId),
          status: "tunggakan",
          deletedAt: null,
        }
      });
      if (tunggakanData.length >= 3) {
        return NextResponse.json(
          { error: "Pengangkutan ditolak: Pelanggan memiliki tunggakan 3 bulan atau lebih." },
          { status: 403 }
        );
      }
    }

    // Zona angkut: eksplisit dari body, atau turunan dari pelanggan/rute jadwal terkait
    let zonaIdAkhir = zonaId ? parseInt(zonaId) : null;
    if (!zonaIdAkhir && jadwalId) {
      const jd = await prisma.jadwal.findUnique({
        where: { id: parseInt(jadwalId) },
        select: { 
          pelanggan: { select: { wilayah: { select: { zonaId: true } } } },
          rute: { select: { zonaId: true } } 
        },
      });
      zonaIdAkhir = jd?.pelanggan?.wilayah?.zonaId ?? jd?.rute?.zonaId ?? null;
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
        zonaId: zonaIdAkhir,
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
