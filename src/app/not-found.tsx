import Link from "next/link";
import { ArrowLeft, Home, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans flex flex-col items-center justify-center p-6 selection:bg-red-500 selection:text-white">
      <div className="max-w-md w-full bg-white border-4 border-black p-8 md:p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] text-center">
        <div className="w-16 h-16 bg-yellow-400 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <FileQuestion className="w-8 h-8 text-black" />
        </div>
        
        <div className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
          Error 404
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tight mb-4">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-neutral-700 font-medium mb-8 text-sm leading-relaxed">
          Halaman atau tautan yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="hm-btn-red py-3 text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <Link
            href="/bayar"
            className="hm-btn py-3 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Cek Status Tagihan
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
        TPS HERU · Depok 2026
      </div>
    </div>
  );
}
