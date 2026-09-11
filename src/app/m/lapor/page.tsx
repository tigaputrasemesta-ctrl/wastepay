"use client";

import { useState } from "react";
import CameraGps from "@/components/mobile/CameraGps";


type Pelanggan = {
  id: number;
  nama: string;
  alamat: string;
  kodePelanggan: string;
  status: string;
  patokanLokasi: string | null;
};

type Laporan = { id: number; status: string; createdAt: string; petugas: { nama: string } | null };

const STATUS_META: Record<string, { label: string; cls: string }> = {
  diambil: { label: "Berhasil Diangkut", cls: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" },
  kosong: { label: "Rumah Kosong / Nihil", cls: "bg-amber-500 hover:bg-amber-600 text-white shadow-xs" },
  tidak_diangkut: { label: "Tidak Dapat Diangkut", cls: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs" },
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
    <div className="space-y-5 pb-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Pencatatan Rute Cepat Driver
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Lapor Pengangkutan</h1>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          Ketik kode pelanggan untuk menandai status jemputan di lapangan
        </p>
      </div>

      {/* Input kode */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-3">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Kode Pelanggan Warga
        </label>
        <div className="flex gap-2">
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && cek()}
            placeholder="Contoh: KAL-001"
            autoFocus
            autoCapitalize="characters"
            className="flex-1 px-4 py-3.5 rounded-2xl border border-slate-200 text-base font-bold uppercase tracking-wider outline-none bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <button
            onClick={cek}
            disabled={checking || !kode.trim()}
            className="px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-sm font-bold shadow-xs transition-all disabled:opacity-40"
          >
            {checking ? "Cek…" : "Cari"}
          </button>
        </div>
      </div>

      {pesan && (
        <p className={`text-center text-xs font-semibold p-3.5 rounded-2xl border ${pesan.ok ? "border-emerald-200 text-emerald-800 bg-emerald-50" : "border-rose-200 text-rose-800 bg-rose-50"}`}>
          {pesan.teks}
        </p>
      )}

      {/* Kartu pelanggan */}
      {pelanggan && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <span className="inline-block text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mb-1.5">
              {pelanggan.kodePelanggan}
            </span>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {pelanggan.nama}
            </p>
            <p className="text-xs text-slate-600 mt-1">{pelanggan.alamat}</p>
            {pelanggan.patokanLokasi && (
              <p className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                📍 Patokan: {pelanggan.patokanLokasi}
              </p>
            )}
            {laporan.length > 0 && (
              <div className="mt-3 p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800 font-medium">
                Sudah dilaporkan hari ini: {laporan.map((l) => STATUS_META[l.status]?.label ?? l.status).join(", ")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => kirim("diambil")}
              disabled={sending}
              className={`py-4 px-6 rounded-2xl text-sm sm:text-base font-bold active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${STATUS_META.diambil.cls}`}
            >
              ✅ {STATUS_META.diambil.label}
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => kirim("kosong")}
                disabled={sending}
                className={`py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${STATUS_META.kosong.cls}`}
              >
                🏠 {STATUS_META.kosong.label}
              </button>
              <button
                onClick={() => kirim("tidak_diangkut")}
                disabled={sending}
                className={`py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${STATUS_META.tidak_diangkut.cls}`}
              >
                ❌ {STATUS_META.tidak_diangkut.label}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowOpsional(!showOpsional)}
            className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-1.5 text-center transition-colors"
          >
            {showOpsional ? "▲ Sembunyikan Detail Tambahan" : "▼ Tambah Foto / Catatan Kendala (Opsional)"}
          </button>

          {showOpsional && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan lapangan (cth: gerbang terkunci, sampah belum ditaruh di depan)..."
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
      )}
    </div>
  );
}

