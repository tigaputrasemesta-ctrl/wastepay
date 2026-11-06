import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { getDuitkuTransactionStatus, isSuccessStatusCode, isDuitkuEnabled } from "@/lib/duitku";
import { syncDuitkuPayment } from "@/lib/duitku-sync";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || (!hasRole(user, "kasir") && !hasRole(user, "admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tagihanId = parseInt(id, 10);
  if (isNaN(tagihanId)) {
    return NextResponse.json({ error: "ID Tagihan tidak valid" }, { status: 400 });
  }

  try {
    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: {
        pelanggan: true,
        pembayaran: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    if (tagihan.status === "lunas") {
      return NextResponse.json({
        success: true,
        isLunas: true,
        status: "lunas",
        message: "Tagihan ini sudah berstatus LUNAS",
      });
    }

    if (!tagihan.noInvoice) {
      return NextResponse.json({
        success: false,
        isLunas: false,
        message: "Tagihan belum memiliki nomor invoice resmi untuk diperiksa ke gateway",
      });
    }

    if (!isDuitkuEnabled()) {
      return NextResponse.json({
        success: false,
        isLunas: false,
        message: "Payment gateway Duitku belum diaktifkan di konfigurasi sistem",
      });
    }

    // Periksa status ke Duitku API
    const duitkuStatus = await getDuitkuTransactionStatus(tagihan.noInvoice);

    if (!duitkuStatus) {
      return NextResponse.json({
        success: false,
        isLunas: false,
        message: "Belum ada catatan transaksi di payment gateway Duitku untuk invoice ini",
      });
    }

    const isSuccess = isSuccessStatusCode(duitkuStatus.statusCode);

    // Cari transaksi Duitku di database jika ada
    const dt = await prisma.duitkuTransaction.findFirst({
      where: {
        OR: [
          { orderId: tagihan.noInvoice },
          { pembayaran: { tagihanId: tagihan.id } },
        ],
      },
      include: { pembayaran: true },
      orderBy: { id: "desc" },
    });

    if (dt) {
      await syncDuitkuPayment(
        dt.id,
        {
          statusCode: duitkuStatus.statusCode,
          statusMessage: duitkuStatus.statusMessage,
          amount: duitkuStatus.amount ? parseInt(String(duitkuStatus.amount)) : undefined,
          reference: duitkuStatus.reference,
        },
        "status"
      );
    } else if (isSuccess) {
      // Jika Duitku berhasil tapi transaksi lokal belum tercatat
      await prisma.$transaction(async (tx) => {
        const pembayaran = await tx.pembayaran.create({
          data: {
            tagihanId: tagihan.id,
            pelangganId: tagihan.pelangganId,
            jumlah: duitkuStatus.amount ? parseInt(String(duitkuStatus.amount)) : tagihan.jumlah,
            metode: "duitku",
            status: "terverifikasi",
            catatan: `Sinkron Gateway Duitku (${duitkuStatus.statusMessage || "Success"})`,
            tanggal: new Date(),
          },
        });

        await tx.tagihan.update({
          where: { id: tagihan.id },
          data: {
            status: "lunas",
            tanggalLunas: new Date(),
          },
        });

        await logAudit("update", "TagihanGatewaySync", tagihan.id, undefined, {
          noInvoice: tagihan.noInvoice,
          amount: duitkuStatus.amount,
          adminId: user.id,
        });
      });
    }

    return NextResponse.json({
      success: true,
      isLunas: isSuccess,
      statusCode: duitkuStatus.statusCode,
      statusMessage: duitkuStatus.statusMessage,
      message: isSuccess
        ? "Pembayaran Duitku BERHASIL! Status tagihan otomatis diperbarui menjadi LUNAS."
        : `Status Duitku: ${duitkuStatus.statusMessage || "Menunggu Pembayaran"} (Kode: ${duitkuStatus.statusCode || "-"})`,
    });
  } catch (err: any) {
    console.error("Gagal memeriksa gateway:", err);
    return NextResponse.json({ error: "Gagal memeriksa status ke payment gateway", detail: err?.message }, { status: 500 });
  }
}
