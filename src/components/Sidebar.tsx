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
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  "live-report": {
    label: "Live Report",
    href: "/live",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  daftar: {
    label: "Daftar Baru",
    href: "/registrasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  survei: {
    label: "Survei",
    href: "/survei",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm7 2a4 4 0 108 0 4 4 0 00-8 0zm-2 0a6 6 0 1112 0 6 6 0 01-12 0z" />
      </svg>
    ),
  },
  pelanggan: {
    label: "Pelanggan",
    href: "/pelanggan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  peta: {
    label: "Peta Wilayah",
    href: "/peta",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  zona: {
    label: "Zonasi & Wilayah",
    href: "/zona",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  tarif: {
    label: "Manajemen Tarif",
    href: "/manajemen-tarif",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  tagihan: {
    label: "Tagihan",
    href: "/tagihan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  petugas: {
    label: "Petugas",
    href: "/petugas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  rute: {
    label: "Rute & Jadwal",
    href: "/rute",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  jadwal: {
    label: "Jadwal",
    href: "/jadwal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  pengangkutan: {
    label: "Pengangkutan",
    href: "/pengangkutan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  komplain: {
    label: "Komplain",
    href: "/komplain",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  kendaraan: {
    label: "Kendaraan",
    href: "/kendaraan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M5 11l1.5-4.5A2 2 0 018.414 5h7.172a2 2 0 011.914 1.5L19 11m-14 0a2 2 0 00-2 2v4h2m14-6a2 2 0 012 2v4h-2m-12 0h10m-10 0a1 1 0 11-2 0 1 1 0 012 0zm10 0a1 1 0 11-2 0 1 1 0 012 0zM5 11h14" />
      </svg>
    ),
  },
  transit: {
    label: "Titik Transit",
    href: "/transit",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01M5.5 8.5L3 13l9 8 9-8-2.5-4.5M9 3h6m-3 0v6" />
      </svg>
    ),
  },
  sticker: {
    label: "Stiker Pelanggan",
    href: "/sticker",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zm2-10h6m-6 4h6" />
      </svg>
    ),
  },
  pengeluaran: {
    label: "Pengeluaran",
    href: "/pengeluaran",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  laporan: {
    label: "Laporan",
    href: "/laporan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  pengumuman: {
    label: "Pengumuman",
    href: "/pengumuman",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  notifikasi: {
    label: "Notifikasi",
    href: "/notifikasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  chat: {
    label: "Chat Petugas",
    href: "/chat",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  rekonsiliasi: {
    label: "Rekonsiliasi",
    href: "/rekonsiliasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  tpa: {
    label: "TPA",
    href: "/tpa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  users: {
    label: "Pengguna",
    href: "/users",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  "audit-log": {
    label: "Audit Log",
    href: "/audit-log",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  pengaturan: {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="square" strokeLinejoin="miter" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  absensi: {
    label: "Absensi",
    href: "/absensi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  klaim: {
    label: "Klaim Dana",
    href: "/klaim",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
};

const MENU_GROUP: Record<string, string> = {
  dashboard: "utama",
  "live-report": "utama",
  registrasi: "pelanggan",
  survei: "pelanggan",
  pelanggan: "pelanggan",
  sticker: "pelanggan",
  peta: "operasional",
  zona: "operasional",
  pengangkutan: "operasional",
  rute: "operasional",
  jadwal: "operasional",
  kendaraan: "operasional",
  transit: "operasional",
  tagihan: "keuangan",
  tarif: "keuangan",
  pengeluaran: "keuangan",
  laporan: "keuangan",
  rekonsiliasi: "keuangan",
  komplain: "komunikasi",
  chat: "komunikasi",
  pengumuman: "komunikasi",
  notifikasi: "komunikasi",
  petugas: "sistem",
  tpa: "sistem",
  users: "sistem",
  "audit-log": "sistem",
  pengaturan: "sistem",
  absensi: "personalia",
  klaim: "personalia",
};

const MENU_GROUPS = [
  { key: "utama", label: "UTAMA" },
  { key: "operasional", label: "OPERASIONAL" },
  { key: "pelanggan", label: "PELANGGAN" },
  { key: "personalia", label: "PERSONALIA (HR)" },
  { key: "keuangan", label: "KEUANGAN" },
  { key: "komunikasi", label: "KOMUNIKASI" },
  { key: "sistem", label: "SISTEM" },
];

export default function Sidebar({
  className,
  isMobileDrawer = false,
  onClose,
}: {
  className?: string;
  isMobileDrawer?: boolean;
  onClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // If inside mobile drawer, never show collapsed icon-only mode
  const isCollapsedEffective = isMobileDrawer ? false : collapsed;

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

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
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
        "bg-white text-slate-800 flex flex-col transition-all duration-200 border-r border-slate-200/80 select-none",
        isMobileDrawer ? "w-full h-full border-r-0" : isCollapsedEffective ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 bg-white shrink-0">
        {isCollapsedEffective ? (
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xs font-extrabold text-white leading-none">WP</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm shadow-sm">
              🚛
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              WastePay <span className="text-emerald-700 text-xs font-bold uppercase ml-1 px-1.5 py-0.5 rounded-full bg-emerald-50">Admin</span>
            </span>
          </div>
        )}
        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup navigasi"
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors active:bg-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={isCollapsedEffective ? "Perluas menu" : "Ciutkan menu"}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={isCollapsedEffective ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>
        )}
      </div>

      {/* User info */}
      {user && !isCollapsedEffective && (
        <div className="px-3.5 py-2.5 mx-3 my-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">
            {user.nama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">{user.nama}</p>
            <span className="inline-block text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-0.5">
              {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {groupedMenus.map((group) => {
          const hasActiveChild = group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
          );
          const isGroupCollapsed = collapsedGroups[group.key] && !hasActiveChild;

          return (
            <div key={group.key} className="mb-4">
              {!isCollapsedEffective && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-600 hover:text-slate-900 px-3 py-1 mb-1 uppercase rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span>{group.label}</span>
                  <svg
                    className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      isGroupCollapsed ? "-rotate-90 text-slate-300" : "text-slate-400"
                    )}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {(!isGroupCollapsed || isCollapsedEffective) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (isMobileDrawer && onClose) {
                            onClose();
                          }
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all relative group",
                          isCollapsedEffective && "justify-center px-0",
                          isActive
                            ? "bg-emerald-50 text-emerald-700 font-extrabold shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                        title={isCollapsedEffective ? item.label : undefined}
                      >
                        <span className="flex-shrink-0">
                          {item.icon}
                        </span>
                        {!isCollapsedEffective && (
                          <span className="flex items-center justify-between flex-1">
                            <span>{item.label}</span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-slate-100 p-3 bg-white shrink-0">
        <button
          onClick={async () => {
            if (isMobileDrawer && onClose) {
              onClose();
            }
            await handleLogout();
          }}
          aria-label="Keluar dari sistem"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors w-full text-xs font-bold",
            isCollapsedEffective && "justify-center px-0"
          )}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsedEffective && <span>Keluar Sistem</span>}
        </button>
      </div>
    </aside>
  );
}
