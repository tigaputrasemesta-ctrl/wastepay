"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Clock, ArrowRight, BookOpen, FileQuestion } from "lucide-react";
import ArticleImage from "@/components/ArticleImage";
import { getArticleCoverImage, cleanArticleSnippet } from "@/lib/default-articles";

export interface ArticleItem {
  id: number;
  slug: string;
  judul: string;
  isi: string;
  kategori: string;
  gambar: string | null;
  createdAt: string;
  formattedDate: string;
}

const CATEGORY_TABS = ["Semua", "Panduan", "Informasi", "Edukasi", "Berita"];

export default function ArtikelListClient({
  articles,
}: {
  articles: ArticleItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return articles.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua" ||
        item.kategori.toLowerCase() === selectedCategory.toLowerCase();

      const matchQuery =
        !q ||
        item.judul.toLowerCase().includes(q) ||
        item.isi.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q);

      return matchCategory && matchQuery;
    });
  }, [articles, searchQuery, selectedCategory]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul artikel, topik, atau kata kunci (cth: 'qris', 'jadwal', 'kompos')..."
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills & Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedCategory(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all min-h-[36px] flex items-center ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-zinc-700"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Menampilkan <span className="font-bold text-slate-800 dark:text-zinc-200">{filteredArticles.length}</span> artikel
          </div>
        </div>
      </div>

      {/* Article List or Empty State */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FileQuestion className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100">
              Tidak Ada Artikel yang Cocok
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
              Tidak ditemukan artikel dengan kata kunci &ldquo;{searchQuery}&rdquo;
              {selectedCategory !== "Semua" ? ` pada kategori ${selectedCategory}` : ""}. Coba gunakan kata kunci lain atau reset filter.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all"
            >
              <span>Reset Pencarian</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:gap-6">
          {filteredArticles.map((artikel) => {
            const cover = getArticleCoverImage(artikel.gambar, artikel.kategori);
            const snippet = cleanArticleSnippet(artikel.isi, 160);
            const wordCount = artikel.isi.split(/\s+/).length;
            const readMinutes = Math.max(2, Math.ceil(wordCount / 180));

            return (
              <Link
                key={artikel.id}
                href={`/artikel/${artikel.slug}`}
                className="group bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-5 sm:gap-6 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
              >
                <div className="w-full sm:w-56 h-48 sm:h-36 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 dark:border-zinc-700 bg-slate-900 relative">
                  <ArticleImage
                    src={cover}
                    alt={artikel.judul}
                    fallbackCategory={artikel.kategori}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-xs font-extrabold uppercase rounded-md z-10">
                    {artikel.kategori}
                  </span>
                </div>

                <div className="flex flex-col justify-between flex-1 space-y-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 font-semibold mb-1.5">
                      <span>{artikel.formattedDate}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span>{readMinutes} Menit</span>
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {artikel.judul}
                    </h2>
                    <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Baca Panduan Selengkapnya</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
