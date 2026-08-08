import type { Metadata } from "next";
import Link from "next/link";
import PengaduanForm from "@/components/PengaduanForm";

export const metadata: Metadata = {
  title: "Lapor Sampah | O2W Hero Zero Waste",
  description: "Lapor sampah tidak diangkut atau menumpuk",
};

const PANDUAN = [
  {
    no: "01",
    judul: "Siapkan kode anggota",
    desc: "Kode unik ada di kartu anggota / barcode yang Anda terima saat mendaftar.",
  },
  {
    no: "02",
    judul: "Tulis keluhan",
    desc: "Pilih jenis keluhan & jelaskan situasinya — semakin detail, semakin cepat ditangani.",
  },
  {
    no: "03",
    judul: "Pantau sampai selesai",
    desc: "Laporan diteruskan ke tim lapangan, status dipantau: baru → diproses → selesai.",
  },
];

export default function PengaduanPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10">
        <p className="stencil text-danger flex items-center gap-2">
          <span className="w-8 h-1.5 bg-danger inline-block" /> Pelaporan Warga
        </p>
        <h1 className="font-display text-4xl sm:text-6xl tracking-wide mt-3 leading-tight">
          Sampah tidak diangkut?{" "}
          <span className="text-danger">Lapor sekarang.</span>
        </h1>
        <p className="text-bone-dim mt-4 max-w-2xl leading-relaxed">
          Masukkan kode anggota Anda (ada di kartu anggota / barcode), tulis
          keluhannya, dan laporan langsung diteruskan ke tim lapangan wilayah
          Anda.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-10 items-start">
        {/* Panduan */}
        <div className="lg:col-span-2 space-y-3">
          {PANDUAN.map((p, i) => (
            <div key={p.no} className={`panel p-5 flex gap-5 animate-reveal-up d-${i + 1}`}>
              <span className="font-display text-3xl text-danger leading-none mt-1">{p.no}</span>
              <div>
                <h2 className="font-display text-lg tracking-wide">{p.judul}</h2>
                <p className="text-sm text-bone-dim mt-1.5 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
          <div className="panel p-5">
            <p className="stencil text-bone-faint mb-3">KONFIRMASI TINDAK LANJUT</p>
            <p className="text-sm text-bone-dim leading-relaxed">
              Konfirmasi perkembangan laporan dikirim ke WhatsApp Anda (jika nomor
              diisi pada form).
            </p>
          </div>
          <Link
            href="/bayar"
            className="btn chamfer-sm w-full justify-center"
          >
            ← Kembali ke Cek Tagihan
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
