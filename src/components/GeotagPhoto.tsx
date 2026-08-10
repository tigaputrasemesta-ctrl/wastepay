"use client";

import { useRef, useState } from "react";
import NextImage from "next/image";
import exifr from "exifr";

type Props = {
  foto: string; // base64
  latitude: string;
  longitude: string;
  koordinatSumber: string; // exif_foto | gps_perangkat | manual | ""
  koordinatAkurasi: string; // meter
  onFotoChange: (foto: string) => void;
  onKoordinatChange: (lat: string, lng: string, sumber: string, akurasi: string) => void;
};

const SUMBER_LABEL: Record<string, string> = {
  exif_foto: "Dari EXIF Foto",
  gps_perangkat: "GPS Perangkat",
  manual: "Manual",
};

const MAX_DIMENSI = 1024;
const QUALITY = 0.8;

// Kompres & resize gambar jadi JPEG base64 (maks 1024px) supaya DB tidak membengkak
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

export default function GeotagPhoto({
  foto,
  latitude,
  longitude,
  koordinatSumber,
  koordinatAkurasi,
  onFotoChange,
  onKoordinatChange,
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

      // Coba ekstrak koordinat GPS dari EXIF foto (geotag)
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
        } else {
          setPesan(""); // clear message if no GPS
        }
      } catch {
        setPesan(""); // clear message if EXIF reading fails
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
      setPesan("Geolocation tidak didukung browser ini.");
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
            setPesan("Izin lokasi ditolak. Izinkan akses lokasi di browser.");
            break;
          case error.POSITION_UNAVAILABLE:
            setPesan("Informasi lokasi tidak tersedia.");
            break;
          case error.TIMEOUT:
            setPesan("Waktu permintaan lokasi habis.");
            break;
          default:
            setPesan("Gagal mendapatkan lokasi.");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openInGoogleMaps() {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank");
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-600 font-bold">
        Foto Depan Rumah + Geotag
      </label>

      {/* Input tersembunyi */}
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

      <div className="flex items-start gap-4">
        {/* Preview foto */}
        <div className="w-32 h-32 rounded-none-xl border-2 border-dashed border-2 border-black overflow-hidden flex items-center justify-center bg-black text-white font-black shrink-0">
          {foto ? (
            <NextImage src={foto} alt="Foto depan rumah" unoptimized width={128} height={128} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10 text-gray-400 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => kameraRef.current?.click()}
              disabled={processing}
              className="flex items-center gap-1.5 px-3 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-xs font-medium hover:bg-green-300 transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {processing ? "Memproses..." : "Ambil Foto"}
            </button>
            <button
              type="button"
              onClick={() => galeriRef.current?.click()}
              disabled={processing}
              className="flex items-center gap-1.5 px-3 py-2 border-2 border-black text-gray-600 font-bold rounded-none text-xs font-medium hover:bg-gray-100 border-2 border-black transition disabled:opacity-50"
            >
              Pilih dari Galeri
            </button>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-3 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-xs font-medium hover:bg-green-300 transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {gpsLoading ? "Mendapatkan..." : "Lokasi Perangkat"}
            </button>
            {foto && (
              <button
                type="button"
                onClick={() => onFotoChange("")}
                className="px-3 py-2 border border-danger/40 text-red-600 rounded-none text-xs font-medium hover:bg-danger/5 transition"
              >
                Hapus Foto
              </button>
            )}
          </div>

          {foto && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Foto tersimpan (otomatis dikecilkan agar hemat penyimpanan)
            </div>
          )}
        </div>
      </div>

      {/* Koordinat */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 font-bold mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onKoordinatChange(e.target.value, longitude, "manual", koordinatAkurasi)}
            className="w-full px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="-6.2088"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 font-bold mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onKoordinatChange(latitude, e.target.value, "manual", koordinatAkurasi)}
            className="w-full px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="106.8456"
          />
        </div>
      </div>

      {pesan && (
        <div className="bg-amber-500/10 text-amber-300 text-xs px-3 py-2 rounded-none border border-amber-500/30">
          {pesan}
        </div>
      )}

      {latitude && longitude && (
        <div className="bg-green-400/5 rounded-none p-3 text-xs text-green-600">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lokasi tersimpan
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-[10px] font-semibold ${
              koordinatSumber === "exif_foto"
                ? "bg-green-400/10 text-green-600"
                : koordinatSumber === "gps_perangkat"
                ? "bg-green-400/10 text-green-600"
                : "bg-gray-100 border-2 border-black text-gray-600 font-bold"
            }`}>
              {SUMBER_LABEL[koordinatSumber] || "Manual"}
            </span>
            {koordinatAkurasi && (
              <span className="text-green-600">± {koordinatAkurasi} m</span>
            )}
          </div>
          <p className="font-mono">{latitude}, {longitude}</p>
          <button
            type="button"
            onClick={openInGoogleMaps}
            className="mt-1.5 inline-flex items-center gap-1 text-green-600 hover:text-sky-300 font-medium"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Buka Google Maps
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 font-bold">
        Saat memotret dengan kamera, koordinat GPS di dalam foto otomatis terbaca (geotag) dan menjadi acuan
        titik pengambilan sampah untuk rute pengangkutan. Pastikan lokasi kamera aktif.
      </p>
    </div>
  );
}
