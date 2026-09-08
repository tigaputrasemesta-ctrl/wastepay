/**
 * Konfigurasi Tile Map untuk Leaflet:
 * - Jika `NEXT_PUBLIC_CARTO_API_KEY` disetel, menggunakan CARTO basemaps dengan parameter `?key=...`
 * - Jika belum disetel, menggunakan ESRI ArcGIS CDN:
 *   - "dark": ESRI World Dark Gray Base (tampilan gelap matte elegan tanpa filter buatan)
 *   - "light": ESRI World Street Map (peta navigasi jalan detail dengan nama gang & jalan Depok)
 *   Keduanya 100% bebas watermark, tanpa perlu API key, dan cepat/stabil.
 */
export function getMapTileConfig(theme: "light" | "dark" = "light") {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

  if (cartoKey) {
    const sub = theme === "dark" ? "dark_all" : "light_all";
    return {
      url: `https://{s}.basemaps.cartocdn.com/${sub}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    };
  }

  // Dark theme: ESRI World Dark Gray Canvas (matte gelap profesional)
  if (theme === "dark") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      attribution:
        '&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, HERE, Garmin, &copy; OpenStreetMap',
      subdomains: "",
      maxZoom: 19,
    };
  }

  // Light theme: ESRI World Street Map (peta jalan lengkap, jernih dengan nama jalan)
  return {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, Garmin, &copy; OpenStreetMap',
    subdomains: "",
    maxZoom: 19,
  };
}
