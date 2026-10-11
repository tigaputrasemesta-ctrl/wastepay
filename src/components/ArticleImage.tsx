"use client";

import { useState } from "react";

interface ArticleImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackCategory?: string;
}

export default function ArticleImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackCategory = "informasi",
}: ArticleImageProps) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (hasError || !src) {
    const isTruck = fallbackCategory.toLowerCase().includes("informasi");
    const isRecycle = fallbackCategory.toLowerCase().includes("edukasi");
    const isResto = fallbackCategory.toLowerCase().includes("berita");

    return (
      <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-lg">
          <span className="text-2xl">
            {isTruck ? "🚛" : isRecycle ? "♻️" : isResto ? "🍽️" : "🌱"}
          </span>
        </div>
        
        <div className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-1">
          UPS HERU KOTA DEPOK
        </div>
        <div className="text-[11px] text-emerald-100/80 font-medium line-clamp-1 max-w-[280px]">
          {alt || "Layanan Kebersihan & Edukasi Lingkungan"}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      {!loaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
