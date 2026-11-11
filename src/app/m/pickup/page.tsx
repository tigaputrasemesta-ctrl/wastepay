"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PackageCheck,
  MapPin,
  Phone,
  Navigation,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Truck,
  MessageCircle,
  ArrowLeft,
  X,
  Upload,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface KategoriPickup {
  id: number;
  kode: string;
  nama: string;
  satuanMuatan: string;
}

interface TugasPickup {
  id: number;
  noOrder: string;
  namaPemesan: string;
  noTelepon: string;
  alamat: string;
  patokan: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  latitude: number | null;
  longitude: number | null;
  estimasiMuatan: string;
  fotoSampah: string | null;
  tanggalJemput: string;
  waktuJemput: string | null;
  estimasiBiaya: number;
  biayaFinal: number | null;
  metodeBayar: string;
  statusBayar: string;
  status: string;
  catatanPetugas: string | null;
  fotoSelesai: string | null;
  kategoriPickup: KategoriPickup;
  kendaraan: { id: number; nama: string; platNomor: string | null; jenis: string } | null;
}

export default function MobilePickupPage() {
  const { showToast } = useToast();

  const [tugasList, setTugasList] = useState<TugasPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<"aktif" | "riwayat" | "semua">("aktif");

  // Petugas profile
  const [petugasNama, setPetugasNama] = useState<string>("");

  // Modal Selesai
  const [selectedTask, setSelectedTask] = useState<TugasPickup | null>(null);
  const [fotoSelesai, setFotoSelesai] = useState<string>("");
  const [catatanPetugas, setCatatanPetugas] = useState<string>("");
  const [bayarLunas, setBayarLunas] = useState<boolean>(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [submittingSelesai, setSubmittingSelesai] = useState(false);

  // Modal Preview Foto
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Fetch Tasks
  const fetchTugas = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/m/pickup/tugas?filter=${filterTab}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setTugasList(json.data);
        if (json.petugas?.nama) {
          setPetugasNama(json.petugas.nama);
        }
      } else {
        showToast(json.error || "Gagal memuat daftar tugas pickup", "error");
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterTab, showToast]);

  useEffect(() => {
    fetchTugas();
  }, [fetchTugas]);

  // Update Status to OTW
  const handleMulaiOtw = async (task: TugasPickup) => {
    try {
      const res = await fetch("/api/m/pickup/selesai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: task.id,
          status: "otw",
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("Status diubah ke OTW. Selamat bertugas!", "success");
        fetchTugas();
      } else {
        showToast(json.error || "Gagal update status", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    }
  };

  // Open Modal Selesai
  const openSelesaiModal = (task: TugasPickup) => {
    setSelectedTask(task);
    setFotoSelesai("");
    setCatatanPetugas("");
    setBayarLunas(task.statusBayar === "lunas" || task.metodeBayar === "cod");
  };

  // Upload Foto Bukti Selesai
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 5MB", "error");
      return;
    }

    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.ok && json.url) {
        setFotoSelesai(json.url);
        showToast("Foto bukti selesai berhasil diunggah", "success");
      } else {
        showToast(json.error || "Gagal mengunggah foto", "error");
      }
    } catch {
      showToast("Gagal upload foto ke server", "error");
    } finally {
      setUploadingFoto(false);
    }
  };

  // Submit Penjemputan Selesai
  const handleSimpanSelesai = async () => {
    if (!selectedTask) return;
    setSubmittingSelesai(true);
    try {
      const res = await fetch("/api/m/pickup/selesai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedTask.id,
          status: "selesai",
          fotoSelesai: fotoSelesai || null,
          catatanPetugas: catatanPetugas.trim() || null,
          statusBayar: bayarLunas ? "lunas" : selectedTask.statusBayar,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        showToast("Penjemputan berhasil diselesaikan!", "success");
        setSelectedTask(null);
        fetchTugas();
      } else {
        showToast(json.error || "Gagal menyelesaikan tugas", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setSubmittingSelesai(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-28">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/m"
              className="p-1.5 -ml-1.5 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Pickup Sampah Sekali Angkut</span>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                {petugasNama ? `Driver: ${petugasNama}` : "Penjemputan On-Demand"}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchTugas()}
            disabled={refreshing}
            className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
            title="Segarkan"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>

        {/* Tab Filter Filter Horizontal */}
        <div className="flex items-center gap-1 mt-2.5 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterTab("aktif")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              filterTab === "aktif"
                ? "bg-white dark:bg-zinc-900 text-teal-700 dark:text-teal-400 shadow-xs"
                : "text-slate-500 dark:text-zinc-400"
            }`}
          >
            Tugas Aktif
          </button>
          <button
            onClick={() => setFilterTab("riwayat")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              filterTab === "riwayat"
                ? "bg-white dark:bg-zinc-900 text-teal-700 dark:text-teal-400 shadow-xs"
                : "text-slate-500 dark:text-zinc-400"
            }`}
          >
            Riwayat
          </button>
          <button
            onClick={() => setFilterTab("semua")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              filterTab === "semua"
                ? "bg-white dark:bg-zinc-900 text-teal-700 dark:text-teal-400 shadow-xs"
                : "text-slate-500 dark:text-zinc-400"
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Task List Content */}
      <div className="p-4 space-y-3.5 max-w-lg mx-auto">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Memuat penugasan pickup...</p>
          </div>
        ) : tugasList.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
            <PackageCheck className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Tidak ada tugas penjemputan
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {filterTab === "aktif"
                ? "Belum ada tugas pickup aktif yang ditugaskan ke Anda."
                : "Tidak ada data pada tab ini."}
            </p>
          </div>
        ) : (
          tugasList.map((tugas) => {
            const isOtw = tugas.status === "otw";
            const isSelesai = tugas.status === "selesai";
            const waPhone = tugas.noTelepon.replace(/^0/, "62").replace(/[^0-9]/g, "");

            const mapsUrl =
              tugas.latitude && tugas.longitude
                ? `https://www.google.com/maps?q=${tugas.latitude},${tugas.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tugas.alamat)}`;

            return (
              <div
                key={tugas.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block">
                      {tugas.noOrder}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {tugas.kategoriPickup?.nama || "Pickup Sampah"}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      isSelesai
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : isOtw
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 animate-pulse"
                        : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                    }`}
                  >
                    {tugas.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Jadwal & Pemesan */}
                <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {tugas.tanggalJemput.slice(0, 10)}
                    </span>
                    <span className="capitalize text-slate-500 text-[11px]">
                      Waktu: {tugas.waktuJemput || "Fleksibel"}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                    <p className="font-bold text-slate-900 dark:text-white">{tugas.namaPemesan}</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {tugas.alamat}
                    </p>
                    {tugas.patokan && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        Patokan: {tugas.patokan}
                      </p>
                    )}
                  </div>
                </div>

                {/* Muatan & Biaya */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Muatan Sampah</span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                      {tugas.estimasiMuatan}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Biaya / Tarif</span>
                    <span className="font-black text-teal-700 dark:text-teal-400 text-sm">
                      Rp {(tugas.biayaFinal ?? tugas.estimasiBiaya).toLocaleString("id-ID")}
                    </span>
                    <span className="text-[9px] block text-slate-400 uppercase font-bold">
                      {tugas.metodeBayar} • {tugas.statusBayar === "lunas" ? "LUNAS" : "TAGIH DI TEMPAT"}
                    </span>
                  </div>
                </div>

                {/* Foto Sampah Preview Link */}
                {tugas.fotoSampah && (
                  <button
                    type="button"
                    onClick={() => setPreviewFoto(tugas.fotoSampah)}
                    className="w-full py-1.5 px-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Foto Sampah Calon Muatan</span>
                  </button>
                )}

                {/* Action Buttons Row */}
                {!isSelesai && (
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      {/* Navigasi Maps */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Buka Peta GPS</span>
                      </a>

                      {/* WhatsApp Pemesan */}
                      <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                          `Halo Kak ${tugas.namaPemesan}, saya supir armada UPS HERU sedang dalam perjalanan untuk penjemputan sampah No: ${tugas.noOrder}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-green-500 text-white rounded-xl active:scale-95 transition-all"
                        title="Chat WA Pemesan"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol OTW */}
                      {!isOtw && (
                        <button
                          onClick={() => handleMulaiOtw(tugas)}
                          className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Mulai Jalan (OTW)</span>
                        </button>
                      )}

                      {/* Tombol Selesai */}
                      <button
                        onClick={() => openSelesaiModal(tugas)}
                        className={`${
                          isOtw ? "w-full" : "flex-1"
                        } py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesaikan Muatan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL SELESAIKAN PENJEMPUTAN */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 block">
                  {selectedTask.noOrder}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Selesaikan Tugas Penjemputan
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Upload Foto Selesai */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Ambil Foto Muatan / Bukti Penjemputan *
                </label>
                {fotoSelesai ? (
                  <div className="relative rounded-2xl overflow-hidden h-40 bg-slate-100">
                    <img
                      src={fotoSelesai}
                      alt="Bukti selesai"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoSelesai("")}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 cursor-pointer hover:bg-teal-50 transition-all p-3">
                    <Camera className="w-8 h-8 text-teal-600 dark:text-teal-400 mb-1" />
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                      {uploadingFoto ? "Mengunggah foto..." : "Kamera / Pilih Foto Bukti"}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Format JPG/PNG, maks 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleUploadFoto}
                      className="hidden"
                      disabled={uploadingFoto}
                    />
                  </label>
                )}
              </div>

              {/* Catatan Lapangan */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Catatan Lapangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Muatan 10 karung puing berhasil dinaikkan ke dump truck..."
                  value={catatanPetugas}
                  onChange={(e) => setCatatanPetugas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Konfirmasi Pembayaran jika COD */}
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Biaya yang Diterima:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    Rp {(selectedTask.biayaFinal ?? selectedTask.estimasiBiaya).toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                  <input
                    type="checkbox"
                    id="bayarLunas"
                    checked={bayarLunas}
                    onChange={(e) => setBayarLunas(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="bayarLunas" className="font-bold text-slate-800 dark:text-zinc-200">
                    Uang tunai / pembayaran telah diterima (LUNAS)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanSelesai}
                disabled={submittingSelesai || uploadingFoto}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                {submittingSelesai ? "Menyimpan..." : "Konfirmasi Selesai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW FOTO MODAL */}
      {previewFoto && (
        <div
          onClick={() => setPreviewFoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="relative max-w-sm w-full bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden p-3 shadow-2xl">
            <button
              onClick={() => setPreviewFoto(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewFoto}
              alt="Foto Preview"
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
