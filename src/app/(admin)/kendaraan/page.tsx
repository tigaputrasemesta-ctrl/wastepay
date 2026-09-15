"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";

type PetugasOpt = { id: number; nama: string };
type Kendaraan = {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
  kapasitas: number | null;
  aktif: boolean;
  petugas?: PetugasOpt | null;
  _count?: { pengangkutan: number };
};

const JENIS = [
  { value: "dump_truck", label: "Dump Truck", ikon: "🚛" },
  { value: "pickup", label: "Mobil Pickup", ikon: "🛺" },
  { value: "gerobak", label: "Gerobak", ikon: "🛞" },
];

export default function KendaraanPage() {
  const { showToast } = useToast();
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [petugasList, setPetugasList] = useState<PetugasOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterJenis, setFilterJenis] = useState("");

  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Kendaraan | null>(null);
  const [form, setForm] = useState({ nama: "", platNomor: "", jenis: "dump_truck", kapasitas: "", petugasId: "" });

  const fetchData = useCallback(async () => {
    try {
      const [kRes, pRes] = await Promise.all([fetch("/api/kendaraan"), fetch("/api/petugas")]);
      setKendaraan(await kRes.json());
      const ps = await pRes.json();
      setPetugasList((Array.isArray(ps) ? ps : ps.petugas ?? []).map((p: { id: number; nama: string }) => ({ id: p.id, nama: p.nama })));
    } catch {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openForm(k?: Kendaraan) {
    setEdit(k ?? null);
    setForm({
      nama: k?.nama ?? "",
      platNomor: k?.platNomor ?? "",
      jenis: k?.jenis ?? "dump_truck",
      kapasitas: k?.kapasitas?.toString() ?? "",
      petugasId: k?.petugas?.id?.toString() ?? "",
    });
    setShow(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(edit ? `/api/kendaraan/${edit.id}` : "/api/kendaraan", {
      method: edit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      showToast(edit ? "Kendaraan diperbarui" : "Kendaraan ditambahkan");
      setShow(false);
      fetchData();
    } else {
      const d = await res.json();
      showToast(d.error || "Gagal menyimpan", "error");
    }
  }

  async function toggleAktif(k: Kendaraan) {
    await fetch(`/api/kendaraan/${k.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !k.aktif }),
    });
    fetchData();
  }

  async function hapus(k: Kendaraan) {
    if (!confirm(`Hapus ${k.nama}? (nonaktif permanen)`)) return;
    const res = await fetch(`/api/kendaraan/${k.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Kendaraan dihapus");
      fetchData();
    }
  }

  const tersaring = kendaraan.filter(
    (k) =>
      (!filterJenis || k.jenis === filterJenis) &&
      (!q || (k.nama + (k.platNomor ?? "")).toLowerCase().includes(q.toLowerCase()))
  );

  const totalDump = kendaraan.filter((k) => k.jenis === "dump_truck" && k.aktif).length;
  const totalPickup = kendaraan.filter((k) => k.jenis === "pickup" && k.aktif).length;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Daftar Kendaraan</h1>
          <p className="text-sm text-slate-500 font-medium">
            Dump truck standby di lapak → pickup angkut dari rumah → setor ke lapak → truk buang ke TPA
          </p>
        </div>
        <button onClick={() => openForm()} className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all">+ Kendaraan</button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">{kendaraan.filter((k) => k.aktif).length}</p>
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-1">KENDARAAN AKTIF</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-2xl font-extrabold tracking-tight text-amber-700">{totalDump}</p>
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mt-1">DUMP TRUCK</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-2xl font-extrabold tracking-tight text-emerald-700">{totalPickup}</p>
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">PICKUP</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">
            {kendaraan.reduce((s, k) => s + (k._count?.pengangkutan ?? 0), 0)}
          </p>
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-1">TOTAL ANGKUT</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-5 flex flex-wrap items-center gap-3 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / plat…"
          className="input text-sm !w-56"
        />
        <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} className="input text-sm !w-48">
          <option value="">Semua jenis</option>
          {JENIS.map((j) => (
            <option key={j.value} value={j.value}>{j.ikon} {j.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs font-semibold text-slate-500">{tersaring.length} KENDARAAN</span>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-600 font-medium">MEMUAT…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-200/80 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">KENDARAAN</th>
                <th className="text-left px-4 py-3">JENIS</th>
                <th className="text-left px-4 py-3">KAPASITAS</th>
                <th className="text-left px-4 py-3">PENGEMUDI</th>
                <th className="text-left px-4 py-3">ANGSURAN ANGKUT</th>
                <th className="text-left px-4 py-3">STATUS</th>
                <th className="text-right px-4 py-3">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {tersaring.map((k) => {
                const j = JENIS.find((x) => x.value === k.jenis) ?? JENIS[0];
                return (
                  <tr key={k.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center text-lg shrink-0">{j.ikon}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{k.nama}</p>
                          <p className="font-mono text-xs text-slate-500">{k.platNomor ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{j.label}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{k.kapasitas ? `${k.kapasitas} kg` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{k.petugas?.nama ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{k._count?.pengangkutan ?? 0}×</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAktif(k)}
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all ${k.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                      >
                        {k.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openForm(k)} className="text-xs font-semibold text-slate-600 hover:text-emerald-800 mr-3 transition-colors">Edit</button>
                      <button onClick={() => hapus(k)} className="text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors">Hapus</button>
                    </td>
                  </tr>
                );
              })}
              {tersaring.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-600 font-medium text-xs">Tidak ada kendaraan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">{edit ? "Edit Kendaraan" : "Tambah Kendaraan Baru"}</h2>
                <p className="text-xs text-slate-500">Kelola informasi armada pengangkut</p>
              </div>
              <button onClick={() => setShow(false)} className="text-slate-600 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Kendaraan *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="input text-sm" placeholder="Dump Truck 01" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Plat Nomor</label>
                  <input type="text" value={form.platNomor} onChange={(e) => setForm({ ...form, platNomor: e.target.value })} className="input text-sm" placeholder="B 1234 XYZ" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kapasitas (kg)</label>
                  <input type="number" value={form.kapasitas} onChange={(e) => setForm({ ...form, kapasitas: e.target.value })} className="input text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis *</label>
                <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className="input text-sm">
                  {JENIS.map((j) => <option key={j.value} value={j.value}>{j.ikon} {j.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pengemudi</label>
                <select value={form.petugasId} onChange={(e) => setForm({ ...form, petugasId: e.target.value })} className="input text-sm">
                  <option value="">— Belum ada —</option>
                  {petugasList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShow(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold hover:bg-slate-50 transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all">{edit ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
