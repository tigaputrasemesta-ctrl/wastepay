"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
// Gaya marker/popup/tooltip brutalist — dipakai juga oleh /peta/tv (layar besar)
import "../app/(admin)/peta/peta.css";
import "@/lib/leaflet-setup";
import "leaflet.markercluster";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, Polygon, Polyline, Tooltip, Popup, useMap, useMapEvents } from "react-leaflet";
import { featureCollection, point } from "@turf/helpers";
import voronoi from "@turf/voronoi";
import union from "@turf/union";
import { RT_RTRW_DEPOK, DEPOK_BOUNDS } from "@/lib/zona-depok";
import { KECAMATAN_DEPOK } from "@/lib/kecamatan-depok";
import { deteksiZona, formatJarak, panjangRute, titikTengah, urutkanRute } from "@/lib/geo";
import type { Titik } from "@/lib/geo";
import type { KomplainPeta, PelangganPeta, RutePeta } from "./PetaMap";
import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";
import { getMapTileConfig, type MapTileType } from "@/lib/map-tile";
import HeatmapLayer from "./HeatmapLayer";

export type PetugasPeta = {
  petugasId: number;
  nama: string;
  jabatan: string | null;
  latitude: number;
  longitude: number;
  akurasi: number | null;
  sumber: string | null;
  updatedAt: string;
};

export type KendaraanPeta = {
  kendaraanId: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
  pengemudi: string | null;
  latitude: number;
  longitude: number;
  akurasi: number | null;
  updatedAt: string;
};

export type TransitPeta = {
  id: number;
  nama: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  aktif: boolean;
  catatan: string | null;
};

type Props = {
  pelanggan: PelangganPeta[];
  komplain: KomplainPeta[];
  petugas: PetugasPeta[];
  kendaraan: KendaraanPeta[];
  transit: TransitPeta[];
  pusatPetugas: [number, number] | null;
  selectedId: number | null;
  setSelectedId: (id: number) => void;
  selectedKomplainId: number | null;
  setSelectedKomplainId: (id: number) => void;
  selectedKendaraanId?: number | null;
  setSelectedKendaraanId?: (id: number) => void;
  selectedPetugasId?: number | null;
  setSelectedPetugasId?: (id: number) => void;
  selectedTransitId?: number | null;
  setSelectedTransitId?: (id: number) => void;
  tileMode?: MapTileType;
  setTileMode?: (mode: MapTileType) => void;
  hideTileButtons?: boolean;
  tampilkanCakupan: boolean;
  showHeatmap?: boolean;
  tampilkanBatas: boolean;
  tampilkanBatasKelurahan: boolean;
  tampilkanRt: boolean;
  ruteTerpilih: RutePeta | null;
  invalidateKey: number;
  warnaStatus: Record<string, string>;
};

const KATEGORI_LABEL: Record<string, string> = {
  level_1: "Level 1 — Volume Sangat Kecil",
  level_2: "Level 2 — Volume Kecil–Sedang",
  level_3: "Level 3 — Volume Sedang",
  level_4: "Level 4 — Volume Sedang–Besar",
  level_5: "Level 5 — Volume Besar",
  level_6: "Level 6 — Volume Sangat Besar",
  level_7: "Level 7 — Volume Ekstra Besar",
  level_8: "Level 8 — Volume Komersial Besar",
  level_9: "Level 9 — Volume Maksimal",
  level_10: "Level 10 — Volume Korporat",
};

const TAGIHAN_LABEL: Record<string, string> = {
  belum_bayar: "Belum bayar",
  lunas: "Lunas",
  tunggakan: "Tunggakan",
};

type KelurahanGeomItem = {
  nama: string;
  center: [number, number];
  polygons: [number, number][][];
  warna: string;
};

