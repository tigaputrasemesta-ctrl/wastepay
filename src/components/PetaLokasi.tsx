"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LeafletEvent, LeafletMouseEvent } from "leaflet";
import { getMapTileConfig } from "@/lib/map-tile";

const PUSAT_DEPOK: [number, number] = [-6.4005, 106.8242];

type Props = {
  latitude: number | null;
  longitude: number | null;
  /** Jika diset, pin bisa diklik/digandeng untuk memindahkan titik. */
  onChange?: (lat: number, lng: number) => void;
  className?: string;
  scrollWheelZoom?: boolean;
};

function pinRumah() {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <span style="background:#16a34a;border:2px solid #000;box-shadow:2px 2px 0 rgba(0,0,0,1);width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;">🏠</span>
      <span style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #000;"></span>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function Titik({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange?: (lat: number, lng: number) => void;
}) {
  // Klik pada peta memindahkan titik (hanya saat mode edit).
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onChange?.(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={[latitude, longitude]}
      draggable={!!onChange}
      icon={pinRumah()}
      eventHandlers={
        onChange
          ? {
              dragend(e: LeafletEvent) {
                const p = (e.target as L.Marker).getLatLng();
                onChange(p.lat, p.lng);
              },
            }
          : undefined
      }
    />
  );
}

/** Pusatkan peta ke titik hanya saat pertama kali titik valid muncul. */
function PusatAwal({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  const sudah = useRef(false);
  useEffect(() => {
    if (!sudah.current) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
      sudah.current = true;
    }
  }, [latitude, longitude, map]);
  return null;
}

export default function PetaLokasi({
  latitude,
  longitude,
  onChange,
  className = "h-64",
  scrollWheelZoom = false,
}: Props) {
  const valid =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const center: [number, number] = valid ? [latitude!, longitude!] : PUSAT_DEPOK;

  const tileConfig = getMapTileConfig("light");

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={scrollWheelZoom}
      className={`w-full ${className}`}
      style={{ background: "#e8f0e6" }}
    >
      <TileLayer
        attribution={tileConfig.attribution}
        url={tileConfig.url}
        subdomains={tileConfig.subdomains}
        className={tileConfig.className}
      />
      {valid && (
        <Titik latitude={latitude!} longitude={longitude!} onChange={onChange} />
      )}
      {valid && <PusatAwal latitude={latitude!} longitude={longitude!} />}
    </MapContainer>
  );
}
