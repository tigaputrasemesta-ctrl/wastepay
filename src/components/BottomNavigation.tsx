"use client";

import { Home, Map as MapIcon, ClipboardList, Clock, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function BottomNavigation({ role = "pelanggan" }: { role?: "pelanggan" | "petugas" }) {
  const pathname = usePathname();

  const customerLinks = [
    { href: "/dashboard", label: "Beranda", icon: Home },
    { href: "/peta", label: "Peta", icon: MapIcon },
    { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
    { href: "/riwayat", label: "Riwayat", icon: Clock },
    { href: "/akun", label: "Akun", icon: User },
  ];

  const driverLinks = [
    { href: "/dashboard", label: "Beranda", icon: Home },
    { href: "/tugas", label: "Tugas", icon: MapIcon },
    { href: "/riwayat", label: "Riwayat", icon: Clock },
    { href: "/akun", label: "Akun", icon: User },
  ];

  const links = role === "petugas" ? driverLinks : customerLinks;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 md:hidden">
      <nav className="flex justify-around items-center h-16">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors",
                isActive ? "text-emerald-600 font-medium" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
