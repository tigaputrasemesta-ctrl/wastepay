"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";
import ProximityPickupModal from "@/components/mobile/ProximityPickupModal";
import GojekDriverCockpit, { formatTripDuration, type TripState } from "@/components/mobile/GojekDriverCockpit";
import QrScannerModal from "@/components/mobile/QrScannerModal";
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

  // Trip & Shift State (Starting & Completing + Timer + Scanner)
  const [tripState, setTripState] = useState<TripState>("idle");
  const [tripSeconds, setTripSeconds] = useState<number>(0);
  const [showTripSummary, setShowTripSummary] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [searchQueryList, setSearchQueryList] = useState("");
  const [showTopTools, setShowTopTools] = useState(false);
  const [hideEmptyScheduleAlert, setHideEmptyScheduleAlert] = useState(false);

  useEffect(() => {
    setHideEmptyScheduleAlert(false);
  }, [tanggal]);

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

  // Restore trip state dari localStorage
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("wp_driver_trip_state") : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === "running") {
          const now = Date.now();
          const diff = Math.floor((now - parsed.startTime) / 1000);
          setTripSeconds(Math.max(0, (parsed.elapsedOffset || 0) + diff));
          setTripState("running");
        } else if (parsed.status === "paused") {
          setTripSeconds(parsed.elapsedOffset || 0);
          setTripState("paused");
        }
      }
    } catch {}
  }, []);

  // Timer interval
  useEffect(() => {
    if (tripState !== "running") return;
    const t = setInterval(() => {
      setTripSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [tripState]);

  function handleStartTrip() {
    const now = Date.now();
    setTripState("running");
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "wp_driver_trip_state",
        JSON.stringify({ status: "running", startTime: now, elapsedOffset: tripSeconds })
      );
    }
    playSound("success");
    vibrate("success");
    speakText("Rute pengangkutan dimulai. Selamat bertugas!");
  }

  function handlePauseTrip() {
    setTripState("paused");
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "wp_driver_trip_state",
        JSON.stringify({ status: "paused", startTime: Date.now(), elapsedOffset: tripSeconds })
      );
    }
    speakText("Rute dijeda.");
  }

  function handleResumeTrip() {
    handleStartTrip();
  }

  function handleCompleteTrip() {
    setTripState("completed");
    if (typeof window !== "undefined") {
      localStorage.removeItem("wp_driver_trip_state");
    }
    setShowTripSummary(true);
    playSound("success");
    vibrate("success");
    speakText("Luar biasa! Rute pengangkutan selesai.");
  }

  function handleGlobalScan(code: string) {
    const clean = code.trim().toLowerCase();
    const found = data.find(
      (t) =>
        t.pelanggan.kodePelanggan.toLowerCase() === clean ||
        String(t.id) === clean
    );
    if (found) {
      playSound("success");
      vibrate("success");
      speakText(`Target ditemukan: ${found.pelanggan.nama}`);
      forceOpenTask(found.id);
    } else {
      alert(`Kode pelanggan "${code}" tidak ditemukan dalam jadwal rute hari ini.`);
    }
  }

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
    if (filterTab === "belum" && t.status !== "terjadwal") return false;
    if (filterTab === "selesai" && t.status === "terjadwal") return false;
    if (searchQueryList.trim()) {
      const q = searchQueryList.trim().toLowerCase();
      const match =
        t.pelanggan.nama.toLowerCase().includes(q) ||
        t.pelanggan.kodePelanggan.toLowerCase().includes(q) ||
        t.pelanggan.alamat.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative pb-[58px]">
      {/* ── UNIFIED COMPACT DRIVER DASHBOARD (Persistent & Visible across Map & List) ── */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 p-2 sm:p-2.5 space-y-1.5 shadow-md z-30">
        {/* Row 1: Date Picker + Trip Actions & Timer + Mode Switcher + Opsi Hide/Open Toggle */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Date Picker Badge */}
          <div className="relative shrink-0">
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              aria-label="Pilih tanggal jadwal rute"
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
            <div className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 flex items-center gap-1 text-[11px] font-bold transition-colors">
              <span aria-hidden="true">📅</span>
              <span className="truncate max-w-[85px] sm:max-w-none">
                {format(new Date(tanggal), "d MMM", { locale: id })}
              </span>
              <span className="text-[9px] text-slate-400">▾</span>
            </div>
          </div>

          {/* Trip Actions & Timer */}
          <div className="flex items-center gap-1 shrink-0">
            {tripState === "idle" && (
              <button
                type="button"
                onClick={handleStartTrip}
                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition-all flex items-center gap-1"
              >
                <span>▶️ Mulai</span>
              </button>
            )}

            {tripState === "running" && (
              <>
                <button
                  type="button"
                  onClick={handlePauseTrip}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-xl border border-slate-700 transition-all"
                  title="Jeda Rute"
                >
                  ⏸️
                </button>
                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition-all"
                  title="Selesaikan Rute"
                >
                  🏁
                </button>
              </>
            )}

            {tripState === "paused" && (
              <>
                <button
                  type="button"
                  onClick={handleResumeTrip}
                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition-all"
                  title="Lanjut Rute"
                >
                  ▶️
                </button>
                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-xl border border-slate-700 transition-all"
                  title="Selesaikan Rute"
                >
                  🏁
                </button>
              </>
            )}

            {tripState === "completed" && (
              <button
                type="button"
                onClick={() => {
                  setTripState("idle");
                  setTripSeconds(0);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-xl border border-slate-700"
              >
                🔄 Reset
              </button>
            )}

            {/* Timer */}
            <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums px-1">
              ⏱️ {formatTripDuration(tripSeconds)}
            </span>

            {/* Mini Progress Counter (visible when secondary bar is collapsed) */}
            {!showTopTools && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-slate-700/80 tabular-nums">
                {selesaiCount}/{totalCount}
              </span>
            )}
          </div>

          {/* Right Group: View Switcher + Tools/Options Hide/Open Toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="inline-flex bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-[11px] font-black shrink-0"
              role="group"
              aria-label="Mode tampilan"
            >
              <button
                type="button"
                onClick={() => setViewMode("map")}
                aria-pressed={viewMode === "map"}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all flex items-center gap-1 ${
                  viewMode === "map"
                    ? "bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🗺️ Peta</span>
                <span className="text-[9px] px-1 rounded-full bg-black/40">
                  {data.filter((t) => t.pelanggan.latitude && t.pelanggan.longitude).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all flex items-center gap-1 ${
                  viewMode === "list"
                    ? "bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>📋 Daftar</span>
                <span className="text-[9px] px-1 rounded-full bg-black/40">
                  {filteredData.length}
                </span>
              </button>
            </div>

            {/* Hide / Open Toggle Button for Secondary Tool Bar (Radar, Sound, Scanner, Progress) */}
            <button
              type="button"
              onClick={() => setShowTopTools((prev) => !prev)}
              aria-expanded={showTopTools}
              aria-label={showTopTools ? "Sembunyikan panel opsi lanjutan" : "Buka panel opsi lanjutan (Radius, Suara, Scan)"}
              className={`p-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center ${
                showTopTools
                  ? "bg-emerald-700 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700"
              }`}
              title={showTopTools ? "Sembunyikan Opsi Lanjutan (Radius, Suara, Scan)" : "Buka Opsi Lanjutan (Radius, Suara, Scan)"}
            >
              <span aria-hidden="true" className="leading-none">{showTopTools ? "▲" : "⚙️"}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Radar, Sound, Scanner & Integrated Progress Bar (Collapsible / Hide-Open) */}
        {showTopTools && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Radius Toggle */}
              <div className="inline-flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setRadiusMeter(10)}
                  className={`px-1.5 py-0.5 rounded ${
                    radiusMeter === 10 ? "bg-emerald-700 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  10m
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusMeter(20)}
                  className={`px-1.5 py-0.5 rounded ${
                    radiusMeter === 20 ? "bg-emerald-700 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  20m
                </button>
              </div>

              {/* Audio Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  setVoiceEnabled(next);
                }}
                className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border ${
                  soundEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
                title={soundEnabled ? "Suara Aktif" : "Mute"}
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>

              {/* Scanner Button */}
              <button
                type="button"
                onClick={() => setIsGlobalScannerOpen(true)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 text-[11px] font-bold flex items-center gap-1"
                title="Scan QR / Barcode Pelanggan"
              >
                <span>📷</span>
                <span className="text-[10px]">Scan</span>
              </button>
            </div>

            {/* Integrated Slim Progress Bar */}
            <div className="flex-1 max-w-[170px] sm:max-w-xs text-right">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                <span>Progres</span>
                <span className="text-emerald-400 tabular-nums">
                  {selesaiCount}/{totalCount} ({percentComplete}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── VIEWPORT: MODE PETA LIVE (ZERO-SCROLL VIEWPORT) ── */}
      {viewMode === "map" && (
        <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
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
            tripState={tripState}
            tripSeconds={tripSeconds}
            onStartTrip={handleStartTrip}
            onPauseTrip={handlePauseTrip}
            onResumeTrip={handleResumeTrip}
            onCompleteTrip={handleCompleteTrip}
            tanggal={tanggal}
          />

          {data.length === 0 && (
            <>
              {!hideEmptyScheduleAlert ? (
                <div className="absolute top-2 inset-x-3 sm:inset-x-6 z-[400] max-w-md mx-auto pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-slate-950/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-slate-800 shadow-2xl space-y-2.5">
                    {/* Header: Icon, Title, Date & Close Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm font-bold shrink-0">
                          🚛
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-white">Tidak Ada Jadwal Rute</h4>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Standby
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {format(new Date(tanggal), "EEEE, d MMMM yyyy", { locale: id })}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHideEmptyScheduleAlert(true)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors shrink-0"
                        title="Tutup pemberitahuan"
                        aria-label="Tutup"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                      🗺️ Peta tetap aktif memantau pergerakan GPS armada Anda secara real-time.
                    </p>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {tanggal !== todayLocalISO() && (
                        <button
                          type="button"
                          onClick={() => setTanggal(todayLocalISO())}
                          className="flex-1 py-1.5 px-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1"
                        >
                          <span>📅 Kembali ke Hari Ini</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setHideEmptyScheduleAlert(true)}
                        className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1"
                      >
                        <span>Tutup & Lihat Peta</span>
                        <span aria-hidden="true">✕</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact floating badge when dismissed (re-openable) */
                <div className="absolute top-2 left-2 z-[400] pointer-events-auto animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => setHideEmptyScheduleAlert(false)}
                    className="px-2.5 py-1 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md text-slate-200 border border-slate-700/80 rounded-xl text-[10px] font-bold shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
                    title="Buka info jadwal armada"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Standby ({format(new Date(tanggal), "d MMM", { locale: id })})</span>
                    <span className="text-slate-400">▾</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── VIEWPORT: MODE DAFTAR RUTE (SCROLLABLE LIST) ── */}
      {viewMode === "list" && (
        <div className="flex-1 w-full h-full min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 pb-24">

          {/* Searching & Finding in List View */}
          <div className="relative">
            <input
              type="text"
              value={searchQueryList}
              onChange={(e) => setSearchQueryList(e.target.value)}
              aria-label="Cari pelanggan"
              placeholder="Cari nama pelanggan, kode (mis. 0101-0001), atau alamat..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
            />
            {searchQueryList && (
              <button
                type="button"
                onClick={() => setSearchQueryList("")}
                aria-label="Bersihkan pencarian"
                className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div
            className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold"
            role="group"
            aria-label="Filter daftar"
          >
            <button
              onClick={() => setFilterTab("belum")}
              aria-pressed={filterTab === "belum"}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filterTab === "belum"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Antrean ({data.filter((t) => t.status === "terjadwal").length})
            </button>
            <button
              onClick={() => setFilterTab("selesai")}
              aria-pressed={filterTab === "selesai"}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filterTab === "selesai"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Selesai ({selesaiCount})
            </button>
            <button
              onClick={() => setFilterTab("semua")}
              aria-pressed={filterTab === "semua"}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                filterTab === "semua"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua ({totalCount})
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Memuat rute tugas...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-xl">
                <span aria-hidden="true">🎉</span>
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
                  : "border-slate-200/80 shadow-sm hover:shadow-sm"
              }`}
            >
              {/* Header Stop Card */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {t.pelanggan.nama}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-medium text-slate-600">
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
                  className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                >
                  <span aria-hidden="true">🗺️</span>
                  <span>Lihat di Peta</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(mapsUrl(t), "_system")}
                  className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span aria-hidden="true">🧭</span>
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
                          className={`py-3.5 px-4 rounded-2xl text-sm font-black w-full mb-1 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                            t.tunggakan?.isMenunggak
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : "bg-emerald-700 hover:bg-emerald-800 text-white"
                          }`}
                        >
                          <span aria-hidden="true">⚡</span>
                          <span className="truncate">{t.tunggakan?.isMenunggak ? "Cek Tunggakan" : "1-Tap Ceklis"}</span>
                        </button>

                        <button
                          onClick={() => {
                            bukaForm(t);
                            setForm((f) => ({ ...f, status: "diambil" }));
                          }}
                          className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span aria-hidden="true">📸</span>
                          <span>Detail / Foto</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            bukaForm(t);
                            setForm((f) => ({ ...f, status: "kosong" }));
                          }}
                          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                        >
                          Kosong
                        </button>
                        <button
                          onClick={() => {
                            bukaForm(t);
                            setForm((f) => ({ ...f, status: "tidak_diangkut" }));
                          }}
                          className="py-3 px-4 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded-2xl text-sm font-bold active:scale-95 transition-all"
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
                        className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <span aria-hidden="true">📸</span>
                        <span>Ubah</span>
                      </button>
                      <button
                        onClick={() => {
                          bukaForm(t);
                          setForm((f) => ({ ...f, status: "kosong" }));
                        }}
                        className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                      >
                        Kosong
                      </button>
                      <button
                        onClick={() => {
                          bukaForm(t);
                          setForm((f) => ({ ...f, status: "tidak_diangkut" }));
                        }}
                        className="py-2.5 px-2 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded-2xl text-sm font-bold active:scale-95 transition-all"
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
                      aria-label="Batalkan konfirmasi pickup"
                      className="px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-lg"
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
                        aria-label="Jenis sampah"
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
                        aria-label="Armada truk"
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
                        aria-label="Volume (m³)"
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
                        aria-label="Berat (kg)"
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
                      aria-label="Catatan tambahan"
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
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={simpan}
                      disabled={saving}
                      className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
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

      {/* ── Modal Pop-up Proximity (Radius 10m/20m) — Khusus saat di mode Daftar ── */}
      {viewMode === "list" && activeTask && activeDistance !== null && (
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

      {/* ── Global QR & Barcode Scanner Modal (Scanning) ── */}
      <QrScannerModal
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onScan={handleGlobalScan}
      />

      {/* ── Modal Ringkasan Rute (Starting & Completing) ── */}
      {showTripSummary && (
        <div
          className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Ringkasan rute pengangkutan"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-sm text-center text-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-emerald-500/30">
              <span aria-hidden="true">🏆</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black">Rute Pengangkutan Selesai!</h3>
              <p className="text-xs text-slate-400">
                Laporan bertugas telah dirangkum otomatis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] font-bold">Waktu Bertugas</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatTripDuration(tripSeconds)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold">Selesai Diangkut</span>
                <span className="font-black text-white text-sm">
                  {selesaiCount} / {totalCount} Rumah
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[10px] font-bold">Muatan Truk</span>
                <span className="font-black text-amber-400 text-sm">{muatanTruk}%</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[10px] font-bold">Dilewati / Kendala</span>
                <span className="font-black text-rose-400 text-sm">
                  {data.filter((t) => t.status === "tidak_diangkut" || t.status === "kosong").length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowTripSummary(false);
                setTripSeconds(0);
                setTripState("idle");
              }}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg transition-transform"
            >
              Tutup Ringkasan 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
