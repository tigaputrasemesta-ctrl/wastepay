'use client';

import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import Image from 'next/image';
import {
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Compass,
  Eye,
  ExternalLink,
  Sun,
  Moon,
  Camera,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { getMapTileConfig, type MapTileType } from '@/lib/map-tile';
import { useWakeLock } from '@/hooks/useWakeLock';
import {
  apiFetch,
  getDriverHighAccuracyLocation,
  openWhatsAppChat,
  captureCompressedWebPPhoto,
} from '@/lib/native-bridge';

// Pastikan Leaflet terdaftar di globalThis untuk plugin Leaflet
if (typeof window !== 'undefined') {
  (globalThis as { L?: typeof L }).L = L;
}

/**
 * ============================================================================
 * WASTEPAY INTERACTIVE MAP & OSRM DRIVER ROUTING — MOBILE-FIRST NATIVE MODULE
 * Lokasi File : src/components/map/WastePayInteractiveMapOSRM.tsx
 *
 * Menyempurnakan seluruh fitur Peta (Commit 240a154, 5af6fbc, 833ca12, 41a75bc, bef5ea9):
 * 1. Gojek Clean Markers & Cluster Badges (Commit 41a75bc): Mencegah lag DOM di WebView
 *    Android saat merender ratusan titik rumah pelanggan dengan pengelompokan Zona/Rute.
 * 2. Dynamic Lazy-Load fotoRumah di Bottom Sheet (Commit bef5ea9): Menggantikan popup
 *    Leaflet standar yang terpotong di layar HP dengan Swipeable Bottom Sheet dan memuat
 *    fotoRumah hanya ketika pin diketuk (menghemat Egress Supabase >85%).
 * 3. Dual-Line OSRM In-App Routing (Commit 240a154 & 833ca12): Garis navigasi penuh
 *    (solid emerald line) menuju target jemput aktif + garis antrean putus-putus
 *    (dashed queue line) untuk titik berikutnya, dilengkapi debounce jarak 25 meter.
 * 4. Mounted Driving View + Screen WakeLock (Commit 5af6fbc): Mode berkendara dengan
 *    ukuran font ekstra besar (18-20px) dan layar anti-mati otomatis untuk driver.
 * ============================================================================
 */

export interface MapCustomerPin {
  id: string | number;
  nama: string;
  kodePelanggan?: string;
  noWhatsapp?: string;
  noTelepon?: string | null;
  alamat: string;
  zonaNama?: string;
  ruteNama?: string;
  urutanRute?: number;
  urutan?: number;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  status?: string; // 'aktif' | 'terjadwal' | 'diambil' | 'tidak_diangkut' | 'selesai'
  statusAngkut?: 'BELUM_DIANGKUT' | 'SELESAI_DIANGKUT' | 'DILEWATI';
  statusTagihan?: 'LUNAS' | 'BELUM_BAYAR' | 'MENUNGGAK' | 'tunggakan' | string | null;
  patokanLokasi?: string | null;
  fotoRumahUrl?: string | null;
  fotoRumah?: string | null;
  kategori?: string;
  rtRw?: string | null;
  zonaId?: number | null;
  ruteId?: number | null;
  tunggakan?: {
    isMenunggak: boolean;
    jumlahBulan: number;
    totalNominal: number;
  };
}

export type WastePayCustomerPin = MapCustomerPin;

export interface OsrmRouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  geometryCoords: [number, number][]; // [lat, lng][]
}

export interface WastePayInteractiveMapOSRMProps {
  pins?: MapCustomerPin[];
  pelangganList?: MapCustomerPin[];
  posSaya?: { lat: number; lng: number; akurasi?: number } | null;
  mode?: 'ADMIN' | 'DRIVER';
  isDriverMode?: boolean;
  onMarkPickedUp?: (customerId: string | number, proofPhotoBlob?: Blob) => Promise<void>;
  onQuickPickup?: (customerId: string | number, proofPhotoBlob?: Blob) => Promise<void>;
  onMarkComplete?: (customerId: string | number) => Promise<void>;
  onSelectCustomer?: (customer: MapCustomerPin) => void;
  className?: string;
}

