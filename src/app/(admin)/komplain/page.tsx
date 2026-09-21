"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type Komplain = {
  id: number;
  jenis: string;
  deskripsi: string;
  foto?: string;
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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Komplain</h1>
        <p className="text-sm text-slate-500 font-medium">Kelola laporan dan komplain penanganan sampah warga</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Tanggal</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Pelanggan</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Jenis</th>
                <th className="text-left px-4 py-3.5">Deskripsi</th>
                <th className="text-center px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="text-center px-4 py-3.5 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs font-medium">Memuat komplain...</td></tr>
              ) : komplain.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs font-medium">Belum ada komplain</td></tr>
              ) : (
                komplain.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{k.pelanggan.nama}</div>
                      <div className="text-[11px] text-slate-500">{k.pelanggan.noTelepon}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {k.jenis === "tidak_diangkut" ? "Tidak Diangkut" : k.jenis === "sampah_menumpuk" ? "Sampah Menumpuk" : "Lainnya"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        {k.foto && <span className="text-emerald-600 text-sm" title="Ada Foto Bukti">📷</span>}
                        <span className="truncate">{k.deskripsi}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        k.status === "baru" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        k.status === "diproses" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {k.status !== "selesai" && (
                        <button
                          onClick={() => setShowResolve(k)}
                          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm"
                        >
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white">
              <h2 className="font-bold text-base tracking-wide">Proses Laporan Komplain</h2>
              <button
                onClick={() => setShowResolve(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2">
                <p className="font-bold text-slate-900 text-sm">{showResolve.pelanggan.nama}</p>
                <p className="text-slate-600 font-normal leading-relaxed">{showResolve.deskripsi}</p>
                {showResolve.foto && (
                  <div className="mt-2">
                    <img src={showResolve.foto} alt="Dokumentasi komplain" className="w-full max-h-48 object-cover rounded-xl border border-slate-200 shadow-sm" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Penyelesaian</label>
                <select
                  value={formResolve.status}
                  onChange={(e) => setFormResolve({ ...formResolve, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                >
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggapan / Catatan Tindak Lanjut</label>
                <textarea
                  value={formResolve.tanggapan}
                  onChange={(e) => setFormResolve({ ...formResolve, tanggapan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  rows={3}
                  placeholder="Berikan tanggapan untuk warga..."
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowResolve(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
