import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyKomplainToken } from "@/lib/komplain-token";
import { persistBase64Image } from "@/lib/server/media-storage";
import { isWaEnabled, kirimWhatsApp, templateUpdateKomplainPelanggan } from "@/lib/wa";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET: Mengambil detail pengaduan untuk halaman 1-Klik Driver (/k/[id]?t=[token])
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const idStr = url.searchParams.get("id");
  const token = url.searchParams.get("t");

  if (!idStr || !token) {
    return NextResponse.json(
      { error: "Parameter ID pengaduan dan token validasi wajib disertakan." },
      { status: 400 }
    );
  }

  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID pengaduan tidak valid." }, { status: 400 });
  }

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
          patokanLokasi: true,
          rtRw: true,
          latitude: true,
          longitude: true,
          kelurahan: { select: { nama: true } },
          wilayah: { select: { nama: true, zona: { select: { nama: true } } } },
        },
      },
    },
  });

  if (!komplain) {
    return NextResponse.json({ error: "Pengaduan tidak ditemukan." }, { status: 404 });
  }

  const isValidToken = verifyKomplainToken(token, komplain.id, komplain.pelangganId);
  if (!isValidToken) {
    return NextResponse.json(
      { error: "Tautan tidak valid atau telah kedaluwarsa." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    komplain: {
      id: komplain.id,
      jenis: komplain.jenis,
      deskripsi: komplain.deskripsi,
      status: komplain.status,
      tanggapan: komplain.tanggapan,
      foto: komplain.foto,
      createdAt: komplain.createdAt,
      updatedAt: komplain.updatedAt,
      pelanggan: komplain.pelanggan,
    },
  });
}

/**
 * POST: Menandai pengaduan selesai oleh Driver (1-Klik Tanpa Perlu Login)
 * Otomatis memperbarui database dan mengirimkan pesan konfirmasi WA resmi ke pelanggan.
 */
export async function POST(request: Request) {
  // Rate limit proteksi per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `komplain-selesai:${ip}`;
  if (!(await allowAttempt(key))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Silakan coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "number" ? body.id : parseInt(String(body.id), 10);
    const token = String(body.token || body.t || "").trim();
    const catatan = body.catatan && typeof body.catatan === "string" ? body.catatan.trim() : null;
    const fotoBukti = body.fotoBukti && typeof body.fotoBukti === "string" ? body.fotoBukti : null;

    if (!id || isNaN(id) || !token) {
      return NextResponse.json(
        { error: "ID pengaduan dan token verifikasi wajib diisi." },
        { status: 400 }
      );
    }

    const komplain = await prisma.komplain.findUnique({
      where: { id },
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

    if (!komplain) {
      return NextResponse.json({ error: "Data pengaduan tidak ditemukan." }, { status: 404 });
    }

    const isValidToken = verifyKomplainToken(token, komplain.id, komplain.pelangganId);
    if (!isValidToken) {
      return NextResponse.json(
        { error: "Tautan tidak valid atau token otorisasi penjemputan salah." },
        { status: 403 }
      );
    }

    // Jika komplain sudah selesai sebelumnya
    if (komplain.status === "selesai") {
      return NextResponse.json({
        ok: true,
        sudahSelesai: true,
        message: "Laporan penjemputan sampah ini sudah tercatat selesai sebelumnya.",
        komplain: {
          id: komplain.id,
          status: komplain.status,
          tanggapan: komplain.tanggapan,
        },
      });
    }

    let savedFoto = komplain.foto;
    if (fotoBukti) {
      const persisted = await persistBase64Image(fotoBukti, "komplain");
      if (persisted) savedFoto = persisted;
    }

    const tanggapanFinal =
      catatan ||
      "Sampah telah selesai dijemput oleh armada lapangan. Terima kasih atas laporannya.";

    const updated = await prisma.komplain.update({
      where: { id: komplain.id },
      data: {
        status: "selesai",
        tanggapan: tanggapanFinal,
        foto: savedFoto,
      },
    });

    // Otomatis kirim konfirmasi WA ke warga pelapor
    let notifWargaTerkirim = false;
    if (isWaEnabled() && komplain.pelanggan.noTelepon) {
      try {
        const pesanWa = templateUpdateKomplainPelanggan({
          tiketId: komplain.id,
          namaPelanggan: komplain.pelanggan.nama,
          status: "selesai",
          tanggapan: tanggapanFinal,
        });

        const hasilWa = await kirimWhatsApp(komplain.pelanggan.noTelepon, pesanWa);
        if (hasilWa.ok) {
          notifWargaTerkirim = true;
        }

        await prisma.notifikasi.create({
          data: {
            tipe: "komplain_selesai",
            judul: `Konfirmasi Penjemputan Sampah #KMP-${komplain.id}`,
            pesan: pesanWa,
            penerima: komplain.pelanggan.noTelepon,
            status: hasilWa.ok ? "terkirim" : "gagal",
            error: hasilWa.error,
            dikirimPada: hasilWa.ok ? new Date() : null,
            pelangganId: komplain.pelanggan.id,
            tenantId: komplain.tenantId,
          },
        });
      } catch (errWa) {
        console.error("[Komplain Selesai] Gagal kirim WA ke pelanggan:", errWa);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Pengaduan berhasil diselesaikan! Konfirmasi telah dikirimkan ke WhatsApp warga.",
      notifWargaTerkirim,
      komplain: {
        id: updated.id,
        status: updated.status,
        tanggapan: updated.tanggapan,
      },
    });
  } catch (error) {
    console.error("[Komplain Selesai] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat menyelesaikan pengaduan." },
      { status: 500 }
    );
  }
}
