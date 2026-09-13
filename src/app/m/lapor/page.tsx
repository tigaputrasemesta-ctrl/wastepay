"use client";

import { useState } from "react";
import CameraGps from "@/components/mobile/CameraGps";
import { Search, CheckCircle2, AlertTriangle, XCircle, Home, MapPin, ChevronDown, ChevronUp } from "lucide-react";

type Pelanggan = {
  id: number;
  nama: string;
  alamat: string;
  kodePelanggan: string;
  status: string;
  patokanLokasi: string | null;
};

type Laporan = { id: number; status: string; createdAt: string; petugas: { nama: string } | null };

const STATUS_META: Record<string, { label: string; icon: string }> = {
  diambil: { label: "Berhasil Diangkut", icon: "✅" },
  kosong: { label: "Rumah Kosong / Nihil", icon: "🏠" },
  tidak_diangkut: { label: "Tidak Dapat Diangkut", icon: "❌" },
};

export default function MobileLapor() {
  const [kode, setKode] = useState("");
  const [checking, setChecking] = useState(false);
  const [pelanggan, setPelanggan] = useState<Pelanggan | null>(null);
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [showOpsional, setShowOpsional] = useState(false);
  const [foto, setFoto] = useState({
    fotoBukti: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
  });

  async function cek() {
    const k = kode.trim();
    if (!k || checking) return;
    setChecking(true);
    setPesan(null);
    setPelanggan(null);
    setLaporan([]);
    try {
      const res = await fetch(`/api/pengangkutan/lapor?kode=${encodeURIComponent(k)}`);
      const d = await res.json();
      if (res.ok) {
        setPelanggan(d.pelanggan);
        setLaporan(d.laporan ?? []);
      } else {
        setPesan({ ok: false, teks: d.error || "Kode pelanggan tidak ditemukan" });
      }
    } catch {
      setPesan({ ok: false, teks: "Jaringan bermasalah, silakan coba lagi" });
    } finally {
      setChecking(false);
    }
  }

  async function kirim(status: string) {
    if (!pelanggan || sending) return;
    setSending(true);
    setPesan(null);
    const kendaraanId =
      (typeof localStorage !== "undefined" && localStorage.getItem("o2w_kendaraan_id")) || "";
    try {
      const res = await fetch("/api/pengangkutan/lapor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodePelanggan: pelanggan.kodePelanggan,
          status,
          catatan: catatan || null,
          fotoBukti: foto.fotoBukti || null,
          latitude: foto.latitude || null,
          longitude: foto.longitude || null,
          kendaraanId: kendaraanId || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setPesan({ ok: true, teks: `${pelanggan.nama} → ${STATUS_META[status]?.label} ✓` });
        setPelanggan(null);
        setLaporan([]);
        setKode("");
        setCatatan("");
        setShowOpsional(false);
        setFoto({ fotoBukti: "", latitude: "", longitude: "", koordinatSumber: "", koordinatAkurasi: "" });
      } else {
        setPesan({ ok: false, teks: d.error || "Gagal menyimpan laporan" });
      }
    } catch {
      setPesan({ ok: false, teks: "Jaringan bermasalah, periksa koneksi internet" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Compact Top Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Lapor Pengangkutan</h1>
          <p className="text-[10px] text-slate-500">Pencatatan status jemputan cepat driver</p>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          Cepat & Offline
        </span>
      </div>

      {/* Input Kode Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-2xs space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Cari Kode Pelanggan
        </label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && cek()}
              placeholder="Contoh: KAL-001"
              autoFocus
              autoCapitalize="characters"
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-sm font-bold uppercase tracking-wider outline-none bg-slate-50/70 focus:bg-white focus:border-emerald-500 shadow-2xs transition-all"
            />
            {kode && (
              <button
                type="button"
                onClick={() => setKode("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={cek}
            disabled={checking || !kode.trim()}
            className="px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-40 shrink-0 flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{checking ? "…" : "Cari"}</span>
          </button>
        </div>
      </div>

      {/* Notification message */}
      {pesan && (
        <div
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold p-2.5 rounded-xl border ${
            pesan.ok
              ? "border-emerald-200 text-emerald-800 bg-emerald-50"
              : "border-rose-200 text-rose-800 bg-rose-50"
          }`}
        >
          {pesan.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{pesan.teks}</span>
        </div>
      )}

      {/* Found Customer Card */}
      {pelanggan ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 space-y-3">
          <div className="pb-2.5 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {pelanggan.kodePelanggan}
              </span>
              {laporan.length > 0 && (
                <span className="text-[9px] font-bold text-sky-800 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                  Status: {STATUS_META[laporan[0].status]?.label ?? laporan[0].status}
                </span>
              )}
            </div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mt-1">
              {pelanggan.nama}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{pelanggan.alamat}</span>
            </p>
            {pelanggan.patokanLokasi && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-1 pl-4">
                Patokan: {pelanggan.patokanLokasi}
              </p>
            )}
          </div>

          {/* Quick 1-Tap Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => kirim("diambil")}
              disabled={sending}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{STATUS_META.diambil.label}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => kirim("kosong")}
                disabled={sending}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{STATUS_META.kosong.label}</span>
              </button>
              <button
                onClick={() => kirim("tidak_diangkut")}
                disabled={sending}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{STATUS_META.tidak_diangkut.label}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Photo & Extra Notes */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowOpsional(!showOpsional)}
              className="w-full py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors"
            >
              <span>{showOpsional ? "Tutup Catatan & Foto" : "+ Tambah Catatan & Foto Bukti (Opsional)"}</span>
              {showOpsional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showOpsional && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan kendala (cth: pagar digembok, sampah belum dipilah)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
                />
                <CameraGps
                  label="Foto Bukti Lapangan"
                  foto={foto.fotoBukti}
                  latitude={foto.latitude}
                  longitude={foto.longitude}
                  koordinatSumber={foto.koordinatSumber}
                  koordinatAkurasi={foto.koordinatAkurasi}
                  onFotoChange={(fotoBukti) => setFoto((f) => ({ ...f, fotoBukti }))}
                  onKoordinatChange={(latitude, longitude, koordinatSumber, koordinatAkurasi) =>
                    setFoto((f) => ({ ...f, latitude, longitude, koordinatSumber, koordinatAkurasi }))
                  }
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State / Quick Guide (Keeps screen perfectly framed) */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 text-center shadow-2xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Pencatatan Rute Cepat</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Masukkan kode rumah pelanggan warga di atas untuk langsung mencatat status pengangkutan harian.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
            <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded-lg font-semibold">
              ✅ Diangkut
            </div>
            <div className="bg-amber-50 text-amber-800 p-1.5 rounded-lg font-semibold">
              🏠 Kosong
            </div>
            <div className="bg-rose-50 text-rose-800 p-1.5 rounded-lg font-semibold">
              ❌ Lewat
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
