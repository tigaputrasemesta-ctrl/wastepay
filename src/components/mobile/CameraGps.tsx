"use client";

import { useRef, useState } from "react";
import exifr from "exifr";

type Props = {
  foto: string; // base64
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
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>

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
        <div className="w-24 h-24 shrink-0 border-2 border-black bg-black text-white flex items-center justify-center overflow-hidden">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => kameraRef.current?.click()}
              disabled={processing}
              className="px-3 py-2.5 bg-green-600 text-white border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              {processing ? "Memproses…" : "📷 Kamera"}
            </button>
            <button
              type="button"
              onClick={() => galeriRef.current?.click()}
              disabled={processing}
              className="px-3 py-2.5 bg-white text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              Galeri
            </button>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="px-3 py-2.5 bg-amber-400 text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              {gpsLoading ? "GPS…" : "📍 GPS"}
            </button>
            {foto && (
              <button
                type="button"
                onClick={() => onFotoChange("")}
                className="px-3 py-2.5 bg-white text-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-wider"
              >
                Hapus
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono font-bold text-gray-600">
            {punyaKoordinat ? (
              <span className="text-green-700">
                ● {latitude.slice(0, 9)}, {longitude.slice(0, 9)}
                {koordinatSumber ? ` · ${SUMBER_LABEL[koordinatSumber] || koordinatSumber}` : ""}
                {koordinatAkurasi ? ` · ±${koordinatAkurasi}m` : ""}
              </span>
            ) : (
              <span className="text-amber-600">○ Belum ada koordinat — ambil foto/GPS</span>
            )}
          </div>

          {pesan && <p className="text-[11px] font-bold text-gray-500">{pesan}</p>}
          {foto && !pesan && <p className="text-[10px] font-bold text-gray-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
