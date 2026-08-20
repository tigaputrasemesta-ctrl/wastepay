import Link from "next/link";
import { Download, Smartphone, ShieldAlert, CheckCircle2 } from "lucide-react";
import { MOBILE_VERSION, getApkUrl } from "@/lib/mobile-version";

export const dynamic = "force-dynamic";

export default function UnduhPage() {
  const apkUrl = getApkUrl();
  const { versionName, versionCode, changelog } = MOBILE_VERSION;

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans selection:bg-red-500 selection:text-white pb-20">
      {/* Top bar */}
      <nav className="border-b-2 border-black px-6 py-4 flex items-center justify-between bg-white">
        <Link href="/" className="text-2xl font-black tracking-tighter">
          O₂W HERO.
        </Link>
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-widest hover:text-green-600 transition-colors"
        >
          ← Kembali
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <div className="inline-block px-4 py-1 border-2 border-black font-bold uppercase text-xs mb-6 bg-white">
          Aplikasi Petugas & Armada
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase leading-[0.85] tracking-tighter mb-6">
          Unduh
          <br />
          <span className="text-green-600">O₂W Lapangan</span>
        </h1>
        <p className="text-lg md:text-xl font-medium mb-10 max-w-xl">
          Aplikasi Android untuk petugas & armada: absensi, survei, pelaporan,
          dan <strong>GPS tracking</strong> — posisi tetap terkirim walau aplikasi
          di-background atau layar HP terkunci.
        </p>

        {/* Download card */}
        <div className="hm-card bg-white mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="w-8 h-8" />
            <div>
              <div className="text-2xl font-black uppercase">
                Versi {versionName}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                build {versionCode}
              </div>
            </div>
          </div>

          <ul className="mb-8 space-y-2">
            {changelog.map((c, i) => (
              <li key={i} className="flex items-start gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          {apkUrl ? (
            <a
              href={apkUrl}
              download
              className="hm-btn-green w-full flex items-center justify-center gap-2 py-4 text-xl"
            >
              <Download className="w-6 h-6" /> UNDUH APK ({versionName})
            </a>
          ) : (
            <div className="hm-border bg-yellow-100 p-4 font-bold uppercase text-sm">
              Link unduh belum dikonfigurasi.
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="hm-card bg-yellow-300">
          <div className="flex items-center gap-2 mb-3 font-black uppercase">
            <ShieldAlert className="w-6 h-6" /> Penting sebelum install
          </div>
          <ul className="space-y-2 text-sm font-medium">
            <li>
              • Jika dari versi lama (v1.1), <b>uninstall dulu</b> aplikasi lama
              lalu install versi ini.
            </li>
            <li>
              • Beri izin lokasi <b>"Izinkan sepanjang waktu"</b> agar GPS tetap
              jalan di background.
            </li>
            <li>
              • Android 8–12 menampilkan notifikasi kecil "GPS aktif" (kebijakan
              OS, tidak bisa dihilangkan).
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
