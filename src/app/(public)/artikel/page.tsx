import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Artikel & Edukasi Lingkungan | UPS HERU Depok",
  description: "Kumpulan artikel, jadwal pengangkutan sampah, dan tips kebersihan dari UPS HERU untuk warga Depok.",
};

export default function ArtikelPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Artikel & Tips Kebersihan
          </h1>
          <p className="text-slate-600 text-lg">
            Temukan informasi terbaru seputar layanan UPS HERU dan panduan memilah sampah di rumah Anda.
          </p>
        </div>

        {/* Placeholder List Artikel */}
        <div className="grid gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-48 h-32 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-4xl">🗓️</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-emerald-600 mb-2">Informasi Layanan • 18 September 2026</span>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Jadwal Pengangkutan Sampah di Cilodong Depok 2026</h2>
              <p className="text-slate-600 text-sm mb-4">Pembaruan jadwal operasional truk pengangkut sampah UPS HERU untuk wilayah Cilodong dan sekitarnya.</p>
              <Link href="/artikel/jadwal-pengangkutan-sampah-cilodong-depok" className="text-sm font-bold text-emerald-700 hover:underline">
                Baca selengkapnya &rarr;
              </Link>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-48 h-32 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-4xl">♻️</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-emerald-600 mb-2">Edukasi Warga • 15 September 2026</span>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Cara Benar Memilah Sampah Organik dan Anorganik di Rumah</h2>
              <p className="text-slate-600 text-sm mb-4">Langkah mudah memilah sampah dari dapur tangga untuk membantu proses daur ulang di TPS 3R.</p>
              <Link href="/artikel/cara-memilah-sampah-organik-anorganik" className="text-sm font-bold text-emerald-700 hover:underline">
                Baca selengkapnya &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
