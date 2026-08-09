"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Wilayah = { id: number; nama: string };
type Petugas = {
  id: number;
  nama: string;
  noTelepon: string;
  email?: string;
  foto?: string;
  jabatan?: string | null;
  aktif: boolean;
  wilayah: Wilayah;
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
    <span key={j} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mr-1 ${warna[j] ?? "bg-asphalt-raised text-bone-dim"}`}>
      {JABATAN_OPTIONS.find((o) => o.value === j)?.label ?? j}
    </span>
  ));
}

export default function PetugasPage() {
  const { showToast } = useToast();
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
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
    wilayahId: "",
    jabatan: [] as string[],
    userId: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [petugasRes, wilayahRes] = await Promise.all([
        fetch("/api/petugas?includeUser=1"),
        fetch("/api/wilayah"),
      ]);
      const data = await petugasRes.json();
      setPetugas(Array.isArray(data) ? data : data.petugas ?? []);
      setAkunTersedia(Array.isArray(data) ? [] : data.akunTersedia ?? []);
      setWilayahList(await wilayahRes.json());
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
    setForm({ nama: "", noTelepon: "", email: "", wilayahId: "", jabatan: [], userId: "" });
    setShowForm(true);
  }

  function openEdit(p: Petugas) {
    setEditing(p);
    setForm({
      nama: p.nama,
      noTelepon: p.noTelepon,
      email: p.email || "",
      wilayahId: p.wilayah.id.toString(),
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
          <h1 className="font-display text-2xl text-bone">Petugas</h1>
          <p className="text-sm text-bone-dim mt-1">Kelola petugas pengangkut sampah</p>
        </div>
        <button
          onClick={openCreate}
          className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Petugas
        </button>
      </div>

      {/* Desktop Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">No. Telepon</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Wilayah</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Jabatan</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Status</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Rute</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Angkut</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : petugas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-bone-faint">Belum ada petugas</td></tr>
              ) : (
                petugas.map((p) => (
                  <tr key={p.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-vest/10 flex items-center justify-center text-vest font-semibold text-xs">
                          {p.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-bone">{p.nama}</p>
                          {p.email && <p className="text-xs text-bone-faint">{p.email}</p>}
                          {p.user && (
                            <p className="text-[10px] text-vest font-mono">
                              ◉ login: {p.user.nama}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-bone-dim">{p.noTelepon}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-vest/10 text-blue-800">
                        {p.wilayah.nama}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {badgeJabatan(p.jabatan) ?? <span className="text-xs text-bone-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAktif(p)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition ${
                          p.aktif
                            ? "bg-vest/10 text-emerald-800 hover:bg-emerald-200"
                            : "bg-asphalt-raised text-bone hover:bg-asphalt-raised"
                        }`}
                      >
                        {p.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-bone-dim text-xs">{p._count.rute}</td>
                    <td className="px-4 py-3 text-center text-bone-dim text-xs">{p._count.pengangkutan}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-bone-dim hover:bg-indigo-50 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-danger hover:bg-danger/5 rounded-lg transition"
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
          <div key={p.id} className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-vest/10 flex items-center justify-center text-vest font-semibold text-xs">
                  {p.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-bone">{p.nama}</p>
                  <p className="text-xs text-bone-dim">{p.noTelepon}</p>
                </div>
              </div>
              <button
                onClick={() => toggleAktif(p)}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.aktif ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" : "bg-asphalt-raised text-bone-dim border border-asphalt-line"
                }`}
              >
                {p.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-bone-dim">
              <span className="bg-vest/10 text-vest px-2 py-0.5 rounded">{p.wilayah.nama}</span>
              <span>{p._count.rute} rute</span>
              <span>{p._count.pengangkutan} angkut</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(p)} className="flex-1 text-center text-sm bg-asphalt-raised border border-asphalt-line text-bone hover:border-vest hover:text-vest py-2 rounded-lg transition">Edit</button>
              <button onClick={() => setDeleteTarget(p)} className="flex-1 text-center text-sm bg-danger/10 border border-danger/30 text-red-400 py-2 rounded-lg hover:bg-danger/20 transition">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">{editing ? "Edit Petugas" : "Tambah Petugas"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Nama *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">No. Telepon *</label>
                <input type="text" value={form.noTelepon} onChange={(e) => setForm({ ...form, noTelepon: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Wilayah *</label>
                <select value={form.wilayahId} onChange={(e) => setForm({ ...form, wilayahId: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm" required>
                  <option value="">Pilih Wilayah</option>
                  {wilayahList.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-2">Jabatan <span className="text-xs text-bone-faint font-normal">(bisa lebih dari satu)</span></label>
                <div className="space-y-2">
                  {JABATAN_OPTIONS.map((j) => {
                    const on = form.jabatan.includes(j.value);
                    return (
                      <label key={j.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${on ? "border-vest/50 bg-vest/5" : "border-asphalt-line hover:bg-asphalt-raised"}`}>
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
                          className="mt-0.5 accent-[#c8f04d]"
                        />
                        <span>
                          <span className="block text-sm font-medium text-bone">{j.label}</span>
                          <span className="block text-xs text-bone-dim mt-0.5">{j.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Akun Login</label>
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm">
                  <option value="">{editing ? "— Tanpa akun login —" : "— Tanpa akun login —"}</option>
                  {editing?.user && (
                    <option value={editing.user.id}>{editing.user.nama} ({editing.user.email})</option>
                  )}
                  {akunTersedia.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama} ({a.email})</option>
                  ))}
                </select>
                <p className="text-[11px] text-bone-faint mt-1">
                  Hubungkan dengan akun login petugas agar data lapangannya tersambung (peta realtime, pickup, dll).
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm hover:bg-vest-bright">{editing ? "Simpan" : "Tambah"}</button>
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
