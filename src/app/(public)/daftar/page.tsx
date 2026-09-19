import type { Metadata } from "next";
import Link from "next/link";
import FormDaftar from "@/components/FormDaftar";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pendaftaran Pelanggan Baru Pengelolaan Sampah",
  description:
    "Formulir online pendaftaran layanan angkut sampah terpadu Kota Depok untuk rumah tangga, tempat usaha/niaga, dan instansi. Bebas biaya pendaftaran.",
  alternates: {
    canonical: "/daftar",
  },
  openGraph: {
    title: "Daftar Layanan Angkut Sampah Kota Depok | UPS HERU",
    description:
      "Daftar layanan jemput sampah rutin untuk rumah tangga dan tempat usaha di Depok. Penjemputan terjadwal dan pelacakan truk real-time.",
  },
};

const ALUR_DAFTAR = [
  {
    no: "01",
    judul: "Isi Formulir Online",
    desc: "Lengkapi data diri dan alamat penjemputan. Pendaftaran 100% Bebas Biaya.",
  },
  {
    no: "02",
    judul: "Verifikasi Rute Lapangan",
    desc: "Petugas operasional memetakan koordinat rumah Anda ke armada terdekat.",
  },
  {
    no: "03",
    judul: "Terima ID Pelanggan",
    desc: "Setelah diverifikasi, Anda akan mendapatkan kode pelanggan resmi via WhatsApp.",
  },
  {
    no: "04",
    judul: "Pengangkutan Berjalan",
    desc: "Sampah diangkut rutin sesuai jadwal, pantau posisi truk di peta kapan saja.",
  },
];

export const dynamic = "force-dynamic";

export default async function DaftarPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string; referal?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const initialReferal = (sp?.ref || sp?.referal || "").trim();

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
    <div className="py-8 md:py-12 space-y-8 md:space-y-10">
      {/* Header Section */}
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Registrasi Pelanggan Baru • Bebas Biaya Daftar</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Daftar Layanan <span className="text-emerald-700">UPS HERU.</span>
        </h1>
        <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
          {tarifMin > 0 ? (
            <>
              Iuran retribusi mulai dari <span className="font-bold text-emerald-700">{formatRupiah(tarifMin)}/bulan</span>. 
              Tanpa biaya registrasi awal. Cukup lengkapi formulir di bawah ini.
            </>
          ) : (
            "Tanpa biaya registrasi awal. Cukup lengkapi formulir di bawah ini untuk mulai berlangganan."
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Panduan Alur (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="font-extrabold text-base text-slate-900 mb-5">
              Alur Pendaftaran Layanan
            </h2>
            <div className="space-y-5">
              {ALUR_DAFTAR.map((l) => (
                <div key={l.no} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 font-extrabold text-xs">
                    {l.no}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{l.judul}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{l.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed space-y-1.5">
            <p className="font-bold">Informasi Penting:</p>
            <ul className="space-y-1 text-emerald-800 text-[11px] list-disc pl-4 font-medium">
              <li>Layanan aktif segera setelah verifikasi rute selesai oleh tim lapangan.</li>
              <li>Pastikan nomor WhatsApp aktif untuk pengiriman kode pelanggan dan struk resmi.</li>
              <li>Jadwal pengangkutan akan disesuaikan dengan ritase wilayah RT Anda.</li>
            </ul>
          </div>

          <Link
            href="/bayar"
            className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all shadow-sm group"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">Sudah Terdaftar Sebelumnya?</p>
              <p className="text-[11px] text-slate-500">Cek status tagihan atau konfirmasi bukti pembayaran</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </Link>
        </div>

        {/* Form Pendaftaran (7 cols) */}
        <div className="lg:col-span-7">
          <FormDaftar initialReferal={initialReferal} />
        </div>
      </div>
    </div>
  );
}
