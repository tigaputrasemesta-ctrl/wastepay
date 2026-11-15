"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Building2,
  MessageCircle,
  Send,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Database,
  ArrowRight,
  ShieldAlert,
  Zap,
  Loader2,
} from "lucide-react";

interface SaasAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  tenantName: string;
  tenantSlug: string;
  title: string;
  description: string;
  category: "wa_quota" | "billing" | "database" | "webhook";
  createdAt: string;
  actionLabel: string;
  actionHref?: string;
}

export default function NotifikasiSaasPage() {
  const [alerts, setAlerts] = useState<SaasAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/control-tower");
      const json = await res.json();
      if (json.success && json.data) {
        setAlerts(json.data.alerts || []);
      }
    } catch (err) {
      console.error("Gagal memuat alert riil:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = alerts.filter((alt) => {
    const matchSev = filterSeverity === "all" || alt.severity === filterSeverity;
    const matchSearch =
      alt.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      alt.title.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-rose-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>SaaS Control Tower — Real-Time Alert Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pusat Peringatan & Tenant Bermasalah
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Peringatan otomatis yang dievaluasi langsung dari kondisi kuota WhatsApp, kegagalan webhook, dan status tagihan di database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAlerts}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-400" : ""}`} />
              <span>Scan Ulang Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              P0 — Kritis
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {loading ? "..." : `${criticalCount} Kasus`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Memerlukan tindakan segera
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              P1 — Peringatan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {loading ? "..." : `${warningCount} Kasus`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Peringatan kuota atau kegagalan kirim
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Status Server
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {criticalCount === 0 ? "Normal" : "Ada Isu"}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Database connection &amp; gateway status
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama tenant atau isu..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "Semua Alert" },
            { id: "critical", label: "P0 Kritis" },
            { id: "warning", label: "P1 Peringatan" },
            { id: "info", label: "P2 Info" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSeverity(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterSeverity === tab.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-600" />
          <p className="text-xs">Memeriksa database dan status gateway...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-slate-500 dark:text-zinc-400">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Semua Sistem Beroperasi Normal</h3>
          <p className="text-xs mt-1">Tidak ditemukan kendala kritis pada kuota WhatsApp, gateway pembayaran, atau database tenant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.severity === "critical"
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                  : item.severity === "warning"
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.severity === "critical"
                      ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
                      : item.severity === "warning"
                      ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                      : "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"
                  }`}
                >
                  {item.category === "wa_quota" && <MessageCircle className="w-5 h-5" />}
                  {item.category === "billing" && <CreditCard className="w-5 h-5" />}
                  {item.category === "webhook" && <Zap className="w-5 h-5" />}
                  {item.category === "database" && <Database className="w-5 h-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {item.tenantName}
                    </span>
                    <span className="text-[10px] text-slate-400">• {item.createdAt}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {item.actionHref && (
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-2xs transition-all"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
