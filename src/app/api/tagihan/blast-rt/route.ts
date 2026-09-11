import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  isWaEnabled,
  kirimBlastWa,
  buildTagihanWa,
  templateReminder,
  templateTunggakan,
  templateTagihanBaru,
  type TargetWa,
} from "@/lib/wa";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "kasir")) {
    return NextResponse.json({ error: "Forbidden — Hanya kasir dan admin yang dapat melakukan blast tagihan" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      wilayahId,
      rt,
      bulan,
      tahun,
      statusFilter, // "belum_bayar" | "tunggakan" | "semua_belum_lunas" (default)
      previewOnly,
    } = body;

    const where: Prisma.TagihanWhereInput = {
      deletedAt: null,
      pelanggan: {
        status: "aktif",
        deletedAt: null,
      },
    };

    // Filter status
    if (statusFilter === "belum_bayar" || statusFilter === "tunggakan") {
      where.status = statusFilter;
    } else {
      where.status = { in: ["belum_bayar", "tunggakan"] };
    }

    // Filter bulan & tahun
    if (bulan) {
      const b = parseInt(bulan);
      if (Number.isInteger(b) && b >= 1 && b <= 12) where.bulan = b;
    }
    if (tahun) {
      const t = parseInt(tahun);
      if (Number.isInteger(t) && t >= 2000) where.tahun = t;
    }

    // Filter wilayah / RT
    if (wilayahId) {
      const wid = parseInt(wilayahId);
      if (Number.isInteger(wid)) {
        where.pelanggan = {
          ...(where.pelanggan as Prisma.PelangganWhereInput),
          wilayahId: wid,
        };
      }
    }

    if (rt && String(rt).trim() !== "") {
      const rtStr = String(rt).trim();
      where.pelanggan = {
        ...(where.pelanggan as Prisma.PelangganWhereInput),
        OR: [
          { wilayah: { rt: rtStr } },
          { wilayah: { nama: { contains: rtStr, mode: "insensitive" } } },
          { rtRw: { contains: rtStr, mode: "insensitive" } },
        ],
      };
    }

    // Ambil seluruh tagihan yang memenuhi kriteria
    const tagihanList = await prisma.tagihan.findMany({
      where,
      include: {
        pelanggan: {
          select: {
            id: true,
            nama: true,
            noTelepon: true,
            kodePelanggan: true,
            rtRw: true,
            wilayah: { select: { id: true, nama: true, rt: true, rw: true } },
            paket: { select: { nama: true } },
          },
        },
      },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { pelanggan: { nama: "asc" } }],
    });

    // Hitung ringkasan
    let totalNominal = 0;
    const targets: (TargetWa & {
      tagihanId: number;
      noInvoice: string;
      total: number;
      denda: number;
      status: string;
      rtRw: string;
    })[] = [];

    const mapTagihan = new Map<number, (typeof tagihanList)[0]>();

    for (const t of tagihanList) {
      const tagihanWa = buildTagihanWa(
        {
          noInvoice: t.noInvoice,
          bulan: t.bulan,
          tahun: t.tahun,
          jumlah: t.jumlah,
          denda: t.denda,
          jatuhTempo: t.jatuhTempo,
          kodePelanggan: t.pelanggan.kodePelanggan,
          paket: t.pelanggan.paket?.nama,
        },
        t.pelanggan.nama
      );

      totalNominal += tagihanWa.total;
      mapTagihan.set(t.pelanggan.id, t);

      targets.push({
        pelangganId: t.pelanggan.id,
        nama: t.pelanggan.nama,
        noTelepon: t.pelanggan.noTelepon,
        tagihanId: t.id,
        noInvoice: tagihanWa.noInvoice,
        total: tagihanWa.total,
        denda: tagihanWa.denda,
        status: t.status,
        rtRw: t.pelanggan.rtRw || t.pelanggan.wilayah?.nama || "-",
      });
    }

    // Buat contoh preview pesan
    let sampleMessage = "";
    if (targets.length > 0) {
      const sampleItem = tagihanList[0];
      const sampleWa = buildTagihanWa(
        {
          noInvoice: sampleItem.noInvoice,
          bulan: sampleItem.bulan,
          tahun: sampleItem.tahun,
          jumlah: sampleItem.jumlah,
          denda: sampleItem.denda,
          jatuhTempo: sampleItem.jatuhTempo,
          kodePelanggan: sampleItem.pelanggan.kodePelanggan,
          paket: sampleItem.pelanggan.paket?.nama,
        },
        sampleItem.pelanggan.nama
      );
      sampleMessage =
        sampleItem.status === "tunggakan"
          ? templateTunggakan(sampleWa).pesan
          : templateReminder(sampleWa, 3).pesan;
    }

    // Jika hanya mode PREVIEW
    if (previewOnly) {
      return NextResponse.json({
        totalWarga: targets.length,
        totalNominal,
        sampleMessage,
        recipients: targets.slice(0, 50),
        isWaConfigured: isWaEnabled(),
      });
    }

    // Mode EKSEKUSI PENGIRIMAN
    if (targets.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada tagihan belum lunas untuk kriteria RT / Wilayah ini" },
        { status: 400 }
      );
    }

    const autoSend = isWaEnabled();
    const blastResult = await kirimBlastWa(
      targets,
      "tagihan_jatuh_tempo",
      (t) => {
        const itemTagihan = mapTagihan.get(t.pelangganId)!;
        const tagihanWa = buildTagihanWa(
          {
            noInvoice: itemTagihan.noInvoice,
            bulan: itemTagihan.bulan,
            tahun: itemTagihan.tahun,
            jumlah: itemTagihan.jumlah,
            denda: itemTagihan.denda,
            jatuhTempo: itemTagihan.jatuhTempo,
            kodePelanggan: itemTagihan.pelanggan.kodePelanggan,
            paket: itemTagihan.pelanggan.paket?.nama,
          },
          t.nama
        );

        return itemTagihan.status === "tunggakan"
          ? templateTunggakan(tagihanWa)
          : templateReminder(tagihanWa, 3);
      },
      { createdById: user.id, autoSend }
    );

    // Audit log
    await logAudit("create", "BlastWaTagihan", user.id, undefined, {
      rt: rt || "Semua",
      wilayahId: wilayahId || null,
      bulan,
      tahun,
      totalTarget: targets.length,
      terkirim: blastResult.terkirim,
      pending: blastResult.pending,
      gagal: blastResult.gagal,
    });

    return NextResponse.json({
      message: autoSend
        ? `Blast WhatsApp selesai: ${blastResult.terkirim} pesan terkirim otomatis, ${blastResult.gagal} gagal.`
        : `Mode manual: Dihasilkan ${blastResult.pending} tautan WhatsApp untuk dikirim manual.`,
      autoSend,
      hasil: blastResult,
    });
  } catch (error) {
    console.error("Error blasting WA tagihan per RT:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan server saat memproses blast WA" },
      { status: 500 }
    );
  }
}
