import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Tarif | O2W Hero Zero Waste",
  description: "Biaya langganan sampah",
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
    // DB offline
  }

  const tarifMin = kategoriTarif.length > 0 ? Math.min(...kategoriTarif.map((k) => k.tarif)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
      <div className="flex flex-wrap items-end justify-between gap-8 mb-16">
        <div>
          <p className="font-mono text-[var(--neon-pink)] uppercase tracking-widest text-xs border border-[var(--neon-pink)] bg-[rgba(255,0,234,0.1)] inline-block px-4 py-1 mb-4 shadow-[0_0_10px_rgba(255,0,234,0.2)]">
            &gt; DAFTAR_TARIF_TRANSPARAN
          </p>
          <h1 className="font-display font-black text-4xl sm:text-6xl text-white uppercase tracking-tighter">
            BIAYA <span className="text-[var(--neon-pink)] glitch-text shadow-red-500">SEGINI DOANG!</span>
          </h1>
          <p className="text-slate-400 font-mono mt-6 max-w-xl leading-relaxed">
            Nih daftar harga per bulannya coy. Udah termasuk diangkut rutin. Kagak ada biaya-biayaan lain apalagi biaya pendaftaran. Murni seharga cilok sebulan.
          </p>
        </div>
        {tarifMin > 0 && (
          <div className="cyber-box border-[var(--neon-lime)] p-6 bg-[rgba(57,255,20,0.05)] text-right">
            <p className="font-mono text-slate-400 text-[10px] mb-1 uppercase">&gt; MULAI DARI</p>
            <p className="font-display font-black text-4xl text-[var(--neon-lime)]">{formatRupiah(tarifMin)}</p>
            <p className="text-[10px] text-[var(--neon-lime)] mt-2 font-mono uppercase bg-[rgba(57,255,20,0.1)] inline-block px-2 py-1">PER BULAN COY</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="cyber-box border-[var(--neon-cyan)] p-0 overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-4 bg-[rgba(0,243,255,0.1)] border-b border-[var(--neon-cyan)] font-mono text-[10px] font-bold text-[var(--neon-cyan)] uppercase tracking-widest">
              <span className="col-span-6">&gt; KATEGORI_LU</span>
              <span className="col-span-4">&gt; DETAIL</span>
              <span className="col-span-2 text-right">&gt; TARIF</span>
            </div>
            {kategoriTarif.length === 0 ? (
              <p className="px-6 py-10 text-sm text-[var(--neon-pink)] text-center font-mono uppercase glitch-text">
                &gt; SISTEM_DATABASE_ERROR: TARIF GAK KEBACA
              </p>
            ) : (
              kategoriTarif.map((k, i) => (
                <div
                  key={k.kategori}
                  className={`grid grid-cols-12 px-6 py-4 items-center border-b border-slate-800 last:border-0 ${
                    i % 2 ? "bg-[rgba(255,255,255,0.02)]" : ""
                  }`}
                >
                  <span className="col-span-6 text-sm font-bold text-white uppercase">{k.label}</span>
                  <span className="col-span-4 text-[10px] text-slate-400 font-mono uppercase">{k.deskripsi ?? "—"}</span>
                  <span className="col-span-2 text-right font-mono font-bold text-lg text-[var(--neon-yellow)]">{formatRupiah(k.tarif)}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-mono uppercase">
            * Kalo lu butuh request aneh-aneh (truk khusus/sampah sisa proyek), calling admin aja coy, nanti bisa dibicarain harganya.
          </p>
        </div>

        <div className="space-y-6">
          <div className="cyber-box border-[var(--neon-yellow)] bg-[rgba(252,238,10,0.02)] p-6">
            <p className="font-mono font-bold text-[var(--neon-yellow)] uppercase mb-6 tracking-widest">&gt; PAKET_KHUSUS</p>
            <div className="space-y-4">
              {paket.length === 0 ? (
                <p className="text-[10px] text-[var(--neon-pink)] font-mono uppercase glitch-text">BELOM ADA PAKET TERSEDIA.</p>
              ) : (
                paket.map((p) => (
                  <div
                    key={p.nama}
                    className="border border-[var(--neon-yellow)] bg-[rgba(252,238,10,0.05)] p-4 flex items-start justify-between gap-4 shadow-[0_0_10px_rgba(252,238,10,0.1)] hover:bg-[var(--neon-yellow)] hover:text-black transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-black uppercase">{p.nama}</p>
                      {p.deskripsi && <p className="text-[10px] text-slate-400 group-hover:text-black/70 mt-1 font-mono uppercase">{p.deskripsi}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg text-[var(--neon-yellow)] group-hover:text-black whitespace-nowrap">
                        {formatRupiah(p.harga)}
                      </p>
                      <span className="text-[9px] text-[var(--neon-yellow)] group-hover:text-black font-mono">/BULAN</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link href="/daftar" className="cyber-btn cyber-btn-yellow w-full text-center text-sm">
            [ GAS_DAFTAR_SEKARANG ]
          </Link>
          <Link href="/bayar" className="cyber-btn w-full text-center text-sm border-slate-700 text-slate-400 hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)]">
            [ CEK_TAGIHAN_SAYA ]
          </Link>
        </div>
      </div>
    </div>
  );
}
