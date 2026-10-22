"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-setup";
import "@/app/(public)/coverage/coverage.css";

import { useEffect, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { type ActiveBlock } from "@/lib/coverage-shared";
import { getMapTileConfig, type MapTileType } from "@/lib/map-tile";

// Icon generator untuk pin klaster warga terdaftar
function createClusterPin(block: ActiveBlock, isSelected = false) {
  const isAmber = block.status === "PERLUASAN";
  const cleanName = block.nama;
  const html = `
    <div class="clean-cluster-pin ${isAmber ? "clean-cluster-pin-amber" : ""} ${isSelected ? "clean-cluster-pin-selected" : ""}">
      <div class="clean-cluster-pin-inner">
        <span>🏡</span>
        <span>${cleanName}</span>
        <span class="clean-cluster-pin-count">${block.pelangganCount} KK</span>
      </div>
    </div>
  `;
  return L.divIcon({
    className: "clean-cluster-div-icon",
    html,
    iconSize: [0, 0],
    iconAnchor: [45, 12],
  });
}

// Icon generator untuk pin lokasi pengguna (Clean Blue Pin)
function createUserLocationIcon() {
  const html = `
    <div class="clean-user-marker">
      <div class="clean-user-halo"></div>
      <div class="clean-user-core"></div>
    </div>
  `;
  return L.divIcon({
    className: "clean-user-div-icon",
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Controller internal untuk kamera & resize Leaflet
function MapCameraController({
  target,
  onMapClick,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 15, {
        duration: 0.9,
        easeLinearity: 0.25,
      });
    }
  }, [target, map]);

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// Tombol kontrol zoom kustom
function CustomZoomControls({ onReset }: { onReset: () => void }) {
  const map = useMap();

  return (
    <div className="absolute right-3 bottom-3 z-30 pointer-events-auto flex flex-col gap-1.5 shadow-md">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
        title="Perbesar Peta"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
        title="Perkecil Peta"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 rounded-lg flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
        title="Pusatkan ke Depok"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface CoverageLeafletMapProps {
  blocks: ActiveBlock[];
  selectedBlock: ActiveBlock | null;
  userLocation: { lat: number; lng: number } | null;
  cameraTarget: { lat: number; lng: number; zoom?: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onBlockClick: (block: ActiveBlock) => void;
  onResetCamera: () => void;
}

export default function CoverageLeafletMap({
  blocks,
  selectedBlock,
  userLocation,
  cameraTarget,
  onMapClick,
  onBlockClick,
  onResetCamera,
}: CoverageLeafletMapProps) {
  const [tileMode, setTileMode] = useState<MapTileType>("osm");
  const tileConfig = getMapTileConfig(tileMode);

  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-[540px] clean-coverage-map">
      {/* Map Tile Switcher */}
      <div className="absolute right-3 top-3 z-30 pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 p-1 rounded-xl shadow-md flex items-center gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setTileMode("osm")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            tileMode === "osm" ? "bg-emerald-700 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🗺️ Peta Jalan
        </button>
        <button
          type="button"
          onClick={() => setTileMode("esri-satellite")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            tileMode === "esri-satellite" ? "bg-emerald-700 text-white font-extrabold shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🛰️ Satelit
        </button>
      </div>

      <MapContainer
        center={[-6.4385, 106.8355]}
        zoom={14}
        minZoom={11}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          key={tileMode}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          subdomains={tileConfig.subdomains}
          maxZoom={tileConfig.maxZoom}
        />

        <MapCameraController target={cameraTarget} onMapClick={onMapClick} />
        <CustomZoomControls onReset={onResetCamera} />

        {/* Soft Aura Layanan Sekitar Klaster */}
        {blocks.map((block) => (
          <Circle
            key={`aura-${block.id}`}
            center={[block.lat, block.lng]}
            radius={380}
            pathOptions={{
              color: block.status === "PERLUASAN" ? "#f59e0b" : "#059669",
              fillColor: block.status === "PERLUASAN" ? "#f59e0b" : "#059669",
              fillOpacity: 0.05,
              weight: 1,
            }}
          />
        ))}

        {/* Pin 23 Klaster Warga Terdaftar */}
        {blocks.map((block) => {
          const isSelected = selectedBlock?.id === block.id;
          return (
            <Marker
              key={block.id}
              position={[block.lat, block.lng]}
              icon={createClusterPin(block, isSelected)}
              eventHandlers={{
                click: () => onBlockClick(block),
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} className="clean-tooltip">
                <div className="text-center font-sans">
                  <p className="font-extrabold text-slate-900 text-xs">{block.nama}</p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    {block.pelangganCount} KK Aktif • {block.jadwal}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {block.armada} • Kel. {block.kelurahan}
                  </p>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Pin Titik Pilihan Pengguna */}
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()} />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={120}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Floating Info Pill at Bottom-Left of Map */}
      <div className="absolute left-3 bottom-3 z-20 pointer-events-none bg-white/95 backdrop-blur-md border border-slate-200/90 py-1.5 px-3 rounded-xl shadow-sm text-[11px] text-slate-600 font-medium hidden sm:flex items-center gap-1.5">
        <span>💡</span>
        <span>Klik pin klaster atau klik titik mana saja di peta untuk cek jadwal.</span>
      </div>
    </div>
  );
}
