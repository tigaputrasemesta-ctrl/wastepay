import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Tarif | UPS HERU Depok",
  description: "Biaya langganan dan retribusi sampah UPS HERU Kota Depok",
};

export const dynamic = "force-dynamic";

export default async function TarifPage() {
  let kategoriTarif: { kategori: string; label: string; tarif: number; deskripsi: string | null }[] = [];
  let paket: { nama: string; harga: number | null; deskripsi: string | null }[] = [];
  try {
    [kategoriTarif, paket] = await Promise.all([
      prisma.kategoriTarif.findMany({
        orderBy: { tarif: "asc" },
        select: { kategori: true, label: true, tarif: true, deskripsi: true },
      }),
      prisma.paket.findMany({
        orderBy: { harga: { sort: "asc", nulls: "last" } },
        select: { nama: true, harga: true, deskripsi: true },
      }),
    ]);
  } catch {
    // DB offline
  }

  const tarifMin = kategoriTarif.length > 0 ? Math.min(...kategoriTarif.map((k) => k.tarif)) : 0;

  return (
    <div className="py-8 sm:py-12 space-y-10 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
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
            <p className="text-3xl font-black text-emerald-700">{formatRupiah(tarifMin)}</p>
            <span className="inline-block mt-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              per bulan / KK
            </span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Main tariff list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="col-span-6">Kategori Pelanggan</span>
              <span className="col-span-3">Jadwal / Keterangan</span>
              <span className="col-span-3 text-right">Tarif Bulanan</span>
            </div>
            {kategoriTarif.length === 0 ? (
              <p className="px-6 py-12 text-sm text-slate-500 text-center font-medium">
                Belum ada data tarif yang dipublikasikan.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {kategoriTarif.map((k) => (
                  <div
                    key={k.kategori}
                    className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/75 transition-colors"
                  >
                    <div className="col-span-6 pr-2">
                      <p className="text-sm font-semibold text-slate-900">{k.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{k.kategori.replace(/_/g, " ")}</p>
                    </div>
                    <span className="col-span-3 text-xs text-slate-600">{k.deskripsi ?? "Rutin terkoordinasi"}</span>
                    <span className="col-span-3 text-right font-bold text-base text-emerald-600">{formatRupiah(k.tarif)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-amber-600 font-bold shrink-0">💡 Catatan:</span>
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
                      <p className="font-extrabold text-base text-emerald-600">
                        {p.harga != null ? formatRupiah(p.harga) : "Negosiasi"}
                      </p>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">{p.harga != null ? "per bulan" : "sesuai volume"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/daftar"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all"
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
