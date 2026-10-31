"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Search,
  RefreshCw,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  ExternalLink,
  Copy,
  Check,
  UserPlus,
  SlidersHorizontal,
  MessageCircle,
  Building,
  UserCheck,
  X,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface KontrolContact {
  id: string;
  phone: string;
  normPhone: string;
  savedName: string;
  publicName: string;
  displayName: string;
  isBusiness: boolean;
  source: "hp_admin" | "hp_petugas" | "keduanya";
  sourceLabel: string;
  isRegistered: boolean;
  isStaff: boolean;
  blastStatus?: "terkirim" | "pending_resend" | "belum_dikirim";
  labels: string[];
  indicatedArea: string;
  dbInfo?: {
    id: number;
    kodePelanggan: string;
    nama: string;
    status: string;
    alamat: string;
    kelurahan: string;
    wilayah: string;
    kategori: string;
    tarif: number;
  };
  staffInfo?: {
    role: string;
    jabatan: string;
    nama: string;
    catatan?: string;
  };
}

interface SummaryStats {
  totalKontak: number;
  sudahTerdaftar: number;
  belumTerdaftar: number;
  petugasDanKru: number;
  hpAdminCount: number;
  hpPetugasCount: number;
  keduanyaCount: number;
  berlabelKhususCount: number;
  blastTerkirimCount?: number;
  blastPendingResendCount?: number;
}

const DEFAULT_BLAST_MESSAGE = `*PEMBERITAHUAN RESMI — UPS HERU DEPOK* 🚛
Layanan Terpadu Pengangkutan Sampah Warga

Yth. Bapak/Ibu {nama},

Demi meningkatkan mutu dan kepastian layanan penjemputan sampah, saat ini sistem operasional UPS HERU telah terintegrasi secara digital.

Bagi Bapak/Ibu yang sudah berlangganan tetapi nomornya belum terdaftar di sistem, mohon meluangkan waktu 1 menit untuk aktivasi data mandiri.

✨ *Keuntungan Rumah Anda Terdaftar di Sistem:*

1️⃣ *Bayar Iuran Lebih Praktis & Transparan*
Tagihan bulanan dan kuitansi otomatis masuk ke WhatsApp. Bisa bayar online 24 jam via QRIS (semua bank & e-wallet) atau tunai ke petugas tanpa khawatir kuitansi kertas hilang.

2️⃣ *Armada Pasti Tiba, Tidak Ada Rumah Terlewat*
Titik rumah Anda otomatis terhubung ke peta navigasi truk petugas. Sampah dijamin dijemput rutin sesuai jadwal, bahkan saat supir/petugas berganti.

3️⃣ *Layanan Pengaduan Cepat (Real-Time)*
Jika sampah belum terangkut atau ada kendala, laporan langsung mendapat *Nomor Tiket Resmi* dan otomatis terkirim ke HP petugas rute di lokasi untuk segera ditindaklanjuti.

---
👉 *Aktivasi Mandiri Sekarang (1 Menit, Bebas Biaya):*
{link_daftar}

📞 *Pusat Bantuan & Layanan Pelanggan:*
WhatsApp Admin: https://wa.me/6281400782617 (0814-0078-2617)

Terima kasih atas kerja samanya dalam menjaga kebersihan lingkungan bersama kami. 🙏
_Manajemen UPS HERU (WastePay)_`;

