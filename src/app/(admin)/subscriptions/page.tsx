"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Package,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Edit3,
  Calendar,
  Layers,
  Loader2,
  RefreshCw,
  DollarSign,
  Wallet,
  Download,
  Filter,
  Search,
  ExternalLink,
  Sliders,
  Settings,
  Percent,
} from "lucide-react";
import { TenantCommissionReportItem } from "@/app/api/core/subscriptions/reports/route";
import { SAAS_PLANS, type SaasPlanDefinition as SaasTier } from "@/lib/saas-plans";

const TIERS: SaasTier[] = SAAS_PLANS;

interface RealTenantSub {
  id: string;
  slug: string;
  namaMitra: string;
  penanggungJawab: string | null;
  kota: string;
  tipePengelola: string;
  status: string;
  paketLangganan: string;
  hasDedicatedDb: boolean;
  createdAt: string;
}

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "tiers" ? "tiers" : "commission_report";

  const [activeTab, setActiveTab] = useState<"commission_report" | "active_tenants" | "tiers">(initialTab);
  const [tenants, setTenants] = useState<RealTenantSub[]>([]);
  const [reports, setReports] = useState<TenantCommissionReportItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter state untuk laporan komisi
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Ambil data langganan & laporan komisi per tenant
      const [reportRes, subRes] = await Promise.all([
        fetch("/api/core/subscriptions/reports").then((r) => r.json()).catch(() => null),
        fetch("/api/core/control-tower").then((r) => r.json()).catch(() => null),
      ]);

      if (reportRes?.success) {
        setReports(reportRes.reports || []);
        setSummary(reportRes.summary || null);
      }

      if (subRes?.success && subRes.data) {
        setTenants(subRes.data.tenants || []);
      }
    } catch (err) {
      console.error("Gagal memuat data langganan & komisi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        r.namaMitra.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.primaryDomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.kota.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchPlan = filterPlan === "all" || r.planName.toLowerCase() === filterPlan.toLowerCase();

      return matchSearch && matchStatus && matchPlan;
    });
  }, [reports, searchQuery, filterStatus, filterPlan]);

  // Ekspor CSV Laporan Komisi per Tenant
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = [
      "ID Tenant",
      "Nama Mitra",
      "Slug",
      "Domain",
      "Tipe Pengelola",
      "Status",
      "Paket Langganan",
      "MRR Paket (Rp)",
      "Setup Fee Domain (Rp)",
      "Status Setup Fee",
      "Komisi Flat (Rp)",
      "Komisi Rate (%)",
      "Jumlah Transaksi Lunas",
      "Gross GMV (Rp)",
      "Komisi O2W HERO (Rp)",
      "Fee Gateway (Rp)",
      "Kas Bersih Hak Mitra (Rp)",
      "Total Payout Dicairkan (Rp)",
      "Sisa Saldo Escrow (Rp)",
      "Bank Mitra",
      "Nomor Rekening",
      "Atas Nama",
      "Jadwal Payout",
    ];

    const rows = filteredReports.map((r) => [
      `"${r.tenantId}"`,
      `"${r.namaMitra.replace(/"/g, '""')}"`,
      `"${r.slug}"`,
      `"${r.primaryDomain}"`,
      `"${r.tipePengelola}"`,
      `"${r.status}"`,
      `"${r.planName}"`,
      r.priceMonthly,
      r.domainSetupFee,
      r.setupFeePaid ? "Lunas" : "Belum",
      r.platformFeeNominal,
      r.platformFeeRate,
      r.txCount,
      r.grossGmv,
      r.commissionO2w,
      r.gatewayFee,
      r.netMitra,
      r.payoutPaid,
      r.pendingEscrow,
      `"${r.bankName}"`,
      `'${r.bankAccountNumber}'`,
      `"${r.bankAccountHolder.replace(/"/g, '""')}"`,
      `"${r.payoutSchedule}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Laporan_Komisi_Tenant_O2W_HERO_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Package className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Subscription & Commission Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Laporan Langganan & Komisi per Tenant
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Monitoring pendapatan SaaS, rekapitulasi komisi platform (Rp 1.000 + rate %), biaya setup domain, serta saldo kas escrow per mitra operasional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredReports.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <Link
              href="/tenants"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Kelola Mitra</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("commission_report")}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "commission_report"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Laporan Komisi per Tenant ({reports.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("active_tenants")}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "active_tenants"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Status Paket Langganan ({tenants.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("tiers")}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "tiers"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Katalog Paket & Pricing</span>
        </button>
      </div>

      {/* TAB 1: LAPORAN KOMISI PER TENANT */}
      {activeTab === "commission_report" && (
        <div className="space-y-6">
          {/* Ringkasan Finansial Ekosistem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total Komisi O2W HERO</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  Rp {(summary?.totalCommissionO2w || 0).toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Dari komisi transaksi lunas per tenant
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total GMV Transaksi Warga</span>
                <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  Rp {(summary?.totalGmv || 0).toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Gross perputaran retribusi ekosistem
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">SaaS MRR & Setup Domain</span>
                <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  Rp {((summary?.totalSubscriptionMrr || 0) + (summary?.totalSetupFeeIncome || 0)).toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  MRR: Rp {(summary?.totalSubscriptionMrr || 0).toLocaleString("id-ID")} • Setup: Rp {(summary?.totalSetupFeeIncome || 0).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Saldo Kas Hak Mitra (Escrow)</span>
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  Rp {(summary?.totalPendingEscrow || 0).toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Siap dicairkan ke rekening bank mitra
                </p>
              </div>
            </div>
          </div>

          {/* Bar Filter & Pencarian */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama mitra, slug, domain, kota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-white text-xs font-medium outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="masa_percobaan">Masa Percobaan</option>
                  <option value="suspend">Suspend</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Paket:</span>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-slate-900 dark:text-white text-xs font-medium outline-none"
                >
                  <option value="all">Semua Paket</option>
                  <option value="pro">Pro</option>
                  <option value="basic">Basic / Starter</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="percontohan">Percontohan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Laporan Komisi per Tenant */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
              <p className="text-xs">Menyusun laporan komisi & langganan tenant...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-slate-500">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak Ada Data Tenant Sesuai Filter</h3>
              <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-5 py-3.5">Mitra & Domain</th>
                      <th className="px-5 py-3.5">Paket & Setup Fee</th>
                      <th className="px-5 py-3.5">Skema Komisi O2W</th>
                      <th className="px-5 py-3.5 text-right">Volume & Gross GMV</th>
                      <th className="px-5 py-3.5 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                        Komisi O2W HERO
                      </th>
                      <th className="px-5 py-3.5 text-right">Kas Bersih Mitra</th>
                      <th className="px-5 py-3.5">Rekening Pencairan</th>
                      <th className="px-5 py-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredReports.map((item) => (
                      <tr key={item.tenantId} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                        {/* Mitra & Domain */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                            <span>{item.namaMitra}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`https://${item.primaryDomain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 dark:text-sky-400 font-mono text-[11px] hover:underline flex items-center gap-1"
                            >
                              <span>{item.primaryDomain}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 uppercase">
                              {item.tipePengelola}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            {item.kota} • {item.wargaCount} Warga Aktif
                          </span>
                        </td>

                        {/* Paket & Setup Fee */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold px-2 py-0.5 rounded-md text-[11px] bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 uppercase">
                              {item.planName}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {item.priceMonthly > 0 ? `Rp ${item.priceMonthly.toLocaleString("id-ID")}/bln` : "Gratis / Pilot"}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px]">
                            <span className="text-slate-400">Setup Domain: </span>
                            {item.setupFeePaid ? (
                              <span className="text-emerald-700 font-bold">Lunas (Rp 2 Jt)</span>
                            ) : (
                              <span className="text-amber-700 font-bold">Tertunda (Rp 2 Jt)</span>
                            )}
                          </div>
                        </td>

                        {/* Skema Komisi */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800 dark:text-zinc-200">
                            Rp {item.platformFeeNominal.toLocaleString("id-ID")} <span className="text-slate-400 font-normal">/ transaksi</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Rate: {item.platformFeeRate}% • Mode: {item.gatewayMode === "centralized_pool" ? "Pool O2W" : "Dedicated"}
                          </div>
                        </td>

                        {/* Volume & Gross GMV */}
                        <td className="px-5 py-4 text-right">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            Rp {item.grossGmv.toLocaleString("id-ID")}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.txCount} Transaksi Lunas
                          </span>
                        </td>

                        {/* Komisi O2W HERO */}
                        <td className="px-5 py-4 text-right bg-emerald-50/40 dark:bg-emerald-950/20">
                          <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                            Rp {item.commissionO2w.toLocaleString("id-ID")}
                          </div>
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 mt-0.5">
                            O2W Share
                          </span>
                        </td>

                        {/* Kas Bersih Mitra */}
                        <td className="px-5 py-4 text-right">
                          <div className="font-bold text-slate-900 dark:text-white">
                            Rp {item.netMitra.toLocaleString("id-ID")}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Cair: Rp {item.payoutPaid.toLocaleString("id-ID")} • <span className="text-amber-700 font-semibold">Sisa: Rp {item.pendingEscrow.toLocaleString("id-ID")}</span>
                          </div>
                        </td>

                        {/* Rekening Pencairan */}
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800 dark:text-zinc-200">
                            {item.bankName} - <span className="font-mono">{item.bankAccountNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            a.n {item.bankAccountHolder} ({item.payoutSchedule})
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-5 py-4 text-center">
                          <Link
                            href={`/tenants?edit=${item.tenantId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold transition-all"
                            title="Atur Skema Komisi & Pembayaran Mitra"
                          >
                            <Settings className="w-3.5 h-3.5 text-sky-600" />
                            <span>Atur</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STATUS PAKET LANGGANAN MITRA RIIL */}
      {activeTab === "active_tenants" && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-slate-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
              <p className="text-xs">Memuat data langganan dari database...</p>
            </div>
          ) : tenants.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-slate-500">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Tenant Terdaftar</h3>
              <p className="text-xs mt-1">Daftarkan mitra baru melalui menu Manajemen Mitra.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nama Mitra</th>
                    <th className="px-6 py-4">Paket Aktif</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Tipe Database</th>
                    <th className="px-6 py-4">Terdaftar Sejak</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {tenants.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-sky-600" />
                          <span>{item.namaMitra}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">@{item.slug} • {item.kota}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold px-2.5 py-1 rounded-lg text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 uppercase">
                          Paket {item.paketLangganan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.status === "aktif" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                            <Clock className="w-3.5 h-3.5" /> {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-zinc-300">
                        {item.hasDedicatedDb ? (
                          <span className="text-emerald-700 font-bold">Dedicated DB</span>
                        ) : (
                          <span className="text-slate-500">Shared Schema</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/tenants?edit=${item.id}`}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          Ubah Paket
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KATALOG PAKET LANGGANAN */}
      {activeTab === "tiers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all ${
                tier.recommended
                  ? "bg-slate-900 text-white border-2 border-sky-500 shadow-xl relative"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-400 text-white font-black text-[10px] tracking-wider uppercase shadow-md">
                  Paling Populer (TPS 3R)
                </div>
              )}

              <div>
                <div className="space-y-1 mb-4">
                  <h3 className="text-xl font-extrabold">{tier.name}</h3>
                  <p className={`text-xs ${tier.recommended ? "text-slate-300" : "text-slate-500 dark:text-zinc-400"}`}>
                    {tier.target}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-2xl font-black">{tier.priceFormatted}</span>
                  <p className={`text-[11px] mt-1 ${tier.recommended ? "text-slate-400" : "text-slate-500"}`}>
                    {tier.wargaMax} • {tier.waQuota.toLocaleString()} Kuota WA/bln
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-200/20 dark:border-zinc-800 text-xs">
                  <span className="font-bold text-[11px] uppercase tracking-wider block opacity-70">
                    Fitur & Arsitektur:
                  </span>
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/20 dark:border-zinc-800">
                <Link
                  href="/tenants"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center block transition-all ${
                    tier.recommended
                      ? "bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20"
                      : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200"
                  }`}
                >
                  Terapkan ke Mitra
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
          <p className="text-xs">Memuat halaman langganan & laporan komisi...</p>
        </div>
      }
    >
      <SubscriptionsContent />
    </Suspense>
  );
}
