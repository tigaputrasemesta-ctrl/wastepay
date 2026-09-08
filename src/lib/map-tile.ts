/**
 * Konfigurasi Tile Map untuk Leaflet:
 * - Jika `NEXT_PUBLIC_CARTO_API_KEY` disetel, menggunakan CARTO basemaps dengan parameter `?key=...`
 * - Jika belum disetel, fallback otomatis ke OpenStreetMap (100% gratis, tanpa batas, tanpa watermark API key)
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
      className: "",
    };
  }

  // Fallback bebas API key menggunakan OpenStreetMap resmi
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> kontributor',
    subdomains: "abc",
    className: theme === "dark" ? "map-tiles-dark" : "",
  };
}
