const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

// Define a function inside popupHtml to render the riwayat
const riwayatHtmlCode = `
    const warnaInfo = getWarnaTagihan(p);
    const riwayatHtml = p.riwayatTagihan && p.riwayatTagihan.length > 0 
      ? \`<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
          <div style="font-size:10px;font-weight:800;color:#334155;margin-bottom:4px;text-transform:uppercase;">Status: <span style="color:\${warnaInfo.warna}">\${warnaInfo.label}</span></div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;">
            \${p.riwayatTagihan.map(t => {
              const isLunas = t.status === 'lunas';
              const color = isLunas ? '#10b981' : '#ef4444';
              const bg = isLunas ? '#ecfdf5' : '#fef2f2';
              const nm = monthNames[t.bulan - 1] || t.bulan;
              return \`<div style="background:\${bg};border:1px solid \${color}40;color:\${color};text-align:center;padding:2px 0;border-radius:4px;font-size:9px;font-weight:700;">\${nm} '\${t.tahun.toString().slice(2)}</div>\`;
            }).join("")}
          </div>
        </div>\`
      : \`<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;font-weight:800;color:#64748b;">STATUS: \${warnaInfo.label}</div>\`;
`;

// Insert the code just before 'return `<div style='
code = code.replace(
  `const isLunas = p.statusTagihan === "lunas";\n    \n    return \`<div`,
  `const isLunas = p.statusTagihan === "lunas";\n    ${riwayatHtmlCode}\n    return \`<div`
);

// Append ${riwayatHtml} before the WaUrl section
code = code.replace(
  `</div>\n        \${waUrl ? \`<a href="\${waUrl}"`,
  `</div>\n        \${waUrl ? \`<a href="\${waUrl}"`
);
// Wait, actually I will replace the old status pill completely.
const oldStatusHtml = `<div style="background:\${isTunggakan ? '#fef2f2' : isLunas ? '#ecfdf5' : '#f8fafc'};color:\${isTunggakan ? '#dc2626' : isLunas ? '#059669' : '#64748b'};padding:3px 9px;border-radius:999px;font-weight:800;font-size:10px;display:inline-flex;align-items:center;gap:4px;border:1px solid \${isTunggakan ? '#fecaca' : isLunas ? '#a7f3d0' : '#e2e8f0'};">\n          \${isTunggakan ? '⛔' : isLunas ? '✓' : '•'} \${esc(statusTxt).toUpperCase()}\n        </div>`;

code = code.replace(oldStatusHtml, `\${riwayatHtml}`);

fs.writeFileSync('src/components/MapView.tsx', code);
