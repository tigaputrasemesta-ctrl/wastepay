"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type Komplain = {
  id: number;
  jenis: string;
  deskripsi: string;
  status: string;
  tanggapan?: string;
  createdAt: string;
  pelanggan: { id: number; nama: string; alamat: string; noTelepon: string };
  resolvedBy?: { id: number; nama: string };
};

export default function KomplainPage() {
  const { showToast } = useToast();
  const [komplain, setKomplain] = useState<Komplain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolve, setShowResolve] = useState<Komplain | null>(null);
  const [formResolve, setFormResolve] = useState({ tanggapan: "", status: "selesai" });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/komplain");
    setKomplain(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!showResolve) return;
    const res = await fetch(`/api/komplain/${showResolve.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formResolve),
    });
    if (res.ok) {
      setShowResolve(null);
      setFormResolve({ tanggapan: "", status: "selesai" });
      showToast("Komplain berhasil diproses");
      fetchData();
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Komplain</h1>
        <p className="text-sm text-gray-600 font-bold mt-1">Kelola laporan dan komplain warga</p>
      </div>

      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white font-black border-b border-2 border-black">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Deskripsi</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : komplain.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada komplain</td></tr>
              ) : (
                komplain.map((k) => (
                  <tr key={k.id} className="border-b border-2 border-black hover:bg-gray-100 border-2 border-black">
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-black font-black">{k.pelanggan.nama}</div>
                      <div className="text-xs text-gray-600 font-bold">{k.pelanggan.noTelepon}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium bg-amber/10 text-amber-400 border border-amber-500/30">
                        {k.jenis === "tidak_diangkut" ? "Tidak Diangkut" : k.jenis === "sampah_menumpuk" ? "Sampah Menumpuk" : "Lainnya"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold max-w-xs truncate">{k.deskripsi}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium ${
                        k.status === "baru" ? "bg-danger/10 text-red-400 border border-red-500/30" :
                        k.status === "diproses" ? "bg-amber/10 text-amber-400 border border-amber-500/30" :
                        "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {k.status !== "selesai" && (
                        <button onClick={() => setShowResolve(k)} className="text-xs bg-green-400/10 text-green-600 px-3 py-1 rounded-none-full hover:bg-blue-200 transition">
                          Proses
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showResolve && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">Proses Komplain</h2>
              <button onClick={() => setShowResolve(null)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="bg-black text-white font-black p-3 rounded-none text-sm">
                <p className="font-medium text-black font-black">{showResolve.pelanggan.nama}</p>
                <p className="text-gray-600 font-bold mt-1">{showResolve.deskripsi}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Status</label>
                <select value={formResolve.status} onChange={(e) => setFormResolve({ ...formResolve, status: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none text-sm">
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Tanggapan</label>
                <textarea value={formResolve.tanggapan} onChange={(e) => setFormResolve({ ...formResolve, tanggapan: e.target.value })} className="w-full px-3 py-2 border-2 border-black rounded-none text-sm" rows={3} placeholder="Berikan tanggapan..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowResolve(null)} className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
