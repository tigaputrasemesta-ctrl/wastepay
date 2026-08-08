import type { Metadata } from "next";
import Link from "next/link";
import FormDaftar from "@/components/FormDaftar";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Layanan | O2W Hero Zero Waste",
  description: "Daftar layanan pengangkutan sampah rumah tangga & usaha",
};

const ALUR_DAFTAR = [
  {
    no: "01",
    judul: "Isi Form Pendaftaran",
    desc: "Lengkapi data diri & alamat di samping — gratis, tanpa biaya pendaftaran.",
  },
  {
    no: "02",
    judul: "Survei oleh Petugas",
    desc: "Petugas wilayah menghubungi Anda untuk survei lokasi & penentuan rute.",
  },
  {
    no: "03",
    judul: "Terbit Kartu & Kode Anggota",
    desc: "Anda menerima kartu anggota + kode unik untuk cek tagihan & pelaporan online.",
  },
  {
    no: "04",
    judul: "Layanan Berjalan",
    desc: "Sampah mulai diangkut sesuai jadwal. Tagihan bulanan diterbitkan & diingatkan via WhatsApp.",
  },
];

export const dynamic = "force-dynamic";

export default async function DaftarPage() {
  let tarifMin = 0;
  try {
    const k = await prisma.kategoriTarif.findMany({
      orderBy: { tarif: "asc" },
      select: { tarif: true },
    });
    tarifMin = k.length > 0 ? Math.min(...k.map((x) => x.tarif)) : 0;
  } catch {
    // DB offline — tampil tanpa angka tarif
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10">
        <p className="stencil text-vest flex items-center gap-2">
          <span className="w-8 h-1.5 hazard inline-block" /> Pendaftaran Layanan
        </p>
        <h1 className="font-display text-4xl sm:text-6xl tracking-wide mt-3 leading-tight">
          Daftar layanan <span className="text-vest">dari sini</span>.
        </h1>
        <p className="text-bone-dim mt-4 max-w-2xl leading-relaxed">
          {tarifMin > 0 ? (
            <>
              Mulai dari <span className="text-vest font-mono">{formatRupiah(tarifMin)}</span> per
              bulan — gratis biaya pendaftaran. Isi form di samping, petugas kami
              akan menghubungi Anda untuk survei & aktivasi.
            </>
          ) : (
            "Gratis biaya pendaftaran. Isi form di samping, petugas kami akan menghubungi Anda untuk survei & aktivasi."
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-10 items-start">
        {/* Langkah & info */}
        <div className="lg:col-span-2 space-y-3">
          {ALUR_DAFTAR.map((l, i) => (
            <div key={l.no} className={`panel p-5 flex gap-5 animate-reveal-up d-${i + 1}`}>
              <span className="font-display text-3xl text-vest leading-none mt-1">{l.no}</span>
              <div>
                <h2 className="font-display text-lg tracking-wide">{l.judul}</h2>
                <p className="text-sm text-bone-dim mt-1.5 leading-relaxed">{l.desc}</p>
              </div>
            </div>
          ))}
          <div className="panel p-5">
            <p className="stencil text-bone-faint mb-3">PERLU DIKETAHUI</p>
            <ul className="space-y-2 text-sm text-bone-dim">
              <li className="flex items-start gap-2">
                <span className="text-vest mt-0.5">▸</span> Tidak ada biaya pendaftaran
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vest mt-0.5">▸</span> Layanan berjalan setelah konfirmasi pengelola
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vest mt-0.5">▸</span> Kode anggota dikirim setelah pendaftaran disetujui
              </li>
            </ul>
          </div>
          <Link
            href="/bayar"
            className="btn chamfer-sm w-full justify-center"
          >
            Sudah terdaftar? Cek Tagihan →
          </Link>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <FormDaftar />
        </div>
      </div>
    </div>
  );
}
