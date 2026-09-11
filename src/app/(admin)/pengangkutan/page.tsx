"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDate, todayLocalISO } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import LacakLokasi from "@/components/LacakLokasi";

type ProfilPetugas = { id: number; nama: string; jabatan: string | null; wilayahId: number | null };
type KendaraanSaya = { id: number; nama: string; platNomor: string | null; jenis: string };

type Pengangkutan = {
  id: number;
  tanggal: string;
  status: string;
  volume?: number;
  berat?: number;
  jenisSampah?: string;
  catatan?: string;
  pelanggan: { id: number; nama: string; alamat: string; kodePelanggan: string };
  petugas?: { id: number; nama: string } | null;
  jadwal?: { hari: string } | null;
  zona?: { id: number; nama: string } | null;
  tpa?: { id: number; nama: string } | null;
  kendaraan?: { id: number; nama: string; platNomor: string | null; jenis: string } | null;
};

const STATUS_OPTIONS = [
  { value: "terjadwal", label: "Terjadwal", color: "bg-sky-400/10 text-sky-400 border border-sky-500/30" },
  { value: "diambil", label: "Diambil", color: "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" },
  { value: "tidak_diangkut", label: "Tidak Diangkut", color: "bg-danger/10 text-red-400 border border-red-500/30" },
  { value: "kosong", label: "Kosong", color: "bg-amber-400/10 text-amber-400 border border-amber-500/30" },
];

const JENIS_SAMPAH = [
  { value: "organik", label: "Organik" },
  { value: "anorganik", label: "Anorganik" },
  { value: "b3", label: "B3" },
  { value: "campuran", label: "Campuran" },
];

