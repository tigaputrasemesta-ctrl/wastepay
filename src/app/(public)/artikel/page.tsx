import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, ArrowRight, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { DEFAULT_ARTIKEL, getArticleCoverImage, cleanArticleSnippet } from "@/lib/default-articles";

export const metadata: Metadata = {
  title: "Artikel & Edukasi Lingkungan | UPS HERU Depok",
  description: "Kumpulan artikel, jadwal pengangkutan sampah, dan panduan kebersihan dari UPS HERU untuk warga Kota Depok.",
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

  // Gabungkan artikel dari database dengan artikel SEO unggulan (hindari duplikasi slug)
  const existingSlugs = new Set(artikelList.map((a) => a.slug));
  const fallbackList = DEFAULT_ARTIKEL.filter((a) => !existingSlugs.has(a.slug));
  const displayedList = [...artikelList, ...fallbackList];

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="space-y-2 border-b border-slate-200/80 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-xs font-extrabold uppercase tracking-wide">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pusat Edukasi & Informasi Lingkungan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Artikel & Tips Kebersihan Kota Depok
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Temukan panduan resmi penjemputan sampah, tarif retribusi transparan, regulasi kebersihan, dan cara pilah sampah bernilai rupiah bersama UPS HERU.
          </p>
        </div>

        <div className="grid gap-6">
          {displayedList.map((artikel) => {
            const cover = getArticleCoverImage(artikel.gambar, artikel.kategori);
            const snippet = cleanArticleSnippet(artikel.isi, 160);
            const wordCount = artikel.isi.split(/\s+/).length;
            const readMinutes = Math.max(2, Math.ceil(wordCount / 180));

            return (
              <Link
                key={artikel.id}
                href={`/artikel/${artikel.slug}`}
                className="group bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-6 hover:shadow-md hover:border-emerald-300 transition-all"
              >
                <div className="w-full sm:w-56 h-48 sm:h-36 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-900 relative">
                  <img
                    src={cover}
                    alt={artikel.judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase rounded-md">
                    {artikel.kategori}
                  </span>
                </div>

                <div className="flex flex-col justify-between flex-1 space-y-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-1.5">
                      <span>{formatDate(artikel.createdAt)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{readMinutes} Menit</span>
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {artikel.judul}
                    </h2>
                    <p className="text-slate-600 text-sm mt-2 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                    <span>Baca Panduan Selengkapnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
