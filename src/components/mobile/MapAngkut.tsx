"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import { getMapTileConfig } from "@/lib/map-tile";

export type TugasMap = {
  id: number;
  nama: string;
  alamat: string;
  kodePelanggan: string;
  latitude: number;
  longitude: number;
  status: string;
};

const PUSAT_DEPOK: [number, number] = [-6.424838, 106.832667];

const WARNA_STATUS: Record<string, string> = {
  terjadwal: "#38bdf8",
  diambil: "#16a34a",
  tidak_diangkut: "#dc2626",
  kosong: "#f59e0b",
};

function pinTugas(t: TugasMap) {
  const warna = WARNA_STATUS[t.status] ?? "#8b8f98";
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);text-align:center">
      <div style="width:28px;height:28px;margin:0 auto;border-radius:9999px;background:${warna};border:2.5px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:13px">📍</div>
      <div style="margin-top:3px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:700;color:#ffffff;background:#0f172a;border:1px solid rgba(255,255,255,0.2);border-radius:9999px;padding:2px 8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">${t.nama.replace(/["&<>]/g, "")}</div>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function pinSaya() {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%)">
      <div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb, 0 0 12px #2563eb"></div>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function FitSemua({ points, posSaya }: { points: [number, number][]; posSaya: [number, number] | null }) {
  const map = useMap();
  const fitted = useRef(0);
  useEffect(() => {
    const semua = posSaya ? [...points, posSaya] : points;
    if (semua.length === 0) return;
    // Fit ulang hanya saat jumlah titik berubah (bukan tiap posisi bergerak).
    if (semua.length <= fitted.current) return;
    if (semua.length >= 2) {
      map.fitBounds(semua, { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView(semua[0], 15);
    }
    fitted.current = semua.length;
  }, [points, posSaya, map]);
  return null;
}

export default function MapAngkut({ tugas }: { tugas: TugasMap[] }) {
  const [posSaya, setPosSaya] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setPosSaya([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const points = useMemo(
    () => tugas.map((t) => [t.latitude, t.longitude] as [number, number]),
    [tugas]
  );

  const center: [number, number] = posSaya ?? (points[0] ?? PUSAT_DEPOK);
  const tileConfig = useMemo(() => getMapTileConfig("light"), []);

  return (
    <div className="rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide flex items-center gap-1.5"><span>🗺️</span> Peta Tugas</p>
        <span className="text-[10px] font-medium text-emerald-400">
          {points.length} titik · {posSaya ? "● GPS aktif" : "○ GPS…"}
        </span>
      </div>
      <div className="h-[38vh] min-h-[240px] w-full">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom
          zoomControl={false}
          className="h-full w-full"
          style={{ background: "#e8f0e6" }}
        >
          <TileLayer
            attribution={tileConfig.attribution}
            url={tileConfig.url}
            subdomains={tileConfig.subdomains}
            maxZoom={tileConfig.maxZoom}
          />

          {tugas.map((t) => (
            <Marker key={`tugas-${t.id}`} position={[t.latitude, t.longitude]} icon={pinTugas(t)}>
              <Popup>
                <div className="font-mono text-[11px]">
                  <p className="font-black uppercase">{t.nama}</p>
                  <p className="text-gray-600">{t.kodePelanggan}</p>
                  <p>{t.alamat}</p>
                  <p className={`font-black uppercase ${t.status === "diambil" ? "text-green-700" : t.status === "tidak_diangkut" ? "text-red-600" : t.status === "kosong" ? "text-amber-600" : "text-sky-600"}`}>
                    {t.status}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {posSaya && <Marker position={posSaya} icon={pinSaya()} interactive={false} />}

          <ZoomControl position="bottomright" />
          <FitSemua points={points} posSaya={posSaya} />
        </MapContainer>
      </div>
    </div>
  );
}
