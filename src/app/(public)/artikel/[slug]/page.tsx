import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const artikel = await prisma.artikel.findUnique({ where: { slug: resolvedParams.slug } });
  
  if (!artikel) {
    return { title: "Artikel Tidak Ditemukan | UPS HERU Depok" };
  }

  return {
    title: `${artikel.judul} | UPS HERU Depok`,
    description: artikel.isi.slice(0, 160),
    openGraph: artikel.gambar ? { images: [artikel.gambar] } : undefined,
  };
}

export default async function ArtikelDetail({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const artikel = await prisma.artikel.findUnique({
    where: { slug: resolvedParams.slug },
    include: { penulis: { select: { nama: true } } },
  });

  if (!artikel || (!artikel.diterbitkan)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm">
        <Link href="/artikel" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Artikel</span>
        </Link>
        
        <header className="space-y-4 border-b border-slate-100 pb-8">
          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full">
            {artikel.kategori.charAt(0).toUpperCase() + artikel.kategori.slice(1)}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {artikel.judul}
          </h1>
          <div className="text-sm font-medium text-slate-500">
            Dipublikasikan pada {formatDate(artikel.createdAt)} • Oleh {artikel.penulis?.nama || "Tim UPS HERU"}
          </div>
        </header>

        {artikel.gambar && (
          <div className="w-full">
            <img src={artikel.gambar} alt={artikel.judul} className="w-full rounded-2xl object-cover max-h-96 border border-slate-200" />
          </div>
        )}

        <article className="prose prose-slate prose-emerald max-w-none text-slate-700 whitespace-pre-wrap">
          {artikel.isi}
        </article>
      </div>
    </div>
  );
}
