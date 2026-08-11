"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, Polygon, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { featureCollection, point } from "@turf/helpers";
import voronoi from "@turf/voronoi";
import union from "@turf/union";
import { RT_RTRW_DEPOK, DEPOK_BOUNDS } from "@/lib/zona-depok";
import { KECAMATAN_DEPOK } from "@/lib/kecamatan-depok";
import { deteksiZona, formatJarak, panjangRute, titikTengah, urutkanRute } from "@/lib/geo";
import type { Titik } from "@/lib/geo";
import type { KomplainPeta, PelangganPeta, RutePeta } from "./PetaMap";
import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";

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
  tampilkanCakupan: boolean;
  tampilkanBatas: boolean;
  tampilkanBatasKelurahan: boolean;
  tampilkanRt: boolean;
  ruteTerpilih: RutePeta | null;
  invalidateKey: number;
  warnaStatus: Record<string, string>;
};

const KATEGORI_LABEL: Record<string, string> = {
  rumah_tangga: "Rumah Tangga",
  bisnis: "Bisnis / Toko",
  kost: "Kost",
  sekolah: "Sekolah",
  rm_makan: "Rumah Makan",
  perkantoran: "Perkantoran",
  industri: "Industri",
  lainnya: "Lainnya",
};

const TAGIHAN_LABEL: Record<string, string> = {
  belum_bayar: "Belum bayar",
  lunas: "Lunas",
  tunggakan: "Tunggakan",
};

