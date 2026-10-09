const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

// Find the duplicate floating returns
const floating = `  if (tunggakan === 0) return { warna: "#10b981", label: "Lunas", tunggakanCount: 0 };
  if (tunggakan === 1) return { warna: "#eab308", label: "Tunggakan 1 Bln", tunggakanCount: 1 };
  if (tunggakan === 2) return { warna: "#f97316", label: "Tunggakan 2 Bln", tunggakanCount: 2 };
  return { warna: "#ef4444", label: "Tunggakan 3+ Bln", tunggakanCount: tunggakan };
}\n`;

code = code.replace(floating, '');
fs.writeFileSync('src/components/MapView.tsx', code);
