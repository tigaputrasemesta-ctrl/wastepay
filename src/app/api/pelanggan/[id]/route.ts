import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import { generateNoInvoice } from "@/lib/invoice";
import { hitungJatuhTempoKonsumen } from "@/lib/tagihan";
import { tetapkanJadwalDanPetugasPelanggan } from "@/lib/penugasan-jadwal";
import { kirimNotifikasi, templatePendaftaranDisetujui } from "@/lib/wa";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseInt((await params).id);
  const pelanggan = await prisma.pelanggan.findUnique({
    where: { id },
    include: {
      wilayah: {
        include: {
          zona: { select: { id: true, nama: true, warna: true, keterangan: true } },
        },
      },
      kelurahan: true,
      paket: true,
      jadwal: {
        where: { aktif: true },
        include: { rute: { include: { petugas: true } } },
      },
      tagihan: { orderBy: [{ tahun: "desc" }, { bulan: "desc" }], take: 12 },
      pembayaran: { orderBy: { createdAt: "desc" }, take: 12 },
      pengangkutan: { orderBy: { tanggal: "desc" }, take: 20 },
      komplain: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!pelanggan) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }

  // Scope kelurahan: petugas hanya boleh melihat pelanggan di kelurahannya sendiri
  // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
  const session = await getSession();
  if (session && session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    const kelurahanId = await getPetugasKelurahan(session.id);
    // 404 (bukan 403) agar tidak membocorkan keberadaan pelanggan (anti-enumerasi).
    if (!kelurahanId || pelanggan.kelurahanId !== kelurahanId) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }
  }

  return NextResponse.json(pelanggan);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, noTelepon, kategori, alamat, rtRw, fotoRumah, patokanLokasi, latitude, longitude, koordinatSumber, koordinatAkurasi, penanggungjawab, referal, kelurahanId, paketId, status, catatan } = body;

    // Petugas (role petugas) hanya boleh melalui jabatan survei,
    // hanya mengubah field survei — bukan data keuangan/sebarang,
    // dan hanya untuk pelanggan di wilayahnya sendiri.
    const session = await getSession();
    if (session && session.role === "petugas") {
      const profil = await prisma.petugas.findUnique({
        where: { userId: session.id },
        select: { jabatan: true },
      });
      if (!profil) {
        return NextResponse.json(
          { error: "Akun belum ter-link ke profil petugas" },
          { status: 403 }
        );
      }
      if (!(profil.jabatan || "").split(",").includes("survei")) {
        return NextResponse.json(
          { error: "Jabatan Anda tidak berwenang mengubah data pelanggan" },
          { status: 403 }
        );
      }
      // Petugas survei hanya boleh mengubah pelanggan di KELURAHAN-nya sendiri
      // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
      if (!PETUGAS_SCOPE_ALL) {
        const kelurahanId = await getPetugasKelurahan(session.id);
        const target = await prisma.pelanggan.findUnique({
          where: { id },
          select: { kelurahanId: true },
        });
        if (!target) {
          return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
        }
        if (!kelurahanId || target.kelurahanId !== kelurahanId) {
          return NextResponse.json(
            { error: "Pelanggan di luar wilayah Anda" },
            { status: 403 }
          );
        }
      }
      // Whitelist: petugas survei hanya boleh menyentuh field survei + aktivasi.
      // kelurahanId TIDAK termasuk — pindah kelurahan hanya wewenang admin.
      const fieldSurvei: Record<string, unknown> = {};
      if (fotoRumah !== undefined) fieldSurvei.fotoRumah = fotoRumah;
      if (patokanLokasi !== undefined) fieldSurvei.patokanLokasi = patokanLokasi;
      if (latitude !== undefined) fieldSurvei.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) fieldSurvei.longitude = longitude ? parseFloat(longitude) : null;
      if (koordinatSumber !== undefined) fieldSurvei.koordinatSumber = koordinatSumber || null;
      if (koordinatAkurasi !== undefined) fieldSurvei.koordinatAkurasi = koordinatAkurasi ? parseFloat(koordinatAkurasi) : null;
      if (alamat !== undefined) fieldSurvei.alamat = alamat;
      if (rtRw !== undefined) fieldSurvei.rtRw = rtRw;
      if (noTelepon !== undefined) fieldSurvei.noTelepon = noTelepon;
      if (penanggungjawab !== undefined) fieldSurvei.penanggungjawab = penanggungjawab;
      if (referal !== undefined) fieldSurvei.referal = referal;
      if (catatan !== undefined) fieldSurvei.catatan = catatan;
      // Petugas lapangan / referral DILARANG mengaktifkan pelanggan!
      // Status aktivasi dan penentuan zona mutlak hak Admin Pusat.

      const hasil = await prisma.pelanggan.update({
        where: { id },
        data: fieldSurvei,
        include: { wilayah: true, paket: true },
      });
      await logAudit("update", "Pelanggan", id, { id }, { nama: hasil.nama, status: hasil.status, sumber: "survei_petugas" });
      return NextResponse.json(hasil);
    }

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (noTelepon !== undefined) data.noTelepon = noTelepon;
    if (kategori !== undefined) data.kategori = kategori;
    if (alamat !== undefined) data.alamat = alamat;
    if (rtRw !== undefined) data.rtRw = rtRw;
    if (fotoRumah !== undefined) data.fotoRumah = fotoRumah;
    if (patokanLokasi !== undefined) data.patokanLokasi = patokanLokasi;
    if (latitude !== undefined) data.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) data.longitude = longitude ? parseFloat(longitude) : null;
    if (koordinatSumber !== undefined) data.koordinatSumber = koordinatSumber || null;
    if (koordinatAkurasi !== undefined) data.koordinatAkurasi = koordinatAkurasi ? parseFloat(koordinatAkurasi) : null;
    if (penanggungjawab !== undefined) data.penanggungjawab = penanggungjawab;
    if (referal !== undefined) data.referal = referal;
    if (body.customTarif !== undefined) data.customTarif = body.customTarif ? parseFloat(body.customTarif) : null;
    if (body.createdAt !== undefined) data.createdAt = body.createdAt ? new Date(body.createdAt) : undefined;
    if (status !== undefined) data.status = status;
    if (catatan !== undefined) data.catatan = catatan;
    if (kelurahanId !== undefined) {
      data.kelurahanId = kelurahanId ? parseInt(kelurahanId) : null;
    }
    if (body.wilayahId !== undefined) {
      data.wilayahId = body.wilayahId ? parseInt(body.wilayahId) : null;
    }
    if (paketId !== undefined) data.paketId = paketId ? parseInt(paketId) : null;

    // Penentuan Zona Area Pickup oleh Admin Pusat
    if (body.zonaId) {
      const zid = parseInt(body.zonaId);
      const currentPel = await prisma.pelanggan.findUnique({
        where: { id },
        select: { wilayahId: true, kelurahanId: true, rtRw: true },
      });
      const targetWId = data.wilayahId !== undefined ? (data.wilayahId as number | null) : currentPel?.wilayahId;

      if (targetWId) {
        // Hubungkan wilayah yang sudah ada ke zona ini
        await prisma.wilayah.update({
          where: { id: targetWId },
          data: { zonaId: zid },
        });
        data.wilayahId = targetWId;
      } else {
        const targetKel = (data.kelurahanId as number | null) ?? currentPel?.kelurahanId;
        if (targetKel) {
          let w = await prisma.wilayah.findFirst({
            where: { kelurahanId: targetKel, zonaId: zid },
          });
          if (!w) {
            const zona = await prisma.zona.findUnique({ where: { id: zid }, select: { nama: true } });
            w = await prisma.wilayah.create({
              data: {
                nama: currentPel?.rtRw ? `RT/RW ${currentPel.rtRw}` : (zona?.nama || `Zona ${zid}`),
                kelurahanId: targetKel,
                zonaId: zid,
              },
            });
          }
          data.wilayahId = w.id;
        }
      }
    }

    // Penugasan Petugas Pickup, Rute Armada, dan Jadwal Pengangkutan (bisa memilih lebih dari 1 hari)
    if (body.ruteId || body.petugasId || body.hari || body.jadwalHari) {
      await tetapkanJadwalDanPetugasPelanggan({
        pelangganId: id,
        kelurahanId: data.kelurahanId !== undefined ? (data.kelurahanId as number | null) : null,
        zonaId: body.zonaId ? parseInt(body.zonaId) : null,
        petugasId: body.petugasId ? parseInt(body.petugasId) : null,
        ruteId: body.ruteId ? parseInt(body.ruteId) : null,
        hari: body.hari || body.jadwalHari,
        jam: body.jam,
      });
    }

    const oldPel = await prisma.pelanggan.findUnique({
      where: { id },
      select: { status: true },
    });

    const pelanggan = await prisma.pelanggan.update({
      where: { id },
      data,
      include: {
        wilayah: { include: { zona: true } },
        kelurahan: true,
        paket: true,
        jadwal: {
          where: { aktif: true },
          include: { rute: { include: { petugas: true } } },
        },
      },
    });

    // Jika status diubah menjadi aktif (approval oleh admin pusat)
    if (data.status === "aktif" && oldPel?.status === "calon") {
      // 1. Auto-generate tagihan perdana
      try {
        const now = new Date();
        const bulan = now.getMonth() + 1;
        const tahun = now.getFullYear();

        const existingTagihan = await prisma.tagihan.findUnique({
          where: { pelangganId_bulan_tahun: { pelangganId: pelanggan.id, bulan, tahun } },
        });

        if (!existingTagihan) {
          let tarif = pelanggan.customTarif;
          if (!tarif && pelanggan.paket) {
            tarif = pelanggan.paket.harga;
          }
          if (!tarif) {
            const kategoriTarif = await prisma.kategoriTarif.findUnique({
              where: { kategori: pelanggan.kategori },
            });
            tarif = kategoriTarif?.tarif ?? 0;
          }

          const tagihanPerdana = await prisma.tagihan.create({
            data: {
              pelangganId: pelanggan.id,
              bulan,
              tahun,
              jumlah: tarif,
              status: "belum_bayar",
              jatuhTempo: hitungJatuhTempoKonsumen(pelanggan.createdAt, bulan, tahun),
              keterangan: `Tagihan perdana (Approval Admin Pusat)`,
              noInvoice: generateNoInvoice(pelanggan.kodePelanggan, bulan, tahun),
            },
          });

          // Send WA notification for the first bill
          if (pelanggan.noTelepon) {
            const { kirimNotifikasi, buildTagihanWa, templateTagihanBaru } = await import("@/lib/wa");
            const tagihanWa = buildTagihanWa(
              {
                ...tagihanPerdana,
                kodePelanggan: pelanggan.kodePelanggan,
                paket: pelanggan.paket?.nama || undefined,
              },
              pelanggan.nama
            );
            const tmpl = templateTagihanBaru(tagihanWa);
            // Customize the title and message slightly to welcome them
            tmpl.judul = `Pendaftaran Disetujui & Tagihan Perdana — ${tagihanWa.periode}`;
            tmpl.pesan = `*PENDAFTARAN DISETUJUI ✅*\n\nHalo ${pelanggan.nama}, pendaftaran layanan pengangkutan sampah Anda telah disetujui.\n\n` + tmpl.pesan;

            await kirimNotifikasi({
              tipe: "tagihan_baru",
              judul: tmpl.judul,
              pesan: tmpl.pesan,
              pelangganId: pelanggan.id,
              noTelepon: pelanggan.noTelepon,
            });
          }
        }
      } catch (errTagihan) {
        console.error("Gagal auto-generate tagihan approval:", errTagihan);
      }

      // 2. Kirim Notifikasi WhatsApp Approval
      try {
        const tDisetujui = templatePendaftaranDisetujui(pelanggan.nama, pelanggan.kodePelanggan);
        await kirimNotifikasi({
          tipe: "approval",
          judul: tDisetujui.judul,
          pesan: tDisetujui.pesan,
          noTelepon: pelanggan.noTelepon,
          pelangganId: pelanggan.id,
        });
      } catch (errWa) {
        console.error("Gagal kirim WA approval:", errWa);
      }
    }

    await logAudit("update", "Pelanggan", id, { id }, { nama: pelanggan.nama, status: pelanggan.status });

    return NextResponse.json(pelanggan);
  } catch (err) {
    console.error("PUT /api/pelanggan/[id] error:", err);
    return NextResponse.json({ error: "Gagal mengupdate pelanggan" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    // Soft delete — pertahankan riwayat tagihan/pembayaran
    const pelanggan = await prisma.pelanggan.findUnique({ where: { id }, select: { nama: true } });
    await prisma.pelanggan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logAudit("delete", "Pelanggan", id, { nama: pelanggan?.nama }, undefined);
    return NextResponse.json({ message: "Pelanggan berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pelanggan" }, { status: 500 });
  }
}
