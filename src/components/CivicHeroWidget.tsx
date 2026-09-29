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

export default function CivicHeroWidget() {
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
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden">
      {/* Console Top Bar (Mac/SaaS Browser Window Header) */}
      <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 pl-2 border-l border-slate-200">
            UPS HERU • Control Console
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0d7a75] bg-[#e6f5f4] px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0d7a75] animate-pulse" />
          <span>Sistem Aktif</span>
        </div>
      </div>

      {/* Mini KPI Highlights Row (Inspired by BeCycle Dashboard) */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-[#fbfdfd] px-2 py-2.5 text-center">
        <div className="px-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Olah Harian</span>
          <span className="text-sm font-extrabold text-slate-800">15.4 Ton</span>
        </div>
        <div className="px-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daur Ulang</span>
          <span className="text-sm font-extrabold text-[#0d7a75]">82.4%</span>
        </div>
        <div className="px-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pelanggan</span>
          <span className="text-sm font-extrabold text-slate-800">2.450+ KK</span>
        </div>
      </div>

      {/* Primary Tab Controls */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/70 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setTab("tagihan")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === "tagihan"
              ? "bg-white text-[#0d7a75] shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-[#0d7a75]" />
          <span>Cek Tagihan Warga</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("jadwal")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === "jadwal"
              ? "bg-white text-[#0d7a75] shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#0d7a75]" />
          <span>Jadwal Angkut Wilayah</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6 space-y-4">
        {tab === "tagihan" ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Status Iuran & Kwitansi Digital
                </h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  QRIS Instant
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Ketik nomor WhatsApp terdaftar atau ID pelanggan untuk melihat tagihan bulan ini.
              </p>
            </div>

            <form onSubmit={handleCekTagihan} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Contoh: 08123456789 atau DPK-001"
                  className="w-full h-11 px-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d7a75] focus:bg-white font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#0d7a75] hover:bg-[#0b6460] text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Periksa Tagihan Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-[#0d7a75] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terhubung WhatsApp Bot
              </span>
              <span>Kwitansi Otomatis Terbit</span>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Pilih Kelurahan Tempat Tinggal
                </h3>
                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Rute Terjadwal
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
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
                className="w-full h-11 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0d7a75]"
              >
                <option value="kalibaru">Kelurahan Kalibaru (Kec. Cilodong)</option>
                <option value="cilodong">Kelurahan Cilodong (Kec. Cilodong)</option>
                <option value="jatimulya">Kelurahan Jatimulya (Kec. Cilodong)</option>
                <option value="sukamaju">Kelurahan Sukamaju (Kec. Cilodong)</option>
                <option value="kalimulya">Kelurahan Kalimulya (Kec. Cilodong)</option>
              </select>
            </div>

            {/* Schedule Details Card */}
            <div className="bg-[#f8fafb] border border-slate-200/90 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Hari Penjemputan:</span>
                <span className="text-[#0d7a75] font-extrabold">{currentJadwal.hari}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Estimasi Jam Melintas:</span>
                <span className="text-slate-900 font-bold">{currentJadwal.waktu}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Jenis Armada:</span>
                <span className="text-slate-700 font-medium">{currentJadwal.armada}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/80">
                {currentJadwal.catatan}
              </p>
            </div>

            <Link
              href="/lacak"
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0d7a75]" />
              <span>Pantau Peta Live Truk Hari Ini</span>
            </Link>
          </>
        )}
      </div>

      {/* Widget Footer Status */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">Pusat Layanan: TPS 3R Kalibaru</span>
        <a
          href="https://wa.me/6281400782617"
          target="_blank"
          rel="noreferrer"
          className="text-[#0d7a75] font-bold hover:underline inline-flex items-center gap-1"
        >
          <PhoneCall className="w-3 h-3" />
          <span>Hotline CS 24 Jam</span>
        </a>
      </div>
    </div>
  );
}
