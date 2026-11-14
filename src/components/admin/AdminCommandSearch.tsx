"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  Receipt,
  MapPin,
  ClipboardCheck,
  Truck,
  Route,
  Car,
  Clock,
  UserCheck,
  Wallet,
  BarChart3,
  Scale,
  MessageSquareWarning,
  BellRing,
  Tag,
  Layers,
  Smartphone,
  Landmark,
  Navigation,
  QrCode,
  Newspaper,
  Megaphone,
  ShieldCheck,
  Building2,
  FileText,
  Settings,
  UserPlus,
  Tv,
  FileSpreadsheet,
  Sun,
  Moon,
  ArrowRight,
  Command,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

type CommandItem = {
  id: string;
  title: string;
  desc?: string;
  category: "Navigasi" | "Aksi Cepat" | "Tampilan & Sistem";
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  badge?: string;
};

export default function AdminCommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCore, setIsCore] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname.toLowerCase();
      setIsCore(h.includes("o2whero.com") || h.startsWith("o2w-") || h.includes("core."));
    }
  }, []);

  const commandItems: CommandItem[] = useMemo(() => {
    return [
      // Navigasi Utama & Operasional
      {
        id: "nav-dash",
        title: "Dashboard Overview",
        desc: "Ringkasan metrik utama TPS 3R & performa",
        category: "Navigasi",
        keywords: ["dashboard", "home", "ringkasan", "ikhtisar", "kpi"],
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        id: "nav-pelanggan",
        title: "Pusat Pelanggan",
        desc: "Daftar 1.000+ warga, status aktif/nonaktif, alamat RT/RW",
        category: "Navigasi",
        keywords: ["pelanggan", "warga", "nasabah", "user", "kartu"],
        icon: Users,
        href: "/pelanggan",
      },
      {
        id: "nav-tagihan",
        title: "Tagihan Retribusi & Kasir",
        desc: "Kelola tagihan bulanan, status lunas, blast link bayar",
        category: "Navigasi",
        keywords: ["tagihan", "invoice", "bayar", "iuran", "retribusi", "kasir"],
        icon: Receipt,
        href: "/tagihan",
      },
      {
        id: "nav-peta",
        title: "Peta Wilayah & OSRM Routing",
        desc: "Visualisasi sebaran warga, rute truk, koordinat GPS",
        category: "Navigasi",
        keywords: ["peta", "map", "gis", "osrm", "rute", "gps", "koordinat"],
        icon: MapPin,
        href: "/peta",
      },
      {
        id: "nav-survei",
        title: "Survei Pendaftar Lapangan",
        desc: "Verifikasi calon warga baru dan validasi titik koordinat",
        category: "Navigasi",
        keywords: ["survei", "survey", "verifikasi", "lapangan", "calon"],
        icon: ClipboardCheck,
        href: "/survei",
      },
      {
        id: "nav-pengangkutan",
        title: "Log Ritase & Pengangkutan Sampah",
        desc: "Data volume m³, tonase, dan catatan penjemputan warga",
        category: "Navigasi",
        keywords: ["pengangkutan", "ritase", "volume", "tonase", "truk", "sampah"],
        icon: Truck,
        href: "/pengangkutan",
      },
      {
        id: "nav-rute",
        title: "Rute Pengangkutan",
        desc: "Optimasi lintasan armada dan pembagian zona pengambilan",
        category: "Navigasi",
        keywords: ["rute", "lintasan", "jalur", "penjadwalan"],
        icon: Route,
        href: "/rute",
      },
      {
        id: "nav-kendaraan",
        title: "Armada & Kendaraan",
        desc: "Daftar pickup, tossa, dump truck dan status servis",
        category: "Navigasi",
        keywords: ["kendaraan", "armada", "pickup", "tossa", "mobil", "truk"],
        icon: Car,
        href: "/kendaraan",
      },
      {
        id: "nav-absensi",
        title: "Presensi GPS Petugas",
        desc: "Kehadiran supir & kernet real-time dengan koordinat",
        category: "Navigasi",
        keywords: ["absensi", "presensi", "kehadiran", "petugas", "gps"],
        icon: Clock,
        href: "/absensi",
      },
      {
        id: "nav-petugas",
        title: "Tim Petugas Lapangan",
        desc: "Data supir, kernet, tim survei & kode referral",
        category: "Navigasi",
        keywords: ["petugas", "supir", "kernet", "driver", "karyawan"],
        icon: UserCheck,
        href: "/petugas",
      },
      {
        id: "nav-pengeluaran",
        title: "Biaya & Pengeluaran Operasional",
        desc: "Catatan solar, tol, makan, dan servis armada",
        category: "Navigasi",
        keywords: ["pengeluaran", "biaya", "operasional", "solar", "bbm", "servis"],
        icon: Wallet,
        href: "/pengeluaran",
      },
      {
        id: "nav-laporan",
        title: "Laporan Keuangan & Rekapitulasi",
        desc: "Grafik pendapatan, perbandingan bulan, dan laba rugi",
        category: "Navigasi",
        keywords: ["laporan", "keuangan", "rekap", "analitik", "omset"],
        icon: BarChart3,
        href: "/laporan",
      },
      {
        id: "nav-rekonsiliasi",
        title: "Rekonsiliasi Kas Transaksi",
        desc: "Audit mutasi bank, QRIS Duitku & uang tunai petugas",
        category: "Navigasi",
        keywords: ["rekonsiliasi", "audit", "kas", "duitku", "bank", "mutasi"],
        icon: Scale,
        href: "/rekonsiliasi",
      },
      {
        id: "nav-komplain",
        title: "Tiket Komplain Warga",
        desc: "Aduan sampah terlewat, sampah tercecer & pelayanan",
        category: "Navigasi",
        keywords: ["komplain", "tiket", "keluhan", "aduan", "cs"],
        icon: MessageSquareWarning,
        href: "/komplain",
      },
      {
        id: "nav-notifikasi",
        title: "Broadcast WhatsApp & Notifikasi",
        desc: "Template tagihan, blast WA massal & info gangguan",
        category: "Navigasi",
        keywords: ["notifikasi", "broadcast", "whatsapp", "wa", "blast"],
        icon: BellRing,
        href: "/notifikasi",
      },
      {
        id: "nav-tarif",
        title: "Manajemen Tarif & Paket",
        desc: "Atur harga iuran bulanan per kategori rumah tangga/usaha",
        category: "Navigasi",
        keywords: ["tarif", "paket", "harga", "kategori", "iuran"],
        icon: Tag,
        href: "/manajemen-tarif",
      },
      {
        id: "nav-zona",
        title: "Zonasi & Wilayah RT/RW",
        desc: "Pemetaan area kelurahan, RW, dan cluster perumahan",
        category: "Navigasi",
        keywords: ["zona", "wilayah", "rt", "rw", "kelurahan", "kecamatan"],
        icon: Layers,
        href: "/zona",
      },
      {
        id: "nav-kontrol",
        title: "Kontrol Kontak WhatsApp",
        desc: "Setting nomor HP admin & petugas untuk bot WA",
        category: "Navigasi",
        keywords: ["kontrol", "kontak", "wa", "admin", "nomor"],
        icon: Smartphone,
        href: "/data-kontrol",
      },
      {
        id: "nav-tpa",
        title: "Monitoring TPA Cipayung",
        desc: "Pantau buang akhir ke TPA Cipayung & kuota tonase",
        category: "Navigasi",
        keywords: ["tpa", "cipayung", "residu", "pembuangan"],
        icon: Landmark,
        href: "/tpa",
      },
      {
        id: "nav-transit",
        title: "Titik Transit & TPS 3R",
        desc: "Data lokasi transfer depo sampah sementara",
        category: "Navigasi",
        keywords: ["transit", "tps", "depo", "transfer"],
        icon: Navigation,
        href: "/transit",
      },
      {
        id: "nav-sticker",
        title: "Cetak Barcode QR Warga",
        desc: "Stiker QR code untuk ditempel di rumah pelanggan",
        category: "Navigasi",
        keywords: ["sticker", "barcode", "qr", "cetak", "kartu"],
        icon: QrCode,
        href: "/pelanggan-cetak",
      },
      {
        id: "nav-artikel",
        title: "Edukasi & CMS Artikel",
        desc: "Kelola artikel tips daur ulang & berita bank sampah",
        category: "Navigasi",
        keywords: ["artikel", "cms", "edukasi", "blog", "berita"],
        icon: Newspaper,
        href: "/manajemen-artikel",
      },
      {
        id: "nav-pengumuman",
        title: "Pengumuman Warga",
        desc: "Buat pengumuman jadwal libur hari raya & perbaikan",
        category: "Navigasi",
        keywords: ["pengumuman", "broadcast", "warga", "banner"],
        icon: Megaphone,
        href: "/pengumuman",
      },
      {
        id: "nav-users",
        title: "Kelola Akun Admin",
        desc: "Role permissions, admin kasir, operator & superadmin",
        category: "Navigasi",
        keywords: ["users", "admin", "pengguna", "role", "akses", "password"],
        icon: ShieldCheck,
        href: "/users",
      },
      {
        id: "nav-audit",
        title: "Audit Log Sistem",
        desc: "Riwayat aktivitas, login, delete, dan perubahan data",
        category: "Navigasi",
        keywords: ["audit", "log", "histori", "keamanan", "aktivitas"],
        icon: FileText,
        href: "/audit-log",
      },
      {
        id: "nav-tenants",
        title: "Manajemen Mitra & Database",
        desc: "Pendaftaran tenant baru, domain custom, dan database",
        category: "Navigasi",
        keywords: ["tenant", "mitra", "database", "saas", "subdomain", "kemitraan"],
        icon: Building2,
        href: "/tenants",
      },
      {
        id: "nav-setting",
        title: "Pengaturan Sistem",
        desc: "Konfigurasi instansi UPS HERU, rekening, dan backup",
        category: "Navigasi",
        keywords: ["pengaturan", "setting", "profil", "instansi", "backup"],
        icon: Settings,
        href: "/pengaturan",
      },

      // Aksi Cepat
      {
        id: "act-daftar",
        title: "Daftar Warga Baru",
        desc: "Input form registrasi pelanggan baru langsung ke sistem",
        category: "Aksi Cepat",
        keywords: ["daftar", "registrasi", "tambah", "warga baru", "input"],
        icon: UserPlus,
        href: "/registrasi",
        badge: "Aksi",
      },
      {
        id: "act-cetak-laporan",
        title: "Cetak Laporan Pembayaran",
        desc: "Buka halaman siap cetak PDF / print kwitansi rekap",
        category: "Aksi Cepat",
        keywords: ["cetak", "print", "pdf", "laporan", "rekapitulasi"],
        icon: FileSpreadsheet,
        href: "/laporan-pembayaran-cetak",
        badge: "PDF",
      },
      {
        id: "act-peta-tv",
        title: "Mode Monitor TV Kiosk",
        desc: "Buka layar monitor peta fullscreen untuk display kantor",
        category: "Aksi Cepat",
        keywords: ["tv", "kiosk", "monitor", "layar", "display"],
        icon: Tv,
        href: "/peta/tv",
        badge: "Display",
      },

      // Tampilan & Sistem
      {
        id: "theme-toggle",
        title: resolvedTheme === "dark" ? "Ganti ke Mode Terang (Light)" : "Ganti ke Mode Gelap (Dark)",
        desc: "Beralih palet tema tampilan antarmuka sistem",
        category: "Tampilan & Sistem",
        keywords: ["theme", "tema", "dark", "light", "gelap", "terang", "mode"],
        icon: resolvedTheme === "dark" ? Sun : Moon,
        action: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
        },
        badge: resolvedTheme === "dark" ? "Light" : "Dark",
      },
    ];
  }, [resolvedTheme, setTheme]);

  // Filter items berdasarkan konteks Core SaaS vs Tenant dan query pencarian
  const filteredItems = useMemo(() => {
    const baseItems = isCore
      ? commandItems.filter((item) => {
          if (!item.href) return true; // actions (seperti ganti tema) tetap diizinkan
          return ["/dashboard", "/tenants", "/users", "/audit-log"].some((prefix) =>
            item.href === prefix || item.href?.startsWith(prefix + "/")
          );
        })
      : commandItems;

    if (!query.trim()) return baseItems;
    const q = query.toLowerCase().trim();
    return baseItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.desc?.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      const matchCategory = item.category.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchKeywords || matchCategory;
    });
  }, [commandItems, query, isCore]);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input saat modal terbuka
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      }, 50);
    } else {
      setQuery("");
    }
  }, [open]);

  // Reset index saat filter berubah
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Handle navigate item
  const handleSelect = (item: CommandItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  return (
    <>
      {/* ── SEARCH TRIGGER BUTTON (HEADER) ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cari menu atau tekan Ctrl+K"
        className="flex items-center gap-2.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors text-xs font-medium shadow-xs w-36 sm:w-64 justify-between select-none"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Cari menu &amp; aksi...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 font-mono shadow-xs">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* ── COMMAND SEARCH MODAL ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden text-slate-800 dark:text-zinc-100 flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
              <Search className="w-5 h-5 text-slate-400 dark:text-zinc-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ketik nama menu, aksi, atau tagihan..."
                className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd
                onClick={() => setOpen(false)}
                className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
              >
                ESC
              </kbd>
            </div>

            {/* List Results */}
            <div
              ref={listRef}
              className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-100 dark:divide-zinc-800/60"
            >
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                  <p className="font-semibold text-sm text-slate-800 dark:text-zinc-200">
                    Tidak ditemukan hasil
                  </p>
                  <p className="mt-1">
                    Coba kata kunci lain seperti &quot;tagihan&quot;, &quot;warga&quot;, atau &quot;rute&quot;.
                  </p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      data-index={index}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs"
                          : "hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.desc && (
                            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                              {item.desc}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono text-xs">
                    ↑↓
                  </kbd>{" "}
                  Pilih
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono text-xs">
                    ↵
                  </kbd>{" "}
                  Buka
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                UPS HERU Quick Command
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
