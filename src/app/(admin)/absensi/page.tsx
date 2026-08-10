"use client";

import { useState, useEffect } from "react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">ABSENSI PETUGAS</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border-4 border-red-600 p-4 font-bold uppercase text-sm">
          {error}
        </div>
      )}

      {/* Panel Clock In/Out */}
      <div className="bg-yellow-50 border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <h2 className="text-2xl font-black uppercase mb-4">STATUS HARI INI</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAbsen("masuk")}
            disabled={hasMasuk || actionLoading}
            className={`p-6 border-4 border-black font-black uppercase text-xl flex flex-col items-center justify-center gap-2 transition-transform ${
              hasMasuk ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-green-400 hover:bg-green-500 hover:-translate-y-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            }`}
          >
            <span>▶ MULAI KERJA</span>
            {hasMasuk && <span className="text-xs">✅ SUDAH TERCATAT</span>}
          </button>
          
          <button
            onClick={() => handleAbsen("selesai")}
            disabled={!hasMasuk || hasSelesai || actionLoading}
            className={`p-6 border-4 border-black font-black uppercase text-xl flex flex-col items-center justify-center gap-2 transition-transform ${
              !hasMasuk || hasSelesai ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-red-400 hover:bg-red-500 hover:-translate-y-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            }`}
          >
            <span>⏹ SELESAI KERJA</span>
            {hasSelesai && <span className="text-xs">✅ SUDAH TERCATAT</span>}
          </button>
        </div>
        <p className="text-xs font-bold uppercase mt-4 text-gray-600">
          * Pastikan GPS (Lokasi) diaktifkan sebelum menekan tombol absen.
        </p>
      </div>

      {/* Riwayat Absensi */}
      <div className="hm-card bg-white mt-8">
        <h2 className="text-2xl font-black uppercase mb-6 border-b-2 border-black pb-2">RIWAYAT ABSENSI</h2>
        
        {loading ? (
          <p className="font-bold uppercase animate-pulse">Memuat data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white uppercase text-sm">
                  <th className="p-3 border-2 border-black">Petugas</th>
                  <th className="p-3 border-2 border-black">Waktu Masuk</th>
                  <th className="p-3 border-2 border-black">Waktu Selesai</th>
                  <th className="p-3 border-2 border-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 border-2 border-black text-center font-bold uppercase text-gray-500">
                      Belum ada data absensi
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 text-sm font-bold uppercase">
                      <td className="p-3 border-2 border-black">{row.petugas.nama}</td>
                      <td className="p-3 border-2 border-black">
                        {format(new Date(row.waktuMasuk), "dd MMM yyyy, HH:mm", { locale: id })}
                      </td>
                      <td className="p-3 border-2 border-black">
                        {row.waktuSelesai 
                          ? format(new Date(row.waktuSelesai), "dd MMM yyyy, HH:mm", { locale: id })
                          : "-"}
                      </td>
                      <td className="p-3 border-2 border-black">
                        <span className={`px-2 py-1 border-2 border-black ${row.status === 'hadir' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
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