function computeKelurahanGeom(): KelurahanGeomItem[] {
  const pts = RT_RTRW_DEPOK.map((rt) =>
    point([rt.lng, rt.lat], { kelurahan: rt.kelurahan.toUpperCase(), warna: rt.warna })
  );
  const fc = featureCollection(pts);
  const bbox: [number, number, number, number] = [
    DEPOK_BOUNDS.minLng,
    DEPOK_BOUNDS.minLat,
    DEPOK_BOUNDS.maxLng,
    DEPOK_BOUNDS.maxLat,
  ];

  let voronoiPolygons;
  try {
    voronoiPolygons = voronoi(fc, { bbox });
  } catch (err) {
    console.warn("Voronoi failed:", err);
    return [];
  }

  if (!voronoiPolygons || !voronoiPolygons.features) return [];

  const map = new Map<
    string,
    {
      latSum: number;
      lngSum: number;
      points: number[][];
      warna: string;
      feature: (typeof voronoiPolygons.features)[0] | null;
    }
  >();

  voronoiPolygons.features.forEach((poly, idx) => {
    if (!poly) return;
    const rtProps = pts[idx].properties;
    if (!rtProps) return;
    const k = rtProps.kelurahan;

    const st = map.get(k) ?? {
      latSum: 0,
      lngSum: 0,
      points: [],
      warna: rtProps.warna,
      feature: null,
    };
    st.latSum += RT_RTRW_DEPOK[idx].lat;
    st.lngSum += RT_RTRW_DEPOK[idx].lng;
    st.points.push([RT_RTRW_DEPOK[idx].lng, RT_RTRW_DEPOK[idx].lat]);

    if (!st.feature) {
      st.feature = poly;
    } else {
      try {
        st.feature = union(st.feature, poly);
      } catch {
        // fallback if union fails
      }
    }

    map.set(k, st);
  });

  const result: KelurahanGeomItem[] = [];

  for (const [nama, st] of map.entries()) {
    let polyCoords: [number, number][][] = [];
    const geom = st.feature?.geometry as { type?: string; coordinates?: number[][][] | number[][][][] } | undefined;
    if (geom && geom.coordinates) {
      if (geom.type === "Polygon") {
        const coords = geom.coordinates as number[][][];
        if (coords[0]) {
          polyCoords = [coords[0].map((coord: number[]) => [coord[1], coord[0]])];
        }
      } else if (geom.type === "MultiPolygon") {
        const coords = geom.coordinates as number[][][][];
        polyCoords = coords.map((poly: number[][][]) =>
          poly[0].map((coord: number[]) => [coord[1], coord[0]])
        );
      }
    }

    result.push({
      nama,
      center: [st.latSum / st.points.length, st.lngSum / st.points.length],
      polygons: polyCoords,
      warna: st.warna,
    });
  }
  return result;
}

const KELURAHAN_GEOM: KelurahanGeomItem[] = computeKelurahanGeom();

