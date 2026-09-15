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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Survei Pelanggan</h1>
          <p className="text-sm text-slate-500 font-medium">
            Calon pelanggan menunggu survei — lengkapi foto rumah & geo tag, lalu aktifkan layanan
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {calon.length} Calon
        </span>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 font-medium shadow-sm">
          Memuat data calon pelanggan…
        </div>
      ) : calon.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-sm">
          <p className="font-bold text-xl text-slate-900">Semua Calon Sudah Disurvei</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Calon pelanggan baru akan otomatis muncul di sini setelah warga melakukan registrasi pendaftaran online.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {calon.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {c.nama}
                  <span className="ml-2 font-mono text-xs text-slate-400">{c.kodePelanggan}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {c.noTelepon} • {c.wilayah?.nama || "belum ada wilayah"} • daftar{" "}
                  {formatDate(c.createdAt)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">{c.alamat}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.latitude && c.longitude ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● Geotag
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ○ Belum Geotag
                  </span>
                )}
                {c.fotoRumah ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● Ada Foto
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ○ Belum Foto
                  </span>
                )}
                <Link
                  href={`/survei/${c.id}`}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Detail
                </Link>
                <button
                  onClick={() => bukaSurvei(c)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
              <div>
                <h2 className="font-semibold text-slate-900 text-base">Survei: {survei.nama}</h2>
                <p className="font-mono text-xs text-slate-400">{survei.kodePelanggan}</p>
              </div>
              <button onClick={() => setSurvei(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">No. WhatsApp</label>
                  <p className="text-sm font-semibold text-slate-900">{survei.noTelepon}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Wilayah</label>
                  <p className="text-sm font-semibold text-slate-900">{survei.wilayah?.nama || "—"}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat Lengkap</label>
                <input
                  type="text"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">RT</label>
                  <input
                    type="text"
                    value={form.rt}
                    onChange={(e) => setForm({ ...form, rt: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    placeholder="001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">RW</label>
                  <input
                    type="text"
                    value={form.rw}
                    onChange={(e) => setForm({ ...form, rw: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    placeholder="003"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Patokan Lokasi</label>
                <input
                  type="text"
                  value={form.patokanLokasi}
                  onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  placeholder="Depan masjid / dekat warung…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={form.penanggungjawab}
                    onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Referal</label>
                  <input
                    type="text"
                    value={form.referal}
                    onChange={(e) => setForm({ ...form, referal: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan Survei</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm min-h-[72px]"
                  placeholder="Kondisi rumah, jadwal angkut yang cocok, dll"
                />
              </div>

              {/* Foto rumah + geo tag */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Foto Rumah & Geo Tag</p>
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
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={simpan}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all disabled:opacity-60"
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