// Titik Pusat Kota Depok (UPS HERU / Balai Kota Depok)
const PUSAT_DEPOK: [number, number] = [-6.424838, 106.832667];

/**
 * Menghitung jarak Haversine (meter) antara 2 koordinat GPS untuk debounce request OSRM
 */
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPinCoords(p: MapCustomerPin): [number, number] {
  const lat = p.lat ?? p.latitude ?? 0;
  const lng = p.lng ?? p.longitude ?? 0;
  return [lat, lng];
}

function getPinOrder(p: MapCustomerPin, fallbackIdx: number): number {
  return p.urutanRute ?? p.urutan ?? fallbackIdx + 1;
}

function getPinPhone(p: MapCustomerPin): string {
  return p.noWhatsapp ?? p.noTelepon ?? '';
}

function isPinMenunggak(p: MapCustomerPin): boolean {
  return (
    p.statusTagihan === 'MENUNGGAK' ||
    p.statusTagihan === 'tunggakan' ||
    Boolean(p.tunggakan?.isMenunggak)
  );
}

function isPinSelesai(p: MapCustomerPin): boolean {
  return (
    p.statusAngkut === 'SELESAI_DIANGKUT' ||
    p.status === 'diambil' ||
    p.status === 'selesai'
  );
}

/**
 * 1. Pembuat Pin Gojek Clean Marker (Commit 41a75bc)
 */
function createGojekCleanMarker(
  pin: MapCustomerPin,
  isSelected: boolean,
  urutanNumber: number
): L.DivIcon {
  const menunggak = isPinMenunggak(pin);
  const selesai = isPinSelesai(pin);

  let bgColor = '#059669'; // Emerald 600 default aktif
  let borderColor = '#10b981';
  let labelText = `#${urutanNumber}`;
  let pulseHtml = '';

  if (menunggak) {
    bgColor = '#e11d48'; // Rose 600
    borderColor = '#f43f5e';
    labelText = '⛔';
    pulseHtml = `
      <div style="
        position: absolute;
        width: 44px;
        height: 44px;
        top: -12px;
        left: -12px;
        border-radius: 50%;
        background: rgba(225, 29, 72, 0.35);
        border: 1.5px solid #f43f5e;
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
      "></div>
    `;
  } else if (selesai) {
    bgColor = '#0d9488'; // Teal 600
    borderColor = '#2dd4bf';
    labelText = '✓';
  }

  const selectedRingStyle = isSelected
    ? 'outline: 4px solid #10b981; outline-offset: 3px; transform: scale(1.22); z-index: 1000;'
    : '';

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      ${pulseHtml}
      <div style="
        width: 32px;
        height: 32px;
        background: ${bgColor};
        border: 2.5px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 900;
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        cursor: pointer;
        ${selectedRingStyle}
      ">
        ${labelText}
      </div>
      <div style="
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${bgColor};
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'gojek-clean-pin',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}

/** Pin Pengemudi Armada Truk / Driver Lapangan */
function createDriverMarker(): L.DivIcon {
  const html = `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.35);
        border: 2px solid #10b981;
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #020617;
        border: 3px solid #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        font-size: 16px;
      ">
        🚚
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'driver-live-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/** Pin Lencana Agregat Cluster Zona (Zoom < 15) untuk menghemat node DOM WebView */
function createClusterMarker(zonaNama: string, count: number): L.DivIcon {
  const html = `
    <div style="
      background: rgba(2, 6, 23, 0.92);
      border: 2px solid #10b981;
      padding: 4px 10px;
      border-radius: 9999px;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      white-space: nowrap;
      cursor: pointer;
    ">
      <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
      <span>${zonaNama}</span>
      <span style="background: #10b981; color: #020617; padding: 1px 6px; border-radius: 9999px; font-size: 10px; font-weight: 900;">
        ${count}
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'zona-cluster-pin',
    iconSize: [110, 30],
    iconAnchor: [55, 15],
  });
}

