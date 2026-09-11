"use client";

import { useCallback, useEffect, useState } from "react";
import CameraGps from "@/components/mobile/CameraGps";


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
    <div className="space-y-5 pb-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Verifikasi Lapangan & Titik Rumah
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Survei Calon Pelanggan</h1>
        <p className="text-xs font-medium text-slate-500">{calon.length} calon warga menunggu survei lokasi</p>
      </div>

      {pesan && (
        <p className={`text-center text-xs font-semibold p-3.5 rounded-2xl border ${pesan.includes("✓") ? "border-emerald-200 text-emerald-800 bg-emerald-50" : "border-rose-200 text-rose-800 bg-rose-50"}`}>
          {pesan}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : calon.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <span className="text-3xl block mb-2">🏡</span>
          <p className="text-sm font-bold text-slate-700">Semua Calon Sudah Disurvei</p>
          <p className="text-xs text-slate-400 mt-1">Tidak ada antrean calon pelanggan baru saat ini.</p>
        </div>
      ) : (
        calon.map((c) => {
          const isEditing = editingId === c.id;
          const punyaFoto = Boolean(c.fotoRumah);
          const punyaGeo = Boolean(c.latitude && c.longitude);
          return (
            <div key={c.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {c.kodePelanggan}
                    </span>
                    <span className="text-xs text-slate-400">· {c.kelurahan?.nama || "Dinas Pusat"}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight leading-snug">
                    {c.nama}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{c.noTelepon}</p>
                  <p className="text-xs text-slate-600 mt-1">{c.alamat}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0 text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${punyaFoto ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                    {punyaFoto ? "✓ Foto Ada" : "○ Belum Foto"}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${punyaGeo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                    {punyaGeo ? "✓ GPS Ada" : "○ Belum GPS"}
                  </span>
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => bukaForm(c)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  📍 Mulai Survei & Aktifkan Warga
                </button>
              ) : (
                <div className="pt-4 border-t border-slate-100 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Alamat Lengkap *</label>
                    <textarea
                      value={form.alamat}
                      onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RT</label>
                      <input value={form.rt} onChange={(e) => setForm({ ...form, rt: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RW</label>
                      <input value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Patokan Lokasi</label>
                    <input
                      value={form.patokanLokasi}
                      onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                      placeholder="Contoh: samping warung bu Siti, pagar hitam"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Penanggung Jawab</label>
                      <input value={form.penanggungjawab} onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Referal</label>
                      <input value={form.referal} onChange={(e) => setForm({ ...form, referal: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Catatan Tambahan</label>
                    <input value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500" />
                  </div>

                  <CameraGps
                    label="Foto Depan Rumah + Geotag"
                    hint="Foto otomatis dikompresi agar hemat kuota internet"
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

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={simpan}
                      disabled={saving}
                      className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                    >
                      {saving ? "Menyimpan Data…" : "✓ Aktifkan Pelanggan"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
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

