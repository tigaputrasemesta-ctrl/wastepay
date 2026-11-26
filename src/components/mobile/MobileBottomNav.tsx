"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, ShoppingBag, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navs = [
    {
      label: "Beranda",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Tagihan",
      href: "/bayar",
      icon: CreditCard,
      isActive: pathname === "/bayar" || pathname.startsWith("/bayar-tagihan") || pathname.startsWith("/invoice-tagihan"),
    },
    {
      label: "Toko",
      href: "/marketplace",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/marketplace"),
    },
    {
      label: "Pengaduan",
      href: "/pengaduan",
      icon: MessageSquareWarning,
      isActive: pathname === "/pengaduan",
    },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah Cepat Ponsel"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200/90 dark:border-zinc-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-15 max-w-md mx-auto items-center px-1">
        {navs.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center h-full py-1 min-h-[44px] transition-colors relative",
                item.isActive
                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform", item.isActive && "scale-110")} />
              <span className="text-[10px] tracking-tight mt-1 leading-none">
                {item.label}
              </span>
              {item.isActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
