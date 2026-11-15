"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Database,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Globe,
  MessageCircle,
  CreditCard,
  FileText,
  Users,
  Activity,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function PlatformSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [debugLogEnabled, setDebugLogEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshHealth = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Platform Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pengaturan Platform & Monitoring Sistem
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Memantau stabilitas database multi-tenant, infrastruktur gateway WhatsApp & Duitku, serta konfigurasi global platform O2W HERO.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshHealth}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-sky-400" : ""}`} />
              <span>Cek Kesehatan Sistem</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Status Infrastruktur */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 1: Multi-Tenant Database Health */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Database Multi-Tenant</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Healthy
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300 border-t border-slate-100 dark:border-zinc-800 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Core PostgreSQL:</span>
              <span className="font-bold text-slate-900 dark:text-white">Connected (2.1ms)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connection Pool:</span>
              <span className="font-medium">14 / 100 Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Backup Otomatis:</span>
              <span className="font-medium text-emerald-600">04:00 WIB (Harian)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Isolasi DB:</span>
              <span className="font-medium text-sky-600">Zero-Leakage Active</span>
            </div>
          </div>
        </div>

        {/* Box 2: Dual WhatsApp Gateway Cluster */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4 text-teal-600" />
              <span>Gateway Dual WhatsApp</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Online
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300 border-t border-slate-100 dark:border-zinc-800 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Provider Service:</span>
              <span className="font-bold text-slate-900 dark:text-white">Fonnte & Wablas Pool</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nomor 1 (Bot Tagihan):</span>
              <span className="font-medium text-emerald-600">Terhubung (SLA 99.8%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nomor 2 (CS Warga):</span>
              <span className="font-medium text-emerald-600">Terhubung (SLA 99.9%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rata-rata Delay Blast:</span>
              <span className="font-medium">1.5 Detik (Anti-Banned)</span>
            </div>
          </div>
        </div>

        {/* Box 3: Duitku Payment Gateway Health */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-sky-600" />
              <span>Payment Gateway (Duitku)</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300 border-t border-slate-100 dark:border-zinc-800 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Gateway Mode:</span>
              <span className="font-bold text-slate-900 dark:text-white">Centralized Escrow Pool</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">QRIS Dinamis API:</span>
              <span className="font-medium text-emerald-600">Normal (0.8s Latency)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Virtual Account:</span>
              <span className="font-medium">BCA, Mandiri, BRI, BNI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Callback Webhook:</span>
              <span className="font-medium text-emerald-600">200 OK Response</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags & Control Toggles */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-600" />
          <span>Feature Flags & Kontrol Operasional Platform</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Maintenance Mode Platform
              </p>
              <p className="text-xs text-slate-500">
                Mengunci akses login mitra untuk keperluan pemeliharaan atau migrasi skema database.
              </p>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`p-1 rounded-full transition-colors ${
                maintenanceMode ? "text-rose-600" : "text-slate-300 dark:text-zinc-600"
              }`}
            >
              {maintenanceMode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Auto-Backup Snapshot Harian
              </p>
              <p className="text-xs text-slate-500">
                Mencadangkan seluruh database tenant dan core secara otomatis setiap jam 04:00 WIB.
              </p>
            </div>
            <button
              onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
              className={`p-1 rounded-full transition-colors ${
                autoBackupEnabled ? "text-emerald-600" : "text-slate-300 dark:text-zinc-600"
              }`}
            >
              {autoBackupEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Debug Audit Log & Slow Query Tracing
              </p>
              <p className="text-xs text-slate-500">
                Mencatat query dengan latensi &gt; 500ms untuk optimasi performa skala besar.
              </p>
            </div>
            <button
              onClick={() => setDebugLogEnabled(!debugLogEnabled)}
              className={`p-1 rounded-full transition-colors ${
                debugLogEnabled ? "text-emerald-600" : "text-slate-300 dark:text-zinc-600"
              }`}
            >
              {debugLogEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </div>

      {/* System Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/users"
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs hover:border-sky-500 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Kelola Akun Superadmin
              </h4>
              <p className="text-xs text-slate-500">Manajemen hak akses & keamanan RBAC</p>
            </div>
          </div>
          <span className="text-xs font-bold text-sky-600">Buka →</span>
        </Link>

        <Link
          href="/audit-log"
          className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs hover:border-sky-500 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Audit Trail Log Sistem
              </h4>
              <p className="text-xs text-slate-500">Rekam jejak mutasi & akses kontrol</p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-600">Buka →</span>
        </Link>
      </div>
    </div>
  );
}
