"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { todayLocalISO } from "@/lib/utils";
import {
  Truck,
  Calendar,
  CheckCircle2,
  XCircle,
  Home,
  Clock,
  Share2,
  ChevronLeft,
  RefreshCw,
  MapPin,
  TrendingUp,
} from "lucide-react";

type KendaraanItem = {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
};

type ReportData = {
  tanggal: string;
  hari: string;
  kendaraan: KendaraanItem;
  daftarKendaraan: KendaraanItem[];
  rute: {
    id: number;
    nama: string;
    hari: string;
    zonas: string[];
  } | null;
  ringkasan: {
    totalTarget: number;
    diambil: number;
    kosong: number;
    tidakDiangkut: number;
    belumDiambil: number;
    persentase: number;
    totalVolume: number;
    totalBerat: number;
  };
  tugasTerbaru: Array<{
    id: number;
    status: string;
    pelangganNama: string;
    alamat: string;
    zona: string;
    petugasNama: string;
    jam: string;
    catatan?: string | null;
  }>;
};

export default function MobileReportArmada() {
  const [tanggal, setTanggal] = useState(todayLocalISO());
  const [selectedKendaraanId, setSelectedKendaraanId] = useState<string>("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load armada yang tersimpan di localStorage saat pertama buka
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("o2w_kendaraan_id");
      if (saved) setSelectedKendaraanId(saved);
    }
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tanggal", tanggal);
      if (selectedKendaraanId) params.set("kendaraanId", selectedKendaraanId);

      const res = await fetch(`/api/m/report-armada?${params.toString()}`);
      if (res.ok) {
        const json: ReportData = await res.json();
        setData(json);
        if (!selectedKendaraanId && json.kendaraan) {
          setSelectedKendaraanId(String(json.kendaraan.id));
        }
      }
    } catch (err) {
      console.error("Gagal load report armada:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [tanggal, selectedKendaraanId]);

  const handleArmadaChange = (idStr: string) => {
    setSelectedKendaraanId(idStr);
    if (typeof window !== "undefined") {
      localStorage.setItem("o2w_kendaraan_id", idStr);
    }
  };

  const shareWhatsApp = () => {
    if (!data) return;
    const r = data.ringkasan;
    const tglIndo = format(new Date(`${data.tanggal}T00:00:00`), "EEEE, dd MMMM yyyy", { locale: id });
    const text = `*LAPORAN PENGANGKUTAN HARIAN ARMADA*
━━━━━━━━━━━━━━━━━━━━
📅 *Hari/Tgl*: ${tglIndo}
🚛 *Armada*: ${data.kendaraan.platNomor || data.kendaraan.nama} (${data.kendaraan.nama})
🛣️ *Jalur*: ${data.rute?.nama || "Patroli Rute"}
📍 *Zona*: ${data.rute?.zonas.join(", ") || "-"}

*HASIL PENJEMPUTAN*:
🎯 Target Titik: ${r.totalTarget} Rumah
✅ Berhasil Diangkut: ${r.diambil} Rumah
🏠 Rumah Kosong: ${r.kosong} Rumah
❌ Tidak Terangkut: ${r.tidakDiangkut} Rumah
⏳ Belum Selesai: ${r.belumDiambil} Rumah
📈 *Capaian Selesai*: ${r.persentase}%

_Laporan resmi sistem operasional WastePay_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link
              href="/m"
              className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/90"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-base font-bold tracking-tight">Report Harian Armada</h1>
              <p className="text-[11px] text-emerald-200">Rekap rit & penjemputan mobil</p>
            </div>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Armada & Tanggal */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/15">
          <div>
            <label className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider block mb-1">
              Pilih Mobil
            </label>
            <div className="relative">
              <select
                value={selectedKendaraanId}
                onChange={(e) => handleArmadaChange(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs font-bold rounded-lg px-2.5 py-2 pr-6 appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {data?.daftarKendaraan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.platNomor || k.nama} ({k.nama})
                  </option>
                ))}
              </select>
              <Truck className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider block mb-1">
              Tanggal
            </label>
            <div className="relative">
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs font-bold rounded-lg px-2.5 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Jalur Aktif Hari Tersebut */}
        {data?.rute && (
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Jalur Layanan ({data.hari})
                </p>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {data.rute.nama}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  Zona: {data.rute.zonas.join(", ") || "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar & Capaian */}
        {data && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Progress Rit Hari Ini
              </span>
              <span className="text-lg font-black text-emerald-700">
                {data.ringkasan.persentase}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${
                    data.ringkasan.totalTarget > 0
                      ? (data.ringkasan.diambil / data.ringkasan.totalTarget) * 100
                      : 0
                  }%`,
                }}
                title="Diambil"
              />
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{
                  width: `${
                    data.ringkasan.totalTarget > 0
                      ? (data.ringkasan.kosong / data.ringkasan.totalTarget) * 100
                      : 0
                  }%`,
                }}
                title="Rumah Kosong"
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{
                  width: `${
                    data.ringkasan.totalTarget > 0
                      ? (data.ringkasan.tidakDiangkut / data.ringkasan.totalTarget) * 100
                      : 0
                  }%`,
                }}
                title="Tidak Diangkut"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-medium">
              <span>Selesai: {data.ringkasan.diambil + data.ringkasan.kosong} rumah</span>
              <span>Target: {data.ringkasan.totalTarget} rumah</span>
            </div>
          </div>
        )}

        {/* Kartu Ringkasan 4 Kotak */}
        {data && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800">Berhasil Diambil</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-900 mt-1">
                {data.ringkasan.diambil}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Rumah selesai dijemput</p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800">Rumah Kosong</span>
                <Home className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-900 mt-1">
                {data.ringkasan.kosong}
              </p>
              <p className="text-[10px] text-amber-600 mt-0.5">Nihil / tidak ada sampah</p>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800">Tidak Terangkut</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-900 mt-1">
                {data.ringkasan.tidakDiangkut}
              </p>
              <p className="text-[10px] text-rose-600 mt-0.5">Terkendala portal/akses</p>
            </div>

            <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-800">Sisa Tugas</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-2xl font-black text-sky-900 mt-1">
                {data.ringkasan.belumDiambil}
              </p>
              <p className="text-[10px] text-sky-600 mt-0.5">Menunggu penjemputan</p>
            </div>
          </div>
        )}

        {/* Tombol Bagikan WhatsApp */}
        {data && data.ringkasan.totalTarget > 0 && (
          <button
            onClick={shareWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Laporan ke WhatsApp</span>
          </button>
        )}

        {/* Riwayat Titik Pengangkutan Terbaru */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Aktivitas Penjemputan Terbaru
          </h2>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Memuat data rit...</div>
          ) : !data || data.tugasTerbaru.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada aktivitas penjemputan untuk tanggal & armada ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.tugasTerbaru.map((t) => (
                <div key={t.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {t.pelangganNama}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{t.alamat}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                        {t.zona}
                      </span>
                      {t.catatan && (
                        <span className="text-[9px] text-amber-700 italic">
                          &quot;{t.catatan}&quot;
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        t.status === "diambil"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.status === "kosong"
                          ? "bg-amber-100 text-amber-800"
                          : t.status === "tidak_diangkut"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{t.jam} WIB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
