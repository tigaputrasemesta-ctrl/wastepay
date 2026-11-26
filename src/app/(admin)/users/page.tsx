"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { isCoreHostname } from "@/lib/tenant/url-helper";
import { useToast } from "@/components/Toast";
import {
  X,
  ShieldCheck,
  Building2,
  Users,
  HardHat,
  Search,
  Filter,
  Plus,
  KeyRound,
  Pencil,
  Trash2,
  CheckCircle2,
  Info,
} from "lucide-react";

type TenantInfo = {
  id: string;
  namaMitra: string;
  slug: string;
  tipePengelola?: string | null;
  status?: string;
};

type User = {
  id: number;
  email: string;
  nama: string;
  role: string;
  noTelepon?: string | null;
  aktif: boolean;
  createdAt: string;
  tenantId?: string | null;
  tenant?: TenantInfo | null;
};

type ScopeType = "core" | "mitra" | "operasional" | "all";

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCore, setIsCore] = useState(false);

  // Filter States
  const [activeScope, setActiveScope] = useState<ScopeType>("core");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    nama: "",
    email: "",
    password: "",
    noTelepon: "",
    entityType: "core", // "core" | "mitra"
    tenantId: "tenant-core-o2w",
    role: "superadmin",
  });
  const [addError, setAddError] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit Modal States
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    nama: "",
    email: "",
    noTelepon: "",
    tenantId: "",
    role: "admin",
  });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Password Modal States
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Deteksi Domain Platform (O2W HERO Core vs Tenant)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const detectedCore = isCoreHostname(window.location.hostname);
      setIsCore(detectedCore);
      // Jika diakses dari domain O2W Hero, default tab selalu Akun Internal O2W; jika tenant, default tab mitra
      setActiveScope(detectedCore ? "core" : "mitra");
    }
  }, []);

  // Fetch Data Pengguna & Metadata Tenant
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?meta=1");
      if (res.ok) {
        const json = await res.json();
        if (json.users && Array.isArray(json.users)) {
          setUsers(json.users);
          if (json.tenants && Array.isArray(json.tenants)) {
            setTenants(json.tenants);
          }
        } else if (Array.isArray(json)) {
          setUsers(json);
        }
      } else {
        showToast("Gagal mengambil data pengguna", "error");
      }
    } catch (e) {
      console.error("Error loading users:", e);
      showToast("Gagal menghubungi server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Metrik Agregat Pengguna
  const metrics = useMemo(() => {
    let coreCount = 0;
    let mitraAdminCount = 0;
    let operasionalCount = 0;
    let activeCount = 0;

    users.forEach((u) => {
      if (u.aktif) activeCount++;
      const isCoreUser = u.tenantId === "tenant-core-o2w" || u.role === "superadmin";
      if (isCoreUser) {
        coreCount++;
      } else if (u.role === "admin" || u.role === "kasir") {
        mitraAdminCount++;
      } else {
        operasionalCount++;
      }
    });

    return {
      coreCount,
      mitraAdminCount,
      operasionalCount,
      activeCount,
      totalCount: users.length,
    };
  }, [users]);

  // Filter Pengguna berdasarkan Tab, Tenant, Role, dan Search Query
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isCoreUser = u.tenantId === "tenant-core-o2w" || u.role === "superadmin";
      const isMitraAdmin = !isCoreUser && (u.role === "admin" || u.role === "kasir");
      const isOperasional = !isCoreUser && (u.role === "petugas" || u.role === "seller");

      // 1. Filter Scope / Tab
      if (activeScope === "core" && !isCoreUser) return false;
      if (activeScope === "mitra" && !isMitraAdmin) return false;
      if (activeScope === "operasional" && !isOperasional) return false;

      // 2. Filter Tenant Dropdown (hanya aktif jika tidak di tab core)
      if (activeScope !== "core" && selectedTenantFilter !== "all") {
        if (u.tenantId !== selectedTenantFilter) return false;
      }

      // 3. Filter Role Dropdown
      if (selectedRoleFilter !== "all") {
        if (u.role !== selectedRoleFilter) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.nama.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = (u.noTelepon || "").toLowerCase().includes(q);
        const matchTenant = (u.tenant?.namaMitra || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchTenant) return false;
      }

      return true;
    });
  }, [users, activeScope, selectedTenantFilter, selectedRoleFilter, searchQuery]);

  // Handler Submit Tambah Pengguna
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setSavingAdd(true);

    try {
      const assignedTenant =
        addForm.entityType === "core" ? "tenant-core-o2w" : addForm.tenantId;

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: addForm.nama,
          email: addForm.email,
          password: addForm.password,
          noTelepon: addForm.noTelepon,
          role: addForm.role,
          tenantId: assignedTenant,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({
          nama: "",
          email: "",
          password: "",
          noTelepon: "",
          entityType: "core",
          tenantId: "tenant-core-o2w",
          role: "superadmin",
        });
        showToast("Pengguna baru berhasil ditambahkan", "success");
        fetchData();
      } else {
        setAddError(data.error || "Gagal menambahkan pengguna");
        showToast(data.error || "Gagal menambahkan pengguna", "error");
      }
    } catch {
      setAddError("Terjadi kesalahan pada jaringan");
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSavingAdd(false);
    }
  }

  // Buka Modal Edit
  function openEdit(u: User) {
    setEditUser(u);
    setEditError("");
    setEditForm({
      nama: u.nama,
      email: u.email,
      noTelepon: u.noTelepon || "",
      tenantId: u.tenantId || (u.role === "superadmin" ? "tenant-core-o2w" : ""),
      role: u.role,
    });
  }

  // Handler Submit Edit Pengguna
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    setSavingEdit(true);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editUser.id,
          nama: editForm.nama,
          email: editForm.email,
          noTelepon: editForm.noTelepon,
          role: editForm.role,
          tenantId: editForm.tenantId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditUser(null);
        showToast("Data pengguna berhasil diperbarui", "success");
        fetchData();
      } else {
        setEditError(data.error || "Gagal memperbarui pengguna");
        showToast(data.error || "Gagal memperbarui pengguna", "error");
      }
    } catch {
      setEditError("Terjadi kesalahan sistem");
      showToast("Gagal memperbarui data", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  // Handler Ubah Password
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordUser) return;
    setSavingPassword(true);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: passwordUser.id,
          password: newPassword,
        }),
      });

      if (res.ok) {
        setPasswordUser(null);
        setNewPassword("");
        showToast("Password pengguna berhasil diubah", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Gagal mengubah password", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  // Handler Hapus Pengguna
  async function handleDelete(id: number, nama: string) {
    if (!confirm(`Yakin ingin menghapus pengguna "${nama}"? Aksi ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        showToast(`Pengguna "${nama}" telah dihapus`, "success");
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || "Gagal menghapus pengguna", "error");
      }
    } catch {
      showToast("Gagal menghapus pengguna", "error");
    }
  }

  // Handler Toggle Status Aktif
  async function handleToggleStatus(u: User) {
    const actionLabel = u.aktif ? "menonaktifkan" : "mengaktifkan";
    if (!confirm(`Yakin ingin ${actionLabel} akun ${u.nama}?`)) return;

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, aktif: !u.aktif }),
      });

      if (res.ok) {
        showToast(`Akun ${u.nama} berhasil ${u.aktif ? "dinonaktifkan" : "diaktifkan"}`, "success");
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || "Gagal memperbarui status", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
  }

  return (
    <div className="p-4 sm:p-6 pb-16 w-full max-w-7xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1.5 ${isCore ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"} rounded-lg`}>
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
              {isCore ? "Kelola Akun Admin Platform" : "Kelola Staf & Petugas TPS 3R"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {isCore
              ? "Pusat manajemen hak akses: Akun Tim Internal Platform O2W HERO & Administrator Mitra Tenant"
              : "Pusat manajemen staf operasional: Admin loket, kasir pembayaran, dan petugas pengangkutan TPS 3R"}
          </p>
        </div>

        <button
          onClick={() => {
            setAddError("");
            if (!isCore) {
              const firstTenant = tenants[0]?.id || "tenant-pilot-upsheru";
              setAddForm((prev) => ({
                ...prev,
                entityType: "mitra",
                tenantId: firstTenant,
                role: "admin",
              }));
            }
            setShowAddModal(true);
          }}
          className={`${isCore ? "bg-purple-700 hover:bg-purple-800" : "bg-emerald-700 hover:bg-emerald-800"} text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 self-start sm:self-auto`}
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isCore ? "Tim Platform O2W" : "Admin Mitra"}
            </span>
            <span className="p-1 bg-purple-50 text-purple-600 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2">
            {isCore ? metrics.coreCount : metrics.mitraAdminCount}
          </p>
          <p className="text-[11px] text-purple-600 mt-0.5">
            {isCore ? "Superadmin & Core Team" : "Pengelola & Kasir Loket"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-sky-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Admin Mitra
            </span>
            <span className="p-1 bg-sky-50 text-sky-600 rounded-md">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-sky-900 mt-2">{metrics.mitraAdminCount}</p>
          <p className="text-[11px] text-sky-600 mt-0.5">Pengelola TPS 3R & KSM</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Staf Lapangan
            </span>
            <span className="p-1 bg-amber-50 text-amber-700 rounded-md">
              <HardHat className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{metrics.operasionalCount}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Driver & Petugas Mitra</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Akun Aktif
            </span>
            <span className="p-1 bg-emerald-50 text-emerald-700 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">
            {metrics.activeCount} <span className="text-xs font-medium text-slate-400">/ {metrics.totalCount}</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Status Aktif Beroperasi</p>
        </div>
      </div>

      {/* Scope Navigation Tabs */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200">
        {isCore && (
          <button
            onClick={() => {
              setActiveScope("core");
              setSelectedRoleFilter("all");
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeScope === "core"
                ? "bg-purple-700 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Akun Internal O2W Hero</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeScope === "core" ? "bg-purple-800 text-purple-100" : "bg-slate-200 text-slate-700"
              }`}
            >
              {metrics.coreCount}
            </span>
          </button>
        )}

        <button
          onClick={() => {
            setActiveScope("mitra");
            setSelectedRoleFilter("all");
          }}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeScope === "mitra"
              ? "bg-sky-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isCore ? "Administrator Mitra" : "Staf Loket & Kasir"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeScope === "mitra" ? "bg-sky-800 text-sky-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {metrics.mitraAdminCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveScope("operasional");
            setSelectedRoleFilter("all");
          }}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeScope === "operasional"
              ? "bg-amber-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Staf Lapangan Mitra</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeScope === "operasional" ? "bg-amber-800 text-amber-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {metrics.operasionalCount}
          </span>
        </button>

        {isCore && (
          <button
            onClick={() => {
              setActiveScope("all");
              setSelectedRoleFilter("all");
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeScope === "all"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Semua Pengguna</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeScope === "all" ? "bg-slate-900 text-slate-100" : "bg-slate-200 text-slate-700"
              }`}
            >
              {metrics.totalCount}
            </span>
          </button>
        )}
      </div>

      {/* Notification Banner Info Isolasi */}
      {activeScope === "core" && (
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3 sm:p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-900">
            <p className="font-bold">Mode Akun Internal O2W HERO (Platform Core)</p>
            <p className="text-purple-700 mt-0.5">
              Halaman ini hanya menampilkan akun Super Admin dan Staf Manajemen Platform O2W HERO. Akun operasional
              armada dan supir mitra (seperti UPS HERU) diisolasi rapi pada tab <strong>Administrator Mitra</strong> dan{" "}
              <strong>Staf Lapangan Mitra</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, email, nomor HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Tenant Selector jika di luar core tab */}
          {activeScope !== "core" && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="w-full sm:w-auto text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="all">Semua Mitra / Tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.namaMitra} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          >
            <option value="all">Semua Peran</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="kasir">Kasir</option>
            <option value="petugas">Petugas Lapangan</option>
            <option value="seller">Seller / UMKM</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3.5 font-semibold">Pengguna & Kontak</th>
                <th className="text-left px-4 py-3.5 font-semibold">Email Login</th>
                <th className="text-left px-4 py-3.5 font-semibold">Tenant / Ekosistem</th>
                <th className="text-left px-4 py-3.5 font-semibold">Peran (Role)</th>
                <th className="text-center px-4 py-3.5 font-semibold">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold">Terdaftar</th>
                <th className="text-center px-4 py-3.5 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-medium">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">Tidak ada pengguna yang cocok</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? "Coba gunakan kata kunci pencarian yang berbeda"
                        : "Belum ada akun yang terdaftar pada kategori ini"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCoreUser = u.tenantId === "tenant-core-o2w" || u.role === "superadmin";
                  const isPilot = u.tenantId === "tenant-pilot-upsheru" || u.tenant?.slug === "upsheru";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      {/* Nama & Kontak */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isCoreUser
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : isPilot
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-sky-100 text-sky-700 border border-sky-200"
                            }`}
                          >
                            {u.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{u.nama}</p>
                            <p className="text-xs text-slate-500">{u.noTelepon || "No. HP —"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-slate-600 text-xs font-mono">{u.email}</td>

                      {/* Tenant / Ekosistem */}
                      <td className="px-4 py-3.5">
                        {isCoreUser ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                            O2W HERO Platform Core
                          </span>
                        ) : isPilot ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                            UPS HERU Kota Depok
                          </span>
                        ) : u.tenant?.namaMitra ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <Building2 className="w-3.5 h-3.5 text-sky-600" />
                            {u.tenant.namaMitra}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.role === "superadmin"
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : u.role === "admin"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : u.role === "kasir"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : u.role === "petugas"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition ${
                            u.aktif
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${u.aktif ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          {u.aktif ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>

                      {/* Tanggal */}
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-sky-700 hover:bg-sky-50 border border-sky-200 rounded-lg transition"
                            title="Edit Akun"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setPasswordUser(u);
                              setNewPassword("");
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg transition"
                            title="Ganti Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.nama)}
                            className="p-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Memuat data pengguna...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Tidak ada pengguna yang cocok</div>
          ) : (
            filteredUsers.map((u) => {
              const isCoreUser = u.tenantId === "tenant-core-o2w" || u.role === "superadmin";
              const isPilot = u.tenantId === "tenant-pilot-upsheru" || u.tenant?.slug === "upsheru";

              return (
                <div key={u.id} className="p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{u.nama}</p>
                      <p className="text-slate-500 text-xs font-mono">{u.email}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        u.role === "superadmin"
                          ? "bg-purple-100 text-purple-800"
                          : u.role === "admin"
                          ? "bg-sky-100 text-sky-800"
                          : u.role === "kasir"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Ekosistem:</span>
                      <span className="font-semibold text-slate-800">
                        {isCoreUser
                          ? "O2W HERO Platform Core"
                          : isPilot
                          ? "UPS HERU Kota Depok"
                          : u.tenant?.namaMitra || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Telepon:</span>
                      <span className="text-slate-700">{u.noTelepon || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status:</span>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`font-bold ${u.aktif ? "text-emerald-700" : "text-slate-400"}`}
                      >
                        {u.aktif ? "🟢 Aktif (Ubah)" : "⚪ Nonaktif (Ubah)"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">{formatDate(u.createdAt)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setPasswordUser(u);
                          setNewPassword("");
                        }}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold"
                      >
                        Password
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.nama)}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Tambah Pengguna */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col text-slate-900 dark:text-zinc-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Tambah Pengguna Baru</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Pilih entitas akun: Platform O2W HERO atau Mitra Tenant</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
              {addError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900">
                  {addError}
                </div>
              )}

              {/* Pilihan Entitas / Scope Akun */}
              {isCore ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tipe Entitas Akun *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddForm((prev) => ({
                          ...prev,
                          entityType: "core",
                          tenantId: "tenant-core-o2w",
                          role: "superadmin",
                        }));
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        addForm.entityType === "core"
                          ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">Platform O2W HERO</p>
                        <p className="text-[10px] text-slate-500">Tim Internal Core</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const firstTenant = tenants.find((t) => t.id !== "tenant-core-o2w")?.id || "tenant-pilot-upsheru";
                        setAddForm((prev) => ({
                          ...prev,
                          entityType: "mitra",
                          tenantId: firstTenant,
                          role: "admin",
                        }));
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        addForm.entityType === "mitra"
                          ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-sky-600 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">Mitra / Tenant</p>
                        <p className="text-[10px] text-slate-500">TPS 3R, Bank Sampah</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Pilihan Tenant Jika Tipe Mitra */}
              {isCore && addForm.entityType === "mitra" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Mitra / Tenant *
                  </label>
                  <select
                    value={addForm.tenantId}
                    onChange={(e) => setAddForm({ ...addForm, tenantId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  >
                    {tenants
                      .filter((t) => t.id !== "tenant-core-o2w")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.namaMitra} ({t.slug})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap *</label>
                <input
                  type="text"
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="Contoh: Budi Santoso"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Login *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="admin@o2whero.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi *</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Peran / Role *</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {addForm.entityType === "core" ? (
                    <>
                      <option value="superadmin">Super Admin (Akses Penuh Platform)</option>
                      <option value="admin">Admin Platform Core</option>
                    </>
                  ) : (
                    <>
                      <option value="admin">Admin Mitra (Pengelola Unit)</option>
                      <option value="kasir">Kasir Mitra (Loket & Keuangan)</option>
                      <option value="petugas">Petugas Lapangan (Driver / Ritase)</option>
                    </>
                  )}
                </select>
              </div>

              {/* No Telepon */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={addForm.noTelepon}
                  onChange={(e) => setAddForm({ ...addForm, noTelepon: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="08123456789"
                />
              </div>

              </div>

              <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="flex-1 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50"
                >
                  {savingAdd ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pengguna */}
      {editUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col text-slate-900 dark:text-zinc-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Edit Pengguna</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Perbarui data atau pindahkan entitas akun</p>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
              {editError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900">
                  {editError}
                </div>
              )}

              {/* Nama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap *</label>
                <input
                  type="text"
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Login *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              {/* Penugasan Tenant */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tenant / Ekosistem Penugasan
                </label>
                <select
                  value={editForm.tenantId}
                  onChange={(e) => setEditForm({ ...editForm, tenantId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="tenant-core-o2w">🏢 O2W HERO Platform Core</option>
                  {tenants
                    .filter((t) => t.id !== "tenant-core-o2w")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        🤝 {t.namaMitra} ({t.slug})
                      </option>
                    ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Peran / Role *</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="superadmin">Super Admin (Platform)</option>
                  <option value="admin">Admin</option>
                  <option value="kasir">Kasir</option>
                  <option value="petugas">Petugas Lapangan</option>
                  <option value="seller">Seller / UMKM</option>
                </select>
              </div>

              {/* No Telepon */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={editForm.noTelepon}
                  onChange={(e) => setEditForm({ ...editForm, noTelepon: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              </div>

              <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50"
                >
                  {savingEdit ? "Memperbarui..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Password */}
      {passwordUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden w-full max-w-sm max-h-[90vh] flex flex-col text-slate-900 dark:text-zinc-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Ganti Kata Sandi</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Akun: {passwordUser.nama}</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Password Baru *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition disabled:opacity-50"
                >
                  {savingPassword ? "Menyimpan..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
