import type { Metadata } from "next";
import Link from "next/link";
import O2WLogo from "@/components/O2WLogo";

export const metadata: Metadata = {
  title: "O₂W Hero - Portal Warga Depok",
  description: "Sistem Manajemen Sampah Cyberpunk Depok 2077",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Global Scanline effect */}
      <div className="scanline" />

      {/* Cyber Navbar */}
      <header className="sticky top-0 z-50 bg-[rgba(3,4,11,0.9)] backdrop-blur-md border-b border-[var(--neon-cyan)] shadow-[0_0_20px_rgba(0,243,255,0.2)]">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            <div className="hover:scale-105 transition-transform">
              <O2WLogo size="sm" href="/" />
            </div>

            <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase font-bold tracking-[0.1em]">
              <Link href="/bayar" className="text-slate-400 hover:text-[var(--neon-cyan)] hover:shadow-[0_0_10px_var(--neon-cyan)] transition-all">
                [ CEK_TAGIHAN ]
              </Link>
              <Link href="/tarif" className="text-slate-400 hover:text-[var(--neon-pink)] hover:shadow-[0_0_10px_var(--neon-pink)] transition-all">
                [ LIST_TARIF ]
              </Link>
              <Link href="/daftar" className="text-slate-400 hover:text-[var(--neon-yellow)] hover:shadow-[0_0_10px_var(--neon-yellow)] transition-all">
                [ DAFTAR_BARU ]
              </Link>
              <Link href="/pengaduan" className="text-[var(--neon-lime)] hover:text-red-500 hover:shadow-[0_0_10px_red] transition-all glitch-text">
                [ NGADU_DIMARI ]
              </Link>
            </nav>

            <Link href="/login" className="hidden md:inline-block border border-[var(--neon-cyan)] px-3 py-1.5 text-[9px] font-mono text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)] hover:text-black transition-all">
              ADMIN_LOGIN
            </Link>

            {/* Mobile menu button */}
            <details className="md:hidden group relative">
              <summary className="list-none p-2 cursor-pointer text-[var(--neon-cyan)] border border-[var(--neon-cyan)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute top-[120%] right-0 w-48 bg-black border border-[var(--neon-cyan)] shadow-[0_0_15px_var(--neon-cyan)] p-4 flex flex-col gap-4 font-mono text-[10px] uppercase font-bold text-slate-400 z-50">
                <Link href="/bayar" className="hover:text-[var(--neon-cyan)]">CEK TAGIHAN</Link>
                <Link href="/tarif" className="hover:text-[var(--neon-pink)]">LIST TARIF</Link>
                <Link href="/daftar" className="hover:text-[var(--neon-yellow)]">DAFTAR BARU</Link>
                <Link href="/pengaduan" className="text-red-500 hover:text-white">NGADU DIMARI</Link>
                <hr className="border-[var(--neon-cyan)] opacity-30" />
                <Link href="/login" className="text-[var(--neon-cyan)]">ADMIN LOGIN</Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Cyber Footer */}
      <footer className="bg-black border-t border-[var(--neon-pink)] mt-20 relative z-10 shadow-[0_-5px_20px_rgba(255,0,234,0.15)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--neon-pink)] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2 space-y-4">
              <O2WLogo size="sm" href="/" />
              <p className="text-sm leading-relaxed max-w-md text-slate-400 font-mono">
                &gt; SISTEM PENGELOLAAN SAMPAH OTOMATIS.<br/>
                &gt; KOTA DEPOK_2077.<br/>
                &gt; NO BULLSHIT, NO BAU, AMAN TERKENDALI.
              </p>
            </div>
            
            <div>
              <h4 className="font-mono text-[var(--neon-cyan)] mb-4 font-bold border-b border-[var(--neon-cyan)] pb-2 inline-block">/// LINK CEPAT</h4>
              <ul className="space-y-3 text-[10px] font-mono tracking-widest uppercase text-slate-400">
                <li><Link href="/bayar" className="hover:text-[var(--neon-cyan)] transition-colors">&gt; CEK TAGIHAN LU</Link></li>
                <li><Link href="/tarif" className="hover:text-[var(--neon-pink)] transition-colors">&gt; BIAYA BULANAN</Link></li>
                <li><Link href="/daftar" className="hover:text-[var(--neon-yellow)] transition-colors">&gt; DAFTAR MEMBER</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-mono text-[var(--neon-pink)] mb-4 font-bold border-b border-[var(--neon-pink)] pb-2 inline-block">/// BANTUAN</h4>
              <ul className="space-y-3 text-[10px] font-mono tracking-widest uppercase text-slate-400">
                <li className="text-[var(--neon-lime)] glitch-text"><Link href="/pengaduan" className="hover:text-red-500 transition-colors">&gt; LAPOR SAMPAH TELAT</Link></li>
                <li>BOT_WA: 0857-1625-1003</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
              © {new Date().getFullYear()} DEPOK UPS SYNDICATE
            </span>
            <span className="font-mono text-[9px] text-[var(--neon-cyan)] flex items-center gap-2 border border-[var(--neon-cyan)] px-2 py-1 bg-[rgba(0,243,255,0.05)]">
              <span className="w-1.5 h-1.5 bg-[var(--neon-cyan)] animate-pulse shadow-[0_0_5px_var(--neon-cyan)]" />
              SISTEM AMAN JAYA
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
