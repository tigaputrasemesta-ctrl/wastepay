"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Clock, CheckCircle2, MapPin, AlertCircle } from "lucide-react";

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
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => setCurrentTime(format(new Date(), "HH:mm:ss"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Presensi Lapangan</h1>
          <p className="text-[10px] text-slate-500">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-mono text-xs font-bold tabular-nums">
          <Clock className="w-3.5 h-3.5 text-emerald-700" />
          <span>{currentTime || "--:--:--"}</span>
        </div>
      </div>

      {/* Shift Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Rekap Shift Hari Ini
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
              sudahSelesai
                ? "bg-sky-100 text-sky-800"
                : sudahMasuk
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sudahSelesai ? "bg-sky-500" : sudahMasuk ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {sudahSelesai ? "Shift Selesai" : sudahMasuk ? "Sedang Bertugas" : "Belum Absen"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] font-medium text-slate-600 block mb-0.5">Jam Masuk</span>
            <p
              className={`text-base font-extrabold tabular-nums ${
                sudahMasuk ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {sudahMasuk ? format(new Date(absen!.waktuMasuk!), "HH:mm", { locale: id }) : "— : —"}
            </p>
          </div>
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] font-medium text-slate-600 block mb-0.5">Jam Selesai</span>
            <p
              className={`text-base font-extrabold tabular-nums ${
                sudahSelesai ? "text-sky-700" : "text-slate-500"
              }`}
            >
              {sudahSelesai ? format(new Date(absen!.waktuSelesai!), "HH:mm", { locale: id }) : "— : —"}
            </p>
          </div>
        </div>
      </div>

      {/* Action Area */}
      {!sudahMasuk ? (
        <button
          onClick={() => handleAbsen("masuk")}
          disabled={actionLoading}
          className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Memverifikasi GPS…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Absen Masuk Sekarang</span>
            </>
          )}
        </button>
      ) : !sudahSelesai ? (
        <button
          onClick={() => handleAbsen("selesai")}
          disabled={actionLoading}
          className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Memverifikasi GPS…</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>Selesaikan Shift Hari Ini</span>
            </>
          )}
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-center space-y-1 shadow-sm">
          <span className="text-xl block">🎉</span>
          <p className="text-xs font-bold text-emerald-900">Operasional Hari Ini Selesai</p>
          <p className="text-[10px] text-emerald-700">
            Terima kasih atas kerja keras Anda menjaga kebersihan Kota Depok!
          </p>
        </div>
      )}

      {/* GPS Status & Coordinates Pill */}
      {koord && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500 bg-white border border-slate-200/80 rounded-xl py-1.5 px-3 shadow-sm">
          <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
          <span>Titik Absen:</span>
          <span className="font-mono font-bold text-slate-700 tabular-nums">
            {koord.lat.toFixed(5)}, {koord.lng.toFixed(5)}
          </span>
        </div>
      )}

      {/* Status feedback message */}
      {pesan && (
        <div
          className={`flex items-center justify-center gap-1.5 text-[11px] font-semibold p-2.5 rounded-xl border ${
            pesan.includes("berhasil")
              ? "border-emerald-200 text-emerald-800 bg-emerald-50"
              : "border-rose-200 text-rose-800 bg-rose-50"
          }`}
        >
          {pesan.includes("berhasil") ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>{pesan}</span>
        </div>
      )}
    </div>
  );
}
