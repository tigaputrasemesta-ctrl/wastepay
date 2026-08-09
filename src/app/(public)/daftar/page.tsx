import type { Metadata } from "next";
import Link from "next/link";
import FormDaftar from "@/components/FormDaftar";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar | O2W Hero Zero Waste",
  description: "Daftar layanan sampah O2W Hero Depok",
};

const ALUR_DAFTAR = [
  {
    no: "01",
    judul: "ISI FORM DIMARI",
    desc: "Lengkapin data diri lu sama alamat. Gratis coy, kagak dipungut biaya pendaftaran.",
  },
  {
    no: "02",
    judul: "SURVEI LOKASI",
    desc: "Petugas kita bakal hubungin lu buat survei rute, biar ngangkutnya gampang.",
  },
  {
    no: "03",
    judul: "DAPET KODE",
    desc: "Kalo udah ACC, lu dapet kode anggota buat login, cek tagihan, sama ngadu.",
  },
  {
    no: "04",
    judul: "BERES DAH",
    desc: "Sampah lu diangkut rutin. Tagihan dikirim otomatis tiap bulan lewat WA.",
  },
];

export const dynamic = "force-dynamic";

export default async function DaftarPage() {
  let tarifMin = 0;
  try {
    const k = await prisma.kategoriTarif.findMany({
      orderBy: { tarif: "asc" },
      select: { tarif: true },
    });
    tarifMin = k.length > 0 ? Math.min(...k.map((x) => x.tarif)) : 0;
  } catch {
    // DB offline
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
      <div className="mb-16 text-center md:text-left">
        <p className="font-mono text-[var(--neon-yellow)] uppercase tracking-widest text-xs border border-[var(--neon-yellow)] bg-[rgba(252,238,10,0.1)] inline-block px-4 py-1 mb-4 shadow-[0_0_10px_rgba(252,238,10,0.2)]">
          &gt; REGISTRASI_NEW_USER
        </p>
        <h1 className="font-display font-black text-4xl sm:text-6xl text-white uppercase tracking-tighter">
          GABUNG SAMA <span className="text-[var(--neon-cyan)] glitch-text">KITA COY!</span>
        </h1>
        <p className="text-slate-400 font-mono mt-6 max-w-2xl leading-relaxed mx-auto md:mx-0">
          {tarifMin > 0 ? (
            <>
              Murmer mulai dari <span className="text-[var(--neon-yellow)] font-bold">{formatRupiah(tarifMin)}</span> sebulan. Kagak ada uang pendaftaran alias <span className="text-[var(--neon-lime)]">GRATIS TIS TIS</span>. Langsung aja isi form di mari.
            </>
          ) : (
            "Kagak ada uang pendaftaran alias GRATIS TIS TIS. Langsung aja isi form di mari."
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Langkah */}
        <div className="lg:col-span-2 space-y-6">
          {ALUR_DAFTAR.map((l, i) => (
            <div key={l.no} className="cyber-box border-[var(--neon-cyan)] flex gap-6 p-6">
              <span className="font-display text-4xl font-black text-[var(--neon-cyan)] mt-1 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {l.no}
              </span>
              <div>
                <h2 className="font-mono font-bold text-white uppercase text-lg">{l.judul}</h2>
                <p className="text-xs font-mono text-slate-400 mt-2">{l.desc}</p>
              </div>
            </div>
          ))}
          <div className="cyber-box border-[var(--neon-pink)] p-6 bg-[rgba(255,0,234,0.05)]">
            <p className="font-mono text-xs font-bold text-[var(--neon-pink)] uppercase mb-2">&gt; CATETAN_PENTING</p>
            <ul className="space-y-2 text-xs font-mono text-slate-400">
              <li>&gt; 100% GRATIS biaya pendaftaran</li>
              <li>&gt; Layanan aktif kalau udah disetujui admin</li>
              <li>&gt; Kode lu bakal dikirim via WA</li>
            </ul>
          </div>
          <Link
            href="/bayar"
            className="cyber-btn w-full text-xs text-center border-slate-700 text-slate-400 hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)]"
          >
            &lt; UDAH DAFTAR? CEK TAGIHAN
          </Link>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <FormDaftar />
        </div>
      </div>
    </div>
  );
}
