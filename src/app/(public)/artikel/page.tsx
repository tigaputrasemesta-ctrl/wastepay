import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { DEFAULT_ARTIKEL } from "@/lib/default-articles";
import ArtikelListClient, { ArticleItem } from "@/components/ArtikelListClient";

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
  const rawList = [...artikelList, ...fallbackList];

  const serializedArticles: ArticleItem[] = rawList.map((a) => ({
    id: a.id,
    slug: a.slug,
    judul: a.judul,
    isi: a.isi,
    kategori: a.kategori,
    gambar: a.gambar,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
    formattedDate: formatDate(a.createdAt),
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8 sm:py-12 px-4 sm:px-6 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="space-y-2 border-b border-slate-200/80 dark:border-zinc-800 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-extrabold uppercase tracking-wide border border-emerald-200/60 dark:border-emerald-800/60">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Pusat Edukasi & Informasi Lingkungan</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            Artikel & Tips Kebersihan Kota Depok
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Temukan panduan resmi penjemputan sampah, tarif retribusi transparan, regulasi kebersihan, dan cara pilah sampah bernilai rupiah bersama UPS HERU.
          </p>
        </div>

        {/* Interactive Search & Filter Client Component */}
        <ArtikelListClient articles={serializedArticles} />
      </div>
    </div>
  );
}
