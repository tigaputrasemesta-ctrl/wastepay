"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  TrendingUp,
  Percent,
  CheckCircle2,
  DollarSign,
  Truck,
  Fuel,
  ShieldCheck,
  Building2,
  Award,
  AlertCircle,
  HelpCircle,
  Search,
  ArrowRight,
} from "lucide-react";

interface TenantRoiMetrics {
  id: string;
  name: string;
  isPilot?: boolean;
  collectionRate: number;
  digitalRatio: number;
  cashLeakage: number;
  fuelSavingPct: number;
  estimatedRoi: number;
  monthlyRevenueRecovery: number;
  saasCostMonthly: number;
  kkTerlayani: number;
}

const ROI_DATA: TenantRoiMetrics[] = [
  {
    id: "roi-1",
    name: "UPS HERU Kota Depok",
    isPilot: true,
    collectionRate: 92,
    digitalRatio: 85,
    cashLeakage: 0.5,
    fuelSavingPct: 24,
    estimatedRoi: 2650,
    monthlyRevenueRecovery: 32500000,
    saasCostMonthly: 1250000,
    kkTerlayani: 2450,
  },
  {
    id: "roi-2",
    name: "Bank Sampah Berkah Mandiri",
    collectionRate: 88,
    digitalRatio: 72,
    cashLeakage: 1.2,
    fuelSavingPct: 15,
    estimatedRoi: 1420,
    monthlyRevenueRecovery: 5200000,
    saasCostMonthly: 349000,
    kkTerlayani: 480,
  },
  {
    id: "roi-3",
    name: "TPS 3R Sukamaju Lestari",
    collectionRate: 79,
    digitalRatio: 64,
    cashLeakage: 2.1,
    fuelSavingPct: 18,
    estimatedRoi: 1850,
    monthlyRevenueRecovery: 24000000,
    saasCostMonthly: 1250000,
    kkTerlayani: 1900,
  },
];

export default function TenantRoiAnalyticsPage() {
  const [search, setSearch] = useState("");

  const filtered = ROI_DATA.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>SaaS Control Tower — Value & ROI Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tenant Performance & ROI Analytics
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Membuktikan dampak ekonomi riil implementasi O2W HERO: peningkatan retribusi tertagih, penekanan kebocoran kas, dan efisiensi BBM armada.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tenants"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/30 transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Daftar Mitra</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pilot Case Study Spotlight: UPS HERU */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 border-2 border-teal-500/50 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>Studi Kasus Pilot Tenant Utama</span>
            </div>
            <h2 className="text-2xl font-black">UPS HERU Kota Depok (TPS 3R Kalibaru)</h2>
            <p className="text-slate-300 text-xs">
              Membuktikan transformasi dari sistem karcis tunai manual menjadi ekosistem digital 100% transparan
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://upsheru.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
            >
              <span>Buka Portal UPS HERU</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Collection Rate
            </span>
            <div className="text-3xl font-black text-emerald-400 mt-1">92%</div>
            <p className="text-[11px] text-slate-400 mt-1">Sebelumnya ~54%</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Digital Payment
            </span>
            <div className="text-3xl font-black text-sky-400 mt-1">85%</div>
            <p className="text-[11px] text-slate-400 mt-1">QRIS & Virtual Account</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Cash Leakage
            </span>
            <div className="text-3xl font-black text-teal-300 mt-1">0.5%</div>
            <p className="text-[11px] text-slate-400 mt-1">Ditekan dari ~18%</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Estimasi ROI Mitra
            </span>
            <div className="text-3xl font-black text-amber-400 mt-1">2.650%</div>
            <p className="text-[11px] text-slate-400 mt-1">Dibandingkan biaya SaaS Pro</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2 text-[11px] text-slate-400">
          <HelpCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <span>
            <strong>Catatan Metodologi Transparansi:</strong> Angka ROI 2.650% dihitung dari perbandingan selisih penerimaan retribusi bersih sebelum vs sesudah sistem dibagi biaya langganan paket Pro (Rp 1.250.000/bln). Perlakukan angka ini sebagai hipotesis validasi empiris berkelanjutan.
          </span>
        </div>
      </div>

      {/* Comparison Table Across All Tenants */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tabel Matriks Efisiensi Seluruh Mitra
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Evaluasi efektivitas operasional dan nilai tambah platform per tenant
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama mitra..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Mitra Pengelola</th>
              <th className="px-6 py-4">Collection Rate</th>
              <th className="px-6 py-4">Digital Payment</th>
              <th className="px-6 py-4">Kebocoran Kas</th>
              <th className="px-6 py-4">Hemat BBM</th>
              <th className="px-6 py-4">Peningkatan Kas / Bln</th>
              <th className="px-6 py-4 text-right">ROI Mitra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    <span>{item.name}</span>
                    {item.isPilot && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Pilot
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{item.kkTerlayani} KK terlayani</span>
                </td>
                <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                  {item.collectionRate}%
                </td>
                <td className="px-6 py-4 font-bold text-sky-600 dark:text-sky-400">
                  {item.digitalRatio}%
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {item.cashLeakage}%
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-emerald-600">
                  +{item.fuelSavingPct}% Hemat
                </td>
                <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                  +Rp {item.monthlyRevenueRecovery.toLocaleString("id-ID")}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-black text-amber-600 dark:text-amber-400 text-base">
                    +{item.estimatedRoi}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
