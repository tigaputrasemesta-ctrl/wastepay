"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import type { NotificationSummaryResponse } from "@/app/api/notifikasi/summary/route";

function waktuLalu(dateString: string): string {
  const now = new Date().getTime();
  const past = new Date(dateString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSummary = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/notifikasi/summary", { cache: "no-store" });
      if (res.ok) {
        const data: NotificationSummaryResponse = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Gagal mengambil notifikasi:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Polling otomatis setiap 30 detik (hanya saat tab aktif)
  useEffect(() => {
    fetchSummary();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSummary();
      }
    }, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSummary();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchSummary]);

  // Click outside & Escape key listeners
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const totalCount = summary?.totalCount || 0;
  const counts = summary?.counts || { pembayaran: 0, pendaftaran: 0, komplain: 0 };
  const items = summary?.items || [];

  return (
    <div className="relative" ref={containerRef}>
      {/* Tombol Lonceng */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Notifikasi pending (${totalCount})`}
        className={`relative w-9 h-9 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
          isOpen
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-xs"
            : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700"
        }`}
      >
        <Bell className="w-4 h-4 text-slate-700 dark:text-zinc-300" />

        {/* Badge Hitungan Merah / Animasi Ping */}
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white font-bold text-[9px] items-center justify-center shadow-xs">
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          </span>
        )}
      </button>

      {/* Panel Dropdown Notifikasi */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 text-slate-800 dark:text-zinc-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Panel */}
          <div className="bg-slate-900 dark:bg-zinc-950 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wide">
                🔔 Notifikasi Butuh Aksi
              </span>
              {totalCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchSummary(true)}
                disabled={refreshing}
                title="Segarkan data"
                aria-label="Segarkan notifikasi"
                className="p-1.5 hover:bg-slate-800 dark:hover:bg-zinc-900 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup panel"
                className="p-1.5 hover:bg-slate-800 dark:hover:bg-zinc-900 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Kategori / Ringkasan Angka */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-zinc-950/70 border-b border-slate-100 dark:border-zinc-800 text-xs">
            <Link
              href="/tagihan"
              onClick={() => setIsOpen(false)}
              className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center justify-center hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 shadow-xs transition-all"
            >
              <span className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium">BAYAR PENDING</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{counts.pembayaran}</span>
            </Link>
            <Link
              href="/pelanggan"
              onClick={() => setIsOpen(false)}
              className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center justify-center hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 shadow-xs transition-all"
            >
              <span className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium">CALON WARGA</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">{counts.pendaftaran}</span>
            </Link>
            <Link
              href="/komplain"
              onClick={() => setIsOpen(false)}
              className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center justify-center hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 shadow-xs transition-all"
            >
              <span className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium">KOMPLAIN BARU</span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">{counts.komplain}</span>
            </Link>
          </div>

          {/* Daftar Notifikasi */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-zinc-800">
            {loading ? (
              <div className="p-8 text-center text-xs font-medium text-slate-500 dark:text-zinc-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                Memuat notifikasi...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">Semua Tugas Beres!</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Tidak ada pembayaran pending, pendaftaran baru, atau komplain tertunda.
                  </p>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  onClick={() => setIsOpen(false)}
                  className="p-3.5 block hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.category === "pembayaran"
                          ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300"
                          : item.category === "pendaftaran"
                          ? "bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300"
                          : "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {waktuLalu(item.time)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                    {item.title}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 dark:text-zinc-500 transition-opacity" />
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 font-normal line-clamp-2 mt-0.5">
                    {item.desc}
                  </p>
                </Link>
              ))
            )}
          </div>

          {/* Footer Panel */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <Link
              href="/notifikasi"
              onClick={() => setIsOpen(false)}
              className="hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold transition-colors"
            >
              📢 Buka Pusat Pesan &amp; Blast WA →
            </Link>
            <span className="text-slate-400 dark:text-zinc-500 text-[10px]">Auto-refresh: 30s</span>
          </div>
        </div>
      )}
    </div>
  );
}
