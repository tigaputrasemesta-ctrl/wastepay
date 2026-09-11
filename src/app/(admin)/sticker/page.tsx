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
        <span className="font-black uppercase tracking-tighter font-bold text-[9px] tracking-[0.15em]">UPS HERU DEPOK</span>
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
          <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Stiker Nomor Pelanggan</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">
            Cetak label yang ditempel di depan rumah tiap pelanggan — petugas angkut tinggal scan/lihat kode saat mengambil sampah.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} disabled={daftarCetak.length === 0} className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black px-4 py-2 rounded-none text-sm font-medium hover:bg-green-300 disabled:opacity-40 transition">
            🖨️ Cetak {daftarCetak.length > 0 ? `(${daftarCetak.length})` : ""}
          </button>
        </div>
      </div>

      {/* filter */}
      <div className="hm-card bg-white p-0 overflow-hidden p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="block text-xs text-gray-600 font-bold mb-1 font-mono">WILAYAH</label>
          <select value={filterWilayah} onChange={(e) => setFilterWilayah(e.target.value)} className="input text-sm">
            <option value="">Semua</option>
            {wilayah.map((w) => (
              <option key={w.id} value={w.id}>{w.nama}</option>
            ))}
          </select>
        </div>
        <div className="w-56">
          <label className="block text-xs text-gray-600 font-bold mb-1 font-mono">CARI</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="nama / kode / alamat…" className="input text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 font-bold pb-2 cursor-pointer">
          <input type="checkbox" checked={semuaDipilih} onChange={toggleSemua} className="accent-vest" />
          Pilih semua ({tersaring.length})
        </label>
      </div>

      {loading ? (
        <div className="hm-card bg-white p-0 overflow-hidden p-8 text-center text-gray-400 font-bold font-mono">MEMUAT…</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tersaring.map((p, i) => (
            <button key={p.id} onClick={() => toggleSatu(p.id)} className={`relative rounded-none overflow-hidden transition ${dipilih.has(p.id) ? "ring-2 ring-black" : "ring-1 ring-black opacity-90 hover:opacity-100"}`}>
              <Sticker p={p} idx={i} />
              {dipilih.has(p.id) && (
                <span className="absolute top-1 left-1 w-4 h-4 rounded-none-full bg-green-400 text-black flex items-center justify-center text-[10px] font-bold z-10">✓</span>
              )}
            </button>
          ))}
          {tersaring.length === 0 && <div className="hm-card bg-white p-0 overflow-hidden w-full p-8 text-center text-gray-400 font-bold font-mono">Tidak ada pelanggan</div>}
        </div>
      )}
    </div>
  );
}
