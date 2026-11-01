import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.tagihan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const { status, tanggalLunas, jumlah } = body;

    const session = await getSession();

    // Validasi hak akses jika mengubah nominal
    let newJumlah: number | undefined = undefined;
    if (jumlah !== undefined && jumlah !== null && String(jumlah).trim() !== "") {
      if (session && session.role !== "admin" && session.role !== "superadmin") {
        return NextResponse.json(
          { error: "Hanya Admin dan Superadmin yang berwenang mengubah nominal tagihan" },
          { status: 403 }
        );
      }
      newJumlah = parseFloat(String(jumlah));
      if (!Number.isFinite(newJumlah) || newJumlah < 0) {
        return NextResponse.json(
          { error: "Nominal tagihan harus berupa angka positif yang valid" },
          { status: 400 }
        );
      }
      if (existing.status === "lunas" && newJumlah !== existing.jumlah) {
        return NextResponse.json(
          { error: "Tidak dapat mengubah nominal tagihan yang sudah berstatus lunas" },
          { status: 400 }
        );
      }
    }

    // Validasi status — nilai tak dikenal langsung 400 (bukan 500 dari Prisma)
    const STATUS_VALID = ["belum_bayar", "lunas", "tunggakan", "dibatalkan"];
    if (status && !STATUS_VALID.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const tagihan = await prisma.$transaction(async (tx) => {
      const updated = await tx.tagihan.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(newJumlah !== undefined ? { jumlah: newJumlah } : {}),
          // tanggalLunas hanya boleh di-set/di-reset saat status lunas/berubah
          ...(status === "lunas"
            ? { tanggalLunas: tanggalLunas ? new Date(tanggalLunas) : new Date() }
            : status
              ? { tanggalLunas: null }
              : {}),
        },
      });

      // Integritas Pembukuan: Jika tagihan ditandai lunas secara manual,
      // pastikan ada record Pembayaran terverifikasi yang tercatat di kas masuk sistem
      if (status === "lunas") {
        const adaPembayaran = await tx.pembayaran.findFirst({
          where: { tagihanId: id, status: "terverifikasi" },
        });

        if (!adaPembayaran) {
          const tgl = tanggalLunas ? new Date(tanggalLunas) : new Date();
          await tx.pembayaran.create({
            data: {
              tagihanId: id,
              pelangganId: existing.pelangganId,
              jumlah: (newJumlah !== undefined ? newJumlah : existing.jumlah) + (existing.denda || 0),
              metode: "tunai",
              status: "terverifikasi",
              catatan: "Pelunasan manual oleh Admin/Kasir",
              verifiedById: session?.id ?? null,
              tanggal: tgl,
            },
          });
        }
      }

      return updated;
    });

    await logAudit(
      "update",
      "Tagihan",
      id,
      {
        status: existing.status,
        tanggalLunas: existing.tanggalLunas,
        jumlah: existing.jumlah,
        denda: existing.denda,
      },
      {
        status: tagihan.status,
        tanggalLunas: tagihan.tanggalLunas,
        jumlah: tagihan.jumlah,
      }
    );

    return NextResponse.json(tagihan);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate tagihan" }, { status: 500 });
  }
}
