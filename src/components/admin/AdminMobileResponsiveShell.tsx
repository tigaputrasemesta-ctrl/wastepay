"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Receipt,
  Settings,
  Menu,
  X,
  Clock,
  Newspaper,
  ClipboardCheck,
  UserCheck,
  Layers,
  Tag,
  BellRing,
  Truck,
  Scale,
  Landmark,
  FileSpreadsheet,
  ChevronRight,
  LogOut,
} from "lucide-react";

export type AdminMobileResponsiveShellProps = {
  children?: React.ReactNode;
  renderMapSlot?: React.ReactNode;
};

// 5 Tab Utama Mobile (One-Thumb Zone Ergonomics)
const PRIMARY_MOBILE_TABS = [
  {
    id: "dashboard",
    label: "Ringkasan",
    href: "/dashboard",
    icon: LayoutDashboard,
    matcher: (path: string) => path === "/dashboard" || path === "/admin" || path === "/",
  },
  {
    id: "peta",
    label: "Peta OSRM",
    href: "/peta",
    icon: MapPin,
    matcher: (path: string) => path.startsWith("/peta"),
  },
  {
    id: "pelanggan",
    label: "Pelanggan",
    href: "/pelanggan",
    icon: Users,
    matcher: (path: string) => path.startsWith("/pelanggan") || path.startsWith("/registrasi"),
  },
  {
    id: "tagihan",
    label: "Tagihan WA",
    href: "/tagihan",
    icon: Receipt,
    matcher: (path: string) => path.startsWith("/tagihan"),
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
    matcher: (path: string) => path.startsWith("/pengaturan"),
  },
];

// Menu Sekunder di dalam Slide-Up Drawer Mobile
const SECONDARY_MENU_ITEMS = [
  {
    title: "Operasional Lapangan",
    items: [
      { label: "Absensi Petugas", href: "/absensi", icon: Clock, desc: "Presensi GPS & status kerja hari ini", badge: "Live GPS" },
      { label: "Survei Pendaftar", href: "/survei", icon: ClipboardCheck, desc: "Verifikasi lapangan calon warga", badge: null },
      { label: "Petugas & Armada", href: "/petugas", icon: UserCheck, desc: "Penugasan & referral driver", badge: null },
      { label: "Armada Kendaraan", href: "/kendaraan", icon: Truck, desc: "Status truk & kapasitas angkut", badge: null },
    ],
  },
  {
    title: "Konten & Regulasi",
    items: [
      { label: "CMS Artikel & Edukasi", href: "/manajemen-artikel", icon: Newspaper, desc: "Publikasi edukasi sampah Kota Depok", badge: "SEO" },
      { label: "Broadcast WhatsApp", href: "/notifikasi", icon: BellRing, desc: "Template & blast notifikasi tagihan", badge: "WA Blast" },
      { label: "Zonasi & Wilayah", href: "/zona", icon: Layers, desc: "Pembagian wilayah rute RT/RW", badge: null },
      { label: "Manajemen Tarif", href: "/manajemen-tarif", icon: Tag, desc: "Paket retribusi & kategori sampah", badge: null },
    ],
  },
  {
    title: "Pembuangan & Rekonsiliasi",
    items: [
      { label: "Transit TPS & TPA", href: "/transit", icon: Landmark, desc: "Monitoring residu TPA Cipayung", badge: null },
      { label: "Rekonsiliasi Transaksi", href: "/rekonsiliasi", icon: Scale, desc: "Audit arus kas & mutasi Duitku", badge: null },
      { label: "Peta Monitor TV Kiosk", href: "/peta/tv", icon: MapPin, desc: "Layar monitor display armada publik", badge: "TV" },
    ],
  },
];

export default function AdminMobileResponsiveShell({
  children,
  renderMapSlot,
}: AdminMobileResponsiveShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  // Tutup drawer secara otomatis ketika rute berganti
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setDrawerOpen(false);
  }

  // Tangani tombol ESC untuk menutup drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock scroll body saat drawer slide-up terbuka
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isMapRoute = pathname === "/peta" || pathname?.startsWith("/peta/");

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── DESKTOP PERSISTENT SIDEBAR (Layar >= md: 768px) ── */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* ── TOPBAR RESPONSIVE ── */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs shrink-0 select-none z-30">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Tombol Menu ≡ Mobile untuk Membuka Slide-Up Drawer */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu sekunder backoffice"
              aria-expanded={drawerOpen}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo UPS HERU Mini di Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                W
              </span>
              <span className="font-extrabold text-xs tracking-tight text-slate-900">
                UPS HERU
              </span>
            </div>

            {/* Status Control Panel */}
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-bold truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Control Panel Operasional</span>
            </div>
          </div>

          {/* Notifikasi & Status Sesi */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell />
            <StatusBar />
          </div>
        </header>

        {/* ── CONTENT SLOT ── */}
        {isMapRoute ? (
          <main className="flex-1 overflow-hidden relative h-[calc(100dvh-56px-64px)] md:h-[calc(100vh-64px)] w-full touch-none select-none">
            {renderMapSlot || children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto w-full min-w-0 pb-20 md:pb-0">
            <div className="w-full min-w-0">
              {children}
            </div>
          </main>
        )}

        {/* ── 5-TAB FIXED BOTTOM NAVIGATION BAR (Layar < md: 768px) ── */}
        <nav
          aria-label="Navigasi Utama Mobile"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe select-none"
        >
          <div className="grid grid-cols-5 h-16 items-center px-1">
            {PRIMARY_MOBILE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.matcher(pathname);
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center h-full py-1 transition-all active:scale-95 ${
                    isActive
                      ? "text-emerald-700 font-extrabold"
                      : "text-slate-500 hover:text-slate-800 font-medium"
                  }`}
                >
                  <div className={`relative p-1 rounded-xl transition-all ${
                    isActive ? "bg-emerald-50" : ""
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── MOBILE SLIDE-UP DRAWER (SECONDARY MODULES) ── */}
        <AnimatePresence>
          {drawerOpen && (
            <div
              className="fixed inset-0 z-50 md:hidden flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
              aria-label="Menu Lengkap Backoffice"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setDrawerOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
              />

              {/* Drawer Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200/80 max-h-[85dvh] flex flex-col overflow-hidden z-10"
              >
                {/* Drag Handle & Header */}
                <div className="pt-3 pb-3 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-1 rounded-full bg-slate-300 absolute top-2 left-1/2 -translate-x-1/2" />
                    <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Modul Back-Office Lengkap
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition"
                    aria-label="Tutup menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body List of Modules */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 pb-safe">
                  {SECONDARY_MENU_ITEMS.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                        {section.title}
                      </h4>
                      <div className="grid grid-cols-1 gap-1.5">
                        {section.items.map((item, iIdx) => {
                          const Icon = item.icon;
                          const isItemActive = pathname === item.href;
                          return (
                            <Link
                              key={iIdx}
                              href={item.href}
                              onClick={() => setDrawerOpen(false)}
                              className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                                isItemActive
                                  ? "bg-emerald-50 border border-emerald-200/80 text-emerald-900 shadow-xs"
                                  : "bg-slate-50/60 hover:bg-slate-100 border border-slate-100 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isItemActive
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white text-slate-600 border border-slate-200"
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold truncate">
                                      {item.label}
                                    </span>
                                    {item.badge && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Cetak & Laporan Quick Link */}
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href="/laporan-pembayaran-cetak"
                      target="_blank"
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 text-white active:scale-98 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">Cetak Laporan Pembayaran</div>
                          <div className="text-[10px] text-slate-400">Rekapitulasi cetak formal & export PDF</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">Buka ↗</span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
