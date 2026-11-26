import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import { generateNoInvoice } from "@/lib/invoice";
import { hitungJatuhTempoKonsumen } from "@/lib/tagihan";
import { tetapkanJadwalDanPetugasPelanggan } from "@/lib/penugasan-jadwal";
import { kirimNotifikasi, templatePendaftaranDisetujui } from "@/lib/wa";
import { ensureArmadaRuteSchema, ensureKolektifSchema } from "@/lib/db-patch";
import { persistBase64Image } from "@/lib/server/media-storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureArmadaRuteSchema();
  await ensureKolektifSchema();
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
      indukKolektif: {
        select: { id: true, nama: true, noTelepon: true, kodePelanggan: true, namaGrupKolektif: true },
      },
      anggotaKolektif: {
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          kodePelanggan: true,
          alamat: true,
          status: true,
          customTarif: true,
        },
      },
      jadwal: {
        where: { aktif: true },
        include: { rute: { include: { kendaraan: true, petugas: { omit: { trackingToken: true } } } } },
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

  const session = await getSession();
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const { resolveTenantByHost } = await import("@/lib/tenant");
  const tenantCtx = resolveTenantByHost(rawHost);
  const currentTenantId = session?.tenantId || tenantCtx.tenant.id;
  const recordTenantId = pelanggan.tenantId ?? "tenant-pilot-upsheru";
  if (session && session.role !== "superadmin" && !tenantCtx.isCore && recordTenantId !== currentTenantId) {
    return NextResponse.json({ error: "Forbidden: Pelanggan bukan milik organisasi tenant Anda" }, { status: 403 });
  }

  // Scope kelurahan: petugas hanya boleh melihat pelanggan di kelurahannya sendiri
  // (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
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
    const {
      nama,
      noTelepon,
      kodePelanggan,
      syncKodePelanggan,
      kategori,
      alamat,
      rtRw,
      fotoRumah,
      patokanLokasi,
      latitude,
      longitude,
      koordinatSumber,
      koordinatAkurasi,
      penanggungjawab,
      referal,
      kelurahanId,
      paketId,
      status,
      catatan,
    } = body;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const { resolveTenantByHost } = await import("@/lib/tenant");
    const tenantCtx = resolveTenantByHost(rawHost);
    const currentTenantId = session.tenantId || tenantCtx.tenant.id;
    const targetPelanggan = await prisma.pelanggan.findUnique({ where: { id } });
    if (!targetPelanggan) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }
    const recordTenantId = targetPelanggan.tenantId ?? "tenant-pilot-upsheru";
    if (session.role !== "superadmin" && !tenantCtx.isCore && recordTenantId !== currentTenantId) {
      return NextResponse.json({ error: "Forbidden: Pelanggan bukan milik organisasi tenant Anda" }, { status: 403 });
    }

    // Normalisasi dan deteksi perubahan No. Telepon / WhatsApp & Kode Pelanggan
    let newPhone: string | undefined = undefined;
    if (noTelepon !== undefined) {
      newPhone = String(noTelepon).trim();
    }

    let newKode: string | undefined = undefined;
    if (kodePelanggan !== undefined && String(kodePelanggan).trim() !== "") {
      newKode = String(kodePelanggan).trim();
    }

    // Deteksi apakah kode pelanggan saat ini berbasis nomor telepon (misal: sama persis, selisih prefix, atau numeric)
    const oldKodeIsPhone = Boolean(
      targetPelanggan.kodePelanggan &&
      (targetPelanggan.kodePelanggan === targetPelanggan.noTelepon ||
       targetPelanggan.kodePelanggan.replace(/\D/g, "") === (targetPelanggan.noTelepon || "").replace(/\D/g, "") ||
       /^(08|628|\+628|\d{9,15})$/.test(targetPelanggan.kodePelanggan.trim()))
    );

    // Sinkronkan kode pelanggan jika:
    // a) syncKodePelanggan secara eksplisit bernilai true
    // b) syncKodePelanggan tidak diset, tapi nomor telepon diubah dan kode pelanggan lama berbasis nomor telepon
    const shouldSyncKode = syncKodePelanggan === true || (syncKodePelanggan === undefined && oldKodeIsPhone);

    if (newPhone !== undefined && newPhone !== targetPelanggan.noTelepon) {
      // Cek apakah nomor telepon baru sudah dipakai oleh pelanggan lain
      const conflictPhone = await prisma.pelanggan.findFirst({
        where: {
          id: { not: id },
          deletedAt: null,
          noTelepon: newPhone,
        },
        select: { id: true, nama: true },
      });
      if (conflictPhone) {
        return NextResponse.json(
          { error: `Nomor WhatsApp ${newPhone} sudah digunakan oleh pelanggan "${conflictPhone.nama}".` },
          { status: 400 }
        );
      }

      if (shouldSyncKode && !newKode) {
        newKode = newPhone;
      }
    }

    if (newKode !== undefined && newKode !== targetPelanggan.kodePelanggan) {
      // Cek apakah kode pelanggan baru sudah dipakai oleh pelanggan lain
      const conflictKode = await prisma.pelanggan.findFirst({
        where: {
          id: { not: id },
          deletedAt: null,
          kodePelanggan: newKode,
        },
        select: { id: true, nama: true },
      });
      if (conflictKode) {
        return NextResponse.json(
          { error: `Kode Pelanggan ${newKode} sudah digunakan oleh pelanggan "${conflictKode.nama}".` },
          { status: 400 }
        );
      }
    }

    // Petugas (role petugas) hanya boleh melalui jabatan survei,
    // hanya mengubah field survei — bukan data keuangan/sebarang,
    // dan hanya untuk pelanggan di wilayahnya sendiri.
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
      if (fotoRumah !== undefined && !fotoRumah.startsWith("/api/pelanggan/")) {
        fieldSurvei.fotoRumah = await persistBase64Image(fotoRumah, "pelanggan", currentTenantId);
      }
      if (patokanLokasi !== undefined) fieldSurvei.patokanLokasi = patokanLokasi;
      if (latitude !== undefined) fieldSurvei.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) fieldSurvei.longitude = longitude ? parseFloat(longitude) : null;
      if (koordinatSumber !== undefined) fieldSurvei.koordinatSumber = koordinatSumber || null;
      if (koordinatAkurasi !== undefined) fieldSurvei.koordinatAkurasi = koordinatAkurasi ? parseFloat(koordinatAkurasi) : null;
      if (alamat !== undefined) fieldSurvei.alamat = alamat;
      if (rtRw !== undefined) fieldSurvei.rtRw = rtRw;
      if (newPhone !== undefined) fieldSurvei.noTelepon = newPhone;
      if (newKode !== undefined) fieldSurvei.kodePelanggan = newKode;
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
    if (!targetPelanggan.tenantId) {
      data.tenantId = recordTenantId;
    }
    if (nama !== undefined) data.nama = nama;
    if (newPhone !== undefined) data.noTelepon = newPhone;
    if (newKode !== undefined) data.kodePelanggan = newKode;
    if (kategori !== undefined) data.kategori = kategori;
    if (alamat !== undefined) data.alamat = alamat;
    if (rtRw !== undefined) data.rtRw = rtRw;
    if (fotoRumah !== undefined && !fotoRumah.startsWith("/api/pelanggan/")) {
      data.fotoRumah = await persistBase64Image(fotoRumah, "pelanggan", currentTenantId);
    }
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
    if (body.skemaBayar !== undefined) data.skemaBayar = body.skemaBayar;
    if (body.indukKolektifId !== undefined) data.indukKolektifId = body.indukKolektifId ? parseInt(body.indukKolektifId) : null;
    if (body.namaGrupKolektif !== undefined) data.namaGrupKolektif = body.namaGrupKolektif || null;

    // Penentuan Zona Area Pickup oleh Admin Pusat (dengan auto-resolusi server-side dari Rute)
    let resolvedZonaId = body.zonaId ? parseInt(body.zonaId) : null;
    if (!resolvedZonaId && body.ruteId) {
      const matchedRoute = await prisma.rute.findUnique({
        where: { id: parseInt(body.ruteId) },
        select: { zonaId: true },
      });
      if (matchedRoute?.zonaId) {
        resolvedZonaId = matchedRoute.zonaId;
      }
    }

    if (resolvedZonaId) {
      const zid = resolvedZonaId;
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
                tenantId: recordTenantId,
              },
            });
          }
          data.wilayahId = w.id;
        }
      }
    }

    // Penugasan Mobil Armada Pickup, Rute, dan Jadwal Pengangkutan (bisa memilih lebih dari 1 hari)
    if (body.ruteId || body.kendaraanId || body.petugasId || body.hari || body.jadwalHari) {
      await tetapkanJadwalDanPetugasPelanggan({
        pelangganId: id,
        kelurahanId: data.kelurahanId !== undefined ? (data.kelurahanId as number | null) : null,
        zonaId: resolvedZonaId,
        kendaraanId: body.kendaraanId ? parseInt(body.kendaraanId) : null,
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
          include: { rute: { include: { kendaraan: true, petugas: { omit: { trackingToken: true } } } } },
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
              tenantId: recordTenantId,
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
            const tmpl = await templateTagihanBaru(tagihanWa);
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
        const tDisetujui = await templatePendaftaranDisetujui(pelanggan.nama, pelanggan.kodePelanggan);
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

    // Jika kodePelanggan berubah, perbarui noInvoice pada tagihan yang masih belum_bayar
    if (data.kodePelanggan && data.kodePelanggan !== targetPelanggan.kodePelanggan) {
      try {
        const unpaidBills = await prisma.tagihan.findMany({
          where: {
            pelangganId: id,
            status: "belum_bayar",
            deletedAt: null,
          },
          select: { id: true, bulan: true, tahun: true },
        });

        for (const bill of unpaidBills) {
          const newNoInvoice = generateNoInvoice(String(data.kodePelanggan), bill.bulan, bill.tahun);
          const existingInv = await prisma.tagihan.findUnique({
            where: { noInvoice: newNoInvoice },
            select: { id: true },
          });
          if (!existingInv || existingInv.id === bill.id) {
            await prisma.tagihan.update({
              where: { id: bill.id },
              data: { noInvoice: newNoInvoice },
            });
          }
        }
      } catch (errInvoice) {
        console.error("Gagal sinkronisasi noInvoice tagihan berjalan:", errInvoice);
      }
    }

    await logAudit("update", "Pelanggan", id, { id }, { nama: pelanggan.nama, status: pelanggan.status });

    return NextResponse.json(pelanggan);
  } catch (err: any) {
    if (err?.code === "P2002" || (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      return NextResponse.json(
        { error: "Nomor WhatsApp atau Kode Pelanggan ini sudah terdaftar pada pelanggan lain." },
        { status: 400 }
      );
    }
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
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID pelanggan tidak valid" }, { status: 400 });
    }

    const pelanggan = await prisma.pelanggan.findUnique({
      where: { id },
      select: { id: true, nama: true, kodePelanggan: true, tenantId: true },
    });
    if (!pelanggan) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const { resolveTenantByHost } = await import("@/lib/tenant");
    const tenantCtx = resolveTenantByHost(rawHost);
    const currentTenantId = session.tenantId || tenantCtx.tenant.id;
    const recordTenantId = pelanggan.tenantId ?? "tenant-pilot-upsheru";
    if (session.role !== "superadmin" && !tenantCtx.isCore && recordTenantId !== currentTenantId) {
      return NextResponse.json({ error: "Forbidden: Pelanggan bukan milik organisasi tenant Anda" }, { status: 403 });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Soft delete data pelanggan & update status menjadi nonaktif
      await tx.pelanggan.update({
        where: { id },
        data: {
          deletedAt: now,
          status: "nonaktif",
        },
      });

      // 2. Batalkan seluruh sesi pembayaran pending pada tagihan yang belum lunas
      await tx.pembayaran.updateMany({
        where: {
          pelangganId: id,
          status: "pending",
          tagihan: {
            status: { in: ["belum_bayar", "tunggakan"] },
          },
        },
        data: {
          status: "ditolak",
          catatan: "Dibatalkan otomatis: Pelanggan telah dihapus dari sistem",
        },
      });

      // 3. Batalkan & soft-delete seluruh tagihan yang belum lunas (belum_bayar & tunggakan)
      //    Tagihan yang SUDAH LUNAS tetap dipertahankan utuh demi integritas pembukuan kas
      const unpaidBills = await tx.tagihan.updateMany({
        where: {
          pelangganId: id,
          status: { in: ["belum_bayar", "tunggakan"] },
          deletedAt: null,
        },
        data: {
          status: "dibatalkan",
          deletedAt: now,
          keterangan: "Dibatalkan otomatis: Pelanggan telah dihapus dari sistem",
        },
      });

      // 4. Nonaktifkan seluruh jadwal penjemputan armada terkait pelanggan ini
      await tx.jadwal.updateMany({
        where: { pelangganId: id },
        data: { aktif: false },
      });

      return { canceledBillsCount: unpaidBills.count };
    });

    await logAudit(
      "delete",
      "Pelanggan",
      id,
      { nama: pelanggan.nama, kodePelanggan: pelanggan.kodePelanggan },
      { canceledBillsCount: result.canceledBillsCount }
    );

    return NextResponse.json({
      message: `Pelanggan berhasil dihapus. ${result.canceledBillsCount} tagihan belum lunas otomatis dibatalkan.`,
      canceledBillsCount: result.canceledBillsCount,
    });
  } catch (err: any) {
    console.error("DELETE /api/pelanggan/[id] error:", err);
    return NextResponse.json({ error: "Gagal menghapus pelanggan", detail: err?.message }, { status: 500 });
  }
}
