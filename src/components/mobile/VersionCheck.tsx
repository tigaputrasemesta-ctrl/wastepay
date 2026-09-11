"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

type VersiTerbaru = {
  versionName: string;
  versionCode: number;
  minVersionCode: number;
  apkUrl: string;
  changelog: string[];
};

/**
 * Cek update APK saat aplikasi terbuka.
 * - Ambil versi terpasang dari @capacitor/app (App.getInfo).
 * - Bandingkan dengan /api/mobile/version.
 * - Tampilkan dialog update; unduh APK bila URL tersedia.
 * - Update "wajib" (minVersionCode) tidak bisa ditutup.
 */
export default function VersionCheck() {
  const [terbaru, setTerbaru] = useState<VersiTerbaru | null>(null);
  const [currentCode, setCurrentCode] = useState<number | null>(null);
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return; // cek update hanya di APK

    App.getInfo()
      .then((info) => {
        const code = parseInt(info.build || "0", 10);
        setCurrentCode(Number.isFinite(code) ? code : 0);
      })
      .catch(() => {});

    fetch("/api/mobile/version")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: VersiTerbaru | null) => setTerbaru(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (terbaru && currentCode != null && terbaru.versionCode > currentCode) {
      setTampil(true);
    }
  }, [terbaru, currentCode]);

  if (!tampil || !terbaru) return null;

  const wajib = currentCode != null && currentCode < terbaru.minVersionCode;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
        <div className={`px-6 py-4.5 ${wajib ? "bg-rose-600" : "bg-emerald-600"}`}>
          <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
            <span>🚀</span> {wajib ? "Pembaruan Aplikasi Wajib" : "Versi Baru Tersedia"}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm font-bold text-slate-900">
            UPS HERU Lapangan v{terbaru.versionName}
          </p>

          <ul className="space-y-1.5">
            {terbaru.changelog.map((c, i) => (
              <li key={i} className="text-xs font-medium text-slate-600 flex gap-2">
                <span className="text-emerald-600 shrink-0 font-bold">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2.5 pt-2">
            {!wajib && (
              <button
                type="button"
                onClick={() => setTampil(false)}
                className="flex-1 py-3 border border-slate-200 text-xs font-bold rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Nanti
              </button>
            )}
            {terbaru.apkUrl ? (
              <a
                href={terbaru.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-2xl text-white text-center shadow-md active:scale-98 transition-all"
              >
                Unduh APK
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 py-3 bg-emerald-600 text-xs font-bold rounded-2xl text-white opacity-60"
              >
                Hubungi Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
