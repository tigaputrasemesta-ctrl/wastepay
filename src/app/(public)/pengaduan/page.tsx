import type { Metadata } from "next";
import Link from "next/link";
import PengaduanForm from "@/components/PengaduanForm";

export const metadata: Metadata = {
  title: "Ngadu Dimari | O2W Hero Zero Waste",
  description: "Lapor sampah lu kalau kagak diangkut",
};

const PANDUAN = [
  {
    no: "01",
    judul: "SIAPKAN NOMOR WHATSAPP",
    desc: "Masukkan nomor WhatsApp yang didaftarkan sebagai kode pelanggan.",
  },
  {
    no: "02",
    judul: "TULIS MASALAH",
    desc: "Jelaskan detail kendala Anda, semakin detail semakin cepat diselesaikan.",
  },
  {
    no: "03",
    judul: "PANTAU PROSES",
    desc: "Laporan akan langsung diteruskan ke armada lapangan yang bertugas.",
  },
];

export default function PengaduanPage() {
  return (
    <div className="py-12 space-y-12">
      <div className="text-center md:text-left">
        <div className="inline-block px-4 py-1 hm-border font-bold uppercase text-xs mb-2 bg-[#f4f4f0]">
          O2W / SISTEM LAPOR CEPAT
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
          SAMPAH TIDAK DIANGKUT? <br />
          <span className="text-red-600">LAPOR SEKARANG.</span>
        </h1>
        <p className="font-bold uppercase tracking-widest text-sm max-w-2xl mt-4">
          MASUKKAN NOMOR WHATSAPP ANDA (SEBAGAI KODE PELANGGAN), CERITAKAN KENDALANYA. LAPORAN AKAN DITERUSKAN LANGSUNG KE ARMADA YANG SEDANG BEROPERASI.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Panduan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="hm-card bg-[#f4f4f0] p-0 divide-y-2 divide-black">
            <div className="p-6 bg-white">
              <h2 className="font-black text-2xl uppercase">CARA MELAPOR</h2>
            </div>
            {PANDUAN.map((p) => (
              <div key={p.no} className="flex gap-6 p-6 items-start hover:bg-gray-50 transition-colors">
                <span className="font-black text-4xl text-black">
                  {p.no}
                </span>
                <div>
                  <h3 className="font-black uppercase text-lg mb-1">{p.judul}</h3>
                  <p className="text-xs font-bold uppercase">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hm-card bg-yellow-50">
            <p className="text-xs font-black text-black uppercase mb-2">PEMBERITAHUAN OTOMATIS</p>
            <p className="text-xs font-bold uppercase">
              JIKA ANDA MEMASUKKAN NOMOR WHATSAPP, BOT KAMI AKAN MENGIRIMKAN NOTIFIKASI KETIKA LAPORAN TELAH DISELESAIKAN.
            </p>
          </div>
          
          <Link
            href="/bayar"
            className="hm-btn w-full block text-center bg-[#f4f4f0]"
          >
            KEMBALI KE CEK TAGIHAN
          </Link>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <PengaduanForm />
        </div>
      </div>
    </div>
  );
}
