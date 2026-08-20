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
  diambil: { label: "Diangkut", cls: "bg-green-600 text-white" },
  kosong: { label: "Kosong", cls: "bg-amber-400 text-black" },
  tidak_diangkut: { label: "Tidak Diangkut", cls: "bg-red-600 text-white" },
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
        setPesan({ ok: false, teks: d.error || "Gagal cek kode" });
      }
    } catch {
      setPesan({ ok: false, teks: "Jaringan bermasalah" });
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
        setPesan({ ok: false, teks: d.error || "Gagal menyimpan" });
      }
    } catch {
      setPesan({ ok: false, teks: "Jaringan bermasalah" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Lapor Angkut</h1>
        <p className="text-xs font-bold text-gray-500">Input kode pelanggan → tandai sampah diangkut</p>
      </div>

      {/* Input kode */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-3">
        <label className="block text-xs font-black uppercase tracking-widest">Kode Pelanggan</label>
        <div className="flex gap-2">
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && cek()}
            placeholder="Contoh: KB-001"
            autoFocus
            autoCapitalize="characters"
            className="flex-1 px-3 py-4 border-2 border-black text-lg font-black uppercase tracking-widest outline-none bg-yellow-50 focus:bg-white"
          />
          <button
            onClick={cek}
            disabled={checking || !kode.trim()}
            className="px-5 bg-black text-white border-2 border-black text-sm font-black uppercase tracking-widest active:translate-y-[2px] disabled:opacity-40"
          >
            {checking ? "…" : "Cek"}
          </button>
        </div>
      </div>

      {pesan && (
        <p className={`text-center text-sm font-black p-3 border-2 ${pesan.ok ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}`}>
          {pesan.teks}
        </p>
      )}

      {/* Kartu pelanggan */}
      {pelanggan && (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-3">
          <div>
            <p className="text-xl font-black uppercase tracking-tight leading-tight">{pelanggan.nama}</p>
            <p className="font-mono text-xs font-bold text-gray-400 mt-0.5">{pelanggan.kodePelanggan}</p>
            <p className="text-sm font-bold text-gray-700 mt-1">{pelanggan.alamat}</p>
            {pelanggan.patokanLokasi && (
              <p className="text-xs font-bold text-amber-600 mt-0.5">📍 {pelanggan.patokanLokasi}</p>
            )}
            {laporan.length > 0 && (
              <p className="text-[11px] font-black uppercase text-sky-700 mt-2">
                Sudah dilaporkan hari ini: {laporan.map((l) => STATUS_META[l.status]?.label ?? l.status).join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => kirim("diambil")}
              disabled={sending}
              className={`py-5 border-2 border-black text-lg font-black uppercase tracking-widest shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${STATUS_META.diambil.cls}`}
            >
              ✅ {STATUS_META.diambil.label}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => kirim("kosong")}
                disabled={sending}
                className={`py-4 border-2 border-black text-sm font-black uppercase tracking-widest shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${STATUS_META.kosong.cls}`}
              >
                🏠 {STATUS_META.kosong.label}
              </button>
              <button
                onClick={() => kirim("tidak_diangkut")}
                disabled={sending}
                className={`py-4 border-2 border-black text-sm font-black uppercase tracking-widest shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${STATUS_META.tidak_diangkut.cls}`}
              >
                ❌ {STATUS_META.tidak_diangkut.label}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowOpsional(!showOpsional)}
            className="w-full text-[11px] font-black uppercase tracking-widest text-gray-500 py-1"
          >
            {showOpsional ? "▲ Sembunyikan" : "▼ Catatan / foto (opsional)"}
          </button>

          {showOpsional && (
            <div className="space-y-3 border-t-2 border-black pt-3">
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan (rumah kosong, akses tertutup, dll)"
                rows={2}
                className="w-full px-2 py-2 border-2 border-black text-sm font-bold outline-none"
              />
              <CameraGps
                label="Foto Bukti"
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
