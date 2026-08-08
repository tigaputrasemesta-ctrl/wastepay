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
        <h1 className="font-display text-2xl text-bone">Rekonsiliasi Harian</h1>
        <p className="text-sm text-bone-dim mt-1">Cocokkan pemasukan tunai dengan fisik</p>
      </div>

      {/* Form Rekonsiliasi */}
      <div className="panel p-6 mb-6">
        <h2 className="font-semibold text-bone mb-4">Rekonsiliasi Hari Ini</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-bone-dim mb-1">Total Tunai Fisik (Rp)</label>
              <input
                type="number"
                value={form.totalTunaiFisik}
                onChange={(e) => setForm({ ...form, totalTunaiFisik: e.target.value })}
                className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bone-dim mb-1">Catatan</label>
              <input
                type="text"
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm"
                placeholder="Opsional"
              />
            </div>
          </div>

          {hasil && (
            <div className={`p-4 rounded-lg border ${
              hasil.selisih !== null && hasil.selisih !== 0
                ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                : "bg-vest/5 border-vest/40 text-emerald-800"
            }`}>
              <p className="font-medium">
                {hasil.selisih !== null && hasil.selisih !== undefined && hasil.selisih !== 0
                  ? `Ada selisih sebesar ${formatRupiah(Math.abs(hasil.selisih as number))} (${(hasil.selisih as number) > 0 ? "Kelebihan" : "Kekurangan"})`
                  : "✅ Tidak ada selisih — cocok!"}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-bone-dim">Pemasukan:</span>
                  <p className="font-semibold">{formatRupiah(hasil.totalPemasukan)}</p>
                </div>
                <div>
                  <span className="text-bone-dim">Pengeluaran:</span>
                  <p className="font-semibold">{formatRupiah(hasil.totalPengeluaran)}</p>
                </div>
                <div>
                  <span className="text-bone-dim">Tunai Sistem:</span>
                  <p className="font-semibold">{formatRupiah(hasil.totalTunaiSistem)}</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="chamfer-sm bg-vest text-asphalt-deep px-6 py-2 rounded-lg text-sm font-medium hover:bg-vest-bright transition">
            Buat Rekonsiliasi
          </button>
        </form>
      </div>

      {/* Riwayat */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-asphalt-line">
          <h2 className="font-semibold text-bone">Riwayat Rekonsiliasi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Tanggal</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Pemasukan</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Pengeluaran</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Tunai Sistem</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Tunai Fisik</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Selisih</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-bone-faint">Belum ada rekonsiliasi</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3 text-xs text-bone-dim">{formatDate(r.tanggal)}</td>
                    <td className="px-4 py-3 text-right font-medium text-bone">{formatRupiah(r.totalPemasukan)}</td>
                    <td className="px-4 py-3 text-right text-danger">{formatRupiah(r.totalPengeluaran)}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(r.totalTunaiSistem)}</td>
                    <td className="px-4 py-3 text-right">{r.totalTunaiFisik !== null ? formatRupiah(r.totalTunaiFisik) : "-"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.selisih !== null && r.selisih !== 0 ? "text-danger" : "text-vest"}`}>
                      {r.selisih !== null ? formatRupiah(r.selisih) : "-"}
                    </td>
                    <td className="px-4 py-3 text-bone-dim text-xs">{r.user?.nama || "-"}</td>
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
