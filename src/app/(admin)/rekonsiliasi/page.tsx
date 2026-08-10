"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRupiah, formatDate } from "@/lib/utils";

type Rekonsiliasi = {
  id: number;
  tanggal: string;
  totalPemasukan: number;
  totalPengeluaran: number;
  totalTunaiSistem: number;
  totalTunaiFisik: number | null;
  selisih: number | null;
  catatan?: string;
  user?: { nama: string };
};

export default function RekonsiliasiPage() {
  const [data, setData] = useState<Rekonsiliasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ totalTunaiFisik: "", catatan: "" });
  const [hasil, setHasil] = useState<Rekonsiliasi | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/rekonsiliasi");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/rekonsiliasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const result = await res.json();
      setHasil(result);
      setForm({ totalTunaiFisik: "", catatan: "" });
      fetchData();
    } else {
      alert("Gagal membuat rekonsiliasi");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Rekonsiliasi Harian</h1>
        <p className="text-sm text-gray-600 font-bold mt-1">Cocokkan pemasukan tunai dengan fisik</p>
      </div>

      {/* Form Rekonsiliasi */}
      <div className="hm-card bg-white p-0 overflow-hidden p-6 mb-6">
        <h2 className="font-semibold text-black font-black mb-4">Rekonsiliasi Hari Ini</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Total Tunai Fisik (Rp)</label>
              <input
                type="number"
                value={form.totalTunaiFisik}
                onChange={(e) => setForm({ ...form, totalTunaiFisik: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Catatan</label>
              <input
                type="text"
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                placeholder="Opsional"
              />
            </div>
          </div>

          {hasil && (
            <div className={`p-4 rounded-none border ${
              hasil.selisih !== null && hasil.selisih !== 0
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            }`}>
              <p className="font-medium">
                {hasil.selisih !== null && hasil.selisih !== undefined && hasil.selisih !== 0
                  ? `Ada selisih sebesar ${formatRupiah(Math.abs(hasil.selisih as number))} (${(hasil.selisih as number) > 0 ? "Kelebihan" : "Kekurangan"})`
                  : "✅ Tidak ada selisih — cocok!"}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-gray-600 font-bold">Pemasukan:</span>
                  <p className="font-semibold">{formatRupiah(hasil.totalPemasukan)}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-bold">Pengeluaran:</span>
                  <p className="font-semibold">{formatRupiah(hasil.totalPengeluaran)}</p>
                </div>
                <div>
                  <span className="text-gray-600 font-bold">Tunai Sistem:</span>
                  <p className="font-semibold">{formatRupiah(hasil.totalTunaiSistem)}</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black px-6 py-2 rounded-none text-sm font-medium hover:bg-green-300 transition">
            Buat Rekonsiliasi
          </button>
        </form>
      </div>

      {/* Riwayat */}
      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-2 border-black">
          <h2 className="font-semibold text-black font-black">Riwayat Rekonsiliasi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white font-black border-b border-2 border-black">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Tanggal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Pemasukan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Pengeluaran</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Tunai Sistem</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Tunai Fisik</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Selisih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada rekonsiliasi</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="border-b border-2 border-black hover:bg-gray-100 border-2 border-black">
                    <td className="px-4 py-3 text-xs text-gray-600 font-bold">{formatDate(r.tanggal)}</td>
                    <td className="px-4 py-3 text-right font-medium text-black font-black">{formatRupiah(r.totalPemasukan)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatRupiah(r.totalPengeluaran)}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(r.totalTunaiSistem)}</td>
                    <td className="px-4 py-3 text-right">{r.totalTunaiFisik !== null ? formatRupiah(r.totalTunaiFisik) : "-"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.selisih !== null && r.selisih !== 0 ? "text-red-600" : "text-green-600"}`}>
                      {r.selisih !== null ? formatRupiah(r.selisih) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{r.user?.nama || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
