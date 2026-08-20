"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const dynamic = "force-dynamic";

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
    return <p className="font-mono font-bold text-gray-500 text-center py-10">MEMUAT…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Absensi GPS</h1>
        <p className="text-xs font-bold text-gray-500">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
        </p>
      </div>

      {/* Status hari ini */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-2">
        <p className="text-xs font-black uppercase tracking-widest">Status Hari Ini</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="border-2 border-black p-3">
            <p className="text-[10px] font-black uppercase text-gray-500">Masuk</p>
            <p className={`text-sm font-black ${sudahMasuk ? "text-green-600" : "text-gray-400"}`}>
              {sudahMasuk ? format(new Date(absen!.waktuMasuk!), "HH:mm", { locale: id }) : "—"}
            </p>
          </div>
          <div className="border-2 border-black p-3">
            <p className="text-[10px] font-black uppercase text-gray-500">Selesai</p>
            <p className={`text-sm font-black ${sudahSelesai ? "text-green-600" : "text-gray-400"}`}>
              {sudahSelesai ? format(new Date(absen!.waktuSelesai!), "HH:mm", { locale: id }) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tombol absen */}
      {!sudahMasuk ? (
        <button
          onClick={() => handleAbsen("masuk")}
          disabled={actionLoading}
          className="w-full py-5 bg-green-600 text-white border-2 border-black text-base font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {actionLoading ? "Mendapatkan lokasi…" : "✓ Absen Masuk"}
        </button>
      ) : !sudahSelesai ? (
        <button
          onClick={() => handleAbsen("selesai")}
          disabled={actionLoading}
          className="w-full py-5 bg-red-600 text-white border-2 border-black text-base font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {actionLoading ? "Mendapatkan lokasi…" : "■ Absen Selesai"}
        </button>
      ) : (
        <div className="border-2 border-green-600 bg-green-50 p-4 text-center">
          <p className="text-sm font-black uppercase text-green-700">Hari ini selesai ✓</p>
          <p className="text-[11px] font-bold text-green-600 mt-1">Terima kasih, sampai besok!</p>
        </div>
      )}

      {koord && (
        <p className="font-mono text-[11px] font-bold text-gray-500 text-center">
          Koordinat terkirim: {koord.lat.toFixed(5)}, {koord.lng.toFixed(5)}
        </p>
      )}
      {pesan && (
        <p className={`text-center text-sm font-black p-3 border-2 ${pesan.includes("berhasil") ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}`}>
          {pesan}
        </p>
      )}
    </div>
  );
}
