import Link from "next/link";
import { prisma } from "@/lib/prisma";
import O2WLogo from "@/components/O2WLogo";
import HeroQuickCheck from "@/components/HeroQuickCheck";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Global Scanline effect */}
      <div className="scanline" />

      {/* ═══ CYBERPUNK HERO ═══ */}
      <section className="pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8">
            <div className="hover:scale-105 transition-transform">
              <O2WLogo size="xl" />
            </div>

            <div className="inline-block border border-[var(--neon-pink)] px-4 py-2 bg-[rgba(255,0,234,0.1)] text-[var(--neon-pink)] font-mono text-xs uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(255,0,234,0.3)] backdrop-blur-sm">
              [ STATUS: READY BANGET COY ]
            </div>

            <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight uppercase font-display tracking-tighter">
              ANGKUT SAMPAH <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-lime)]" style={{ filter: "drop-shadow(0 0 10px rgba(0,243,255,0.5))" }}>
                GAYA DEPOK_2077
              </span>
            </h1>

            <p className="text-slate-400 font-mono text-lg max-w-lg border-l-2 border-[var(--neon-cyan)] pl-4">
              <span className="text-[var(--neon-cyan)]">&gt;&gt;</span> Kagak usah pusing mikirin bau sampah numpuk, ngab! Kita sikat habis sesuai jadwal, beneran otomatis. Murah parah, mulai dari <span className="text-[var(--neon-yellow)] font-bold">GOCAP (50K)</span> doang.
              <span className="blink">_</span>
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              <Link href="/bayar" className="cyber-btn">
                [ CEK_TAGIHAN_LU ]
              </Link>
              <Link href="/daftar" className="cyber-btn cyber-btn-pink">
                [ DAFTAR_KUY ]
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="cyber-box">
              <h3 className="text-[var(--neon-cyan)] font-mono text-xs mb-4 tracking-widest uppercase border-b border-[var(--neon-cyan)] pb-2 inline-block">
                // TERMINAL JALUR CEPET
              </h3>
              <HeroQuickCheck />
            </div>
          </div>

        </div>
      </section>

      {/* ═══ CYBER METRICS ═══ */}
      <section className="border-y border-[var(--neon-cyan)] bg-[rgba(0,243,255,0.02)] backdrop-blur-sm relative z-10 py-10 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center font-mono uppercase">
            <div>
              <p className="text-4xl font-bold text-[var(--neon-lime)] glitch-text">99.8%</p>
              <p className="text-xs text-slate-400 mt-2 tracking-widest">TEPAT WAKTU ASLI</p>
            </div>
            <div className="border-l border-[var(--neon-cyan)]/30">
              <p className="text-4xl font-bold text-[var(--neon-cyan)]">11_KEC</p>
              <p className="text-xs text-slate-400 mt-2 tracking-widest">AREA TERCOVER</p>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-[var(--neon-cyan)]/30 pt-8 md:pt-0">
              <p className="text-4xl font-bold text-[var(--neon-yellow)]">GRATIS</p>
              <p className="text-xs text-slate-400 mt-2 tracking-widest">KAGAK ADA BIAYA ADMIN</p>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-[var(--neon-cyan)]/30 pt-8 md:pt-0">
              <p className="text-4xl font-bold text-[var(--neon-pink)]">24/7</p>
              <p className="text-xs text-slate-400 mt-2 tracking-widest">BOT NYALA TERUS</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CYBER FEATURES ═══ */}
      <section className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-black text-white mb-4 uppercase tracking-tighter">
              <span className="text-[var(--neon-pink)]">//</span> FITUR GAHAR KITA
            </h2>
            <p className="text-slate-400 font-mono">Biar urusan sampah lu aman terkendali, santai aja coy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* ... Existing 3 cards ... */}
            <div className="cyber-box">
              <h3 className="font-mono text-xl font-bold text-[var(--neon-cyan)] mb-3 uppercase">&gt; DIANGKUT_OTOMATIS</h3>
              <p className="text-slate-400 text-sm font-mono leading-relaxed mb-6">
                Tim armada bakal gaspol ngambil langsung ke depan rumah lu sesuai jadwal. Kagak bakal kelewatan.
              </p>
              <div className="p-3 border border-[var(--neon-cyan)] bg-[rgba(0,243,255,0.05)] text-center text-xs font-mono text-[var(--neon-cyan)]">
                [JADWAL: 2x / MINGGU, PASTINYA]
              </div>
            </div>

            <div className="cyber-box cyber-box-pink">
              <h3 className="font-mono text-xl font-bold text-[var(--neon-pink)] mb-3 uppercase">&gt; BAYAR_SEGINI_DOANG</h3>
              <p className="text-slate-400 text-sm font-mono leading-relaxed mb-6">
                Kagak ada pungli-punglian. Sistem motong saldo lu transparan parah, bener-bener flat rate.
              </p>
              <div className="p-3 border border-[var(--neon-pink)] bg-[rgba(255,0,234,0.05)] text-center text-xs font-mono text-[var(--neon-pink)]">
                [TARIF: GOCAP SEBULAN]
              </div>
            </div>

            <div className="cyber-box" style={{ borderColor: 'var(--neon-yellow)' }}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--neon-yellow)] shadow-[0_0_15px_var(--neon-yellow)]" />
              <h3 className="font-mono text-xl font-bold text-[var(--neon-yellow)] mb-3 uppercase">&gt; DICHAT_SAMA_BOT</h3>
              <p className="text-slate-400 text-sm font-mono leading-relaxed mb-6">
                Bot WA kita rajin banget ngingetin bayar, plus ngirim kuitansi digital kalau lu udah lunas. Mantap kan?
              </p>
              <div className="p-3 border border-[var(--neon-yellow)] bg-[rgba(252,238,10,0.05)] text-left text-[10px] font-mono text-[var(--neon-yellow)]">
                &gt; WA DARI BOT: <br/>
                &quot;Woy ngab, tagihan lu udah LUNAS yee. Tengkyu!&quot;
              </div>
            </div>
          </div>

          {/* COMPLAINT FEATURE */}
          <div className="mt-8 border border-red-500 bg-[rgba(255,0,0,0.05)] p-8 shadow-[0_0_15px_rgba(255,0,0,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative overflow-hidden" style={{ clipPath: "polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))" }}>
            <div className="absolute top-0 left-0 w-2 h-full bg-red-500 shadow-[0_0_20px_red]" />
            <div className="space-y-4 max-w-2xl pl-4 relative z-10">
              <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-3 py-1.5 border border-red-500/20 tracking-[0.2em] uppercase">
                &gt; SISTEM_KOMPLAIN_DARURAT
              </span>
              <h3 className="font-display text-2xl font-bold text-white uppercase">
                Sampah Lu Kelewat? <span className="text-red-500 glitch-text">NGADU DIMARI!</span>
              </h3>
              <p className="text-slate-400 text-sm font-mono leading-relaxed">
                Tukang sampah lupa mampir? Kagak usah emosi, coy! Lapor aja langsung di portal, tim armada yang lagi muter bakal langsung meluncur ke rumah lu hari itu juga.
              </p>
            </div>
            
            <Link
              href="/pengaduan"
              className="shrink-0 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-black font-mono text-sm font-bold px-8 py-4 uppercase transition-all shadow-[0_0_20px_rgba(255,0,0,0.5)] relative z-10"
              style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))" }}
            >
              [ LAPOR_SEKARANG ]
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 border-t border-[var(--neon-cyan)] bg-black relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs uppercase text-[var(--neon-cyan)]">
          <div className="flex items-center gap-4">
            <span className="font-bold tracking-widest text-[var(--neon-pink)]">O₂W_HERO_ASLI_DEPOK</span>
            <span className="opacity-50">© 2077</span>
          </div>
          <div className="flex gap-6">
            <Link href="/bayar" className="hover:text-[var(--neon-pink)] hover:animate-pulse transition-colors">[ BAYAR_DIMARI ]</Link>
            <Link href="/pengaduan" className="hover:text-[var(--neon-yellow)] hover:animate-pulse transition-colors">[ NGADU_KEMARI ]</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