function esc(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWaktuRelatif(iso: string): string {
  const d = new Date(iso).getTime();
  const dt = Date.now() - d;
  if (dt < 60000) return "baru saja";
  if (dt < 3600000) return `${Math.floor(dt / 60000)} mnt lalu`;
  if (dt < 86400000) return `${Math.floor(dt / 3600000)} jam lalu`;
  return `${Math.floor(dt / 86400000)} hari lalu`;
}

// ── Vector SVGs for Markers (LoadSwift GIS Platform Standard) ──
const SVG_TRUCK_DUMP = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd"><path d="M 3 6 C 2.45 6 2 6.45 2 7 L 2 14.5 C 2 15.05 2.45 15.5 3 15.5 L 4.2 15.5 C 4.6 14.3 5.7 13.5 7 13.5 C 8.3 13.5 9.4 14.3 9.8 15.5 L 14.2 15.5 C 14.6 14.3 15.7 13.5 17 13.5 C 18.3 13.5 19.4 14.3 19.8 15.5 L 21 15.5 C 21.55 15.5 22 15.05 22 14.5 L 22 11.5 C 22 10.8 21.6 10.2 21 9.8 L 18.8 8.2 C 18.3 7.8 17.7 7.5 17 7.5 L 16 7.5 L 16 7 C 16 6.45 15.55 6 15 6 Z M 4.2 8 C 3.8 8 3.5 8.3 3.5 8.7 L 3.5 12.3 C 3.5 12.7 3.8 13 4.2 13 L 13.8 13 C 14.2 13 14.5 12.7 14.5 12.3 L 14.5 8.7 C 14.5 8.3 14.2 8 13.8 8 Z M 16.5 9.2 C 16.5 8.8 16.8 8.5 17.2 8.5 L 18.2 8.5 C 18.6 8.5 19 8.7 19.3 9 L 20.3 10.2 C 20.6 10.5 20.8 10.9 20.8 11.3 L 20.8 12.2 C 20.8 12.6 20.5 13 20 13 L 16.5 13 Z" /><path d="M 7 14.5 A 2.2 2.2 0 1 0 7 18.9 A 2.2 2.2 0 0 0 7 14.5 Z M 7 15.8 A 0.9 0.9 0 1 1 7 17.6 A 0.9 0.9 0 0 1 7 15.8 Z" /><path d="M 17 14.5 A 2.2 2.2 0 1 0 17 18.9 A 2.2 2.2 0 0 0 17 14.5 Z M 17 15.8 A 0.9 0.9 0 1 1 17 17.6 A 0.9 0.9 0 0 1 17 15.8 Z" /></svg>`;

const SVG_TRUCK_PICKUP = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd"><path d="M 3 10 C 2.45 10 2 10.45 2 11 L 2 14.5 C 2 15.05 2.45 15.5 3 15.5 L 4.2 15.5 C 4.6 14.3 5.7 13.5 7 13.5 C 8.3 13.5 9.4 14.3 9.8 15.5 L 13 15.5 L 13 7.5 C 13 6.95 13.45 6.5 14 6.5 L 17 6.5 C 17.7 6.5 18.3 6.8 18.8 7.2 L 21 8.8 C 21.6 9.2 22 9.8 22 10.5 L 22 14.5 C 22 15.05 21.55 15.5 21 15.5 L 19.8 15.5 C 19.4 14.3 18.3 13.5 17 13.5 C 15.7 13.5 14.6 14.3 14.2 15.5 L 13 15.5 L 13 11 L 3 11 Z M 14.5 8 L 17 8 C 17.3 8 17.6 8.1 17.8 8.3 L 19.8 9.8 C 20.1 10 20.3 10.4 20.3 10.8 L 20.3 12.3 C 20.3 12.7 20 13 19.5 13 L 14.5 13 Z M 3.5 12 L 11.5 12 L 11.5 13.5 L 3.5 13.5 Z" /><path d="M 7 14.5 A 2.2 2.2 0 1 0 7 18.9 A 2.2 2.2 0 0 0 7 14.5 Z M 7 15.8 A 0.9 0.9 0 1 1 7 17.6 A 0.9 0.9 0 0 1 7 15.8 Z" /><path d="M 17 14.5 A 2.2 2.2 0 1 0 17 18.9 A 2.2 2.2 0 0 0 17 14.5 Z M 17 15.8 A 0.9 0.9 0 1 1 17 17.6 A 0.9 0.9 0 0 1 17 15.8 Z" /></svg>`;

const SVG_RECYCLE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M12 2L2 7.5v12a1.5 1.5 0 0 0 1.5 1.5h17a1.5 1.5 0 0 0 1.5-1.5v-12L12 2zm0 2.8l7 3.85V19H5V8.65l7-3.85z"/><path d="M8.5 12h7a1 1 0 0 1 1 1v6h-9v-6a1 1 0 0 1 1-1z"/></svg>`;

const SVG_OFFICER = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 11.9 4.2-1.2 8-6.4 8-11.9V5l-8-3zm0 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm4 9.5H8v-.8c0-1.8 2.7-2.7 4-2.7s4 .9 4 2.7v.8z"/></svg>`;

const SVG_ALERT = `<svg viewBox="0 0 24 24" width="17" height="17" fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd"><path d="M 12 3 C 12.6 3 13.1 3.3 13.4 3.9 L 21.6 18.5 C 21.9 19.1 21.9 19.8 21.5 20.3 C 21.2 20.8 20.6 21.1 20 21.1 L 4 21.1 C 3.4 21.1 2.8 20.8 2.5 20.3 C 2.1 19.8 2.1 19.1 2.4 18.5 L 10.6 3.9 C 10.9 3.3 11.4 3 12 3 Z M 12 8 C 11.4 8 11 8.4 11 9 L 11 14 C 11 14.6 11.4 15 12 15 C 12.6 15 13 14.6 13 14 L 13 9 C 13 8.4 12.6 8 12 8 Z M 12 16.5 C 11.3 16.5 10.8 17 10.8 17.7 C 10.8 18.4 11.3 19 12 19 C 12.7 19 13.2 18.4 13.2 17.7 C 13.2 17 12.7 16.5 12 16.5 Z" /></svg>`;

function renderLoadswiftPuck({
  theme,
  iconSvg,
  callsign,
  isOnline = false,
  isSelected = false,
}: {
  theme: "dump" | "pickup" | "hub" | "officer" | "alert";
  iconSvg: string;
  callsign: string;
  isOnline?: boolean;
  isSelected?: boolean;
}) {
  const pulseHtml = isOnline ? `<div class="loadswift-puck-pulse"></div>` : "";

  return `<div class="loadswift-puck-marker ${theme} ${isSelected ? "selected" : ""}">
    ${pulseHtml}
    <div class="loadswift-puck-disc">
      ${iconSvg}
    </div>
    <div class="loadswift-puck-stem"></div>
    <div class="loadswift-puck-anchor"></div>
    <div class="loadswift-puck-tag">${esc(callsign)}</div>
  </div>`;
}

function buatIcon(warna: string, isBermasalah: boolean = false) {
  return L.divIcon({
    className: "",
    html: `<div class="micro-dot-wrapper ${isBermasalah ? "tunggakan" : ""}">
      <div class="micro-dot-pin" style="background:${isBermasalah ? "#ef4444" : warna}; color:${warna};">
        ${isBermasalah ? '<span style="color:#ffffff; font-size:7px; font-weight:900; line-height:1;">!</span>' : ""}
      </div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function buatIconRute(warna: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div class="rute-node-marker" style="--rute-color:${warna};">
      <div class="rute-node-badge">${esc(label)}</div>
      <div class="rute-node-caret"></div>
      <div class="rute-node-dot"></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

function buatIconKomplain(warna: string, aktif: boolean, isBaru: boolean = false, k?: KomplainPeta) {
  const callsign = isBaru
    ? "ADUAN BARU · URGENT"
    : `ADUAN #${k?.id ?? ""} · PROSES`;

  return L.divIcon({
    className: "",
    html: renderLoadswiftPuck({
      theme: "alert",
      iconSvg: SVG_ALERT,
      callsign,
      isOnline: true,
      isSelected: aktif,
    }),
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -44],
  });
}

function popupHtml(p: PelangganPeta): string {
  try {
    const zona =
      p.latitude != null && p.longitude != null ? deteksiZona([p.latitude, p.longitude]) : null;
    const statusTxt = TAGIHAN_LABEL[p.statusTagihan ?? ""] ?? "—";
    const telClean = p.noTelepon ? String(p.noTelepon).replace(/\D/g, "") : "";
    const waUrl = telClean ? `https://wa.me/${telClean.replace(/^0/, "62")}` : null;
    
    return `<div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#f1f5f9;min-width:210px;line-height:1.4">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;border-bottom:1px solid #334155;padding-bottom:6px;">
        <div>
          <div style="font-weight:800;font-size:14px;color:#ffffff;letter-spacing:-0.2px;">${esc(p.nama)}</div>
          <div style="color:#10b981;font-size:10px;font-weight:700;margin-top:1px;font-family:ui-monospace,monospace;">${esc(p.kodePelanggan)}</div>
        </div>
      </div>
      
      <div style="color:#cbd5e1;margin-bottom:8px;">
        ${esc(p.alamat || "Alamat tidak tersedia")}${p.rtRw ? " · RT/RW " + esc(p.rtRw) : ""}
      </div>
      
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="background:#334155;color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">KATEGORI: ${esc(KATEGORI_LABEL[p.kategori] ?? p.kategori)}</span>
        ${p.wilayah?.nama ? `<span style="background:#334155;color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">WILAYAH: ${esc(p.wilayah.nama)}</span>` : ""}
      </div>
      
      ${
        zona
          ? `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#34d399;padding:6px;border-radius:6px;margin-bottom:8px;font-weight:600;font-size:10px;">
              ZONA: ${esc((zona.kelurahan || "").toUpperCase())} · KEC. ${esc((zona.kecamatan || "").toUpperCase())}<br/>
              RT/RW #${esc(zona.rtId)} <span style="opacity:0.8">(±${zona.jarakRtM ?? 0}m)</span>
             </div>`
          : ""
      }
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #334155;">
        <div style="background:${p.statusTagihan === 'tunggakan' ? '#7f1d1d' : '#064e3b'};color:${p.statusTagihan === 'tunggakan' ? '#fca5a5' : '#6ee7b7'};padding:3px 8px;border-radius:999px;font-weight:800;font-size:10px;display:inline-flex;align-items:center;gap:4px;border:1px solid ${p.statusTagihan === 'tunggakan' ? '#991b1b' : '#047857'};box-shadow:0 2px 4px rgba(0,0,0,0.2);">
          ${p.statusTagihan === 'tunggakan' ? '⛔' : '✓'} ${esc(statusTxt).toUpperCase()}
        </div>
        ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noreferrer" style="background:#10b981;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:700;text-decoration:none;font-size:10px;display:inline-flex;align-items:center;box-shadow:0 2px 4px rgba(16,185,129,0.3);">💬 WA</a>` : ""}
      </div>
    </div>`;
  } catch (err) {
    console.error("Gagal membuat popup pelanggan:", err);
    return `<div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#f1f5f9;min-width:160px;line-height:1.4">
      <div style="font-weight:800;font-size:13px;color:#ffffff;">${esc(p.nama)}</div>
      <div style="color:#10b981;font-weight:700;font-family:ui-monospace,monospace;margin-bottom:4px;">${esc(p.kodePelanggan)}</div>
      <div style="color:#cbd5e1;">${esc(p.alamat)}</div>
    </div>`;
  }
}

function popupKomplainHtml(k: KomplainPeta): string {
  try {
    const telClean = k.pelanggan?.noTelepon ? String(k.pelanggan.noTelepon).replace(/\D/g, "") : "";
    const waUrl = telClean ? `https://wa.me/${telClean.replace(/^0/, "62")}` : null;
    const wa = waUrl
      ? `<a href="${waUrl}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#131517;background:#f87171;font-family:ui-monospace,monospace;font-size:10px;font-weight:700;padding:4px 8px;border-radius:2px;text-decoration:none;letter-spacing:0.06em">HUBUNGI WA</a>`
      : "";
    return `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#f0eee6;min-width:200px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${KOMPLAIN_WARNA[k.status] ?? "#ff5c5c"}"></span>
        <span style="font-weight:700;font-size:12px;color:#ffffff;text-transform:uppercase">${esc(KOMPLAIN_LABEL[k.jenis] ?? k.jenis)}</span>
      </div>
      <div style="color:#c5c8bc;font-size:10px;margin:3px 0 8px">${esc(k.pelanggan?.nama)} · ${esc(k.pelanggan?.kodePelanggan)} · ${formatWaktuRelatif(k.createdAt)}</div>
      <div style="color:#f0eee6;line-height:1.5;border-left:2px solid ${KOMPLAIN_WARNA[k.status] ?? "#ff5c5c"};padding-left:8px">${esc(k.deskripsi)}</div>
      ${k.tanggapan ? `<div style="color:#b7e13c;margin-top:6px;font-weight:600">RESPON: ${esc(k.tanggapan)}</div>` : ""}
      <div style="color:#c5c8bc;margin-top:6px;text-transform:uppercase;font-weight:600">STATUS: ${esc(k.status)}</div>
      ${wa}
    </div>`;
  } catch (err) {
    console.error("Gagal membuat popup komplain:", err);
    return `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#ffffff;min-width:160px">
      <div style="font-weight:700">${esc(k.pelanggan?.nama)}</div>
      <div style="color:#c5c8bc">${esc(k.deskripsi)}</div>
    </div>`;
  }
}

function clusterHtml(c: L.MarkerCluster): string {
  return `<div class="vector-cluster-badge"><span>${c.getChildCount()}</span></div>`;
}

function clusterIcon(c: L.MarkerCluster): L.DivIcon {
  return L.divIcon({ className: "", html: clusterHtml(c), iconSize: [36, 36], iconAnchor: [18, 18] });
}

// Semua pin pelanggan digabung jadi cluster marker (anti-tumpuk di zoom rendah).
function PinsKendaraan({
  kendaraan,
  selectedKendaraanId,
  onPilih,
}: {
  kendaraan: KendaraanPeta[];
  selectedKendaraanId?: number | null;
  onPilih?: (id: number) => void;
}) {
  return (
    <>
      {kendaraan.map((k) => {
        const isDump = k.jenis === "dump_truck";
        const iconSvg = isDump ? SVG_TRUCK_DUMP : SVG_TRUCK_PICKUP;
        const online = Date.now() - new Date(k.updatedAt).getTime() < 15 * 60 * 1000;
        const isSelected = selectedKendaraanId === k.kendaraanId;
        const callsign = `${k.platNomor ? k.platNomor.toUpperCase() : k.nama.toUpperCase()} · ${online ? "AKTIF" : "PARKIR"}`;

        return (
          <Marker
            key={`kendaraan-${k.kendaraanId}`}
            position={[k.latitude, k.longitude]}
            eventHandlers={{
              click: () => onPilih?.(k.kendaraanId),
            }}
            icon={L.divIcon({
              className: "",
              html: renderLoadswiftPuck({
                theme: isDump ? "dump" : "pickup",
                iconSvg,
                callsign,
                isOnline: online,
                isSelected,
              }),
              iconSize: [36, 42],
              iconAnchor: [18, 42],
              popupAnchor: [0, -44],
            })}
          >
            <Tooltip sticky>
              <span className="text-[11px] text-slate-800 font-medium">
                {isDump ? "🚛 DUMP TRUCK" : "🛺 PICKUP"} — {k.nama.toUpperCase()}
                {k.platNomor ? ` · ${k.platNomor.toUpperCase()}` : ""}
                <br />
                <span className="text-slate-500">
                  {k.pengemudi ? `Pengemudi: ${k.pengemudi}` : "Tanpa pengemudi"}
                  <br />
                  {formatWaktuRelatif(k.updatedAt)} · akurasi {k.akurasi ? Math.round(k.akurasi) : "?"} m
                </span>
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

function PinsTransit({
  transit,
  selectedTransitId,
  onPilih,
}: {
  transit: TransitPeta[];
  selectedTransitId?: number | null;
  onPilih?: (id: number) => void;
}) {
  return (
    <>
      {transit.filter((t) => t.aktif).map((t) => {
        const isSelected = selectedTransitId === t.id;
        const callsign = `${t.nama.toUpperCase()} · TPS 3R`;

        return (
          <Marker
            key={`transit-${t.id}`}
            position={[t.latitude, t.longitude]}
            eventHandlers={{
              click: () => onPilih?.(t.id),
            }}
            icon={L.divIcon({
              className: "",
              html: renderLoadswiftPuck({
                theme: "hub",
                iconSvg: SVG_RECYCLE,
                callsign,
                isOnline: true,
                isSelected,
              }),
              iconSize: [36, 42],
              iconAnchor: [18, 42],
              popupAnchor: [0, -44],
            })}
          >
            <Tooltip sticky>
              <span className="text-[11px] text-slate-800 font-medium">
                ♻️ LAPAK / TITIK TRANSIT — {t.nama.toUpperCase()}
                {t.alamat ? <><br /><span className="text-slate-500">{t.alamat}</span></> : null}
                {t.catatan ? <><br /><span className="text-slate-500">{t.catatan}</span></> : null}
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

function PinsPetugas({
  petugas,
  selectedPetugasId,
  onPilih,
}: {
  petugas: PetugasPeta[];
  selectedPetugasId?: number | null;
  onPilih?: (id: number) => void;
}) {
  return (
    <>
      {petugas.map((p) => {
        const online = Date.now() - new Date(p.updatedAt).getTime() < 15 * 60 * 1000;
        const isSelected = selectedPetugasId === p.petugasId;
        const callsign = `${p.nama.toUpperCase()} · ${online ? "ONLINE" : "OFFLINE"}`;
        const jabat = (p.jabatan || "").split(",").filter(Boolean);

        return (
          <Marker
            key={`petugas-${p.petugasId}`}
            position={[p.latitude, p.longitude]}
            eventHandlers={{
              click: () => onPilih?.(p.petugasId),
            }}
            icon={L.divIcon({
              className: "",
              html: renderLoadswiftPuck({
                theme: "officer",
                iconSvg: SVG_OFFICER,
                callsign,
                isOnline: online,
                isSelected,
              }),
              iconSize: [36, 42],
              iconAnchor: [18, 42],
              popupAnchor: [0, -44],
            })}
          >
            <Tooltip sticky>
              <span className="text-[11px] text-slate-800 font-medium">
                👮 {p.nama.toUpperCase()}
                {jabat.length > 0 ? ` · ${jabat.map(j => j.toUpperCase()).join(" · ")}` : ""}
                <br />
                <span className="text-slate-500">
                  {formatWaktuRelatif(p.updatedAt)} · akurasi {p.akurasi ? Math.round(p.akurasi) : "?"} m
                </span>
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

function ClusterPins({
  pelanggan,
  warnaStatus,
  selectedId,
  onPilih,
}: {
  pelanggan: PelangganPeta[];
  warnaStatus: Record<string, string>;
  selectedId: number | null;
  onPilih: (id: number) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const clickedFromMapRef = useRef(false);

  useEffect(() => {
    const group = L.featureGroup();
    groupRef.current = group as any;
    markersRef.current.clear();

    for (const p of pelanggan) {
      if (
        p.latitude == null ||
        p.longitude == null ||
        isNaN(p.latitude) ||
        isNaN(p.longitude)
      ) {
        continue;
      }
      const m = L.marker([p.latitude, p.longitude], {
        icon: buatIcon(warnaStatus[p.status] ?? "#8b8f98", p.statusTagihan === "tunggakan"),
      });
      m.bindPopup(popupHtml(p));
      m.on("click", () => {
        clickedFromMapRef.current = true;
        onPilih(p.id);
      });
      group.addLayer(m);
      markersRef.current.set(p.id, m);
    }
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
      markersRef.current.clear();
    };
  }, [pelanggan, map, warnaStatus, onPilih]);

  // Handle selectedId dari luar (misalnya dari daftar bawah atau dropdown pencarian)
  useEffect(() => {
    if (!selectedId) return;

    if (clickedFromMapRef.current) {
      clickedFromMapRef.current = false;
      return;
    }

    const marker = markersRef.current.get(selectedId);
    if (!marker) return;

    try {
      map.flyTo(marker.getLatLng(), 18, { duration: 0.5 });
      setTimeout(() => {
        try {
          marker.openPopup();
        } catch {}
      }, 500);
    } catch (err) {
      console.warn("flyTo error:", err);
    }
  }, [selectedId, map]);

  return null;
}

// Pin komplain live (tidak di-cluster biar selalu terlihat).
function PinsKomplain({
  komplain,
  selectedKomplainId,
  onPilih,
}: {
  komplain: KomplainPeta[];
  selectedKomplainId: number | null;
  onPilih: (id: number) => void;
}) {
  return (
    <>
      {komplain.map((k) => {
        const pos = k.posisi as [number, number];
        return (
          <Marker
            key={`komplain-${k.id}`}
            position={pos}
            icon={buatIconKomplain(KOMPLAIN_WARNA[k.status] ?? "#ff5c5c", k.id === selectedKomplainId, k.status === "baru", k)}
            eventHandlers={{ click: () => onPilih(k.id) }}
          >
            <Popup closeButton={false}>
              <div dangerouslySetInnerHTML={{ __html: popupKomplainHtml(k) }} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Lacak level zoom untuk mengatur visibilitas layer.
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

// Terbang ke titik saat dipilih dari panel (petugas / kendaraan / transit / pengaduan).
function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!center) return;
    const key = `${center[0].toFixed(6)},${center[1].toFixed(6)}`;
    if (lastTargetRef.current === key) return;
    lastTargetRef.current = key;

    try {
      map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 0.7 });
    } catch (err) {
      console.warn("FlyTo error:", err);
    }
  }, [center, map]);
  return null;
}

// Fix ukuran peta saat panel kiri dicuitkan (grid berubah tapi window tidak resize).
function InvalidateSize({ invalidateKey }: { invalidateKey: number }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 380);
    return () => clearTimeout(t);
  }, [invalidateKey, map]);
  return null;
}

// Guard komponen agar hanya me-render layer Leaflet saat map container sudah siap di DOM.
function MapReadyWrapper({ children }: { children: React.ReactNode }) {
  const map = useMap();
  if (!map) return null;
  return <>{children}</>;
}

// Zoom otomatis: rute terpilih > titik pelanggan.
function FitBounds({
  rutePoints,
  points,
}: {
  rutePoints: [number, number][];
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (rutePoints.length >= 2) {
      map.fitBounds(rutePoints, { padding: [70, 70], maxZoom: 17 });
    } else if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, rutePoints, points]);
  return null;
}

export default function MapView({
  pelanggan,
  komplain,
  petugas,
  kendaraan,
  transit,
  pusatPetugas,
  selectedId,
  setSelectedId,
  selectedKomplainId,
  setSelectedKomplainId,
  selectedKendaraanId,
  setSelectedKendaraanId,
  selectedPetugasId,
  setSelectedPetugasId,
  selectedTransitId,
  setSelectedTransitId,
  tileMode: externalTileMode,
  setTileMode: externalSetTileMode,
  hideTileButtons = false,
  tampilkanCakupan,
  showHeatmap,
  tampilkanBatas,
  tampilkanBatasKelurahan,
  tampilkanRt,
  ruteTerpilih,
  invalidateKey,
  warnaStatus,
}: Props) {
  const [zoom, setZoom] = useState(13);

  const titik = useMemo(
    () => pelanggan.map((p) => [p.latitude!, p.longitude!] as [number, number]),
    [pelanggan]
  );

  // Urutan rute (tetangga terdekat) + estimasi jarak.
  const ruteTitik = useMemo(() => {
    if (!ruteTerpilih) return [] as Titik[];
    return ruteTerpilih.anggota.map((a) => [a.latitude, a.longitude] as Titik);
  }, [ruteTerpilih]);
  const ruteUrut = useMemo(() => urutkanRute(ruteTitik), [ruteTitik]);
  const jarakRute = useMemo(() => panjangRute(ruteUrut), [ruteUrut]);

  // Titik tengah (centroid) dan batas polygon kelurahan (static geometry)
  const kelurahanGeom = KELURAHAN_GEOM;

  const komplainSel = komplain.find((k) => k.id === selectedKomplainId);
  const pusatKomplain = komplainSel ? (komplainSel.posisi as [number, number]) : null;
  const kSel = kendaraan.find((k) => k.kendaraanId === selectedKendaraanId);
  const pSel = petugas.find((p) => p.petugasId === selectedPetugasId);
  const tSel = transit.find((t) => t.id === selectedTransitId);

  const pusatFly = pusatPetugas ?? (
    kSel ? [kSel.latitude, kSel.longitude] as [number, number] :
    pSel ? [pSel.latitude, pSel.longitude] as [number, number] :
    tSel ? [tSel.latitude, tSel.longitude] as [number, number] :
    (komplainSel ? pusatKomplain : null)
  );

  const [internalTileMode, setInternalTileMode] = useState<MapTileType>("osm");
  const tileMode = externalTileMode ?? internalTileMode;
  const setTileMode = externalSetTileMode ?? setInternalTileMode;
  const tileConfig = useMemo(() => getMapTileConfig(tileMode), [tileMode]);

  return (
    <div className="relative h-full w-full">
      {/* Tombol Pilihan Basemap: Gojek Clean / Klasik Hangat / Satelit / Mode Malam */}
      {!hideTileButtons && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1 shadow-lg gap-1">
          <button
            type="button"
            onClick={() => setTileMode("osm")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              tileMode === "osm"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Peta Standar Gojek Clean — bersih, nyaman di mata, dan detail jalan sangat jelas"
          >
            🛵 Gojek Clean
          </button>
          <button
            type="button"
            onClick={() => setTileMode("esri-street")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              tileMode === "esri-street"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Peta jalan bernuansa hangat dan nyaman khas navigasi"
          >
            🗺️ Klasik Hangat
          </button>
          <button
            type="button"
            onClick={() => setTileMode("esri-satellite")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              tileMode === "esri-satellite"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Foto udara satelit murni beresolusi tinggi dari Esri World Imagery"
          >
            🛰️ Satelit
          </button>
          <button
            type="button"
            onClick={() => setTileMode("dark")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              tileMode === "dark"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Mode gelap untuk operasional malam"
          >
            🌙 Malam
          </button>
        </div>
      )}

      <MapContainer
        center={[-6.424838, 106.832667]}
        zoom={14}
        scrollWheelZoom
        className={`h-full w-full ${tileConfig.isDarkFilter ? "dark-map-tiles" : ""}`}
        style={{ background: tileMode === "dark" ? "#020617" : "#f8fafc" }}
      >
        <MapReadyWrapper>
          <TileLayer
            key={tileMode}
            attribution={tileConfig.attribution}
            url={tileConfig.url}
            subdomains={tileConfig.subdomains}
            maxZoom={tileConfig.maxZoom}
          />
        <ZoomTracker onZoom={setZoom} />
        <InvalidateSize invalidateKey={invalidateKey} />

      {/* Batas kecamatan resmi (BPS) */}
      {tampilkanBatas && (
        <>
          {KECAMATAN_DEPOK.map((k) => (
            <Polygon
              key={k.kode}
              positions={k.koordinat}
              pathOptions={{
                color: "#f5a524",
                weight: 1.4,
                opacity: 0.55,
                fillColor: "#f5a524",
                fillOpacity: 0.03,
              }}
            >
              <Tooltip sticky>
                <span className="text-[11px] text-slate-800 font-medium">
                  BATAS RESMI — KEC. {k.nama}
                </span>
              </Tooltip>
            </Polygon>
          ))}
          {zoom <= 13 &&
            KECAMATAN_DEPOK.map((k) => (
              <Marker
                key={`lb-${k.kode}`}
                position={titikTengah(k.koordinat)}
                icon={L.divIcon({ className: "", html: "", iconSize: [1, 1] })}
                interactive={false}
              >
                <Tooltip permanent direction="center" className="kec-label" opacity={1}>
                  KEC. {k.nama}
                </Tooltip>
              </Marker>
            ))}
          
          {tampilkanBatasKelurahan && zoom >= 14 &&
            kelurahanGeom.map((kel) => (
              <Marker
                key={`kel-${kel.nama}`}
                position={kel.center}
                icon={L.divIcon({ className: "", html: "", iconSize: [1, 1] })}
                interactive={false}
              >
                <Tooltip permanent direction="center" className="kel-label" opacity={1}>
                  {kel.nama}
                </Tooltip>
              </Marker>
            ))}

          {/* Render polygon batas kelurahan saat zoom in */}
          {tampilkanBatasKelurahan && zoom >= 13 &&
            kelurahanGeom.map((kel) => kel.polygons.map((poly, idx) => (
              <Polygon
                key={`poly-${kel.nama}-${idx}`}
                positions={poly}
                pathOptions={{
                  color: kel.warna,
                  weight: 1.5,
                  opacity: 0.3,
                  fillColor: kel.warna,
                  fillOpacity: 0.02,
                  dashArray: "8 6"
                }}
                interactive={false}
              />
            )))}
        </>
      )}

      {/* Titik RT RTRW — hanya saat zoom cukup dalam */}
      {tampilkanRt && zoom >= 13 && (
        <>
          {RT_RTRW_DEPOK.map((rt) => (
            <CircleMarker
              key={`rt-${rt.id}`}
              center={[rt.lat, rt.lng]}
              radius={3.5}
              pathOptions={{
                color: "#131517",
                weight: 1.2,
                fillColor: rt.warna,
                fillOpacity: 1,
              }}
            >
              <Tooltip sticky>
                <span className="text-[11px] text-slate-800 font-medium">
                  RT RTRW #{rt.id} — KEL. {rt.kelurahan.toUpperCase()}
                </span>
              </Tooltip>
            </CircleMarker>
          ))}
        </>
      )}

      {/* Rute terpilih: garis urutan neon menyala + titik start/akhir + estimasi jarak */}
      {ruteTerpilih && ruteUrut.length >= 2 && (
        <>
          {/* Neon laser outer glow halo */}
          <Polyline
            positions={ruteUrut}
            pathOptions={{
              color: "#38bdf8",
              weight: 9,
              opacity: 0.45,
            }}
          />
          {/* Sharp core route dashed line */}
          <Polyline
            positions={ruteUrut}
            pathOptions={{
              color: "#f5a524",
              weight: 3.5,
              opacity: 1,
              dashArray: "8 6",
            }}
          />
          <CircleMarker
            center={ruteUrut[0]}
            radius={7}
            pathOptions={{ color: "#10b981", weight: 2, fillColor: "#10b981", fillOpacity: 0.9 }}
          >
            <Tooltip sticky>
              <span className="text-[11px] text-slate-800 font-medium">
                START · {ruteTerpilih.nama}
              </span>
            </Tooltip>
          </CircleMarker>
          <Marker position={ruteUrut[ruteUrut.length - 1]} icon={buatIconRute("#f5a524", "AKH")}>
            <Tooltip sticky>
              <span className="text-[11px] text-slate-800 font-medium">
                {ruteUrut.length} TITIK · {formatJarak(jarakRute)} (perkiraan)
              </span>
            </Tooltip>
          </Marker>
        </>
      )}

      {tampilkanCakupan &&
        pelanggan.map((p) => (
          <Circle
            key={`c-${p.id}`}
            center={[p.latitude!, p.longitude!]}
            radius={200}
            pathOptions={{
              color: "#b7e13c",
              weight: 1,
              opacity: 0.35,
              fillColor: "#b7e13c",
              fillOpacity: 0.05,
            }}
          />
        ))}

      {/* Pengaduan live */}
      {komplain.length > 0 && (
        <PinsKomplain
          komplain={komplain}
          selectedKomplainId={selectedKomplainId}
          onPilih={setSelectedKomplainId}
        />
      )}

      {/* Lokasi realtime petugas lapangan */}
      <PinsPetugas
        petugas={petugas}
        selectedPetugasId={selectedPetugasId}
        onPilih={setSelectedPetugasId}
      />

      {/* Kendaraan operasional: dump truck & mobil pickup */}
      <PinsKendaraan
        kendaraan={kendaraan}
        selectedKendaraanId={selectedKendaraanId}
        onPilih={setSelectedKendaraanId}
      />

      {/* Titik transit (lapak) */}
      <PinsTransit
        transit={transit}
        selectedTransitId={selectedTransitId}
        onPilih={setSelectedTransitId}
      />

      {showHeatmap && (
        <HeatmapLayer 
          points={pelanggan
            .filter(p => p.latitude != null && p.longitude != null && !isNaN(p.latitude) && !isNaN(p.longitude))
            .map(p => [p.latitude as number, p.longitude as number, p.statusTagihan === "tunggakan" ? 1.0 : 0.2])} 
        />
      )}

      {!showHeatmap && (
        <ClusterPins
          pelanggan={pelanggan}
          warnaStatus={warnaStatus}
          selectedId={selectedId}
          onPilih={setSelectedId}
        />
      )}

      <FlyTo center={pusatFly} />
      <FitBounds rutePoints={ruteUrut} points={titik} />
      </MapReadyWrapper>
    </MapContainer>
    </div>
  );
}
