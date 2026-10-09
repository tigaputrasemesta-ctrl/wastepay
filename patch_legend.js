const fs = require('fs');
let code = fs.readFileSync('src/components/PetaMap.tsx', 'utf8');

const legendHtml = `
          {/* Legenda Indikator Peta */}
          {activeTab === "pelanggan" && (
            <div className={\`absolute bottom-6 right-4 z-[400] p-3 rounded-xl border shadow-lg backdrop-blur-md text-[10px] font-bold space-y-1.5 \${isDark ? "bg-slate-900/90 border-slate-700/50 text-slate-200" : "bg-white/95 border-slate-200/80 text-slate-700"}\`}>
              <p className="mb-2 text-[9px] opacity-70 uppercase tracking-widest text-center">Warna Pelanggan</p>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981] shadow-inner border border-black/10"></div> Lunas</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#eab308] shadow-inner border border-black/10"></div> Tunggakan 1 Bln</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f97316] shadow-inner border border-black/10"></div> Tunggakan 2 Bln</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-inner border border-black/10"></div> Tunggakan ≥ 3 Bln</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-inner border border-black/10"></div> Libur / Nonaktif</div>
            </div>
          )}
`;

code = code.replace(
  `          <MapErrorBoundary>\n            <MapView`,
  legendHtml + `\n          <MapErrorBoundary>\n            <MapView`
);

fs.writeFileSync('src/components/PetaMap.tsx', code);
