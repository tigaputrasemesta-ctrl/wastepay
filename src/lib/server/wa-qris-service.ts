import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createPayment, isDuitkuEnabled, truncateRaw } from "@/lib/duitku";
import { hitungRincian } from "@/lib/invoice";

export interface GeneratedQrisData {
  qrString: string;
  qrImageUrl: string;
  paymentUrl: string;
  orderId: string;
  totalDenganAdmin: number;
  biayaAdmin: number;
  bulan: number;
  tahun: number;
}

/**
 * Menghasilkan atau mengambil sesi pembayaran QRIS aktif untuk tagihan pelanggan.
 * Mendukung reuse sesi pending aktif dalam 30 menit terakhir agar tidak terjadi spam inquiry Duitku.
 * Mengembalikan data QRIS termasuk link gambar barcode (qrImageUrl) untuk dikirim langsung via WhatsApp.
 */
export async function getOrGenerateQrisForTagihan(
  pelanggan: { id: number; nama: string; noTelepon?: string | null; kodePelanggan?: string | null },
  tagihan: { id: number; bulan: number; tahun: number; jumlah: number; denda?: number | null }
): Promise<GeneratedQrisData | null> {
  if (!isDuitkuEnabled()) {
    return null;
  }

  try {
    // 1. Pastikan tidak ada pembayaran manual (transfer/tunai) yang sedang pending verifikasi admin
    const pendingManual = await prisma.pembayaran.findFirst({
      where: {
        tagihanId: tagihan.id,
        metode: { in: ["transfer", "tunai", "ewallet", "virtual_account"] },
        status: "pending",
      },
      select: { id: true },
    });
    if (pendingManual) {
      return null;
    }

    const totalTagihan = hitungRincian(tagihan.jumlah, tagihan.denda ?? 0).total;
    const biayaAdmin = 1500; // Biaya operasional gateway QRIS sistem web Rp 1.500
    const total = totalTagihan + biayaAdmin;

    // 2. Reuse sesi QRIS aktif dalam 30 menit terakhir jika ada
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await prisma.pembayaran.findFirst({
      where: {
        tagihanId: tagihan.id,
        metode: "duitku",
        status: "pending",
        createdAt: { gte: thirtyMinutesAgo },
        duitkuTransaction: {
          is: {
            paymentMethod: "SP",
            NOT: { statusCode: "02" },
          },
        },
      },
      include: { duitkuTransaction: true },
      orderBy: { id: "desc" },
    });

    if (existing?.duitkuTransaction) {
      const dt = existing.duitkuTransaction;
      let qrString: string | undefined;
      try {
        if (dt.rawResponse) {
          const parsed = JSON.parse(dt.rawResponse);
          qrString = parsed.qrString;
        }
      } catch {}

      if (qrString) {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrString)}`;
        return {
          qrString,
          qrImageUrl,
          paymentUrl: dt.paymentUrl || `https://upsheru.com/bayar-tagihan?invoice=${tagihan.id}`,
          orderId: dt.orderId,
          totalDenganAdmin: total,
          biayaAdmin,
          bulan: tagihan.bulan,
          tahun: tagihan.tahun,
        };
      }
    }

    // 3. Buat orderId acak unik untuk Duitku
    const orderId = `DW-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    const dtRes = await createPayment({
      orderId,
      amount: total,
      paymentMethod: "SP",
      productDetails: `Iuran sampah ${tagihan.bulan}/${tagihan.tahun} — ${pelanggan.nama} (termasuk biaya layanan Rp ${biayaAdmin.toLocaleString("id-ID")})`,
      customerVaName: pelanggan.nama,
      phoneNumber: pelanggan.noTelepon || undefined,
    });

    // 4. Catat transaksi pembayaran secara atomik di database
    await prisma.$transaction(async (tx) => {
      await tx.pembayaran.updateMany({
        where: {
          tagihanId: tagihan.id,
          metode: "duitku",
          status: "pending",
        },
        data: {
          status: "ditolak",
          catatan: "Digantikan sesi QRIS WhatsApp Bot baru (SP)",
        },
      });

      const p = await tx.pembayaran.create({
        data: {
          tagihanId: tagihan.id,
          pelangganId: pelanggan.id,
          jumlah: total,
          metode: "duitku",
          status: "pending",
          catatan: `Payment Gateway WhatsApp Bot QRIS (SP) — biaya layanan sistem web Rp ${biayaAdmin.toLocaleString("id-ID")}`,
        },
      });

      await tx.duitkuTransaction.create({
        data: {
          orderId,
          pembayaranId: p.id,
          paymentUrl: dtRes.paymentUrl || null,
          reference: dtRes.reference || null,
          paymentMethod: "SP",
          statusCode: "01",
          statusMessage: dtRes.statusMessage || "PROCESS",
          amount: dtRes.amount ? Number(dtRes.amount) : total,
          rawResponse: truncateRaw(dtRes),
        },
      });
    });

    if (dtRes.qrString) {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(dtRes.qrString)}`;
      return {
        qrString: dtRes.qrString,
        qrImageUrl,
        paymentUrl: dtRes.paymentUrl || `https://upsheru.com/bayar-tagihan?invoice=${tagihan.id}`,
        orderId,
        totalDenganAdmin: total,
        biayaAdmin,
        bulan: tagihan.bulan,
        tahun: tagihan.tahun,
      };
    }

    return null;
  } catch (err) {
    console.error("Gagal getOrGenerateQrisForTagihan:", err);
    return null;
  }
}
