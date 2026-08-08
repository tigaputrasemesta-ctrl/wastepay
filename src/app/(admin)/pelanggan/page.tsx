"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import GeotagPhoto from "@/components/GeotagPhoto";

type Wilayah = { id: number; nama: string; rt?: string; rw?: string };
type Paket = { id: number; nama: string; harga: number };
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
  wilayah: Wilayah;
  paket?: Paket | null;
  createdAt: string;
};

export default function PelangganPage() {
  const { showToast } = useToast();
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pelanggan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pelanggan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    noTelepon: "",
    kategori: "rumah_tangga",
    alamat: "",
    rtRw: "",
    patokanLokasi: "",
    penanggungjawab: "",
    referal: "",
    wilayahId: "",
    fotoRumah: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
    status: "aktif",
  });

  const fetchData = useCallback(async () => {
    try {
      const [pelangganRes, wilayahRes] = await Promise.all([
        fetch(`/api/pelanggan${search ? `?search=${search}` : ""}`),
        fetch("/api/wilayah"),
      ]);
      const pelangganData = await pelangganRes.json();
      const wilayahData = await wilayahRes.json();
      setPelanggan(pelangganData);
      setWilayahList(wilayahData);
    } catch (error) {
      showToast("Gagal memuat data", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
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
      wilayahId: "",
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
      wilayahId: p.wilayah.id.toString(),
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-asphalt-raised rounded w-48" />
          <div className="h-10 bg-asphalt-raised rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-asphalt-raised rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-bone">Pelanggan</h1>
          <p className="text-sm text-bone-dim mt-1">
            Kelola data warga pelanggan
          </p>
        </div>
        <button
          onClick={openCreate}
          className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pelanggan
        </button>
      </div>

      {/* Search with icon */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama, alamat, atau no telepon..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-faint hover:text-bone-dim"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">No. Telepon</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Wilayah</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Alamat</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Tarif</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Status</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Tanggal</th>
                <th className="text-right px-4 py-3 font-medium text-bone-dim">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pelanggan.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-bone-faint">
                    Belum ada data pelanggan
                  </td>
                </tr>
              ) : (
                pelanggan.map((p) => (
                  <tr key={p.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-bold bg-asphalt-raised px-1.5 py-0.5 rounded">{p.kodePelanggan}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.fotoRumah && (
                          <Image
                            src={p.fotoRumah}
                            alt={`Foto ${p.nama}`}
                            unoptimized
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-lg object-cover border border-asphalt-line shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-medium text-bone flex items-center gap-1.5">
                            {p.nama}
                            {p.latitude && p.longitude && (
                              <span title="Punya koordinat geotag">📍</span>
                            )}
                          </div>
                          {p.latitude && p.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                              target="_blank"
                              className="text-[10px] text-vest hover:text-blue-800"
                            >
                              {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                            </a>
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
                    <td className="px-4 py-3 text-bone-dim max-w-xs truncate">{p.alamat}</td>
                    <td className="px-4 py-3">
                      {p.customTarif ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber/10 text-amber-800">
                          Kustom
                        </span>
                      ) : p.paket ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-asphalt-raised text-purple-800">
                          {p.paket.nama.split(" ").slice(0, 2).join(" ")}
                        </span>
                      ) : (
                        <span className="text-bone-faint text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "aktif" ? "bg-vest/10 text-emerald-800" :
                        p.status === "calon" ? "bg-vest/10 text-blue-800" :
                        p.status === "libur" ? "bg-amber/10 text-yellow-800" :
                        "bg-asphalt-raised text-bone"
                      }`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bone-dim text-xs">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/pelanggan/${p.id}`}
                          className="text-vest hover:text-blue-800 transition"
                          title="Detail"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => openEdit(p)}
                          className="text-bone-dim hover:text-indigo-800 transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="text-danger hover:text-red-800 transition"
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">
                {editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-bone-dim mb-1">Nama *</label>
                  <input
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">No. Telepon *</label>
                  <input
                    type="text"
                    value={form.noTelepon}
                    onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                  >
                    <option value="rumah_tangga">🏠 Rumah Tangga</option>
                    <option value="bisnis">🏪 Bisnis/Toko</option>
                    <option value="kost">🏘️ Kost</option>
                    <option value="sekolah">🏫 Sekolah</option>
                    <option value="rm_makan">🍽️ RM Makan</option>
                    <option value="perkantoran">🏢 Kantor</option>
                    <option value="industri">🏭 Industri</option>
                    <option value="lainnya">📋 Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Wilayah *</label>
                  <select
                    value={form.wilayahId}
                    onChange={(e) => setForm({ ...form, wilayahId: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    required
                  >
                    <option value="">Pilih Wilayah</option>
                    {wilayahList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-bone-dim mb-1">Alamat *</label>
                  <textarea
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">RT/RW</label>
                  <input
                    type="text"
                    value={form.rtRw}
                    onChange={(e) => setForm({ ...form, rtRw: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    placeholder="001/003"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Patokan Lokasi</label>
                  <input
                    type="text"
                    value={form.patokanLokasi}
                    onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    placeholder="Dekat masjid"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={form.penanggungjawab}
                    onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    placeholder="Nama"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Referal</label>
                  <input
                    type="text"
                    value={form.referal}
                    onChange={(e) => setForm({ ...form, referal: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                    placeholder="Nama yang merefer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-sm"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="calon">Calon (menunggu konfirmasi)</option>
                    <option value="nonaktif">Nonaktif</option>
                    <option value="libur">Libur</option>
                  </select>
                </div>
                <div className="col-span-2 border-t border-asphalt-line pt-4">
                <GeotagPhoto
                  foto={form.fotoRumah}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  koordinatSumber={form.koordinatSumber}
                  koordinatAkurasi={form.koordinatAkurasi}
                  onFotoChange={(foto) => setForm({ ...form, fotoRumah: foto })}
                  onKoordinatChange={(lat, lng, sumber, akurasi) =>
                    setForm({ ...form, latitude: lat, longitude: lng, koordinatSumber: sumber, koordinatAkurasi: akurasi })
                  }
                />
              </div>
            </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-asphalt-line text-bone-dim rounded-lg hover:bg-asphalt-raised transition text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg hover:bg-vest-bright transition text-sm"
                >
                  {editing ? "Simpan" : "Tambah"}
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