export default function PengangkutanPage() {
  const { user } = useUser();
  const [profil, setProfil] = useState<ProfilPetugas | null>(null);
  const [kendaraanSaya, setKendaraanSaya] = useState<KendaraanSaya[]>([]);
  const [data, setData] = useState<Pengangkutan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState(todayLocalISO());
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    status: string;
    volume: string;
    berat: string;
    jenisSampah: string;
    catatan: string;
    kendaraanId: string;
  }>({ status: "", volume: "", berat: "", jenisSampah: "", catatan: "", kendaraanId: "" });

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (tanggal) params.set("tanggal", tanggal);
    if (statusFilter) params.set("status", statusFilter);
    // Petugas login → hanya tugas miliknya (server resolve via link userId → petugasId)
    if (user?.role === "petugas") params.set("saya", "1");

    const res = await fetch(`/api/pengangkutan?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [tanggal, statusFilter, user]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  // Profil petugas yang login → tampilkan tombol Mulai Lacak GPS
  useEffect(() => {
    if (user?.role !== "petugas") return;
    (async () => {
      try {
        const res = await fetch("/api/petugas/me");
        if (res.ok) {
          const d = await res.json();
          setProfil({ id: d.id, nama: d.nama, jabatan: d.jabatan, wilayahId: d.wilayahId });
          // Kendaraan yang dikemudikan petugas ini
          const kRes = await fetch("/api/kendaraan");
          if (kRes.ok) {
            const ks = await kRes.json();
            setKendaraanSaya(
              (Array.isArray(ks) ? ks : [])
                .filter((k: { petugas?: { id: number } | null }) => k.petugas?.id === d.id)
                .map((k: { id: number; nama: string; platNomor: string | null; jenis: string }) => ({
                  id: k.id,
                  nama: k.nama,
                  platNomor: k.platNomor,
                  jenis: k.jenis,
                }))
            );
          }
        }
      } catch {
        // diam
      }
    })();
  }, [user]);

  function startEdit(item: Pengangkutan) {
    setUpdating(item.id);
    setEditForm({
      status: item.status,
      volume: item.volume?.toString() || "",
      berat: item.berat?.toString() || "",
      jenisSampah: item.jenisSampah || "",
      catatan: item.catatan || "",
      kendaraanId: item.kendaraan?.id?.toString() ?? "",
    });
  }

  async function handleUpdate(id: number) {
    const body: Record<string, unknown> = {
      ...editForm,
      volume: editForm.volume || null,
      berat: editForm.berat || null,
    };

    // Saat pickup, coba sertakan koordinat GPS perangkat (untuk riwayat pickup di peta)
    if (editForm.status !== "terjadwal" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000,
          })
        );
        body.latitude = pos.coords.latitude;
        body.longitude = pos.coords.longitude;
      } catch {
        // tanpa koordinat — tetap simpan
      }
    }

    // Petugas wajib pilih kendaraan saat menandai sampah sudah diambil
    if (user?.role === "petugas" && editForm.status === "sudah_diambil" && !editForm.kendaraanId) {
      alert("Pilih kendaraan yang digunakan untuk pickup dulu");
      return;
    }
    body.kendaraanId = editForm.kendaraanId || null;

    const res = await fetch(`/api/pengangkutan/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setUpdating(null);
      fetchData();
    } else {
      alert("Gagal mengupdate");
    }
  }

  function getStatusInfo(status: string) {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  }

  return (
    <div className="p-4 md:p-6">
      {profil && <LacakLokasi profil={profil} kendaraan={kendaraanSaya} />}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengangkutan</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          {user?.role === "petugas" ? "Tugas pengangkutan hari ini" : "Riwayat pengangkutan sampah"}
        </p>
      </div>

      {/* Filter - compact for mobile */}
      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 flex-1 min-w-[140px] shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 flex-1 min-w-[120px] shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Link
          href={`/surat-jalan?tanggal=${tanggal}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-2xs"
        >
          🖨 Surat Jalan
        </Link>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Tanggal</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Kode</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Pelanggan</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Volume</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Jenis</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">Petugas</th>
                <th className="text-center px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3.5">Catatan</th>
                {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "petugas") && (
                  <th className="text-center px-4 py-3.5 whitespace-nowrap">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs font-medium">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs font-medium">Belum ada data pengangkutan</td></tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(d.tanggal)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">{d.pelanggan.kodePelanggan}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{d.pelanggan.nama}</div>
                      <div className="text-xs text-slate-500">{d.pelanggan.alamat}</div>
                      {d.zona?.nama && <div className="text-[11px] text-purple-600 font-semibold mt-0.5">🗺️ {d.zona.nama}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                      {d.volume ? `${d.volume} m³` : "-"}
                      {d.berat ? ` / ${d.berat} kg` : ""}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                      {d.jenisSampah ? JENIS_SAMPAH.find((j) => j.value === d.jenisSampah)?.label || d.jenisSampah : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{d.petugas?.nama || "-"}</td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusInfo(d.status).color}`}>
                        {getStatusInfo(d.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs max-w-[150px] truncate">{d.catatan || "-"}</td>
                    {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "petugas") && (
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => startEdit(d)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs"
                        >
                          Update
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 font-medium py-8 text-xs">Memuat data...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-slate-400 font-medium py-8 text-xs">Belum ada data pengangkutan</div>
        ) : (
          data.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs text-slate-400">{d.pelanggan.kodePelanggan}</span>
                  <h3 className="font-bold text-slate-900 text-sm">{d.pelanggan.nama}</h3>
                  <p className="text-xs text-slate-500">{d.pelanggan.alamat}</p>
                  {d.zona?.nama && <p className="text-[11px] text-purple-600 font-semibold mt-0.5">🗺️ {d.zona.nama}</p>}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusInfo(d.status).color}`}>
                  {getStatusInfo(d.status).label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600 mt-2">
                <span>{formatDate(d.tanggal)}</span>
                {d.volume && <span>Volume: {d.volume} m³</span>}
                {d.berat && <span>Berat: {d.berat} kg</span>}
                {d.jenisSampah && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    {JENIS_SAMPAH.find((j) => j.value === d.jenisSampah)?.label}
                  </span>
                )}
                {d.petugas && <span>Petugas: {d.petugas.nama}</span>}
              </div>
              {d.catatan && <p className="text-xs text-slate-500 italic mt-2">{d.catatan}</p>}
              {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "petugas") && (
                <button
                  onClick={() => startEdit(d)}
                  className="mt-3 w-full text-center text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition shadow-2xs"
                >
                  Update Status
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Update Modal */}
      {updating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white">
              <h2 className="font-bold text-base tracking-wide">Update Pengangkutan</h2>
              <button
                onClick={() => setUpdating(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Pengangkutan</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Volume (m³)</label>
                  <input
                    type="number" step="0.1"
                    value={editForm.volume}
                    onChange={(e) => setEditForm({ ...editForm, volume: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Berat (kg)</label>
                  <input
                    type="number" step="0.1"
                    value={editForm.berat}
                    onChange={(e) => setEditForm({ ...editForm, berat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Sampah</label>
                <select
                  value={editForm.jenisSampah}
                  onChange={(e) => setEditForm({ ...editForm, jenisSampah: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                >
                  <option value="">Pilih jenis</option>
                  {JENIS_SAMPAH.map((j) => (
                    <option key={j.value} value={j.value}>{j.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kendaraan Pengangkut</label>
                <select
                  value={editForm.kendaraanId}
                  onChange={(e) => setEditForm({ ...editForm, kendaraanId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                >
                  <option value="">— {user?.role === "petugas" ? "Pilih kendaraan Anda" : "Tanpa kendaraan"} —</option>
                  {kendaraanSaya.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.jenis === "dump_truck" ? "🚛" : k.jenis === "pickup" ? "🛺" : "🛞"} {k.nama}
                      {k.platNomor ? ` · ${k.platNomor}` : ""}
                    </option>
                  ))}
                </select>
                {user?.role === "petugas" && editForm.status === "sudah_diambil" && !editForm.kendaraanId && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">Wajib pilih kendaraan untuk pickup</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Catatan</label>
                <textarea
                  value={editForm.catatan}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  rows={2}
                  placeholder="Kendala atau catatan..."
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUpdating(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate(updating)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-98 transition-all"
                >
                  Simpan Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
