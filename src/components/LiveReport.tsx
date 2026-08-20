"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = {
  onlinePetugas: number;
  onlineKendaraan: number;
  angkutHariIni: number;
  volumeHariIni: number;
  komplainBaru: number;
  pembayaranHariIni: number;
  nominalPembayaranHariIni: number;
  absensiHariIni: number;
};

type Activity = {
  id: string;
  tipe: string;
  waktu: string;
  judul: string;
  detail: string;
  aktor?: string;
};

type Props = {
  token?: string;
};

const TIPE_META: Record<string, { label: string; dot: string; text: string; badge: string }> = {
  angkut: { label: "ANGKUT", dot: "#4ade80", text: "text-green-300", badge: "bg-green-500/10 border-green-500/40" },
  komplain: { label: "KOMPLAIN", dot: "#f87171", text: "text-red-300", badge: "bg-red-500/10 border-red-500/40" },
  absensi: { label: "ABSENSI", dot: "#38bdf8", text: "text-sky-300", badge: "bg-sky-500/10 border-sky-500/40" },
  pembayaran: { label: "BAYAR", dot: "#facc15", text: "text-yellow-300", badge: "bg-yellow-500/10 border-yellow-500/40" },
  klaim: { label: "KLAIM", dot: "#fb923c", text: "text-orange-300", badge: "bg-orange-500/10 border-orange-500/40" },
  pengeluaran: { label: "KELUAR", dot: "#f472b6", text: "text-pink-300", badge: "bg-pink-500/10 border-pink-500/40" },
  pengumuman: { label: "INFO", dot: "#e5e7eb", text: "text-neutral-200", badge: "bg-neutral-500/10 border-neutral-500/40" },
  audit: { label: "ADMIN", dot: "#a78bfa", text: "text-violet-300", badge: "bg-violet-500/10 border-violet-500/40" },
  notifikasi: { label: "NOTIF", dot: "#2dd4bf", text: "text-teal-300", badge: "bg-teal-500/10 border-teal-500/40" },
};

function formatWaktuRelatif(iso: string): string {
  const dt = Date.now() - new Date(iso).getTime();
  if (dt < 60000) return "baru saja";
  if (dt < 3600000) return `${Math.floor(dt / 60000)} mnt lalu`;
  if (dt < 86400000) return `${Math.floor(dt / 3600000)} jam lalu`;
  return `${Math.floor(dt / 86400000)} hari lalu`;
}

function formatJam(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function LiveReport({ token }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [aktivitas, setAktivitas] = useState<Activity[]>([]);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [sekarang, setSekarang] = useState(() => new Date());
  const [error, setError] = useState(false);

  const ambil = useCallback(async () => {
    try {
      const url = token
        ? `/api/publik/live-report?t=${encodeURIComponent(token)}`
        : "/api/publik/live-report";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setAktivitas(data.aktivitas ?? []);
      setLastRefresh(Date.now());
      setError(false);
    } catch {
      setError(true);
    }
  }, [token]);

  useEffect(() => {
    ambil();
    const t = setInterval(ambil, 8000);
    return () => clearInterval(t);
  }, [ambil]);

  useEffect(() => {
    const t = setInterval(() => setSekarang(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const jam = sekarang.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const tanggal = sekarang.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const statCards: { label: string; value: string; dot: string; sub?: string }[] = stats
    ? [
        { label: "Petugas Online", value: String(stats.onlinePetugas), dot: "#4ade80" },
        { label: "Armada Online", value: String(stats.onlineKendaraan), dot: "#facc15" },
        { label: "Angkut Hari Ini", value: String(stats.angkutHariIni), dot: "#4ade80", sub: `${stats.volumeHariIni} m³` },
        { label: "Komplain Baru", value: String(stats.komplainBaru), dot: "#f87171" },
        { label: "Bayar Hari Ini", value: String(stats.pembayaranHariIni), dot: "#facc15", sub: rupiah(stats.nominalPembayaranHariIni) },
        { label: "Absensi Hari Ini", value: String(stats.absensiHariIni), dot: "#38bdf8" },
      ]
    : [];

  return (
    <div className="w-screen h-[100dvh] bg-[#0d0e10] text-white overflow-hidden flex flex-col font-sans">
      {/* ── Header ── */}
      <header className="shrink-0 flex items-start justify-between gap-4 px-5 sm:px-8 pt-5 sm:pt-7 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_#ef4444]" />
          <h1 className="font-black uppercase tracking-[0.15em] text-xl sm:text-3xl leading-none">
            Live Report — Semua Aktivitas
          </h1>
        </div>
        <div className="text-right">
          <div className="font-black text-2xl sm:text-4xl leading-none tabular-nums">{jam}</div>
          <div className="font-mono text-[11px] text-white/50 uppercase tracking-[0.2em] mt-1">
            {tanggal}
          </div>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-5 sm:px-8 py-3">
        {stats ? (
          statCards.map((c) => (
            <div
              key={c.label}
              className="bg-white/5 border border-white/15 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider">
                  {c.label}
                </span>
              </div>
              <div className="mt-1 font-black text-2xl tabular-nums leading-none">{c.value}</div>
              {c.sub && (
                <div className="font-mono text-[10px] text-white/40 mt-0.5">{c.sub}</div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full font-mono text-sm text-white/40 uppercase tracking-widest py-2">
            Memuat statistik…
          </div>
        )}
      </div>

      {/* ── Activity feed ── */}
      <div className="flex-1 overflow-hidden px-5 sm:px-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-black uppercase tracking-[0.2em] text-sm text-white/70">
            Alur Aktivitas
          </div>
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-wider">
            {error ? (
              <span className="text-red-400">gagal memuat — coba lagi…</span>
            ) : lastRefresh ? (
              <>update {new Date(lastRefresh).toLocaleTimeString("id-ID")}</>
            ) : (
              "memuat…"
            )}
          </div>
        </div>

        <div className="h-full overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {aktivitas.length === 0 && !error && (
            <div className="font-mono text-sm text-white/40 uppercase tracking-widest py-8 text-center">
              Belum ada aktivitas tercatat.
            </div>
          )}
          {aktivitas.map((a) => {
            const meta = TIPE_META[a.tipe] ?? TIPE_META.audit;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.dot }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-black uppercase text-[13px] leading-tight ${meta.text}`}>
                      {a.judul}
                    </span>
                    <span className="font-mono text-[10px] text-white/35 shrink-0 ml-auto">
                      {formatJam(a.waktu)}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-white/55 truncate">{a.detail}</div>
                </div>
                <span
                  className={`shrink-0 hidden sm:inline-block border px-1.5 py-0.5 font-black text-[9px] uppercase tracking-wider ${meta.badge} ${meta.text}`}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
