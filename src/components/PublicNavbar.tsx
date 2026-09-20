"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";
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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <img src="/ups-heru-logo.jpg" alt="UPS HERU Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                UPS HERU<span className="text-emerald-700">.</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold leading-none">
                Depok
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate leading-normal mt-0.5">Pengelolaan Sampah Terpadu Kota Depok</p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Navigasi Utama Warga"
          className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-semibold text-slate-600"
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
                    ? "bg-emerald-50 text-emerald-700 font-bold"
                    : "hover:text-emerald-700 hover:bg-slate-50 text-slate-600"
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
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk Petugas</span>
          </Link>
        </div>

        {/* Mobile Right Controls: Quick CTA + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <Link
            href="/daftar"
            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg shadow-sm active:scale-95 transition-all"
          >
            Daftar
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-public-menu"
            aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className="fixed inset-0 top-[57px] bg-slate-900/50 backdrop-blur-sm z-30 transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <div className="relative z-40 bg-white border-b border-slate-200 shadow-xl max-h-[calc(100vh-57px)] overflow-y-auto px-4 py-4 space-y-4">
            {/* Nav Items */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
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
                        ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80"
                        : "hover:bg-slate-50 text-slate-800 active:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isActive
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-tight">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate leading-normal mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
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
                className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
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
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 hover:bg-emerald-100/70 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950">Pengaduan</p>
                    <p className="text-[10px] text-emerald-700">Hubungi WhatsApp Bot CS 24 Jam</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-700" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
