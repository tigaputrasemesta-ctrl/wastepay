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
          <h1 className="font-display text-2xl text-bone">Titik Transit / Lapak</h1>
          <p className="text-sm text-bone-dim mt-1">
            Tempat dump truck standby — sampah dari pickup dikumpulkan di sini sebelum dibuang ke TPA
          </p>
        </div>
        <button onClick={() => openForm()} className="chamfer-sm bg-amber text-asphalt-deep px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber/80 transition">+ Lapak</button>
      </div>

      <div className="panel p-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / alamat lapak…"
          className="input text-sm !w-72"
        />
      </div>

      {loading ? (
        <div className="panel p-8 text-center text-bone-faint font-mono">MEMUAT…</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tersaring.map((t) => (
            <div key={t.id} className="panel p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-full bg-amber/10 flex items-center justify-center text-amber text-lg shrink-0">▲</span>
                  <div>
                    <p className="font-medium text-bone">{t.nama}</p>
                    {t.alamat && <p className="text-xs text-bone-dim">{t.alamat}</p>}
                  </div>
                </div>
                <button
                  onClick={() => toggleAktif(t)}
                  className={`text-[10px] font-mono px-2 py-1 rounded shrink-0 ${t.aktif ? "bg-vest/10 text-emerald-800" : "bg-asphalt-raised text-bone-faint"}`}
                >
                  {t.aktif ? "AKTIF" : "NONAKTIF"}
                </button>
              </div>
              <div className="font-mono text-[10px] text-bone-faint bg-asphalt-raised rounded px-2 py-1.5">
                {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
              </div>
              {t.catatan && <p className="text-[11px] text-bone-dim">{t.catatan}</p>}
              <div className="mt-auto flex gap-2 pt-1">
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${t.latitude},${t.longitude}`, "_blank")}
                  className="flex-1 px-3 py-1.5 border border-asphalt-line rounded-lg text-[11px] text-bone-dim hover:text-vest transition"
                >
                  Buka Peta
                </button>
                <button onClick={() => openForm(t)} className="flex-1 px-3 py-1.5 border border-asphalt-line rounded-lg text-[11px] text-bone-dim hover:text-vest transition">Edit</button>
                <button onClick={() => hapus(t)} className="px-3 py-1.5 border border-asphalt-line rounded-lg text-[11px] text-bone-dim hover:text-danger transition">Hapus</button>
              </div>
            </div>
          ))}
          {tersaring.length === 0 && (
            <div className="panel col-span-full p-8 text-center text-bone-faint font-mono">
              Belum ada lapak — tambahkan tempat dump truck standby
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {show && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">{edit ? "Edit Lapak" : "Tambah Lapak"}</h2>
              <button onClick={() => setShow(false)} className="text-bone-faint hover:text-bone-dim">✕</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Nama Lapak *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="input text-sm" placeholder="Lapak Beji Timur" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Alamat / Patokan</label>
                <input type="text" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="input text-sm" />
              </div>
              <CoordinatePicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })} />
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Catatan (jam operasional, dll)</label>
                <input type="text" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className="input text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShow(false)} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm bg-amber text-asphalt-deep rounded-lg text-sm font-medium hover:bg-amber/80">{edit ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
