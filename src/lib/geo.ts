import { RT_RTRW_DEPOK, DEPOK_BOUNDS } from "./zona-depok";
import type { RtRtrw } from "./zona-depok";
import { KECAMATAN_DEPOK } from "./kecamatan-depok";
import type { KecamatanGeo } from "./kecamatan-depok";

export type Titik = [number, number]; // [lat, lng]

/** Jarak haversine dalam meter antara dua titik [lat, lng]. */
export function jarakMeter(a: Titik, b: Titik): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ray-casting: apakah titik [lat,lng] berada di dalam ring poligon [lat,lng][]. */
export function titikDalamPoligon(p: Titik, ring: Titik[]): boolean {
  const [lat, lng] = p;
  let dalam = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [laI, lnI] = ring[i];
    const [laJ, lnJ] = ring[j];
    const lewat =
      lnI > lng !== lnJ > lng &&
      lat < ((laJ - laI) * (lng - lnI)) / (lnJ - lnI) + laI;
    if (lewat) dalam = !dalam;
  }
  return dalam;
}

/** Kecamatan yang memuat titik, atau null jika di luar batas kota. */
export function cariKecamatanTitik(p: Titik): KecamatanGeo | null {
  for (const k of KECAMATAN_DEPOK) {
    if (titikDalamPoligon(p, k.koordinat)) return k;
  }
  return null;
}

/** RT RTRW terdekat dari titik + jaraknya. */
export function cariRtTerdekat(p: Titik): { rt: RtRtrw; jarakM: number } {
  let terbaik: { rt: RtRtrw; jarakM: number } | null = null;
  for (const rt of RT_RTRW_DEPOK) {
    const d = jarakMeter(p, [rt.lat, rt.lng]);
    if (!terbaik || d < terbaik.jarakM) terbaik = { rt, jarakM: d };
  }
  return terbaik!;
}

/**
 * Zonasi otomatis: tentukan kelurahan & kecamatan dari koordinat.
 * Kelurahan/kecamatan diambil dari RT RTRW terdekat (kode Kemendagri asli).
 * Validasi "dalam kota": harus berada dalam polygon kecamatan resmi, ATAU
 * dalam bbox kota dan dekat RT RTRW (<= 2,5 km) — karena polygon BPS 2015
 * agak kasar di tepian, fallback ini mencegah lubang deteksi.
 * Dipakai untuk memudahkan penetapan wilayah pelanggan baru ("zonasi nantinya").
 */
export function deteksiZona(p: Titik): {
  kelurahan: string;
  kecamatan: string;
  rtId: string;
  jarakRtM: number;
} | null {
  const { rt, jarakM } = cariRtTerdekat(p);
  const kec = cariKecamatanTitik(p);
  const dalamBbox =
    p[0] >= DEPOK_BOUNDS.minLat &&
    p[0] <= DEPOK_BOUNDS.maxLat &&
    p[1] >= DEPOK_BOUNDS.minLng &&
    p[1] <= DEPOK_BOUNDS.maxLng;
  if (!kec && !(dalamBbox && jarakM <= 2500)) return null;
  return {
    kelurahan: rt.kelurahan,
    kecamatan: rt.kecamatan,
    rtId: rt.id,
    jarakRtM: Math.round(jarakM),
  };
}

/** Titik tengah sederhana (rata-rata ring) untuk penempatan label. */
export function titikTengah(ring: Titik[]): Titik {
  let la = 0;
  let ln = 0;
  for (const [a, b] of ring) {
    la += a;
    ln += b;
  }
  return [la / ring.length, ln / ring.length];
}

/** Urutkan titik secara "tetangga terdekat" dari titik awal (hemat rute). */
export function urutkanRute(points: Titik[]): Titik[] {
  if (points.length <= 2) return [...points];
  const sisa = [...points];
  const urut: Titik[] = [sisa.shift()!];
  while (sisa.length > 0) {
    const terakhir = urut[urut.length - 1];
    let idx = 0;
    let min = Infinity;
    for (let i = 0; i < sisa.length; i++) {
      const d = jarakMeter(terakhir, sisa[i]);
      if (d < min) {
        min = d;
        idx = i;
      }
    }
    urut.push(sisa.splice(idx, 1)[0]);
  }
  return urut;
}

/** Panjang total polyline (meter). */
export function panjangRute(points: Titik[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += jarakMeter(points[i - 1], points[i]);
  return total;
}

/**
 * Urutkan item pengangkutan / pelanggan secara spasial (Nearest Neighbor TSP).
 * Mengelompokkan per zona rute (jika ada) dan mengurutkan titik koordinat
 * secara berurutan agar alur mengemudi searah jalur tanpa bolak-balik.
 */
export function urutkanItemRute<T>(
  items: T[],
  getCoords: (item: T) => [number, number] | null | undefined,
  getZonaId?: (item: T) => number | null | undefined,
  startPoint?: [number, number]
): T[] {
  if (items.length <= 1) return [...items];

  // Pisahkan yang punya koordinat valid dan yang tidak
  const withCoords: { item: T; coords: Titik; zonaId?: number | null }[] = [];
  const withoutCoords: T[] = [];

  for (const item of items) {
    const coords = getCoords(item);
    if (
      coords &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number" &&
      !isNaN(coords[0]) &&
      !isNaN(coords[1]) &&
      coords[0] !== 0 &&
      coords[1] !== 0
    ) {
      const zonaId = getZonaId ? getZonaId(item) : null;
      withCoords.push({ item, coords: [coords[0], coords[1]], zonaId });
    } else {
      withoutCoords.push(item);
    }
  }

  if (withCoords.length === 0) return [...items];

  // Kumpulkan kelompok per zona (menjaga urutan blok yang muncul)
  const zonaOrder: (number | null)[] = [];
  const byZona = new Map<number | null, typeof withCoords>();

  for (const entry of withCoords) {
    const z = entry.zonaId ?? null;
    if (!byZona.has(z)) {
      byZona.set(z, []);
      zonaOrder.push(z);
    }
    byZona.get(z)!.push(entry);
  }

  const result: T[] = [];
  let currentRefPoint: Titik = startPoint || withCoords[0].coords;

  for (const z of zonaOrder) {
    const cluster = byZona.get(z)!;
    const remaining = [...cluster];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = jarakMeter(currentRefPoint, remaining[i].coords);
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const next = remaining.splice(nearestIdx, 1)[0];
      result.push(next.item);
      currentRefPoint = next.coords;
    }
  }

  // Masukkan item tanpa koordinat di baris terakhir
  result.push(...withoutCoords);
  return result;
}

export function formatJarak(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}
