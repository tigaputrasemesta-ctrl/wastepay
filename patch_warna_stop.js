const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const getWarnaCode = `
export function getWarnaTagihan(p: PelangganPeta): { warna: string; label: string; tunggakanCount: number; isStopAngkut: boolean } {
  if (p.status === "libur" || p.status === "nonaktif") return { warna: "#3b82f6", label: "Libur/Nonaktif", tunggakanCount: 0, isStopAngkut: false };
  
  if (!p.riwayatTagihan || p.riwayatTagihan.length === 0) return { warna: "#8b8f98", label: "Belum Ada Tagihan", tunggakanCount: 0, isStopAngkut: false };

  let tunggakan = 0;
  let maxTelatHari = 0;
  
  for (const t of p.riwayatTagihan) {
    if (t.status === "tunggakan" || t.status === "belum_bayar") {
      tunggakan++;
      if (t.jatuhTempo) {
        const jt = new Date(t.jatuhTempo);
        const selisihMs = new Date().getTime() - jt.getTime();
        const selisihHari = Math.floor(selisihMs / (1000 * 60 * 60 * 24));
        if (selisihHari > maxTelatHari) {
          maxTelatHari = selisihHari;
        }
      }
    }
  }

  const isStopAngkut = maxTelatHari >= 7;

  if (isStopAngkut) return { warna: "#0f172a", label: "STOP ANGKUT (>7 Hari)", tunggakanCount: tunggakan, isStopAngkut: true }; // Hitam / Dark Slate

  if (tunggakan === 0) return { warna: "#10b981", label: "Lunas", tunggakanCount: 0, isStopAngkut: false };
  if (tunggakan === 1) return { warna: "#eab308", label: "Tunggakan 1 Bln", tunggakanCount: 1, isStopAngkut: false };
  if (tunggakan === 2) return { warna: "#f97316", label: "Tunggakan 2 Bln", tunggakanCount: 2, isStopAngkut: false };
  return { warna: "#ef4444", label: "Tunggakan 3+ Bln", tunggakanCount: tunggakan, isStopAngkut: false };
}
`;

const startIdx = code.indexOf('export function getWarnaTagihan(p: PelangganPeta): {');
const endIdx = code.indexOf('export type PetugasPeta = {'); // just find next big block
// wait, end of function is easier to find.
// I will just replace the whole function using regex or index.
let beforeFunc = code.substring(0, startIdx);
let afterFunc = code.substring(startIdx);
let funcEndIdx = afterFunc.indexOf('}\n') + 2;
afterFunc = afterFunc.substring(funcEndIdx);

code = beforeFunc + getWarnaCode + afterFunc;
fs.writeFileSync('src/components/MapView.tsx', code);
console.log("Success getWarnaTagihan");
