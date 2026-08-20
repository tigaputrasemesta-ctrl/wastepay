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
      <footer className="mt-20 border-t-2 border-black bg-[#f4f4f0] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <AnimatedDumpTruck size="sm" theme="black" />
              <span className="text-2xl font-black tracking-tighter uppercase">O₂W HERO.</span>
            </div>
            <p className="font-medium max-w-sm leading-snug">
              SISTEM PENGELOLAAN SAMPAH OTOMATIS KOTA DEPOK. JADWAL PASTI, BAYAR GAMPANG, LINGKUNGAN BERSIH.
            </p>
          </div>
          
          <div className="flex gap-12 font-bold uppercase tracking-widest text-sm">
            <div className="flex flex-col gap-3">
              <Link href="/lacak" className="hover:text-green-600">Lacak Jemputan</Link>
              <Link href="/bayar" className="hover:text-red-600">Cek Tagihan</Link>
              <Link href="/tarif" className="hover:text-red-600">Daftar Tarif</Link>
              <Link href="/daftar" className="hover:text-green-600">Gabung O2W</Link>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/pengaduan" className="hover:text-red-600">Lapor Sampah</Link>
              <span>Bot WA: 0857-1625-1003</span>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t-2 border-black flex justify-between font-bold uppercase text-xs tracking-widest">
          <span>© 2026 HERO ZERO WASTE DEPOK</span>
          <span>EST. 2024</span>
        </div>
      </footer>
    </div>
  );
}
