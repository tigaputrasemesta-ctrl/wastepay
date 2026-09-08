import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Tarif | TPS HERU Depok",
  description: "Biaya langganan dan retribusi sampah TPS HERU Kota Depok",
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
    <div className="py-12 space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-8 mb-8">
        <div>
          <div className="inline-block px-4 py-1 hm-border font-bold uppercase text-xs mb-2 bg-[#f4f4f0] shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
            TPS HERU / TARIF LAYANAN
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
            DAFTAR <span className="text-red-600">HARGA.</span>
          </h1>
          <p className="font-bold uppercase tracking-widest text-sm max-w-xl mt-4">
            BIAYA LANGGANAN PER BULAN. SUDAH TERMASUK JADWAL ANGKUT RUTIN.
            TIDAK ADA BIAYA PENDAFTARAN. TIDAK ADA BIAYA TERSEMBUNYI.
          </p>
        </div>
        {tarifMin > 0 && (
          <div className="hm-card bg-green-50 text-right p-6">
            <p className="text-xs font-bold uppercase mb-1">HARGA MULAI DARI</p>
            <p className="text-4xl font-black text-green-600">{formatRupiah(tarifMin)}</p>
            <p className="text-[10px] font-bold text-black uppercase bg-green-200 mt-2 inline-block px-2 py-1">PER BULAN</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="hm-card p-0 bg-[#f4f4f0]">
            <div className="grid grid-cols-12 px-6 py-4 bg-white border-b-2 border-black text-xs font-black uppercase tracking-widest">
              <span className="col-span-6">KATEGORI PELANGGAN</span>
              <span className="col-span-4">DESKRIPSI</span>
              <span className="col-span-2 text-right">TARIF</span>
            </div>
            {kategoriTarif.length === 0 ? (
              <p className="px-6 py-10 text-sm text-red-600 text-center font-bold uppercase">
                TIDAK ADA DATA TARIF
              </p>
            ) : (
              kategoriTarif.map((k, i) => (
                <div
                  key={k.kategori}
                  className={`grid grid-cols-12 px-6 py-4 items-center border-b-2 border-black last:border-b-0 ${
                    i % 2 ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <span className="col-span-6 text-sm font-black uppercase">{k.label}</span>
                  <span className="col-span-4 text-xs font-bold uppercase">{k.deskripsi ?? "—"}</span>
                  <span className="col-span-2 text-right font-black text-lg text-red-600">{formatRupiah(k.tarif)}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs font-bold uppercase p-4 bg-yellow-50 border-2 border-black">
            * JIKA ANDA MEMBUTUHKAN PENGANGKUTAN KHUSUS (SAMPAH PROYEK / TRUK TAMBAHAN), SILAKAN HUBUNGI ADMIN UNTUK NEGOSIASI TARIF.
          </p>
        </div>

        <div className="space-y-6">
          <div className="hm-card bg-yellow-50 p-6">
            <p className="font-black text-black uppercase mb-6 tracking-widest text-lg border-b-2 border-black pb-2">PAKET KHUSUS</p>
            <div className="space-y-4">
              {paket.length === 0 ? (
                <p className="text-xs font-bold uppercase text-red-600">BELUM ADA PAKET TERSEDIA.</p>
              ) : (
                paket.map((p) => (
                  <div
                    key={p.nama}
                    className="border-2 border-black bg-white p-4 hover:bg-black hover:text-white transition-colors group cursor-pointer"
                  >
                    <div className="mb-2">
                      <p className="text-sm font-black uppercase">{p.nama}</p>
                      {p.deskripsi && <p className="text-xs font-bold uppercase mt-1">{p.deskripsi}</p>}
                    </div>
                    <div className="text-right border-t-2 border-black group-hover:border-white pt-2 mt-2">
                      <p className="font-black text-xl text-red-600 group-hover:text-red-400">
                        {p.harga != null ? formatRupiah(p.harga) : "VARIABEL"}
                      </p>
                      <span className="text-[10px] font-bold uppercase">{p.harga != null ? "PER BULAN" : "SESUAI KEBUTUHAN"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link href="/daftar" className="hm-btn-green w-full block text-center">
            DAFTAR SEKARANG
          </Link>
          <Link href="/bayar" className="hm-btn w-full block text-center bg-[#f4f4f0]">
            CEK TAGIHAN SAYA
          </Link>
        </div>
      </div>
    </div>
  );
}
