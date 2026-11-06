"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  Truck,
  MapPin,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";

type KendaraanItem = {
  id: number;
  nama: string;
  platNomor: string | null;
};

type KomplainItem = {
  id: number;
  jenis: string;
  deskripsi: string;
  foto: string | null;
  status: string;
  tanggapan: string | null;
  createdAt: string;
  pelanggan: {
    id: number;
    nama: string;
    alamat: string;
    noTelepon: string | null;
    latitude: number | null;
    longitude: number | null;
    patokanLokasi: string | null;
    zona: string;
    blok: string;
  };
};

export default function MobilePengaduanArmada() {
  const [selectedKendaraanId, setSelectedKendaraanId] = useState<string>("");
  const [daftarKendaraan, setDaftarKendaraan] = useState<KendaraanItem[]>([]);
  const [tabStatus, setTabStatus] = useState<"aktif" | "selesai">("aktif");
  const [komplainList, setKomplainList] = useState<KomplainItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Selesaikan Komplain
  const [resolvingItem, setResolvingItem] = useState<KomplainItem | null>(null);
  const [tanggapanText, setTanggapanText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("o2w_kendaraan_id");
      if (saved) setSelectedKendaraanId(saved);
    }
  }, []);

  const loadKomplain = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedKendaraanId) params.set("kendaraanId", selectedKendaraanId);
      params.set("status", tabStatus);

      const res = await fetch(`/api/m/komplain-armada?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setKomplainList(d.komplain || []);
        setDaftarKendaraan(d.daftarKendaraan || []);
        if (!selectedKendaraanId && d.selectedKendaraanId) {
          setSelectedKendaraanId(String(d.selectedKendaraanId));
        }
      }
    } catch (err) {
      console.error("Gagal load komplain armada:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKomplain();
  }, [selectedKendaraanId, tabStatus]);

  const handleArmadaChange = (idStr: string) => {
    setSelectedKendaraanId(idStr);
    if (typeof window !== "undefined") {
      localStorage.setItem("o2w_kendaraan_id", idStr);
    }
  };

  const handleSelesaikan = async () => {
    if (!resolvingItem || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/m/komplain-armada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          komplainId: resolvingItem.id,
          status: "selesai",
          tanggapan: tanggapanText.trim() || "Sampah telah dijemput dan dituntaskan oleh armada.",
        }),
      });

      if (res.ok) {
        setToastMsg(`Komplain ${resolvingItem.pelanggan.nama} ditandai selesai!`);
        setResolvingItem(null);
        setTanggapanText("");
        loadKomplain();
      } else {
        alert("Gagal memperbarui status komplain");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-800 to-amber-900 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link
              href="/m"
              className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/90"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-base font-bold tracking-tight">Pengaduan Pelanggan</h1>
              <p className="text-[11px] text-rose-200">Keluhan warga di jalur armada ini</p>
            </div>
          </div>
          <button
            onClick={loadKomplain}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Pilih Armada & Tab Status */}
        <div className="mt-3 pt-3 border-t border-white/15 space-y-2.5">
          <div>
            <label className="text-[10px] font-semibold text-rose-200 uppercase tracking-wider block mb-1">
              Pilih Mobil Armada
            </label>
            <div className="relative">
              <select
                value={selectedKendaraanId}
                onChange={(e) => handleArmadaChange(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs font-bold rounded-lg px-2.5 py-2 pr-6 appearance-none shadow-sm focus:outline-none"
              >
                {daftarKendaraan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.platNomor || k.nama} ({k.nama})
                  </option>
                ))}
              </select>
              <Truck className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex bg-black/20 p-1 rounded-xl">
            <button
              onClick={() => setTabStatus("aktif")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tabStatus === "aktif" ? "bg-white text-rose-900 shadow-xs" : "text-white/80"
              }`}
            >
              Perlu Ditindaklanjuti
            </button>
            <button
              onClick={() => setTabStatus("selesai")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tabStatus === "selesai" ? "bg-white text-rose-900 shadow-xs" : "text-white/80"
              }`}
            >
              Riwayat Selesai
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="m-4 p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-between shadow-md">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List Komplain */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat pengaduan warga...</div>
        ) : komplainList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-slate-800">
              {tabStatus === "aktif" ? "Tidak Ada Pengaduan Aktif!" : "Belum Ada Riwayat Selesai"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tabStatus === "aktif"
                ? "Seluruh warga di jalur armada ini terlayani dengan baik."
                : "Komplain yang sudah Anda selesaikan akan muncul di sini."}
            </p>
          </div>
        ) : (
          komplainList.map((k) => (
            <div
              key={k.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      k.status === "selesai"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {k.status === "selesai" ? "Selesai" : "Butuh Penjemputan"}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {k.pelanggan.nama}
                  </h3>
                  <p className="text-[11px] text-slate-500">{k.pelanggan.alamat}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    📍 {k.pelanggan.zona} ({k.pelanggan.blok})
                  </p>
                </div>

                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                  {format(new Date(k.createdAt), "dd MMM HH:mm", { locale: id })}
                </span>
              </div>

              {/* Deskripsi & Foto */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-700">
                <p className="font-semibold text-rose-800 text-[11px] mb-1">
                  Keluhan: {k.jenis.replace("_", " ")}
                </p>
                <p>{k.deskripsi}</p>
                {k.tanggapan && (
                  <p className="mt-2 pt-2 border-t border-slate-200/80 text-emerald-700 font-medium text-[11px]">
                    Tanggapan Armada: {k.tanggapan}
                  </p>
                )}
              </div>

              {k.foto && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48">
                  <img src={k.foto} alt="Foto Komplain" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {/* Google Maps link */}
                <a
                  href={
                    k.pelanggan.latitude && k.pelanggan.longitude
                      ? `https://www.google.com/maps?q=${k.pelanggan.latitude},${k.pelanggan.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          k.pelanggan.alamat
                        )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Petunjuk Peta</span>
                </a>

                {/* WhatsApp call/chat */}
                {k.pelanggan.noTelepon && (
                  <a
                    href={`https://wa.me/${k.pelanggan.noTelepon.replace(/^0/, "62")}?text=${encodeURIComponent(
                      `Halo Bapak/Ibu ${k.pelanggan.nama}, kami dari Armada Pengangkut WastePay terkait laporan pengaduan sampah Anda...`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl flex items-center justify-center active:scale-98 transition-all"
                    title="Hubungi WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}

                {/* Tombol Selesaikan */}
                {k.status !== "selesai" && (
                  <button
                    onClick={() => {
                      setResolvingItem(k);
                      setTanggapanText("Sampah telah dijemput dan dituntaskan oleh armada.");
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selesaikan</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Selesaikan Komplain */}
      {resolvingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                Selesaikan Pengaduan Warga
              </h3>
              <button
                onClick={() => setResolvingItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">
                {resolvingItem.pelanggan.nama}
              </p>
              <p className="text-[11px] text-slate-500">{resolvingItem.pelanggan.alamat}</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Catatan Penanganan / Tanggapan
              </label>
              <textarea
                value={tanggapanText}
                onChange={(e) => setTanggapanText(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Tuliskan catatan, misal: Sampah sudah diangkut pukul 11:00..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResolvingItem(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSelesaikan}
                disabled={submitting}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                {submitting ? "Menyimpan..." : "Tandai Selesai ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
