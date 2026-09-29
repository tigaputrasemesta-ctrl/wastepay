/**
 * Konfigurasi Tile Map untuk Leaflet:
 * - "osm" (Default): OpenStreetMap standard jalan, 100% Legal dan open source.
 * - "esri-satellite": Esri World Imagery. Sangat tajam dan legal untuk public web maps.
 * - "dark": ESRI World Dark Gray Canvas (matte gelap untuk dashboard wallboard)
 * - Jika `NEXT_PUBLIC_CARTO_API_KEY` disetel, beralih ke CARTO tiles dengan `?key=...`
 */
export type MapTileType = "osm" | "esri-satellite" | "dark" | "light";

export function getMapTileConfig(type: MapTileType = "dark") {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

  if (type === "dark") {
    // CARTO Dark Matter — obsidian black canvas dengan kontras jalan & elemen menyala
    return {
      url: cartoKey
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    };
  }

  if (type === "esri-satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EAP, and the GIS User Community',
      subdomains: [],
      maxZoom: 19,
    };
  }

  // "osm" / "light" -> CARTO Voyager (Behance LoadSwift light aesthetic dengan jalan tol/arterial kuning menyala)
  return {
    url: cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  };
}
