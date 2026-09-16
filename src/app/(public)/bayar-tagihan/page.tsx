"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function BayarTagihanRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/bayar${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-4 animate-bounce">
        💳
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        Memindahkan ke Portal Pembayaran Resmi
      </h2>
      <p className="text-xs text-slate-500 max-w-sm mb-4">
        Halaman pembayaran telah disederhanakan ke dalam satu portal resmi yang terpadu.
      </p>
      <Link
        href={`/bayar${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
      >
        Lanjutkan Pembayaran &rarr;
      </Link>
    </div>
  );
}

export default function BayarTagihanPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-500 font-medium text-xs">Memuat portal pembayaran...</div>}>
      <BayarTagihanRedirectContent />
    </Suspense>
  );
}
