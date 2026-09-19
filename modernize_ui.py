import re

def modernize_map_angkut():
    path = "src/components/mobile/MapAngkut.tsx"
    with open(path, "r") as f:
        content = f.read()

    # Improve drawer outer container styling
    content = content.replace(
        'className={`absolute bottom-4 left-4 right-4 rounded-3xl p-4 shadow-2xl transition-all duration-300 transform',
        'className={`absolute bottom-4 left-4 right-4 rounded-[28px] p-4 shadow-2xl transition-all duration-300 transform backdrop-blur-xl'
    )
    content = content.replace(
        'bg-slate-950/95 border-emerald-500/50 ring-2 ring-emerald-500/20',
        'bg-slate-900/85 border-emerald-500/50 ring-2 ring-emerald-500/30'
    )

    # Improve Badges
    content = content.replace(
        'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse',
        'bg-gradient-to-r from-rose-600 to-rose-500 text-white border-0 shadow-lg shadow-rose-500/40 animate-pulse'
    )
    content = content.replace(
        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-0 shadow-lg shadow-emerald-500/30'
    )
    content = content.replace(
        'bg-sky-500/20 text-sky-300 border border-sky-500/40',
        'bg-gradient-to-r from-sky-600 to-blue-500 text-white border-0 shadow-lg shadow-blue-500/30'
    )

    # Improve Arrears Info Block
    content = content.replace(
        'bg-rose-950/70 border border-rose-800 text-[11px] text-rose-200',
        'bg-rose-950/40 backdrop-blur-md border border-rose-500/30 text-xs text-rose-100 shadow-inner'
    )

    # Improve Action Buttons
    content = content.replace(
        'py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-500',
        'py-2.5 px-2 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500'
    )
    content = content.replace(
        'py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500',
        'py-2.5 px-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500'
    )
    content = content.replace(
        'py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700',
        'py-2.5 px-2 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
    )
    content = content.replace(
        'py-2 px-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900',
        'py-2.5 px-2 rounded-2xl bg-gradient-to-b from-emerald-800 to-emerald-900 border-none'
    )

    with open(path, "w") as f:
        f.write(content)


