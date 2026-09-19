import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const title = resolvedParams.slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return {
    title: `${title} | UPS HERU Depok`,
    description: `Baca selengkapnya tentang ${title} di portal informasi UPS HERU Depok.`,
  };
}

export default async function ArtikelDetail({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const title = resolvedParams.slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm">
        <Link href="/artikel" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Artikel</span>
        </Link>
        
        <header className="space-y-4 border-b border-slate-100 pb-8">
          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full">
            Berita & Edukasi
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
          <div className="text-sm font-medium text-slate-500">
            Dipublikasikan pada September 2026 • Oleh Tim UPS HERU
          </div>
        </header>

        <article className="prose prose-slate prose-emerald max-w-none">
          <p className="lead text-lg text-slate-600">
            Ini adalah halaman contoh (placeholder) untuk artikel dengan tautan <strong>{resolvedParams.slug}</strong>.
            Nantinya, Anda bisa menghubungkan halaman ini dengan database (seperti CMS atau Prisma) agar isi beritanya bisa diubah-ubah dari dashboard admin.
          </p>
          <p>
            Dengan adanya halaman artikel terpisah seperti ini, Google akan lebih mudah menemukan kata kunci yang spesifik, seperti lokasi "Cilodong", "Depok", dan topik "Pengelolaan Sampah".
          </p>
          <h3>Mengapa ini penting untuk SEO?</h3>
          <ul>
            <li>Menambah jumlah halaman di website yang bisa di-index Google.</li>
            <li>Memungkinkan Anda menargetkan <em>long-tail keywords</em>.</li>
            <li>Memberikan nilai edukasi bagi warga, sehingga mereka lebih lama berada di website.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
