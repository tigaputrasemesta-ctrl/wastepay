import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { hitungRincian } from "@/lib/invoice-format";

export const dynamic = "force-dynamic";

/**
 * GET /api/tagihan/bayar-kolektif?indukKolektifId=123&bulan=11&tahun=2026
 * Preview daftar tagihan dan total akumulasi anggota kolektif untuk periode tertentu.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user || (!hasRole(user, "kasir") && !hasRole(user, "admin"))) {
    return NextResponse.json({ error: "Unauthorized — Khusus kasir & admin" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const indukIdParam = searchParams.get("indukKolektifId");
  const bulanParam = searchParams.get("bulan");
  const tahunParam = searchParams.get("tahun");

  if (!indukIdParam) {
    return NextResponse.json({ error: "indukKolektifId wajib diisi" }, { status: 400 });
  }

  const indukId = parseInt(indukIdParam, 10);
  if (isNaN(indukId)) {
    return NextResponse.json({ error: "indukKolektifId tidak valid" }, { status: 400 });
  }

  const induk = await prisma.pelanggan.findUnique({
    where: { id: indukId, deletedAt: null },
    select: {
      id: true,
      nama: true,
      noTelepon: true,
      kodePelanggan: true,
      namaGrupKolektif: true,
      skemaBayar: true,
      alamat: true,
      anggotaKolektif: {
        where: { deletedAt: null },
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          kodePelanggan: true,
          alamat: true,
          rtRw: true,
          status: true,
          customTarif: true,
        },
      },
    },
  });

  if (!induk) {
    return NextResponse.json({ error: "Data Koordinator / Induk Kolektif tidak ditemukan" }, { status: 404 });
  }

  const memberIds = [induk.id, ...induk.anggotaKolektif.map((a) => a.id)];

  const whereTagihan: Prisma.TagihanWhereInput = {
    pelangganId: { in: memberIds },
    deletedAt: null,
  };

  if (bulanParam) {
    const b = parseInt(bulanParam, 10);
    if (!isNaN(b) && b >= 1 && b <= 12) whereTagihan.bulan = b;
  }
  if (tahunParam) {
    const t = parseInt(tahunParam, 10);
    if (!isNaN(t) && t >= 2000) whereTagihan.tahun = t;
  }

  const tagihanList = await prisma.tagihan.findMany({
    where: whereTagihan,
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          kodePelanggan: true,
          alamat: true,
          rtRw: true,
          status: true,
          skemaBayar: true,
        },
      },
      pembayaran: {
        where: { status: "terverifikasi" },
        select: { id: true, jumlah: true, tanggal: true, metode: true },
      },
    },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { pelanggan: { nama: "asc" } }],
  });

  const formattedTagihan = tagihanList.map((t) => {
    const rincian = hitungRincian(t.jumlah, t.denda || 0);
    return {
      id: t.id,
      noInvoice: t.noInvoice,
      bulan: t.bulan,
      tahun: t.tahun,
      jumlah: t.jumlah,
      denda: t.denda || 0,
      total: rincian.total,
      status: t.status,
      jatuhTempo: t.jatuhTempo,
      tanggalLunas: t.tanggalLunas,
      pelangganId: t.pelangganId,
      namaPelanggan: t.pelanggan.nama,
      kodePelanggan: t.pelanggan.kodePelanggan,
      alamat: t.pelanggan.alamat,
      rtRw: t.pelanggan.rtRw,
      isInduk: t.pelangganId === induk.id,
    };
  });

  const unpaidTagihan = formattedTagihan.filter((t) => t.status !== "lunas");
  const totalUnpaidNominal = unpaidTagihan.reduce((sum, t) => sum + t.total, 0);

  return NextResponse.json({
    induk: {
      id: induk.id,
      nama: induk.nama,
      noTelepon: induk.noTelepon,
      kodePelanggan: induk.kodePelanggan,
      namaGrupKolektif: induk.namaGrupKolektif,
      totalAnggota: induk.anggotaKolektif.length,
    },
    ringkasan: {
      totalTagihan: formattedTagihan.length,
      unpaidCount: unpaidTagihan.length,
      lunasCount: formattedTagihan.length - unpaidTagihan.length,
      totalNominalUnpaid: totalUnpaidNominal,
    },
    tagihan: formattedTagihan,
  });
}

/**
 * POST /api/tagihan/bayar-kolektif
 * Melunasi tagihan seluruh (atau sebagian) anggota kolektif secara satu pintu dan atomic.
 * Body: { indukKolektifId, tagihanIds?, bulan?, tahun?, metode, catatan?, buktiBayar? }
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || (!hasRole(user, "kasir") && !hasRole(user, "admin"))) {
    return NextResponse.json({ error: "Unauthorized — Khusus kasir & admin" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      indukKolektifId,
      tagihanIds,
      bulan,
      tahun,
      metode = "tunai",
      catatan = "",
      buktiBayar = "",
    } = body;

    const indukId = parseInt(indukKolektifId, 10);
    if (isNaN(indukId)) {
      return NextResponse.json({ error: "indukKolektifId tidak valid" }, { status: 400 });
    }

    const induk = await prisma.pelanggan.findUnique({
      where: { id: indukId, deletedAt: null },
      include: {
        anggotaKolektif: {
          where: { deletedAt: null },
          select: { id: true, nama: true, kodePelanggan: true },
        },
      },
    });

    if (!induk) {
      return NextResponse.json({ error: "Koordinator / Induk Kolektif tidak ditemukan" }, { status: 404 });
    }

    const memberIds = [induk.id, ...induk.anggotaKolektif.map((a) => a.id)];

    const whereTagihan: Prisma.TagihanWhereInput = {
      pelangganId: { in: memberIds },
      status: { in: ["belum_bayar", "tunggakan"] },
      deletedAt: null,
    };

    if (Array.isArray(tagihanIds) && tagihanIds.length > 0) {
      const parsedIds = tagihanIds.map((id: unknown) => Number(id)).filter((n) => !isNaN(n));
      if (parsedIds.length > 0) {
        whereTagihan.id = { in: parsedIds };
      }
    }
    if (bulan) {
      const b = parseInt(bulan, 10);
      if (!isNaN(b) && b >= 1 && b <= 12) whereTagihan.bulan = b;
    }
    if (tahun) {
      const t = parseInt(tahun, 10);
      if (!isNaN(t) && t >= 2000) whereTagihan.tahun = t;
    }

    const tagihanToSettle = await prisma.tagihan.findMany({
      where: whereTagihan,
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            noTelepon: true,
            kodePelanggan: true,
            alamat: true,
          },
        },
      },
    });

    if (tagihanToSettle.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada tagihan tertunggak yang dapat dilunasi untuk anggota kolektif ini." },
        { status: 400 }
      );
    }

    const now = new Date();
    const settlementResults = await prisma.$transaction(async (tx) => {
      let totalAmountSettled = 0;
      const settledItems: {
        tagihanId: number;
        pembayaranId: number;
        noInvoice: string | null;
        namaPelanggan: string;
        kodePelanggan: string;
        bulan: number;
        tahun: number;
        jumlah: number;
      }[] = [];

      for (const t of tagihanToSettle) {
        const rincian = hitungRincian(t.jumlah, t.denda || 0);
        const billTotal = rincian.total;
        totalAmountSettled += billTotal;

        // 1. Update status tagihan menjadi lunas
        await tx.tagihan.update({
          where: { id: t.id },
          data: {
            status: "lunas",
            tanggalLunas: now,
            keterangan: (catatan ? `${catatan} | ` : "") + `Lunas Kolektif Satu Pintu via ${induk.nama}`,
          },
        });

        // 2. Buat record pembayaran terverifikasi
        const pb = await tx.pembayaran.create({
          data: {
            tagihanId: t.id,
            pelangganId: t.pelangganId,
            jumlah: billTotal,
            metode,
            buktiBayar: buktiBayar || null,
            catatan: `Pembayaran Kolektif Satu Pintu via ${induk.nama}${
              induk.namaGrupKolektif ? ` (${induk.namaGrupKolektif})` : ""
            }${catatan ? ` | Catatan: ${catatan}` : ""}`,
            status: "terverifikasi",
            verifiedById: user.id,
            tanggal: now,
          },
        });

        settledItems.push({
          tagihanId: t.id,
          pembayaranId: pb.id,
          noInvoice: t.noInvoice,
          namaPelanggan: t.pelanggan.nama,
          kodePelanggan: t.pelanggan.kodePelanggan,
          bulan: t.bulan,
          tahun: t.tahun,
          jumlah: billTotal,
        });
      }

      return {
        totalAmountSettled,
        settledItems,
      };
    });

    // Audit log pelunasan kolektif
    await logAudit("create", "PembayaranKolektif", induk.id, undefined, {
      indukId: induk.id,
      indukNama: induk.nama,
      namaGrup: induk.namaGrupKolektif,
      jumlahRumah: settlementResults.settledItems.length,
      totalNominal: settlementResults.totalAmountSettled,
      metode,
      kasirId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil melunasi ${settlementResults.settledItems.length} tagihan kolektif melalui ${induk.nama} dengan total nominal Rp ${settlementResults.totalAmountSettled.toLocaleString("id-ID")}`,
      induk: {
        id: induk.id,
        nama: induk.nama,
        noTelepon: induk.noTelepon,
        namaGrupKolektif: induk.namaGrupKolektif,
      },
      summary: {
        totalRumah: settlementResults.settledItems.length,
        totalNominal: settlementResults.totalAmountSettled,
        metode,
        tanggal: now.toISOString(),
      },
      items: settlementResults.settledItems,
    });
  } catch (error) {
    console.error("[bayar-kolektif] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses pembayaran kolektif: " + (error instanceof Error ? error.message : "Internal Error") },
      { status: 500 }
    );
  }
}
