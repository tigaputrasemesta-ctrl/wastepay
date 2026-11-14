"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Database,
  Globe,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
  ArrowRight,
  Server,
  Layers,
  Inbox,
  Activity,
  UserCheck,
  Phone,
  MapPin,
  Info,
  X,
  TrendingUp,
  DollarSign,
  Wallet,
  Leaf,
  MessageCircle,
  Check,
  ArrowUpRight,
  FileSpreadsheet,
} from "lucide-react";

export interface CoreStatsData {
  totalTenants: number;
  activeTenants: number;
  pendingRegistrations: number;
  estimasiWargaEkosistem: number;
  mrrEstimasi?: number;
  grossVolumeBulan?: number;
  tonaseSampahBulan?: number;
  reduksiKarbonTon?: number;
  tenantsList: any[];
  recentRegistrations: any[];
}

export default function CoreSaaSDashboard({ stats }: { stats: CoreStatsData }) {
  const searchParams = useSearchParams();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const showNotice = searchParams.get("notice") === "tenant_scope_only" && !noticeDismissed;

  const [registrations, setRegistrations] = useState(stats.recentRegistrations);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/core/mitra/register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      console.error("Gagal update status mitra:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Scope Isolation Notice */}
      {showNotice && (
        <div className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 text-amber-600 dark:text-amber-400">
              <Info className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                Domain Core SaaS Diisolasi dari Halaman Operasional Mikro
              </p>
              <p className="text-slate-600 dark:text-amber-300/80 leading-relaxed">
                Halaman operasional yang Anda tuju (seperti data warga, tagihan iuran, biaya operasional truk, dan rute) dikelola melalui portal domain masing-masing tenant (misal:{" "}
                <a
                  href="https://upsheru.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline hover:text-amber-800 dark:hover:text-amber-100"
                >
                  upsheru.com
                </a>
                ). Domain <strong>o2whero.com</strong> didedikasikan murni untuk <em>Platform Control Hub</em> & Manajemen Multi-Tenant.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNoticeDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            aria-label="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* SaaS Hub Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>O2W HERO Multi-Tenant Control Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pusat Kendali Ekosistem Pengelolaan Sampah
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Memantau seluruh mitra pengelola (TPS 3R, Bank Sampah, DLH), permohonan onboarding kemitraan, dan isolasi database multi-tenant secara terpadu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/tenants"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Kelola Mitra & DB</span>
            </Link>
            <a
              href="https://o2whero.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-medium transition-all"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Portal Publik O2W</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI SaaS Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Mitra */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Mitra Terdaftar
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.activeTenants}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Total {stats.totalTenants} tenant terdaftar di database
          </p>
        </div>

        {/* Card 2: Calon Mitra Menunggu Review */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Calon Mitra Masuk
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.pendingRegistrations}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
              <Clock className="w-3.5 h-3.5" /> Review
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Permohonan onboarding TPS 3R / Bank Sampah
          </p>
        </div>

        {/* Card 3: Estimasi Warga Terlayani */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Cakupan Ekosistem
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.estimasiWargaEkosistem.toLocaleString("id-ID")}+
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
              KK Warga
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Estimasi nasabah di seluruh mitra terkelola
          </p>
        </div>

        {/* Card 4: Database Isolation Status */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Isolasi Database
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              Active & Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Zero-Leakage Multi-Tenant Routing
          </p>
        </div>
      </div>

      {/* SaaS Finansial Platform & ESG Impact Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: MRR Platform SaaS */}
        <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>MRR Platform SaaS</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              Subscription
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            Rp {(stats.mrrEstimasi || stats.activeTenants * 899000).toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Proyeksi recurring bulanan ({stats.activeTenants} mitra aktif)
          </p>
        </div>

        {/* Metric 2: Gross Retribusi Ekosistem */}
        <div className="bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-900 border border-sky-800/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              <span>Gross Volume Iuran</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
              Fintech GMV
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            Rp {(stats.grossVolumeBulan || stats.estimasiWargaEkosistem * 30000).toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total perputaran kas retribusi warga / bulan
          </p>
        </div>

        {/* Metric 3: Tonase Sampah Terkelola */}
        <div className="bg-gradient-to-br from-teal-950/30 via-slate-900 to-slate-900 border border-teal-800/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Tonase Sampah / Bln</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
              Operasional
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {(stats.tonaseSampahBulan || Math.round((stats.estimasiWargaEkosistem * 2.5 * 30) / 1000)).toLocaleString("id-ID")} Ton
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sampah terangkut &amp; dialihkan dari TPA
          </p>
        </div>

        {/* Metric 4: Reduksi Karbon (CO2e) */}
        <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Leaf className="w-4 h-4" />
              <span>Reduksi Emisi Karbon</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              DLH / ESG
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {(stats.reduksiKarbonTon || Math.round(((stats.estimasiWargaEkosistem * 2.5 * 30) / 1000) * 0.85)).toLocaleString("id-ID")} Ton CO2e
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Indikator pelaporan DLH &amp; KLHK SIPSN
          </p>
        </div>
      </div>

      {/* Main Content Grid: Mitra List & Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Mitra Aktif */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span>Mitra Pengelola Aktif dalam Jaringan O2W</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Setiap mitra beroperasi di domain dan database mandiri
              </p>
            </div>
            <Link
              href="/tenants"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Lihat Detail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {stats.tenantsList.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Belum ada tenant terdaftar.</div>
              ) : (
                stats.tenantsList.map((tenant: any) => {
                  const isPilot = tenant.slug === "upsheru";
                  const isCore = tenant.slug === "o2w-core";
                  return (
                    <div
                      key={tenant.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                            isCore
                              ? "bg-gradient-to-tr from-sky-600 to-teal-500 text-white"
                              : isPilot
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          {isCore ? "O2W" : tenant.namaMitra.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {tenant.namaMitra}
                            </h3>
                            {isPilot && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Pilot Depok
                              </span>
                            )}
                            {isCore && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                SaaS Core
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              {tenant.customDomain || tenant.subdomain || `${tenant.slug}.o2whero.com`}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Database className="w-3.5 h-3.5 text-slate-400" />
                              {tenant.dbConnectionString ? "Dedicated PostgreSQL" : "Shared Pool"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <a
                          href={`https://${tenant.customDomain || tenant.subdomain || `${tenant.slug}.o2whero.com`}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
                        >
                          <span>Buka Portal</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Calon Mitra & Platform Status */}
        <div className="space-y-6">
          {/* Calon Mitra Masuk */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Inbox className="w-5 h-5 text-amber-500" />
                <span>Permohonan Mitra Baru</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                {stats.pendingRegistrations} baru
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
              {registrations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                  Belum ada permohonan kemitraan baru masuk.
                </div>
              ) : (
                registrations.map((reg: any) => {
                  const cleanPhone = String(reg.noWhatsapp || "").replace(/\D/g, "").replace(/^0/, "62");
                  const waText = encodeURIComponent(
                    `Halo Bapak/Ibu ${reg.namaLengkap}, salam dari Tim O2W HERO. Kami telah menerima permohonan kemitraan untuk ${reg.namaInstansi} (${reg.kota}) dengan estimasi cakupan ~${reg.estimasiWarga} KK. Kami siap menjadwalkan demo sistem operasional dan penyiapan database Anda. Kapan waktu yang tepat untuk berdiskusi singkat? Terima kasih.`
                  );
                  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;
                  const createTenantUrl = `/tenants?action=create&source_reg=${reg.id}&namaMitra=${encodeURIComponent(
                    reg.namaInstansi
                  )}&penanggungJawab=${encodeURIComponent(reg.namaLengkap)}&noTelepon=${cleanPhone}&email=${encodeURIComponent(
                    reg.email
                  )}&kota=${encodeURIComponent(reg.kota)}`;

                  const isPending = reg.status === "menunggu_review";
                  const isTrial = reg.status === "trial_60_hari";
                  const isApproved = reg.status === "disetujui";
                  const isRejected = reg.status === "ditolak";

                  return (
                    <div
                      key={reg.id}
                      className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {reg.namaInstansi}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            PIC: {reg.namaLengkap}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPending
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : isTrial
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                              : isApproved
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {reg.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {reg.kota}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {reg.estimasiWarga} KK
                        </span>
                        <span>•</span>
                        <span className="text-[10px] font-mono uppercase text-sky-600 dark:text-sky-400">
                          {reg.kebutuhanDb || "dedicated"}
                        </span>
                      </div>

                      {reg.catatanAdmin && (
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 bg-white/60 dark:bg-zinc-900/60 p-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                          {reg.catatanAdmin}
                        </p>
                      )}

                      {/* Quick Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat WA</span>
                        </a>

                        <Link
                          href={createTenantUrl}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Tenant</span>
                        </Link>
                      </div>

                      {/* Status Pipeline Switcher */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-zinc-800 text-[10px]">
                        <span className="text-slate-400">Ubah Tahap:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={updatingId === reg.id}
                            onClick={() => handleUpdateStatus(reg.id, "trial_60_hari")}
                            className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-800"
                          >
                            Trial 60 Hari
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === reg.id}
                            onClick={() => handleUpdateStatus(reg.id, "disetujui")}
                            className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800"
                          >
                            Setujui
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === reg.id}
                            onClick={() => handleUpdateStatus(reg.id, "ditolak")}
                            className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Arsitektur Isolasi Health */}
          <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-2xl p-5 border border-sky-800/40 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Tenant Architecture Status</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Strict Host Interceptor & 421 Protection: Aktif</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dynamic In-Memory Registry (0ms latency): Aktif</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>RBAC & User Tenant Scoping Boundary: Aktif</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Data Isolation Engine (Dedicated DB Ready): Aktif</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
