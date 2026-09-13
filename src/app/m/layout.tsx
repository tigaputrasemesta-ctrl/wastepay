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
import MobileSessionGuard, { clearMobileSession } from "@/components/mobile/MobileSessionGuard";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
  aktif: boolean;
};

const ICON_HOME = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ICON_ANGKUT = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM3 4h3l2.5 7h9l3-6H7M5 13h13a2 2 0 002-2V7a2 2 0 00-2-2H8" />
  </svg>
);
const ICON_SURVEI = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ICON_KLAIM = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_ABSEN = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_LAPOR = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const ICON_CHAT = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
    <nav className="fixed bottom-0 inset-x-0 z-50 glass-bottom-nav pb-safe pt-1.5 px-2">
      <div className="w-full max-w-lg mx-auto flex justify-around items-center">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-1 rounded-xl text-[9px] sm:text-[10px] font-bold transition-all min-w-0",
                active
                  ? "text-emerald-600 bg-emerald-50/80 font-black"
                  : "text-slate-500 hover:text-slate-900 active:scale-95"
              )}
            >
              <div className={cn("transition-transform", active && "scale-105")}>
                {it.icon}
              </div>
              <span className="mt-0.5 tracking-tight truncate max-w-full">{it.label}</span>
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
    } else if (user.role !== "petugas") {
      router.replace("/dashboard");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (!user || user.role !== "petugas") return;
    fetch("/api/petugas/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfil(d))
      .catch(() => setProfil(null));
  }, [user]);

  async function logout() {
    clearMobileSession();
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login?next=/m");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold text-xs text-slate-500">Memuat UPS HERU Partner...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const jabatan = (profil?.jabatan || "").split(",").filter(Boolean);

  return (
    <ToastProvider>
      <MobileSessionGuard />
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24">
        {/* Top bar (GoPartner Style) */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {(profil?.nama || user.nama || "P").charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 ring-2 ring-white rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {profil ? profil.nama : user.nama}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  Partner
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 truncate">
                {jabatan.join(" • ") || "Petugas Lapangan"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl active:scale-95 transition-all"
          >
            Keluar
          </button>
        </header>

        <main className="flex-1 w-full max-w-lg mx-auto px-3 sm:px-3.5 py-3.5 sm:py-4 space-y-4 overflow-x-hidden">
          <MobileTracker />
          <BackgroundTracker />
          {children}
        </main>

        <BottomNav pathname={pathname} jabatan={jabatan} />
      </div>
      <VersionCheck />
    </ToastProvider>
  );
}
