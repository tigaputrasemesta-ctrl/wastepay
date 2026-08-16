import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import {
  buildTagihanWa,
  isWaEnabled,
  kirimNotifikasi,
  templatePembayaranDiterima,
} from "@/lib/wa";
import { labelMetodePembayaran } from "@/lib/invoice";

type Params = { params: Promise<{ id: string }> };

/**
 * Verifikasi/tolak pembayaran non-tunai (pending).
 * PUT  /api/pembayaran/[id]  { status: "terverifikasi" | "ditolak", catatan? }
 * DELETE /api/pembayaran/[id] — hapus pembayaran & batalkan status lunas jika perlu
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { status, catatan } = await request.json();

    if (!["terverifikasi", "ditolak"].includes(status)) {
      return NextResponse.json(
        { error: "Status harus terverifikasi atau ditolak" },
        { status: 400 }
      );
    }

    // Petugas boleh verifikasi hanya jika jabatan tagih
    const session = await getSession();
    if (session && session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { jabatan: true },
      });
      if (!(profil?.jabatan || "").split(",").includes("tagih")) {
        return NextResponse.json(
          { error: "Jabatan Anda tidak berwenang memverifikasi pembayaran" },
          { status: 403 }
        );
      }
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: parseInt(id) },
      include: { pelanggan: { select: { kelurahanId: true } } },
    });
    if (!pembayaran) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    // Petugas tagih hanya boleh memverifikasi pembayaran pelanggan di kelurahannya sendiri
    // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
    if (session && session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
      const kelurahanId = await getPetugasKelurahan(session.id);
      if (!kelurahanId || pembayaran.pelanggan.kelurahanId !== kelurahanId) {
        return NextResponse.json(
          { error: "Pelanggan di luar wilayah Anda" },
          { status: 403 }
        );
      }
    }
    if (pembayaran.status !== "pending") {
      return NextResponse.json(
        { error: `Pembayaran sudah ${pembayaran.status}` },
        { status: 400 }
      );
    }

    // Pembayaran payment gateway (Duitku) diverifikasi otomatis via callback/live-check,
    // bukan manual — cegah selisih kas karena verifikasi sebelum settlement.
    if (pembayaran.metode.startsWith("duitku")) {
      return NextResponse.json(
        { error: "Pembayaran gateway diverifikasi otomatis oleh sistem — gunakan Cek Status Live" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.pembayaran.update({
        where: { id: pembayaran.id },
        data: {
          status,
          catatan: catatan || pembayaran.catatan,
          // Siapa yang memverifikasi
          verifiedById: session?.id ?? null,
        },
      });

      if (status === "terverifikasi") {
        // Tagihan hanya lunas jika pembayaran yang memenuhi syarat
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

      return updated;
    });

    await logAudit("update", "Pembayaran", pembayaran.id, { status: pembayaran.status }, { status });

    // Auto-kirim WA konfirmasi ke pelanggan saat pembayaran terverifikasi (skylite pattern)
    if (status === "terverifikasi" && isWaEnabled()) {
      try {
        const tagihan = await prisma.tagihan.findUnique({
          where: { id: pembayaran.tagihanId },
          include: { pelanggan: { select: { id: true, nama: true, noTelepon: true } } },
        });
        if (tagihan?.pelanggan.noTelepon) {
          await kirimNotifikasi({
            tipe: "pembayaran_diterima",
            ...templatePembayaranDiterima(
              buildTagihanWa(
                {
                  noInvoice: tagihan.noInvoice,
                  bulan: tagihan.bulan,
                  tahun: tagihan.tahun,
                  jumlah: tagihan.jumlah,
                  denda: tagihan.denda,
                  jatuhTempo: tagihan.jatuhTempo,
                },
                tagihan.pelanggan.nama
              ),
              labelMetodePembayaran(pembayaran.metode)
            ),
            pelangganId: tagihan.pelanggan.id,
            noTelepon: tagihan.pelanggan.noTelepon,
          });
        }
      } catch {
        // Kegagalan kirim WA tidak menggagalkan verifikasi
      }
    }

    return NextResponse.json(result);
  } catch {
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

    await logAudit("delete", "Pembayaran", pembayaran.id, { status: pembayaran.status }, undefined);

    return NextResponse.json({ message: "Pembayaran dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pembayaran" }, { status: 500 });
  }
}
