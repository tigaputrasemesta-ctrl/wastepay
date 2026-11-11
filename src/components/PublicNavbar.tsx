"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Truck,
  CreditCard,
  Tag,
  MessageSquareWarning,
  UserPlus,
  LogIn,
  Menu,
  X,
  MessageCircle,
  ChevronRight,
  Compass,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Cek Jangkauan",
    href: "/coverage",
    description: "Peta wilayah layanan & jadwal pengangkutan Depok",
    icon: <Compass className="w-5 h-5" />,
  },
  {
    label: "Lacak Armada",
    href: "/lacak",
    description: "Pantau posisi truk sampah real-time di peta",
    icon: <Truck className="w-5 h-5" />,
  },
  {
    label: "Cek Tagihan",
    href: "/bayar",
    description: "Cek tagihan bulanan & bayar online (QRIS/Duitku)",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    label: "Pengaduan",
    href: "/pengaduan",
    description: "Lapor sampah menumpuk atau belum terangkut",
    icon: <MessageSquareWarning className="w-5 h-5" />,
  },
  {
    label: "Tarif Resmi",
    href: "/tarif",
    description: "Daftar paket & tarif resmi per kategori",
    icon: <Tag className="w-5 h-5" />,
  },
];

export default function PublicNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile drawer on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 shadow-sm select-none transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1 md:flex-initial">
          <img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-none">
                UPS HERU<span className="text-emerald-700 dark:text-emerald-500">.</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate leading-normal mt-0.5">Layanan Pengangkutan Sampah & Retribusi</p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Navigasi Utama Warga"
          className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-xl transition-all",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <Link
            href="/daftar"
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-sm active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Warga Baru</span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk Petugas</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile Right Controls: Quick CTA + ThemeToggle + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link
            href="/daftar"
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all min-h-[38px] flex items-center justify-center"
          >
            Daftar
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-public-menu"
            aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            className="p-2 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 active:bg-slate-200 dark:active:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {isOpen && (
        <div id="mobile-public-menu" className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[65px] bg-slate-900/50 backdrop-blur-sm z-30 transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <div className="relative z-40 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shadow-xl max-h-[calc(100vh-65px)] overflow-y-auto px-4 py-4 space-y-4">
            {/* Nav Items */}
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 block mb-1">
                Layanan Publik Warga
              </span>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl transition-all",
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-800/60"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 active:bg-slate-100 dark:active:bg-zinc-800"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isActive
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        )}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-tight">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 truncate leading-normal mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <Link
                href="/daftar"
                onClick={() => setIsOpen(false)}
                className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Pendaftaran Jemput Sampah Baru</span>
              </Link>

              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="w-full h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal Petugas & Admin</span>
              </Link>
            </div>

            {/* WhatsApp Support Helpdesk */}
            <div className="pt-2">
              <a
                href="https://wa.me/6281400782617"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950 dark:text-emerald-200">Pengaduan</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">Hubungi WhatsApp Bot CS 24 Jam</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