export default function DataKontrolPage() {
  const [contacts, setContacts] = useState<KontrolContact[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"semua" | "admin" | "petugas" | "kru">("semua");
  const [statusFilter, setStatusFilter] = useState<"semua" | "belum" | "sudah" | "label" | "pending_resend" | "terkirim">("semua");
  const [areaFilter, setAreaFilter] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-selection for Blast
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Blast Modal State
  const [isBlastModalOpen, setIsBlastModalOpen] = useState(false);
  const [senderMode, setSenderMode] = useState<"auto" | "hp_petugas" | "hp_admin">("auto");
  const [blastMessage, setBlastMessage] = useState(DEFAULT_BLAST_MESSAGE);
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [blastResult, setBlastResult] = useState<any | null>(null);

  // Copy notification toast
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Load Data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/data-kontrol");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal mengambil data`);
      }
      const data = await res.json();
      setContacts(data.contacts || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Distinct Areas
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.indicatedArea && c.indicatedArea !== "-") {
        set.add(c.indicatedArea);
      }
    });
    return Array.from(set).sort();
  }, [contacts]);

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // 1. Tab source filtering
      if (activeTab === "admin" && c.source !== "hp_admin" && c.source !== "keduanya") return false;
      if (activeTab === "petugas" && c.source !== "hp_petugas" && c.source !== "keduanya") return false;
      if (activeTab === "kru" && !c.isStaff) return false;

      // 2. Status pill filter
      if (statusFilter === "belum" && (c.isRegistered || c.isStaff)) return false;
      if (statusFilter === "sudah" && (!c.isRegistered || c.isStaff)) return false;
      if (statusFilter === "label" && c.labels.length === 0) return false;
      if (statusFilter === "pending_resend" && c.blastStatus !== "pending_resend") return false;
      if (statusFilter === "terkirim" && c.blastStatus !== "terkirim") return false;

      // 3. Area filter
      if (areaFilter !== "semua" && c.indicatedArea !== areaFilter) return false;

      // 4. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchName = c.displayName.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q) || c.normPhone.includes(q);
        const matchArea = c.indicatedArea.toLowerCase().includes(q);
        const matchDbName = c.dbInfo?.nama.toLowerCase().includes(q) || false;
        const matchDbKode = c.dbInfo?.kodePelanggan.toLowerCase().includes(q) || false;
        const matchDbAlamat = c.dbInfo?.alamat.toLowerCase().includes(q) || false;
        const matchLabel = c.labels.some((l) => l.toLowerCase().includes(q));

        if (!matchName && !matchPhone && !matchArea && !matchDbName && !matchDbKode && !matchDbAlamat && !matchLabel) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, activeTab, statusFilter, areaFilter, searchQuery]);

  // Handle Select All visible
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligible = filteredContacts.filter((c) => !c.isRegistered && !c.isStaff);
      setSelectedIds(new Set(eligible.map((c) => c.normPhone)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (normPhone: string) => {
    const next = new Set(selectedIds);
    if (next.has(normPhone)) {
      next.delete(normPhone);
    } else {
      next.add(normPhone);
    }
    setSelectedIds(next);
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Open Blast Drawer for Selected or All Unregistered
  const openBlastModal = (targetPhone?: string) => {
    if (targetPhone) {
      setSelectedIds(new Set([targetPhone]));
    }
    setBlastResult(null);
    setIsBlastModalOpen(true);
  };

  // Target list for blast
  const blastTargets = useMemo(() => {
    if (selectedIds.size > 0) {
      return contacts
        .filter((c) => selectedIds.has(c.normPhone) && !c.isRegistered && !c.isStaff)
        .map((c) => ({
          phone: c.normPhone,
          name: c.displayName,
          source: c.source,
          wilayah: c.indicatedArea !== "-" ? c.indicatedArea : undefined,
        }));
    }
    // If no specific selection, use all currently filtered unregistered contacts
    return filteredContacts
      .filter((c) => !c.isRegistered && !c.isStaff)
      .map((c) => ({
        phone: c.normPhone,
        name: c.displayName,
        source: c.source,
        wilayah: c.indicatedArea !== "-" ? c.indicatedArea : undefined,
      }));
  }, [contacts, filteredContacts, selectedIds]);

  // Execute Blast
  const handleExecuteBlast = async () => {
    if (blastTargets.length === 0) {
      alert("Tidak ada target calon pelanggan yang valid untuk di-blast.");
      return;
    }

    setIsSendingBlast(true);
    setBlastResult(null);

    try {
      const res = await fetch("/api/data-kontrol/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets: blastTargets,
          messageTemplate: blastMessage,
          senderMode,
          delayMs: 1200,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim blast WhatsApp");
      }
      setBlastResult(data.result);
      fetchData(true); // refresh live status
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat blast");
    } finally {
      setIsSendingBlast(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = "No,Nama Kontak,Nama Publik WA,Nomor Telepon,Nomor Standar,Sumber Data,Status Registrasi,ID DB,Kode Pelanggan,Nama di DB,Alamat DB,Wilayah/Blok,Label Khusus\n";
    filteredContacts.forEach((c, idx) => {
      const isReg = c.isRegistered ? "SUDAH TERDAFTAR" : (c.isStaff ? "TIM PETUGAS/KRU" : "BELUM TERDAFTAR");
      const dbId = c.dbInfo?.id || "-";
      const dbKode = c.dbInfo?.kodePelanggan || "-";
      const dbNama = c.dbInfo?.nama || "-";
      const dbAlamat = c.dbInfo?.alamat || "-";
      const labels = c.labels.join("; ") || "-";

      csv += `${idx + 1},"${c.savedName.replace(/"/g, '""')}","${c.publicName.replace(/"/g, '""')}","${c.phone}","${c.normPhone}","${c.sourceLabel}","${isReg}",${dbId},"${dbKode}","${dbNama.replace(/"/g, '""')}","${dbAlamat.replace(/"/g, '""')}","${c.indicatedArea}","${labels.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap_data_kontrol_wa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Pusat Sinkronisasi WhatsApp & Pendaftaran</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Data Kontrol Kontak & Blast Calon Pelanggan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Integrasi terpadu kontak <strong>HP Admin (081400782617)</strong> dan <strong>HP Petugas Survei (089688151473)</strong>.
            Tersinkronisasi langsung secara live dengan database untuk mendeteksi siapa yang sudah terdaftar dan siapa yang siap di-blast.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-sm disabled:opacity-60"
            title="Sinkronkan ulang data terhadap DB Pelanggan terkini"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-500" : ""}`} />
            <span>{refreshing ? "Menyinkronkan..." : "Sinkron Live DB"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => openBlastModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Blast WA ({selectedIds.size > 0 ? selectedIds.size : blastTargets.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Cards Grid */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Total Kontak Terpadu</span>
              <Smartphone className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {summary.totalKontak.toLocaleString("id-ID")}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>HP Admin: {summary.hpAdminCount}</span>
              <span>•</span>
              <span>HP Petugas: {summary.hpPetugasCount}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/40 shadow-sm bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/10">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <span>Sudah Terdaftar di DB</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.sudahTerdaftar.toLocaleString("id-ID")}
            </div>
            <div className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">
              {Math.round((summary.sudahTerdaftar / (summary.totalKontak || 1)) * 100)}% dari total kontak tersimpan
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-950/40 shadow-sm bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/10">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-medium">
              <span>Belum Terdaftar (Target Calon)</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.belumTerdaftar.toLocaleString("id-ID")}
            </div>
            <div className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
              Siap dikirimi blast / diarahkan mendaftar
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 dark:border-blue-950/40 shadow-sm">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-medium">
              <span>Tim Petugas & Kru Lapangan</span>
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.petugasDanKru}
            </div>
            <div className="mt-1 text-xs text-blue-600/80 dark:text-blue-400/80">
              Otomatis dikecualikan dari blast masal
            </div>
          </div>
        </div>
      )}

      {/* Banner Penanda 520 Kontak Tertunda Blast */}
      {summary && (summary.blastPendingResendCount || 0) > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
              ⚡
            </div>
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
                <span>{summary.blastPendingResendCount} Kontak Calon Pelanggan Tertunda (Siap Kirim Ulang)</span>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                  HP Petugas
                </span>
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 text-xs mt-0.5">
                Putaran 1 berhasil mengirim <strong>{summary.blastTerkirimCount || 527} pesan</strong> (HP Admin tuntas 100%). Sisa 520 kontak asal HP Petugas telah ditandai secara khusus dan siap dikirim ulang kapan saja.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStatusFilter("pending_resend")}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold hover:bg-amber-50 transition cursor-pointer shadow-xs"
            >
              Lihat 520 Kontak
            </button>
            <button
              onClick={() => {
                const pendingIds = contacts.filter((c) => c.blastStatus === "pending_resend").map((c) => c.normPhone);
                setSelectedIds(new Set(pendingIds));
                openBlastModal();
              }}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Ulang 520</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Tab Switcher & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Source Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab("semua")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "semua"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Semua Kontak ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "admin"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            HP Admin (081400782617)
          </button>
          <button
            onClick={() => setActiveTab("petugas")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "petugas"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            HP Petugas Survei (089688151473)
          </button>
          <button
            onClick={() => setActiveTab("kru")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "kru"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Tim & Kru Lapangan ({summary?.petugasDanKru || 0})
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, no HP, alamat, blok, atau label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Pill Filters */}
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter("semua")}
                className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "semua"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter("pending_resend")}
                className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "pending_resend"
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "text-amber-700 dark:text-amber-400 hover:text-amber-900"
                }`}
              >
                🟡 Siap Kirim Ulang ({summary?.blastPendingResendCount || 520})
              </button>
              <button
                onClick={() => setStatusFilter("terkirim")}
                className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "terkirim"
                    ? "bg-sky-600 text-white shadow-xs font-semibold"
                    : "text-sky-700 dark:text-sky-400 hover:text-sky-900"
                }`}
              >
                🟢 Pesan Terkirim ({summary?.blastTerkirimCount || 527})
              </button>
              <button
                onClick={() => setStatusFilter("belum")}
                className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "belum"
                    ? "bg-amber-500 text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                ⏳ Belum Terdaftar
              </button>
              <button
                onClick={() => setStatusFilter("sudah")}
                className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "sudah"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                ✅ Sudah Terdaftar
              </button>
              <button
                onClick={() => setStatusFilter("label")}
                className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "label"
                    ? "bg-purple-600 text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                🏷️ Berlabel Khusus
              </button>
            </div>

            {/* Area Dropdown */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="text-xs md:text-sm py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="semua">Semua Wilayah / Blok ({availableAreas.length})</option>
              {availableAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div>
            Menampilkan <strong>{filteredContacts.length}</strong> kontak dari total {contacts.length}
            {selectedIds.size > 0 && (
              <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                {selectedIds.size} dipilih
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const pendingIds = contacts.filter((c) => c.blastStatus === "pending_resend").map((c) => c.normPhone);
                setSelectedIds(new Set(pendingIds));
              }}
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded font-semibold transition cursor-pointer"
            >
              🟡 Pilih 520 Kontak Tertunda
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelectAll(true)}
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Pilih Semua Calon
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-slate-500 hover:underline"
            >
              Hapus Pilihan
            </button>
          </div>
        </div>
      </div>

      {/* 4. Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
            <p className="font-medium">Memuat dan mencocokkan data kontak dengan basis data live...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => fetchData(false)}
              className="mt-3 px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Smartphone className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="font-medium">Tidak ada kontak yang cocok dengan filter saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredContacts.filter((c) => !c.isRegistered && !c.isStaff).length > 0 &&
                        selectedIds.size >= filteredContacts.filter((c) => !c.isRegistered && !c.isStaff).length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Kontak WhatsApp</th>
                  <th className="py-3 px-3">Nomor Telepon</th>
                  <th className="py-3 px-3">Sumber HP</th>
                  <th className="py-3 px-3">Status Registrasi Sistem</th>
                  <th className="py-3 px-3">Indikasi Wilayah / Blok</th>
                  <th className="py-3 px-3">Label Catatan WA</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                {filteredContacts.map((c, index) => {
                  const isEligibleForBlast = !c.isRegistered && !c.isStaff;
                  const isChecked = selectedIds.has(c.normPhone);

                  return (
                    <tr
                      key={c.id + index}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                        isChecked ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        {isEligibleForBlast ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(c.normPhone)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                        )}
                      </td>

                      {/* Kontak WA */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {c.displayName}
                        </div>
                        {c.publicName && c.publicName !== "-" && c.publicName !== c.savedName && (
                          <div className="text-[11px] text-slate-400">
                            Nama Publik: {c.publicName}
                          </div>
                        )}
                        {c.isBusiness && (
                          <span className="inline-block mt-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-1.5 py-0.2 rounded">
                            Akun Bisnis
                          </span>
                        )}
                      </td>

                      {/* Nomor Telepon */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{c.phone}</span>
                          <button
                            onClick={() => handleCopyPhone(c.normPhone)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-0.5"
                            title="Salin nomor HP"
                          >
                            {copiedPhone === c.normPhone ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Sumber HP */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {c.source === "hp_admin" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            <Building className="w-3 h-3 text-slate-500" />
                            HP Admin
                          </span>
                        )}
                        {c.source === "hp_petugas" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3 text-indigo-500" />
                            HP Petugas
                          </span>
                        )}
                        {c.source === "keduanya" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 rounded-full">
                            <Layers className="w-3 h-3 text-purple-500" />
                            Admin & Petugas
                          </span>
                        )}
                      </td>

                      {/* Status Registrasi Sistem (LIVE DB) */}
                      <td className="py-3 px-3">
                        {c.isStaff ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-2.5 py-0.5 rounded-full">
                              <Shield className="w-3 h-3" />
                              TIM OPERASIONAL / KRU
                            </span>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                              {c.staffInfo?.nama || c.displayName} • {c.staffInfo?.jabatan}
                            </div>
                          </div>
                        ) : c.isRegistered && c.dbInfo ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              SUDAH TERDAFTAR RESMI
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              <strong>{c.dbInfo.nama}</strong> ({c.dbInfo.kodePelanggan})
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {c.dbInfo.alamat} • {c.dbInfo.wilayah} • Rp {c.dbInfo.tarif.toLocaleString("id-ID")}/bln
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              BELUM TERDAFTAR (CALON)
                            </span>
                            {c.blastStatus === "pending_resend" && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                                  🟡 Tertunda Kirim Ulang (520)
                                </span>
                              </div>
                            )}
                            {c.blastStatus === "terkirim" && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                                  🟢 Pesan Blast Terkirim
                                </span>
                              </div>
                            )}
                            <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                              Belum ada akun di WastePay
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Indikasi Lokasi / Blok */}
                      <td className="py-3 px-3">
                        {c.indicatedArea !== "-" ? (
                          <span className="inline-block text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {c.indicatedArea}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Label Catatan WA */}
                      <td className="py-3 px-3">
                        {c.labels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.labels.map((l, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 px-1.5 py-0.5 rounded"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat WA */}
                          <a
                            href={`https://wa.me/${c.normPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Buka Chat WhatsApp Web"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>

                          {/* Tombol Daftarkan Cepat jika belum terdaftar */}
                          {!c.isRegistered && !c.isStaff ? (
                            <Link
                              href={`/registrasi?nama=${encodeURIComponent(c.displayName)}&telepon=${encodeURIComponent(c.phone)}&alamat=${encodeURIComponent(c.indicatedArea !== "-" ? c.indicatedArea : "")}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition border border-emerald-200 dark:border-emerald-800"
                              title="Daftarkan warga ini secara resmi ke database"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Daftarkan</span>
                            </Link>
                          ) : c.isRegistered ? (
                            <Link
                              href={`/pelanggan?q=${encodeURIComponent(c.dbInfo?.kodePelanggan || c.normPhone)}`}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Buka profil pelanggan di menu Pelanggan"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Blast Drawer / Modal */}
      <AnimatePresence>
        {isBlastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs z-10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 rounded-lg">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Kirim Blast WhatsApp Calon Pelanggan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Target: <strong>{blastTargets.length} nomor calon pelanggan</strong> (bebas dari pelanggan lama & kru)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBlastModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5">
                {/* 1. Pengaturan Nomor Pengirim (Multi-Device Sender Routing) */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Routing Nomor Pengirim (Sender Device)
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Bebas salah sambung
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                    {/* Auto */}
                    <button
                      type="button"
                      onClick={() => setSenderMode("auto")}
                      className={`p-3 text-left rounded-lg border transition ${
                        senderMode === "auto"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Otomatis (Sesuai Asal)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Kontak petugas via HP Petugas, kontak admin via HP Admin.
                      </p>
                    </button>

                    {/* Paksa Petugas */}
                    <button
                      type="button"
                      onClick={() => setSenderMode("hp_petugas")}
                      className={`p-3 text-left rounded-lg border transition ${
                        senderMode === "hp_petugas"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold text-slate-800 dark:text-white mb-0.5">
                        HP Petugas (089688151473)
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Menggunakan token Fonnte khusus Survei Novi.
                      </p>
                    </button>

                    {/* Paksa Admin */}
                    <button
                      type="button"
                      onClick={() => setSenderMode("hp_admin")}
                      className={`p-3 text-left rounded-lg border transition ${
                        senderMode === "hp_admin"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-bold text-slate-800 dark:text-white mb-0.5">
                        HP Admin (081400782617)
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Menggunakan nomor WhatsApp Admin Utama.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Textarea Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Isi Pesan WhatsApp
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Variabel:</span>
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600">{"{nama}"}</code>
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600">{"{wilayah}"}</code>
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600">{"{link_daftar}"}</code>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={blastMessage}
                    onChange={(e) => setBlastMessage(e.target.value)}
                    className="w-full p-3 text-xs md:text-sm font-sans rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ketik isi pesan WhatsApp di sini..."
                  />
                </div>

                {/* 3. Preview Bubble */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Preview Tampilan di WhatsApp Konsumen:
                  </div>
                  <div className="bg-[#e5ddd5] dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs md:text-sm shadow-inner">
                    <div className="max-w-md bg-white dark:bg-[#1f2c34] text-slate-800 dark:text-slate-200 p-3 rounded-xl rounded-tl-none shadow-xs whitespace-pre-wrap leading-relaxed">
                      {blastMessage
                        .replace(/\{nama\}/gi, "Bapak Joko")
                        .replace(/\{wilayah\}/gi, "Blok Tabroni")
                        .replace(/\{link_daftar\}/gi, "https://upsheru.com/daftar")}
                      <div className="text-[10px] text-slate-400 text-right mt-1.5">
                        12:00 ✓✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Hasil Blast Jika Sudah Selesai */}
                {blastResult && (
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-2 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Ringkasan Pengiriman:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Berhasil:</span>{" "}
                        <strong className="text-emerald-600">{blastResult.totalSent}</strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Dilewati:</span>{" "}
                        <strong className="text-amber-600">{blastResult.totalSkipped}</strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Gagal:</span>{" "}
                        <strong className="text-rose-600">{blastResult.totalFailed}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="text-xs text-slate-500">
                  Delay anti-banned: <strong>1,2 detik per pesan</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBlastModalOpen(false)}
                    disabled={isSendingBlast}
                    className="px-4 py-2 text-xs md:text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteBlast}
                    disabled={isSendingBlast || blastTargets.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50"
                  >
                    {isSendingBlast ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengirim ({blastTargets.length} Target)...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Kirim Blast ({blastTargets.length} Nomor)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
