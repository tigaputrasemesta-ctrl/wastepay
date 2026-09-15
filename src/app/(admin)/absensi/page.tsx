"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type AbsensiRecord = {
  id: number;
  petugas: { nama: string; jabatan: string };
  waktuMasuk: string;
  lokasiMasuk: string | null;
  waktuSelesai: string | null;
  lokasiSelesai: string | null;
  status: string;
};

export default function AbsensiPage() {
  const [data, setData] = useState<AbsensiRecord[]>([]);
  const [statusHariIni, setStatusHariIni] = useState<{
    id: number;
    petugasId: number;
    waktuMasuk: string | null;
    waktuSelesai: string | null;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/absensi");
      const json = await res.json();
      if (res.ok) {
        setData(json.absensi || []);
        setStatusHariIni(json.statusHariIni);
      }
    } catch {
      setError("Gagal mengambil data absensi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Data fetch on mount: semua setState terjadi setelah await fetch (async),
    // bukan sinkron di body effect — rule ini false-positive untuk pola ini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleAbsen = (action: "masuk" | "selesai") => {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung GPS.");
      return;
    }
    
    setActionLoading(true);
    setError("");
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/absensi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Gagal absen");
          
          fetchData(); // refresh data
        } catch (e) {
          setError(e instanceof Error ? e.message : "Gagal absen");
        } finally {
          setActionLoading(false);
        }
      },
      (err) => {
        setError("Gagal mendapatkan lokasi: " + err.message);
        setActionLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hasMasuk = statusHariIni !== null;
  const hasSelesai = statusHariIni?.waktuSelesai != null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Absensi Petugas</h1>
          <p className="text-sm text-slate-500 font-medium">Pencatatan presensi kerja dan jam operasional armada petugas</p>
        </div>
        <Link
          href={`/absensi-cetak?bulan=${new Date().getMonth() + 1}&tahun=${new Date().getFullYear()}`}
          target="_blank"
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <span>🖨</span>
          <span>Rekap Absensi</span>
        </Link>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Panel Clock In/Out */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Status Kehadiran Hari Ini</h2>
          {hasMasuk && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Tercatat Hadir
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAbsen("masuk")}
            disabled={hasMasuk || actionLoading}
            className={`p-6 rounded-2xl border font-bold text-base flex flex-col items-center justify-center gap-2 transition-all ${
              hasMasuk
                ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                : "bg-emerald-700 hover:bg-emerald-800 text-white border-transparent shadow-sm hover:shadow active:scale-[0.98]"
            }`}
          >
            <span className="text-xl">▶</span>
            <span>Mulai Kerja (Clock In)</span>
            {hasMasuk && <span className="text-xs text-emerald-700 font-semibold mt-1">✅ Sudah Tercatat Masuk</span>}
          </button>
          
          <button
            onClick={() => handleAbsen("selesai")}
            disabled={!hasMasuk || hasSelesai || actionLoading}
            className={`p-6 rounded-2xl border font-bold text-base flex flex-col items-center justify-center gap-2 transition-all ${
              !hasMasuk || hasSelesai
                ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                : "bg-rose-600 hover:bg-rose-500 text-white border-transparent shadow-sm hover:shadow active:scale-[0.98]"
            }`}
          >
            <span className="text-xl">⏹</span>
            <span>Selesai Kerja (Clock Out)</span>
            {hasSelesai && <span className="text-xs text-rose-600 font-semibold mt-1">✅ Sudah Selesai Tugas</span>}
          </button>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-4 flex items-center gap-1.5">
          <span>📍</span>
          <span>Pastikan GPS (Layanan Lokasi) diaktifkan pada browser/perangkat sebelum menekan tombol absen.</span>
        </p>
      </div>

      {/* Riwayat Absensi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Riwayat Absensi</h2>
            <p className="text-xs text-slate-500">Log waktu mulai dan selesai tugas seluruh petugas</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{data.length} Entri</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-600 font-medium text-xs">Memuat data absensi...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Petugas</th>
                  <th className="px-6 py-3.5">Waktu Masuk</th>
                  <th className="px-6 py-3.5">Waktu Selesai</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-600 font-medium">
                      Belum ada data absensi
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{row.petugas.nama}</td>
                      <td className="px-6 py-3.5 text-slate-600 font-medium">
                        {format(new Date(row.waktuMasuk), "dd MMM yyyy, HH:mm", { locale: id })}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-medium">
                        {row.waktuSelesai 
                          ? format(new Date(row.waktuSelesai), "dd MMM yyyy, HH:mm", { locale: id })
                          : <span className="text-slate-600 italic">Sedang bertugas</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block ${
                          row.status === 'hadir' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
