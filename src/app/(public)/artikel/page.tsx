import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { DEFAULT_ARTIKEL } from "@/lib/default-articles";

export const metadata: Metadata = {
  title: "Artikel & Edukasi Lingkungan | UPS HERU Depok",
  description: "Kumpulan artikel, jadwal pengangkutan sampah, dan tips kebersihan dari UPS HERU untuk warga Depok.",
};

export const dynamic = "force-dynamic";

export default async function ArtikelPage() {
  let artikelList: Array<{
    id: number;
    slug: string;
    judul: string;
    isi: string;
    kategori: string;
    gambar: string | null;
    createdAt: Date;
  }> = [];

  try {
    artikelList = await prisma.artikel.findMany({
      where: { diterbitkan: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // ignore
  }

  const displayedList = artikelList.length > 0 ? artikelList : DEFAULT_ARTIKEL;

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

        <div className="grid gap-6">
          {displayedList.map((artikel) => (
              <div key={artikel.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-6 hover:shadow-md transition-shadow">
                {artikel.gambar ? (
                  <img src={artikel.gambar} alt={artikel.judul} className="w-full sm:w-48 h-32 rounded-2xl object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-full sm:w-48 h-32 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                    <span className="text-4xl">📰</span>
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-bold text-emerald-600 mb-2">
                    {artikel.kategori.charAt(0).toUpperCase() + artikel.kategori.slice(1)} • {formatDate(artikel.createdAt)}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{artikel.judul}</h2>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{artikel.isi}</p>
                  <Link href={`/artikel/${artikel.slug}`} className="text-sm font-bold text-emerald-700 hover:underline">
                    Baca selengkapnya &rarr;
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
