"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Calendar,
  MapPin,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Activity,
  Truck,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface ScheduleInfo {
  hari: string;
  waktu: string;
  armada: string;
  catatan: string;
  kelurahanName: string;
}

const JADWAL_WILAYAH: Record<string, ScheduleInfo> = {
  kalibaru: {
    kelurahanName: "Kelurahan Kalibaru",
    hari: "Senin, Rabu, Jumat",
    waktu: "Pagi (07.00 – 11.30 WIB)",
    armada: "Truk Pickup & Motor Roda 3",
    catatan: "Zona inti sekitar TPS 3R Kandang Ayam & Jl. Kalibaru Raya",
  },
  cilodong: {
    kelurahanName: "Kelurahan Cilodong",
    hari: "Selasa, Kamis, Sabtu",
    waktu: "Pagi (07.00 – 12.00 WIB)",
    armada: "Truk Pickup & Motor Roda 3",
    catatan: "Wilayah pemukiman warga & ruko Jl. Raya Cilodong",
  },
  jatimulya: {
    kelurahanName: "Kelurahan Jatimulya",
    hari: "Senin, Rabu, Jumat",
    waktu: "Siang (13.00 – 16.30 WIB)",
    armada: "Pickup Kebersihan",
    catatan: "Area perumahan cluster & perkampungan terdaftar",
  },
  sukamaju: {
    kelurahanName: "Kelurahan Sukamaju",
    hari: "Selasa, Kamis, Sabtu",
    waktu: "Siang (13.00 – 17.00 WIB)",
    armada: "Pickup Kebersihan",
    catatan: "Jalur poros Jl. Tole Iskandar & sekitarnya",
  },
  kalimulya: {
    kelurahanName: "Kelurahan Kalimulya",
    hari: "Senin, Kamis, Sabtu",
    waktu: "Pagi (07.30 – 11.30 WIB)",
    armada: "Motor Roda 3 & Pickup",
    catatan: "Kawasan pemukiman Kalimulya & Kebon Duren",
  },
};

