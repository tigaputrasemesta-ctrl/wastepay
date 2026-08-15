"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";
import MapAngkut from "@/components/mobile/MapAngkut";

type Profil = { id: number; nama: string; jabatan: string | null; wilayahId: number | null };
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
  terjadwal: { label: "Terjadwal", cls: "bg-sky-400/15 text-sky-700 border-sky-500/40" },
  diambil: { label: "Diambil", cls: "bg-green-600 text-white border-black" },
  tidak_diangkut: { label: "Tidak Diangkut", cls: "bg-red-600 text-white border-black" },
  kosong: { label: "Kosong", cls: "bg-amber-400 text-black border-black" },
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
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
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

  function bukaForm(t: Tugas) {
    setEditingId(t.id);
    setPesan("");
    setForm({
      status: "diambil",
      volume: "",
      berat: "",
      jenisSampah: "campuran",
      catatan: "",
      kendaraanId: "",
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
      volume: form.volume || null,
      berat: form.berat || null,
      jenisSampah: form.jenisSampah || null,
      fotoBukti: form.fotoBukti || null,
      kendaraanId: form.kendaraanId || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
    };
    try {
      const res = await fetch(`/api/pengangkutan/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setPesan(`Tersimpan: ${STATUS_META[form.status]?.label || form.status} ✓`);
        setEditingId(null);
        fetchData();
      } else {
        setPesan(d.error || "Gagal menyimpan");
      }
    } catch {
      setPesan("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const selesai = data.filter((t) => t.status !== "terjadwal").length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Tugas Angkut</h1>
          <p className="text-xs font-bold text-gray-500">
            {format(new Date(tanggal), "EEEE, d MMMM", { locale: id })} · {data.length} tugas · {selesai} selesai
          </p>
        </div>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="border-2 border-black bg-white px-2 py-2 text-xs font-bold outline-none"
        />
      </div>

      {data.filter((t) => t.pelanggan.latitude && t.pelanggan.longitude).length > 0 && (
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
      )}

      {pesan && (
        <p className={`text-center text-sm font-black p-3 border-2 ${pesan.includes("✓") ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}`}>
          {pesan}
        </p>
      )}

      {loading ? (
        <p className="font-mono font-bold text-gray-500 text-center py-10">MEMUAT…</p>
      ) : data.length === 0 ? (
        <div className="border-2 border-black bg-white p-8 text-center">
          <p className="text-lg font-black uppercase tracking-tight">Tidak ada tugas</p>
          <p className="text-xs font-bold text-gray-500 mt-1">Tidak ada jadwal angkut pada tanggal ini.</p>
        </div>
      ) : (
        data.map((t) => {
          const meta = STATUS_META[t.status] || STATUS_META.terjadwal;
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black uppercase tracking-tight leading-tight">
                    {t.pelanggan.nama}
                    <span className="ml-2 font-mono text-[10px] text-gray-400">{t.pelanggan.kodePelanggan}</span>
                  </p>
                  <p className="text-[11px] font-bold text-gray-600 mt-0.5">{t.pelanggan.alamat}</p>
                  {t.pelanggan.patokanLokasi && (
                    <p className="text-[11px] font-bold text-amber-600 mt-0.5">📍 {t.pelanggan.patokanLokasi}</p>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-1 text-[10px] font-black uppercase border-2 ${meta.cls}`}>{meta.label}</span>
              </div>

              <button
                onClick={() => window.open(mapsUrl(t), "_system")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[11px] font-black uppercase tracking-wide"
              >
                🧭 Buka Google Maps
              </button>

              {!isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {["diambil", "tidak_diangkut", "kosong"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        bukaForm(t);
                        setForm((f) => ({ ...f, status: s }));
                      }}
                      className={`px-3 py-2.5 text-[11px] font-black uppercase tracking-wide border-2 border-black active:translate-y-[2px] ${
                        s === "diambil" ? "bg-green-600 text-white" : s === "tidak_diangkut" ? "bg-red-600 text-white" : "bg-amber-400 text-black"
                      }`}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border-t-2 border-black pt-3 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest">
                    Tandai: {STATUS_META[form.status]?.label}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Jenis Sampah</label>
                      <select
                        value={form.jenisSampah}
                        onChange={(e) => setForm({ ...form, jenisSampah: e.target.value })}
                        className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none bg-white"
                      >
                        {JENIS_SAMPAH.map((j) => (
                          <option key={j} value={j}>{j.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Kendaraan *</label>
                      <select
                        value={form.kendaraanId}
                        onChange={(e) => setForm({ ...form, kendaraanId: e.target.value })}
                        className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none bg-white"
                      >
                        <option value="">— Pilih —</option>
                        {kendaraanSaya.map((k) => (
                          <option key={k.id} value={k.id}>{k.nama}{k.platNomor ? ` · ${k.platNomor}` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Volume (m³)</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={form.volume}
                        onChange={(e) => setForm({ ...form, volume: e.target.value })}
                        placeholder="0.5"
                        className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Berat (kg)</label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={form.berat}
                        onChange={(e) => setForm({ ...form, berat: e.target.value })}
                        placeholder="10"
                        className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Catatan / Kendala</label>
                    <textarea
                      value={form.catatan}
                      onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                      placeholder="rumah kosong, akses tertutup, dll"
                      rows={2}
                      className="w-full px-2 py-2 border-2 border-black text-sm font-bold outline-none"
                    />
                  </div>

                  <CameraGps
                    label="Foto Bukti Pickup"
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

                  <div className="flex gap-2">
                    <button
                      onClick={simpan}
                      disabled={saving}
                      className="flex-1 py-3.5 bg-green-600 text-white border-2 border-black text-sm font-black uppercase tracking-widest shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                    >
                      {saving ? "Menyimpan…" : "Simpan"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-3.5 bg-white text-black border-2 border-black text-sm font-black uppercase tracking-widest"
                    >
                      Batal
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
