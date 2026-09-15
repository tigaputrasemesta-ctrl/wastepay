"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import CoordinatePicker from "@/components/CoordinatePicker";

type Transit = {
  id: number;
  nama: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  aktif: boolean;
  catatan: string | null;
};

export default function TransitPage() {
  const { showToast } = useToast();
  const [transit, setTransit] = useState<Transit[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Transit | null>(null);
  const [form, setForm] = useState({ nama: "", alamat: "", latitude: "", longitude: "", catatan: "" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/transit");
      setTransit(await res.json());
    } catch {
      showToast("Gagal memuat lapak", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openForm(t?: Transit) {
    setEdit(t ?? null);
    setForm({
      nama: t?.nama ?? "",
      alamat: t?.alamat ?? "",
      latitude: t?.latitude?.toString() ?? "",
      longitude: t?.longitude?.toString() ?? "",
      catatan: t?.catatan ?? "",
    });
    setShow(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(edit ? `/api/transit/${edit.id}` : "/api/transit", {
      method: edit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      showToast(edit ? "Lapak diperbarui" : "Lapak ditambahkan");
      setShow(false);
      fetchData();
    } else {
      const d = await res.json();
      showToast(d.error || "Gagal menyimpan", "error");
    }
  }

  async function toggleAktif(t: Transit) {
    await fetch(`/api/transit/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !t.aktif }),
    });
    fetchData();
  }

  async function hapus(t: Transit) {
    if (!confirm(`Hapus lapak ${t.nama}?`)) return;
    const res = await fetch(`/api/transit/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Lapak dihapus");
      fetchData();
    }
  }

  const tersaring = transit.filter((t) => !q || (t.nama + (t.alamat ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Titik Transit / Lapak</h1>
          <p className="text-sm text-slate-500 font-medium">
            Tempat dump truck standby — sampah dari pickup dikumpulkan di sini sebelum dibuang ke TPA
          </p>
        </div>
        <button onClick={() => openForm()} className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Lapak
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 mb-4 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / alamat lapak…"
          className="w-full max-w-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 font-medium">MEMUAT…</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tersaring.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-3 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-base shrink-0 font-bold">▲</span>
                  <div>
                    <p className="font-semibold text-slate-900">{t.nama}</p>
                    {t.alamat && <p className="text-xs text-slate-500 mt-0.5">{t.alamat}</p>}
                  </div>
                </div>
                <button
                  onClick={() => toggleAktif(t)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-all ${t.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                >
                  {t.aktif ? "AKTIF" : "NONAKTIF"}
                </button>
              </div>
              <div className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
              </div>
              {t.catatan && <p className="text-xs text-slate-600">{t.catatan}</p>}
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${t.latitude},${t.longitude}`, "_blank")}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all text-center"
                >
                  Buka Peta
                </button>
                <button onClick={() => openForm(t)} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all text-center">Edit</button>
                <button onClick={() => hapus(t)} className="px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-semibold text-rose-700 transition-all">Hapus</button>
              </div>
            </div>
          ))}
          {tersaring.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 col-span-full p-8 text-center text-slate-400 font-medium">
              Belum ada lapak — tambahkan tempat dump truck standby
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h2 className="font-bold text-slate-900 text-base">{edit ? "Edit Lapak" : "Tambah Lapak"}</h2>
              <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">✕</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lapak *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="Lapak Beji Timur" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat / Patokan</label>
                <input type="text" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <CoordinatePicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })} />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan (jam operasional, dll)</label>
                <input type="text" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShow(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold hover:bg-slate-50 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm font-semibold">{edit ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
