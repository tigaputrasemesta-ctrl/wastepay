import type { Metadata } from "next";
import Link from "next/link";
import PengaduanForm from "@/components/PengaduanForm";

export const metadata: Metadata = {
  title: "Pusat Pengaduan | WastePay Depok",
  description: "Layanan pengaduan dan bantuan penjemputan sampah WastePay Kota Depok",
};

const PANDUAN = [
  {
    no: "01",
    judul: "Nomor WhatsApp Terdaftar",
    desc: "Masukkan nomor WhatsApp atau ID pelanggan yang terdaftar pada sistem WastePay.",
  },
  {
    no: "02",
    judul: "Jelaskan Kendala Lapangan",
    desc: "Sampaikan detail masalah, misalnya sampah terlewat atau volume melebihi kapasitas.",
  },
  {
    no: "03",
    judul: "Tindak Lanjut Armada",
    desc: "Laporan diteruskan secara instan ke tablet navigasi petugas armada yang bertugas hari ini.",
  },
];

export default function PengaduanPage() {
  return (
    <div className="py-8 md:py-12 space-y-8 md:space-y-10">
      {/* Header Section */}
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Pusat Layanan Cepat Tanggap</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Ada Kendala Pengangkutan? <br />
          <span className="text-rose-600">Sampaikan di Sini.</span>
        </h1>
        <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
          Kenyamanan lingkungan Anda adalah prioritas kami. Masukkan nomor pelanggan Anda dan sampaikan kendalanya, tim reaksi cepat kami siap menindaklanjuti.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Panduan (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="font-extrabold text-base text-slate-900 mb-5">
              Alur Penanganan Pengaduan
            </h2>
            <div className="space-y-5">
              {PANDUAN.map((p) => (
                <div key={p.no} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 font-extrabold text-xs">
                    {p.no}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{p.judul}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-bold">Notifikasi Otomatis WhatsApp</p>
            <p className="text-amber-800/90 text-[11px]">
              Sistem akan mengirimkan konfirmasi nomor tiket laporan ke WhatsApp Anda serta pemberitahuan ketika pengangkutan susulan telah diselesaikan.
            </p>
          </div>
          
          <Link
            href="/lacak"
            className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all shadow-xs group"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">Ingin Memantau Armada?</p>
              <p className="text-[11px] text-slate-500">Cek posisi truk penjemputan di peta live</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </Link>
        </div>

        {/* Form (7 cols) */}
        <div className="lg:col-span-7">
          <PengaduanForm />
        </div>
      </div>
    </div>
  );
}
