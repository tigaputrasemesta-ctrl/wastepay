import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import CoverageExplorer from "@/components/coverage/CoverageExplorer";

export const metadata: Metadata = {
  title: "Peta Wilayah Layanan & Jadwal Angkut — UPS HERU Kota Depok",
  description:
    "Cek jangkauan rute truk sampah UPS HERU di Kota Depok. Pemetaan wilayah operasional terlayani rutin di Kalibaru, Cilodong, Kalimulya, dan Jatimulya.",
  alternates: {
    canonical: "https://upsheru.com/coverage",
  },
  keywords: [
    "peta wilayah layanan sampah depok",
    "jadwal angkut sampah kalibaru",
    "rute truk sampah cilodong",
    "retribusi sampah depok",
    "jasa angkut sampah depok",
    "ups heru coverage",
    "jadwal truk sampah depok",
  ],
  openGraph: {
    title: "Peta Wilayah Layanan & Jadwal Angkut — UPS HERU Kota Depok",
    description:
      "Cek jangkauan rute truk sampah UPS HERU di Kota Depok. Pemetaan wilayah operasional terlayani rutin di Kalibaru, Cilodong, Kalimulya, dan Jatimulya.",
    url: "https://upsheru.com/coverage",
    type: "website",
  },
};

export default function CoveragePage() {
  return (
    <div className="py-6 md:py-8 space-y-8">
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Cek Jangkauan Layanan</span>
        </nav>

        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Wilayah Layanan Aktif • Kota Depok</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Peta Wilayah Layanan & <span className="text-emerald-700">Jadwal Angkut.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Periksa apakah jalan rumah Anda sudah masuk rute rutin armada UPS HERU. Warga di area aktif dapat langsung mendaftar langganan secara online.
          </p>
        </div>
      </div>

      {/* ── UNIFIED COVERAGE EXPLORER (SEARCH + MAP + STATUS DETAIL + DAFTAR JALAN) ── */}
      <CoverageExplorer />

      {/* ── BANTUAN CS WHATSAPP BANNER (CLEAN & SIMPLE) ── */}
      <div className="p-4 sm:p-5 bg-emerald-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
            <span>💬</span>
            <span>Jalan Rumah Anda Belum Terdaftar atau Butuh Bantuan?</span>
          </h2>
          <p className="text-xs text-emerald-200">
            Petugas UPS HERU siap membantu memverifikasi titik lokasi atau usulan pembukaan rute baru via WhatsApp.
          </p>
        </div>
        <a
          href="https://wa.me/6281400782617?text=Halo%20CS%20UPS%20HERU,%20saya%20ingin%20menanyakan%20apakah%20alamat%20rumah%20saya%20sudah%20masuk%20area%20layanan%20pengangkutan%20sampah."
          target="_blank"
          rel="noreferrer"
          className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 shrink-0 shadow"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat CS WhatsApp (24 Jam)</span>
        </a>
      </div>
    </div>
  );
}
