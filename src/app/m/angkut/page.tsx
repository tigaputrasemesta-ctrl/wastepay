"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";
import ProximityPickupModal from "@/components/mobile/ProximityPickupModal";
import GojekDriverCockpit from "@/components/mobile/GojekDriverCockpit";
import { useProximityPickup, type ProximityTugas } from "@/hooks/useProximityPickup";
import { useWakeLock } from "@/hooks/useWakeLock";
import { playSound, speakText, vibrate } from "@/lib/mobile-feedback";
import { todayLocalISO } from "@/lib/utils";

type Profil = { id: number; nama: string; jabatan: string | null; kelurahan: string | null };
type Kendaraan = { id: number; nama: string; platNomor: string | null; jenis: string; petugas?: { id: number; nama: string } | null };
type Tugas = {
  id: number;
  tanggal: string;
  status: string;
  volume?: number;
  berat?: number;
  jenisSampah?: string;
  catatan?: string;
  pelanggan: {
    id: number;
    nama: string;
    alamat: string;
    kodePelanggan: string;
    latitude?: number | null;
    longitude?: number | null;
    patokanLokasi?: string | null;
    noTelepon?: string | null;
    fotoRumah?: string | null;
  };
  kendaraan?: { id: number; nama: string; platNomor: string | null } | null;
  tunggakan?: {
    isMenunggak: boolean;
    jumlahBulan: number;
    totalNominal: number;
    daftarBulan: string[];
    bolehPickup: boolean;
  };
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  terjadwal: { label: "Terjadwal", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  diambil: { label: "Diambil", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  tidak_diangkut: { label: "Tidak Diangkut", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  kosong: { label: "Kosong", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const JENIS_SAMPAH = ["organik", "anorganik", "b3", "campuran"];

function mapsUrl(t: Tugas) {
  if (t.pelanggan.latitude && t.pelanggan.longitude) {
    return `https://www.google.com/maps?q=${t.pelanggan.latitude},${t.pelanggan.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.pelanggan.alamat)}`;
}

export default function MobileAngkut() {
  const [kendaraanSaya, setKendaraanSaya] = useState<Kendaraan[]>([]);
  const [data, setData] = useState<Tugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState(todayLocalISO());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState("");

  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number; akurasi?: number } | null>(null);
  const [radiusMeter, setRadiusMeter] = useState<number>(20);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [muatanTruk, setMuatanTruk] = useState<number>(25);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Screen Wake Lock API: layar tetap aktif saat patroli rute
  useWakeLock(true);

  // Watch GPS driver untuk deteksi proximity real-time
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setDriverPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          akurasi: Math.round(pos.coords.accuracy),
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const {
    activeTask,
    activeDistance,
    closestTask,
    closestDistance,
    dismissActiveTask,
    forceOpenTask,
  } = useProximityPickup({
    driverPos,
    tugasList: data,
    radiusMeter,
    soundEnabled,
    voiceEnabled,
  });

  // Handler Ceklis Hijau Cepat (1-Tap Pickup)
  async function handleQuickPickup(taskId: number) {
    const kId = kendaraanSaya.length > 0 ? kendaraanSaya[0].id : null;
    const body = {
      status: "diambil",
      catatan: "Pickup cepat via Proximity GPS (1-Tap)",
      kendaraanId: kId,
      latitude: driverPos?.lat || null,
      longitude: driverPos?.lng || null,
      jenisSampah: "campuran",
    };
    try {
      const res = await fetch(`/api/pengangkutan/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        playSound("success");
        vibrate("success");
        speakText("Pickup berhasil dicatat.");
        setPesan("✓ Berhasil mencatat pickup (1-Tap)");
        dismissActiveTask();
        await fetchData();
      } else {
        const d = await res.json();
        setPesan(d.error || "Gagal mencatat pickup");
      }
    } catch {
      setPesan("Kendala koneksi saat mencatat");
    }
  }

  // Handler Lewati Konsumen Menunggak
  async function handleSkipOverdue(taskId: number, catatan: string) {
    const body = {
      status: "tidak_diangkut",
      catatan: catatan || "Dilewati: Ada tunggakan iuran belum lunas",
      latitude: driverPos?.lat || null,
      longitude: driverPos?.lng || null,
    };
    try {
      const res = await fetch(`/api/pengangkutan/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        playSound("skip");
        speakText("Rumah dilewati.");
        setPesan("✓ Rumah berhasil dilewati (Menunggak)");
        dismissActiveTask();
        await fetchData();
      } else {
        const d = await res.json();
        setPesan(d.error || "Gagal memperbarui status");
      }
    } catch {
      setPesan("Kendala koneksi saat memperbarui");
    }
  }

  const [form, setForm] = useState({
    status: "diambil",
    volume: "",
    berat: "",
    jenisSampah: "campuran",
    catatan: "",
    kendaraanId: "",
    fotoBukti: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
  });

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/pengangkutan?saya=1&tanggal=${tanggal}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [tanggal]);

  useEffect(() => {
    (async () => {
      const [pRes, kRes] = await Promise.all([fetch("/api/petugas/me"), fetch("/api/kendaraan")]);
      // BUG FIX: `pRes.clone()` setelah body `pRes.json()` dibaca akan throw
      // ("Body has already been consumed") — akibatnya kendaraanSaya tidak pernah
      // terisi dan dropdown kendaraan selalu kosong. Baca json sekali saja.
      const profil = pRes.ok ? ((await pRes.json()) as Profil) : null;
      if (kRes.ok) {
        const semua: Kendaraan[] = await kRes.json();
        setKendaraanSaya(semua.filter((k) => k.petugas?.id === profil?.id));
      }
    })();
  }, []);

  useEffect(() => {
    // fetch on mount: setState terjadi setelah await (async), bukan sinkron di body effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const [filterTab, setFilterTab] = useState<"belum" | "selesai" | "semua">("belum");

  function bukaForm(t: Tugas) {
    setEditingId(t.id);
    setPesan("");
    setForm({
      status: "diambil",
      volume: "",
      berat: "",
      jenisSampah: "campuran",
      catatan: "",
      kendaraanId: kendaraanSaya.length > 0 ? String(kendaraanSaya[0].id) : "",
      fotoBukti: "",
      latitude: t.pelanggan.latitude?.toString() || "",
      longitude: t.pelanggan.longitude?.toString() || "",
      koordinatSumber: "",
      koordinatAkurasi: "",
    });
  }

  async function simpan() {
    if (editingId == null) return;
    if (form.status === "diambil" && !form.kendaraanId) {
      setPesan("Pilih kendaraan yang dipakai untuk pickup.");
      return;
    }
    setSaving(true);
    setPesan("");
    const body: Record<string, unknown> = {
      status: form.status,
      catatan: form.catatan || null,
      volume: form.volume ? Number(form.volume) : null,
      berat: form.berat ? Number(form.berat) : null,
      jenisSampah: form.jenisSampah || null,
      fotoBukti: form.fotoBukti || null,
      kendaraanId: form.kendaraanId ? Number(form.kendaraanId) : null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    try {
      const res = await fetch(`/api/pengangkutan/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setPesan(`✓ Berhasil mencatat ${STATUS_META[form.status]?.label || form.status}`);
        setEditingId(null);
        fetchData();
      } else {
        setPesan(d.error || "Gagal menyimpan data");
      }
    } catch {
      setPesan("Terjadi kendala koneksi saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const selesaiCount = data.filter((t) => t.status !== "terjadwal").length;
  const totalCount = data.length;
  const percentComplete = totalCount > 0 ? Math.round((selesaiCount / totalCount) * 100) : 0;

  const filteredData = data.filter((t) => {
    if (filterTab === "belum") return t.status === "terjadwal";
    if (filterTab === "selesai") return t.status !== "terjadwal";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header with Date & Progress */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Rute Pengangkutan</h1>
            <p className="text-xs text-slate-500 font-medium truncate">
              {format(new Date(tanggal), "EEEE, d MMMM yyyy", { locale: id })}
            </p>
          </div>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full sm:w-auto border border-slate-200 bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Progress Bar (GoPartner Fleet Progress) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-600">Progres Pengangkutan</span>
            <span className="text-emerald-700 font-bold tabular-nums">{selesaiCount} / {totalCount} Selesai ({percentComplete}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* ── Radar & Proximity Toolbar (Hands-Free Mode) ── */}
        <div className="bg-slate-900 text-white rounded-2xl p-2.5 sm:p-3 shadow-md space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    driverPos ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    driverPos ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="text-xs font-bold text-slate-100 truncate">
                {driverPos
                  ? `Radar Aktif (±${driverPos.akurasi || 5}m)`
                  : "Mencari GPS..."}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {/* Toggle Radius 10m vs 20m */}
              <div className="inline-flex bg-slate-800 rounded-xl p-0.5 text-[11px] font-bold border border-slate-700">
                <button
                  type="button"
                  onClick={() => setRadiusMeter(10)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    radiusMeter === 10
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  10m
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusMeter(20)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    radiusMeter === 20
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  20m
                </button>
              </div>

              {/* Toggle Audio & Voice */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  setVoiceEnabled(next);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  soundEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {soundEnabled ? "🔊 On" : "🔇 Mute"}
              </button>
            </div>
          </div>

          {/* Closest Target Hint */}
          {closestTask && closestDistance !== null && (
            <div className="flex items-center justify-between bg-white/10 rounded-xl px-2.5 py-1.5 text-xs gap-2">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <span className="text-xs shrink-0">🎯</span>
                <span className="font-extrabold text-white truncate">
                  {closestTask.pelanggan.nama}
                </span>
                <span className="text-[10px] text-slate-300 shrink-0">
                  ({closestDistance}m)
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {closestTask.tunggakan?.isMenunggak ? (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40">
                    ⛔ Menunggak
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/30 text-emerald-200">
                    ✓ Lunas
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => forceOpenTask(closestTask.id)}
                  className="px-2 py-0.5 bg-white text-slate-900 rounded-lg text-[10px] font-black active:scale-95 transition-transform"
                >
                  ⚡ Pop-up
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW MODE SWITCHER: PETA LIVE vs DAFTAR ANTREAN ── */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg">
        <button
          type="button"
          onClick={() => setViewMode("map")}
          className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "map"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>🗺️</span>
          <span>Peta Live</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40">
            {data.filter((t) => t.pelanggan.latitude && t.pelanggan.longitude).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "list"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>📋</span>
          <span>Daftar Rute</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40">
            {filteredData.length}
          </span>
        </button>
      </div>

      {/* ── MODE PETA LIVE (GOJEK DRIVER ON-TRIP COCKPIT) ── */}
      {viewMode === "map" && (
        <div className="space-y-3">
          <GojekDriverCockpit
            tugas={data
              .filter((t) => t.pelanggan.latitude && t.pelanggan.longitude)
              .map((t) => ({
                id: t.id,
                nama: t.pelanggan.nama,
                alamat: t.pelanggan.alamat,
                kodePelanggan: t.pelanggan.kodePelanggan,
                latitude: t.pelanggan.latitude!,
                longitude: t.pelanggan.longitude!,
                status: t.status,
                patokanLokasi: t.pelanggan.patokanLokasi,
                noTelepon: t.pelanggan.noTelepon,
                fotoRumah: t.pelanggan.fotoRumah,
                tunggakan: t.tunggakan,
              }))}
            activeTarget={activeTask || closestTask}
            posSaya={driverPos}
            radiusMeter={radiusMeter}
            muatanTruk={muatanTruk}
            onMuatanChange={setMuatanTruk}
            onQuickPickup={handleQuickPickup}
            onSkipOverdue={handleSkipOverdue}
            onOpenFullForm={(t) => {
              const original = data.find((d) => d.id === t.id);
              if (original) bukaForm(original);
            }}
            onSelectTarget={(taskId) => forceOpenTask(taskId)}
            soundEnabled={soundEnabled}
            onToggleSound={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              setVoiceEnabled(next);
            }}
          />

          {data.length === 0 && (
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-800 text-center text-slate-300 text-xs space-y-1">
              <p className="font-bold text-white">
                ℹ️ Tidak ada jadwal antrean untuk tanggal ini ({format(new Date(tanggal), "EEEE, d MMMM yyyy", { locale: id })})
              </p>
              <p className="text-[11px] text-slate-400">
                Peta tetap aktif memantau pergerakan armada Anda. Ganti tanggal jadwal di bagian atas jika ingin memeriksa antrean hari lain.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── MODE DAFTAR RUTE ── */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {/* Filter Tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setFilterTab("belum")}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filterTab === "belum"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Antrean ({data.filter((t) => t.status === "terjadwal").length})
            </button>
            <button
              onClick={() => setFilterTab("selesai")}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filterTab === "selesai"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Selesai ({selesaiCount})
            </button>
            <button
              onClick={() => setFilterTab("semua")}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filterTab === "semua"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua ({totalCount})
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Memuat rute tugas...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-xl">
                🎉
              </div>
              <p className="text-sm font-bold text-slate-900">
                {filterTab === "belum" ? "Semua Pengangkutan Selesai!" : "Tidak Ada Data"}
              </p>
              <p className="text-xs text-slate-500">
                {filterTab === "belum"
                  ? "Hebat! Tidak ada lagi rumah yang menunggu pengangkutan pada jadwal ini."
                  : "Belum ada catatan tugas pada filter yang dipilih."}
              </p>
            </div>
          ) : (
        filteredData.map((t) => {
          const isDone = t.status !== "terjadwal";
          const isEditing = editingId === t.id;
          return (
            <div
              key={t.id}
              className={`bg-white rounded-3xl border transition-all p-4 space-y-3.5 ${
                isEditing
                  ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md"
                  : isDone
                  ? "border-slate-200/60 bg-slate-50/50"
                  : "border-slate-200/80 shadow-xs hover:shadow-sm"
              }`}
            >
              {/* Header Stop Card */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {t.pelanggan.nama}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-mono font-medium text-slate-600">
                      {t.pelanggan.kodePelanggan}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
                    {t.pelanggan.alamat}
                  </p>
                  {t.pelanggan.patokanLokasi && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        📍 {t.pelanggan.patokanLokasi}
                      </span>
                    </div>
                  )}
                  {t.tunggakan?.isMenunggak ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200 animate-pulse">
                        ⛔ MENUNGGAK {t.tunggakan.jumlahBulan} BULAN — JANGAN ANGKUT
                      </span>
                    </div>
                  ) : !isDone ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        ✓ LUNAS
                      </span>
                    </div>
                  ) : null}
                </div>

                <span
                  className={`shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full ${
                    t.status === "diambil"
                      ? "bg-emerald-100 text-emerald-800"
                      : t.status === "tidak_diangkut"
                      ? "bg-rose-100 text-rose-800"
                      : t.status === "kosong"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {STATUS_META[t.status]?.label || t.status}
                </span>
              </div>

              {/* Navigation & Map Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("map");
                    forceOpenTask(t.id);
                  }}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
                >
                  <span>🗺️</span>
                  <span>Lihat di Peta</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(mapsUrl(t), "_system")}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <span>🧭</span>
                  <span>Google Maps</span>
                </button>
              </div>

              {!isEditing ? (
                <div className="space-y-2 pt-1">
                  {!isDone ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => forceOpenTask(t.id)}
                          className={`py-2.5 px-3 rounded-2xl text-xs font-black shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                            t.tunggakan?.isMenunggak
                              ? "bg-rose-600 hover:bg-rose-500 text-white"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          <span>⚡</span>
                          <span className="truncate">{t.tunggakan?.isMenunggak ? "Cek Tunggakan" : "1-Tap Ceklis"}</span>
                        </button>

                        <button
                          onClick={() => {
                            bukaForm(t);
                            setForm((f) => ({ ...f, status: "diambil" }));
                          }}
                          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>📸</span>
                          <span>Detail / Foto</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            bukaForm(t);
                            setForm((f) => ({ ...f, status: "kosong" }));
                          }}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                        >
                          Kosong
                        </button>
                        <button
                          onClick={() => {
                            bukaForm(t);
                            setForm((f) => ({ ...f, status: "tidak_diangkut" }));
                          }}
                          className="py-2 px-3 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                        >
                          Kendala
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          bukaForm(t);
                          setForm((f) => ({ ...f, status: "diambil" }));
                        }}
                        className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-1"
                      >
                        <span>📸</span>
                        <span>Ubah</span>
                      </button>
                      <button
                        onClick={() => {
                          bukaForm(t);
                          setForm((f) => ({ ...f, status: "kosong" }));
                        }}
                        className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                      >
                        Kosong
                      </button>
                      <button
                        onClick={() => {
                          bukaForm(t);
                          setForm((f) => ({ ...f, status: "tidak_diangkut" }));
                        }}
                        className="py-2.5 px-2 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                      >
                        Kendala
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-slate-200/80 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Konfirmasi Pickup: <span className="text-emerald-700 font-extrabold">{STATUS_META[form.status]?.label}</span>
                    </span>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Batal ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Jenis Sampah</label>
                      <select
                        value={form.jenisSampah}
                        onChange={(e) => setForm({ ...form, jenisSampah: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {JENIS_SAMPAH.map((j) => (
                          <option key={j} value={j}>{j.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Armada Truk *</label>
                      <select
                        value={form.kendaraanId}
                        onChange={(e) => setForm({ ...form, kendaraanId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 truncate"
                      >
                        <option value="">— Pilih Truk —</option>
                        {kendaraanSaya.map((k) => (
                          <option key={k.id} value={k.id}>{k.nama}{k.platNomor ? ` (${k.platNomor})` : ""}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Volume (m³)</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={form.volume}
                        onChange={(e) => setForm({ ...form, volume: e.target.value })}
                        placeholder="0.5"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Berat (kg)</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={form.berat}
                        onChange={(e) => setForm({ ...form, berat: e.target.value })}
                        placeholder="10"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Catatan Tambahan</label>
                    <textarea
                      value={form.catatan}
                      onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                      placeholder="Contoh: Sampah sudah dipilah rapi di depan pagar"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <CameraGps
                    label="Foto Bukti Pengangkutan"
                    foto={form.fotoBukti}
                    latitude={form.latitude}
                    longitude={form.longitude}
                    koordinatSumber={form.koordinatSumber}
                    koordinatAkurasi={form.koordinatAkurasi}
                    onFotoChange={(fotoBukti) => setForm({ ...form, fotoBukti })}
                    onKoordinatChange={(latitude, longitude, koordinatSumber, koordinatAkurasi) =>
                      setForm({ ...form, latitude, longitude, koordinatSumber, koordinatAkurasi })
                    }
                  />

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={simpan}
                      disabled={saving}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md active:scale-98 transition-all disabled:opacity-50"
                    >
                      {saving ? "Menyimpan Catatan..." : "Simpan & Lanjutkan 🚀"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
        </div>
      )}

      {/* ── Modal Pop-up Proximity (Radius 10m/20m) ── */}
      {activeTask && activeDistance !== null && (
        <ProximityPickupModal
          tugas={activeTask}
          jarakMeter={activeDistance}
          kendaraanNama={kendaraanSaya[0]?.nama}
          onConfirmPickup={handleQuickPickup}
          onSkipOverdue={handleSkipOverdue}
          onOpenFullForm={(task) => {
            const found = data.find((item) => item.id === task.id);
            if (found) bukaForm(found);
          }}
          onDismiss={dismissActiveTask}
        />
      )}
    </div>
  );
}
