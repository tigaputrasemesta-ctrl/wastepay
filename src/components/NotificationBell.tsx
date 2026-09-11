"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  UserPlus,
  MessageSquareWarning,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import type { NotificationSummaryResponse, NotificationItem } from "@/app/api/notifikasi/summary/route";

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
        className={`relative p-2 border-2 border-black transition-all flex items-center justify-center ${
          isOpen
            ? "bg-yellow-300 translate-x-[1px] translate-y-[1px] shadow-none"
            : "bg-white hover:bg-yellow-100 shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        }`}
      >
        <Bell className="w-4 h-4 text-black" />

        {/* Badge Hitungan Merah / Animasi Ping */}
        {totalCount > 0 && (
          <>
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-white font-black text-[9px] items-center justify-center border border-black leading-none">
                {totalCount > 9 ? "9+" : totalCount}
              </span>
            </span>
          </>
        )}
      </button>

      {/* Panel Dropdown Notifikasi */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] z-50 text-black flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-100">
          {/* Header Panel */}
          <div className="bg-black text-white px-4 py-3 flex items-center justify-between border-b-2 border-black">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                🔔 Notifikasi Butuh Aksi
              </span>
              {totalCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded border border-white">
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
                className="p-1 hover:bg-neutral-800 text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-yellow-300" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup panel"
                className="p-1 hover:bg-neutral-800 text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Kategori / Ringkasan Angka */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-[#f4f4f0] border-b-2 border-black text-[10px] font-bold">
            <Link
              href="/tagihan"
              onClick={() => setIsOpen(false)}
              className="p-1.5 bg-white border border-black flex flex-col items-center justify-center hover:bg-yellow-100 transition-colors"
            >
              <span className="text-gray-500 font-mono text-[9px]">BAYAR PENDING</span>
              <span className="text-sm font-black text-amber-600">{counts.pembayaran}</span>
            </Link>
            <Link
              href="/pelanggan"
              onClick={() => setIsOpen(false)}
              className="p-1.5 bg-white border border-black flex flex-col items-center justify-center hover:bg-blue-100 transition-colors"
            >
              <span className="text-gray-500 font-mono text-[9px]">CALON WARGA</span>
              <span className="text-sm font-black text-blue-600">{counts.pendaftaran}</span>
            </Link>
            <Link
              href="/komplain"
              onClick={() => setIsOpen(false)}
              className="p-1.5 bg-white border border-black flex flex-col items-center justify-center hover:bg-red-100 transition-colors"
            >
              <span className="text-gray-500 font-mono text-[9px]">KOMPLAIN BARU</span>
              <span className="text-sm font-black text-red-600">{counts.komplain}</span>
            </Link>
          </div>

          {/* Daftar Notifikasi */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-gray-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-black" />
                Memuat notifikasi...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-black flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-xs uppercase">Semua Tugas Beres!</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
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
                  className="p-3 block hover:bg-yellow-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-black ${
                        item.category === "pembayaran"
                          ? "bg-amber-300 text-black"
                          : item.category === "pendaftaran"
                          ? "bg-blue-300 text-black"
                          : "bg-red-300 text-black"
                      }`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {waktuLalu(item.time)}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-black group-hover:text-emerald-700 transition-colors flex items-center justify-between">
                    {item.title}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-[11px] text-gray-700 font-medium line-clamp-2 mt-0.5">
                    {item.desc}
                  </p>
                </Link>
              ))
            )}
          </div>

          {/* Footer Panel */}
          <div className="p-2.5 bg-gray-100 border-t-2 border-black flex items-center justify-between text-[10px] font-bold">
            <Link
              href="/notifikasi"
              onClick={() => setIsOpen(false)}
              className="hover:underline flex items-center gap-1 text-black font-black"
            >
              📢 Buka Pusat Pesan &amp; Blast WA →
            </Link>
            <span className="text-gray-500 font-mono text-[9px]">Auto-refresh: 30s</span>
          </div>
        </div>
      )}
    </div>
  );
}
