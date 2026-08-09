"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { useToast } from "@/components/Toast";

type User = {
  id: number;
  email: string;
  nama: string;
  role: string;
  noTelepon?: string;
  aktif: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nama: "", role: "admin", noTelepon: "" });
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setForm({ email: "", password: "", nama: "", role: "admin", noTelepon: "" });
      showToast("Pengguna berhasil ditambahkan");
      fetchData();
    } else {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan");
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-bone">Pengguna Sistem</h1>
          <p className="text-sm text-bone-dim mt-1">Kelola akses pengguna (Super Admin)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Pengguna
        </button>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Email</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Role</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Telepon</th>
                <th className="text-center px-4 py-3 font-medium text-bone-dim">Aktif</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Belum ada pengguna</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3 font-medium text-bone">{u.nama}</td>
                    <td className="px-4 py-3 text-bone-dim">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "superadmin" ? "bg-purple-400/10 text-purple-300 border border-purple-500/30" :
                        u.role === "admin" ? "bg-sky-400/10 text-sky-400 border border-sky-500/30" :
                        u.role === "kasir" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" :
                        "bg-amber-400/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bone-dim text-xs">{u.noTelepon || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={async () => {
                          if (!confirm(`Nonaktifkan ${u.nama}?`)) return;
                          const res = await fetch(`/api/users`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: u.id, aktif: !u.aktif }),
                          });
                          if (res.ok) {
                            showToast(u.aktif ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan");
                            fetchData();
                          }
                        }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition ${
                          u.aktif
                            ? "bg-vest/10 text-emerald-800 hover:bg-emerald-200"
                            : "bg-asphalt-raised text-bone hover:bg-asphalt-raised"
                        }`}
                      >
                        {u.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-bone-dim text-xs">{formatDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">Tambah Pengguna</h2>
              <button onClick={() => setShowForm(false)} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-danger/5 text-red-700 rounded-lg text-sm border border-danger/40">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Nama *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm">
                  <option value="admin">Admin</option>
                  <option value="kasir">Kasir</option>
                  <option value="petugas">Petugas Lapangan</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">No. Telepon</label>
                <input type="text" value={form.noTelepon} onChange={(e) => setForm({ ...form, noTelepon: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm hover:bg-vest-bright">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
