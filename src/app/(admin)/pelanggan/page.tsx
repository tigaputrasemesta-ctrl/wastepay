"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import GeotagPhoto from "@/components/GeotagPhoto";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Paket = { id: number; nama: string; harga: number | null };

const KATEGORI_LIST = [
  { value: "level_1", label: "🏠 Level 1 — Volume Sangat Kecil" },
  { value: "level_2", label: "🏘️ Level 2 — Volume Kecil–Sedang" },
  { value: "level_3", label: "🏪 Level 3 — Volume Sedang" },
  { value: "level_4", label: "🏢 Level 4 — Volume Sedang–Besar" },
  { value: "level_5", label: "🏨 Level 5 — Volume Besar" },
  { value: "level_6", label: "🏭 Level 6 — Volume Sangat Besar" },
  { value: "level_7", label: "🏗️ Level 7 — Volume Ekstra Besar" },
  { value: "level_8", label: "🏬 Level 8 — Volume Komersial Besar" },
  { value: "level_9", label: "🏥 Level 9 — Volume Maksimal" },
  { value: "level_10", label: "🏙️ Level 10 — Volume Korporat" },
];

const STATUS_LIST = [
  { value: "aktif", label: "AKTIF" },
  { value: "calon", label: "CALON" },
  { value: "nonaktif", label: "NONAKTIF" },
  { value: "libur", label: "LIBUR" },
];
type Pelanggan = {
  id: number;
  kodePelanggan?: string;
  nama: string;
  noTelepon: string;
  kategori: string;
  penanggungjawab?: string;
  referal?: string;
  alamat: string;
  rtRw?: string;
  patokanLokasi?: string;
  fotoRumah?: string;
  latitude?: number | null;
  longitude?: number | null;
  koordinatSumber?: string;
  koordinatAkurasi?: number | null;
  customTarif?: number | null;
  status: string;
  kelurahan?: Kelurahan | null;
  paket?: Paket | null;
  createdAt: string;
};

