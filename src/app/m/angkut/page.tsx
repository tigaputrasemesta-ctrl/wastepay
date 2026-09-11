"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";
import MapAngkut from "@/components/mobile/MapAngkut";
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
  pelanggan: { id: number; nama: string; alamat: string; kodePelanggan: string; latitude?: number | null; longitude?: number | null; patokanLokasi?: string | null };
  kendaraan?: { id: number; nama: string; platNomor: string | null } | null;
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
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Rute Pengangkutan</h1>
            <p className="text-xs text-slate-500 font-medium">
              {format(new Date(tanggal), "EEEE, d MMMM yyyy", { locale: id })}
            </p>
          </div>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Progress Bar (GoPartner Fleet Progress) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-600">Progres Pengangkutan</span>
            <span className="text-emerald-700 font-black">{selesaiCount} / {totalCount} Selesai ({percentComplete}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

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
      </div>

      {/* Map if available */}
      {data.filter((t) => t.pelanggan.latitude && t.pelanggan.longitude).length > 0 && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
          <MapAngkut
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
              }))}
          />
        </div>
      )}

      {pesan && (
        <div className={`text-center text-xs font-bold p-3 rounded-2xl transition-all ${
          pesan.includes("✓")
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {pesan}
        </div>
      )}

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
          <p className="text-sm font-black text-slate-900">
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
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-600">
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

              {/* Navigation Button */}
              <button
                type="button"
                onClick={() => window.open(mapsUrl(t), "_system")}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <span>🧭 Buka Navigasi Rute Maps</span>
              </button>

              {!isEditing ? (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      bukaForm(t);
                      setForm((f) => ({ ...f, status: "diambil" }));
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>📸</span>
                    <span>Tandai Diangkut</span>
                  </button>
                  <button
                    onClick={() => {
                      bukaForm(t);
                      setForm((f) => ({ ...f, status: "kosong" }));
                    }}
                    className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                  >
                    Kosong
                  </button>
                  <button
                    onClick={() => {
                      bukaForm(t);
                      setForm((f) => ({ ...f, status: "tidak_diangkut" }));
                    }}
                    className="px-3.5 py-3 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold active:scale-98 transition-all"
                  >
                    Kendala
                  </button>
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

                  <div className="grid grid-cols-2 gap-2.5">
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
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
  );
}
