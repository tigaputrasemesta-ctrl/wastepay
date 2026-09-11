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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-sm border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <div className="px-5 py-3 border-b-4 border-black bg-red-500">
          <h2 className="font-black uppercase tracking-widest text-white">
            {wajib ? "Update Wajib" : "Versi Baru Tersedia"}
          </h2>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm font-black uppercase">
            UPS HERU Lapangan v{terbaru.versionName}
          </p>

          <ul className="space-y-1">
            {terbaru.changelog.map((c, i) => (
              <li key={i} className="text-xs font-bold flex gap-2">
                <span className="text-green-600 shrink-0">▸</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 pt-2">
            {!wajib && (
              <button
                type="button"
                onClick={() => setTampil(false)}
                className="flex-1 px-3 py-2 border-2 border-black text-xs font-black uppercase text-gray-600 hover:bg-gray-100"
              >
                Nanti
              </button>
            )}
            {terbaru.apkUrl ? (
              <a
                href={terbaru.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 bg-green-400 border-2 border-black text-xs font-black uppercase text-center shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition"
              >
                Unduh APK
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 px-3 py-2 bg-green-400 border-2 border-black text-xs font-black uppercase opacity-60"
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
