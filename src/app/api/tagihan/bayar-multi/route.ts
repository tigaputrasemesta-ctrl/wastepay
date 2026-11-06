import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateNoInvoice } from "@/lib/invoice-format";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || (!hasRole(user, "kasir") && !hasRole(user, "admin"))) {
    return NextResponse.json({ error: "Unauthorized — Khusus kasir & admin" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tagihanId, durasiBulan = 1, metode = "transfer", catatan = "", buktiBayar = "" } = body;

    const id = parseInt(tagihanId, 10);
    const durasi = parseInt(durasiBulan, 10);

    if (isNaN(id) || isNaN(durasi) || durasi < 1 || durasi > 24) {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }

    const currentTagihan = await prisma.tagihan.findUnique({
      where: { id },
      include: { pelanggan: true },
    });

    if (!currentTagihan) {
      return NextResponse.json({ error: "Tagihan awal tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();
    const settledTagihanIds: number[] = [];
    const monthlyAmount = currentTagihan.jumlah;
    const pelanggan = currentTagihan.pelanggan;

    await prisma.$transaction(async (tx) => {
      // 1. Lunasi tagihan saat ini
      if (currentTagihan.status !== "lunas") {
        await tx.tagihan.update({
          where: { id: currentTagihan.id },
          data: {
            status: "lunas",
            tanggalLunas: now,
            keterangan: durasi > 1
              ? `Lunas Dimuka Paket ${durasi} Bulan (${catatan || "Kasir"})`
              : (catatan || currentTagihan.keterangan),
          },
        });

        await tx.pembayaran.create({
          data: {
            pelangganId: pelanggan.id,
            tagihanId: currentTagihan.id,
            jumlah: monthlyAmount,
            metode,
            status: "terverifikasi",
            catatan: durasi > 1
              ? `Pembayaran Paket Dimuka (Bulan 1/${durasi})`
              : catatan,
            buktiBayar: buktiBayar || null,
            tanggal: now,
          },
        });
      }
      settledTagihanIds.push(currentTagihan.id);

      // 2. Jika durasi > 1 bulan, lunasi bulan-bulan berikutnya
      let currBulan = currentTagihan.bulan;
      let currTahun = currentTagihan.tahun;

      for (let i = 1; i < durasi; i++) {
        currBulan++;
        if (currBulan > 12) {
          currBulan = 1;
          currTahun++;
        }

        // Cek apakah tagihan bulan tersebut sudah ada
        let nextTagihan = await tx.tagihan.findUnique({
          where: {
            pelangganId_bulan_tahun: {
              pelangganId: pelanggan.id,
              bulan: currBulan,
              tahun: currTahun,
            },
          },
        });

        const jatuhTempo = new Date(currTahun, currBulan - 1, 20);
        const invoiceNo = generateNoInvoice(pelanggan.kodePelanggan || String(pelanggan.id), currBulan, currTahun);

        if (!nextTagihan) {
          nextTagihan = await tx.tagihan.create({
            data: {
              pelangganId: pelanggan.id,
              bulan: currBulan,
              tahun: currTahun,
              jumlah: monthlyAmount,
              status: "lunas",
              tanggalLunas: now,
              jatuhTempo,
              noInvoice: invoiceNo,
              keterangan: `Lunas Dimuka Paket ${durasi} Bulan (Bulan ${i + 1}/${durasi})`,
            },
          });
        } else {
          nextTagihan = await tx.tagihan.update({
            where: { id: nextTagihan.id },
            data: {
              status: "lunas",
              tanggalLunas: now,
              keterangan: `Lunas Dimuka Paket ${durasi} Bulan (Bulan ${i + 1}/${durasi})`,
            },
          });
        }

        await tx.pembayaran.create({
          data: {
            pelangganId: pelanggan.id,
            tagihanId: nextTagihan.id,
            jumlah: monthlyAmount,
            metode,
            status: "terverifikasi",
            catatan: `Pembayaran Paket Dimuka (Bulan ${i + 1}/${durasi})`,
            buktiBayar: buktiBayar || null,
            tanggal: now,
          },
        });

        settledTagihanIds.push(nextTagihan.id);
      }
    });

    await logAudit("create", "PembayaranMultiBulan", currentTagihan.id, undefined, {
      pelangganId: pelanggan.id,
      durasiBulan: durasi,
      totalAmount: monthlyAmount * durasi,
      settledTagihanIds,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      durasiBulan: durasi,
      totalTagihan: settledTagihanIds.length,
      totalNominal: monthlyAmount * durasi,
      message: `Berhasil mencatat pembayaran lunas untuk ${settledTagihanIds.length} bulan ke depan.`,
    });
  } catch (err: any) {
    console.error("Gagal bayar multi-bulan:", err);
    return NextResponse.json({ error: "Gagal mencatat pembayaran multi-bulan", detail: err?.message }, { status: 500 });
  }
}
