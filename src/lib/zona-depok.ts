import data from "./geojson/rt-rtrw-depok.json";

/**
 * Data RT/lingkungan NYATA dari RTRW (gatewaystaging.rtrw.app/api/lingkungan/find-nearest)
 * Hasil sampling grid koordinat seluruh Kota Depok (63 RT, 11 kecamatan).
 * Kode = kode wilayah Kemendagri (prefix 3276 = Kota Depok; 3201xx = Kab. Bogor, tidak dipakai).
 * Warna: per kelurahan — ramp hijau→teal per kecamatan (Cilodong = lime brand).
 * Zonasi di peta = Voronoi dari titik-titik RT ini (wilayah snap find-nearest RTRW).
 */
export type RtRtrw = {
  id: string;
  kode: string; // kode kelurahan Kemendagri (3276xxxxx)
  kelurahan: string;
  kecamatan: string;
  lat: number;
  lng: number;
  warna: string;
};

export const RT_RTRW_DEPOK: RtRtrw[] = data;

// Batas Kota Depok (bbox — dipakai untuk clipping Voronoi & validasi titik)
export const DEPOK_BOUNDS = { minLat: -6.475, maxLat: -6.315, minLng: 106.695, maxLng: 106.935 };
