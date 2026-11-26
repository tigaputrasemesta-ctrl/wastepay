"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  PackageCheck,
  Tag,
  BookOpen,
  ShoppingBag,
  CreditCard,
  MessageSquareWarning,
  UserPlus,
  LogIn,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

export interface PublicNavbarProps {
  brandName?: string;
  tagline?: string;
  logoUrl?: string;
  whatsappDigits?: string;
}

export default function PublicNavbar({
  brandName = "UPS HERU",
  logoUrl = "/ups-heru-logo.jpg",
  whatsappDigits = "6281400782617",
}: PublicNavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [layananOpen, setLayananOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer and dropdown on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
    setLayananOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLayananOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setLayananOpen(false);
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

  const isLayananActive =
    pathname.startsWith("/pickup") ||
    pathname.startsWith("/tarif") ||
    pathname.startsWith("/artikel");

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 shadow-sm select-none transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 md:h-[68px] flex items-center justify-between gap-2 sm:gap-4 whitespace-nowrap">
        {/* 1. Brand Logo & Ringkas Identity */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 group shrink-0"
        >
          <img
            src={logoUrl}
            alt={`${brandName} Logo`}
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform shrink-0"
          />
          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {brandName}
            <span className="text-emerald-600 dark:text-emerald-400">.</span>
          </span>
        </Link>

        {/* 2. Desktop Navigation (Satu Baris Utuh, 4 Item Ringkas) */}
        <nav
          aria-label="Navigasi Utama Warga"
          className="hidden md:flex items-center gap-1 lg:gap-1.5 text-xs lg:text-sm font-bold text-slate-700 dark:text-zinc-200"
        >
          {/* Dropdown Layanan */}
          <div className="relative" ref={dropdownRef} onMouseLeave={() => setLayananOpen(false)}>
            <button
              type="button"
              onClick={() => setLayananOpen(!layananOpen)}
              onMouseEnter={() => setLayananOpen(true)}
              aria-expanded={layananOpen}
              className={cn(
                "px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1.5",
                isLayananActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold"
                  : "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300"
              )}
            >
              <span>Layanan</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  layananOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {layananOpen && (
              <div
                onMouseLeave={() => setLayananOpen(false)}
                className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 z-50"
              >
                <Link
                  href="/pickup"
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl transition-all",
                    pathname === "/pickup"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200"
                  )}
                >
                  <PackageCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-tight">Pickup Sekali Angkut</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">
                      Puing, ranting, kasur & sampah besar
                    </p>
                  </div>
                </Link>

                <Link
                  href="/tarif"
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl transition-all",
                    pathname === "/tarif"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200"
                  )}
                >
                  <Tag className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-tight">Tarif Resmi</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">
                      Transparansi paket retribusi bulanan
                    </p>
                  </div>
                </Link>

                <Link
                  href="/artikel"
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl transition-all",
                    pathname.startsWith("/artikel")
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200"
                  )}
                >
                  <BookOpen className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-tight">Edukasi & Artikel</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal mt-0.5">
                      Panduan pilah sampah & kebersihan
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Item 2: Toko */}
          <Link
            href="/marketplace"
            className={cn(
              "px-3 py-2 rounded-xl transition-all",
              pathname.startsWith("/marketplace")
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold"
                : "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300"
            )}
          >
            Toko
          </Link>

          {/* Item 3: Cek Tagihan */}
          <Link
            href="/bayar"
            className={cn(
              "px-3 py-2 rounded-xl transition-all",
              pathname === "/bayar"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold"
                : "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300"
            )}
          >
            Cek Tagihan
          </Link>

          {/* Item 4: Pengaduan */}
          <Link
            href="/pengaduan"
            className={cn(
              "px-3 py-2 rounded-xl transition-all",
              pathname === "/pengaduan"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold"
                : "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300"
            )}
          >
            Pengaduan
          </Link>
        </nav>

        {/* 3. Desktop Kanan: Theme Toggle, Portal Petugas, Daftar Warga */}
        <div className="hidden md:flex items-center gap-2 lg:gap-2.5 shrink-0">
          <ThemeToggle />

          <Link
            href="/login"
            className="text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Portal Petugas</span>
          </Link>

          <Link
            href="/daftar"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Warga</span>
          </Link>
        </div>

        {/* 4. Mobile Header (56px, 3 Elemen Sejajar): Logo, Tombol Cepat Cek Tagihan, Hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <Link
            href="/bayar"
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all min-h-[36px] flex items-center justify-center gap-1"
          >
            <CreditCard className="w-3 h-3" />
            <span>Cek Tagihan</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-public-menu"
            aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
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
            className="fixed inset-0 top-[56px] sm:top-[64px] bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <div className="relative z-40 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shadow-xl max-h-[calc(100vh-64px)] overflow-y-auto px-4 py-4 space-y-4">
            {/* Nav Items */}
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 block mb-1">
                Layanan Publik Warga
              </span>

              <Link
                href="/pickup"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Pickup Sekali Angkut</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Puing, ranting & sampah besar</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/marketplace"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Toko UPS HERU</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Pupuk kompos TPS 3R & olahan</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/bayar"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Cek & Bayar Tagihan</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Pembayaran retribusi QRIS resmi</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/tarif"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Tarif Retribusi Resmi</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Transparansi biaya per kategori</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/pengaduan"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <MessageSquareWarning className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Pengaduan Kebersihan</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Lapor sampah menumpuk / tertinggal</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/artikel"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Edukasi & Artikel</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Tips pilah & kelola sampah</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <Link
                href="/daftar"
                onClick={() => setIsOpen(false)}
                className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Pendaftaran Warga Baru</span>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[44px]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Portal Petugas</span>
                </Link>

                <div className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200 dark:border-zinc-700 rounded-xl">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            {/* WhatsApp Helpdesk */}
            <div className="pt-1">
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950 dark:text-emerald-200">Bantuan CS WhatsApp</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Layanan pengaduan & koordinasi</p>
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
