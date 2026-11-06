"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import NotificationBell from "@/components/NotificationBell";
import AdminSyncIndicator from "@/components/admin/AdminSyncIndicator";
import AdminCommandSearch from "@/components/admin/AdminCommandSearch";
import ThemeToggle from "@/components/ThemeToggle";
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
  Route,
  Trash2,
  MessageSquare,
  BarChart3,
  Wallet,
  MessageCircle,
  ShieldAlert,
  UserCog,
  Smartphone,
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

// Menu Sekunder di dalam Slide-Up Drawer Mobile (Lengkap Backoffice)
const SECONDARY_MENU_ITEMS = [
  {
    title: "Operasional & Penjemputan",
    items: [
      { label: "Pengangkutan Sampah", href: "/pengangkutan", icon: Trash2, desc: "Log ritase, volume m³ & penjemputan warga", badge: "Live" },
      { label: "Rute & Jadwal Armada", href: "/rute", icon: Route, desc: "Penjadwalan zona armada pickup & dump truck", badge: "Armada" },
      { label: "Absensi Petugas", href: "/absensi", icon: Clock, desc: "Presensi GPS & status kerja hari ini", badge: "Live GPS" },
      { label: "Survei Pendaftar", href: "/survei", icon: ClipboardCheck, desc: "Verifikasi lapangan calon warga baru", badge: null },
      { label: "Petugas & Supir", href: "/petugas", icon: UserCheck, desc: "Penugasan tim lapangan & referral driver", badge: null },
      { label: "Armada Kendaraan", href: "/kendaraan", icon: Truck, desc: "Status truk, pickup & kapasitas angkut", badge: null },
    ],
  },
  {
    title: "Keuangan & Pelayanan Warga",
    items: [
      { label: "Komplain & Masalah", href: "/komplain", icon: MessageSquare, desc: "Tiket keluhan & aduan warga", badge: null },
      { label: "Laporan & Rekapitulasi", href: "/laporan", icon: BarChart3, desc: "Analitik retribusi, tonase & performa", badge: "Laporan" },
      { label: "Pengeluaran Operasional", href: "/pengeluaran", icon: Wallet, desc: "Biaya solar, tol & pemeliharaan armada", badge: null },
      { label: "Rekonsiliasi Transaksi", href: "/rekonsiliasi", icon: Scale, desc: "Audit arus kas & mutasi payment gateway", badge: null },
      { label: "Manajemen Tarif", href: "/manajemen-tarif", icon: Tag, desc: "Paket retribusi & kategori sampah", badge: null },
    ],
  },
  {
    title: "Komunikasi & Zonasi",
    items: [
      { label: "Kontrol Kontak WA", href: "/data-kontrol", icon: Smartphone, desc: "Data kontrol HP admin & petugas live pendaftaran", badge: "Kontrol" },
      { label: "Chat Petugas", href: "/chat", icon: MessageCircle, desc: "Pesan & koordinasi tim lapangan", badge: null },
      { label: "Broadcast WhatsApp", href: "/notifikasi", icon: BellRing, desc: "Template & blast notifikasi tagihan warga", badge: "WA Blast" },
      { label: "Zonasi & Wilayah", href: "/zona", icon: Layers, desc: "Pembagian wilayah rute RT/RW & kelurahan", badge: null },
      { label: "CMS Artikel & Edukasi", href: "/manajemen-artikel", icon: Newspaper, desc: "Publikasi edukasi sampah Kota Depok", badge: "SEO" },
      { label: "Transit TPS & TPA", href: "/transit", icon: Landmark, desc: "Monitoring residu TPA Cipayung", badge: null },
      { label: "Peta Monitor TV Kiosk", href: "/peta/tv", icon: MapPin, desc: "Layar monitor display armada publik", badge: "TV" },
    ],
  },
  {
    title: "Sistem & Keamanan",
    items: [
      { label: "Kelola Akun Admin", href: "/users", icon: UserCog, desc: "Manajemen user & hak akses role", badge: "Superadmin" },
      { label: "Log Audit Sistem", href: "/audit-log", icon: ShieldAlert, desc: "Histori audit trail & keamanan server", badge: "Audit" },
    ],
  },
];

export default function AdminMobileResponsiveShell({
  children,
  renderMapSlot,
}: AdminMobileResponsiveShellProps) {
  const pathname = usePathname();
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
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans overflow-hidden">
      {/* ── DESKTOP PERSISTENT SIDEBAR (Layar >= md: 768px) ── */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* ── TOPBAR RESPONSIVE ── */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200/70 dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 select-none z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Tombol Menu ≡ Mobile untuk Membuka Slide-Up Drawer */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu sekunder backoffice"
              aria-expanded={drawerOpen}
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 active:bg-slate-200 dark:active:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo UPS HERU Mini di Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-semibold flex items-center justify-center text-xs shadow-xs">
                W
              </span>
              <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-zinc-100">
                UPS HERU
              </span>
            </div>

            {/* Command Search (Ctrl+K) */}
            <AdminCommandSearch />

            {/* Status Control Panel */}
            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="truncate">Sistem Operasional Aktif</span>
            </div>
          </div>

          {/* Notifikasi, Sinkronisasi Offline, Theme Toggle & Status Sesi */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <AdminSyncIndicator />
            <ThemeToggle />
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
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-zinc-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe select-none"
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
                      ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
                  }`}
                >
                  <div className={`relative p-1 rounded-xl transition-all ${
                    isActive ? "bg-emerald-50 dark:bg-emerald-950/60" : ""
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs tracking-tight mt-0.5 leading-none">
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
                aria-hidden="true"
                className="absolute inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm"
              />

              {/* Drawer Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl border-t border-slate-200/80 dark:border-zinc-800 max-h-[85dvh] flex flex-col overflow-hidden z-10 text-slate-900 dark:text-zinc-100"
              >
                {/* Drag Handle & Header */}
                <div className="pt-3 pb-3 px-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-zinc-950/80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 absolute top-2 left-1/2 -translate-x-1/2" />
                    <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                      Modul Back-Office Lengkap
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
                    aria-label="Tutup menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body List of Modules */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 pb-safe">
                  {SECONDARY_MENU_ITEMS.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider px-2">
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
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 shadow-xs"
                                  : "bg-slate-50/60 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-100 dark:border-zinc-700/60 text-slate-800 dark:text-zinc-200"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isItemActive
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold truncate">
                                      {item.label}
                                    </span>
                                    {item.badge && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 ml-2" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Cetak & Laporan Quick Link */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <Link
                      href="/laporan-pembayaran-cetak"
                      target="_blank"
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 dark:bg-zinc-950 text-white border border-transparent dark:border-zinc-800 active:scale-98 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-zinc-900 flex items-center justify-center text-emerald-400">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">Cetak Laporan Pembayaran</div>
                          <div className="text-xs text-slate-400">Rekapitulasi cetak formal &amp; export PDF</div>
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
