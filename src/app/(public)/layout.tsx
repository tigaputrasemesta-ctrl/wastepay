import type { Metadata } from "next";
import Link from "next/link";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";

export const metadata: Metadata = {
  title: {
    default: "Portal Layanan Warga | UPS HERU WastePay Depok",
    template: "%s | UPS HERU WastePay Depok",
  },
  description:
    "Portal resmi layanan warga Kota Depok: pendaftaran jemput sampah, cek & bayar tagihan retribusi, pelacakan armada truk sampah, dan pusat pengaduan kebersihan.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Notification Banner (Civic Info) */}
      <div className="bg-emerald-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Layanan Pengelolaan Sampah Terpadu & Pembayaran Retribusi Digital Kota Depok</span>
      </div>

      {/* Modern Clean Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <AnimatedDumpTruck size="xs" theme="white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                  UPS HERU<span className="text-emerald-600">.</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Depok
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Sistem Retribusi Bersih</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/lacak" className="hover:text-emerald-600 transition-colors">Lacak Armada</Link>
            <Link href="/bayar" className="hover:text-emerald-600 transition-colors">Cek Tagihan</Link>
            <Link href="/tarif" className="hover:text-emerald-600 transition-colors">Tarif</Link>
            <Link href="/pengaduan" className="hover:text-emerald-600 transition-colors">Pengaduan</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/daftar"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
            >
              Daftar Warga Baru
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Masuk Petugas
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Modern Trustworthy Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="flex-1 max-w-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <AnimatedDumpTruck size="xs" theme="white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                UPS HERU<span className="text-emerald-600">.</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Sistem Pengelolaan Sampah & Retribusi Terpadu Kota Depok. Layanan jemput sampah terjadwal, pelacakan armada transparan, dan pembayaran iuran bulanan yang mudah.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                🏛️ Binaan Dinas Lingkungan Hidup Kota Depok
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs font-medium">
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Layanan Warga</p>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/lacak" className="hover:text-emerald-600">Lacak Truk Sampah</Link></li>
                <li><Link href="/bayar" className="hover:text-emerald-600">Cek Tagihan Bulanan</Link></li>
                <li><Link href="/tarif" className="hover:text-emerald-600">Daftar Paket Retribusi</Link></li>
                <li><Link href="/pengaduan" className="hover:text-emerald-600">Lapor Sampah Menumpuk</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Pendaftaran</p>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/daftar" className="hover:text-emerald-600">Daftar Rumah Tangga</Link></li>
                <li><Link href="/daftar" className="hover:text-emerald-600">Daftar Toko / Usaha</Link></li>
                <li><Link href="/daftar" className="hover:text-emerald-600">Kerjasama Pengurus RT/RW</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5 col-span-2 sm:col-span-1">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Kontak Bantuan</p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <a href="https://wa.me/6281400782617" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline">
                    <span>💬</span> WhatsApp Bot 24 Jam
                  </a>
                </li>
                <li>Kota Depok, Jawa Barat</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <p>© 2026 UPS HERU Kota Depok. Hak Cipta Dilindungi.</p>
          <p className="font-medium">Menuju Depok Bebas Sampah (Zero Waste City)</p>
        </div>
      </footer>
    </div>
  );
}
