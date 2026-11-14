"use client";

import React from "react";
import Link from "next/link";
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
  MapPin
} from "lucide-react";

export interface CoreStatsData {
  totalTenants: number;
  activeTenants: number;
  pendingRegistrations: number;
  estimasiWargaEkosistem: number;
  tenantsList: any[];
  recentRegistrations: any[];
}

export default function CoreSaaSDashboard({ stats }: { stats: CoreStatsData }) {
  return (
    <div className="space-y-8 pb-12 font-sans">
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
              {stats.recentRegistrations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                  Belum ada permohonan kemitraan baru masuk.
                </div>
              ) : (
                stats.recentRegistrations.map((reg: any) => (
                  <div
                    key={reg.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 space-y-2"
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {reg.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {reg.kota}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        {reg.estimasiWarga} KK
                      </span>
                    </div>
                  </div>
                ))
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
