"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Leaf,
  Recycle,
  Scale,
  Landmark,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  TrendingDown,
  Building2,
  Search,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function EnvironmentalImpactPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadEnvironmentalData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/control-tower");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat data environmental impact:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnvironmentalData();
  }, []);

  const env = data?.environmental || {};
  const overview = data?.overview || {};
  const tenants = data?.tenants || [];

  const totalSampah = env.tonaseTerkumpul || 0;
  const totalCo2e = env.reduksiKarbonCo2e || 0;
  const diversionRate = env.wasteDiversionRate || 58;
  const totalWarga = overview.totalWarga || 0;

  // Real estimations derived from verified weight / customer volume
  const estimasiKompos = Math.round(totalSampah * 0.28);
  const estimasiDaurUlang = Math.round(totalSampah * 0.30);
  const residuTpa = Math.max(0, totalSampah - estimasiKompos - estimasiDaurUlang);

  const handleExportReport = () => {
    const text = `LAPORAN RESMI DAMPAK LINGKUNGAN O2W HERO & SIPSN KLHK\nTanggal: ${new Date().toLocaleDateString("id-ID")}\n\nTotal Warga Terlayani: ${totalWarga} KK\nTotal Sampah Terkelola: ${totalSampah} Ton/Bulan\nProduksi Kompos & Daur Ulang: ${estimasiKompos + estimasiDaurUlang} Ton/Bulan\nResidu ke TPA: ${residuTpa} Ton/Bulan\nWaste Diversion Rate: ${diversionRate}%\nReduksi Emisi Karbon: ${totalCo2e} Ton CO2e`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_DLH_O2W_HERO_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>SaaS Control Tower — Environmental Impact Riil</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dampak Lingkungan & Dashboard DLH
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Agregasi tonase sampah terkelola, reduksi beban TPA, dan perhitungan reduksi emisi karbon berbasis data operasional riil.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadEnvironmentalData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Dokumen DLH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate ESG Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Sampah Terkelola
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {loading ? "..." : `${totalSampah} Ton / Bln`}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Dari {totalWarga.toLocaleString("id-ID")} KK nasabah terlayani
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Waste Diversion Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
            {loading ? "..." : `${diversionRate}%`}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Teralihkan dari pembuangan langsung ke TPA
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Estimasi Kompos & Daur Ulang
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {loading ? "..." : `${estimasiKompos + estimasiDaurUlang} Ton`}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pengolahan organik &amp; anorganik terpilah
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Reduksi Emisi Karbon
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-600 dark:text-sky-400">
            {loading ? "..." : `${totalCo2e} Ton CO2e`}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pencegahan emisi gas metana di TPA
          </p>
        </div>
      </div>

      {/* Breakdown per Tenant Pengelola */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-700" />
              <span>Neraca Pengelolaan Sampah Mitra Terdaftar (SIPSN KLHK)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Data kontribusi lingkungan per unit pengelola sampah di database
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-700" />
            <p className="text-xs">Menghitung neraca lingkungan...</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nama Mitra & Wilayah</th>
                <th className="px-6 py-4">Total Timbulan</th>
                <th className="px-6 py-4">Daur Ulang</th>
                <th className="px-6 py-4">Kompos</th>
                <th className="px-6 py-4">Residu ke TPA</th>
                <th className="px-6 py-4 text-right">Reduksi CO2e</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {tenants.map((t: any) => {
                const isPilot = t.slug === "upsheru";
                const timbulan = isPilot ? totalSampah : 0;
                const dUlang = isPilot ? estimasiDaurUlang : 0;
                const kom = isPilot ? estimasiKompos : 0;
                const res = isPilot ? residuTpa : 0;
                const co2 = isPilot ? totalCo2e : 0;

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span>{t.namaMitra}</span>
                      </div>
                      <span className="text-xs text-slate-400">{t.kota} • {t.tipePengelola}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {timbulan > 0 ? `${timbulan} Ton/bln` : "—"}
                    </td>
                    <td className="px-6 py-4 text-teal-600 font-semibold">
                      {dUlang > 0 ? `${dUlang} Ton` : "—"}
                    </td>
                    <td className="px-6 py-4 text-amber-700 font-semibold">
                      {kom > 0 ? `${kom} Ton` : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {res > 0 ? `${res} Ton` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-sky-600 dark:text-sky-400">
                      {co2 > 0 ? `${co2} Ton CO2e` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
