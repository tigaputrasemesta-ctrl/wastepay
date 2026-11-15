"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

interface SaasTier {
  id: string;
  name: string;
  target: string;
  priceMonthly: number;
  priceFormatted: string;
  waQuota: number;
  wargaMax: string;
  dbType: string;
  features: string[];
  recommended?: boolean;
}

const TIERS: SaasTier[] = [
  {
    id: "starter",
    name: "Starter",
    target: "Bank Sampah / KSM Mandiri",
    priceMonthly: 349000,
    priceFormatted: "Rp 349 rb / bln",
    waQuota: 1000,
    wargaMax: "Hingga 500 Nasabah",
    dbType: "Multi-Tenant Shared Schema",
    features: [
      "Pencatatan tabungan sampah digital",
      "Kuitansi & laporan timbangan WA",
      "Subdomain: namapengelola.o2whero.com",
      "1 Nomor WhatsApp Bot Notifikasi",
      "Support chat jam kerja",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    target: "TPS 3R & Kelurahan (Rujukan: UPS HERU)",
    priceMonthly: 1250000,
    priceFormatted: "Rp 1,25 jt / bln",
    waQuota: 5000,
    wargaMax: "Hingga 3.000 KK",
    dbType: "Dedicated Tenant Database (Isolasi Penuh)",
    recommended: true,
    features: [
      "Semua fitur paket Starter",
      "Manajemen retribusi bulanan & tunggakan",
      "Dual WhatsApp (Bot Tagihan + Nomor CS Warga)",
      "Pelacakan GPS armada truk & aplikasi driver",
      "Payment gateway QRIS & VA otomatis lunas",
      "Dukungan custom domain sendiri (misal: upsheru.com)",
      "Prioritas bantuan teknis 7x24 jam",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    target: "Kawasan Industri, Real Estate & Swasta",
    priceMonthly: 2990000,
    priceFormatted: "Rp 2,99 - 4,99 jt / bln",
    waQuota: 20000,
    wargaMax: "Tanpa Batas KK",
    dbType: "Dedicated Cluster DB + High Availability",
    features: [
      "Semua fitur paket Pro",
      "Multi-Armada & Multi-Zona Tanpa Batas",
      "Integrasi timbangan digital bridge API",
      "Marketplace agregasi material off-taker",
      "Dedicated Account Manager & SLA 99.9%",
      "Custom SLA & Integrasi ERP Korporat",
    ],
  },
  {
    id: "government",
    name: "Government / DLH",
    target: "Dinas Lingkungan Hidup Kab / Kota",
    priceMonthly: 0,
    priceFormatted: "Kontrak Tahunan APBD",
    waQuota: 50000,
    wargaMax: "Skala Kota / Kabupaten",
    dbType: "Gov-Cloud Dedicated Instance",
    features: [
      "Dashboard agregat seluruh TPS 3R kota",
      "Integrasi sinkronisasi data SIPSN KLHK",
      "Pelaporan otomatis reduksi karbon & tonase TPA",
      "Pelatihan petugas DLH & pendampingan lapangan",
      "Perjanjian Kerjasama Resmi Pemda",
    ],
  },
];

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

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<"tiers" | "active_tenants">("active_tenants");
  const [tenants, setTenants] = useState<RealTenantSub[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/control-tower");
      const json = await res.json();
      if (json.success && json.data) {
        setTenants(json.data.tenants || []);
      }
    } catch (err) {
      console.error("Gagal memuat langganan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Package className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Subscription Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Manajemen Paket & Langganan SaaS
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Daftar langganan aktif seluruh tenant di database O2W HERO, status paket, dan konfigurasi tiering.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSubscriptions}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/saas-billing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>Kelola Invoices</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("active_tenants")}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "active_tenants"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          Status Langganan Mitra Riil ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab("tiers")}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "tiers"
              ? "border-sky-600 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          Katalog Paket Langganan
        </button>
      </div>

      {activeTab === "active_tenants" ? (
        loading ? (
          <div className="py-16 text-center text-slate-500">
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
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
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-zinc-300">
                      {item.hasDedicatedDb ? (
                        <span className="text-emerald-600 font-bold">Dedicated DB</span>
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
        )
      ) : (
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
