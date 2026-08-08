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
        <h1 className="font-display text-2xl text-bone">Komplain</h1>
        <p className="text-sm text-bone-dim mt-1">Kelola laporan dan komplain warga</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Deskripsi</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Status</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : komplain.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Belum ada komplain</td></tr>
              ) : (
                komplain.map((k) => (
                  <tr key={k.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3 text-bone-dim text-xs">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-bone">{k.pelanggan.nama}</div>
                      <div className="text-xs text-bone-dim">{k.pelanggan.noTelepon}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber/10 text-orange-800">
                        {k.jenis === "tidak_diangkut" ? "Tidak Diangkut" : k.jenis === "sampah_menumpuk" ? "Sampah Menumpuk" : "Lainnya"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bone-dim max-w-xs truncate">{k.deskripsi}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        k.status === "baru" ? "bg-danger/10 text-red-800" :
                        k.status === "diproses" ? "bg-amber/10 text-yellow-800" :
                        "bg-vest/10 text-emerald-800"
                      }`}>
                        {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {k.status !== "selesai" && (
                        <button onClick={() => setShowResolve(k)} className="text-xs bg-vest/10 text-vest px-3 py-1 rounded-full hover:bg-blue-200 transition">
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
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">Proses Komplain</h2>
              <button onClick={() => setShowResolve(null)} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="bg-asphalt-deep/40 p-3 rounded-lg text-sm">
                <p className="font-medium text-bone">{showResolve.pelanggan.nama}</p>
                <p className="text-bone-dim mt-1">{showResolve.deskripsi}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Status</label>
                <select value={formResolve.status} onChange={(e) => setFormResolve({ ...formResolve, status: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm">
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Tanggapan</label>
                <textarea value={formResolve.tanggapan} onChange={(e) => setFormResolve({ ...formResolve, tanggapan: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" rows={3} placeholder="Berikan tanggapan..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowResolve(null)} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm hover:bg-vest-bright">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
