const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const oldFuncStart = "function popupHtml(p: PelangganPeta): string {";
const startIdx = code.indexOf(oldFuncStart);
if (startIdx === -1) {
  console.log("Could not find popupHtml");
  process.exit(1);
}

// Find the end of the function. We know it ends with "\n}" after "return `<div...</div>`;\n  }\n}"
// We can just find the start of popupKomplainHtml which is the next function.
const nextFuncStart = "function popupKomplainHtml";
let endIdx = code.indexOf(nextFuncStart, startIdx);
if (endIdx === -1) {
    console.log("Could not find popupKomplainHtml");
    process.exit(1);
}

const newFunc = `function popupHtml(p: PelangganPeta): string {
  try {
    const zona =
      p.latitude != null && p.longitude != null ? deteksiZona([p.latitude, p.longitude]) : null;
    const statusTxt = TAGIHAN_LABEL[p.statusTagihan ?? ""] ?? "—";
    const telClean = p.noTelepon ? String(p.noTelepon).replace(/\\D/g, "") : "";
    const waUrl = telClean ? \`https://wa.me/\${telClean.replace(/^0/, "62")}\` : null;
    
    return \`<div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#f1f5f9;min-width:210px;line-height:1.4">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;border-bottom:1px solid #334155;padding-bottom:6px;">
        <div>
          <div style="font-weight:800;font-size:14px;color:#ffffff;letter-spacing:-0.2px;">\${esc(p.nama)}</div>
          <div style="color:#10b981;font-size:10px;font-weight:700;margin-top:1px;font-family:ui-monospace,monospace;">\${esc(p.kodePelanggan)}</div>
        </div>
      </div>
      
      <div style="color:#cbd5e1;margin-bottom:8px;">
        \${esc(p.alamat || "Alamat tidak tersedia")}\${p.rtRw ? " · RT/RW " + esc(p.rtRw) : ""}
      </div>
      
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="background:#334155;color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">KATEGORI: \${esc(KATEGORI_LABEL[p.kategori] ?? p.kategori)}</span>
        \${p.wilayah?.nama ? \`<span style="background:#334155;color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">WILAYAH: \${esc(p.wilayah.nama)}</span>\` : ""}
      </div>
      
      \${
        zona
          ? \`<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#34d399;padding:6px;border-radius:6px;margin-bottom:8px;font-weight:600;font-size:10px;">
              ZONA: \${esc((zona.kelurahan || "").toUpperCase())} · KEC. \${esc((zona.kecamatan || "").toUpperCase())}<br/>
              RT/RW #\${esc(zona.rtId)} <span style="opacity:0.8">(±\${zona.jarakRtM ?? 0}m)</span>
             </div>\`
          : ""
      }
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #334155;">
        <div style="background:\${p.statusTagihan === 'tunggakan' ? '#7f1d1d' : '#064e3b'};color:\${p.statusTagihan === 'tunggakan' ? '#fca5a5' : '#6ee7b7'};padding:3px 8px;border-radius:999px;font-weight:800;font-size:10px;display:inline-flex;align-items:center;gap:4px;border:1px solid \${p.statusTagihan === 'tunggakan' ? '#991b1b' : '#047857'};box-shadow:0 2px 4px rgba(0,0,0,0.2);">
          \${p.statusTagihan === 'tunggakan' ? '⛔' : '✓'} \${esc(statusTxt).toUpperCase()}
        </div>
        \${waUrl ? \`<a href="\${waUrl}" target="_blank" rel="noreferrer" style="background:#10b981;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:700;text-decoration:none;font-size:10px;display:inline-flex;align-items:center;box-shadow:0 2px 4px rgba(16,185,129,0.3);">💬 WA</a>\` : ""}
      </div>
    </div>\`;
  } catch (err) {
    console.error("Gagal membuat popup pelanggan:", err);
    return \`<div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#f1f5f9;min-width:160px;line-height:1.4">
      <div style="font-weight:800;font-size:13px;color:#ffffff;">\${esc(p.nama)}</div>
      <div style="color:#10b981;font-weight:700;font-family:ui-monospace,monospace;margin-bottom:4px;">\${esc(p.kodePelanggan)}</div>
      <div style="color:#cbd5e1;">\${esc(p.alamat)}</div>
    </div>\`;
  }
}

`;

code = code.substring(0, startIdx) + newFunc + code.substring(endIdx);
fs.writeFileSync('src/components/MapView.tsx', code);
console.log("MapView.tsx patched");
