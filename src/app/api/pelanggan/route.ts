import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const wilayahId = searchParams.get("wilayahId");
  const status = searchParams.get("status");

  const where: Prisma.PelangganWhereInput = { deletedAt: null };
  if (search) {
    where.OR = [
      { nama: { contains: search } },
      { alamat: { contains: search } },
      { noTelepon: { contains: search } },
      { kodePelanggan: { contains: search } },
    ];
  }
  if (wilayahId) {
    where.wilayahId = parseInt(wilayahId);
  }
  if (status) {
    where.status = status;
  }

  const pelanggan = await prisma.pelanggan.findMany({
    where,
    include: {
      wilayah: true,
      paket: true,
      _count: {
        select: { tagihan: true, pembayaran: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pelanggan);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, noTelepon, kategori, alamat, rtRw, fotoRumah, patokanLokasi, latitude, longitude, koordinatSumber, koordinatAkurasi, penanggungjawab, referal, customTarif, wilayahId, paketId, status, catatan } = body;

    if (!nama || !noTelepon || !alamat || !wilayahId) {
      return NextResponse.json(
        { error: "Nama, no telepon, alamat, dan wilayah harus diisi" },
        { status: 400 }
      );
    }

    // Generate kode pelanggan otomatis: P-XXXXXX
    const lastPelanggan = await prisma.pelanggan.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextId = (lastPelanggan?.id ?? 0) + 1;
    const kodePelanggan = `P-${String(nextId).padStart(6, "0")}`;

    const pelanggan = await prisma.pelanggan.create({
      data: {
        nama,
        noTelepon,
        kodePelanggan,
        kategori: kategori || "rumah_tangga",
        alamat,
        rtRw,
        fotoRumah,
        patokanLokasi,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        koordinatSumber: koordinatSumber || null,
        koordinatAkurasi: koordinatAkurasi ? parseFloat(koordinatAkurasi) : null,
        penanggungjawab,
        referal,
        customTarif: customTarif ? parseFloat(customTarif) : null,
        wilayahId: parseInt(wilayahId),
        paketId: paketId ? parseInt(paketId) : null,
        status: status || "aktif",
        catatan: catatan || null,
      },
      include: { wilayah: true, paket: true },
    });

    // Auto-generate tagihan bulan ini — hanya untuk pelanggan aktif
    // (calon/nonaktif/libur tidak ikut ditagih)
    try {
      if (pelanggan.status !== "aktif") {
        // lewati
      } else {
        const now = new Date();
        const bulan = now.getMonth() + 1;
        const tahun = now.getFullYear();

        // Cek apakah tagihan sudah ada
        const existing = await prisma.tagihan.findUnique({
          where: { pelangganId_bulan_tahun: { pelangganId: pelanggan.id, bulan, tahun } },
        });

        if (!existing) {
          // Hitung tarif: customTarif > paket.harga > kategori tarif default
          let tarif = pelanggan.customTarif;
          if (!tarif && pelanggan.paket) {
            tarif = pelanggan.paket.harga;
          }
          if (!tarif) {
            const kategoriTarif = await prisma.kategoriTarif.findUnique({
              where: { kategori: pelanggan.kategori },
            });
            tarif = kategoriTarif?.tarif ?? 0;
          }

          await prisma.tagihan.create({
            data: {
              pelangganId: pelanggan.id,
              bulan,
              tahun,
              jumlah: tarif,
              status: "belum_bayar",
              jatuhTempo: new Date(tahun, bulan - 1, 15),
              keterangan: "Tagihan perdana",
            },
          });
        }
      }
    } catch {
      // Gagal generate tagihan otomatis bukan error fatal
    }

    await logAudit("create", "Pelanggan", pelanggan.id, undefined, {
      nama: pelanggan.nama,
      kodePelanggan: pelanggan.kodePelanggan,
      wilayahId: pelanggan.wilayahId,
    });

    return NextResponse.json(pelanggan, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal menambah pelanggan" },
      { status: 500 }
    );
  }
}