def modernize_mapview():
    path = "src/components/MapView.tsx"
    with open(path, "r") as f:
        content = f.read()

    # Redesign Leaflet Popup HTML
    old_html = r'<div style="font-family:ui-monospace,monospace;font-size:11px;color:#f0eee6;min-width:190px">\n      <div style="font-weight:700;font-size:13px;color:#ffffff">\$\{esc\(p\.nama\)\}</div>\n      <div style="color:#b7e13c;font-size:10px;font-weight:700;margin:2px 0 6px">\$\{esc\(p\.kodePelanggan\)\}</div>\n      <div style="color:#c5c8bc;line-height:1\.5">\$\{esc\(p\.alamat \|\| "Alamat tidak tersedia"\)\}\$\{p\.rtRw \? " · RT/RW " \+ esc\(p\.rtRw\) : ""\}</div>\n      \$\{p\.wilayah\?\.nama \? `<div style="color:#c5c8bc">Wilayah: \$\{esc\(p\.wilayah\.nama\)\}</div>` : ""\}\n      <div style="color:#c5c8bc">Kategori: \$\{esc\(KATEGORI_LABEL\[p\.kategori\] \?\? p\.kategori\)\}</div>\n      \$\{\n        zona\n          \? `<div style="color:#b7e13c;margin-top:6px;line-height:1\.5;font-weight:600">ZONA: \$\{esc\(\n              \(zona\.kelurahan \|\| ""\)\.toUpperCase\(\)\n            \)\} · KEC\. \$\{esc\(\(zona\.kecamatan \|\| ""\)\.toUpperCase\(\)\)\}<br/>RT RTRW #\$\{esc\(zona\.rtId\)\} \(±\$\{zona\.jarakRtM \?\? 0\} m\)</div>`\n          : ""\n      \}\n      <div style="color:\$\{warnaTxt\};margin-top:6px;font-weight:700">TAGIHAN: \$\{esc\(statusTxt\)\}</div>\n      \$\{wa\}\n    </div>'

    new_html = r"""<div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#f1f5f9;min-width:200px;line-height:1.4">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;border-bottom:1px solid #334155;padding-bottom:6px;">
        <div>
          <div style="font-weight:800;font-size:14px;color:#ffffff;letter-spacing:-0.2px;">${esc(p.nama)}</div>
          <div style="color:#10b981;font-size:10px;font-weight:700;margin-top:1px;font-family:ui-monospace,monospace;">${esc(p.kodePelanggan)}</div>
        </div>
      </div>
      
      <div style="color:#cbd5e1;margin-bottom:8px;">
        ${esc(p.alamat || "Alamat tidak tersedia")}${p.rtRw ? " · RT/RW " + esc(p.rtRw) : ""}
      </div>
      
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="background:#334155;color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">KATEGORI: ${esc(KATEGORI_LABEL[p.kategori] ?? p.kategori)}</span>
        ${p.wilayah?.nama ? `<span style="background:#334155;color:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">WILAYAH: ${esc(p.wilayah.nama)}</span>` : ""}
      </div>
      
      ${
        zona
          ? `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#34d399;padding:6px;border-radius:6px;margin-bottom:8px;font-weight:600;font-size:10px;">
              ZONA: ${esc((zona.kelurahan || "").toUpperCase())} · KEC. ${esc((zona.kecamatan || "").toUpperCase())}<br/>
              RT/RW #${esc(zona.rtId)} <span style="opacity:0.8">(±${zona.jarakRtM ?? 0}m)</span>
             </div>`
          : ""
      }
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid #334155;">
        <div style="background:${p.statusTagihan === 'tunggakan' ? '#7f1d1d' : '#064e3b'};color:${p.statusTagihan === 'tunggakan' ? '#fca5a5' : '#6ee7b7'};padding:3px 8px;border-radius:999px;font-weight:800;font-size:10px;display:inline-flex;align-items:center;gap:4px;">
          ${p.statusTagihan === 'tunggakan' ? '⛔' : '✓'} ${esc(statusTxt).toUpperCase()}
        </div>
        ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noreferrer" style="background:#10b981;color:#ffffff;padding:4px 8px;border-radius:6px;font-weight:700;text-decoration:none;font-size:10px;display:inline-flex;align-items:center;box-shadow:0 2px 4px rgba(16,185,129,0.3);">💬 Chat WA</a>` : ""}
      </div>
    </div>"""

    content = re.sub(old_html, new_html, content)

    # Make the fallback popup nicer too
    old_fallback = r'<div style="font-family:ui-monospace,monospace;font-size:11px;color:#ffffff;min-width:160px">\n      <div style="font-weight:700">\$\{esc\(p\.nama\)\}</div>\n      <div style="color:#b7e13c">\$\{esc\(p\.kodePelanggan\)\}</div>\n      <div style="color:#c5c8bc">\$\{esc\(p\.alamat\)\}</div>\n    </div>'
    new_fallback = r"""<div style="font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#f1f5f9;min-width:160px;line-height:1.4">
      <div style="font-weight:800;font-size:13px;color:#ffffff;">${esc(p.nama)}</div>
      <div style="color:#10b981;font-weight:700;font-family:ui-monospace,monospace;margin-bottom:4px;">${esc(p.kodePelanggan)}</div>
      <div style="color:#cbd5e1;">${esc(p.alamat)}</div>
    </div>"""
    
    content = re.sub(old_fallback, new_fallback, content)

    with open(path, "w") as f:
        f.write(content)

if __name__ == "__main__":
    modernize_map_angkut()
    modernize_mapview()
    print("UI Modernized")
