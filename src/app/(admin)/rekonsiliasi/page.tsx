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
    <div className="p-4 sm:p-6 pb-12 w-full">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Rekonsiliasi Harian</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">Cocokkan arus kas penerimaan tunai sistem dengan kas fisik</p>
      </div>

      {/* Form Rekonsiliasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 mb-6">
        <h2 className="font-bold text-slate-900 text-base mb-4">Input Rekonsiliasi Hari Ini</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Tunai Fisik (Rp)</label>
              <input
                type="number"
                value={form.totalTunaiFisik}
                onChange={(e) => setForm({ ...form, totalTunaiFisik: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Kasir / Petugas</label>
              <input
                type="text"
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Catatan opsional penyesuaian..."
              />
            </div>
          </div>

          {hasil && (
            <div className={`p-4 rounded-2xl border ${
              hasil.selisih !== null && hasil.selisih !== 0
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}>
              <p className="font-bold text-sm">
                {hasil.selisih !== null && hasil.selisih !== undefined && hasil.selisih !== 0
                  ? `Ada selisih sebesar ${formatRupiah(Math.abs(hasil.selisih as number))} (${(hasil.selisih as number) > 0 ? "Kelebihan" : "Kekurangan"})`
                  : "✅ Tidak ada selisih — kas cocok sempurna!"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs pt-2.5 border-t border-slate-200/50">
                <div>
                  <span className="text-[11px] text-slate-500 block">Pemasukan:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatRupiah(hasil.totalPemasukan)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Pengeluaran:</span>
                  <p className="font-bold text-rose-600 mt-0.5">{formatRupiah(hasil.totalPengeluaran)}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Tunai Sistem:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatRupiah(hasil.totalTunaiSistem)}</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all">
            Simpan Rekonsiliasi
          </button>
        </form>
      </div>

      {/* Riwayat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 text-base">Riwayat Rekonsiliasi</h2>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600">Belum ada rekonsiliasi</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">{formatDate(r.tanggal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(r.totalPemasukan)}</td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600">{formatRupiah(r.totalPengeluaran)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(r.totalTunaiSistem)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.totalTunaiFisik !== null ? formatRupiah(r.totalTunaiFisik) : "-"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.selisih !== null && r.selisih !== 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {r.selisih !== null ? formatRupiah(r.selisih) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.user?.nama || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/rekonsiliasi-cetak/${r.id}`}
                        target="_blank"
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Memuat rekonsiliasi...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">Belum ada riwayat rekonsiliasi</div>
          ) : (
            data.map((r) => {
              const adaSelisih = r.selisih !== null && r.selisih !== 0;
              return (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{formatDate(r.tanggal)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Oleh: {r.user?.nama || "Sistem"}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      adaSelisih
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {r.selisih !== null
                        ? adaSelisih ? `Selisih ${formatRupiah(r.selisih)}` : "Cocok (Rp 0)"
                        : "Belum Ditutup"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pemasukan:</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(r.totalPemasukan)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pengeluaran:</span>
                      <span className="font-semibold text-rose-600">{formatRupiah(r.totalPengeluaran)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500 block text-[11px]">Tunai Sistem:</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(r.totalTunaiSistem)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500 block text-[11px]">Tunai Fisik:</span>
                      <span className="font-semibold text-slate-800">
                        {r.totalTunaiFisik !== null ? formatRupiah(r.totalTunaiFisik) : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-mono">ID #{r.id}</span>
                    <Link
                      href={`/rekonsiliasi-cetak/${r.id}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <span>🖨</span>
                      <span>Cetak BA</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
