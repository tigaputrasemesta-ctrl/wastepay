"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/components/Toast";

type Wilayah = { id: number; nama: string };
type Pelanggan = {
  id: number;
  nama: string;
  kodePelanggan: string;
  alamat: string;
  rtRw: string | null;
  noTelepon: string;
  kategori: string;
  status: string;
  wilayah: { id: number; nama: string } | null;
};

const KATEGORI_LABEL: Record<string, string> = {
  level_1: "LVL 1",
  level_2: "LVL 2",
  level_3: "LVL 3",
  level_4: "LVL 4",
  level_5: "LVL 5",
  level_6: "LVL 6",
  level_7: "LVL 7",
  level_8: "LVL 8",
  level_9: "LVL 9",
  level_10: "LVL 10",
};

function Sticker({ p, idx }: { p: Pelanggan; idx: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!ref.current || err) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("jsbarcode");
        if (!cancelled && ref.current) mod.default(ref.current, p.kodePelanggan.replace(/-/g, ""), { format: "CODE128", width: 1.6, height: 34, displayValue: false, margin: 0, background: "#ffffff", lineColor: "#111111" });
      } catch {
        if (!cancelled) setErr(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [p.kodePelanggan, err]);

  return (
    <div className="relative w-[92mm] h-[54mm] bg-white text-black p-2.5 flex flex-col overflow-hidden print:shadow-none" style={{ breakInside: "avoid" }}>
      <div className="flex items-center justify-between border-b-2 border-black pb-1">
        <span className="font-extrabold uppercase text-[9px] tracking-wider">UPS HERU DEPOK</span>
        <span className="font-mono font-bold text-[8px] border border-black px-1">{KATEGORI_LABEL[p.kategori] ?? "PELANGGAN"}</span>
      </div>
      <div className="text-center mt-1.5">
        <span className="font-mono font-bold text-[24px] leading-none tracking-[0.15em]">{p.kodePelanggan}</span>
      </div>
      <div className="flex justify-center mt-1">
        {err ? (
          <span className="font-mono text-[13px] font-bold tracking-[0.35em]">{p.kodePelanggan}</span>
        ) : (
          <svg ref={ref} className="h-10 w-full max-w-[70mm]" />
        )}
      </div>
      <div className="mt-1 border-t border-black pt-1">
        <p className="font-bold text-[11px] leading-tight uppercase truncate">{p.nama}</p>
        <p className="font-mono text-[8px] leading-tight text-black/80 line-clamp-2">{p.alamat}</p>
        <p className="font-mono text-[8px] mt-0.5">
          {p.rtRw ? `${p.rtRw} · ` : ""}{p.wilayah?.nama ?? ""}{p.noTelepon ? ` · ${p.noTelepon}` : ""}
        </p>
      </div>
      <span className="absolute bottom-1 right-2 font-mono text-[6px] text-black/40">#{idx + 1}</span>
    </div>
  );
}

export default function StickerPage() {
  const { showToast } = useToast();
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [wilayah, setWilayah] = useState<Wilayah[]>([]);
  const [filterWilayah, setFilterWilayah] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [dipilih, setDipilih] = useState<Set<number>>(new Set());
  const [modeCetak, setModeCetak] = useState(false);

  useEffect(() => {
    const onBefore = () => setModeCetak(true);
    const onAfter = () => setModeCetak(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        fetch("/api/pelanggan?status=aktif"),
        fetch("/api/daftar-options").catch(() => null),
      ]);
      const ps = await pRes.json();
      setPelanggan(Array.isArray(ps) ? ps : ps.pelanggan ?? []);
      if (wRes) {
        const w = await wRes.json();
        if (Array.isArray(w.wilayah)) setWilayah(w.wilayah);
      }
    } catch {
      showToast("Gagal memuat pelanggan", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const tersaring = pelanggan.filter(
    (p) =>
      (!filterWilayah || p.wilayah?.id.toString() === filterWilayah) &&
      (!q || (p.nama + p.kodePelanggan + (p.alamat ?? "")).toLowerCase().includes(q.toLowerCase()))
  );

  const semuaDipilih = tersaring.length > 0 && tersaring.every((p) => dipilih.has(p.id));
  function toggleSemua() {
    setDipilih((d) => {
      const n = new Set(d);
      if (semuaDipilih) tersaring.forEach((p) => n.delete(p.id));
      else tersaring.forEach((p) => n.add(p.id));
      return n;
    });
  }
  function toggleSatu(id: number) {
    setDipilih((d) => {
      const n = new Set(d);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const daftarCetak = tersaring.filter((p) => dipilih.has(p.id));

  // Saat print: render hanya area cetak (kartu yang dipilih)
  if (modeCetak) {
    return (
      <div className="print-area p-2 flex flex-wrap gap-2 bg-white">
        {daftarCetak.map((p, i) => (
          <Sticker key={p.id} p={p} idx={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Stiker Nomor Pelanggan</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Cetak label yang ditempel di depan rumah tiap pelanggan — petugas angkut tinggal scan/lihat kode saat mengambil sampah.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} disabled={daftarCetak.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-40 transition-all flex items-center gap-2">
            🖨️ Cetak {daftarCetak.length > 0 ? `(${daftarCetak.length})` : ""}
          </button>
        </div>
      </div>

      {/* filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 flex flex-wrap items-end gap-3 shadow-sm">
        <div className="w-48">
          <label className="block text-xs text-slate-600 font-semibold mb-1">Wilayah</label>
          <select value={filterWilayah} onChange={(e) => setFilterWilayah(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            <option value="">Semua Wilayah</option>
            {wilayah.map((w) => (
              <option key={w.id} value={w.id}>{w.nama}</option>
            ))}
          </select>
        </div>
        <div className="w-56">
          <label className="block text-xs text-slate-600 font-semibold mb-1">Cari Pelanggan</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama / kode / alamat…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium pb-2 cursor-pointer">
          <input type="checkbox" checked={semuaDipilih} onChange={toggleSemua} className="rounded accent-emerald-600" />
          Pilih semua ({tersaring.length})
        </label>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 font-medium shadow-sm">Memuat stiker…</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tersaring.map((p, i) => (
            <button key={p.id} onClick={() => toggleSatu(p.id)} className={`relative rounded-xl overflow-hidden transition shadow-sm ${dipilih.has(p.id) ? "ring-2 ring-emerald-500 shadow-md" : "ring-1 ring-slate-200 opacity-90 hover:opacity-100 hover:ring-slate-300"}`}>
              <Sticker p={p} idx={i} />
              {dipilih.has(p.id) && (
                <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm z-10">✓</span>
              )}
            </button>
          ))}
          {tersaring.length === 0 && <div className="bg-white rounded-2xl border border-slate-200/80 w-full p-8 text-center text-slate-400 font-medium shadow-sm">Tidak ada pelanggan</div>}
        </div>
      )}
    </div>
  );
}
