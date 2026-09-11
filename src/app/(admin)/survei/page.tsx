"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import GeotagPhoto from "@/components/GeotagPhoto";
import { formatDate } from "@/lib/utils";

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
  koordinatSumber: string | null;
  koordinatAkurasi: number | null;
  penanggungjawab: string | null;
  referal: string | null;
  catatan: string | null;
  createdAt: string;
  wilayah: { id: number; nama: string } | null;
};

type FormSurvei = {
  alamat: string;
  rt: string;
  rw: string;
  patokanLokasi: string;
  penanggungjawab: string;
  referal: string;
  catatan: string;
  fotoRumah: string;
  latitude: string;
  longitude: string;
  koordinatSumber: string;
  koordinatAkurasi: string;
};

export default function SurveiPage() {
  const { showToast } = useToast();
  const [calon, setCalon] = useState<Calon[]>([]);
  const [loading, setLoading] = useState(true);
  const [survei, setSurvei] = useState<Calon | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormSurvei>({
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
    try {
      const res = await fetch("/api/pelanggan?status=calon");
      setCalon(await res.json());
    } catch {
      showToast("Gagal memuat daftar calon", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => { await fetchCalon(); })();
  }, [fetchCalon]);

  function bukaSurvei(c: Calon) {
    const [rt = "", rw = ""] = (c.rtRw || "").split("/").map((s) => s.trim().replace(/^RT\s*|^RW\s*/i, ""));
    setSurvei(c);
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
      koordinatSumber: c.koordinatSumber || "",
      koordinatAkurasi: c.koordinatAkurasi?.toString() || "",
    });
  }

  async function simpan() {
    if (!survei) return;
    setSaving(true);
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
      const res = await fetch(`/api/pelanggan/${survei.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(`${survei.nama} diaktifkan — foto & titik tersimpan`);
        setSurvei(null);
        fetchCalon();
      } else {
        const d = await res.json();
        showToast(d.error || "Gagal menyimpan", "error");
      }
    } catch {
      showToast("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Survei Pelanggan</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">
            Calon pelanggan menunggu survei — isi foto rumah & geo tag, lalu aktifkan
          </p>
        </div>
        <span className="stencil text-green-600 text-xs">{calon.length} CALON</span>
      </div>

      {loading ? (
        <div className="hm-card bg-white p-0 overflow-hidden p-8 text-center text-gray-400 font-bold font-mono">MEMUAT…</div>
      ) : calon.length === 0 ? (
        <div className="hm-card bg-white p-0 overflow-hidden p-10 text-center">
          <p className="font-bold tracking-tight text-2xl text-green-600 tracking-wide">TIDAK ADA CALON</p>
          <p className="text-sm text-gray-600 font-bold mt-2">
            Semua pendaftar sudah disurvei. Calon baru muncul di sini setelah warga
            mengisi form pendaftaran online.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {calon.map((c) => (
            <div key={c.id} className="hm-card bg-white p-0 overflow-hidden p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-black font-black">
                  {c.nama}
                  <span className="ml-2 font-mono text-xs text-gray-400 font-bold">{c.kodePelanggan}</span>
                </p>
                <p className="text-xs text-gray-600 font-bold mt-0.5">
                  {c.noTelepon} · {c.wilayah?.nama || "belum ada wilayah"} · daftar{" "}
                  {formatDate(c.createdAt)}
                </p>
                <p className="text-xs text-gray-400 font-bold mt-0.5 truncate max-w-xl">{c.alamat}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.latitude && c.longitude ? (
                  <span className="text-[10px] font-mono text-green-600 bg-green-400/5 px-2 py-1 rounded-none">
                    ● GEO TAG
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber bg-amber/5 px-2 py-1 rounded-none">
                    ○ BELUM GEO TAG
                  </span>
                )}
                {c.fotoRumah ? (
                  <span className="text-[10px] font-mono text-green-600 bg-green-400/5 px-2 py-1 rounded-none">
                    ● FOTO ADA
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber bg-amber/5 px-2 py-1 rounded-none">
                    ○ FOTO BELUM
                  </span>
                )}
                <Link
                  href={`/survei/${c.id}`}
                  className="px-4 py-2 border border-slate-200/80 rounded-none text-sm font-bold hover:bg-gray-100 transition-all"
                >
                  Detail
                </Link>
                <button
                  onClick={() => bukaSurvei(c)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
                >
                  Survei & Aktifkan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal survei ── */}
      {survei && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-semibold text-black font-black">Survei: {survei.nama}</h2>
                <p className="font-mono text-[10px] text-gray-400 font-bold">{survei.kodePelanggan}</p>
              </div>
              <button onClick={() => setSurvei(null)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">No. WhatsApp</label>
                  <p className="text-sm text-black font-black">{survei.noTelepon}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Wilayah</label>
                  <p className="text-sm text-black font-black">{survei.wilayah?.nama || "—"}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">RT</label>
                  <input
                    type="text"
                    value={form.rt}
                    onChange={(e) => setForm({ ...form, rt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    placeholder="001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">RW</label>
                  <input
                    type="text"
                    value={form.rw}
                    onChange={(e) => setForm({ ...form, rw: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    placeholder="003"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Patokan Lokasi</label>
                <input
                  type="text"
                  value={form.patokanLokasi}
                  onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  placeholder="Depan masjid / dekat warung…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={form.penanggungjawab}
                    onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Referal</label>
                  <input
                    type="text"
                    value={form.referal}
                    onChange={(e) => setForm({ ...form, referal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Catatan Survei</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none focus:outline-none focus:ring-2 focus:ring-black text-sm min-h-[64px]"
                  placeholder="Kondisi rumah, jadwal angkut yang cocok, dll"
                />
              </div>

              {/* Foto rumah + geo tag */}
              <div className="border-t border border-slate-200/80 pt-4">
                <p className="stencil text-green-600 mb-3">FOTO RUMAH & GEO TAG</p>
                <GeotagPhoto
                  foto={form.fotoRumah}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  koordinatSumber={form.koordinatSumber}
                  koordinatAkurasi={form.koordinatAkurasi}
                  onFotoChange={(foto) => setForm({ ...form, fotoRumah: foto })}
                  onKoordinatChange={(lat, lng, sumber, akurasi) =>
                    setForm({ ...form, latitude: lat, longitude: lng, koordinatSumber: sumber, koordinatAkurasi: akurasi })
                  }
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSurvei(null)}
                  className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition"
                >
                  Batal
                </button>
                <button
                  onClick={simpan}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan & Aktifkan Pelanggan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
