/**
 * Logika sinkronisasi status pembayaran Duitku (dipakai callback & live-check).
 * - resultCode/statusCode "00" → pembayaran terverifikasi + tagihan lunas (satu transaksi DB).
 * - statusCode "02" (gagal/expired) → pembayaran ditandai ditolak (bisa bayar ulang).
 * Idempoten: jika pembayaran sudah final, hanya perbarui info transaksi.
 *
 * Setelah transaksi commit, auto-kirim WA konfirmasi / notifikasi gagal
 * (idempoten via sudahKirimWa — webhook retry tidak mengirim dobel).
 */
import { prisma } from "@/lib/prisma";
import {
  isSuccessStatusCode,
  isFinalFailedStatusCode,
} from "@/lib/duitku";
import {
  buildTagihanWa,
  isWaEnabled,
  kirimNotifikasi,
  kirimReportOwner,
  kirimReportPembayaranApp,
  sudahKirimWa,
  templateLaporanPembayaranOwner,
  templatePembayaranDiterima,
  templatePembayaranGagal,
} from "@/lib/wa";
import { labelMetodePembayaran } from "@/lib/invoice";

export type DuitkuResult = {
  statusCode?: string | null;
  statusMessage?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  amount?: number;
  rawResponse?: string;
};

export async function syncDuitkuPayment(
  dtId: number,
  result: DuitkuResult,
  source: "callback" | "status" = "status"
): Promise<{ changed: boolean; newStatus: string }> {
  const dt = await prisma.duitkuTransaction.findUnique({
    where: { id: dtId },
    include: { pembayaran: true },
  });
  if (!dt) {
    throw new Error("Transaksi tidak ditemukan");
  }

  const pembayaran = dt.pembayaran;
  const sudahFinal =
    pembayaran.status === "terverifikasi" || pembayaran.status === "ditolak";
  const wasVerified = pembayaran.status === "terverifikasi";

  await prisma.$transaction(async (tx) => {
    await tx.duitkuTransaction.update({
      where: { id: dt.id },
      data: {
        statusCode: result.statusCode || null,
        statusMessage: result.statusMessage || null,
        paymentMethod: result.paymentMethod || dt.paymentMethod,
        reference: result.reference || dt.reference,
        amount: result.amount ?? dt.amount,
        rawResponse: result.rawResponse || dt.rawResponse,
      },
    });

    if (isSuccessStatusCode(result.statusCode)) {
      if (pembayaran.status !== "terverifikasi") {
        await tx.pembayaran.update({
          where: { id: pembayaran.id },
          data: {
            status: "terverifikasi",
            jumlah: result.amount ?? pembayaran.jumlah,
            catatan: result.paymentMethod
              ? `Payment Gateway Via Duitku (${result.paymentMethod})`
              : "Payment Gateway Via Duitku",
          },
        });
        const tagihan = await tx.tagihan.findUnique({
          where: { id: pembayaran.tagihanId },
        });
        if (tagihan && tagihan.status !== "lunas") {
          await tx.tagihan.update({
            where: { id: tagihan.id },
            data: { status: "lunas", tanggalLunas: new Date() },
          });
        }
      }
    } else if (isFinalFailedStatusCode(result.statusCode, source) && pembayaran.status === "pending") {
      await tx.pembayaran.update({
        where: { id: pembayaran.id },
        data: {
          status: "ditolak",
          catatan: `Pembayaran Duitku ${result.statusMessage || "gagal/expired"}`,
        },
      });
    }
  });

  const newStatus = isSuccessStatusCode(result.statusCode)
    ? "terverifikasi"
    : isFinalFailedStatusCode(result.statusCode, source)
      ? "ditolak"
      : pembayaran.status;

  // Auto-kirim WA setelah transaksi commit (bukan di dalam tx — hindari lock lama).
  // Dedup via sudahKirimWa: webhook retry / live-check ganda tidak mengirim dobel.
  if (isWaEnabled()) {
    try {
      const tagihan = await prisma.tagihan.findUnique({
        where: { id: pembayaran.tagihanId },
        include: { pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } } },
      });
      if (tagihan?.pelanggan) {
        const wa = buildTagihanWa(
          {
            noInvoice: tagihan.noInvoice,
            bulan: tagihan.bulan,
            tahun: tagihan.tahun,
            jumlah: tagihan.jumlah,
            denda: tagihan.denda,
            jatuhTempo: tagihan.jatuhTempo,
          },
          tagihan.pelanggan.nama
        );
        const kataKunci = tagihan.noInvoice || `#${tagihan.id}`;
        const labelMetode = labelMetodePembayaran(dt.paymentMethod || pembayaran.metode);

        if (isSuccessStatusCode(result.statusCode) && !wasVerified) {
          if (!(await sudahKirimWa("pembayaran_diterima", tagihan.pelanggan.id, kataKunci))) {
            // 1. Kirim WA ke pelanggan (jika punya no telepon)
            if (tagihan.pelanggan.noTelepon) {
              await kirimNotifikasi({
                tipe: "pembayaran_diterima",
                ...await templatePembayaranDiterima(
                  wa,
                  labelMetode
                ),
                pelangganId: tagihan.pelanggan.id,
                noTelepon: tagihan.pelanggan.noTelepon,
              });
            }

            // 2. Kirim laporan pembayaran masuk ke Owner & Admin
            const tOwner = await templateLaporanPembayaranOwner({
              noInvoice: tagihan.noInvoice || `#${tagihan.id}`,
              namaPelanggan: tagihan.pelanggan.nama,
              kodePelanggan: tagihan.pelanggan.kodePelanggan,
              nominal: pembayaran.jumlah,
              metode: labelMetode,
              waktu: new Date(),
            });
            await kirimReportPembayaranApp({
              tipe: "laporan_pembayaran_app",
              judul: tOwner.judul,
              pesan: tOwner.pesan,
              pelangganId: tagihan.pelanggan.id,
            });
          }
        } else if (isFinalFailedStatusCode(result.statusCode, source) && pembayaran.status === "pending") {
          if (tagihan.pelanggan.noTelepon && !(await sudahKirimWa("pembayaran_gagal", tagihan.pelanggan.id, kataKunci))) {
            await kirimNotifikasi({
              tipe: "pembayaran_gagal",
              ...await templatePembayaranGagal(wa),
              pelangganId: tagihan.pelanggan.id,
              noTelepon: tagihan.pelanggan.noTelepon,
            });
          }
        }
      }
    } catch {
      // Kegagalan kirim WA tidak menggagalkan sinkronisasi pembayaran
    }
  }

  return { changed: !sudahFinal && pembayaran.status === "pending", newStatus };
}
