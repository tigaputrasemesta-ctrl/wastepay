/**
 * Konfigurasi Tile Map untuk Leaflet:
 * - "osm" (Default): OpenStreetMap standard jalan, 100% Legal dan open source.
 * - "esri-satellite": Esri World Imagery. Sangat tajam dan legal untuk public web maps.
 * - "dark": ESRI World Dark Gray Canvas (matte gelap untuk dashboard wallboard)
 * - Jika `NEXT_PUBLIC_CARTO_API_KEY` disetel, beralih ke CARTO tiles dengan `?key=...`
 */
export type MapTileType = "osm" | "esri-satellite" | "dark" | "light";

export type MapTileConfig = {
  url: string;
  attribution: string;
  subdomains: string | string[];
  maxZoom: number;
  /** True jika basemap ini memerlukan CSS filter .dark-map-tiles untuk dark mode obsidian */
  isDarkFilter: boolean;
};

export function getMapTileConfig(type: MapTileType = "dark"): MapTileConfig {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

  if (type === "dark") {
    // Jika ada CARTO API key yang sah, gunakan CARTO Dark Matter
    if (cartoKey) {
      return {
        url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
        isDarkFilter: false,
      };
    }

    // Default tanpa CARTO API key: OpenStreetMap standar resmi + CSS filter Obsidian Dark
    // 100% Bebas dari watermark/error "API KEY REQUIRED" dan jalan/kontur menyala tajam
    return {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      subdomains: "abc",
      maxZoom: 19,
      isDarkFilter: true,
    };
  }

  if (type === "esri-satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EAP, and the GIS User Community',
      subdomains: [],
      maxZoom: 19,
      isDarkFilter: false,
    };
  }

  // "osm" / "light"
  if (cartoKey) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
      isDarkFilter: false,
    };
  }

  // Default light: OpenStreetMap standar resmi tanpa watermark
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    subdomains: "abc",
    maxZoom: 19,
    isDarkFilter: false,
  };
}
