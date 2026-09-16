"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TransitRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/kendaraan?tab=transit");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-4 animate-bounce">
        📍
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        Memindahkan ke Armada & Fasilitas
      </h2>
      <p className="text-xs text-slate-500 max-w-sm mb-4">
        Manajemen Titik Transit (TPST) kini telah disatukan di halaman Armada & Fasilitas.
      </p>
      <Link
        href="/kendaraan?tab=transit"
        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
      >
        Buka Titik Transit &rarr;
      </Link>
    </div>
  );
}
