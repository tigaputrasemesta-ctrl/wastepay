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
  { value: "rumah_tangga", label: "🏠 Rumah Tangga" },
  { value: "kost", label: "🏘️ Kost / Kontrakan" },
  { value: "bisnis_kelas_1", label: "🏪 Bisnis / Toko Kelas 1" },
  { value: "bisnis_kelas_2", label: "🏪 Bisnis / Toko Kelas 2" },
  { value: "bisnis_kelas_3", label: "🏬 Bisnis / Toko Kelas 3" },
  { value: "restoran", label: "🍽️ Rumah Makan / Restoran" },
  { value: "warung", label: "🍜 Warung Kecil" },
  { value: "perkantoran_kecil", label: "🏢 Perkantoran Kecil" },
  { value: "perkantoran_sedang", label: "🏢 Perkantoran Sedang" },
  { value: "perkantoran_besar", label: "🏙️ Perkantoran Besar" },
  { value: "sekolah", label: "🏫 Sekolah / Pendidikan" },
  { value: "klinik", label: "🏥 Klinik / Puskesmas" },
  { value: "rumah_sakit", label: "🏥 Rumah Sakit" },
  { value: "hotel", label: "🏨 Hotel / Penginapan" },
  { value: "pasar_kios", label: "🛒 Pasar / Kios" },
  { value: "tempat_ibadah", label: "⛪ Tempat Ibadah" },
  { value: "industri", label: "🏭 Industri / Pabrik" },
  { value: "fasum", label: "🏞️ Fasilitas Umum (RT/RW)" },
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
    kategori: "rumah_tangga",
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
      kategori: "rumah_tangga",
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
      kategori: p.kategori || "rumah_tangga",
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
          <div className="h-8 bg-gray-200 border-2 border-black w-48" />
          <div className="h-10 bg-gray-200 border-2 border-black" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 border-2 border-black" />
          ))}
        </div>
      </div>
    );
  }

  const paginatedPelanggan = pelanggan.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(pelanggan.length / ITEMS_PER_PAGE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black leading-none mb-1">
            Pelanggan
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest bg-yellow-300 inline-block px-2 border-2 border-black">
            Kelola data warga pelanggan
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-400 hover:bg-green-300 text-black border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pelanggan
        </button>
      </div>

      {/* Search + Filter mode */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, alamat, atau no telepon..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border-2 border-black bg-white focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 px-4 py-3 border-2 border-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all ${
              showFilter || [filterKelurahan, filterStatus, filterKategori].filter(Boolean).length > 0
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-yellow-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {[filterKelurahan, filterStatus, filterKategori].filter(Boolean).length > 0 && (
              <span className="bg-yellow-300 text-black px-1.5 py-0.5 border border-black text-[10px] font-black">
                {[filterKelurahan, filterStatus, filterKategori].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-2">Kelurahan</label>
                <select
                  value={filterKelurahan}
                  onChange={(e) => { setFilterKelurahan(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold uppercase appearance-none rounded-none bg-white"
                >
                  <option value="">Semua Kelurahan</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold uppercase appearance-none rounded-none bg-white"
                >
                  <option value="">Semua Status</option>
                  {STATUS_LIST.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-2">Kategori</label>
                <select
                  value={filterKategori}
                  onChange={(e) => { setFilterKategori(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold uppercase appearance-none rounded-none bg-white"
                >
                  <option value="">Semua Kategori</option>
                  {KATEGORI_LIST.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs font-black uppercase text-gray-600">
                {pelanggan.length} pelanggan tampil
              </span>
              <button
                onClick={resetFilters}
                disabled={[filterKelurahan, filterStatus, filterKategori].filter(Boolean).length === 0}
                className="px-4 py-2 bg-white border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-red-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="hm-card bg-white p-0 overflow-x-auto shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-black text-white font-black uppercase tracking-widest text-[10px] border-b-4 border-black">
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">Kode</th>
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">Nama</th>
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">No. Telepon</th>
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">Alamat & Wilayah</th>
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">Tarif</th>
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">Status</th>
              <th className="px-4 py-4 border-r-2 border-black whitespace-nowrap">Tanggal</th>
              <th className="px-4 py-4 text-center whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-black">
            {paginatedPelanggan.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-black font-black uppercase tracking-widest">
                  Belum ada data pelanggan
                </td>
              </tr>
            ) : (
              paginatedPelanggan.map((p) => (
                <tr key={p.id} className="border-b-2 border-black hover:bg-gray-100 transition-colors">
                  <td className="px-4 py-3 border-r-2 border-black whitespace-nowrap">
                    <span className="inline-block text-sm text-black font-black bg-yellow-300 border-2 border-black px-2 py-1 whitespace-nowrap shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      {p.kodePelanggan}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r-2 border-black min-w-[200px]">
                    <div className="flex items-center gap-3">
                      {p.fotoRumah ? (
                        <Image
                          src={p.fotoRumah}
                          alt={`Foto ${p.nama}`}
                          unoptimized
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] shrink-0"
                        />
                      ) : (
                         <div className="w-10 h-10 border-2 border-black bg-gray-200 shadow-[2px_2px_0_0_rgba(0,0,0,1)] shrink-0 flex items-center justify-center">
                           <span className="text-xs font-black">?</span>
                         </div>
                      )}
                      <div>
                        <div className="font-black text-black text-sm uppercase">
                          {p.nama}
                        </div>
                        {p.latitude && p.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            className="text-[10px] text-green-600 font-bold hover:underline"
                          >
                            📍 {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r-2 border-black text-black font-bold text-xs whitespace-nowrap">{p.noTelepon}</td>
                  <td className="px-4 py-3 border-r-2 border-black text-black max-w-[250px]">
                    <div className="text-xs font-bold truncate" title={p.alamat}>{p.alamat}</div>
                    <div className="inline-flex items-center mt-1 px-1.5 py-0.5 bg-gray-200 border border-black text-[9px] font-black uppercase">
                      {p.kelurahan?.nama ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r-2 border-black">
                    {p.customTarif ? (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-300 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] whitespace-nowrap">
                        Kustom
                      </span>
                    ) : p.paket ? (
                      <span className="inline-flex items-center px-2 py-1 bg-purple-300 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] whitespace-nowrap">
                        {p.paket.nama.split(" ").slice(0, 2).join(" ")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-300 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] whitespace-nowrap">
                        {p.kategori.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r-2 border-black">
                    <span className={`inline-flex items-center px-2 py-1 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] whitespace-nowrap ${
                      p.status === "aktif" ? "bg-green-400" :
                      p.status === "calon" ? "bg-yellow-300" :
                      p.status === "libur" ? "bg-red-400 text-white" :
                      "bg-gray-300 text-black"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r-2 border-black text-black text-xs font-bold whitespace-nowrap">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/pelanggan/${p.id}`}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-blue-300 hover:bg-blue-400 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-colors"
                        title="Detail"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => openEdit(p)}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-yellow-300 hover:bg-yellow-400 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-red-400 hover:bg-red-500 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t-4 border-black bg-yellow-100">
            <div className="text-xs font-black uppercase">
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border-2 border-black font-black text-xs uppercase disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white border-2 border-black font-black text-xs uppercase disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0_0_rgba(0,0,0,1)] border-4 border-black">
            <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-yellow-300">
              <h2 className="font-black uppercase tracking-widest text-xl">
                {editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black hover:bg-red-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Nama *</label>
                  <input
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">No. Telepon *</label>
                  <input
                    type="text"
                    value={form.noTelepon}
                    onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] appearance-none rounded-none"
                  >
                    <option value="rumah_tangga">🏠 Rumah Tangga</option>
                    <option value="kost">🏘️ Kost / Kontrakan</option>
                    <option value="bisnis_kelas_1">🏪 Bisnis / Toko Kelas 1</option>
                    <option value="bisnis_kelas_2">🏪 Bisnis / Toko Kelas 2</option>
                    <option value="bisnis_kelas_3">🏬 Bisnis / Toko Kelas 3</option>
                    <option value="restoran">🍽️ Rumah Makan / Restoran</option>
                    <option value="warung">🍜 Warung Kecil</option>
                    <option value="perkantoran_kecil">🏢 Perkantoran Kecil</option>
                    <option value="perkantoran_sedang">🏢 Perkantoran Sedang</option>
                    <option value="perkantoran_besar">🏙️ Perkantoran Besar</option>
                    <option value="sekolah">🏫 Sekolah / Pendidikan</option>
                    <option value="klinik">🏥 Klinik / Puskesmas</option>
                    <option value="rumah_sakit">🏥 Rumah Sakit</option>
                    <option value="hotel">🏨 Hotel / Penginapan</option>
                    <option value="pasar_kios">🛒 Pasar / Kios</option>
                    <option value="tempat_ibadah">⛪ Tempat Ibadah</option>
                    <option value="industri">🏭 Industri / Pabrik</option>
                    <option value="fasum">🏞️ Fasilitas Umum (RT/RW)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Kelurahan *</label>
                  <select
                    value={form.kelurahanId}
                    onChange={(e) => setForm({ ...form, kelurahanId: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] appearance-none rounded-none"
                    required
                  >
                    <option value="">PILIH KELURAHAN</option>
                    {kelurahanList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] appearance-none rounded-none"
                  >
                    <option value="aktif">AKTIF</option>
                    <option value="calon">CALON (MENUNGGU KONFIRMASI)</option>
                    <option value="nonaktif">NONAKTIF</option>
                    <option value="libur">LIBUR</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Alamat *</label>
                  <textarea
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">RT/RW</label>
                  <input
                    type="text"
                    value={form.rtRw}
                    onChange={(e) => setForm({ ...form, rtRw: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    placeholder="001/003"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Patokan Lokasi</label>
                  <input
                    type="text"
                    value={form.patokanLokasi}
                    onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    placeholder="Dekat masjid"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={form.penanggungjawab}
                    onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    placeholder="Nama"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Referal</label>
                  <input
                    type="text"
                    value={form.referal}
                    onChange={(e) => setForm({ ...form, referal: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-0 focus:bg-yellow-100 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    placeholder="Nama yang merefer"
                  />
                </div>
                
                <div className="col-span-2 border-t-4 border-black pt-5 mt-2">
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

              <div className="flex gap-4 pt-4 border-t-2 border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 border-2 border-black text-black font-black uppercase tracking-widest hover:bg-gray-300 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-green-400 border-2 border-black text-black font-black uppercase tracking-widest hover:bg-green-300 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                >
                  {editing ? "SIMPAN" : "TAMBAH"}
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
