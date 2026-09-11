import type { Metadata } from "next";
import Link from "next/link";
import FormDaftar from "@/components/FormDaftar";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Layanan | UPS HERU Depok",
  description: "Daftar layanan pengelolaan sampah UPS HERU Kota Depok",
};

const ALUR_DAFTAR = [
  {
    no: "01",
    judul: "ISI FORMULIR",
    desc: "Lengkapin data diri sama alamat. Pendaftaran 100% GRATIS.",
  },
  {
    no: "02",
    judul: "SURVEI LOKASI",
    desc: "Petugas kita bakal hubungin buat cek rute angkut sampah.",
  },
  {
    no: "03",
    judul: "DAPAT KODE",
    desc: "Kalo ACC, dapet ID Pelanggan buat cek tagihan & lapor.",
  },
  {
    no: "04",
    judul: "BERES!",
    desc: "Sampah diangkut rutin, tagihan dikirim lewat Bot WA.",
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
    // DB offline
  }

  return (
    <div className="py-12 space-y-12">
      <div className="text-center md:text-left">
        <div className="inline-block px-4 py-1 hm-border font-bold uppercase text-xs mb-2 bg-[#f4f4f0] shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
          UPS HERU / PENDAFTARAN BARU
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
          GABUNG UPS HERU <span className="text-green-600">SEKARANG.</span>
        </h1>
        <p className="font-bold uppercase tracking-widest text-sm max-w-2xl mt-4">
          {tarifMin > 0 ? (
            <>
              BIAYA LANGGANAN MULAI DARI <span className="text-red-600">{formatRupiah(tarifMin)}</span> / BULAN. 
              TIDAK ADA BIAYA PENDAFTARAN. LANGSUNG ISI FORMULIR DI BAWAH.
            </>
          ) : (
            "TIDAK ADA BIAYA PENDAFTARAN. LANGSUNG ISI FORMULIR DI BAWAH."
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Langkah */}
        <div className="lg:col-span-2 space-y-6">
          <div className="hm-card bg-[#f4f4f0] p-0 divide-y-2 divide-black">
            <div className="p-6 bg-white">
              <h2 className="font-black text-2xl uppercase">ALUR DAFTAR</h2>
            </div>
            {ALUR_DAFTAR.map((l) => (
              <div key={l.no} className="flex gap-6 p-6 items-start hover:bg-gray-50 transition-colors">
                <span className="font-black text-4xl text-black">
                  {l.no}
                </span>
                <div>
                  <h3 className="font-black uppercase text-lg mb-1">{l.judul}</h3>
                  <p className="text-xs font-bold uppercase">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hm-card bg-red-50">
            <p className="text-xs font-black text-red-600 uppercase mb-2">CATATAN PENTING</p>
            <ul className="space-y-2 text-xs font-bold uppercase list-disc pl-4">
              <li>LAYANAN AKTIF SETELAH DISETUJUI ADMIN.</li>
              <li>PASTIKAN NOMOR WHATSAPP AKTIF.</li>
              <li>KODE PELANGGAN AKAN DIKIRIM VIA WA.</li>
            </ul>
          </div>
          
          <Link
            href="/bayar"
            className="hm-btn w-full block text-center bg-[#f4f4f0]"
          >
            SUDAH DAFTAR? CEK TAGIHAN
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
