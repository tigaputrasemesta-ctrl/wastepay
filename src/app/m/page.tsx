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
      <div className="bg-black text-white border-2 border-black p-4">
        <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-green-400">Selamat bekerja</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mt-1">
          {profil?.nama || "Petugas"}
        </h1>
        <p className="text-[11px] font-mono font-bold text-gray-300 mt-1">
          {jabatan.map((j) => j.toUpperCase()).join(" · ") || "PETUGAS"}
          {profil?.kelurahan ? ` · ${profil.kelurahan}` : ""}
        </p>
      </div>

      <div className="grid gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`${c.color} border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition flex items-center justify-between gap-3`}
          >
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-tight">{c.title}</p>
              <p className="text-[11px] font-bold opacity-70 mt-0.5">{c.desc}</p>
            </div>
            {c.badge && (
              <span className={`shrink-0 px-2 py-1 text-[10px] font-black uppercase border-2 border-black ${c.color === "bg-white text-black" ? "bg-black text-white" : "bg-white/20"}`}>
                {c.badge}
              </span>
            )}
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      <p className="text-center text-[10px] font-mono font-bold text-gray-400">
        TPS HERU · APK INTERNAL PETUGAS
      </p>
    </div>
  );
}
