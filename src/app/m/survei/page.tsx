"use client";

import { useCallback, useEffect, useState } from "react";
import CameraGps from "@/components/mobile/CameraGps";
import { useUser } from "@/hooks/useUser";
import { ClipboardList, CheckCircle2, AlertCircle, MapPin, Phone, UserCheck, ArrowLeft } from "lucide-react";

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
  const { user } = useUser();
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

  const activeCalon = calon.find((c) => c.id === editingId);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Survei Calon Warga</h1>
          <p className="text-[10px] text-slate-500">
            {editingId ? "Form verifikasi & geotagging" : `${calon.length} calon menunggu verifikasi`}
          </p>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Daftar</span>
          </button>
        )}
      </div>

      {pesan && (
        <div
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold p-2.5 rounded-xl border ${
            pesan.includes("✓")
              ? "border-emerald-200 text-emerald-800 bg-emerald-50"
              : "border-rose-200 text-rose-800 bg-rose-50"
          }`}
        >
          {pesan.includes("✓") ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{pesan}</span>
        </div>
      )}

      {/* Mode 1: Edit Form Survei */}
      {editingId && activeCalon ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {activeCalon.kodePelanggan}
              </span>
              <span className="text-[10px] text-slate-400">
                {activeCalon.kelurahan?.nama || "Pusat"}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">{activeCalon.nama}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{activeCalon.noTelepon}</span>
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Alamat Lengkap *
            </label>
            <textarea
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                RT
              </label>
              <input
                value={form.rt}
                onChange={(e) => setForm({ ...form, rt: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                RW
              </label>
              <input
                value={form.rw}
                onChange={(e) => setForm({ ...form, rw: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Patokan Lokasi
            </label>
            <input
              value={form.patokanLokasi}
              onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
              placeholder="Cth: Samping warung Madura, pagar hitam"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Penanggung Jawab
              </label>
              <input
                value={form.penanggungjawab}
                onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              />
            </div>
            {(user?.role === "superadmin" ||
              user?.role === "admin" ||
              !form.referal ||
              (user?.nama && form.referal.toLowerCase() === user.nama.toLowerCase())) && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Referal
                </label>
                <input
                  value={form.referal}
                  onChange={(e) => setForm({ ...form, referal: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Catatan Lapangan
            </label>
            <input
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Catatan tambahan lokasi / akses armada"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
            />
          </div>

          <CameraGps
            label="Foto Rumah & Geotag GPS"
            hint="Otomatis dikompresi hemat kuota"
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

          <div className="flex gap-2 pt-1">
            <button
              onClick={simpan}
              disabled={saving}
              className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>{saving ? "Menyimpan…" : "✓ Aktifkan Pelanggan"}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        /* Mode 2: Daftar Calon Pelanggan */
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : calon.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-2xs space-y-1">
              <span className="text-2xl block mb-1">🏡</span>
              <p className="text-xs font-bold text-slate-800">Semua Calon Sudah Disurvei</p>
              <p className="text-[10px] text-slate-400">
                Tidak ada antrean calon pelanggan baru saat ini.
              </p>
            </div>
          ) : (
            calon.map((c) => {
              const punyaFoto = Boolean(c.fotoRumah);
              const punyaGeo = Boolean(c.latitude && c.longitude);
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {c.kodePelanggan}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {c.kelurahan?.nama || "Depok"}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1 tracking-tight">
                        {c.nama}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.noTelepon}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{c.alamat}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0 text-right">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          punyaFoto
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {punyaFoto ? "✓ Foto" : "○ Foto"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          punyaGeo
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {punyaGeo ? "✓ GPS" : "○ GPS"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => bukaForm(c)}
                    className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Mulai Survei & Validasi</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