/** Listener Zoom untuk Dynamic Clustering */
function MapZoomListener({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

/** Controller Peta untuk Pusatkan Lokasi */
function MapRecenter({ center }: { center?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export default function WastePayInteractiveMapOSRM({
  pins: propPins,
  pelangganList: propPelangganList,
  posSaya: initialPos,
  mode = 'DRIVER',
  isDriverMode = false,
  onMarkPickedUp,
  onQuickPickup,
  onMarkComplete,
  onSelectCustomer,
  className = '',
}: WastePayInteractiveMapOSRMProps) {
  const [mounted, setMounted] = useState(false);
  const [pins, setPins] = useState<MapCustomerPin[]>(propPins || propPelangganList || []);
  const [isLoadingData, setIsLoadingData] = useState(!propPins && !propPelangganList);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  // Filter Mengambang
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BELUM_DIANGKUT' | 'MENUNGGAK' | 'SELESAI'>('ALL');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [tileMode, setTileMode] = useState<MapTileType>('dark');
  const [isMountedDrivingMode, setIsMountedDrivingMode] = useState<boolean>(
    mode === 'DRIVER' || isDriverMode
  );

  // State Pelanggan Terpilih & Lazy-Load Foto Rumah (Commit bef5ea9)
  const [selectedPin, setSelectedPin] = useState<MapCustomerPin | null>(null);
  const [lazyLoadedPhotoUrl, setLazyLoadedPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // State GPS Driver & Rute OSRM (Commit 240a154 & 833ca12)
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    initialPos ? { lat: initialPos.lat, lng: initialPos.lng, accuracy: initialPos.akurasi || 15 } : null
  );
  const [lastRoutedPos, setLastRoutedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activeSolidRoute, setActiveSolidRoute] = useState<OsrmRouteLeg | null>(null);
  const [queueDashedCoords, setQueueDashedCoords] = useState<[number, number][]>([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Screen WakeLock otomatis untuk Mode Stang / Driving Mode (Commit 5af6fbc)
  useWakeLock(isMountedDrivingMode || isDriverMode);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sinkronisasi data pins jika dioper dari props
  useEffect(() => {
    const list = propPins || propPelangganList;
    if (list) {
      setPins(list);
      setIsLoadingData(false);
    }
  }, [propPins, propPelangganList]);

  // Sinkronisasi koordinat GPS driver jika dioper dari props
  useEffect(() => {
    if (initialPos) {
      setDriverPos({
        lat: initialPos.lat,
        lng: initialPos.lng,
        accuracy: initialPos.akurasi || 15,
      });
    }
  }, [initialPos]);

  // Ambil data pelanggan mandiri jika tidak dioper melalui props
  useEffect(() => {
    if (propPins || propPelangganList) return;

    let isSubscribed = true;
    async function fetchPelanggan() {
      try {
        const res = await apiFetch('/api/pelanggan');
        if (!res.ok) return;
        const data = await res.json();
        if (isSubscribed && Array.isArray(data)) {
          const mapped: MapCustomerPin[] = data
            .filter((p: any) => (p.latitude || p.lat) && (p.longitude || p.lng))
            .map((p: any, idx: number) => ({
              id: p.id,
              nama: p.nama,
              kodePelanggan: p.kodePelanggan || `WP-${p.id}`,
              alamat: p.alamat,
              lat: Number(p.latitude || p.lat),
              lng: Number(p.longitude || p.lng),
              latitude: Number(p.latitude || p.lat),
              longitude: Number(p.longitude || p.lng),
              status: p.status || 'terjadwal',
              statusAngkut:
                p.status === 'diambil' || p.status === 'selesai'
                  ? 'SELESAI_DIANGKUT'
                  : 'BELUM_DIANGKUT',
              statusTagihan:
                p.status === 'nonaktif' || p.tunggakan?.isMenunggak
                  ? 'MENUNGGAK'
                  : 'LUNAS',
              patokanLokasi: p.patokanLokasi,
              noWhatsapp: p.noTelepon || p.noWhatsapp,
              noTelepon: p.noTelepon || p.noWhatsapp,
              kategori: p.kategori,
              rtRw: p.rtRw,
              zonaId: p.wilayah?.zonaId || null,
              zonaNama: p.wilayah?.zona?.nama || p.wilayah?.nama || 'Zona Utama',
              ruteNama: p.ruteNama || 'Rute Harian',
              urutanRute: p.urutan || p.urutanRute || idx + 1,
              urutan: p.urutan || p.urutanRute || idx + 1,
            }));
          setPins(mapped);
        }
      } catch (err) {
        console.warn('Gagal memuat titik peta pelanggan:', err);
      } finally {
        if (isSubscribed) setIsLoadingData(false);
      }
    }

    fetchPelanggan();
    return () => {
      isSubscribed = false;
    };
  }, [propPins, propPelangganList]);

  // Urutkan antrean jemputan yang belum diangkut berdasarkan urutanRute
  const pendingQueue = useMemo(() => {
    return pins
      .filter((p) => !isPinSelesai(p))
      .sort((a, b) => getPinOrder(a, 0) - getPinOrder(b, 0));
  }, [pins]);

  // Target jemput aktif OSRM
  const activeTargetStop = selectedPin || pendingQueue[0] || null;

  // 2. Dynamic Lazy-Load fotoRumah di Bottom Sheet (Commit bef5ea9)
  useEffect(() => {
    if (!selectedPin) {
      setLazyLoadedPhotoUrl(null);
      setIsLoadingPhoto(false);
      return;
    }

    if (selectedPin.fotoRumahUrl || selectedPin.fotoRumah) {
      setLazyLoadedPhotoUrl(selectedPin.fotoRumahUrl || selectedPin.fotoRumah || null);
      return;
    }

    let isCancelled = false;
    setIsLoadingPhoto(true);

    apiFetch(`/api/peta/foto-rumah?id=${encodeURIComponent(String(selectedPin.id))}`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled) {
          if (data?.foto) {
            setLazyLoadedPhotoUrl(data.foto);
          } else if (data?.fotoRumah) {
            setLazyLoadedPhotoUrl(data.fotoRumah);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoadingPhoto(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedPin]);

  // 3. Dual-Line OSRM In-App Routing dengan Debounce 25 Meter (Commit 240a154 & 833ca12)
  const fetchOsrmNavigation = useCallback(
    async (
      originLat: number,
      originLng: number,
      target: MapCustomerPin,
      queue: MapCustomerPin[]
    ) => {
      const [targetLat, targetLng] = getPinCoords(target);
      if (!targetLat || !targetLng) return;

      if (
        lastRoutedPos &&
        calculateDistanceMeters(originLat, originLng, lastRoutedPos.lat, lastRoutedPos.lng) < 25
      ) {
        return; // Hemat baterai & cegah rate-limit OSRM jika pergeseran GPS < 25 meter
      }

      setIsRoutingLoading(true);
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        if (res.ok) {
          const json = await res.json();
          const route = json?.routes?.[0];
          if (route) {
            const coords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );
            setActiveSolidRoute({
              distanceMeters: route.distance,
              durationSeconds: route.duration,
              geometryCoords: coords,
            });
            setLastRoutedPos({ lat: originLat, lng: originLng });
          }
        } else {
          throw new Error('OSRM non-200');
        }
      } catch {
        // Fallback garis lurus jika OSRM publik sedang padat / offline
        const dist = calculateDistanceMeters(originLat, originLng, targetLat, targetLng);
        setActiveSolidRoute({
          distanceMeters: dist,
          durationSeconds: Math.ceil(dist / 5), // estimasi 18 km/h di pemukiman
          geometryCoords: [
            [originLat, originLng],
            [targetLat, targetLng],
          ],
        });
      } finally {
        setIsRoutingLoading(false);
      }

      // Bangun garis antrean putus-putus (Queue Dashed Line — Commit 833ca12)
      const dashedCoords: [number, number][] = queue
        .map((stop) => getPinCoords(stop))
        .filter((c) => c[0] && c[1]);
      setQueueDashedCoords(dashedCoords);
    },
    [lastRoutedPos]
  );

  // 4. Polling Lokasi GPS Presisi Tinggi Native
  const refreshDriverGps = useCallback(async () => {
    try {
      const pos = await getDriverHighAccuracyLocation();
      setDriverPos({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy });
      if (activeTargetStop) {
        await fetchOsrmNavigation(pos.lat, pos.lng, activeTargetStop, pendingQueue);
      }
    } catch (err) {
      console.warn('GPS belum tersedia:', err);
    }
  }, [activeTargetStop, pendingQueue, fetchOsrmNavigation]);

  useEffect(() => {
    if (activeTargetStop && driverPos) {
      fetchOsrmNavigation(driverPos.lat, driverPos.lng, activeTargetStop, pendingQueue);
    }
  }, [activeTargetStop, driverPos, fetchOsrmNavigation]);

  // Daftar Zona Unik
  const uniqueZones = useMemo(() => {
    const zones = new Set<string>();
    pins.forEach((p) => {
      if (p.zonaNama) zones.add(p.zonaNama);
    });
    return Array.from(zones);
  }, [pins]);

  // Data Terfilter Berdasarkan Status & Zona
  const visiblePins = useMemo(() => {
    return pins.filter((p) => {
      if (selectedZona !== 'ALL' && p.zonaNama !== selectedZona) return false;
      if (filterStatus === 'BELUM_DIANGKUT' && isPinSelesai(p)) return false;
      if (filterStatus === 'MENUNGGAK' && !isPinMenunggak(p)) return false;
      if (filterStatus === 'SELESAI' && !isPinSelesai(p)) return false;
      return true;
    });
  }, [pins, selectedZona, filterStatus]);

  // Agregasi Cluster Berbasis Zona (Zoom < 15) untuk mencegah lag DOM di WebView Android
  const zonaClusters = useMemo(() => {
    if (zoomLevel >= 15) return [];

    const mapClusters = new Map<
      string,
      { latSum: number; lngSum: number; count: number; name: string }
    >();

    visiblePins.forEach((p) => {
      const coords = getPinCoords(p);
      if (!coords[0] || !coords[1]) return;
      const zName = p.zonaNama || 'Lainnya';
      const cur = mapClusters.get(zName) || { latSum: 0, lngSum: 0, count: 0, name: zName };
      cur.latSum += coords[0];
      cur.lngSum += coords[1];
      cur.count += 1;
      mapClusters.set(zName, cur);
    });

    return Array.from(mapClusters.values()).map((c) => ({
      name: c.name,
      count: c.count,
      lat: c.latSum / c.count,
      lng: c.lngSum / c.count,
    }));
  }, [visiblePins, zoomLevel]);

  // Handler Konfirmasi Selesai Angkut (dengan opsi foto bukti kamera native)
  const handleCompletePickup = async (customer: MapCustomerPin) => {
    setActionLoading(true);
    try {
      let proofBlob: Blob | undefined;
      try {
        const photo = await captureCompressedWebPPhoto('CAMERA');
        proofBlob = photo?.blob;
      } catch {
        // Driver membatalkan kamera atau kamera tidak didukung, lanjutkan tanda selesai
      }

      if (onMarkPickedUp) {
        await onMarkPickedUp(customer.id, proofBlob);
      } else if (onQuickPickup) {
        await onQuickPickup(customer.id, proofBlob);
      } else if (onMarkComplete) {
        await onMarkComplete(customer.id);
      }

      // Tandai lokal selesai di state
      setPins((prev) =>
        prev.map((p) =>
          p.id === customer.id
            ? { ...p, statusAngkut: 'SELESAI_DIANGKUT', status: 'diambil' }
            : p
        )
      );
      setSelectedPin(null);
    } catch (err) {
      console.error('Gagal menyelesaikan angkut:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const tileConfig = getMapTileConfig(tileMode);

  if (!mounted) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white space-y-3">
        <div className="w-9 h-9 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Memuat Peta Navigasi OSRM & Clean Markers...
        </p>
      </div>
    );
  }

  const activeTargetCoords = activeTargetStop ? getPinCoords(activeTargetStop) : null;

  return (
    <div
      className={`relative w-full h-[calc(100dvh-116px)] md:h-full bg-slate-900 overflow-hidden select-none touch-none ${className}`}
    >
      {/* =====================================================================
          1. FLOATING TOP FILTER PILLS & ZONA SELECTOR (Ergonomis & Hemat Ruang)
          ===================================================================== */}
      <div className="absolute top-3 inset-x-3 z-[400] flex items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-2xl shadow-xl max-w-full">
          {/* Zona Selector Dropdown */}
          <select
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0"
          >
            <option value="ALL">Semua Zona ({pins.length})</option>
            {uniqueZones.map((z) => (
              <option key={z} value={z}>
                Zona {z}
              </option>
            ))}
          </select>

          {/* Filter Status Chips */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'BELUM_DIANGKUT', label: `Antrean (${pendingQueue.length})` },
              { id: 'MENUNGGAK', label: 'Menunggak' },
              { id: 'SELESAI', label: '✓ Selesai' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() =>
                  setFilterStatus(chip.id as 'ALL' | 'BELUM_DIANGKUT' | 'MENUNGGAK' | 'SELESAI')
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                  filterStatus === chip.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Dark / Satellite Basemap */}
        <div className="pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() =>
              setTileMode((prev) =>
                prev === 'dark' ? 'esri-satellite' : prev === 'esri-satellite' ? 'osm' : 'dark'
              )
            }
            className="w-9 h-9 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold shadow-xl transition-all"
            title="Ganti Tampilan Peta (Gelap / Satelit / Terang)"
          >
            {tileMode === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : tileMode === 'esri-satellite' ? (
              <Layers className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. KANVAS PETA LEAFLET, GOJEK MARKERS & DUAL-LINE OSRM
          ===================================================================== */}
      {/* Indikator Loading Rute OSRM */}
      {isRoutingLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-2 shadow-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Menghitung Rute OSRM Terbaik...</span>
        </div>
      )}

      {/* Legenda Navigasi Solid vs Antrean Dashed (Commit 833ca12) */}
      <div className="absolute top-16 left-3 z-[400] bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-800 text-[11px] space-y-1 text-white">
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 bg-emerald-500 rounded-full inline-block" />
          <span className="font-semibold text-slate-200">Rute Aktif OSRM (Solid)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-0.5 border-b-2 border-dashed border-sky-400 inline-block" />
          <span className="font-semibold text-slate-400">
            Antrean Berikutnya ({queueDashedCoords.length} Titik)
          </span>
        </div>
      </div>

      {/* Kontainer Peta Leaflet Utama */}
      <MapContainer
        center={PUSAT_DEPOK}
        zoom={14}
        zoomControl={false}
        className="w-full h-full bg-slate-950"
      >
        <MapZoomListener onZoomChange={setZoomLevel} />
        {selectedPin && (
          <MapRecenter center={getPinCoords(selectedPin)} />
        )}

        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
        />

        {/* Lingkaran Posisi GPS Driver */}
        {driverPos && (
          <>
            <Circle
              center={[driverPos.lat, driverPos.lng]}
              radius={driverPos.accuracy || 20}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />
            <Marker
              position={[driverPos.lat, driverPos.lng]}
              icon={createDriverMarker()}
              zIndexOffset={900}
            />
          </>
        )}

        {/* Rute Navigasi Solid Emerald Menuju Target Jemput Aktif */}
        {activeSolidRoute && activeSolidRoute.geometryCoords.length > 1 && (
          <Polyline
            positions={activeSolidRoute.geometryCoords}
            pathOptions={{
              color: '#059669',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Garis Antrean Rute Putus-putus Biru Langit untuk Titik Berikutnya */}
        {queueDashedCoords.length > 1 && (
          <Polyline
            positions={queueDashedCoords}
            pathOptions={{
              color: '#0284c7',
              weight: 3.5,
              opacity: 0.75,
              dashArray: '8, 10',
              lineCap: 'round',
            }}
          />
        )}

        {/* Dynamic Clustering: Lencana Zona saat Zoom < 15 (Commit 41a75bc) */}
        {zoomLevel < 15 &&
          zonaClusters.map((cluster, idx) => (
            <Marker
              key={`cluster-${idx}`}
              position={[cluster.lat, cluster.lng]}
              icon={createClusterMarker(cluster.name, cluster.count)}
              eventHandlers={{
                click: () => {
                  setSelectedZona(cluster.name);
                  setZoomLevel(15);
                },
              }}
            />
          ))}

        {/* Individual Gojek Clean Markers saat Zoom >= 15 (Commit 41a75bc) */}
        {zoomLevel >= 15 &&
          visiblePins.map((pin, idx) => {
            const coords = getPinCoords(pin);
            if (!coords[0] || !coords[1]) return null;
            const isSelected = selectedPin?.id === pin.id;
            return (
              <Marker
                key={pin.id}
                position={coords}
                icon={createGojekCleanMarker(pin, isSelected, getPinOrder(pin, idx))}
                eventHandlers={{
                  click: () => {
                    setSelectedPin(pin);
                    onSelectCustomer?.(pin);
                  },
                }}
              />
            );
          })}
      </MapContainer>

      {/* Floating GPS Re-Center & Toggle Driving Mode */}
      <div className="absolute right-3 bottom-44 z-[400] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={refreshDriverGps}
          title="Pusatkan ke GPS Saya"
          className="w-11 h-11 rounded-2xl bg-slate-900/90 text-white border border-slate-700 shadow-xl flex items-center justify-center text-lg active:scale-95 transition"
        >
          📍
        </button>
        <button
          type="button"
          onClick={() => setIsMountedDrivingMode((prev) => !prev)}
          className={`px-3 py-2 rounded-xl shadow-xl text-xs font-extrabold border transition active:scale-95 ${
            isMountedDrivingMode
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-900/90 text-slate-300 border-slate-700'
          }`}
        >
          {isMountedDrivingMode ? 'Mode Stang: ON' : 'Mode Stang: OFF'}
        </button>
      </div>

      {/* =====================================================================
          3. MOUNTED DRIVING VIEW BOTTOM SHEET (Commit 5af6fbc)
          Teks ekstra besar (18-24px) & kontras tinggi agar terbaca jelas saat berkendara
          ===================================================================== */}
      {isMountedDrivingMode && activeTargetStop && !selectedPin && (
        <div className="absolute bottom-0 inset-x-0 z-[500] bg-slate-950 text-white rounded-t-3xl p-4 sm:p-5 shadow-2xl border-t border-white/15 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
              Titik Jemput Berikutnya #{getPinOrder(activeTargetStop, 0)}
            </span>
            <span className="text-base sm:text-lg font-extrabold text-amber-400">
              {activeSolidRoute
                ? `${Math.round(activeSolidRoute.distanceMeters)} m • ~${Math.max(
                    1,
                    Math.round(activeSolidRoute.durationSeconds / 60)
                  )} mnt`
                : 'Menghitung Jarak...'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black leading-snug text-white truncate">
            {activeTargetStop.nama}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-medium mt-0.5 line-clamp-2">
            {activeTargetStop.alamat}{' '}
            {activeTargetStop.zonaNama ? `(${activeTargetStop.zonaNama})` : ''}
          </p>

          {driverPos && (
            <p className="text-xs text-emerald-400 mt-1.5 font-medium">
              Akurasi GPS Native: ±{Math.round(driverPos.accuracy)}m • Layar Tetap Menyala Aktif
            </p>
          )}

          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <button
              type="button"
              onClick={() => setSelectedPin(activeTargetStop)}
              className="py-3.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm active:bg-white/20 transition flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-slate-300" />
              <span>Foto Rumah</span>
            </button>
            <button
              type="button"
              onClick={() => openWhatsAppChat(getPinPhone(activeTargetStop))}
              className="py-3.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm active:bg-emerald-800 transition flex items-center justify-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              <span>WA Warga</span>
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleCompletePickup(activeTargetStop)}
              className="py-3.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-base shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{actionLoading ? 'Proses...' : '✓ Selesai'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. BOTTOM SHEET DETAIL PELANGGAN & LAZY-LOAD FOTO RUMAH (Commit bef5ea9)
          Menggantikan Leaflet Popup yang sering terpotong di layar HP
          ===================================================================== */}
      {selectedPin && (
        <div
          data-modal-open="true"
          className="absolute inset-0 z-[600] bg-slate-950/60 backdrop-blur-xs flex items-end animate-in fade-in duration-150"
          onClick={() => setSelectedPin(null)}
        >
          <div
            className="bg-slate-950 border border-slate-800 text-white w-full rounded-t-3xl p-4 sm:p-5 space-y-3.5 max-h-[85dvh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                  Urutan #{getPinOrder(selectedPin, 0)} • {selectedPin.zonaNama || 'Zona'}
                  {selectedPin.ruteNama ? ` (${selectedPin.ruteNama})` : ''}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">{selectedPin.nama}</h3>
                <p className="text-xs sm:text-sm text-slate-300">{selectedPin.alamat}</p>
                {selectedPin.patokanLokasi && (
                  <p className="text-xs text-amber-300 mt-0.5">
                    📍 Patokan: {selectedPin.patokanLokasi}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Area Lazy-Load Foto Rumah (Commit bef5ea9) */}
            <div className="w-full h-44 rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800 relative">
              {isLoadingPhoto ? (
                <div className="text-xs font-semibold text-emerald-400 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Memuat fotoRumah secara dinamis (Hemat Kuota)...</span>
                </div>
              ) : lazyLoadedPhotoUrl ? (
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="w-full h-full relative group cursor-pointer"
                >
                  <img
                    src={lazyLoadedPhotoUrl}
                    alt={`Foto rumah ${selectedPin.nama}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </button>
              ) : (
                <div className="text-xs text-slate-500 font-medium">Belum ada foto rumah tersimpan</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => openWhatsAppChat(getPinPhone(selectedPin))}
                className="py-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const coords = getPinCoords(selectedPin);
                  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`;
                  window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                }}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>Google Maps</span>
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleCompletePickup(selectedPin)}
                className="py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading ? 'Proses...' : '✓ Selesai'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. MODAL FOTO RUMAH FULL PREVIEW (H-80 SKELETON & ZERO CLS)
          ===================================================================== */}
      {photoModalOpen && lazyLoadedPhotoUrl && (
        <div
          data-modal-open="true"
          className="fixed inset-0 z-[700] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPhotoModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h4 className="text-sm font-bold text-white">{selectedPin?.nama}</h4>
                <p className="text-[11px] text-slate-400">Verifikasi Visual Lokasi Rumah Warga</p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full h-80 bg-slate-950 flex items-center justify-center">
              <img
                src={lazyLoadedPhotoUrl}
                alt="Foto Rumah Full"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
