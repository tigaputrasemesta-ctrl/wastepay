"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Pelanggan = { id: number; nama: string; alamat: string; noTelepon: string; fotoRumah?: string; patokanLokasi?: string; latitude?: number | null; longitude?: number | null };
type Rute = { id: number; nama: string; hari: string; jam?: string; wilayah: { nama: string } };
type Jadwal = {
  id: number;
  hari: string;
  jam?: string;
  aktif: boolean;
  pelanggan: Pelanggan;
  rute: Rute;
  _count: { pengangkutan: number };
};

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function JadwalPage() {
  const { showToast } = useToast();
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [ruteList, setRuteList] = useState<Rute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterHari, setFilterHari] = useState("");
  const [filterRute, setFilterRute] = useState("");
  const [form, setForm] = useState({ hari: "Senin", jam: "", pelangganId: "", ruteId: "" });
  const [editing, setEditing] = useState<Jadwal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Jadwal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterHari) params.set("hari", filterHari);
      if (filterRute) params.set("ruteId", filterRute);

      const [jadwalRes, pelangganRes, ruteRes] = await Promise.all([
        fetch(`/api/jadwal?${params}`),
        fetch("/api/pelanggan"),
        fetch("/api/rute"),
      ]);
      setJadwal(await jadwalRes.json());
      setPelangganList(await pelangganRes.json());
      setRuteList(await ruteRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterHari, filterRute]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ hari: "Senin", jam: "", pelangganId: "", ruteId: "" });
    setShowForm(true);
  }

  function openEdit(j: Jadwal) {
    setEditing(j);
    setForm({ hari: j.hari, jam: j.jam || "", pelangganId: j.pelanggan.id.toString(), ruteId: j.rute.id.toString() });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/jadwal/${editing.id}` : "/api/jadwal";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      showToast(editing ? "Jadwal berhasil diperbarui" : "Jadwal berhasil ditambahkan");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menyimpan", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/jadwal/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Jadwal berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } else {
      showToast("Gagal menghapus jadwal", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Jadwal Pengangkutan</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Atur jadwal pengangkutan per pelanggan dan rute</p>
        </div>
        <button
          onClick={openCreate}
          className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 hover:bg-green-300 text-black px-4 py-2 rounded-none text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Jadwal
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterHari}
          onChange={(e) => setFilterHari(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Semua Hari</option>
          {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={filterRute}
          onChange={(e) => setFilterRute(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Semua Rute</option>
          {ruteList.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white font-black border-b border-2 border-black">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Hari</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Rute</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Jam</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Pengangkutan</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : jadwal.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada jadwal</td></tr>
              ) : (
                jadwal.map((j) => (
                  <tr key={j.id} className="border-b border-2 border-black hover:bg-gray-100 border-2 border-black">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium bg-sky-400/10 text-sky-400 border border-sky-500/30">
                        {j.hari}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {j.pelanggan.fotoRumah && (
                          <Image
                            src={j.pelanggan.fotoRumah}
                            alt={`Foto rumah ${j.pelanggan.nama}`}
                            unoptimized
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-none object-cover border-2 border-black shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-medium text-black font-black">{j.pelanggan.nama}</div>
                          <div className="text-xs text-gray-600 font-bold">{j.pelanggan.alamat}</div>
                          {j.pelanggan.patokanLokasi && (
                            <div className="text-xs text-amber">📍 {j.pelanggan.patokanLokasi}</div>
                          )}
                          {j.pelanggan.latitude && j.pelanggan.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${j.pelanggan.latitude},${j.pelanggan.longitude}`}
                              target="_blank"
                              className="text-xs text-green-600 hover:text-sky-300 inline-flex items-center gap-0.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {j.pelanggan.latitude.toFixed(5)}, {j.pelanggan.longitude.toFixed(5)}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 font-bold">Tanpa koordinat</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold">{j.rute.nama}</td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{j.jam || "-"}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-bold text-xs">{j._count.pengangkutan}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium ${
                        j.aktif ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" : "bg-gray-100 border-2 border-black text-gray-600 font-bold"
                      }`}>
                        {j.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(j)}
                          className="text-gray-600 font-bold hover:text-sky-300 transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(j)}
                          className="text-red-600 hover:text-red-400 transition"
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">{editing ? "Edit Jadwal" : "Tambah Jadwal"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Pelanggan *</label>
                <select
                  value={form.pelangganId}
                  onChange={(e) => setForm({ ...form, pelangganId: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="">Pilih Pelanggan</option>
                  {pelangganList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} - {p.alamat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Rute *</label>
                <select
                  value={form.ruteId}
                  onChange={(e) => setForm({ ...form, ruteId: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="">Pilih Rute</option>
                  {ruteList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} ({r.wilayah.nama})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Hari *</label>
                <div className="grid grid-cols-4 gap-2">
                  {HARI_LIST.map((h) => {
                    const checked = form.hari === h;
                    return (
                      <label
                        key={h}
                        className={`flex items-center justify-center px-2 py-2 border rounded-none text-xs cursor-pointer transition ${
                          checked
                            ? "bg-green-400/15 border-vest text-green-600 font-semibold"
                            : "bg-hm-card bg-white p-0 overflow-hidden border-2 border-black text-gray-600 font-bold hover:bg-gray-100 border-2 border-black"
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          name="hari"
                          checked={checked}
                          onChange={() => setForm({ ...form, hari: h })}
                        />
                        {h.slice(0, 3)}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Jam (opsional)</label>
                <input
                  type="time"
                  value={form.jam}
                  onChange={(e) => setForm({ ...form, jam: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300"
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
        title="Hapus Jadwal"
        message={`Yakin ingin menghapus jadwal untuk ${deleteTarget?.pelanggan.nama} di hari ${deleteTarget?.hari}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
