/**
 * Konfigurasi Tile Map untuk Leaflet:
 * - "google-streets" (Default): Peta jalan resmi Google Maps lengkap nama gang, nomor, gedung, dan POI lokal Depok
 * - "google-hybrid": Foto satelit udara resolusi tinggi Google Maps dengan overlay nama jalan dan gang
 * - "dark": ESRI World Dark Gray Canvas (matte gelap untuk dashboard wallboard)
 * - Jika `NEXT_PUBLIC_CARTO_API_KEY` disetel, beralih ke CARTO tiles dengan `?key=...`
 */
export type MapTileType = "google-streets" | "google-hybrid" | "dark" | "light";

export function getMapTileConfig(type: MapTileType = "google-streets") {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

  if (cartoKey && (type === "dark" || type === "light")) {
    const sub = type === "dark" ? "dark_all" : "light_all";
    return {
      url: `https://{s}.basemaps.cartocdn.com/${sub}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    };
  }

  if (type === "dark") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      attribution:
        '&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, HERE, Garmin',
      subdomains: "",
      maxZoom: 19,
    };
  }

  if (type === "google-hybrid") {
    return {
      url: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      attribution: '&copy; Google Maps',
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
    };
  }

  // Default: Google Maps Roadmap ("google-streets" / "light")
  // Lengkap nama gang, jalan pemukiman, RT/RW, dan bangunan di Depok
  return {
    url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps',
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
  };
}
