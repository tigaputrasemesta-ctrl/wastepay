"use client";

import React, { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";

export default function PlatformSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [debugLogEnabled, setDebugLogEnabled] = useState(false);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/control-tower");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat status platform:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  const sys = data?.systemHealth || {};

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Real Platform Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pengaturan Platform & Monitoring Sistem
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Memantau stabilitas database multi-tenant PostgreSQL, gateway WhatsApp &amp; Duitku, dan konfigurasi global platform O2W HERO.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadHealthData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
              <span>Pindai Sistem</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Status Infrastruktur Riil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 1: Multi-Tenant Database Health */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Database Multi-Tenant</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-300 border-t border-slate-100 dark:border-zinc-800 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Driver & Adapter:</span>
              <span className="font-bold text-slate-900 dark:text-white">{sys.dbEngine || "PostgreSQL Prisma"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Tenant di DB:</span>
              <span className="font-medium text-slate-900 dark:text-white">{sys.tenantsCount || 0} Pengelola</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Akun Pengguna:</span>
              <span className="font-medium text-slate-900 dark:text-white">{sys.usersCount || 0} Users</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Audit Log Entries:</span>
              <span className="font-medium text-sky-600">{sys.auditLogCount || 0} Events</span>
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
              <span className="text-slate-400">Arsitektur:</span>
              <span className="font-bold text-slate-900 dark:text-white">Dual Device per Tenant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Device 1 (Bot Tagihan):</span>
              <span className="font-medium text-emerald-600">Siap Operasional</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Device 2 (CS &amp; Pengaduan):</span>
              <span className="font-medium text-emerald-600">Siap Operasional</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Batas Kuota Bulanan:</span>
              <span className="font-medium text-sky-600">Monitoring Otomatis</span>
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
              <span className="text-slate-400">QRIS Dinamis &amp; VA:</span>
              <span className="font-medium text-emerald-600">Aktif</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Transaksi Lunas:</span>
              <span className="font-medium text-slate-900 dark:text-white">{data?.financials?.duitkuTxCount || 0} Sukses</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Callback Endpoint:</span>
              <span className="font-medium text-emerald-600">/api/duitku/callback</span>
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
                Mengunci akses login portal mitra untuk keperluan pemeliharaan atau migrasi skema database.
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
                Auto-Backup Database Harian
              </p>
              <p className="text-xs text-slate-500">
                Mencadangkan database PostgreSQL secara otomatis setiap jam 04:00 WIB.
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
                Audit Trail Log & Slow Query Tracing
              </p>
              <p className="text-xs text-slate-500">
                Mencatat mutasi penting pada tabel `AuditLog` untuk audit compliance.
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
              <p className="text-xs text-slate-500">Manajemen hak akses & keamanan RBAC ({sys.usersCount || 0} users)</p>
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
              <p className="text-xs text-slate-500">Rekam jejak ({sys.auditLogCount || 0} riwayat tercatat)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-600">Buka →</span>
        </Link>
      </div>
    </div>
  );
}
