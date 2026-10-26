import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  isWaEnabled,
  kirimWhatsApp,
  templateDisposisiKomplainPetugas,
} from "@/lib/wa";
import { formatTanggalWaktuIndo } from "@/lib/invoice-format";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, "kasir")) {
    return NextResponse.json(
      { error: "Forbidden — Hanya petugas/kasir/admin yang dapat meneruskan komplain" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      komplainId,
      targetPhone,
      targetName,
      catatanAdmin,
      sendViaGateway = true,
      autoUpdateStatus = true,
    } = body;

    if (!komplainId || !targetPhone) {
      return NextResponse.json(
        { error: "komplainId dan targetPhone wajib diisi" },
        { status: 400 }
      );
    }

    const id = parseInt(komplainId);
    const komplain = await prisma.komplain.findUnique({
      where: { id },
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            alamat: true,
            noTelepon: true,
            kodePelanggan: true,
            latitude: true,
            longitude: true,
            patokanLokasi: true,
            rtRw: true,
            kelurahan: { select: { nama: true } },
            wilayah: { select: { nama: true, zona: { select: { nama: true } } } },
          },
        },
      },
    });

    if (!komplain) {
      return NextResponse.json({ error: "Data komplain tidak ditemukan" }, { status: 404 });
    }

    const p = komplain.pelanggan;
    const labelJenis =
      komplain.jenis === "tidak_diangkut"
        ? "Sampah Tidak Diangkut"
        : komplain.jenis === "sampah_menumpuk"
        ? "Sampah Menumpuk"
        : "Kendala / Lainnya";

    const googleMapsUrl =
      p.latitude && p.longitude
        ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}`
        : null;

    const zonaWilayah =
      p.wilayah?.zona?.nama ||
      (p.wilayah?.nama ? `${p.wilayah.nama} (${p.kelurahan?.nama || ""})` : null) ||
      p.kelurahan?.nama ||
      p.rtRw ||
      "-";

    // Format pesan disposisi WhatsApp
    const { judul, pesan } = templateDisposisiKomplainPetugas({
      idKomplain: komplain.id,
      namaPetugas: targetName || "Petugas Lapangan",
      namaPelanggan: p.nama,
      kodePelanggan: p.kodePelanggan,
      noTeleponPelanggan: p.noTelepon,
      alamatPelanggan: p.alamat,
      patokanLokasi: p.patokanLokasi,
      zonaWilayah,
      googleMapsUrl,
      jenisKomplain: labelJenis,
      deskripsi: komplain.deskripsi,
      catatanAdmin: catatanAdmin || undefined,
      waktuKomplain: komplain.createdAt,
    });

    let statusGateway: "terkirim" | "gagal" | "skipped" = "skipped";
    let gatewayError: string | undefined;

    // Kirim langsung via Fonnte Gateway jika diminta dan gateway aktif
    if (sendViaGateway && isWaEnabled()) {
      try {
        const hasil = await kirimWhatsApp(targetPhone, pesan);
        if (hasil.ok) {
          statusGateway = "terkirim";
        } else {
          statusGateway = "gagal";
          gatewayError = hasil.error;
        }

        // Catat ke tabel Notifikasi
        await prisma.notifikasi.create({
          data: {
            tipe: "komplain_diteruskan",
            judul,
            pesan,
            penerima: targetPhone,
            status: statusGateway,
            error: gatewayError,
            dikirimPada: statusGateway === "terkirim" ? new Date() : null,
            pelangganId: p.id,
            createdById: session.id,
          },
        });
      } catch (err) {
        statusGateway = "gagal";
        gatewayError = err instanceof Error ? err.message : "Gagal kirim via gateway";
      }
    }

    // Update status komplain menjadi "diproses" jika dipilih
    let newStatus = komplain.status;
    let newTanggapan = komplain.tanggapan;
    if (autoUpdateStatus) {
      const nowStr = formatTanggalWaktuIndo(new Date());
      const catatanTanggapan = `[${nowStr}] Diteruskan ke ${targetName || targetPhone}${
        catatanAdmin ? `: "${catatanAdmin}"` : ""
      }`;

      newTanggapan = komplain.tanggapan
        ? `${komplain.tanggapan}\n${catatanTanggapan}`
        : catatanTanggapan;

      // Ubah status ke diproses jika masih baru
      if (komplain.status === "baru") {
        newStatus = "diproses";
      }

      await prisma.komplain.update({
        where: { id: komplain.id },
        data: {
          status: newStatus,
          tanggapan: newTanggapan,
        },
      });

      await logAudit(
        "update",
        "Komplain",
        komplain.id,
        { status: komplain.status, tanggapan: komplain.tanggapan },
        { status: newStatus, tanggapan: newTanggapan, diteruskanKe: targetName || targetPhone }
      );
    }

    // Link wa.me jika target adalah nomor HP individu
    let linkWaMe: string | null = null;
    if (!targetPhone.includes("@g.us")) {
      const cleanPhone = targetPhone.replace(/[^\d]/g, "").replace(/^0/, "62");
      linkWaMe = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`;
    }

    return NextResponse.json({
      ok: true,
      komplainId: komplain.id,
      pesan,
      linkWaMe,
      statusGateway,
      gatewayError,
      statusKomplain: newStatus,
      tanggapan: newTanggapan,
    });
  } catch (err) {
    console.error("[Teruskan Komplain] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses disposisi komplain" },
      { status: 500 }
    );
  }
}
