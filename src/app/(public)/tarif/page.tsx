import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";
import { resolveTenantByHost, buildTenantFilter } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Daftar Tarif & Paket Retribusi Resmi",
  description:
    "Informasi transparansi biaya langganan dan retribusi resmi penjemputan sampah Kota Depok untuk kategori Rumah Tangga, Niaga/Usaha, dan Khusus.",
  alternates: {
    canonical: "/tarif",
  },
  openGraph: {
    title: "Daftar Tarif Resmi Retribusi Sampah Kota Depok | UPS HERU",
    description:
      "Transparansi biaya retribusi sampah resmi Kota Depok. Pilihan paket fleksibel untuk rumah tangga hingga tempat usaha.",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TarifPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const tenantCtx = resolveTenantByHost(host);
  const tenantScope = buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot);

  let kategoriTarifRaw: { kategori: string; label: string; tarif: number; deskripsi: string | null }[] = [];
  let paketRaw: { nama: string; harga: number | null; deskripsi: string | null }[] = [];
  try {
    [kategoriTarifRaw, paketRaw] = await Promise.all([
      prisma.kategoriTarif.findMany({
        where: tenantScope,
        orderBy: { tarif: "asc" },
        select: { kategori: true, label: true, tarif: true, deskripsi: true },
      }),
      prisma.paket.findMany({
        where: tenantScope,
        orderBy: { harga: { sort: "asc", nulls: "last" } },
        select: { nama: true, harga: true, deskripsi: true },
      }),
    ]);
  } catch {
    // DB offline
  }

  const LABEL_KATEGORI_TARIF: Record<string, { label: string; schedule: string }> = {
    level_1: {
      label: "Level 1 — Volume Sangat Kecil (Rumah Tangga)",
      schedule: "Rutin 3x / minggu (Rumah Tangga / Komplek)",
    },
    level_2: {
      label: "Level 2 — Volume Kecil–Sedang (Rumah Tingkat)",
      schedule: "Rutin 3x / minggu (Rumah Tangga Sedang)",
    },
    level_3: {
      label: "Level 3 — Volume Sedang (Hunian / Kosan Kecil)",
      schedule: "Rutin 3x / minggu (Hunian / Kosan Kecil)",
    },
    level_4: {
      label: "Level 4 — Volume Sedang–Besar (Kosan / Ruko)",
      schedule: "Rutin 3–4x / minggu (Kosan / Ruko Sedang)",
    },
    level_5: {
      label: "Level 5 — Volume Besar (Usaha / Ruko 2 Pintu)",
      schedule: "Rutin 3–4x / minggu (Usaha / Ruko 2 Pintu)",
    },
    level_6: {
      label: "Level 6 — Volume Sangat Besar (Restoran / Niaga)",
      schedule: "Rutin 4–5x / minggu (Restoran / Kafe / Niaga)",
    },
    level_7: {
      label: "Level 7 — Volume Ekstra Besar (Sentra Kuliner)",
      schedule: "Rutin 5–6x / minggu (Sentra Kuliner / Bisnis)",
    },
    level_8: {
      label: "Level 8 — Volume Komersial Besar (Pasar / Swalayan)",
      schedule: "Rutin setiap hari (Pasar / Minimarket)",
    },
    level_9: {
      label: "Level 9 — Volume Maksimal (Sentra Industri)",
      schedule: "Rutin setiap hari (Sentra Industri / Gudang)",
    },
    level_10: {
      label: "Level 10 — Volume Korporat (Instansi / Kawasan Khusus)",
      schedule: "Jadwal harian khusus (Kawasan Korporasi)",
    },
  };

  // Fallback hanya saat DB kosong; hindari override harga berbeda dari homepage/Paket Langganan
  const kategoriTarif = (kategoriTarifRaw.length > 0 ? kategoriTarifRaw : [
    { kategori: "level_1", label: "Level 1 (Rumah Tangga)", tarif: 40000, deskripsi: "Rutin 3x seminggu" }
  ]).map((k) => {
    const meta = LABEL_KATEGORI_TARIF[k.kategori];
    const cleanDeskripsi = k.deskripsi && k.deskripsi.trim().length > 0 ? k.deskripsi.trim() : null;
    const cleanLabel = k.label && k.label !== k.kategori && !/^Level \d+$/i.test(k.label.trim())
      ? k.label.trim()
      : meta?.label || k.label || k.kategori;

    return {
      ...k,
      label: cleanLabel,
      deskripsi: cleanDeskripsi || meta?.schedule || "2–3x / minggu sesuai zona",
    };
  });

  // Pastikan Paket Langganan fallback konsisten jika belum diisi di DB tenant
  const hasPaketLangganan = paketRaw.some((p) => p.nama.toLowerCase().includes("langganan"));
  const paket = paketRaw.map((p) => {
    if (p.nama.toLowerCase().includes("langganan") && p.harga == null) {
      return {
        ...p,
        nama: "Paket Langganan",
        harga: 40000,
        deskripsi: p.deskripsi || "Pengangkutan sampah rutin perumahan / rumah tangga 3x seminggu (Rp 40.000/bulan)",
      };
    }
    return p;
  });

  if (!hasPaketLangganan) {
    paket.unshift({
      nama: "Paket Langganan",
      harga: 40000,
      deskripsi: "Pengangkutan sampah rutin perumahan / rumah tangga 3x seminggu (Rp 40.000/bulan)",
    });
  }

  const allTarif = [
    ...kategoriTarif.map((k) => k.tarif),
    ...paket.map((p) => p.harga).filter((h): h is number => typeof h === "number" && h > 0),
  ];
  const tarifMin = allTarif.length > 0 ? Math.min(...allTarif) : 40000;

  return (
    <div className="py-8 sm:py-12 space-y-10 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
            Transparansi Retribusi Resmi Kota Depok
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Tarif Layanan Pengangkutan
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
            Biaya langganan bulanan sudah mencakup jadwal jemput rutin ke rumah. Tanpa biaya pendaftaran, tanpa biaya tersembunyi.
          </p>
        </div>

        {tarifMin > 0 && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl p-5 md:text-right shadow-sm shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">Mulai Dari</p>
            <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">{formatRupiah(tarifMin)}</p>
            <span className="inline-block mt-1 text-xs font-medium text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              per bulan / KK
            </span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Main tariff list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3.5 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              <span className="col-span-6">Kategori Pelanggan</span>
              <span className="col-span-3">Jadwal / Keterangan</span>
              <span className="col-span-3 text-right">Tarif Bulanan</span>
            </div>
            {kategoriTarif.length === 0 ? (
              <p className="px-6 py-12 text-sm text-slate-500 text-center font-medium">
                Belum ada data tarif yang dipublikasikan.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {kategoriTarif.map((k) => (
                  <div
                    key={k.kategori}
                    className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/75 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="col-span-6 pr-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{k.label}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 capitalize">{k.kategori.replace(/_/g, " ")}</p>
                    </div>
                    <span className="col-span-3 text-xs text-slate-600 dark:text-zinc-300 font-medium">{k.deskripsi}</span>
                    <span className="col-span-3 text-right font-bold text-base text-emerald-700 dark:text-emerald-400">{formatRupiah(k.tarif)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Stacked Cards View (md:hidden) */}
          <div className="md:hidden space-y-3">
            {kategoriTarif.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center font-medium bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                Belum ada data tarif yang dipublikasikan.
              </p>
            ) : (
              kategoriTarif.map((k) => (
                <div
                  key={k.kategori}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-snug">
                        {k.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 capitalize mt-0.5">
                        {k.kategori.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 shrink-0">
                      {formatRupiah(k.tarif)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium text-[11px]">Jadwal Jemput:</span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-200 text-right">
                      {k.deskripsi}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-amber-700 font-bold shrink-0">💡 Catatan:</span>
            <span>
              Untuk pengangkutan limbah khusus (sisa proyek bangunan, puing, batang pohon, atau volume ekstra), silakan koordinasikan dengan petugas rute lapangan atau admin dinas.
            </span>
          </div>
        </div>

        {/* Sidebar packages & CTA */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-base mb-1">Paket Khusus & Komersial</h2>
            <p className="text-xs text-slate-500 mb-4">Layanan terpadu untuk instansi dan niaga</p>
            <div className="space-y-3">
              {paket.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada paket khusus tambahan.</p>
              ) : (
                paket.map((p) => (
                  <div
                    key={p.nama}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 hover:border-emerald-400 hover:bg-white transition-all group"
                  >
                    <div className="mb-2">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{p.nama}</p>
                      {p.deskripsi && <p className="text-xs text-slate-500 mt-1">{p.deskripsi}</p>}
                    </div>
                    <div className="text-right border-t border-slate-200/60 pt-2 mt-2">
                      <p className="font-extrabold text-base text-emerald-700">
                        {p.harga != null ? formatRupiah(p.harga) : "Negosiasi"}
                      </p>
                      <span className="text-xs font-medium text-slate-500 uppercase">{p.harga != null ? "per bulan" : "sesuai volume"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/daftar"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all"
            >
              Daftar Langganan Sekarang
            </Link>
            <Link
              href="/bayar"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all"
            >
              Cek Tagihan & Bayar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