function esc(s: string): string {
  return s
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

function buatIcon(warna: string) {
  return L.divIcon({
    className: "animated-pin",
    html: `<div style="width:14px;height:14px;transform:rotate(45deg);border-radius:3px;background:${warna};border:2px solid #131517;box-shadow:0 0 8px ${warna}77"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function buatIconRute(warna: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;transform:rotate(45deg);border-radius:3px;background:${warna};border:2px solid #131517;box-shadow:0 0 12px ${warna};display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);font-family:ui-monospace,monospace;font-size:9px;font-weight:700;color:#131517">${label}</span></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function buatIconKomplain(warna: string, aktif: boolean) {
  return L.divIcon({
    className: aktif ? "komplain-aktif" : "komplain-pin",
    html: `<div style="width:${aktif ? 22 : 16}px;height:${aktif ? 22 : 16}px;transform:rotate(45deg);border-radius:3px;background:${warna};border:2px solid #131517;box-shadow:0 0 14px ${warna}cc, 0 0 0 ${aktif ? "5px" : "3px"} rgba(255,255,255,0.12)"></div>`,
    iconSize: [aktif ? 22 : 16, aktif ? 22 : 16],
    iconAnchor: [aktif ? 11 : 8, aktif ? 11 : 8],
    popupAnchor: [0, -12],
  });
}

function popupHtml(p: PelangganPeta): string {
  const zona =
    p.latitude != null && p.longitude != null ? deteksiZona([p.latitude, p.longitude]) : null;
  const statusTxt = TAGIHAN_LABEL[p.statusTagihan ?? ""] ?? "—";
  const warnaTxt = p.statusTagihan === "tunggakan" ? "#f87171" : "#4ade80";
  const wa = p.noTelepon
    ? `<a href="https://wa.me/${String(p.noTelepon).replace(/^0/, "62")}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#131517;background:#b7e13c;font-family:ui-monospace,monospace;font-size:10px;font-weight:700;padding:4px 8px;border-radius:2px;text-decoration:none;letter-spacing:0.06em">WA ${esc(p.noTelepon)}</a>`
    : "";
  return `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#f0eee6;min-width:190px">
    <div style="font-weight:700;font-size:13px;color:#ffffff">${esc(p.nama)}</div>
    <div style="color:#b7e13c;font-size:10px;font-weight:700;margin:2px 0 6px">${esc(p.kodePelanggan)}</div>
    <div style="color:#c5c8bc;line-height:1.5">${esc(p.alamat)}${p.rtRw ? " · RT/RW " + esc(p.rtRw) : ""}</div>
    ${p.wilayah ? `<div style="color:#c5c8bc">Wilayah: ${esc(p.wilayah.nama)}</div>` : ""}
    <div style="color:#c5c8bc">Kategori: ${KATEGORI_LABEL[p.kategori] ?? p.kategori}</div>
    ${
      zona
        ? `<div style="color:#b7e13c;margin-top:6px;line-height:1.5;font-weight:600">ZONA: ${esc(
            zona.kelurahan.toUpperCase()
          )} · KEC. ${esc(zona.kecamatan.toUpperCase())}<br/>RT RTRW #${zona.rtId} (±${zona.jarakRtM} m)</div>`
        : ""
    }
    <div style="color:${warnaTxt};margin-top:6px;font-weight:700">TAGIHAN: ${statusTxt}</div>
    ${wa}
  </div>`;
}

function popupKomplainHtml(k: KomplainPeta): string {
  const wa = k.pelanggan.noTelepon
    ? `<a href="https://wa.me/${String(k.pelanggan.noTelepon).replace(/^0/, "62")}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#131517;background:#f87171;font-family:ui-monospace,monospace;font-size:10px;font-weight:700;padding:4px 8px;border-radius:2px;text-decoration:none;letter-spacing:0.06em">HUBUNGI WA</a>`
    : "";
  return `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#f0eee6;min-width:200px">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:${KOMPLAIN_WARNA[k.status] ?? "#ff5c5c"}"></span>
      <span style="font-weight:700;font-size:12px;color:#ffffff;text-transform:uppercase">${esc(KOMPLAIN_LABEL[k.jenis] ?? k.jenis)}</span>
    </div>
    <div style="color:#c5c8bc;font-size:10px;margin:3px 0 8px">${esc(k.pelanggan.nama)} · ${esc(k.pelanggan.kodePelanggan)} · ${formatWaktuRelatif(k.createdAt)}</div>
    <div style="color:#f0eee6;line-height:1.5;border-left:2px solid ${KOMPLAIN_WARNA[k.status] ?? "#ff5c5c"};padding-left:8px">${esc(k.deskripsi)}</div>
    ${k.tanggapan ? `<div style="color:#b7e13c;margin-top:6px;font-weight:600">RESPON: ${esc(k.tanggapan)}</div>` : ""}
    <div style="color:#c5c8bc;margin-top:6px;text-transform:uppercase;font-weight:600">STATUS: ${esc(k.status)}</div>
    ${wa}
  </div>`;
}

function clusterHtml(c: L.MarkerCluster): string {
  return `<div style="width:34px;height:34px;transform:rotate(45deg);border-radius:6px;background:#b7e13c;border:2px solid #131517;box-shadow:0 0 14px #b7e13c66;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);font-family:ui-monospace,monospace;font-size:12px;font-weight:700;color:#131517">${c.getChildCount()}</span></div>`;
}

function clusterIcon(c: L.MarkerCluster): L.DivIcon {
  return L.divIcon({ className: "", html: clusterHtml(c), iconSize: [34, 34], iconAnchor: [17, 17] });
}

// Semua pin pelanggan digabung jadi cluster marker (anti-tumpuk di zoom rendah).
function PinsKendaraan({ kendaraan }: { kendaraan: KendaraanPeta[] }) {
  return (
    <>
      {kendaraan.map((k) => {
        const isDump = k.jenis === "dump_truck";
        const icon = isDump ? "🚛" : k.jenis === "gerobak" ? "🛞" : "🛺";
        const warna = isDump ? "#f5a524" : "#b7e13c";
        return (
          <Marker
            key={`kendaraan-${k.kendaraanId}`}
            position={[k.latitude, k.longitude]}
            icon={L.divIcon({
              className: "",
              html: `<div class="kendaraan-marker" style="--warna:${warna}"><span class="kendaraan-head">${icon}</span><span class="kendaraan-label">${esc(k.nama)}${k.platNomor ? ` · ${esc(k.platNomor)}` : ""}</span></div>`,
              iconSize: [1, 1],
            })}
          >
            <Tooltip sticky>
              <span className="font-mono text-[10px] text-bone">
                {icon} {k.nama.toUpperCase()}
                {k.platNomor ? ` · ${k.platNomor.toUpperCase()}` : ""}
                <br />
                <span className="text-bone-dim">
                  {isDump ? "DUMP TRUCK" : k.jenis.toUpperCase()} · {k.pengemudi ? `pengemudi: ${k.pengemudi}` : "tanpa pengemudi"}
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

function PinsTransit({ transit }: { transit: TransitPeta[] }) {
  return (
    <>
      {transit.filter((t) => t.aktif).map((t) => (
        <Marker
          key={`transit-${t.id}`}
          position={[t.latitude, t.longitude]}
          icon={L.divIcon({
            className: "",
            html: `<div class="transit-marker"><span class="transit-head">▲</span><span class="transit-label">${esc(t.nama)}</span></div>`,
            iconSize: [1, 1],
          })}
        >
          <Tooltip sticky>
            <span className="font-mono text-[10px] text-bone">
              ▲ LAPAK / TITIK TRANSIT — {t.nama.toUpperCase()}
              {t.alamat ? <><br /><span className="text-bone-dim">{t.alamat}</span></> : null}
              {t.catatan ? <><br /><span className="text-bone-dim">{t.catatan}</span></> : null}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

function PinsPetugas({ petugas }: { petugas: PetugasPeta[] }) {
  return (
    <>
      {petugas.map((p) => {
        const jabat = (p.jabatan || "").split(",").filter(Boolean);
        const label = jabat.map((j) => {
          if (j === "angkut") return "ANGKUT";
          if (j === "tagih") return "TAGIH";
          if (j === "survei") return "SURVEI";
          return j.toUpperCase();
        }).join(" · ");
        return (
          <Marker
            key={`petugas-${p.petugasId}`}
            position={[p.latitude, p.longitude]}
            icon={L.divIcon({
              className: "",
              html: `<div class="petugas-marker ${label ? "" : ""}"><span class="petugas-head">🚛</span><span class="petugas-label">${esc(p.nama)}</span></div>`,
              iconSize: [1, 1],
            })}
          >
            <Tooltip sticky>
              <span className="font-mono text-[10px] text-bone">
                🚛 {p.nama.toUpperCase()}
                {label ? ` · ${label}` : ""}
                <br />
                <span className="text-bone-dim">
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
  onPilih,
}: {
  pelanggan: PelangganPeta[];
  warnaStatus: Record<string, string>;
  onPilih: (id: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterIcon,
    });
    for (const p of pelanggan) {
      if (p.latitude == null || p.longitude == null) continue;
      const m = L.marker([p.latitude, p.longitude], {
        icon: buatIcon(warnaStatus[p.status] ?? "#8b8f98"),
      });
      m.bindPopup(popupHtml(p));
      m.on("click", () => onPilih(p.id));
      group.addLayer(m);
    }
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [pelanggan, map, warnaStatus, onPilih]);
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
  const map = useMap();
  const markers = useRef(new Map<number, L.Marker>());

  // Rebuild hanya saat daftar komplain berubah (polling), bukan saat seleksi.
  useEffect(() => {
    for (const m of markers.current.values()) map.removeLayer(m);
    markers.current.clear();
    for (const k of komplain) {
      const pos = k.posisi as [number, number];
      const m = L.marker(pos, {
        icon: buatIconKomplain(KOMPLAIN_WARNA[k.status] ?? "#ff5c5c", false),
      });
      m.bindPopup(popupKomplainHtml(k));
      m.on("click", () => onPilih(k.id));
      markers.current.set(k.id, m);
      map.addLayer(m);
    }
    const semua = markers.current;
    return () => {
      for (const m of semua.values()) map.removeLayer(m);
      semua.clear();
    };
  }, [komplain, map, onPilih]);

  // Update gaya aktif tanpa membangun ulang marker.
  useEffect(() => {
    for (const k of komplain) {
      const m = markers.current.get(k.id);
      if (m) {
        m.setIcon(
          buatIconKomplain(KOMPLAIN_WARNA[k.status] ?? "#ff5c5c", k.id === selectedKomplainId)
        );
      }
    }
  }, [komplain, selectedKomplainId]);
  return null;
}

// Lacak level zoom untuk mengatur visibilitas layer.
function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

// Terbang ke titik saat dipilih dari panel.
function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 0.7 });
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
  tampilkanCakupan,
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

  // Hitung titik tengah (centroid) dan batas polygon (voronoi union) untuk tiap kelurahan
  const kelurahanGeom = useMemo(() => {
    const pts = RT_RTRW_DEPOK.map((rt) => point([rt.lng, rt.lat], { kelurahan: rt.kelurahan.toUpperCase(), warna: rt.warna }));
    const fc = featureCollection(pts);
    const bbox = [DEPOK_BOUNDS.minLng, DEPOK_BOUNDS.minLat, DEPOK_BOUNDS.maxLng, DEPOK_BOUNDS.maxLat];
    
    let voronoiPolygons;
    try {
      voronoiPolygons = voronoi(fc, { bbox });
    } catch (e) {
      console.warn("Voronoi failed:", e);
      return [];
    }

    const map = new Map<string, { latSum: number; lngSum: number; points: number[][]; warna: string; feature: any }>();

    voronoiPolygons.features.forEach((poly: any, idx: number) => {
      if (!poly) return;
      const rtProps = pts[idx].properties;
      if (!rtProps) return;
      const k = rtProps.kelurahan;
      
      const st = map.get(k) ?? { latSum: 0, lngSum: 0, points: [], warna: rtProps.warna, feature: null };
      st.latSum += RT_RTRW_DEPOK[idx].lat;
      st.lngSum += RT_RTRW_DEPOK[idx].lng;
      st.points.push([RT_RTRW_DEPOK[idx].lng, RT_RTRW_DEPOK[idx].lat]);

      if (!st.feature) {
        st.feature = poly;
      } else {
        try {
          // @ts-ignore
          st.feature = union(st.feature, poly);
        } catch (e) {
          // fallback if union fails
        }
      }
      
      map.set(k, st);
    });

    const result: { nama: string; center: [number, number]; polygons: [number, number][][]; warna: string }[] = [];
    
    for (const [nama, st] of map.entries()) {
      let polyCoords: [number, number][][] = [];
      if (st.feature && st.feature.geometry) {
        if (st.feature.geometry.type === "Polygon") {
          polyCoords = [st.feature.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])];
        } else if (st.feature.geometry.type === "MultiPolygon") {
          polyCoords = st.feature.geometry.coordinates.map((poly: number[][][]) => poly[0].map((coord: number[]) => [coord[1], coord[0]]));
        }
      }

      result.push({ 
        nama, 
        center: [st.latSum / st.points.length, st.lngSum / st.points.length],
        polygons: polyCoords,
        warna: st.warna
      });
    }
    return result;
  }, []);

  const sel = pelanggan.find((p) => p.id === selectedId);
  const pusat =
    sel?.latitude != null ? ([sel.latitude, sel.longitude] as [number, number]) : null;

  const komplainSel = komplain.find((k) => k.id === selectedKomplainId);
  const pusatKomplain = komplainSel ? (komplainSel.posisi as [number, number]) : null;
  // Prioritas terbang: petugas (direktori online) → komplain → pelanggan
  const pusatFly = pusatPetugas ?? (komplainSel ? pusatKomplain : pusat);

  return (
    <MapContainer
      center={[-6.4005, 106.8242]}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#0d0e10" }}
    >
      <MapReadyWrapper>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
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
                <span className="font-mono text-[10px] text-bone">
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
                  weight: 3,
                  opacity: 0.8,
                  fillColor: kel.warna,
                  fillOpacity: 0.1,
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
                <span className="font-mono text-[10px] text-bone">
                  RT RTRW #{rt.id} — KEL. {rt.kelurahan.toUpperCase()}
                </span>
              </Tooltip>
            </CircleMarker>
          ))}
        </>
      )}

      {/* Rute terpilih: garis urutan + titik start/akhir + estimasi jarak */}
      {ruteTerpilih && ruteUrut.length >= 2 && (
        <>
          <Polyline
            positions={ruteUrut}
            pathOptions={{
              color: "#f5a524",
              weight: 3,
              opacity: 0.95,
              dashArray: "8 6",
            }}
          />
          <CircleMarker
            center={ruteUrut[0]}
            radius={7}
            pathOptions={{ color: "#b7e13c", weight: 2, fillColor: "#b7e13c", fillOpacity: 0.9 }}
          >
            <Tooltip sticky>
              <span className="font-mono text-[10px] text-bone">
                START · {ruteTerpilih.nama}
              </span>
            </Tooltip>
          </CircleMarker>
          <Marker position={ruteUrut[ruteUrut.length - 1]} icon={buatIconRute("#f5a524", "AKH")}>
            <Tooltip sticky>
              <span className="font-mono text-[10px] text-bone">
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
      <PinsPetugas petugas={petugas} />

      {/* Kendaraan operasional: dump truck & mobil pickup */}
      <PinsKendaraan kendaraan={kendaraan} />

      {/* Titik transit (lapak) */}
      <PinsTransit transit={transit} />

      <ClusterPins pelanggan={pelanggan} warnaStatus={warnaStatus} onPilih={setSelectedId} />

      <FlyTo center={pusatFly} />
      <FitBounds rutePoints={ruteUrut} points={titik} />
      </MapReadyWrapper>
    </MapContainer>
  );
}
