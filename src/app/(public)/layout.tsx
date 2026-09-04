import type { Metadata } from "next";
import Link from "next/link";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";

export const metadata: Metadata = {
  title: "O₂W Hero - Portal Warga Depok",
  description: "Sistem Manajemen Sampah Human Made Depok",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Marquee Banner */}
      <div className="hm-marquee text-lg font-bold uppercase tracking-[0.2em] sticky top-0 z-50">
        <div className="hm-marquee-content">
          <span>O₂W HERO ZERO WASTE</span>
          <AnimatedDumpTruck size="xs" theme="green" />
          <span>DEPOK BERSIH 2026</span>
          <AnimatedDumpTruck size="xs" theme="yellow" />
          <span>SISTEM PENGELOLAAN SAMPAH</span>
          <AnimatedDumpTruck size="xs" theme="red" />
          <span>O₂W HERO ZERO WASTE</span>
          <AnimatedDumpTruck size="xs" theme="green" />
          <span>DEPOK BERSIH 2026</span>
          <AnimatedDumpTruck size="xs" theme="yellow" />
          <span>SISTEM PENGELOLAAN SAMPAH</span>
          <AnimatedDumpTruck size="xs" theme="red" />
        </div>
      </div>

      {/* HM Navbar */}
      <nav className="border-b-2 border-black px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-white z-40 relative sticky top-[52px]">
        <div className="flex items-center gap-3">
          <AnimatedDumpTruck size="md" theme="green" />
          <span className="text-3xl font-black tracking-tighter">O₂W HERO.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 font-bold uppercase tracking-widest text-sm">
          <Link href="/lacak" className="hover:text-green-600 transition-colors">Lacak</Link>
          <Link href="/bayar" className="hover:text-red-600 transition-colors">Tagihan</Link>
          <Link href="/tarif" className="hover:text-green-600 transition-colors">Tarif</Link>
          <Link href="/pengaduan" className="hover:text-red-600 transition-colors">Komplain</Link>
          <Link href="/daftar" className="text-green-600 hover:text-black transition-colors">Daftar</Link>
          <Link href="/login" className="border-l-2 border-black pl-6 hover:text-blue-600 transition-colors">Admin Login</Link>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        {children}
      </main>

      {/* HM Footer */}
      <footer className="mt-20 border-t-4 border-black bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          {/* Brand Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-black text-white p-2 border-2 border-black">
                <AnimatedDumpTruck size="sm" theme="white" />
              </div>
              <span className="text-3xl font-black tracking-tighter uppercase">O₂W HERO.</span>
            </div>
            <p className="font-bold text-sm max-w-sm leading-snug uppercase border-l-4 border-black pl-4 py-1">
              SISTEM PENGELOLAAN SAMPAH OTOMATIS KOTA DEPOK. JADWAL PASTI, BAYAR GAMPANG, LINGKUNGAN BERSIH.
            </p>
          </div>
          
          {/* Brutalist Links Grid */}
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex flex-col gap-3">
              <Link href="/lacak" className="bg-green-400 border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">Lacak Jemputan</Link>
              <Link href="/bayar" className="bg-yellow-300 border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">Cek Tagihan</Link>
              <Link href="/tarif" className="bg-white border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">Daftar Tarif</Link>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/daftar" className="bg-white border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">Gabung O2W</Link>
              <Link href="/pengaduan" className="bg-red-400 border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">Lapor Sampah</Link>
              <a href="https://wa.me/6281400782617" target="_blank" rel="noreferrer" className="bg-blue-300 border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
                💬 BOT WA
              </a>
            </div>
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t-4 border-black flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="bg-black text-white px-6 py-3 border-2 border-black shadow-[4px_4px_0_0_#ef4444]">
            <span className="text-xs font-black uppercase tracking-widest">© 2026 HERO ZERO WASTE DEPOK</span>
          </div>
          <div className="bg-white px-4 py-2 border-2 border-black border-dashed font-black uppercase text-xs tracking-widest">
            EST. 2024
          </div>
        </div>
      </footer>
    </div>
  );
}
