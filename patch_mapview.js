const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const getWarnaCode = `
export function getWarnaTagihan(p: PelangganPeta): { warna: string; label: string; tunggakanCount: number } {
  if (p.status === "libur" || p.status === "nonaktif") return { warna: "#3b82f6", label: "Libur/Nonaktif", tunggakanCount: 0 };
  
  if (!p.riwayatTagihan || p.riwayatTagihan.length === 0) return { warna: "#8b8f98", label: "Belum Ada Tagihan", tunggakanCount: 0 };

  let tunggakan = 0;
  for (const t of p.riwayatTagihan) {
    if (t.status === "tunggakan" || t.status === "belum_bayar") tunggakan++;
  }

  if (tunggakan === 0) return { warna: "#10b981", label: "Lunas", tunggakanCount: 0 };
  if (tunggakan === 1) return { warna: "#eab308", label: "Tunggakan 1 Bln", tunggakanCount: 1 };
  if (tunggakan === 2) return { warna: "#f97316", label: "Tunggakan 2 Bln", tunggakanCount: 2 };
  return { warna: "#ef4444", label: "Tunggakan 3+ Bln", tunggakanCount: tunggakan };
}
`;

// Insert after import { KOMPLAIN_LABEL, KOMPLAIN_WARNA }
code = code.replace(
  `import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";`,
  `import { KOMPLAIN_LABEL, KOMPLAIN_WARNA } from "@/lib/komplain";\n` + getWarnaCode
);

// In buatIcon, we only use 'warna' for the background, so we modify the literal "#ef4444" 
code = code.replace(
  /background:\$\{isBermasalah \? "#ef4444" : warna\}/g,
  `background:\${warna}`
);

// In ClusterPins, replace icon: buatIcon(...)
const oldIconCall = `icon: buatIcon(warnaStatus[p.status] ?? "#8b8f98", p.statusTagihan === "tunggakan"),`;
const newIconCall = `icon: buatIcon(getWarnaTagihan(p).warna, getWarnaTagihan(p).tunggakanCount >= 3),`;
code = code.replace(oldIconCall, newIconCall);

fs.writeFileSync('src/components/MapView.tsx', code);
