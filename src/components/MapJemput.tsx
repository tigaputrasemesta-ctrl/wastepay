"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl, useMap } from "react-leaflet";

export type TitikMap = { latitude: number; longitude: number };

type Props = {
  pickup: TitikMap | null;
  truk: (TitikMap & { akurasi?: number | null }) | null;
  userPos: TitikMap | null;
};

const PUSAT_DEPOK: [number, number] = [-6.4005, 106.8242];

function pinPickup() {
  return L.divIcon({
    className: "",
    html: `<div class="pin-jemput">
      <span class="pin-jemput-dot"></span>
      <span class="pin-jemput-label">RUMAH ANDA</span>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function pinTruk() {
  return L.divIcon({
    className: "",
    html: `<div class="truk-jemput">
      <span class="truk-jemput-pulse"></span>
      <span class="truk-jemput-body">🚛</span>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function pinUser() {
  return L.divIcon({
    className: "",
    html: `<div class="user-jemput"><span class="user-jemput-dot"></span></div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

/**
 * Sesuaikan viewport agar pickup + truk terlihat sekaligus.
 * Fit hanya saat jumlah titik bertambah (mis. truk baru mulai mengirim
 * posisi), BUKAN saat koordinat bergerak — supaya pergerakan truk tiap
 * polling tidak menarik-narik viewport pengguna.
 */
function FitPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fittedCount = useRef(0);
  useEffect(() => {
    if (points.length === 0 || points.length <= fittedCount.current) return;
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [90, 90], maxZoom: 17 });
    } else {
      map.setView(points[0], 16);
    }
    fittedCount.current = points.length;
  }, [points, map]);
  return null;
}

/** Terbang ke posisi perangkat saat pengguna menekan "Lokasi saya". */
function FlyToUser({ pos }: { pos: TitikMap | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.latitude, pos.longitude], Math.max(map.getZoom(), 16), { duration: 0.7 });
  }, [pos, map]);
  return null;
}

export default function MapJemput({ pickup, truk, userPos }: Props) {
  const points = useMemo(() => {
    const pts: [number, number][] = [];
    if (pickup) pts.push([pickup.latitude, pickup.longitude]);
    if (truk) pts.push([truk.latitude, truk.longitude]);
    return pts;
  }, [pickup, truk]);

  const center: [number, number] = pickup
    ? [pickup.latitude, pickup.longitude]
    : PUSAT_DEPOK;

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ background: "#e8f0e6" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />

      {/* Rute armada → rumah (garis putus-putus hijau) */}
      {pickup && truk && (
        <Polyline
          positions={[
            [truk.latitude, truk.longitude],
            [pickup.latitude, pickup.longitude],
          ]}
          pathOptions={{
            color: "#059669",
            weight: 4,
            opacity: 0.9,
            dashArray: "10 8",
            lineCap: "round",
          }}
        />
      )}

      {pickup && (
        <Marker position={[pickup.latitude, pickup.longitude]} icon={pinPickup()} interactive={false} />
      )}

      {truk && (
        <Marker position={[truk.latitude, truk.longitude]} icon={pinTruk()}>
          <Tooltip direction="top" offset={[0, -30]} className="tooltip-jemput">
            <span>🚛 Armada angkut Anda</span>
          </Tooltip>
        </Marker>
      )}

      {userPos && <Marker position={[userPos.latitude, userPos.longitude]} icon={pinUser()} interactive={false} />}

      {/* Zoom di kanan-bawah supaya tidak menimpa badge status (kiri-atas). */}
      <ZoomControl position="bottomright" />
      <FitPoints points={points} />
      <FlyToUser pos={userPos} />
    </MapContainer>
  );
}
