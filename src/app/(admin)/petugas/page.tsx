"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Wilayah = { id: number; nama: string };
type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Petugas = {
  id: number;
  nama: string;
  noTelepon: string;
  email?: string;
  foto?: string;
  jabatan?: string | null;
  aktif: boolean;
  wilayah?: Wilayah | null;
  kelurahan?: Kelurahan | null;
  user?: { id: number; nama: string; email: string } | null;
  _count: { rute: number; pengangkutan: number };
  createdAt: string;
};

const JABATAN_OPTIONS = [
  { value: "angkut", label: "Angkut", desc: "Pickup sampah + lokasi realtime" },
  { value: "tagih", label: "Tagih", desc: "Terima & verifikasi pembayaran" },
  { value: "survei", label: "Survei", desc: "Registrasi warga + foto & geo tag" },
];

function badgeJabatan(jabatan?: string | null) {
  if (!jabatan) return null;
  const warna: Record<string, string> = {
    angkut: "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30",
    tagih: "bg-amber-400/10 text-amber-400 border border-amber-500/30",
    survei: "bg-purple-400/10 text-purple-300 border border-purple-500/30",
  };
  return jabatan.split(",").filter(Boolean).map((j) => (
    <span key={j} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mr-1 ${warna[j] ?? "bg-slate-100 border border-slate-200 text-slate-600 font-medium"}`}>
      {JABATAN_OPTIONS.find((o) => o.value === j)?.label ?? j}
    </span>
  ));
}

export default function PetugasPage() {
  const { showToast } = useToast();
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<{ id: number; nama: string; kelurahanId: number }[]>([]);
  const [akunTersedia, setAkunTersedia] = useState<{ id: number; nama: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Petugas | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Petugas | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    noTelepon: "",
    email: "",
    kelurahanId: "",
    zonaIds: [] as string[],
    jabatan: [] as string[],
    userId: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [petugasRes, kelurahanRes, zonaRes] = await Promise.all([
        fetch("/api/petugas?includeUser=1"),
        fetch("/api/kelurahan"),
        fetch("/api/zona"),
      ]);
      const data = await petugasRes.json();
      setPetugas(Array.isArray(data) ? data : data.petugas ?? []);
      setAkunTersedia(Array.isArray(data) ? [] : data.akunTersedia ?? []);
      setKelurahanList(await kelurahanRes.json());
      setZonaList(await zonaRes.json());
    } catch {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ nama: "", noTelepon: "", email: "", kelurahanId: "", zonaIds: [], jabatan: [], userId: "" });
    setShowForm(true);
  }

  function openEdit(p: Petugas & { zona?: { zonaId: number }[] }) {
    setEditing(p);
    setForm({
      nama: p.nama,
      noTelepon: p.noTelepon,
      email: p.email || "",
      kelurahanId: p.kelurahan?.id ? p.kelurahan.id.toString() : "",
      zonaIds: p.zona?.map(z => z.zonaId.toString()) || [],
      jabatan: (p.jabatan || "").split(",").filter(Boolean),
      userId: p.user?.id ? p.user.id.toString() : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/petugas/${editing.id}` : "/api/petugas";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      showToast(editing ? "Petugas berhasil diperbarui" : "Petugas berhasil ditambahkan");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/petugas/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Petugas berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } else {
      showToast("Gagal menghapus petugas", "error");
    }
  }

  async function toggleAktif(p: Petugas) {
    const res = await fetch(`/api/petugas/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !p.aktif }),
    });
    if (res.ok) {
      showToast(p.aktif ? "Petugas dinonaktifkan" : "Petugas diaktifkan");
      fetchData();
    } else {
      showToast("Gagal mengubah status", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Petugas</h1>
          <p className="text-sm text-slate-500 font-medium">Kelola petugas pengangkut sampah</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Petugas
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">No. Telepon</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kelurahan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Jabatan</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Rute</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Angkut</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600">Memuat...</td></tr>
              ) : petugas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600">Belum ada petugas</td></tr>
              ) : (
                petugas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-semibold text-xs">
                          {p.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{p.nama}</p>
                          {p.email && <p className="text-xs text-slate-600">{p.email}</p>}
                          {p.user && (
                            <p className="text-[10px] text-emerald-700 font-medium">
                              ◉ login: {p.user.nama}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.noTelepon}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {p.kelurahan?.nama ?? "—"}
                      </span>
                      {p.kelurahan?.kecamatan && (
                        <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                          ✓ {p.kelurahan.kecamatan}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {badgeJabatan(p.jabatan) ?? <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAktif(p)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition ${
                          p.aktif
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 text-xs font-medium">{p._count.rute}</td>
                    <td className="px-4 py-3 text-center text-slate-600 text-xs font-medium">{p._count.pengangkutan}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 mt-4">
        {petugas.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-semibold text-xs">
                  {p.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{p.nama}</p>
                  <p className="text-xs text-slate-500">{p.noTelepon}</p>
                </div>
              </div>
              <button
                onClick={() => toggleAktif(p)}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  p.aktif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600"
                }`}
              >
                {p.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-2">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">{p.kelurahan?.nama ?? "—"}</span>
              <span>•</span>
              <span>{p._count.rute} rute</span>
              <span>•</span>
              <span>{p._count.pengangkutan} angkut</span>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <button onClick={() => openEdit(p)} className="flex-1 text-center text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 py-2 rounded-xl transition">Edit</button>
              <button onClick={() => setDeleteTarget(p)} className="flex-1 text-center text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-600 py-2 rounded-xl hover:bg-rose-100 transition">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-base">{editing ? "Edit Petugas" : "Tambah Petugas"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 text-slate-600 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">No. Telepon *</label>
                <input type="text" value={form.noTelepon} onChange={(e) => setForm({ ...form, noTelepon: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelurahan *</label>
                <select value={form.kelurahanId} onChange={(e) => setForm({ ...form, kelurahanId: e.target.value, zonaIds: [] })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white" required>
                  <option value="">Pilih Kelurahan</option>
                  {kelurahanList.map((k) => <option key={k.id} value={k.id}>{k.nama}{k.kecamatan ? ` · ${k.kecamatan}` : ""}</option>)}
                </select>
                <p className="text-[11px] text-slate-600 mt-1">
                  Area tugas &amp; batas persetujuan petugas — seluruh wilayah/RT di kelurahan ini.
                </p>
              </div>
              {form.kelurahanId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Zona Angkut <span className="text-xs text-slate-600 font-normal">(opsional)</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {zonaList.filter((z) => z.kelurahanId.toString() === form.kelurahanId).map((z) => {
                      const idStr = z.id.toString();
                      const checked = form.zonaIds.includes(idStr);
                      return (
                        <label
                          key={z.id}
                          className={`flex items-center justify-center px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer transition ${
                            checked
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={() => {
                              const newZonaIds = checked 
                                ? form.zonaIds.filter((id) => id !== idStr) 
                                : [...form.zonaIds, idStr];
                              setForm({ ...form, zonaIds: newZonaIds });
                            }}
                          />
                          {z.nama}
                        </label>
                      );
                    })}
                  </div>
                  {zonaList.filter((z) => z.kelurahanId.toString() === form.kelurahanId).length === 0 && (
                    <p className="text-xs text-slate-600 italic">Kelurahan ini belum memiliki zona angkut.</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Jabatan <span className="text-xs text-slate-600 font-normal">(bisa lebih dari satu)</span></label>
                <div className="space-y-2">
                  {JABATAN_OPTIONS.map((j) => {
                    const on = form.jabatan.includes(j.value);
                    return (
                      <label key={j.value} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${on ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 hover:bg-slate-50/60"}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              jabatan: e.target.checked
                                ? [...form.jabatan, j.value]
                                : form.jabatan.filter((x) => x !== j.value),
                            })
                          }
                          className="mt-0.5 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{j.label}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">{j.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Akun Login</label>
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white">
                  <option value="">{editing ? "— Tanpa akun login —" : "— Tanpa akun login —"}</option>
                  {editing?.user && (
                    <option value={editing.user.id}>{editing.user.nama} ({editing.user.email})</option>
                  )}
                  {akunTersedia.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama} ({a.email})</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600 mt-1">
                  Hubungkan dengan akun login petugas agar data lapangannya tersambung (peta realtime, pickup, dll).
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all">{editing ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Petugas"
        message={`Yakin ingin menghapus ${deleteTarget?.nama}? Data tidak bisa dikembalikan.`}
        confirmText="Ya, Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
