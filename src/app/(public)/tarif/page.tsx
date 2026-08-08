import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarif Layanan | O2W Hero Zero Waste",
  description: "Tarif pengangkutan sampah per kategori & paket layanan",
};

export const dynamic = "force-dynamic";

export default async function TarifPage() {
  let kategoriTarif: { kategori: string; label: string; tarif: number; deskripsi: string | null }[] = [];
  let paket: { nama: string; harga: number; deskripsi: string | null }[] = [];
  try {
    [kategoriTarif, paket] = await Promise.all([
      prisma.kategoriTarif.findMany({
        orderBy: { tarif: "asc" },
        select: { kategori: true, label: true, tarif: true, deskripsi: true },
      }),
      prisma.paket.findMany({
        orderBy: { harga: "asc" },
        select: { nama: true, harga: true, deskripsi: true },
      }),
    ]);
  } catch {
    // DB offline — halaman tetap tampil tanpa daftar tarif
  }

  const tarifMin = kategoriTarif.length > 0 ? Math.min(...kategoriTarif.map((k) => k.tarif)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="stencil text-amber flex items-center gap-2">
            <span className="w-8 h-1.5 bg-amber inline-block" /> Tarif Layanan
          </p>
          <h1 className="font-display text-4xl sm:text-6xl tracking-wide mt-3 leading-tight">
            Biaya <span className="text-amber">tetap & transparan</span>.
          </h1>
          <p className="text-bone-dim mt-4 max-w-xl leading-relaxed">
            Tarif per bulan sesuai kategori layanan, sudah termasuk biaya
            pengangkutan rutin. Tidak ada biaya pendaftaran.
          </p>
        </div>
        {tarifMin > 0 && (
          <div className="panel p-5 text-right">
            <p className="stencil text-bone-faint text-[10px]">MULAI DARI</p>
            <p className="font-display text-4xl text-vest mt-1">{formatRupiah(tarifMin)}</p>
            <p className="text-xs text-bone-faint mt-1">per bulan</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="panel overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 bg-asphalt-deep border-b border-asphalt-line stencil text-[10px] text-bone-faint">
              <span className="col-span-6">KATEGORI</span>
              <span className="col-span-4">LAYANAN</span>
              <span className="col-span-2 text-right">TARIF/BULAN</span>
            </div>
            {kategoriTarif.length === 0 ? (
              <p className="px-5 py-8 text-sm text-bone-faint text-center font-mono">
                Daftar tarif sedang diperbarui — hubungi petugas wilayah.
              </p>
            ) : (
              kategoriTarif.map((k, i) => (
                <div
                  key={k.kategori}
                  className={`grid grid-cols-12 px-5 py-3.5 items-center border-b border-asphalt-line/60 last:border-0 ${
                    i % 2 ? "bg-asphalt-deep/30" : ""
                  }`}
                >
                  <span className="col-span-6 text-sm font-medium text-bone">{k.label}</span>
                  <span className="col-span-4 text-xs text-bone-dim font-mono">{k.deskripsi ?? "—"}</span>
                  <span className="col-span-2 text-right font-mono text-sm text-vest">{formatRupiah(k.tarif)}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-bone-faint mt-3 font-mono">
            * Tarif dapat disesuaikan untuk kebutuhan khusus — hubungi petugas wilayah Anda.
          </p>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <p className="stencil text-vest mb-4">PAKET LANGGANAN</p>
            <div className="space-y-3">
              {paket.length === 0 ? (
                <p className="text-sm text-bone-faint font-mono">Belum tersedia.</p>
              ) : (
                paket.map((p) => (
                  <div
                    key={p.nama}
                    className="chamfer-sm border border-asphalt-line bg-asphalt-deep/40 p-4 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-bone">{p.nama}</p>
                      {p.deskripsi && <p className="text-xs text-bone-dim mt-0.5">{p.deskripsi}</p>}
                    </div>
                    <p className="font-display text-lg text-vest whitespace-nowrap">
                      {formatRupiah(p.harga)}
                      <span className="text-[10px] text-bone-faint">/bln</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link href="/daftar" className="btn btn-primary chamfer-sm w-full justify-center py-3.5">
            Daftar Sekarang
          </Link>
          <Link href="/bayar" className="btn chamfer-sm w-full justify-center py-3">
            Cek Tagihan Saya →
          </Link>
        </div>
      </div>
    </div>
  );
}
