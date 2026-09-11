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

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "kasir", label: "Kasir" },
  { value: "petugas", label: "Petugas Lapangan" },
  { value: "superadmin", label: "Super Admin" },
];

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nama: "", role: "admin", noTelepon: "" });
  const [error, setError] = useState("");
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ nama: "", email: "", role: "admin", noTelepon: "" });
  const [editError, setEditError] = useState("");

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

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingUser.id, password: newPassword }),
    });

    if (res.ok) {
      setEditingUser(null);
      setNewPassword("");
      showToast("Password berhasil diubah");
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal mengubah password", "error");
    }
  }

  function openEdit(u: User) {
    setEditUser(u);
    setEditError("");
    setEditForm({ nama: u.nama, email: u.email, role: u.role, noTelepon: u.noTelepon || "" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");

    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editUser.id, ...editForm }),
    });

    if (res.ok) {
      setEditUser(null);
      showToast("Pengguna berhasil diperbarui");
      fetchData();
    } else {
      const data = await res.json();
      setEditError(data.error || "Gagal memperbarui pengguna");
      showToast(data.error || "Gagal memperbarui pengguna", "error");
    }
  }

  async function handleDelete(id: number, nama: string) {
    if (!confirm(`Yakin ingin menghapus pengguna ${nama}?`)) return;
    
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      showToast("Pengguna berhasil dihapus");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menghapus pengguna", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengguna Sistem</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Kelola akses pengguna (Super Admin)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Pengguna
        </button>
      </div>

      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Telepon</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Aktif</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Dibuat</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada pengguna</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-medium text-black font-black">{u.nama}</td>
                    <td className="px-4 py-3 text-gray-600 font-bold">{u.email}</td>
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
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{u.noTelepon || "-"}</td>
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
                            ? "bg-green-400/10 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 border border-slate-200/80 text-black font-black hover:bg-slate-50/80 transition"
                        }`}
                      >
                        {u.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button onClick={() => openEdit(u)} className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 border border-slate-200/80 hover:bg-indigo-200">
                        Edit
                      </button>
                      <button onClick={() => setEditingUser(u)} className="text-xs font-bold px-2 py-1 bg-yellow-100 border border-slate-200/80 hover:bg-yellow-200">
                        Password
                      </button>
                      <button onClick={() => handleDelete(u.id, u.nama)} className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 border border-slate-200/80 hover:bg-red-200">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-black font-black">Tambah Pengguna</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-danger/5 text-red-700 rounded-none text-sm border border-danger/40">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Nama *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm">
                  <option value="admin">Admin</option>
                  <option value="kasir">Kasir</option>
                  <option value="petugas">Petugas Lapangan</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">No. Telepon</label>
                <input type="text" value={form.noTelepon} onChange={(e) => setForm({ ...form, noTelepon: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm hover:bg-green-300">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-black font-black">Ganti Password</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 mb-2">Mengubah password untuk: {editingUser.nama}</p>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Password Baru *</label>
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required minLength={6} placeholder="Minimal 6 karakter" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-yellow-400 text-black rounded-none text-sm hover:bg-yellow-300 font-bold">Ubah Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-black font-black">Edit Pengguna</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-danger/5 text-red-700 rounded-none text-sm border border-danger/40">{editError}</div>
              )}
              <p className="text-xs font-bold text-gray-500 mb-2">Mengedit: {editUser.nama} ({editUser.email})</p>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Nama *</label>
                <input type="text" value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Role *</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm">
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">No. Telepon</label>
                <input type="text" value={editForm.noTelepon} onChange={(e) => setEditForm({ ...editForm, noTelepon: e.target.value })} className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm hover:bg-green-300">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
