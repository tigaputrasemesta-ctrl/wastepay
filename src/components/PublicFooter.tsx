import Link from "next/link";
import { NativeGuardedLink } from "@/components/mobile/LandingApkBanner";

export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-white pt-14 pb-20 md:pb-12 px-4 sm:px-6 border-t border-slate-800">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/ups-heru-logo.jpg"
                alt="UPS HERU Logo"
                className="w-9 h-9 rounded-lg object-contain bg-white p-0.5"
              />
              <span className="font-extrabold text-base tracking-tight text-white">UPS HERU</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Unit Pengolahan Sampah (UPS HERU) Kalibaru Kota Depok. Melayani retribusi dan operasional kebersihan lingkungan terpadu berbasis digital.
            </p>
          </div>

          {/* Col 2: Layanan Warga */}
          <div className="space-y-3">
            <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Layanan Warga</p>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li>
                <Link href="/pickup" className="hover:text-emerald-400 transition-colors">
                  Pickup Sampah Sekali Angkut
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">
                  Toko Pupuk Kompos & Olahan
                </Link>
              </li>
              <li>
                <Link href="/bayar" className="hover:text-emerald-400 transition-colors">
                  Cek & Bayar Tagihan QRIS
                </Link>
              </li>
              <li>
                <Link href="/daftar" className="hover:text-emerald-400 transition-colors">
                  Pendaftaran Warga Baru
                </Link>
              </li>
              <li>
                <Link href="/tarif" className="hover:text-emerald-400 transition-colors">
                  Tarif Retribusi Resmi
                </Link>
              </li>
              <li>
                <Link href="/pengaduan" className="hover:text-emerald-400 transition-colors">
                  Pusat Pengaduan Kebersihan
                </Link>
              </li>
              <li>
                <Link href="/artikel" className="hover:text-emerald-400 transition-colors">
                  Edukasi Lingkungan & Artikel
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Kontak Resmi */}
          <div className="space-y-3">
            <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Kontak Operasional</p>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li>
                WhatsApp:{" "}
                <a
                  href="https://wa.me/6281400782617"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 font-bold hover:underline"
                >
                  0814-0078-2617
                </a>
              </li>
              <li>
                Email:{" "}
                <a href="mailto:kontak@upsheru.com" className="hover:text-white transition-colors">
                  kontak@upsheru.com
                </a>
              </li>
              <li className="pt-1 text-slate-400 text-xs">
                Jam Layanan Operasional:
                <br />
                Senin – Sabtu: 07:00 – 16:00 WIB
              </li>
            </ul>
          </div>

          {/* Col 4: Fasilitas Fisik */}
          <div className="space-y-3">
            <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Kantor & Fasilitas TPS 3R</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Jl. Kandang Ayam, Kel. Kalibaru, Kec. Cilodong, Kota Depok, Jawa Barat 16414
            </p>
            <p className="text-[11px] text-slate-500 font-mono">Koordinat: -6.424838, 106.832667</p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <span>© {new Date().getFullYear()} UPS HERU Kota Depok. Hak Cipta Dilindungi.</span>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/login" className="hover:text-white transition-colors">
              Portal Petugas
            </Link>
            <Link href="/mitra" className="hover:text-white transition-colors">
              Kemitraan Wilayah
            </Link>
            <NativeGuardedLink href="/unduh" className="hover:text-white transition-colors">
              App Android Petugas
            </NativeGuardedLink>
            <span>
              Didukung oleh{" "}
              <a
                href="https://wastepay.id"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-500 hover:text-emerald-400 font-semibold"
              >
                wastepay.id
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
