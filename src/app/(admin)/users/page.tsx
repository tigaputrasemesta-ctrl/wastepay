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

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Nama</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Telepon</th>
                <th className="text-center px-4 py-3 font-semibold">Aktif</th>
                <th className="text-left px-4 py-3 font-semibold">Dibuat</th>
                <th className="text-center px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">Memuat...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">Belum ada pengguna</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.nama}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === "superadmin" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                        u.role === "admin" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                        u.role === "kasir" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.noTelepon || "—"}</td>
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                          u.aktif
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {u.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center space-x-1.5">
                      <button onClick={() => openEdit(u)} className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 rounded-lg transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setEditingUser(u)} className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 rounded-lg transition-colors">
                        Password
                      </button>
                      <button onClick={() => handleDelete(u.id, u.nama)} className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 rounded-lg transition-colors">
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Tambah Pengguna Baru</h2>
                <p className="text-xs text-slate-500">Buat akun untuk staf atau admin baru</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">{error}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required minLength={6} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Peran / Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option value="admin">Admin</option>
                  <option value="kasir">Kasir</option>
                  <option value="petugas">Petugas Lapangan</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. Telepon / WhatsApp</label>
                <input type="text" value={form.noTelepon} onChange={(e) => setForm({ ...form, noTelepon: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 font-semibold transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all text-sm font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Ganti Password</h2>
                <p className="text-xs text-slate-500">Update kata sandi akun</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">Mengubah password untuk: <span className="font-semibold text-slate-900">{editingUser.nama}</span></p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password Baru *</label>
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required minLength={6} placeholder="Minimal 6 karakter" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 font-semibold transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all text-sm font-semibold">Ubah Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Edit Pengguna</h2>
                <p className="text-xs text-slate-500">Perbarui profil dan wewenang pengguna</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">{editError}</div>
              )}
              <p className="text-xs text-slate-500 font-medium">Mengedit: <span className="font-semibold text-slate-900">{editUser.nama}</span> ({editUser.email})</p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap *</label>
                <input type="text" value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Peran / Role *</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. Telepon</label>
                <input type="text" value={editForm.noTelepon} onChange={(e) => setEditForm({ ...editForm, noTelepon: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 font-semibold transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs hover:shadow active:scale-[0.98] transition-all text-sm font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
