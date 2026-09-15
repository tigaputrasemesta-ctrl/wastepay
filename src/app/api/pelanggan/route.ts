import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { generateKodePelanggan } from "@/lib/kode-pelanggan";
import { generateNoInvoice } from "@/lib/invoice";
import { hitungJatuhTempoKonsumen } from "@/lib/tagihan";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const wilayahId = searchParams.get("wilayahId");
  const kelurahanIdParam = searchParams.get("kelurahanId");
  const status = searchParams.get("status");
  const kategori = searchParams.get("kategori");

  const where: Prisma.PelangganWhereInput = { deletedAt: null };

  // Privacy scope: petugas lapangan hanya melihat pelanggan di KELURAHAN-nya
  // sendiri (data pribadi pelanggan kelurahan lain tidak boleh terbuka).
  // Parameter ?wilayahId dari petugas diabaikan (tidak bisa lintas kelurahan).
  const session = await getSession();
  if (session?.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    const kelurahanId = await getPetugasKelurahan(session.id);
    if (!kelurahanId) {
      return NextResponse.json(
        { error: "Akun belum ter-link ke kelurahan petugas" },
        { status: 403 }
      );
    }
    where.kelurahanId = kelurahanId;
  } else if (kelurahanIdParam) {
    where.kelurahanId = parseInt(kelurahanIdParam);
  } else if (wilayahId) {
    where.wilayahId = parseInt(wilayahId);
  }

  if (search) {
    where.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { alamat: { contains: search, mode: "insensitive" } },
      { noTelepon: { contains: search, mode: "insensitive" } },
      { kodePelanggan: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status;
  }
  if (kategori) {
    where.kategori = kategori;
  }

  // Parameter paginasi opsional (backward compatible)
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const isPaginated = Boolean(pageParam || limitParam);

  let skip: number | undefined;
  let take: number | undefined;
  let page = 1;
  let limit = 50;

  if (isPaginated) {
    page = Math.max(1, parseInt(pageParam || "1") || 1);
    limit = Math.min(200, Math.max(1, parseInt(limitParam || "50") || 50));
    skip = (page - 1) * limit;
    take = limit;
  }

  const [pelanggan, total] = await Promise.all([
    prisma.pelanggan.findMany({
      where,
      skip,
      take,
      include: {
        wilayah: true,
        kelurahan: true,
        paket: true,
        _count: {
          select: { tagihan: true, pembayaran: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    isPaginated ? prisma.pelanggan.count({ where }) : Promise.resolve(0),
  ]);

  if (isPaginated) {
    return NextResponse.json(
      {
        data: pelanggan,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: { "X-Total-Count": String(total) },
      }
    );
  }

  return NextResponse.json(pelanggan, {
    headers: { "X-Total-Count": String(pelanggan.length) },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, noTelepon, kategori, alamat, rtRw, fotoRumah, patokanLokasi, latitude, longitude, koordinatSumber, koordinatAkurasi, penanggungjawab, referal, customTarif, kelurahanId, paketId, status, catatan } = body;

    if (!nama || !noTelepon || !alamat || !kelurahanId) {
      return NextResponse.json(
        { error: "Nama, no telepon, alamat, dan kelurahan harus diisi" },
        { status: 400 }
      );
    }

    // Kode pelanggan kini menggunakan nomor WhatsApp (noTelepon)
    const kodePelanggan = noTelepon;

    let pelanggan;
    try {
      pelanggan = await prisma.pelanggan.create({
        data: {
          nama,
          noTelepon,
          kodePelanggan,
          kategori: kategori || "level_1",
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
          kelurahanId: parseInt(kelurahanId),
          paketId: paketId ? parseInt(paketId) : null,
          status: status || "aktif",
          catatan: catatan || null,
        },
        include: { kelurahan: true, paket: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json(
          { error: "Nomor WhatsApp ini sudah terdaftar. Silakan gunakan nomor lain." },
          { status: 400 }
        );
      }
      throw e;
    }

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
              jatuhTempo: hitungJatuhTempoKonsumen(pelanggan.createdAt, bulan, tahun),
              keterangan: `Tagihan perdana (Siklus tgl ${new Date(pelanggan.createdAt).getDate()})`,
              noInvoice: generateNoInvoice(pelanggan.kodePelanggan, bulan, tahun),
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
      kelurahanId: pelanggan.kelurahanId,
    });

    return NextResponse.json(pelanggan, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal menambah pelanggan" },
      { status: 500 }
    );
  }
}
