import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, MapPin, Smartphone, Clock } from "lucide-react";
import LacakJemputan from "@/components/LacakJemputan";

export const metadata: Metadata = {
  title: "Pelacakan Armada Truk Sampah Real-Time",
  description:
    "Pantau posisi armada truk pengangkut sampah WastePay UPS HERU Kota Depok secara langsung di peta digital dengan perkiraan waktu tiba (ETA).",
  alternates: {
    canonical: "/lacak",
  },
  openGraph: {
    title: "Lacak Armada Truk Sampah Real-Time | UPS HERU Depok",
    description:
      "Pantau posisi truk penjemput sampah secara langsung di peta interaktif dengan estimasi waktu tiba akurat.",
  },
};

const PANDUAN = [
  {
    no: "01",
    icon: Smartphone,
    judul: "Masukkan Nomor Pelanggan",
    desc: "Gunakan nomor WhatsApp atau ID pelanggan Anda yang terdaftar pada sistem WastePay.",
  },
  {
    no: "02",
    icon: MapPin,
    judul: "Pantau di Peta Interaktif",
    desc: "Lihat posisi truk sampah serta titik lokasi rumah Anda secara langsung dan akurat.",
  },
  {
    no: "03",
    icon: Clock,
    judul: "Estimasi Waktu Tiba (ETA)",
    desc: "Sistem otomatis menghitung jarak armada dan estimasi menit ketibaan di lokasi Anda.",
  },
];

export default function LacakPage() {
  return (
    <div className="py-8 md:py-12 space-y-8 md:space-y-10">
      {/* Header Section */}
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Tracking GPS Armada</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Lacak Armada Sampah <span className="text-emerald-700">Real-Time.</span>
        </h1>
        <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
          Ketahui posisi truk penjemput sampah lingkungan Anda secara transparan. Tidak perlu khawatir terlewat jadwal pengangkutan.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Panduan & Bantuan (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="font-extrabold text-base text-slate-900 mb-5">
              Cara Melacak Penjemputan
            </h2>
            <div className="space-y-5">
              {PANDUAN.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.no} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 font-bold text-xs">
                      {p.no}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{p.judul}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200/80 flex gap-3 text-amber-900 text-xs leading-relaxed">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Informasi Pembaruan Sinyal GPS</p>
              <p className="text-amber-800/90 text-[11px]">
                Posisi live hanya tampil ketika petugas armada sedang beroperasi dan mengaktifkan pelacak tugas. Jika armada belum jalan, sistem akan menampilkan jadwal resmi pengangkutan.
              </p>
            </div>
          </div>

          <Link
            href="/bayar"
            className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all shadow-sm group"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">Ingin Bayar Iuran Retribusi?</p>
              <p className="text-[11px] text-slate-500">Cek tagihan bulanan dan bayar instan via QRIS</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Widget pelacakan (7 cols) */}
        <div className="lg:col-span-7">
          <LacakJemputan />
        </div>
      </div>
    </div>
  );
}
