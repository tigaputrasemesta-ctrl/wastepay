/**
 * Palet Warna Khusus Blok & Zonasi Layanan UPS HERU
 * Menghasilkan warna kontras yang estetik, mudah dibedakan, dan ramah aksesibilitas
 * baik pada basemap mode terang (OSM) maupun mode gelap / satelit.
 */

export const BLOK_PALETTE = [
  "#2563eb", // Royal Blue (Blok Bakung / A)
  "#16a34a", // Emerald Green (Blok YKP Kelapa / B)
  "#d97706", // Amber Orange (Blok Gg Niman)
  "#dc2626", // Crimson Red (Blok Dmiles / SMPN 6)
  "#9333ea", // Purple Violet (Blok Setu)
  "#0891b2", // Cyan Blue (Blok Sasak)
  "#ea580c", // Deep Tangerine (Blok H Puah)
  "#4f46e5", // Indigo (Blok Santri)
  "#059669", // Deep Teal (Blok Berkah Raya)
  "#e11d48", // Rose Red (Blok Raya Cilodong)
  "#65a30d", // Lime Green (Blok Kp Bulak)
  "#c026d3", // Fuchsia Pink (Blok Sarin)
  "#0284c7", // Sky Blue (Blok Agisna)
  "#ca8a04", // Gold Yellow (Blok THR)
  "#7c3aed", // Bright Violet (Blok Kibeng)
  "#0d9488", // Aqua Teal (Blok MTS)
  "#db2777", // Pink Magenta (Blok Kebon Duren)
  "#b45309", // Bronze Brown (Blok Talang Baduri)
  "#475569", // Slate Blue (Blok Tabroni)
  "#15803d", // Forest Green (Blok Umar)
  "#1d4ed8", // Cobalt (Blok Sawah)
  "#b91c1c", // Deep Ruby (Blok Pete)
  "#6d28d9", // Dark Purple (Blok Raya Kalibaru)
  "#0e7490", // Ocean Blue (Blok Nirun)
];

// Peta warna statis untuk blok operasional utama agar selalu konsisten
const KNOWN_BLOK_WARNA: Record<string, string> = {
  setu: "#9333ea",
  bakung: "#2563eb",
  ykp: "#16a34a",
  kelapa: "#16a34a",
  puah: "#ea580c",
  hpuah: "#ea580c",
  sasak: "#0891b2",
  dmiles: "#dc2626",
  smp6: "#dc2626",
  berkah: "#059669",
  santri: "#4f46e5",
  niman: "#d97706",
  sarin: "#c026d3",
  cilodong: "#e11d48",
  bulak: "#65a30d",
  agisna: "#0284c7",
  thr: "#ca8a04",
  kibeng: "#7c3aed",
  mts: "#0d9488",
  duren: "#db2777",
  baduri: "#b45309",
  tabroni: "#475569",
  umar: "#15803d",
  sawah: "#1d4ed8",
  pete: "#b91c1c",
  nirun: "#0e7490",
};

/**
 * Mengambil warna unik yang konsisten untuk sebuah Blok atau Kelurahan.
 * Jika blok dikenal, gunakan warna signature-nya.
 * Jika tidak, gunakan hash string deterministik terhadap BLOK_PALETTE.
 */
export function getWarnaBlok(namaOrId: string | number | null | undefined): string {
  if (namaOrId == null) return "#64748b";

  if (typeof namaOrId === "number") {
    return BLOK_PALETTE[Math.abs(namaOrId) % BLOK_PALETTE.length];
  }

  const raw = String(namaOrId).trim().toLowerCase();
  if (!raw) return "#64748b";

  // Cek pencocokan kata kunci pada blok yang dikenal
  for (const [key, color] of Object.entries(KNOWN_BLOK_WARNA)) {
    if (raw.includes(key)) {
      return color;
    }
  }

  // Fallback: Hash string deterministik
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }

  return BLOK_PALETTE[Math.abs(hash) % BLOK_PALETTE.length];
}
