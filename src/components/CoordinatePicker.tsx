"use client";

import { useState } from "react";

type Props = {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
  onMapClick?: () => void;
};

export default function CoordinatePicker({ latitude, longitude, onChange }: Props) {
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  function getCurrentLocation() {
    setLocLoading(true);
    setLocError("");

    if (!navigator.geolocation) {
      setLocError("Geolocation tidak didukung browser ini");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(
          position.coords.latitude.toString(),
          position.coords.longitude.toString()
        );
        setLocLoading(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocError("Izin lokasi ditolak. Izinkan akses lokasi di browser.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocError("Informasi lokasi tidak tersedia.");
            break;
          case error.TIMEOUT:
            setLocError("Waktu permintaan lokasi habis.");
            break;
          default:
            setLocError("Gagal mendapatkan lokasi.");
        }
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openInGoogleMaps() {
    if (latitude && longitude) {
      window.open(
        `https://www.google.com/maps?q=${latitude},${longitude}`,
        "_blank"
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          Titik Koordinat
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={locLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-50"
          >
            {locLoading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Mendapatkan...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Lokasi Saya
              </>
            )}
          </button>
          {latitude && longitude && (
            <button
              type="button"
              onClick={openInGoogleMaps}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Buka Maps
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onChange(e.target.value, longitude)}
            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="-6.2088"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onChange(latitude, e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="106.8456"
          />
        </div>
      </div>

      {locError && (
        <div className="bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-xl border border-rose-200">
          {locError}
        </div>
      )}

      {latitude && longitude && (
        <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-semibold text-emerald-900">Lokasi tersimpan</span>
          </div>
          <p className="font-mono text-[11px] text-emerald-700">
            {latitude}, {longitude}
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Koordinat digunakan untuk menentukan rute pengangkutan. Klik &quot;Lokasi Saya&quot; untuk menggunakan lokasi perangkat, atau masukkan manual.
      </p>
    </div>
  );
}
