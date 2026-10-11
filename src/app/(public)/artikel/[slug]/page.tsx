import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Share2, Sparkles, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { DEFAULT_ARTIKEL, getArticleCoverImage } from "@/lib/default-articles";
import ArticleImage from "@/components/ArticleImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  let artikel: {
    judul: string;
    isi: string;
    gambar: string | null;
    kategori?: string;
  } | null = null;

  try {
    artikel = await prisma.artikel.findUnique({
      where: { slug: resolvedParams.slug },
      select: { judul: true, isi: true, gambar: true, kategori: true },
    });
  } catch {
    // ignore
  }

  if (!artikel) {
    const fallback = DEFAULT_ARTIKEL.find((a) => a.slug === resolvedParams.slug);
    if (fallback) {
      const cover = getArticleCoverImage(fallback.gambar, fallback.kategori);
      return {
        title: `${fallback.judul} | UPS HERU Depok`,
        description: fallback.isi.slice(0, 160).replace(/[#*•]/g, ""),
        openGraph: { images: [cover] },
      };
    }
    return { title: "Artikel Tidak Ditemukan | UPS HERU Depok" };
  }

  const cover = getArticleCoverImage(artikel.gambar, artikel.kategori);
  return {
    title: `${artikel.judul} | UPS HERU Depok`,
    description: artikel.isi.slice(0, 160).replace(/[#*•]/g, ""),
    openGraph: { images: [cover] },
  };
}

export default async function ArtikelDetail({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  let artikel: {
    id: number;
    slug: string;
    judul: string;
    isi: string;
    kategori: string;
    gambar: string | null;
    diterbitkan: boolean;
    createdAt: Date;
    penulis?: { nama: string } | null;
  } | null = null;

  try {
    artikel = await prisma.artikel.findUnique({
      where: { slug: resolvedParams.slug },
      include: { penulis: { select: { nama: true } } },
    });
  } catch {
    // ignore
  }

  if (!artikel || !artikel.diterbitkan) {
    const fallback = DEFAULT_ARTIKEL.find((a) => a.slug === resolvedParams.slug);
    if (fallback) {
      artikel = {
        ...fallback,
        penulis: { nama: fallback.penulisNama },
      };
    } else {
      notFound();
    }
  }

  const coverImage = getArticleCoverImage(artikel.gambar, artikel.kategori);
  const wordCount = artikel.isi.split(/\s+/).length;
  const readMinutes = Math.max(2, Math.ceil(wordCount / 180));

  const shareText = encodeURIComponent(
    `${artikel.judul}\n\nBaca panduan lengkapnya dari UPS HERU Kota Depok:\nhttps://upsheru.com/artikel/${artikel.slug}`
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-14 px-4 sm:px-6">
      <article className="max-w-3xl mx-auto space-y-8 bg-white p-6 sm:p-12 rounded-3xl border border-slate-200/90 shadow-sm">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <Link
            href="/artikel"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Artikel</span>
          </Link>

          <a
            href={`https://api.whatsapp.com/send?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-full"
            title="Bagikan artikel ini ke WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bagikan</span>
          </a>
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1 bg-emerald-100/80 text-emerald-800 font-extrabold rounded-full tracking-wide uppercase text-[11px]">
              {artikel.kategori}
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{readMinutes} Menit Baca</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            {artikel.judul}
          </h1>

          <div className="flex items-center gap-3 pt-2 text-xs sm:text-sm text-slate-500">
            <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              UPS
            </div>
            <div>
              <div className="font-bold text-slate-900">{artikel.penulis?.nama || "Tim Editorial UPS HERU"}</div>
              <div className="text-[11px] text-slate-500">
                Dipublikasikan pada {formatDate(artikel.createdAt)} • Kota Depok
              </div>
            </div>
          </div>
        </header>

        {/* Main Cover Photo */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs aspect-video max-h-[440px] bg-slate-900">
          <ArticleImage
            src={coverImage}
            alt={artikel.judul}
            fallbackCategory={artikel.kategori}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between text-white/95 text-[11px] font-medium backdrop-blur-md bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/20 z-10">
            <span>Foto: Layanan Kebersihan & Edukasi Lingkungan UPS HERU</span>
            <span className="hidden sm:inline-block">Kota Depok</span>
          </div>
        </div>

        {/* Article Body Content */}
        <RenderIsiArtikel isi={artikel.isi} />

        {/* Call to Action Box */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold tracking-wide uppercase text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Layanan Resmi TPS 3R UPS HERU Depok</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Butuh Layanan Angkut Sampah di Wilayah Anda?
          </h3>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Armada truk dan pickup kami siap melayani penjemputan sampah rutin komplek RT/RW, penjemputan on-demand sampah besar (kasur & puing), hingga limbah restoran di seluruh Kota Depok.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="https://wa.me/6281400782617?text=Halo%20UPS%20HERU,%20saya%20tertarik%20dengan%20layanan%20pengangkutan%20sampah"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-xl bg-white text-emerald-900 font-extrabold text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>💬 Hubungi via WhatsApp</span>
            </a>
            <Link
              href="/bayar"
              className="px-5 py-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm border border-emerald-500/40 transition-all inline-flex items-center gap-2"
            >
              <span>💳 Cek & Bayar Tagihan</span>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

function RenderIsiArtikel({ isi }: { isi: string }) {
  const blocks = isi.split(/\n\s*\n/);

  return (
    <div className="space-y-6 text-slate-700 leading-relaxed text-base sm:text-lg">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // 1. Gambar Markdown: ![alt](url)
        const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          const alt = imgMatch[1];
          const src = imgMatch[2];
          return (
            <figure key={idx} className="my-8 rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-900">
              <ArticleImage
                src={src}
                alt={alt || "Foto Ilustrasi UPS HERU"}
                className="w-full h-auto max-h-[460px] object-cover"
              />
              {alt && (
                <figcaption className="p-3 text-center text-xs text-slate-300 font-medium bg-slate-900/95 border-t border-slate-800">
                  📸 {alt}
                </figcaption>
              )}
            </figure>
          );
        }

        // 2. Heading: ###
        if (trimmed.startsWith("### ")) {
          return (
            <div key={idx} className="pt-6 pb-2 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-emerald-600 rounded-full shrink-0" />
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {trimmed.replace(/^###\s+/, "")}
              </h3>
            </div>
          );
        }

        // 3. Heading: ##
        if (trimmed.startsWith("## ")) {
          return (
            <div key={idx} className="pt-8 pb-3 border-b border-slate-200 flex items-center gap-2.5">
              <div className="w-2 h-7 bg-emerald-700 rounded-full shrink-0" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {trimmed.replace(/^##\s+/, "")}
              </h2>
            </div>
          );
        }

        // 4. Baris-baris Bullet Points (dimulai dengan • atau - atau *)
        const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
        const isBulletList = lines.length > 0 && lines.every((l) => /^[•\-\*]\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={idx} className="space-y-3 my-4">
              {lines.map((line, lIdx) => {
                const bulletText = line.replace(/^[•\-\*]\s+/, "");
                return (
                  <li
                    key={lIdx}
                    className="flex items-start gap-3 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 text-slate-700 text-sm sm:text-base leading-relaxed"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      {renderFormattedInline(bulletText)}
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }

        // 5. Baris-baris Numbered List (dimulai dengan 1., 2., dst)
        const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l));

        if (isNumberedList) {
          return (
            <ol key={idx} className="space-y-3.5 my-4">
              {lines.map((line, lIdx) => {
                const matchNum = line.match(/^(\d+)\.\s+(.*)/);
                const num = matchNum ? matchNum[1] : String(lIdx + 1);
                const itemText = matchNum ? matchNum[2] : line;
                return (
                  <li
                    key={lIdx}
                    className="flex items-start gap-3.5 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/90 text-slate-800 text-sm sm:text-base leading-relaxed"
                  >
                    <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 font-extrabold text-xs shadow-xs mt-0.5">
                      {num}
                    </div>
                    <div className="flex-1">
                      {renderFormattedInline(itemText)}
                    </div>
                  </li>
                );
              })}
            </ol>
          );
        }

        // 6. Paragraf biasa dengan parsing bold dan italic
        return (
          <p key={idx} className="leading-relaxed text-slate-700 text-base sm:text-lg">
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderFormattedInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-extrabold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
