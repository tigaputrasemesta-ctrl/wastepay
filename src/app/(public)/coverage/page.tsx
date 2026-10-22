import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Phone,
  Compass,
} from "lucide-react";
import CoverageExplorer from "@/components/coverage/CoverageExplorer";
import { BLOK_OPERASIONAL_AKTIF } from "@/lib/coverage-shared";

export const metadata: Metadata = {
  title: "Peta Wilayah Layanan & Jadwal Angkut Sampah — UPS HERU Kota Depok",
  description:
    "Cek jangkauan rute truk sampah UPS HERU di Kota Depok. Pemetaan wilayah operasional terlayani rutin 2-3x seminggu di Kalibaru, Cilodong, Kalimulya, Jatimulya, dan Sukmajaya.",
  alternates: {
    canonical: "https://upsheru.com/coverage",
  },
  keywords: [
    "peta wilayah layanan sampah depok",
    "jadwal angkut sampah kalibaru",
    "rute truk sampah cilodong",
    "retribusi sampah depok",
    "jasa angkut sampah depok",
    "ups heru coverage",
    "jadwal truk sampah depok",
  ],
  openGraph: {
    title: "Peta Wilayah Layanan & Jadwal Angkut Sampah — UPS HERU Kota Depok",
    description:
      "Cek jangkauan rute truk sampah UPS HERU di Kota Depok. Pemetaan wilayah operasional terlayani rutin 2-3x seminggu di Kalibaru, Cilodong, Kalimulya, dan Jatimulya.",
    url: "https://upsheru.com/coverage",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    q: "Berapa tarif retribusi bulanan sampah di UPS HERU?",
    a: "Tarif retribusi resmi mulai dari Rp 50.000/bulan untuk kategori rumah tinggal (Level 1). Pembayaran dapat dilakukan via transfer bank, QRIS instan, atau kasir kelurahan.",
  },
  {
    q: "Bagaimana jika lingkungan/jalan rumah saya belum masuk rute reguler?",
    a: "Anda dapat mengajukan pembukaan rute kolektif bersama pengurus RT/RW dengan minimal 10 KK terdaftar. Tim survei lapangan UPS HERU akan meninjau akses jalan armada dalam 1-2 hari kerja.",
  },
  {
    q: "Hari apa saja dan jam berapa sampah dijemput?",
    a: "Pengangkutan dilakukan 2 hingga 3 kali setiap pekan pada pagi hari (antara pukul 07.30 s/d 11.30 WIB) sesuai jadwal tetap tiap wilayah jalan.",
  },
  {
    q: "Apakah pendaftaran baru langsung aktif diangkut?",
    a: "Ya! Jika rumah Anda berada di dalam wilayah jalan terlayani aktif, pendaftaran Anda langsung otomatis masuk ke daftar manifest rute truk pada jadwal penjemputan berikutnya.",
  },
];

export default function CoveragePage() {
  return (
    <div className="py-6 md:py-10 space-y-12">
      {/* ── BREADCRUMB & HEADER SECTION ── */}
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Cek Jangkauan Layanan</span>
        </nav>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Wilayah Layanan Aktif • Kota Depok</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Peta Wilayah Layanan & <span className="text-emerald-700">Jadwal Angkut.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
            Periksa apakah lingkungan rumah Anda sudah dilintasi armada rutin UPS HERU. Warga di area aktif dapat langsung mendaftar perorangan tanpa menunggu kuota rute baru.
          </p>
        </div>
      </div>

      {/* ── INTERACTIVE EXPLORER (ADDRESS CHECKER + SPLIT-VIEW MAP) ── */}
      <CoverageExplorer />

      {/* ── DIREKTORI STATIS RUAS JALAN & WILAYAH (SEO BOOSTER & ACCESSIBILITY) ── */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Direktori Resmi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Daftar Ruas Jalan & Wilayah Layanan UPS HERU Kota Depok
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Rincian jadwal penjemputan berkala, armada penjemput, dan status retribusi per kelurahan.
            </p>
          </div>

          <Link
            href="/daftar"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Daftar Pelanggan Baru</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── TAMPILAN MOBILE: KARTU RESPONSIF UNTUK SMARTPHONE (md:hidden) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
          {BLOK_OPERASIONAL_AKTIF.map((b) => (
            <div
              key={`mob-${b.id}`}
              className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>🏡</span>
                    <span>{b.nama}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Kel. {b.kelurahan} • Kec. {b.kecamatan}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    b.status === "AKTIF"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {b.pelangganCount} KK
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <div className="space-y-0.5 text-slate-600">
                  <p className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{b.jadwal}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Armada: {b.armada}
                  </p>
                </div>

                <Link
                  href={`/daftar?kelurahan=${encodeURIComponent(b.kelurahan)}&zona=${encodeURIComponent(b.nama)}`}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                >
                  <span>Daftar</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ── TAMPILAN DESKTOP/TABLET: TABEL LENGKAP (hidden md:block) ── */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-extrabold text-xs">
              <tr>
                <th className="py-3 px-4">Nama Jalan / Wilayah</th>
                <th className="py-3 px-4">Kelurahan & Kecamatan</th>
                <th className="py-3 px-4">Hari Penjemputan</th>
                <th className="py-3 px-4">Armada</th>
                <th className="py-3 px-4">Warga Aktif</th>
                <th className="py-3 px-4">Status Layanan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {BLOK_OPERASIONAL_AKTIF.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    🏡 {b.nama}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    Kel. {b.kelurahan}, Kec. {b.kecamatan}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-900 font-bold">
                    {b.jadwal}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                    {b.armada}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                      {b.pelangganCount} KK
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                        b.status === "AKTIF"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          b.status === "AKTIF" ? "bg-emerald-600" : "bg-amber-600"
                        }`}
                      />
                      {b.status === "AKTIF" ? "Rute Aktif Reguler" : "Area Perluasan"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/daftar?kelurahan=${encodeURIComponent(b.kelurahan)}&zona=${encodeURIComponent(b.nama)}`}
                      className="text-xs font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      Daftar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PANDUAN PENDAFTARAN & FAQ RETRIBUSI ── */}
      <section className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-extrabold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>Bantuan & Informasi Warga</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pertanyaan Seputar Wilayah & Retribusi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Informasi penting mengenai skema retribusi, armada angkut, dan pendaftaran kolektif di Kota Depok.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={`faq-${idx}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm"
            >
              <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                {item.q}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>

        {/* Kontak Bantuan */}
        <div className="p-4 bg-emerald-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-extrabold">Butuh Bantuan Pengecekan Lokasi Rumah Anda?</h4>
            <p className="text-xs text-emerald-200">
              Petugas customer service kami siap membantu mencocokkan titik rute via WhatsApp.
            </p>
          </div>
          <a
            href="https://wa.me/6281400782617?text=Halo%20CS%20UPS%20HERU,%20saya%20ingin%20menanyakan%20apakah%20alamat%20rumah%20saya%20sudah%20masuk%20area%20layanan%20pengangkutan%20sampah."
            target="_blank"
            rel="noreferrer"
            className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Chat CS WhatsApp (24 Jam)</span>
          </a>
        </div>
      </section>
    </div>
  );
}
