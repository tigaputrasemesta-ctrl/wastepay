import type { Metadata } from "next";
import Link from "next/link";
import LacakJemputan from "@/components/LacakJemputan";

export const metadata: Metadata = {
  title: "Lacak Jemputan | O2W Hero Zero Waste",
  description: "Pantau posisi armada angkut sampah secara real-time seperti ojek online",
};

const PANDUAN = [
  {
    no: "01",
    judul: "MASUKKAN KODE",
    desc: "Gunakan kode pelanggan di kartu / resi pembayaran Anda.",
  },
  {
    no: "02",
    judul: "LIHAT PETA",
    desc: "Titik rumah Anda dan posisi armada tampil di peta live.",
  },
  {
    no: "03",
    judul: "PANTAU ETA",
    desc: "Perkiraan waktu tiba & jarak dihitung otomatis.",
  },
];

export default function LacakPage() {
  return (
    <div className="py-12 space-y-12">
      <div className="text-center md:text-left">
        <div className="inline-block px-4 py-1 hm-border font-bold uppercase text-xs mb-2 bg-[#f4f4f0]">
          O2W / LACAK JEMPUTAN
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
          ARMADA DI <span className="text-green-600">PETA.</span>
        </h1>
        <p className="font-bold uppercase tracking-widest text-sm max-w-2xl mt-4">
          POSISI TRUK ANGKUT SAMPAH TAMPAK REAL-TIME. TIDAK ADA LAGI DRAMA NUNGGU TRUK TAK KUNJUNG DATANG — SEPERTI OJEK ONLINE.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Panduan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="hm-card bg-[#f4f4f0] p-0 divide-y-2 divide-black">
            <div className="p-6 bg-white">
              <h2 className="font-black text-2xl uppercase">CARA MELACAK</h2>
            </div>
            {PANDUAN.map((p) => (
              <div key={p.no} className="flex gap-6 p-6 items-start hover:bg-gray-50 transition-colors">
                <span className="font-black text-4xl text-black">{p.no}</span>
                <div>
                  <h3 className="font-black uppercase text-lg mb-1">{p.judul}</h3>
                  <p className="text-xs font-bold uppercase">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hm-card bg-yellow-50">
            <p className="text-xs font-black text-black uppercase mb-2">CATATAN</p>
            <p className="text-xs font-bold uppercase">
              POSISI ARMADA HANYA TAMPIL JIKA PETUGAS SEDANG MENGIRIMKAN GPS (MULAI LACAK DI APLIKASI LAPANGAN). TANPA SINYAL GPS, STATUS TETAP MENAMPILKAN JADWAL.
            </p>
          </div>

          <Link href="/bayar" className="hm-btn w-full block text-center bg-[#f4f4f0]">
            CEK TAGIHAN
          </Link>
        </div>

        {/* Widget pelacakan */}
        <div className="lg:col-span-3">
          <LacakJemputan />
        </div>
      </div>
    </div>
  );
}
