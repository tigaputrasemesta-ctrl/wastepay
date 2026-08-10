import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { generateNoInvoice } from "@/lib/invoice";
import {
  buildTagihanWa,
  isWaEnabled,
  kirimBlastWa,
  templateTagihanBaru,
  type TargetWa,
} from "@/lib/wa";

/**
 * POST /api/tagihan/generate
 * Auto-generate tagihan for all active customers for a given month
 * Body: { bulan?: number, tahun?: number }
 * Default: current month
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const bulan = body.bulan || now.getMonth() + 1;
    const tahun = body.tahun || now.getFullYear();

    // Get all active customers
    const pelangganList = await prisma.pelanggan.findMany({
      where: {
        status: "aktif",
        deletedAt: null,
      },
      include: {
        paket: true,
      },
    });

    // Batch lookup — hindari N+1: 1 query untuk tagihan existing + 1 untuk kategori tarif
    // (sebelumnya 2-3 query PER pelanggan di dalam loop).
    const existingTags = await prisma.tagihan.findMany({
      where: {
        bulan,
        tahun,
        pelangganId: { in: pelangganList.map((p) => p.id) },
      },
      select: { pelangganId: true },
    });
    const existingSet = new Set(existingTags.map((t) => t.pelangganId));
    const kategoriTarifs = await prisma.kategoriTarif.findMany();
    const kategoriTarifMap = new Map(kategoriTarifs.map((k) => [k.kategori, k.tarif]));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    /** Tagihan baru yang dibuat — untuk auto-kirim WA invoice. */
    const tagihanBaru: { pelangganId: number; nama: string; noTelepon: string | null; noInvoice: string | null; bulan: number; tahun: number; jumlah: number; denda: number | null; jatuhTempo: Date; kodePelanggan: string; paket?: string }[] = [];

    for (const pelanggan of pelangganList) {
      try {
        // Skip if tagihan already exists for this period (batch check, no per-row query)
        if (existingSet.has(pelanggan.id)) {
          skipped++;
          continue;
        }

        // Calculate tariff: customTarif > paket.harga > kategoriTarif
        let tarif = pelanggan.customTarif;
        if (!tarif && pelanggan.paket) {
          tarif = pelanggan.paket.harga;
        }
        if (!tarif) {
          tarif = kategoriTarifMap.get(pelanggan.kategori) ?? 0;
        }

        // Calculate due date: 15th of the month
        const jatuhTempo = new Date(tahun, bulan - 1, 15);

        await prisma.tagihan.create({
          data: {
            pelangganId: pelanggan.id,
            bulan,
            tahun,
            jumlah: tarif,
            status: "belum_bayar",
            jatuhTempo,
            keterangan: `Tagihan bulan ${bulan}/${tahun}`,
            noInvoice: generateNoInvoice(pelanggan.kodePelanggan, bulan, tahun),
          },
        });

        tagihanBaru.push({
          pelangganId: pelanggan.id,
          nama: pelanggan.nama,
          noTelepon: pelanggan.noTelepon,
          noInvoice: generateNoInvoice(pelanggan.kodePelanggan, bulan, tahun),
          bulan,
          tahun,
          jumlah: tarif,
          denda: null,
          jatuhTempo,
          kodePelanggan: pelanggan.kodePelanggan,
          paket: pelanggan.paket?.nama || undefined,
        });

        created++;
      } catch (e) {
        errors.push(`Pelanggan #${pelanggan.id} (${pelanggan.nama}): ${e instanceof Error ? e.message : "Error"}`);
      }
    }

    // Auto-kirim WA invoice ke pelanggan yang tagihannya baru dibuat (skylite pattern).
    // Nonaktifkan via env WA_AUTO_SEND="false".
    const waAutoSend = process.env.WA_AUTO_SEND !== "false" && isWaEnabled();
    let waHasil: { terkirim: number; pending: number; gagal: number; failures: string[] } | null = null;
    if (waAutoSend && tagihanBaru.length > 0) {
      const targets: TargetWa[] = tagihanBaru.map((t) => ({
        pelangganId: t.pelangganId,
        nama: t.nama,
        noTelepon: t.noTelepon,
      }));
      waHasil = await kirimBlastWa(
        targets,
        "tagihan_baru",
        (t) => {
          const row = tagihanBaru.find((x) => x.pelangganId === t.pelangganId)!;
          return templateTagihanBaru(buildTagihanWa(row, t.nama));
        },
        { createdById: user.id }
      );
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        aksi: "create",
        entitas: "Tagihan",
        entitasId: 0,
        dataBaru: JSON.stringify({ bulan, tahun, created, skipped, errors: errors.length }),
        userId: user.id,
      },
    });

    return NextResponse.json({
      message: `Tagihan berhasil digenerate: ${created} dibuat, ${skipped} sudah ada`,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      waEnabled: waAutoSend,
      notifikasi: waHasil
        ? {
            terkirim: waHasil.terkirim,
            pending: waHasil.pending,
            gagal: waHasil.gagal,
            failures: waHasil.failures.length > 0 ? waHasil.failures : undefined,
          }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal generate tagihan" },
      { status: 500 }
    );
  }
}
