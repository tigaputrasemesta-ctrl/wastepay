"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ROLE_LABELS, getAllowedMenus } from "@/lib/rbac";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  UserPlus,
  ClipboardCheck,
  Users,
  MapPin,
  Layers,
  Tag,
  Receipt,
  UserCheck,
  Route,
  Calendar,
  Truck,
  MessageSquareWarning,
  MessageCircle,
  Car,
  Navigation,
  QrCode,
  Wallet,
  BarChart3,
  Megaphone,
  Newspaper,
  BellRing,
  Scale,
  Clock,
  HandCoins,
  Landmark,
  Settings,
  ShieldCheck,
  FileText,
  Smartphone,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";

type User = {
  id: number;
  email: string;
  nama: string;
  role: string;
};

type MenuItemDef = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
};

const menuConfig: Record<string, MenuItemDef> = {
  dashboard: { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  daftar: { label: "Daftar Baru", href: "/registrasi", icon: UserPlus },
  survei: { label: "Survei Lapangan", href: "/survei", icon: ClipboardCheck },
  pelanggan: { label: "Pusat Pelanggan", href: "/pelanggan", icon: Users },
  peta: { label: "Peta Wilayah", href: "/peta", icon: MapPin },
  zona: { label: "Zonasi & Wilayah", href: "/zona", icon: Layers },
  tarif: { label: "Manajemen Tarif", href: "/manajemen-tarif", icon: Tag },
  tagihan: { label: "Tagihan Retribusi", href: "/tagihan", icon: Receipt },
  petugas: { label: "Tim Petugas", href: "/petugas", icon: UserCheck },
  rute: { label: "Rute Pengangkutan", href: "/rute", icon: Route },
  jadwal: { label: "Jadwal Armada", href: "/jadwal", icon: Calendar },
  pengangkutan: { label: "Log Ritase Sampah", href: "/pengangkutan", icon: Truck },
  komplain: { label: "Tiket Komplain", href: "/komplain", icon: MessageSquareWarning },
  chat: { label: "Chat Koordinasi", href: "/chat", icon: MessageCircle },
  kendaraan: { label: "Armada Kendaraan", href: "/kendaraan", icon: Car },
  transit: { label: "Titik Transit", href: "/transit", icon: Navigation },
  sticker: { label: "Cetak Barcode QR", href: "/pelanggan-cetak", icon: QrCode },
  pengeluaran: { label: "Biaya Operasional", href: "/pengeluaran", icon: Wallet },
  laporan: { label: "Laporan Keuangan", href: "/laporan", icon: BarChart3 },
  pengumuman: { label: "Pengumuman Warga", href: "/pengumuman", icon: Megaphone },
  artikel: { label: "Edukasi & CMS", href: "/manajemen-artikel", icon: Newspaper },
  notifikasi: { label: "Broadcast WhatsApp", href: "/notifikasi", icon: BellRing },
  rekonsiliasi: { label: "Rekonsiliasi Kas", href: "/rekonsiliasi", icon: Scale },
  absensi: { label: "Presensi GPS", href: "/absensi", icon: Clock },
  klaim: { label: "Klaim Dana Petugas", href: "/klaim", icon: HandCoins },
  tpa: { label: "Monitoring TPA", href: "/tpa", icon: Landmark },
  pengaturan: { label: "Pengaturan Sistem", href: "/pengaturan", icon: Settings },
  users: { label: "Kelola Akun Admin", href: "/users", icon: ShieldCheck },
  "audit-log": { label: "Audit Log Sistem", href: "/audit-log", icon: FileText },
  "data-kontrol": { label: "Kontrol Kontak WA", href: "/data-kontrol", icon: Smartphone },
};

// Pengelompokan 5 grup menu ergonomis dan rapi
const MENU_GROUP: Record<string, string> = {
  dashboard: "utama",

  // Operasional Lapangan & Armada
  peta: "operasional",
  pengangkutan: "operasional",
  rute: "operasional",
  jadwal: "operasional",
  kendaraan: "operasional",
  transit: "operasional",
  tpa: "operasional",
  zona: "operasional",

  // Pelanggan & Layanan
  pelanggan: "pelanggan",
  "data-kontrol": "pelanggan",
  daftar: "pelanggan",
  survei: "pelanggan",
  sticker: "pelanggan",
  komplain: "pelanggan",
  chat: "pelanggan",

  // Keuangan & Kasir
  tagihan: "keuangan",
  tarif: "keuangan",
  pengeluaran: "keuangan",
  laporan: "keuangan",
  rekonsiliasi: "keuangan",
  klaim: "keuangan",

  // Sistem & Personalia
  absensi: "sistem",
  petugas: "sistem",
  notifikasi: "sistem",
  pengumuman: "sistem",
  artikel: "sistem",
  users: "sistem",
  "audit-log": "sistem",
  pengaturan: "sistem",
};

const MENU_GROUPS = [
  { key: "utama", label: "Menu Utama" },
  { key: "operasional", label: "Operasional & Armada" },
  { key: "pelanggan", label: "Pelanggan & Layanan" },
  { key: "keuangan", label: "Keuangan & Kasir" },
  { key: "sistem", label: "Sistem & Personalia" },
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

  const isCollapsedEffective = isMobileDrawer ? false : collapsed;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
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
        "bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 flex flex-col transition-all duration-200 border-r border-slate-200/80 dark:border-zinc-800/80 select-none",
        isMobileDrawer ? "w-full h-full border-r-0" : isCollapsedEffective ? "w-[72px]" : "w-64",
        className
      )}
    >
      {/* ── BRAND HEADER ── */}
      <div className="flex items-center justify-between px-3.5 h-16 border-b border-slate-100/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shrink-0">
        {isCollapsedEffective ? (
          <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 p-1">
            <img src="/ups-heru-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <img src="/ups-heru-logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-zinc-100 leading-none">
                  UPS HERU
                </span>
                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                  TPS 3R
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal truncate mt-0.5">
                Kota Depok
              </span>
            </div>
          </div>
        )}

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup navigasi"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg p-1.5 transition-colors active:scale-95"
          >
            <X size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={isCollapsedEffective ? "Perluas menu" : "Ciutkan menu"}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-zinc-900 rounded-lg p-1.5 transition-colors"
          >
            {isCollapsedEffective ? (
              <PanelLeft size={16} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>

      {/* ── USER PROFILE CHIP ── */}
      {user && !isCollapsedEffective && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="px-3 py-2 rounded-lg bg-slate-50/90 dark:bg-zinc-900/90 border border-slate-200/60 dark:border-zinc-800/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-medium flex items-center justify-center text-xs shadow-xs ring-2 ring-emerald-500/15 shrink-0">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate leading-tight">
                {user.nama}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-zinc-400 capitalize truncate font-medium">
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVIGATION LIST ── */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent space-y-4">
        {groupedMenus.map((group) => {
          const hasActiveChild = group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
          );
          const isGroupCollapsed = collapsedGroups[group.key] && !hasActiveChild;

          return (
            <div key={group.key} className="space-y-1">
              {!isCollapsedEffective && group.key !== "utama" && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!isGroupCollapsed}
                  aria-controls={`menu-group-${group.key}`}
                  className="w-full flex items-center justify-between text-xs font-semibold tracking-wider text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 px-2.5 py-2 uppercase rounded-md transition-colors min-h-[36px]"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={12}
                    strokeWidth={2}
                    className={cn(
                      "transition-transform duration-200 text-slate-400 dark:text-zinc-400",
                      isGroupCollapsed && "-rotate-90 text-slate-300 dark:text-zinc-500"
                    )}
                  />
                </button>
              )}

              {(!isGroupCollapsed || isCollapsedEffective) && (
                <div id={`menu-group-${group.key}`} className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (isMobileDrawer && onClose) onClose();
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg transition-all duration-150 relative group",
                          isCollapsedEffective ? "justify-center px-0 h-9 w-9 mx-auto" : "",
                          isActive
                            ? "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold shadow-xs border border-emerald-200/60 dark:border-emerald-800/50"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/70 dark:hover:bg-zinc-900/70 font-medium"
                        )}
                        title={isCollapsedEffective ? item.label : undefined}
                      >
                        {isActive && !isCollapsedEffective && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-600 dark:bg-emerald-500 rounded-r-full" />
                        )}

                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2 : 1.75}
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200"
                          )}
                        />

                        {!isCollapsedEffective && (
                          <span className="truncate tracking-normal text-slate-800 dark:text-zinc-200">
                            {item.label}
                          </span>
                        )}
                        {isCollapsedEffective && isActive && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
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

      {/* ── FOOTER / LOGOUT ── */}
      <div className="border-t border-slate-100/90 dark:border-zinc-800/80 p-2.5 bg-white dark:bg-zinc-950 shrink-0">
        <button
          onClick={async () => {
            if (isMobileDrawer && onClose) onClose();
            await handleLogout();
          }}
          aria-label="Keluar dari sistem"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/30 transition-colors w-full text-xs font-medium active:scale-[0.98]",
            isCollapsedEffective && "justify-center px-0 h-9 w-9 mx-auto"
          )}
          title={isCollapsedEffective ? "Keluar Sistem" : undefined}
        >
          <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
          {!isCollapsedEffective && <span>Keluar Sistem</span>}
        </button>
      </div>
    </aside>
  );
}
