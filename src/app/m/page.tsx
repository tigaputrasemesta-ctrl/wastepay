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
  UserCircle
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
    <div className="bg-slate-50 min-h-dvh">
      {/* Header Profile Section */}
      <div className="bg-emerald-700 text-white px-5 pt-8 pb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <UserCircle className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {profil?.nama || "Memuat..."}
              </h1>
              <p className="text-sm text-emerald-100/90 font-medium">
                {profil?.kelurahan ? `Kel. ${profil.kelurahan}` : "Depok"} • {jabatan.join(", ") || "Petugas"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button & Status */}
        <div className="bg-white/10 rounded-xl p-4 border border-white/15 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-100 mb-1 font-medium">Status Kehadiran</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sudahMasuk ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              <span className="text-sm font-semibold">
                {sudahMasuk ? "Aktif Bertugas" : "Belum Absen"}
              </span>
            </div>
          </div>
          <Link
            href="/m/absen"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              sudahMasuk 
                ? "bg-emerald-700 text-white border border-emerald-600 hover:bg-emerald-800" 
                : "bg-white text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {sudahMasuk ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Terdata
              </>
            ) : (
              "Mulai Shift"
            )}
          </Link>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Metric Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Tugas Angkut</p>
            <p className="text-2xl font-bold text-slate-900">
              {jumlahTugas !== null ? jumlahTugas : "-"}
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Survei Warga</p>
            <p className="text-2xl font-bold text-slate-900">
              {jumlahCalon !== null ? jumlahCalon : "-"}
            </p>
          </div>
        </div>

        {/* Menu Section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 px-1">
            Menu Operasional
          </p>
          <div className="space-y-3">
            {isAngkut && (
              <Link
                href="/m/angkut"
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Tugas Angkut</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Daftar pickup & rute harian</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            )}

            {isSurvei && (
              <Link
                href="/m/survei"
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Survei Warga</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Verifikasi & penetapan paket</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            )}

            <Link
              href="/m/absen"
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Presensi</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Riwayat kehadiran & GPS</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>

            <Link
              href="/m/klaim"
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Klaim Biaya</h2>
                  <p className="text-xs text-slate-500 mt-0.5">BBM, tol, & perawatan</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
