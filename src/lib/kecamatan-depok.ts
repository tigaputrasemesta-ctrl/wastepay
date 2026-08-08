import data from "./geojson/depok-kecamatan.json";

export type KecamatanGeo = {
  kode: string; // 3276010, dst
  nama: string; // SAWANGAN, dst
  koordinat: [number, number][]; // [lat, lng]
};

// Batas administratif resmi kecamatan Kota Depok (BPS 2015, dari dataGeoJson).
// Ring sudah disederhanakan (3.555 titik, -74%) untuk performa render.
export const KECAMATAN_DEPOK: KecamatanGeo[] = data.features.map((f) => {
  const ring = (f.geometry as { coordinates: number[][][] }).coordinates[0];
  return {
    kode: String(f.properties.Code),
    nama: String(f.properties.Name),
    koordinat: ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  };
});

export function cariKecamatan(kode: string): KecamatanGeo | null {
  return KECAMATAN_DEPOK.find((k) => k.kode === kode) ?? null;
}