export default function CivicHeroWidget({
  brandName = "UPS HERU",
  whatsappDigits = "6281400782617",
}: {
  brandName?: string;
  whatsappDigits?: string;
}) {
  const [tab, setTab] = useState<"tagihan" | "jadwal">("tagihan");
  const [inputVal, setInputVal] = useState("");
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>("kalibaru");
  const router = useRouter();

  const handleCekTagihan = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;
    router.push(`/bayar?kode=${encodeURIComponent(query)}`);
  };

  const currentJadwal = JADWAL_WILAYAH[selectedKelurahan] || JADWAL_WILAYAH.kalibaru;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden transition-colors">
      {/* Console Top Bar */}
      <div className="bg-slate-100/80 dark:bg-zinc-950 px-4 py-2.5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 pl-2 border-l border-slate-200 dark:border-zinc-800 truncate">
            {brandName} <span className="hidden sm:inline">• Control Console</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0c3d3a] dark:text-emerald-300 bg-[#e6f5f4] dark:bg-emerald-950/60 px-2 py-0.5 rounded-md shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0c3d3a] dark:bg-emerald-400 animate-pulse" />
          <span>Sistem Aktif</span>
        </div>
      </div>

      {/* Mini KPI Highlights Row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-zinc-800 border-b border-slate-100 dark:border-zinc-800 bg-[#fbfdfd] dark:bg-zinc-900/80 px-2 py-2.5 text-center">
        <div className="px-1.5 sm:px-2">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Olah Harian</span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100">15.4 Ton</span>
        </div>
        <div className="px-1.5 sm:px-2">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Daur Ulang</span>
          <span className="text-xs sm:text-sm font-extrabold text-[#0c3d3a] dark:text-emerald-400">82.4%</span>
        </div>
        <div className="px-1.5 sm:px-2">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Pelanggan</span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100">2.450+ KK</span>
        </div>
      </div>

      {/* Primary Tab Controls */}
      <div className="flex border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setTab("tagihan")}
          className={`flex-1 min-h-[44px] py-2.5 px-2.5 sm:px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
            tab === "tagihan"
              ? "bg-white dark:bg-zinc-800 text-[#0c3d3a] dark:text-emerald-300 shadow-sm border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/50"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-[#0c3d3a] dark:text-emerald-400 shrink-0" />
          <span>Cek Tagihan<span className="hidden sm:inline"> Warga</span></span>
        </button>
        <button
          type="button"
          onClick={() => setTab("jadwal")}
          className={`flex-1 min-h-[44px] py-2.5 px-2.5 sm:px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
            tab === "jadwal"
              ? "bg-white dark:bg-zinc-800 text-[#0c3d3a] dark:text-emerald-300 shadow-sm border border-slate-200/80 dark:border-zinc-700"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#0c3d3a] dark:text-emerald-400 shrink-0" />
          <span>Jadwal Angkut<span className="hidden sm:inline"> Wilayah</span></span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6 space-y-4">
        {tab === "tagihan" ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Status Iuran & Kwitansi Digital
                </h3>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  QRIS Instant
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                Ketik nomor WhatsApp terdaftar atau ID pelanggan untuk melihat tagihan bulan ini.
              </p>
            </div>

            <form onSubmit={handleCekTagihan} className="space-y-3">
              <div className="relative">
                <label htmlFor="civic-bill-lookup" className="sr-only">
                  Nomor WhatsApp atau ID Pelanggan
                </label>
                <input
                  id="civic-bill-lookup"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Contoh: 08123456789 atau DPK-001"
                  className="w-full min-h-[44px] px-3.5 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:bg-white dark:focus:bg-zinc-900 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Periksa Tagihan Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center text-xs text-slate-600 dark:text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terhubung WhatsApp Bot
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Pilih Kelurahan Tempat Tinggal
                </h3>
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                  Rute Terjadwal
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                Pilih kelurahan Anda untuk memeriksa hari penjemputan rutin armada truk/pickup.
              </p>
            </div>

            <div>
              <label htmlFor="kelurahan-select" className="sr-only">
                Pilih Kelurahan
              </label>
              <select
                id="kelurahan-select"
                value={selectedKelurahan}
                onChange={(e) => setSelectedKelurahan(e.target.value)}
                className="w-full min-h-[44px] px-3 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="kalibaru">Kelurahan Kalibaru (Kec. Cilodong)</option>
                <option value="cilodong">Kelurahan Cilodong (Kec. Cilodong)</option>
                <option value="jatimulya">Kelurahan Jatimulya (Kec. Cilodong)</option>
                <option value="sukamaju">Kelurahan Sukamaju (Kec. Cilodong)</option>
                <option value="kalimulya">Kelurahan Kalimulya (Kec. Cilodong)</option>
              </select>
            </div>

            {/* Schedule Details Card */}
            <div className="bg-[#f8fafb] dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 xs:gap-2">
                <span className="text-slate-600 dark:text-zinc-400 font-medium">Hari Penjemputan:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{currentJadwal.hari}</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 xs:gap-2">
                <span className="text-slate-600 dark:text-zinc-400 font-medium">Estimasi Jam Melintas:</span>
                <span className="text-slate-900 dark:text-zinc-100 font-bold">{currentJadwal.waktu}</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 xs:gap-2">
                <span className="text-slate-600 dark:text-zinc-400 font-medium">Jenis Armada:</span>
                <span className="text-slate-700 dark:text-zinc-300 font-medium">{currentJadwal.armada}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 pt-1.5 border-t border-slate-200/80 dark:border-zinc-800">
                {currentJadwal.catatan}
              </p>
            </div>

            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Halo ${brandName}, apakah truk sampah hari ini sudah melintas di lingkungan saya?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Konfirmasi Posisi Truk via WhatsApp</span>
            </a>
          </>
        )}
      </div>

      {/* Widget Footer Status */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-950/60 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-end text-xs text-slate-500">
        <a
          href={`https://wa.me/${whatsappDigits}`}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
        >
          <PhoneCall className="w-3 h-3" />
          <span>Hotline CS 24 Jam</span>
        </a>
      </div>
    </div>
  );
}
