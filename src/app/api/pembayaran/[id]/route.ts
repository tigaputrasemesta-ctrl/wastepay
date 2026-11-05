import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import {
  buildTagihanWa,
  isWaEnabled,
  kirimNotifikasi,
  kirimReportOwner,
  sudahKirimWa,
  templateLaporanPembayaranOwner,
  templatePembayaranDiterima,
  templatePembayaranGagal,
} from "@/lib/wa";
import { hitungRincian, labelMetodePembayaran } from "@/lib/invoice";
import { requireRole } from "@/lib/server-rbac";

class PaymentConflictError extends Error {}

type Params = { params: Promise<{ id: string }> };

/**
 * Ambil detail pembayaran beserta bukti bayar jika ada.
 * GET /api/pembayaran/[id]
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "ID pembayaran tidak valid" }, { status: 400 });
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: numId },
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            kodePelanggan: true,
            noTelepon: true,
            alamat: true,
            kelurahanId: true,
          },
        },
        tagihan: {
          select: {
            id: true,
            noInvoice: true,
            bulan: true,
            tahun: true,
            jumlah: true,
            denda: true,
            status: true,
          },
        },
        verifiedBy: { select: { id: true, nama: true, role: true } },
      },
    });

    if (!pembayaran) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    // Petugas scope check
    if (session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
      const kelurahanId = await getPetugasKelurahan(session.id);
      if (!kelurahanId || pembayaran.pelanggan.kelurahanId !== kelurahanId) {
        return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
      }
    }

    return NextResponse.json(pembayaran);
  } catch (error) {
    console.error("Gagal mengambil detail pembayaran:", error);
    return NextResponse.json({ error: "Gagal mengambil data pembayaran" }, { status: 500 });
  }
}

/**
 * Verifikasi/tolak pembayaran non-tunai (pending).
 * PUT  /api/pembayaran/[id]  { status: "terverifikasi" | "ditolak", catatan? }
 * DELETE /api/pembayaran/[id] — hapus pembayaran & batalkan status lunas jika perlu
 */
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) return auth;
  const session = auth.user;
  try {
    const { id } = await params;
    const { status, catatan } = await request.json();

    if (!["terverifikasi", "ditolak"].includes(status)) {
      return NextResponse.json(
        { error: "Status harus terverifikasi atau ditolak" },
        { status: 400 }
      );
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: parseInt(id) },
      include: { pelanggan: { select: { kelurahanId: true } } },
    });
    if (!pembayaran) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    if (pembayaran.status !== "pending") {
      return NextResponse.json(
        { error: `Pembayaran sudah ${pembayaran.status}` },
        { status: 400 }
      );
    }

    // Pembayaran payment gateway (Duitku) diverifikasi otomatis via callback/live-check,
    // bukan manual — cegah selisih kas karena verifikasi sebelum settlement.
    // Penolakan/pembatalan manual ("ditolak") diizinkan agar admin dapat membatalkan checkout yang ditinggalkan.
    if (pembayaran.metode.startsWith("duitku") && status === "terverifikasi") {
      return NextResponse.json(
        { error: "Pembayaran gateway diverifikasi otomatis oleh sistem — gunakan Cek Status Live" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (status === "terverifikasi") {
        // Claim invoice first. Concurrent approvals serialize on this row;
        // a second payment must not become verified for an already-paid invoice.
        const claimed = await tx.tagihan.updateMany({
          where: {
            id: pembayaran.tagihanId,
            status: { in: ["belum_bayar", "tunggakan"] },
            deletedAt: null,
          },
          data: { status: "lunas", tanggalLunas: new Date() },
        });
        if (claimed.count !== 1) {
          throw new PaymentConflictError("Tagihan sudah lunas, dibatalkan, atau dihapus");
        }
        const tagihan = await tx.tagihan.findUniqueOrThrow({ where: { id: pembayaran.tagihanId } });
        if (!Number.isFinite(pembayaran.jumlah) ||
            pembayaran.jumlah < hitungRincian(tagihan.jumlah, tagihan.denda).total) {
          throw new PaymentConflictError("Nominal pembayaran tidak memenuhi tagihan terbaru");
        }
      }

      const claimedPayment = await tx.pembayaran.updateMany({
        where: { id: pembayaran.id, status: "pending" },
        data: {
          status,
          catatan: catatan || pembayaran.catatan,
          verifiedById: session.id,
        },
      });
      if (claimedPayment.count !== 1) {
        throw new PaymentConflictError("Pembayaran sudah diproses; muat ulang data");
      }
      return tx.pembayaran.findUniqueOrThrow({ where: { id: pembayaran.id } });
    });

    await logAudit(
      "update",
      "Pembayaran",
      pembayaran.id,
      {
        status: pembayaran.status,
        jumlah: pembayaran.jumlah,
        metode: pembayaran.metode,
        tagihanId: pembayaran.tagihanId,
        pelangganId: pembayaran.pelangganId,
        catatan: pembayaran.catatan,
      },
      {
        status,
        catatan: catatan || pembayaran.catatan,
        verifiedById: session?.id ?? null,
      }
    );

    // Auto-kirim WA konfirmasi ke pelanggan saat pembayaran diproses (skylite pattern)
    // dan laporan pembayaran masuk ke Owner & Admin
    if ((status === "terverifikasi" || status === "ditolak") && isWaEnabled()) {
      try {
        const tagihan = await prisma.tagihan.findUnique({
          where: { id: pembayaran.tagihanId },
          include: { pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } } },
        });
        if (tagihan?.pelanggan) {
          const tWa = buildTagihanWa(
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
          
          const labelMetode = labelMetodePembayaran(pembayaran.metode);

          if (tagihan.pelanggan.noTelepon) {
            if (status === "terverifikasi") {
              const templateData = await templatePembayaranDiterima(tWa, labelMetode);
              await kirimNotifikasi({
                tipe: "pembayaran_diterima",
                ...templateData,
                pelangganId: tagihan.pelanggan.id,
                noTelepon: tagihan.pelanggan.noTelepon,
              });
            } else if (status === "ditolak" && tagihan.status !== "lunas") {
              // Jangan kirim notifikasi pembayaran gagal jika tagihan sebenarnya sudah LUNAS (misal dibayar via metode lain)
              const kataKunci = tagihan.noInvoice || `#${tagihan.id}`;
              if (!(await sudahKirimWa("pembayaran_gagal", tagihan.pelanggan.id, kataKunci))) {
                const templateData = await templatePembayaranGagal(tWa);
                await kirimNotifikasi({
                  tipe: "pembayaran_gagal",
                  ...templateData,
                  pelangganId: tagihan.pelanggan.id,
                  noTelepon: tagihan.pelanggan.noTelepon,
                });
              }
            }
          }

          // Jika status terverifikasi, kirim laporan ke Owner & Admin
          if (status === "terverifikasi") {
            const tOwner = await templateLaporanPembayaranOwner({
              noInvoice: tagihan.noInvoice || `#${tagihan.id}`,
              namaPelanggan: tagihan.pelanggan.nama,
              kodePelanggan: tagihan.pelanggan.kodePelanggan,
              nominal: pembayaran.jumlah,
              metode: labelMetode,
              waktu: new Date(),
              keterangan: catatan || pembayaran.catatan || undefined,
            });
            await kirimReportOwner({
              tipe: "laporan_pembayaran_owner",
              judul: tOwner.judul,
              pesan: tOwner.pesan,
              pelangganId: tagihan.pelanggan.id,
            });
          }
        }
      } catch {
        // Kegagalan kirim WA tidak menggagalkan verifikasi
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Gagal memproses pembayaran" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: parseInt(id) },
    });
    if (!pembayaran) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    // Jangan izinkan hapus pembayaran gateway (Duitku) yang sudah terverifikasi:
    // uang sudah settle di merchant — menghapusnya bikin selisih kas tanpa reversal.
    if (pembayaran.metode.startsWith("duitku") && pembayaran.status === "terverifikasi") {
      return NextResponse.json(
        { error: "Pembayaran gateway yang sudah terverifikasi tidak bisa dihapus — hubungi admin untuk reversal" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.pembayaran.delete({ where: { id: pembayaran.id } });

      // Jika ini pembayaran terakhir yang melunasi tagihan, kembalikan status tagihan
      if (pembayaran.status === "terverifikasi") {
        const lain = await tx.pembayaran.count({
          where: { tagihanId: pembayaran.tagihanId, status: "terverifikasi" },
        });
        if (lain === 0) {
          await tx.tagihan.update({
            where: { id: pembayaran.tagihanId },
            data: { status: "belum_bayar", tanggalLunas: null },
          });
        }
      }
    });

    await logAudit(
      "delete",
      "Pembayaran",
      pembayaran.id,
      {
        id: pembayaran.id,
        status: pembayaran.status,
        jumlah: pembayaran.jumlah,
        metode: pembayaran.metode,
        tagihanId: pembayaran.tagihanId,
        pelangganId: pembayaran.pelangganId,
        tanggal: pembayaran.tanggal,
        createdAt: pembayaran.createdAt,
      },
      undefined
    );

    return NextResponse.json({ message: "Pembayaran dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pembayaran" }, { status: 500 });
  }
}