export default function PelangganPage() {
  const { showToast } = useToast();
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterKelurahan, setFilterKelurahan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pelanggan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pelanggan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [form, setForm] = useState({
    nama: "",
    noTelepon: "",
    kategori: "level_1",
    customTarif: "",
    alamat: "",
    rtRw: "",
    patokanLokasi: "",
    penanggungjawab: "",
    referal: "",
    kelurahanId: "",
    fotoRumah: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
    status: "aktif",
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterKelurahan) params.set("kelurahanId", filterKelurahan);
      if (filterStatus) params.set("status", filterStatus);
      if (filterKategori) params.set("kategori", filterKategori);
      const qs = params.toString();

      const [pelangganRes, kelurahanRes] = await Promise.all([
        fetch(`/api/pelanggan${qs ? `?${qs}` : ""}`),
        fetch("/api/kelurahan"),
      ]);
      const pelangganData = await pelangganRes.json();
      const kelurahanData = await kelurahanRes.json();
      setPelanggan(pelangganData);
      setKelurahanList(kelurahanData);
    } catch (error) {
      showToast("Gagal memuat data", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, filterKelurahan, filterStatus, filterKategori, showToast]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset page on new search
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({
      nama: "",
      noTelepon: "",
      kategori: "level_1",
      customTarif: "",
      alamat: "",
      rtRw: "",
      patokanLokasi: "",
      penanggungjawab: "",
      referal: "",
      kelurahanId: "",
      fotoRumah: "",
      latitude: "",
      longitude: "",
      koordinatSumber: "",
      koordinatAkurasi: "",
      status: "aktif",
    });
    setShowForm(true);
  }

  function openEdit(p: Pelanggan) {
    setEditing(p);
    setForm({
      nama: p.nama,
      noTelepon: p.noTelepon,
      kategori: p.kategori || "level_1",
      customTarif: p.customTarif ? p.customTarif.toString() : "",
      alamat: p.alamat,
      rtRw: p.rtRw || "",
      patokanLokasi: p.patokanLokasi || "",
      penanggungjawab: p.penanggungjawab || "",
      referal: p.referal || "",
      kelurahanId: p.kelurahan?.id ? p.kelurahan.id.toString() : "",
      fotoRumah: p.fotoRumah || "",
      latitude: p.latitude ? p.latitude.toString() : "",
      longitude: p.longitude ? p.longitude.toString() : "",
      koordinatSumber: p.koordinatSumber || "",
      koordinatAkurasi: p.koordinatAkurasi ? String(p.koordinatAkurasi) : "",
      status: p.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/pelanggan/${editing.id}` : "/api/pelanggan";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      showToast(editing ? "Pelanggan berhasil diperbarui" : "Pelanggan berhasil ditambahkan");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/pelanggan/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Pelanggan berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } else {
      showToast("Gagal menghapus pelanggan", "error");
    }
  }

  function resetFilters() {
    setFilterKelurahan("");
    setFilterStatus("");
    setFilterKategori("");
    setPage(1);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 border border-slate-200/80 w-48" />
          <div className="h-10 bg-gray-200 border border-slate-200/80" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 border border-slate-200/80" />
          ))}
        </div>
      </div>
    );
  }

  const paginatedPelanggan = pelanggan.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(pelanggan.length / ITEMS_PER_PAGE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
            Pelanggan
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Kelola data dan status warga pelanggan
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pelanggan
        </button>
      </div>

      {/* Search + Filter mode */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, alamat, atau no telepon..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-rose-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-semibold text-xs transition-all shadow-sm ${
              showFilter || [filterKelurahan, filterStatus, filterKategori].filter(Boolean).length > 0
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {[filterKelurahan, filterStatus, filterKategori].filter(Boolean).length > 0 && (
              <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {[filterKelurahan, filterStatus, filterKategori].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kelurahan</label>
                <select
                  value={filterKelurahan}
                  onChange={(e) => { setFilterKelurahan(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Kelurahan</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Status</option>
                  {STATUS_LIST.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                <select
                  value={filterKategori}
                  onChange={(e) => { setFilterKategori(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium text-slate-800"
                >
                  <option value="">Semua Kategori</option>
                  {KATEGORI_LIST.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
              <span className="text-xs font-medium text-slate-500">
                {pelanggan.length} pelanggan tampil
              </span>
              <button
                onClick={resetFilters}
                disabled={[filterKelurahan, filterStatus, filterKategori].filter(Boolean).length === 0}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
              <th className="px-4 py-3.5 whitespace-nowrap">Kode</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Nama Pelanggan</th>
              <th className="px-4 py-3.5 whitespace-nowrap">No. Telepon</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Alamat & Wilayah</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Tarif</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Tanggal</th>
              <th className="px-4 py-3.5 text-center whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-slate-800 divide-y divide-slate-100">
            {paginatedPelanggan.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-600 font-medium text-xs">
                  Belum ada data pelanggan
                </td>
              </tr>
            ) : (
              paginatedPelanggan.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-block text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                      {p.kodePelanggan}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      {p.fotoRumah ? (
                        <Image
                          src={p.fotoRumah}
                          alt={`Foto ${p.nama}`}
                          unoptimized
                          width={36}
                          height={36}
                          className="w-9 h-9 object-cover rounded-xl border border-slate-200 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-9 h-9 border border-slate-200 bg-slate-100 rounded-xl shrink-0 flex items-center justify-center text-slate-600 text-xs font-bold">
                          ?
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {p.nama}
                        </div>
                        {p.referal && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200" title={`Referral: ${p.referal}`}>
                              <span aria-hidden="true">🤝</span>
                              <span className="truncate max-w-[130px]">{p.referal}</span>
                            </span>
                          </div>
                        )}
                        {p.latitude && p.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            className="text-[11px] text-emerald-700 font-medium hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            📍 {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium text-xs whitespace-nowrap">{p.noTelepon}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[240px]">
                    <div className="text-xs truncate font-medium text-slate-800" title={p.alamat}>{p.alamat}</div>
                    <div className="inline-flex items-center mt-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-600">
                      {p.kelurahan?.nama ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.customTarif ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                        Kustom
                      </span>
                    ) : p.paket ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-bold">
                        {p.paket.nama.split(" ").slice(0, 2).join(" ")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                        {p.kategori.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      p.status === "calon" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      p.status === "libur" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        href={`/pelanggan/${p.id}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 transition-colors shadow-sm"
                        title="Detail"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => openEdit(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-600 transition-colors shadow-sm"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 transition-colors shadow-sm"
                        title="Hapus"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <div>
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white">
              <h2 className="font-bold text-base tracking-wide">
                {editing ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Contoh: Bpk. Budi Santoso"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">No. Telepon / WA *</label>
                  <input
                    type="text"
                    value={form.noTelepon}
                    onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="081234567890"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                  >
                    <option value="level_1">🏠 Level 1 — Volume Sangat Kecil</option>
                    <option value="level_2">🏘️ Level 2 — Volume Kecil–Sedang</option>
                    <option value="level_3">🏪 Level 3 — Volume Sedang</option>
                    <option value="level_4">🏢 Level 4 — Volume Sedang–Besar</option>
                    <option value="level_5">🏨 Level 5 — Volume Besar</option>
                    <option value="level_6">🏭 Level 6 — Volume Sangat Besar</option>
                    <option value="level_7">🏗️ Level 7 — Volume Ekstra Besar</option>
                    <option value="level_8">🏬 Level 8 — Volume Komersial Besar</option>
                    <option value="level_9">🏥 Level 9 — Volume Maksimal</option>
                    <option value="level_10">🏙️ Level 10 — Volume Korporat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarif Kustom (Rp/bulan, opsional)</label>
                  <input
                    type="number"
                    value={form.customTarif}
                    onChange={(e) => setForm({ ...form, customTarif: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Kosongkan = pakai tarif Level"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kelurahan *</label>
                  <select
                    value={form.kelurahanId}
                    onChange={(e) => setForm({ ...form, kelurahanId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                    required
                  >
                    <option value="">Pilih Kelurahan</option>
                    {kelurahanList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Pelanggan</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="calon">Calon (Menunggu Konfirmasi)</option>
                    <option value="nonaktif">Nonaktif</option>
                    <option value="libur">Libur</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Lengkap *</label>
                  <textarea
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">RT / RW (Opsional)</label>
                  <input
                    type="text"
                    value={form.rtRw}
                    onChange={(e) => setForm({ ...form, rtRw: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="001/003"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Patokan Lokasi</label>
                  <input
                    type="text"
                    value={form.patokanLokasi}
                    onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Dekat masjid"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={form.penanggungjawab}
                    onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Nama penanggung jawab"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Referal</label>
                  <input
                    type="text"
                    value={form.referal}
                    onChange={(e) => setForm({ ...form, referal: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="Nama yang mereferensikan"
                  />
                </div>
                
                <div className="col-span-1 sm:col-span-2 border-t border-slate-200 pt-5 mt-2">
                  <GeotagPhoto
                    foto={form.fotoRumah}
                    latitude={form.latitude}
                    longitude={form.longitude}
                    koordinatSumber={form.koordinatSumber}
                    koordinatAkurasi={form.koordinatAkurasi}
                    onFotoChange={(foto) => setForm((prev) => ({ ...prev, fotoRumah: foto }))}
                    onKoordinatChange={(lat, lng, sumber, akurasi) =>
                      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng, koordinatSumber: sumber, koordinatAkurasi: akurasi }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {editing ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pelanggan"
        message={`Yakin ingin menghapus ${deleteTarget?.nama}? Semua data tagihan dan riwayat akan ikut terhapus.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
