"use client";

import { useRef, useState } from "react";
import NextImage from "next/image";
import exifr from "exifr";
import { kompresGambar } from "@/lib/foto";

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
      <label className="block text-xs font-bold text-slate-700">
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
        <div className="w-28 h-28 rounded-2xl border border-dashed border-slate-300 overflow-hidden flex items-center justify-center bg-slate-50 text-slate-400 shrink-0">
          {foto ? (
            <NextImage src={foto} alt="Foto depan rumah" unoptimized width={112} height={112} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
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
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              Pilih dari Galeri
            </button>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {gpsLoading ? "Mendapatkan..." : "Lokasi Perangkat"}
            </button>
            {foto && (
              <button
                type="button"
                onClick={() => onFotoChange("")}
                className="px-3 py-2 border border-rose-200 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
              >
                Hapus Foto
              </button>
            )}
          </div>

          {foto && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onKoordinatChange(e.target.value, longitude, "manual", koordinatAkurasi)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            placeholder="-6.2088"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onKoordinatChange(latitude, e.target.value, "manual", koordinatAkurasi)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            placeholder="106.8456"
          />
        </div>
      </div>

      {pesan && (
        <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-xl border border-amber-200">
          {pesan}
        </div>
      )}

      {latitude && longitude && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lokasi tersimpan
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              koordinatSumber === "exif_foto" || koordinatSumber === "gps_perangkat"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}>
              {SUMBER_LABEL[koordinatSumber] || "Manual"}
            </span>
            {koordinatAkurasi && (
              <span className="text-emerald-700">± {koordinatAkurasi} m</span>
            )}
          </div>
          <p className="font-mono">{latitude}, {longitude}</p>
          <button
            type="button"
            onClick={openInGoogleMaps}
            className="mt-1.5 inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Buka Google Maps
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Saat memotret dengan kamera, koordinat GPS di dalam foto otomatis terbaca (geotag) dan menjadi acuan
        titik pengambilan sampah untuk rute pengangkutan. Pastikan lokasi kamera aktif.
      </p>
    </div>
  );
}
