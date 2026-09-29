"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, MapPin, ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";

interface ScheduleInfo {
  hari: string;
  waktu: string;
  armada: string;
  catatan: string;
}

const JADWAL_WILAYAH: Record<string, ScheduleInfo> = {
  kalibaru: {
    hari: "Senin, Rabu, Jumat",
    waktu: "Pagi (07.00 - 11.30 WIB)",
    armada: "Truk Pickup & Motor Roda 3",
    catatan: "Zona inti sekitar TPS 3R Kandang Ayam & Jl. Kalibaru Raya",
  },
  cilodong: {
    hari: "Selasa, Kamis, Sabtu",
    waktu: "Pagi (07.00 - 12.00 WIB)",
    armada: "Truk Pickup & Motor Roda 3",
    catatan: "Wilayah pemukiman warga & ruko Jl. Raya Cilodong",
  },
  jatimulya: {
    hari: "Senin, Rabu, Jumat",
    waktu: "Siang (13.00 - 16.30 WIB)",
    armada: "Pickup Kebersihan",
    catatan: "Area perumahan cluster & perkampungan terdaftar",
  },
  sukamaju: {
    hari: "Selasa, Kamis, Sabtu",
    waktu: "Siang (13.00 - 17.00 WIB)",
    armada: "Pickup Kebersihan",
    catatan: "Jalur poros Jl. Tole Iskandar & sekitarnya",
  },
  kalimulya: {
    hari: "Senin, Kamis, Sabtu",
    waktu: "Pagi (07.30 - 11.30 WIB)",
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setTab("tagihan")}
          className={`flex-1 py-3 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${
            tab === "tagihan"
              ? "border-emerald-700 text-emerald-800 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-emerald-700" />
          <span>Cek Tagihan Warga</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("jadwal")}
          className={`flex-1 py-3 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 border-b-2 ${
            tab === "jadwal"
              ? "border-emerald-700 text-emerald-800 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
          <span>Jadwal Angkut Wilayah</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {tab === "tagihan" ? (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Periksa Status Iuran & Unduh Kwitansi
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan nomor WhatsApp terdaftar atau ID pelanggan untuk melihat tagihan bulan berjalan.
              </p>
            </div>

            <form onSubmit={handleCekTagihan} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Contoh: 08123456789 atau DPK-001"
                  className="w-full h-11 px-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Cari Data Tagihan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bayar QRIS Otomatis
              </span>
              <span>Terhubung WhatsApp Bot</span>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Pilih Kelurahan Anda
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cek jadwal rutin penjemputan sampah rumah tangga berdasarkan zona rute.
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
                className="w-full h-11 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="kalibaru">Kelurahan Kalibaru (Kec. Cilodong)</option>
                <option value="cilodong">Kelurahan Cilodong (Kec. Cilodong)</option>
                <option value="jatimulya">Kelurahan Jatimulya (Kec. Cilodong)</option>
                <option value="sukamaju">Kelurahan Sukamaju (Kec. Cilodong)</option>
                <option value="kalimulya">Kelurahan Kalimulya (Kec. Cilodong)</option>
              </select>
            </div>

            {/* Schedule Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Hari Penjemputan:</span>
                <span className="text-emerald-800 font-bold">{currentJadwal.hari}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Estimasi Waktu:</span>
                <span className="text-slate-900 font-bold">{currentJadwal.waktu}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Jenis Armada:</span>
                <span className="text-slate-700 font-medium">{currentJadwal.armada}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                {currentJadwal.catatan}
              </p>
            </div>

            <Link
              href="/lacak"
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Pantau Peta Live Truk Hari Ini</span>
            </Link>
          </>
        )}
      </div>

      {/* Widget Footer Note */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">Pusat Layanan: TPS 3R Kalibaru</span>
        <a
          href="https://wa.me/6281400782617"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
        >
          <PhoneCall className="w-3 h-3" />
          <span>Bantuan CS</span>
        </a>
      </div>
    </div>
  );
}
