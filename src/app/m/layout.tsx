"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "@/components/Toast";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import MobileTracker from "@/components/mobile/MobileTracker";
import BackgroundTracker from "@/components/mobile/BackgroundTracker";
import VersionCheck from "@/components/mobile/VersionCheck";
import NotificationBridge from "@/components/mobile/NotificationBridge";
import MobileSessionGuard, { clearMobileSession } from "@/components/mobile/MobileSessionGuard";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
  aktif: boolean;
};

const ICON_HOME = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ICON_ANGKUT = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM3 4h3l2.5 7h9l3-6H7M5 13h13a2 2 0 002-2V7a2 2 0 00-2-2H8" />
  </svg>
);
const ICON_SURVEI = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ICON_KLAIM = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_ABSEN = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_LAPOR = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const ICON_CHAT = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);


function BottomNav({ pathname, jabatan }: { pathname: string; jabatan: string[] }) {
  const items = [
    { href: "/m", label: "Beranda", icon: ICON_HOME, show: true },
    { href: "/m/angkut", label: "Angkut", icon: ICON_ANGKUT, show: jabatan.includes("angkut") },
    { href: "/m/lapor", label: "Lapor", icon: ICON_LAPOR, show: jabatan.includes("angkut") },
    { href: "/m/survei", label: "Survei", icon: ICON_SURVEI, show: jabatan.includes("survei") },
    { href: "/m/klaim", label: "Klaim", icon: ICON_KLAIM, show: true },
    { href: "/m/absen", label: "Absen", icon: ICON_ABSEN, show: true },
    { href: "/m/chat", label: "Chat", icon: ICON_CHAT, show: true },
  ].filter((i) => i.show);

  return (
    <nav aria-label="Navigasi utama" className="absolute bottom-0 inset-x-0 z-50 glass-bottom-nav pb-safe pt-1.5 px-1 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg">
      <div className="w-full flex justify-around items-center">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold transition-all min-w-0",
                active
                  ? "text-emerald-700 bg-emerald-50 font-black"
                  : "text-slate-500 hover:text-slate-900 active:scale-95"
              )}
            >
              <div className={cn("transition-transform", active && "scale-105")}>
                {it.icon}
              </div>
              <span className="mt-0.5 tracking-tight truncate max-w-full text-center leading-none">
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [profil, setProfil] = useState<Profil | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (user.role !== "petugas" && user.role !== "admin" && user.role !== "superadmin") {
      router.replace("/dashboard");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "petugas") {
      fetch("/api/petugas/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setProfil(d))
        .catch(() => setProfil(null));
    } else {
      setProfil({
        id: user.id,
        nama: user.nama || (user.role === "superadmin" ? "Super Admin" : "Admin"),
        jabatan: "angkut,survei",
        aktif: true,
      });
    }
  }, [user]);

  async function logout() {
    clearMobileSession();
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login?next=/m");
  }

  const loadingShell = (
    <div className="min-h-dvh bg-slate-900 flex items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
        <div
          aria-hidden="true"
          className="w-8 h-8 border-[3px] border-emerald-400 border-t-transparent rounded-full animate-spin"
        />
        <p className="font-semibold text-xs text-white">Memuat Layar Handphone APK...</p>
      </div>
    </div>
  );

  if (loading) return loadingShell;
  if (!user) return loadingShell;

  const jabatan = (profil?.jabatan || (user.role !== "petugas" ? "angkut,survei" : "")).split(",").filter(Boolean);

  const isAngkut = Boolean(pathname && (pathname === "/m/angkut" || pathname.startsWith("/m/angkut/")));
  const isChat = pathname === "/m/chat";

  return (
    <ToastProvider>
      <MobileSessionGuard />
      {/* Outer Shell: Authentic Smartphone Center Canvas on Desktop, Fullscreen on Mobile */}
      <div className="min-h-dvh bg-slate-900/95 flex flex-col items-center justify-center sm:py-3 sm:px-4">
        {/* Desktop Helper Bar */}
        <div className="hidden sm:flex items-center justify-between w-full max-w-[430px] px-2 mb-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Tampilan Handphone APK Lapangan
          </span>
          {user.role !== "petugas" && (
            <Link
              href="/dashboard"
              className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
            >
              Dashboard Web ↗
            </Link>
          )}
        </div>

        {/* Smartphone Frame */}
        <div className="w-full max-w-[430px] h-dvh sm:h-[880px] sm:max-h-[96dvh] bg-slate-50 text-slate-900 flex flex-col overflow-hidden relative sm:rounded-[38px] sm:shadow-[0_25px_70px_rgba(0,0,0,0.8)] sm:border-[7px] sm:border-slate-800">
          {/* Simulated Speaker / Camera Notch on Desktop view */}
          <div className="hidden sm:flex justify-center pt-2 pb-0.5 bg-white shrink-0">
            <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            </div>
          </div>

          {/* Top bar (GoPartner Style) */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 py-2 flex items-center justify-between gap-2 shadow-sm shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {(profil?.nama || user.nama || "P").charAt(0).toUpperCase()}
                </div>
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 ring-2 ring-white rounded-full animate-pulse"
                  title="GPS Lapangan Aktif"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {profil ? profil.nama : user.nama}
                  </span>
                  <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-emerald-100 text-emerald-800 rounded-full shrink-0">
                    {user.role === "petugas" ? "Partner" : "Admin"}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 truncate">
                  {jabatan.join(" • ") || "Petugas Lapangan"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {user.role !== "petugas" && (
                <Link
                  href="/dashboard"
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg transition-all"
                  title="Kembali ke Dashboard Web"
                >
                  Web ↗
                </Link>
              )}
              <button
                onClick={logout}
                className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl active:scale-95 transition-all"
              >
                Keluar
              </button>
            </div>
          </header>

          <main
            className={cn(
              "flex-1 w-full min-h-0",
              isAngkut
                ? "p-0 overflow-hidden flex flex-col"
                : isChat
                ? "px-3 py-2 pb-16 overflow-hidden flex flex-col"
                : "px-3.5 py-2.5 pb-20 overflow-y-auto"
            )}
          >
            <MobileTracker hideUi />
            <BackgroundTracker hideUi />
            {children}
          </main>

          <BottomNav pathname={pathname} jabatan={jabatan} />
        </div>
      </div>
      <VersionCheck />
      {/* Pengingat perangkat (absen/jadwal/pengumuman) — hanya aktif di APK Android. */}
      <NotificationBridge />
    </ToastProvider>
  );
}
