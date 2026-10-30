"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ROLE_LABELS, getAllowedMenus } from "@/lib/rbac";
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
        "bg-white text-slate-800 flex flex-col transition-all duration-200 border-r border-slate-200/80 select-none",
        isMobileDrawer ? "w-full h-full border-r-0" : isCollapsedEffective ? "w-[72px]" : "w-64",
        className
      )}
    >
      {/* ── BRAND HEADER ── */}
      <div className="flex items-center justify-between px-3.5 h-16 border-b border-slate-100/90 bg-white shrink-0">
        {isCollapsedEffective ? (
          <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/60 p-1">
            <img src="/ups-heru-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <img src="/ups-heru-logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-slate-900 leading-none">
                  UPS HERU
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  TPS 3R
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
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
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors active:scale-95"
          >
            <X size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={isCollapsedEffective ? "Perluas menu" : "Ciutkan menu"}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg p-1.5 transition-colors"
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
          <div className="px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-medium flex items-center justify-center text-xs shadow-xs ring-2 ring-emerald-500/15 shrink-0">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {user.nama}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] text-slate-500 capitalize truncate font-medium">
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVIGATION LIST ── */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent space-y-4">
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
                  className="w-full flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 hover:text-slate-700 px-2.5 py-1 uppercase rounded-md transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={12}
                    strokeWidth={2}
                    className={cn(
                      "transition-transform duration-200 text-slate-400",
                      isGroupCollapsed && "-rotate-90 text-slate-300"
                    )}
                  />
                </button>
              )}

              {(!isGroupCollapsed || isCollapsedEffective) && (
                <div className="space-y-0.5">
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
                          "flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl transition-all duration-150 relative group",
                          isCollapsedEffective ? "justify-center px-0 h-10 w-10 mx-auto" : "",
                          isActive
                            ? "bg-emerald-50/90 text-emerald-900 font-semibold shadow-xs border border-emerald-200/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                        )}
                        title={isCollapsedEffective ? item.label : undefined}
                      >
                        {isActive && !isCollapsedEffective && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-600 rounded-r-full" />
                        )}

                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2 : 1.75}
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-700"
                          )}
                        />

                        {!isCollapsedEffective && (
                          <span className="truncate tracking-normal text-slate-800">
                            {item.label}
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

      {/* ── FOOTER / LOGOUT ── */}
      <div className="border-t border-slate-100/90 p-2.5 bg-white shrink-0">
        <button
          onClick={async () => {
            if (isMobileDrawer && onClose) onClose();
            await handleLogout();
          }}
          aria-label="Keluar dari sistem"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50/80 transition-colors w-full text-xs font-medium active:scale-[0.98]",
            isCollapsedEffective && "justify-center px-0 h-10 w-10 mx-auto"
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
