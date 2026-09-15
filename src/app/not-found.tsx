import Link from "next/link";
import { ArrowLeft, Home, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center justify-center p-6 selection:bg-emerald-800 selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-700 shadow-sm">
          <FileQuestion className="w-8 h-8" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 mb-3">
          Error 404 • Halaman Tidak Ada
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Tautan yang Anda tuju salah, telah dipindahkan, atau tidak lagi tersedia pada sistem WastePay.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
          <Link
            href="/bayar"
            className="py-3 px-5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Cek Status Tagihan Warga
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs font-medium text-slate-400">
        WastePay • Dinas UPS HERU Kota Depok
      </div>
    </div>
  );
}
