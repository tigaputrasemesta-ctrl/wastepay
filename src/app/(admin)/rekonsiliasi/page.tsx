"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Rekonsiliasi Harian</h1>
        <p className="text-sm text-slate-500 font-medium">Cocokkan pemasukan tunai dengan fisik</p>
      </div>

      {/* Form Rekonsiliasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Rekonsiliasi Hari Ini</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Tunai Fisik (Rp)</label>
              <input
                type="number"
                value={form.totalTunaiFisik}
                onChange={(e) => setForm({ ...form, totalTunaiFisik: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
              <input
                type="text"
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Opsional"
              />
            </div>
          </div>

          {hasil && (
            <div className={`p-4 rounded-2xl border ${
              hasil.selisih !== null && hasil.selisih !== 0
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}>
              <p className="font-medium text-sm">
                {hasil.selisih !== null && hasil.selisih !== undefined && hasil.selisih !== 0
                  ? `Ada selisih sebesar ${formatRupiah(Math.abs(hasil.selisih as number))} (${(hasil.selisih as number) > 0 ? "Kelebihan" : "Kekurangan"})`
                  : "✅ Tidak ada selisih — cocok!"}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-3 text-sm pt-2 border-t border-slate-200/50">
                <div>
                  <span className="text-xs text-slate-500 block">Pemasukan:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{formatRupiah(hasil.totalPemasukan)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Pengeluaran:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{formatRupiah(hasil.totalPengeluaran)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Tunai Sistem:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{formatRupiah(hasil.totalTunaiSistem)}</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all">
            Buat Rekonsiliasi
          </button>
        </form>
      </div>

      {/* Riwayat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 text-base">Riwayat Rekonsiliasi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tanggal</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Pemasukan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Pengeluaran</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Tunai Sistem</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Tunai Fisik</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Selisih</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Oleh</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">BA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Belum ada rekonsiliasi</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">{formatDate(r.tanggal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(r.totalPemasukan)}</td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600">{formatRupiah(r.totalPengeluaran)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(r.totalTunaiSistem)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.totalTunaiFisik !== null ? formatRupiah(r.totalTunaiFisik) : "-"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.selisih !== null && r.selisih !== 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {r.selisih !== null ? formatRupiah(r.selisih) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.user?.nama || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/rekonsiliasi-cetak/${r.id}`}
                        target="_blank"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Cetak BA
                      </Link>
                    </td>
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
