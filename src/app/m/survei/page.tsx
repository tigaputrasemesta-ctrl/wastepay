"use client";

import { useCallback, useEffect, useState } from "react";
import CameraGps from "@/components/mobile/CameraGps";

export const dynamic = "force-dynamic";

type Calon = {
  id: number;
  nama: string;
  kodePelanggan: string;
  noTelepon: string;
  alamat: string;
  rtRw: string | null;
  patokanLokasi: string | null;
  fotoRumah: string | null;
  latitude: number | null;
  longitude: number | null;
  penanggungjawab: string | null;
  referal: string | null;
  catatan: string | null;
  kelurahan: { id: number; nama: string } | null;
};

export default function MobileSurvei() {
  const [calon, setCalon] = useState<Calon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState("");

  const [form, setForm] = useState({
    alamat: "",
    rt: "",
    rw: "",
    patokanLokasi: "",
    penanggungjawab: "",
    referal: "",
    catatan: "",
    fotoRumah: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
  });

  const fetchCalon = useCallback(async () => {
    const res = await fetch("/api/pelanggan?status=calon");
    if (res.ok) setCalon(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    // fetch on mount: setState terjadi setelah await (async), bukan sinkron di body effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCalon();
  }, [fetchCalon]);

  function bukaForm(c: Calon) {
    const [rt = "", rw = ""] = (c.rtRw || "").split("/").map((s) => s.trim().replace(/^RT\s*|^RW\s*/i, ""));
    setEditingId(c.id);
    setPesan("");
    setForm({
      alamat: c.alamat || "",
      rt,
      rw,
      patokanLokasi: c.patokanLokasi || "",
      penanggungjawab: c.penanggungjawab || "",
      referal: c.referal || "",
      catatan: c.catatan || "",
      fotoRumah: c.fotoRumah || "",
      latitude: c.latitude?.toString() || "",
      longitude: c.longitude?.toString() || "",
      koordinatSumber: "",
      koordinatAkurasi: "",
    });
  }

  async function simpan() {
    if (editingId == null) return;
    setSaving(true);
    setPesan("");
    const body = {
      alamat: form.alamat,
      rtRw: [form.rt.trim(), form.rw.trim()].filter(Boolean).join(" / ") || null,
      patokanLokasi: form.patokanLokasi || null,
      penanggungjawab: form.penanggungjawab || null,
      referal: form.referal || null,
      catatan: form.catatan || null,
      fotoRumah: form.fotoRumah || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      koordinatSumber: form.koordinatSumber || null,
      koordinatAkurasi: form.koordinatAkurasi || null,
      status: "aktif",
    };
    try {
      const res = await fetch(`/api/pelanggan/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setPesan("Pelanggan diaktifkan — foto & titik tersimpan ✓");
        setEditingId(null);
        fetchCalon();
      } else {
        setPesan(d.error || "Gagal menyimpan");
      }
    } catch {
      setPesan("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Survei Calon</h1>
        <p className="text-xs font-bold text-gray-500">{calon.length} calon menunggu survei</p>
      </div>

      {pesan && (
        <p className={`text-center text-sm font-black p-3 border-2 ${pesan.includes("✓") ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}`}>
          {pesan}
        </p>
      )}

      {loading ? (
        <p className="font-mono font-bold text-gray-500 text-center py-10">MEMUAT…</p>
      ) : calon.length === 0 ? (
        <div className="border-2 border-black bg-white p-8 text-center">
          <p className="text-lg font-black uppercase tracking-tight">Tidak ada calon</p>
          <p className="text-xs font-bold text-gray-500 mt-1">Semua pendaftar sudah disurvei.</p>
        </div>
      ) : (
        calon.map((c) => {
          const isEditing = editingId === c.id;
          const punyaFoto = Boolean(c.fotoRumah);
          const punyaGeo = Boolean(c.latitude && c.longitude);
          return (
            <div key={c.id} className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black uppercase tracking-tight leading-tight">
                    {c.nama}
                    <span className="ml-2 font-mono text-[10px] text-gray-400">{c.kodePelanggan}</span>
                  </p>
                  <p className="text-[11px] font-bold text-gray-600 mt-0.5">{c.noTelepon} · {c.kelurahan?.nama || "belum ada kelurahan"}</p>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">{c.alamat}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0 text-right">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 ${punyaFoto ? "text-green-700" : "text-amber-600"}`}>
                    {punyaFoto ? "● FOTO" : "○ FOTO"}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 ${punyaGeo ? "text-green-700" : "text-amber-600"}`}>
                    {punyaGeo ? "● GEO" : "○ GEO"}
                  </span>
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => bukaForm(c)}
                  className="w-full py-3.5 bg-amber-400 text-black border-2 border-black text-sm font-black uppercase tracking-widest shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Survei & Aktifkan
                </button>
              ) : (
                <div className="border-t-2 border-black pt-3 space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Alamat Lengkap *</label>
                    <textarea
                      value={form.alamat}
                      onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                      rows={2}
                      className="w-full px-2 py-2 border-2 border-black text-sm font-bold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">RT</label>
                      <input value={form.rt} onChange={(e) => setForm({ ...form, rt: e.target.value })} className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">RW</label>
                      <input value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })} className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Patokan Lokasi</label>
                    <input
                      value={form.patokanLokasi}
                      onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                      placeholder="depan masjid, cat hijau, dll"
                      className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Penanggung Jawab</label>
                      <input value={form.penanggungjawab} onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })} className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Referal</label>
                      <input value={form.referal} onChange={(e) => setForm({ ...form, referal: e.target.value })} className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Catatan</label>
                    <input value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none" />
                  </div>

                  <CameraGps
                    label="Foto Depan Rumah + Geotag"
                    hint="Foto otomatis dikecilkan agar hemat penyimpanan"
                    foto={form.fotoRumah}
                    latitude={form.latitude}
                    longitude={form.longitude}
                    koordinatSumber={form.koordinatSumber}
                    koordinatAkurasi={form.koordinatAkurasi}
                    onFotoChange={(fotoRumah) => setForm({ ...form, fotoRumah })}
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
                      {saving ? "Menyimpan…" : "Aktifkan Pelanggan"}
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
