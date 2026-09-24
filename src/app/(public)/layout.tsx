import type { Metadata } from "next";
import Link from "next/link";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";
import PublicNavbar from "@/components/PublicNavbar";

export const metadata: Metadata = {
  title: {
    default: "Portal Layanan Warga | UPS HERU Depok",
    template: "%s | UPS HERU Depok",
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-800 selection:text-white">
      {/* Top Notification Banner (Civic Info) */}
      <section
        aria-label="Informasi Layanan"
        className="bg-emerald-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Mitra Pengangkutan Sampah & Retribusi Warga Depok</span>
      </section>

      {/* Modern Responsive Navbar (Desktop + Mobile Drawer) */}
      <PublicNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Modern Trustworthy Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="flex-1 max-w-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                <AnimatedDumpTruck size="xs" theme="white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                UPS HERU<span className="text-emerald-700">.</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Sistem Pengelolaan Sampah & Retribusi Terpadu Kota Depok. Layanan jemput sampah terjadwal, pelacakan armada transparan, dan pembayaran iuran bulanan yang mudah.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs font-medium">
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Layanan Warga</p>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/lacak" className="hover:text-emerald-800">Lacak Truk Sampah</Link></li>
                <li><Link href="/bayar" className="hover:text-emerald-800">Cek Tagihan Bulanan</Link></li>
                <li><Link href="/tarif" className="hover:text-emerald-800">Daftar Paket Retribusi</Link></li>
                <li><Link href="/pengaduan" className="hover:text-emerald-800">Lapor Sampah Menumpuk</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Pendaftaran</p>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/daftar" className="hover:text-emerald-800">Daftar Rumah Tangga</Link></li>
                <li><Link href="/daftar" className="hover:text-emerald-800">Daftar Toko / Usaha</Link></li>
                <li><Link href="/daftar" className="hover:text-emerald-800">Kerjasama Pengurus RT/RW</Link></li>
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

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <p>© 2026 UPS HERU Kota Depok. Hak Cipta Dilindungi.</p>
          <p className="font-medium">Menuju Depok Bebas Sampah (Zero Waste City)</p>
        </div>
      </footer>
    </div>
  );
}
