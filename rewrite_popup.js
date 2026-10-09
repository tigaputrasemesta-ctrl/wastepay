const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

const newPopupHtmlFunction = `
function popupHtml(p: PelangganPeta): string {
  try {
    const warnaInfo = getWarnaTagihan(p);
    
    // Formatting rupiah
    const formatRp = (angka: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(angka);
    };

    // Ambil tarif tagihan dari tagihan terbaru jika ada
    let tarifTagihan = "—";
    if (p.riwayatTagihan && p.riwayatTagihan.length > 0) {
      tarifTagihan = formatRp(p.riwayatTagihan[0].jumlah);
    }

    // Hitung telat berapa hari
    const hitungTelat = (jatuhTempoIso: string | null) => {
      if (!jatuhTempoIso) return "";
      const jt = new Date(jatuhTempoIso);
      const skrg = new Date();
      const selisihMs = skrg.getTime() - jt.getTime();
      const selisihHari = Math.floor(selisihMs / (1000 * 60 * 60 * 24));
      if (selisihHari > 0) return \`telat \${selisihHari} hari\`;
      return "";
    };

    const riwayatHtml = p.riwayatTagihan && p.riwayatTagihan.length > 0 
      ? \`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;">
          <div style="font-size:11px;font-weight:800;color:#334155;margin-bottom:6px;">STATUS PEMBAYARAN</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            \${p.riwayatTagihan.map(t => {
              const isLunas = t.status === 'lunas';
              const nm = monthNames[t.bulan - 1] || t.bulan;
              const textTelat = (!isLunas && t.status !== 'libur') ? hitungTelat(t.jatuhTempo) : "";
              
              if (isLunas) {
                return \`<div style="display:flex;justify-content:space-between;font-size:10px;background:#ecfdf5;color:#059669;padding:4px 8px;border-radius:4px;font-weight:700;">
                  <span>Bulan \${nm}</span><span>Lunas</span>
                </div>\`;
              } else {
                return \`<div style="display:flex;justify-content:space-between;font-size:10px;background:#fef2f2;color:#dc2626;padding:4px 8px;border-radius:4px;font-weight:700;">
                  <span>Bulan \${nm}</span><span>Tunggakan \${textTelat ? \`(\${textTelat})\` : ""}</span>
                </div>\`;
              }
            }).join("")}
          </div>
        </div>\`
      : \`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;font-weight:800;color:#64748b;">STATUS PEMBAYARAN: \${warnaInfo.label}</div>\`;

    const telClean = p.noTelepon ? String(p.noTelepon).replace(/\\D/g, "") : "";
    const waUrl = telClean ? \`https://wa.me/\${telClean.replace(/^0/, "62")}\` : null;
    
    return \`<div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:11px;min-width:230px;line-height:1.5;color:#334155;">
      \${
        p.fotoRumah
          ? \`<div style="margin:-14px -14px 10px -14px;border-radius:12px 12px 0 0;overflow:hidden;background:#f1f5f9;">
               <img src="\${esc(p.fotoRumah)}" alt="Foto Rumah" style="width:100%;height:150px;object-fit:cover;display:block;" onerror="this.style.display='none'" />
             </div>\`
          : ""
      }
      <div style="margin-bottom:8px;">
        <div style="font-weight:800;font-size:15px;color:#0f172a;letter-spacing:-0.2px;">\${esc(p.nama)}</div>
        <div style="color:#059669;font-size:12px;font-weight:700;font-family:ui-monospace,monospace;">\${esc(p.kodePelanggan)}</div>
      </div>
      
      <div style="margin-bottom:10px;">
        \${esc(p.alamat || "Alamat tidak tersedia")}\${p.rtRw ? " · RT/RW " + esc(p.rtRw) : ""}
      </div>
      
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;margin-bottom:10px;font-size:11px;">
        <div style="font-weight:700;color:#64748b;">TARIF TAGIHAN:</div>
        <div style="font-weight:800;color:#0f172a;">\${tarifTagihan}</div>
        
        <div style="font-weight:700;color:#64748b;">BLOK/ZONA:</div>
        <div style="font-weight:800;color:#0f172a;">\${esc(p.wilayah?.nama || p.kategori)}</div>
      </div>
      
      \${riwayatHtml}
      
      \${waUrl ? \`<div style="margin-top:12px;text-align:center;"><a href="\${waUrl}" target="_blank" rel="noreferrer" style="background:#10b981;color:#ffffff;padding:6px 12px;border-radius:8px;font-weight:700;text-decoration:none;font-size:11px;display:inline-block;box-shadow:0 2px 5px rgba(16,185,129,0.3);width:100%;">💬 Chat WhatsApp</a></div>\` : ""}
    </div>\`;
  } catch (err) {
    console.error("Gagal membuat popup pelanggan:", err);
    return \`<div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:11px;min-width:160px;line-height:1.4">
      <div style="font-weight:800;font-size:13px;color:#0f172a;">\${esc(p.nama)}</div>
      <div style="color:#059669;font-weight:700;font-family:ui-monospace,monospace;margin-bottom:4px;">\${esc(p.kodePelanggan)}</div>
      <div style="color:#475569;">\${esc(p.alamat)}</div>
    </div>\`;
  }
}
`;

// Replace the old function
const startIdx = code.indexOf('function popupHtml(p: PelangganPeta): string {');
const endIdx = code.indexOf('function popupKomplainHtml(k: KomplainPeta): string {');
if (startIdx > -1 && endIdx > -1) {
  code = code.substring(0, startIdx) + newPopupHtmlFunction + '\n' + code.substring(endIdx);
  fs.writeFileSync('src/components/MapView.tsx', code);
  console.log("Success");
} else {
  console.log("Failed to find boundaries");
}
