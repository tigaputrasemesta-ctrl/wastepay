"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";


type StatusAbsen = {
  id: number;
  petugasId: number;
  waktuMasuk: string | null;
  waktuSelesai: string | null;
  status: string;
} | null;

export default function MobileAbsen() {
  const [absen, setAbsen] = useState<StatusAbsen>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pesan, setPesan] = useState("");
  const [koord, setKoord] = useState<{ lat: number; lng: number } | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/absensi");
      if (res.ok) {
        const json = await res.json();
        setAbsen(json.statusHariIni ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // fetch on mount: setState terjadi setelah await (async), bukan sinkron di body effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  function getPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS tidak didukung perangkat ini"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error("Gagal dapat lokasi — aktifkan GPS & izin lokasi")),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  async function handleAbsen(action: "masuk" | "selesai") {
    setActionLoading(true);
    setPesan("");
    try {
      const pos = await getPosition();
      setKoord(pos);
      const res = await fetch("/api/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, latitude: pos.lat, longitude: pos.lng }),
      });
      const data = await res.json();
      if (res.ok) {
        setPesan(`Absen ${action === "masuk" ? "masuk" : "selesai"} berhasil tercatat ✓`);
        fetchData();
      } else {
        setPesan(data.error || "Gagal absen");
      }
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal absen");
    } finally {
      setActionLoading(false);
    }
  }

  const sudahMasuk = Boolean(absen?.waktuMasuk);
  const sudahSelesai = Boolean(absen?.waktuSelesai);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Verifikasi GPS Driver & Kru Lapangan
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Presensi Kehadiran</h1>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
        </p>
      </div>

      {/* Status hari ini */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rekap Waktu Hari Ini</p>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Jam Masuk</span>
            <p className={`text-lg font-black tracking-tight ${sudahMasuk ? "text-emerald-600" : "text-slate-300"}`}>
              {sudahMasuk ? format(new Date(absen!.waktuMasuk!), "HH:mm", { locale: id }) : "— : —"}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Jam Selesai</span>
            <p className={`text-lg font-black tracking-tight ${sudahSelesai ? "text-emerald-600" : "text-slate-300"}`}>
              {sudahSelesai ? format(new Date(absen!.waktuSelesai!), "HH:mm", { locale: id }) : "— : —"}
            </p>
          </div>
        </div>
      </div>

      {/* Tombol absen */}
      {!sudahMasuk ? (
        <button
          onClick={() => handleAbsen("masuk")}
          disabled={actionLoading}
          className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Memverifikasi Lokasi GPS…</span>
            </>
          ) : (
            <span>✓ Absen Masuk Sekarang</span>
          )}
        </button>
      ) : !sudahSelesai ? (
        <button
          onClick={() => handleAbsen("selesai")}
          disabled={actionLoading}
          className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white rounded-2xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Memverifikasi Lokasi GPS…</span>
            </>
          ) : (
            <span>■ Selesaikan Tugas Hari Ini</span>
          )}
        </button>
      ) : (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-1">
          <span className="text-2xl block mb-1">🎉</span>
          <p className="text-sm font-bold text-emerald-900">Operasional Hari Ini Selesai</p>
          <p className="text-xs text-emerald-700">Terima kasih atas kerja keras Anda menjaga kebersihan Kota Depok!</p>
        </div>
      )}

      {koord && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-slate-500 bg-slate-100">
            📍 GPS: {koord.lat.toFixed(5)}, {koord.lng.toFixed(5)}
          </span>
        </div>
      )}

      {pesan && (
        <p className={`text-center text-xs font-semibold p-3.5 rounded-2xl border ${pesan.includes("berhasil") ? "border-emerald-200 text-emerald-800 bg-emerald-50" : "border-rose-200 text-rose-800 bg-rose-50"}`}>
          {pesan}
        </p>
      )}
    </div>
  );
}
