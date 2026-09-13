"use client";

import { useRef, useState } from "react";
import exifr from "exifr";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

type Props = {
  foto: string; // base64 data-url
  latitude: string;
  longitude: string;
  koordinatSumber: string; // exif_foto | gps_perangkat | manual | ""
  koordinatAkurasi: string; // meter
  onFotoChange: (foto: string) => void;
  onKoordinatChange: (lat: string, lng: string, sumber: string, akurasi: string) => void;
  label?: string;
  hint?: string;
};

const SUMBER_LABEL: Record<string, string> = {
  exif_foto: "EXIF Foto",
  gps_perangkat: "GPS Perangkat",
  manual: "Manual",
};

const MAX_DIMENSI = 1024;
const QUALITY = 0.8;

function kompresGambar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar valid"));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, MAX_DIMENSI / Math.max(width, height));
        if (scale < 1) {
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas tidak didukung"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CameraGps({
  foto,
  latitude,
  longitude,
  koordinatSumber,
  koordinatAkurasi,
  onFotoChange,
  onKoordinatChange,
  label = "Foto Bukti + Geotag",
  hint = "Foto otomatis dikecilkan agar hemat data",
}: Props) {
  const kameraRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [pesan, setPesan] = useState("");

  // Gunakan plugin kamera native hanya jika APK sudah memuat plugin-nya.
  // APK lama (belum ada @capacitor/camera) otomatis jatuh ke <input type=file>
  // supaya fitur tidak pecah sebelum APK di-rebuild.
  const pakaiKameraNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Camera");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPesan("File harus berupa gambar (JPG/PNG/HEIC).");
      return;
    }
    setProcessing(true);
    setPesan("");
    try {
      const base64 = await kompresGambar(file);

      let lat = latitude;
      let lng = longitude;
      let sumber = koordinatSumber;
      let akurasi = koordinatAkurasi;

      try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          lat = gps.latitude.toString();
          lng = gps.longitude.toString();
          sumber = "exif_foto";
          akurasi = "";
          setPesan("Koordinat diambil dari EXIF foto.");
        }
      } catch {
        // EXIF gagal dibaca — pakai koordinat lama / GPS perangkat
      }

      onFotoChange(base64);
      onKoordinatChange(lat, lng, sumber, akurasi);
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "Gagal memproses foto");
    } finally {
      setProcessing(false);
    }
  }

  async function handleNativePhoto(source: CameraSource) {
    setProcessing(true);
    setPesan("");
    try {
      // Izin kamera wajib untuk CameraSource.Camera. Android: galeri via SAF
      // tidak butuh izin, tapi minta tetap agar flow seragam & aman.
      if (source === CameraSource.Camera) {
        let perm = await Camera.checkPermissions();
        if (perm.camera !== "granted") {
          perm = await Camera.requestPermissions({ permissions: ["camera"] });
        }
        if (perm.camera !== "granted") {
          setPesan("Izin kamera ditolak. Aktifkan di Pengaturan aplikasi.");
          return;
        }
      }

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source,
        quality: 80,
        width: MAX_DIMENSI,
        correctOrientation: true,
      });

      const base64 = photo.dataUrl;
      if (!base64) {
        setPesan("Gagal mengambil foto.");
        return;
      }

      onFotoChange(base64);

      // Foto native tidak membawa EXIF GPS yang konsisten antar perangkat.
      // Jika belum ada koordinat, otomatis isi dari GPS perangkat.
      if (!latitude || !longitude) {
        getCurrentLocation();
      } else {
        setPesan("Foto terambil. Koordinat pakai data yang sudah ada.");
      }
    } catch {
      // User batal / camera app ditutup — jangan tampilkan error keras.
      setPesan("Foto dibatalkan.");
    } finally {
      setProcessing(false);
    }
  }

  function getCurrentLocation() {
    setGpsLoading(true);
    setPesan("");
    if (!navigator.geolocation) {
      setPesan("Geolocation tidak didukung.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onKoordinatChange(
          position.coords.latitude.toString(),
          position.coords.longitude.toString(),
          "gps_perangkat",
          position.coords.accuracy ? Math.round(position.coords.accuracy).toString() : ""
        );
        setGpsLoading(false);
        setPesan("Foto terambil, koordinat diisi dari GPS perangkat.");
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPesan("Izin lokasi ditolak. Aktifkan izin lokasi.");
            break;
          case error.POSITION_UNAVAILABLE:
            setPesan("Lokasi tidak tersedia.");
            break;
          case error.TIMEOUT:
            setPesan("Waktu permintaan lokasi habis.");
            break;
          default:
            setPesan("Gagal mendapatkan lokasi.");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const punyaKoordinat = Boolean(latitude && longitude);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</p>

      <input
        ref={kameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galeriRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className="w-24 h-24 shrink-0 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (pakaiKameraNative ? handleNativePhoto(CameraSource.Camera) : kameraRef.current?.click())}
              disabled={processing}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {processing ? "Memproses…" : "📷 Kamera"}
            </button>
            <button
              type="button"
              onClick={() => (pakaiKameraNative ? handleNativePhoto(CameraSource.Photos) : galeriRef.current?.click())}
              disabled={processing}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              Galeri
            </button>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {gpsLoading ? "GPS…" : "📍 GPS"}
            </button>
            {foto && (
              <button
                type="button"
                onClick={() => onFotoChange("")}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors"
              >
                Hapus
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-500">
            {punyaKoordinat ? (
              <span className="text-emerald-700 font-medium">
                ● <span className="font-mono tabular-nums font-semibold">{latitude.slice(0, 9)}, {longitude.slice(0, 9)}</span>
                {koordinatSumber ? ` · ${SUMBER_LABEL[koordinatSumber] || koordinatSumber}` : ""}
                {koordinatAkurasi ? ` · ±${koordinatAkurasi}m` : ""}
              </span>
            ) : (
              <span className="text-amber-600">○ Belum ada koordinat — ambil foto atau tekan GPS</span>
            )}
          </div>

          {pesan && <p className="text-[11px] font-medium text-slate-500">{pesan}</p>}
          {foto && !pesan && <p className="text-[10px] text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

