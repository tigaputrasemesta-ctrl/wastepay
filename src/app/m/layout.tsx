"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "@/components/Toast";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import MobileTracker from "@/components/mobile/MobileTracker";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
  wilayahId: number | null;
  aktif: boolean;
};

const ICON_HOME = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ICON_ANGKUT = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M3 7h11v9H3V7zm0 0l2-3h7l2 3m-3 5h4l3 4v3h-4v-3m0 0H7" />
  </svg>
);
const ICON_SURVEI = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="square" strokeLinejoin="miter" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ICON_KLAIM = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_ABSEN = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const ICON_LAPOR = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const ICON_CHAT = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="square" strokeLinejoin="miter" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-black flex">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors",
              active ? "bg-black text-white" : "text-gray-600"
            )}
          >
            {it.icon}
            {it.label}
          </Link>
        );
      })}
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
      // /m khusus petugas lapangan; admin/kasir diarahkan ke dashboard web
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
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login?next=/m");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center">
        <p className="font-mono font-bold text-gray-500">MEMUAT…</p>
      </div>
    );
  }

  if (!user) return null;

  const jabatan = (profil?.jabatan || "").split(",").filter(Boolean);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f4f4f0] text-black flex flex-col pb-20">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-tight leading-tight truncate">
              O2W <span className="text-red-600">Lapangan</span>
            </p>
            <p className="text-[10px] font-mono font-bold text-gray-500 truncate">
              {profil ? profil.nama : user.nama} · {jabatan.map((j) => j.toUpperCase()).join("/") || "PETUGAS"}
            </p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 px-3 py-2 bg-white border-2 border-black text-[11px] font-black uppercase tracking-wide active:bg-black active:text-white"
          >
            Keluar
          </button>
        </header>

        <main className="flex-1 w-full max-w-lg mx-auto px-3 py-4 space-y-4">
          <MobileTracker />
          {children}
        </main>

        <BottomNav pathname={pathname} jabatan={jabatan} />
      </div>
    </ToastProvider>
  );
}
