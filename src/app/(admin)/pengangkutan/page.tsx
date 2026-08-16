"use client";

import { useState, useEffect, useCallback } from "react";
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
        <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Pengangkutan</h1>
        <p className="text-sm text-gray-600 font-bold mt-1">
          {user?.role === "petugas" ? "Tugas pengangkutan hari ini" : "Riwayat pengangkutan sampah"}
        </p>
      </div>

      {/* Filter - compact for mobile */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm flex-1 min-w-[140px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border-2 border-black rounded-none text-sm flex-1 min-w-[120px]"
        >
          <option value="">Semua</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white font-black border-b border-2 border-black">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Volume</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Petugas</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Catatan</th>
                {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "petugas") && (
                  <th className="text-center px-4 py-3 font-medium text-gray-600 font-bold">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada data</td></tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="border-b border-2 border-black hover:bg-gray-100 border-2 border-black">
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">{formatDate(d.tanggal)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 font-bold">{d.pelanggan.kodePelanggan}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-black font-black">{d.pelanggan.nama}</div>
                      <div className="text-xs text-gray-600 font-bold">{d.pelanggan.alamat}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">
                      {d.volume ? `${d.volume} m³` : "-"}
                      {d.berat ? ` / ${d.berat} kg` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs">
                      {d.jenisSampah ? JENIS_SAMPAH.find((j) => j.value === d.jenisSampah)?.label || d.jenisSampah : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold">{d.petugas?.nama || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium ${getStatusInfo(d.status).color}`}>
                        {getStatusInfo(d.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold text-xs max-w-[150px] truncate">{d.catatan || "-"}</td>
                    {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "petugas") && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => startEdit(d)}
                          className="text-xs bg-gray-100 border-2 border-black text-indigo-700 px-2 py-1 rounded-none hover:bg-indigo-200 transition"
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
          <div className="text-center text-gray-400 font-bold py-8">Memuat...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-gray-400 font-bold py-8">Belum ada data</div>
        ) : (
          data.map((d) => (
            <div key={d.id} className="hm-card bg-white p-0 overflow-hidden p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs text-gray-400 font-bold">{d.pelanggan.kodePelanggan}</span>
                  <h3 className="font-semibold text-black font-black">{d.pelanggan.nama}</h3>
                  <p className="text-xs text-gray-600 font-bold">{d.pelanggan.alamat}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-none-full text-xs font-medium ${getStatusInfo(d.status).color}`}>
                  {getStatusInfo(d.status).label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600 font-bold mt-2">
                <span>{formatDate(d.tanggal)}</span>
                {d.volume && <span>Volume: {d.volume} m³</span>}
                {d.berat && <span>Berat: {d.berat} kg</span>}
                {d.jenisSampah && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-none-full bg-emerald-400/10 text-emerald-400 border border-emerald-500/30">
                    {JENIS_SAMPAH.find((j) => j.value === d.jenisSampah)?.label}
                  </span>
                )}
                {d.petugas && <span>Petugas: {d.petugas.nama}</span>}
              </div>
              {d.catatan && <p className="text-xs text-gray-600 font-bold mt-2 italic">{d.catatan}</p>}
              {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "petugas") && (
                <button
                  onClick={() => startEdit(d)}
                  className="mt-3 w-full text-center text-sm bg-indigo-50 text-indigo-700 py-2 rounded-none hover:bg-gray-100 border-2 border-black transition"
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-2 border-black">
              <h2 className="font-semibold text-black font-black">Update Pengangkutan</h2>
              <button onClick={() => setUpdating(null)} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Volume (m³)</label>
                  <input
                    type="number" step="0.1"
                    value={editForm.volume}
                    onChange={(e) => setEditForm({ ...editForm, volume: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Berat (kg)</label>
                  <input
                    type="number" step="0.1"
                    value={editForm.berat}
                    onChange={(e) => setEditForm({ ...editForm, berat: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Jenis Sampah</label>
                <select
                  value={editForm.jenisSampah}
                  onChange={(e) => setEditForm({ ...editForm, jenisSampah: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                >
                  <option value="">Pilih jenis</option>
                  {JENIS_SAMPAH.map((j) => (
                    <option key={j.value} value={j.value}>{j.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Kendaraan Pengangkut</label>
                <select
                  value={editForm.kendaraanId}
                  onChange={(e) => setEditForm({ ...editForm, kendaraanId: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
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
                  <p className="text-[11px] text-red-600 mt-1">Wajib pilih kendaraan untuk pickup</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Catatan</label>
                <textarea
                  value={editForm.catatan}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-none text-sm"
                  rows={2}
                  placeholder="Kendala atau catatan"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdating(null)}
                  className="flex-1 px-4 py-2 border-2 border-black rounded-none text-sm text-gray-600 font-bold hover:bg-gray-100 border-2 border-black"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate(updating)}
                  className="flex-1 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 text-black rounded-none text-sm hover:bg-green-300"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
