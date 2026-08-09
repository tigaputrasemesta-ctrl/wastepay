import type { Metadata } from "next";
import Link from "next/link";
import PengaduanForm from "@/components/PengaduanForm";

export const metadata: Metadata = {
  title: "Ngadu Dimari | O2W Hero Zero Waste",
  description: "Lapor sampah lu kalau kagak diangkut",
};

const PANDUAN = [
  {
    no: "01",
    judul: "SIAPIN KODE LU",
    desc: "Masukin kode anggota lu, cek di kartu atau resi pembayaran cuy.",
  },
  {
    no: "02",
    judul: "TULIS MASALAHNYA",
    desc: "Kasih tau dah kenapa, makin jelas makin cepet disikat ama tim.",
  },
  {
    no: "03",
    judul: "PANTAU TERUS",
    desc: "Laporan lu bakal masuk ke sistem, pantengin aja sampe kelar.",
  },
];

export default function PengaduanPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
      <div className="mb-16 text-center md:text-left">
        <p className="font-mono text-[var(--neon-pink)] uppercase tracking-widest text-xs border border-[var(--neon-pink)] bg-[rgba(255,0,234,0.1)] inline-block px-4 py-1 mb-4 shadow-[0_0_10px_rgba(255,0,234,0.2)]">
          &gt; SISTEM_LAPOR_DARURAT
        </p>
        <h1 className="font-display font-black text-4xl sm:text-6xl text-white uppercase tracking-tighter">
          SAMPAH KAGAK DIANGKUT? <br />
          <span className="text-red-500 glitch-text shadow-red-500">NGADU DIMARI COY!</span>
        </h1>
        <p className="text-slate-400 font-mono mt-6 max-w-2xl leading-relaxed mx-auto md:mx-0">
          Masukin kode lu, ceritain masalahnya, ntar laporan lu langsung nembus ke terminal armada yang lagi patroli. Kagak pake lama.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Panduan */}
        <div className="lg:col-span-2 space-y-6">
          {PANDUAN.map((p, i) => (
            <div key={p.no} className="cyber-box border-[var(--neon-cyan)] flex gap-6 p-6">
              <span className="font-display text-4xl font-black text-[var(--neon-cyan)] mt-1 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {p.no}
              </span>
              <div>
                <h2 className="font-mono font-bold text-white uppercase text-lg">{p.judul}</h2>
                <p className="text-xs font-mono text-slate-400 mt-2">{p.desc}</p>
              </div>
            </div>
          ))}
          <div className="cyber-box border-[var(--neon-yellow)] p-6 bg-[rgba(252,238,10,0.05)]">
            <p className="font-mono text-xs font-bold text-[var(--neon-yellow)] uppercase mb-2">&gt; CEK_STATUS_OTOMATIS</p>
            <p className="text-xs font-mono text-slate-400">
              Kalo lu masukin nomer WA, nanti bot bakal ngirim transmisi pas masalah lu udah kelar diurusin.
            </p>
          </div>
          <Link
            href="/bayar"
            className="cyber-btn w-full text-xs text-center border-slate-700 text-slate-400 hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)]"
          >
            &lt; BALIK KE CEK TAGIHAN
          </Link>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <PengaduanForm />
        </div>
      </div>
    </div>
  );
}
