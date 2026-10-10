import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardEdit, MapPin, CheckCircle2, Truck, ArrowRight } from "lucide-react";
import FormDaftar from "@/components/FormDaftar";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daftar Jasa Angkut Sampah Depok - UPS HERU",
  description:
    "Formulir online pendaftaran layanan jasa angkut sampah terpadu Kota Depok untuk perumahan, RT/RW, dan tempat usaha. Bebas biaya pendaftaran awal.",
  alternates: {
    canonical: "/daftar",
  },
  openGraph: {
    title: "Daftar Jasa Angkut Sampah Kota Depok | UPS HERU",
    description:
      "Daftar layanan jemput sampah rutin terpercaya di Depok. Penjemputan terjadwal dan bayar retribusi digital.",
  },
};

const ALUR_DAFTAR = [
  {
    icon: <ClipboardEdit className="w-5 h-5 text-emerald-600" />,
    judul: "Isi Formulir Online",
    desc: "Lengkapi data diri dan lokasi penjemputan dalam 1 menit. 100% Gratis.",
  },
  {
    icon: <MapPin className="w-5 h-5 text-sky-600" />,
    judul: "Pemetaan Rute",
    desc: "Tim lapangan kami akan memverifikasi titik lokasi rumah Anda ke rute armada terdekat.",
  },
  {
    icon: <CheckCircle2 className="w-5 h-5 text-amber-600" />,
    judul: "Terima ID Pelanggan",
    desc: "Kode pelanggan resmi akan otomatis dikirimkan ke WhatsApp Anda.",
  },
  {
    icon: <Truck className="w-5 h-5 text-rose-600" />,
    judul: "Pengangkutan Rutin",
    desc: "Sampah mulai diangkut teratur. Anda bisa melacak truk kami langsung dari HP.",
  },
];

export const dynamic = "force-dynamic";

export default async function DaftarPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string; referal?: string; mode?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const initialReferal = (sp?.ref || sp?.referal || "").trim();
  const isPetugas = sp?.mode === "petugas";

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
    <div className={`py-6 md:py-10 ${isPetugas ? 'max-w-3xl mx-auto' : 'space-y-10 md:space-y-12'}`}>
      {/* Header Section */}
      {!isPetugas && (
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bebas Biaya Registrasi Awal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Berlangganan <br />
            <span className="text-emerald-700">Jasa Angkut Sampah.</span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 mt-4 leading-relaxed font-medium">
            {tarifMin > 0 ? (
              <>
                Solusi kebersihan rumah Anda dengan retribusi mulai dari <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{formatRupiah(tarifMin)}/bulan</span>. 
                Isi form di bawah, dan biarkan kami yang mengurus sisanya.
              </>
            ) : (
              "Isi formulir di bawah ini dalam 1 menit. Jadwal truk akan langsung terhubung ke lokasi rumah Anda tanpa repot."
            )}
          </p>
        </div>
      )}

      <div className={`grid gap-10 items-start ${isPetugas ? 'grid-cols-1' : 'lg:grid-cols-12'}`}>
        {/* Panduan Alur (5 cols) */}
        {!isPetugas && (
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-lg shadow-slate-200/40">
              <h2 className="font-black text-xl text-slate-900 mb-8 border-b border-slate-100 pb-4">
                Bagaimana Prosesnya?
              </h2>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-100 before:via-slate-100 before:to-transparent">
                {ALUR_DAFTAR.map((l, i) => (
                  <div key={i} className="relative flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shrink-0 z-10 shadow-sm">
                      {l.icon}
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-base text-slate-900">{l.judul}</h3>
                      <p className="text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">{l.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-amber-50/80 border border-amber-200/80 text-amber-950 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="font-bold text-sm">Informasi Penting</p>
              </div>
              <ul className="space-y-2 text-amber-800/90 text-xs list-disc pl-5 font-medium leading-relaxed">
                <li>Layanan langsung aktif segera setelah verifikasi rute selesai oleh tim.</li>
                <li>Pastikan nomor WhatsApp aktif untuk pengiriman kode pelanggan dan struk resmi.</li>
                <li>Jadwal menyesuaikan wilayah RT/Perumahan Anda.</li>
              </ul>
            </div>

            <Link
              href="/bayar"
              className="flex items-center justify-between p-6 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-[2rem] transition-all shadow-sm group cursor-pointer"
            >
              <div>
                <p className="text-sm font-black text-slate-900 group-hover:text-emerald-800 transition-colors">Sudah Terdaftar?</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Cek tagihan & konfirmasi bayar</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 transition-colors" />
              </div>
            </Link>
          </div>
        )}

        {/* Form Pendaftaran (7 cols) */}
        <div className={isPetugas ? 'col-span-1' : 'lg:col-span-7'}>
          <FormDaftar initialReferal={initialReferal} isPetugas={isPetugas} />
        </div>
      </div>
    </div>
  );
}
