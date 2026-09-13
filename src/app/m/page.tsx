"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayLocalISO } from "@/lib/utils";
import { 
  MapPin, 
  ClipboardList, 
  Clock, 
  Receipt, 
  CheckCircle2, 
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Truck,
  Bell
} from "lucide-react";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
  kelurahan: string | null;
  aktif: boolean;
};

type StatusAbsen = { id: number; waktuMasuk: string | null; waktuSelesai: string | null; status: string } | null;

export default function MobileHome() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [absen, setAbsen] = useState<StatusAbsen>(null);
  const [jumlahTugas, setJumlahTugas] = useState<number | null>(null);
  const [jumlahCalon, setJumlahCalon] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/petugas/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfil)
      .catch(() => {});
    fetch("/api/absensi")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAbsen(d?.statusHariIni ?? null))
      .catch(() => {});
  }, []);

  const jabatan = (profil?.jabatan || "").split(",").filter(Boolean);
  const isAngkut = jabatan.includes("angkut");
  const isSurvei = jabatan.includes("survei");

  useEffect(() => {
    if (isAngkut) {
      const today = todayLocalISO();
      fetch(`/api/pengangkutan?saya=1&tanggal=${today}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setJumlahTugas(Array.isArray(d) ? d.length : 0))
        .catch(() => setJumlahTugas(0));
    }
    if (isSurvei) {
      fetch("/api/pelanggan?status=calon")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setJumlahCalon(Array.isArray(d) ? d.length : 0))
        .catch(() => setJumlahCalon(0));
    }
  }, [isAngkut, isSurvei]);

  const sudahMasuk = Boolean(absen?.waktuMasuk);
  const sudahSelesai = Boolean(absen?.waktuSelesai);

  return (
    <div className="space-y-3">
      {/* Attendance & Shift Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-3.5 shadow-sm border border-emerald-700/50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider block">
              Status Operasional
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  sudahSelesai ? "bg-sky-400" : sudahMasuk ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <p className="text-sm font-bold text-white truncate">
                {sudahSelesai ? "Shift Selesai" : sudahMasuk ? "Sedang Bertugas" : "Belum Absen Masuk"}
              </p>
            </div>
            <p className="text-[10px] text-emerald-200/80 mt-0.5 truncate">
              {profil?.kelurahan ? `Wilayah Kel. ${profil.kelurahan}` : "Armada Kota Depok"}
            </p>
          </div>

          <Link
            href="/m/absen"
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
              sudahSelesai
                ? "bg-white/20 text-white hover:bg-white/30"
                : sudahMasuk
                ? "bg-amber-500 hover:bg-amber-600 text-slate-900"
                : "bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95"
            }`}
          >
            {sudahSelesai ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Rekap</span>
              </>
            ) : sudahMasuk ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Akhiri Shift</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mulai Shift</span>
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {isAngkut && (
          <Link
            href="/m/angkut"
            className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs hover:border-emerald-300 transition-all flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 block truncate">Tugas Angkut</span>
              <span className="text-base font-extrabold text-slate-900 tabular-nums">
                {jumlahTugas !== null ? jumlahTugas : "-"}
              </span>
            </div>
          </Link>
        )}

        {isSurvei && (
          <Link
            href="/m/survei"
            className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs hover:border-indigo-300 transition-all flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 block truncate">Survei Calon</span>
              <span className="text-base font-extrabold text-slate-900 tabular-nums">
                {jumlahCalon !== null ? jumlahCalon : "-"}
              </span>
            </div>
          </Link>
        )}

        <Link
          href="/m/absen"
          className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs hover:border-sky-300 transition-all flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-medium text-slate-500 block truncate">Jam Masuk</span>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {sudahMasuk && absen?.waktuMasuk ? absen.waktuMasuk.slice(11, 16) : "--:--"}
            </span>
          </div>
        </Link>
      </div>

      {/* Main Apps Menu (Grid 2 Columns) */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Menu Lapangan
        </p>

        <div className="grid grid-cols-2 gap-2">
          {isAngkut && (
            <Link
              href="/m/angkut"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-emerald-400 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Tugas Angkut</p>
                <p className="text-[10px] text-slate-500 truncate">Rute jemputan & radar</p>
              </div>
            </Link>
          )}

          {isAngkut && (
            <Link
              href="/m/lapor"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-amber-400 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Lapor Cepat</p>
                <p className="text-[10px] text-slate-500 truncate">Catat jemputan & kendala</p>
              </div>
            </Link>
          )}

          {isSurvei && (
            <Link
              href="/m/survei"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-indigo-400 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Survei Warga</p>
                <p className="text-[10px] text-slate-500 truncate">Verifikasi calon pelanggan</p>
              </div>
            </Link>
          )}

          <Link
            href="/m/absen"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-sky-400 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Presensi GPS</p>
              <p className="text-[10px] text-slate-500 truncate">Jam masuk & pulang</p>
            </div>
          </Link>

          <Link
            href="/m/klaim"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-rose-400 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Klaim Biaya</p>
              <p className="text-[10px] text-slate-500 truncate">BBM, servis, & kas</p>
            </div>
          </Link>

          <Link
            href="/m/chat"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-violet-400 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Chat Admin</p>
              <p className="text-[10px] text-slate-500 truncate">Koordinasi & bantuan</p>
            </div>
          </Link>

          <Link
            href="/m/notifikasi"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-amber-400 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                <Bell className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Notifikasi</p>
              <p className="text-[10px] text-slate-500 truncate">Pengingat absen & tugas</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Fast Helpdesk Banner */}
      <div className="bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <p className="text-[10px] font-semibold text-slate-600 truncate">
            GPS armada aktif terhubung ke Command Center
          </p>
        </div>
        <Link
          href="/m/chat"
          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 shrink-0"
        >
          Hubungi Admin →
        </Link>
      </div>
    </div>
  );
}
