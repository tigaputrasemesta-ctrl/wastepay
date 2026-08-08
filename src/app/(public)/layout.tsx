import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O2W Hero Zero Waste - Manajemen Iuran Sampah",
  description: "Layanan pengelolaan sampah rutin & terjadwal untuk warga",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-asphalt text-bone">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-asphalt-deep/90 backdrop-blur border-b border-asphalt-line">
        <div className="hazard h-1 opacity-80" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 chamfer-sm bg-vest flex items-center justify-center">
                <span className="font-display text-[11px] text-asphalt-deep leading-none tracking-tight">O2W</span>
              </div>
              <span className="flex flex-col leading-none">
                <span className="font-display text-lg text-bone tracking-wide group-hover:text-vest transition-colors">O2W Hero Zero Waste</span>
                <span className="stencil text-[9px] text-bone-faint mt-1">Unit Pengelola Sampah · Kota Depok</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-7">
              <Link href="/bayar" className="stencil text-bone-dim hover:text-vest transition-colors">
                Cek Tagihan
              </Link>
              <Link href="/tarif" className="stencil text-bone-dim hover:text-vest transition-colors">
                Tarif
              </Link>
              <Link href="/daftar" className="stencil text-bone-dim hover:text-vest transition-colors">
                Daftar
              </Link>
              <Link href="/pengaduan" className="stencil text-danger hover:text-vest transition-colors">
                Lapor
              </Link>
              <Link
                href="/login"
                className="stencil text-bone-faint hover:text-vest transition-colors text-[10px]"
              >
                MASUK PENGELOLA
              </Link>
            </nav>
            {/* Mobile menu button */}
            <details className="md:hidden group">
              <summary className="list-none p-2 -mr-2 cursor-pointer text-bone-dim">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute top-full left-0 right-0 bg-asphalt-deep border-b border-asphalt-line shadow-2xl p-4 flex flex-col gap-2">
                <Link href="/bayar" className="stencil text-bone-dim hover:text-vest py-2">Cek Tagihan</Link>
                <Link href="/tarif" className="stencil text-bone-dim hover:text-vest py-2">Tarif</Link>
                <Link href="/daftar" className="stencil text-bone-dim hover:text-vest py-2">Daftar</Link>
                <Link href="/pengaduan" className="stencil text-danger hover:text-vest py-2">Lapor Sampah</Link>
                <Link href="/login" className="stencil text-bone-faint hover:text-vest py-2 text-[10px]">Masuk Pengelola</Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-asphalt-deep text-bone-dim border-t border-asphalt-line">
        <div className="hazard h-1 opacity-60" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 chamfer-sm bg-vest flex items-center justify-center">
                  <span className="font-display text-[10px] text-asphalt-deep leading-none tracking-tight">O2W</span>
                </div>
                <span className="font-display text-lg text-bone tracking-wide">O2W Hero Zero Waste</span>
              </div>
              <p className="text-sm leading-relaxed max-w-md text-bone-dim font-mono">
                Layanan pengangkutan sampah rutin untuk rumah tangga & usaha:
                pendaftaran, jadwal angkut, tagihan, dan pelaporan warga.
              </p>
            </div>
            <div>
              <h4 className="stencil text-bone mb-4">Layanan</h4>
              <ul className="space-y-2.5 text-sm font-mono">
                <li><Link href="/bayar" className="hover:text-vest transition-colors">Cek Tagihan</Link></li>
                <li><Link href="/tarif" className="hover:text-vest transition-colors">Tarif Layanan</Link></li>
                <li><Link href="/daftar" className="hover:text-vest transition-colors">Daftar Layanan</Link></li>
                <li><Link href="/pengaduan" className="text-danger hover:text-vest transition-colors">Lapor Sampah</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="stencil text-bone mb-4">Kontak</h4>
              <ul className="space-y-2.5 text-sm font-mono">
                <li>info.herozerowaste@gmail.com</li>
                <li>0857-1625-1003</li>
                <li className="pt-2"><Link href="/login" className="text-bone-faint hover:text-vest transition-colors text-xs">Masuk Pengelola →</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-asphalt-line mt-10 pt-8 flex flex-wrap items-center justify-between gap-3">
            <span className="stencil text-[9px] text-bone-faint">
              © {new Date().getFullYear()} Unit Pengelola Sampah — Kota Depok
            </span>
            <span className="stencil text-[9px] text-bone-faint flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-vest animate-blink" />
              Layanan aktif
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
