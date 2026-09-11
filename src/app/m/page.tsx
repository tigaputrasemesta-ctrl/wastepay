"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayLocalISO } from "@/lib/utils";


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

  const cards: { href: string; title: string; desc: string; badge?: string; color: string }[] = [];
  if (isAngkut) {
    cards.push({
      href: "/m/angkut",
      title: "Tugas Angkut Hari Ini",
      desc: "Daftar pelanggan + tandai pickup + live GPS",
      badge: jumlahTugas != null ? `${jumlahTugas} tugas` : "…",
      color: "bg-green-600 text-white",
    });
  }
  if (isSurvei) {
    cards.push({
      href: "/m/survei",
      title: "Survei Calon Pelanggan",
      desc: "Foto rumah + geotag + aktifkan",
      badge: jumlahCalon != null ? `${jumlahCalon} calon` : "…",
      color: "bg-amber-400 text-black",
    });
  }
  cards.push({
    href: "/m/klaim",
    title: "Klaim Pengeluaran",
    desc: "BBM, perawatan, lainnya + foto bukti",
    color: "bg-white text-black",
  });
  cards.push({
    href: "/m/absen",
    title: "Absensi GPS",
    desc: sudahMasuk ? (sudahSelesai ? "Hari ini sudah selesai" : "Sudah masuk — absen selesai saat pulang") : "Belum absen masuk hari ini",
    badge: sudahMasuk ? "✓ Masuk" : "Belum",
    color: "bg-white text-black",
  });

  return (
    <div className="space-y-4">
      {/* Hero Partner Card (GoPartner Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 shadow-lg">
        {/* Subtle background glow circle */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-[10px] font-bold text-emerald-100 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>SIAP OPERASIONAL</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              {profil?.nama || "Petugas Lapangan"}
            </h1>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              {profil?.kelurahan ? `Kel. ${profil.kelurahan}` : "Depok"} • {jabatan.join(", ") || "Operasional"}
            </p>
          </div>

          <div className="text-right shrink-0">
            <Link
              href="/m/absen"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-transform active:scale-95 ${
                sudahMasuk ? "bg-white text-emerald-800" : "bg-amber-400 text-amber-950 animate-bounce"
              }`}
            >
              {sudahMasuk ? "✓ Hadir" : "👉 Absen"}
            </Link>
          </div>
        </div>

        {/* Metric Quick Strip */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/15 text-center">
          <div className="bg-white/10 rounded-2xl py-2 px-1">
            <p className="text-[10px] text-emerald-100 font-medium">Tugas Angkut</p>
            <p className="text-base font-black mt-0.5">{jumlahTugas !== null ? jumlahTugas : "—"}</p>
          </div>
          <div className="bg-white/10 rounded-2xl py-2 px-1">
            <p className="text-[10px] text-emerald-100 font-medium">Calon Warga</p>
            <p className="text-base font-black mt-0.5">{jumlahCalon !== null ? jumlahCalon : "—"}</p>
          </div>
          <div className="bg-white/10 rounded-2xl py-2 px-1">
            <p className="text-[10px] text-emerald-100 font-medium">Presensi</p>
            <p className="text-xs font-bold mt-1 truncate">{sudahMasuk ? "Sudah Absen" : "Belum"}</p>
          </div>
        </div>
      </div>

      {/* Action Cards Grid */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Menu Utama Petugas
        </p>

        {isAngkut && (
          <Link
            href="/m/angkut"
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM3 4h3l2.5 7h9l3-6H7M5 13h13a2 2 0 002-2V7a2 2 0 00-2-2H8" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 truncate">Tugas Angkut Sampah</h2>
                  {jumlahTugas != null && jumlahTugas > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                      {jumlahTugas} Warga
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Daftar pickup pelanggan, rute maps & bukti foto
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {isSurvei && (
          <Link
            href="/m/survei"
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-300 active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 truncate">Survei Calon Pelanggan</h2>
                  {jumlahCalon != null && jumlahCalon > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                      {jumlahCalon} Calon
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Verifikasi lokasi rumah, geotag & penetapan paket
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <Link
          href="/m/absen"
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 truncate">Absensi GPS Harian</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${sudahMasuk ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                  {sudahMasuk ? "Sudah Masuk" : "Belum Masuk"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {sudahMasuk ? (sudahSelesai ? "Tugas hari ini telah selesai" : "Masuk tercatat, absen pulang saat selesai") : "Kirim presensi & radius GPS tugas"}
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/m/klaim"
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">Klaim BBM & Operasional</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Catat pengeluaran bensin, tol, perawatan armada
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="text-center pt-2">
        <p className="text-[11px] font-medium text-slate-400">
          UPS HERU Partner v2.0 • Kota Depok
        </p>
      </div>
    </div>
  );
}
