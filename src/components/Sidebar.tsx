"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ROLE_LABELS, getAllowedMenus } from "@/lib/rbac";

type User = {
  id: number;
  email: string;
  nama: string;
  role: string;
};

const menuConfig: Record<
  string,
  { label: string; href: string; icon: React.ReactNode }
> = {
  dashboard: {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  daftar: {
    label: "Daftar Baru",
    href: "/registrasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  survei: {
    label: "Survei",
    href: "/survei",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm7 2a4 4 0 108 0 4 4 0 00-8 0zm-2 0a6 6 0 1112 0 6 6 0 01-12 0z" />
      </svg>
    ),
  },
  pelanggan: {
    label: "Pelanggan",
    href: "/pelanggan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  peta: {
    label: "Peta Wilayah",
    href: "/peta",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  tagihan: {
    label: "Tagihan",
    href: "/tagihan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  petugas: {
    label: "Petugas",
    href: "/petugas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  rute: {
    label: "Rute & Jadwal",
    href: "/rute",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  jadwal: {
    label: "Jadwal",
    href: "/jadwal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  pengangkutan: {
    label: "Pengangkutan",
    href: "/pengangkutan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  komplain: {
    label: "Komplain",
    href: "/komplain",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  kendaraan: {
    label: "Kendaraan",
    href: "/kendaraan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l1.5-4.5A2 2 0 018.414 5h7.172a2 2 0 011.914 1.5L19 11m-14 0a2 2 0 00-2 2v4h2m14-6a2 2 0 012 2v4h-2m-12 0h10m-10 0a1 1 0 11-2 0 1 1 0 012 0zm10 0a1 1 0 11-2 0 1 1 0 012 0zM5 11h14" />
      </svg>
    ),
  },
  transit: {
    label: "Titik Transit",
    href: "/transit",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.5 8.5L3 13l9 8 9-8-2.5-4.5M9 3h6m-3 0v6" />
      </svg>
    ),
  },
  sticker: {
    label: "Stiker Pelanggan",
    href: "/sticker",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zm2-10h6m-6 4h6" />
      </svg>
    ),
  },
  pengeluaran: {
    label: "Pengeluaran",
    href: "/pengeluaran",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  laporan: {
    label: "Laporan",
    href: "/laporan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  pengumuman: {
    label: "Pengumuman",
    href: "/pengumuman",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  notifikasi: {
    label: "Notifikasi",
    href: "/notifikasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  rekonsiliasi: {
    label: "Rekonsiliasi",
    href: "/rekonsiliasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  tpa: {
    label: "TPA",
    href: "/tpa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  users: {
    label: "Pengguna",
    href: "/users",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  "audit-log": {
    label: "Audit Log",
    href: "/audit-log",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  pengaturan: {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
};

const MENU_GROUP: Record<string, string> = {
  dashboard: "utama",
  registrasi: "pelanggan",
  survei: "pelanggan",
  pelanggan: "pelanggan",
  sticker: "pelanggan",
  peta: "operasional",
  pengangkutan: "operasional",
  rute: "operasional",
  jadwal: "operasional",
  kendaraan: "operasional",
  transit: "operasional",
  tagihan: "keuangan",
  pengeluaran: "keuangan",
  laporan: "keuangan",
  rekonsiliasi: "keuangan",
  komplain: "komunikasi",
  pengumuman: "komunikasi",
  notifikasi: "komunikasi",
  petugas: "sistem",
  tpa: "sistem",
  users: "sistem",
  "audit-log": "sistem",
  pengaturan: "sistem",
};

const MENU_GROUPS = [
  { key: "utama", label: "UTAMA" },
  { key: "operasional", label: "OPERASIONAL" },
  { key: "pelanggan", label: "PELANGGAN" },
  { key: "keuangan", label: "KEUANGAN" },
  { key: "komunikasi", label: "KOMUNIKASI" },
  { key: "sistem", label: "SISTEM" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const allowedMenus = user ? getAllowedMenus(user.role) : [];
  const groupedMenus = MENU_GROUPS.map((g) => ({
    ...g,
    items: allowedMenus
      .filter((key) => MENU_GROUP[key] === g.key)
      .map((key) => menuConfig[key])
      .filter(Boolean),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "bg-asphalt-deep text-bone flex flex-col transition-all duration-200 border-r border-asphalt-line relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Hazard strip atas */}
      <div className="hazard h-1.5 opacity-80" aria-hidden />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-asphalt-line">
        <div className="w-9 h-9 chamfer-sm bg-vest flex items-center justify-center flex-shrink-0">
          <span className="font-display text-[11px] text-asphalt-deep leading-none tracking-tight">O2W</span>
        </div>
        {!collapsed && (
          <div className="leading-none">
            <span className="font-display text-xl text-bone tracking-wide">O2W Hero Zero Waste</span>
            <p className="stencil text-bone-faint mt-0.5">U.P.S.</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Perluas menu" : "Ciutkan menu"}
          className="ml-auto text-bone-faint hover:text-vest transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* User info */}
      {user && !collapsed && (
        <div className="px-4 py-3 border-b border-asphalt-line bg-asphalt-panel/60">
          <p className="text-sm font-medium truncate text-bone">{user.nama}</p>
          <p className="stencil text-vest mt-0.5">
            {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groupedMenus.map((group) => (
          <div key={group.key} className="mb-4">
            {!collapsed && (
              <p className="stencil text-[9px] text-bone-faint px-3 mb-1 mt-0">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item, i) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 pl-3 pr-2 py-2 text-[13px] transition-all relative",
                      collapsed && "justify-center pl-0",
                      isActive
                        ? "bg-vest/10 text-vest border-l-2 border-vest"
                        : "text-bone-dim hover:text-bone hover:bg-asphalt-panel border-l-2 border-transparent"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={cn("flex-shrink-0", isActive && "animate-ticker")}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="flex items-center justify-between flex-1">
                        <span>{item.label}</span>
                        <span className="stencil text-[9px] text-bone-faint">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-asphalt-line p-2">
        <button
          onClick={handleLogout}
          aria-label="Keluar dari sistem"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-bone-dim hover:text-danger hover:bg-danger/10 transition w-full text-[13px]",
            collapsed && "justify-center px-0"
          )}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Keluar</span>}
        </button>
        {!collapsed && (
          <p className="stencil text-[8px] text-bone-faint text-center pb-1 pt-2 border-t border-asphalt-line mt-1">
            O2W v0.1 — Ops System
          </p>
        )}
      </div>
    </aside>
  );
}
