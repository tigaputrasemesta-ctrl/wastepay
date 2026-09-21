/**
 * Konfigurasi Tile Map untuk Leaflet:
 * - "osm" (Default): OpenStreetMap standard jalan, 100% Legal dan open source.
 * - "esri-satellite": Esri World Imagery. Sangat tajam dan legal untuk public web maps.
 * - "dark": ESRI World Dark Gray Canvas (matte gelap untuk dashboard wallboard)
 * - Jika `NEXT_PUBLIC_CARTO_API_KEY` disetel, beralih ke CARTO tiles dengan `?key=...`
 */
export type MapTileType = "osm" | "esri-satellite" | "dark" | "light";

export function getMapTileConfig(type: MapTileType = "osm") {
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

  if (type === "esri-satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EAP, and the GIS User Community',
      subdomains: [],
      maxZoom: 19,
    };
  }

  // Default: OpenStreetMap (OSM) ("osm" / "light")
  // 100% legal, gratis, tanpa takut blokir API.
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    subdomains: ["a", "b", "c"],
    maxZoom: 19,
  };
}
