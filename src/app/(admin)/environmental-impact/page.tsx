"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface DistrictImpact {
  kecamatan: string;
  kota: string;
  wargaKk: number;
  sampahTerkumpulTon: number;
  terpilahDaurUlangTon: number;
  komposMaggotTon: number;
  residuTpaTon: number;
  reduksiKarbonCo2e: number;
  diversionRatePct: number;
}

const DISTRICT_DATA: DistrictImpact[] = [
  {
    kecamatan: "Cilodong (Kalibaru - Pilot UPS HERU)",
    kota: "Kota Depok",
    wargaKk: 2450,
    sampahTerkumpulTon: 184,
    terpilahDaurUlangTon: 62,
    komposMaggotTon: 48,
    residuTpaTon: 74,
    reduksiKarbonCo2e: 156,
    diversionRatePct: 59.8,
  },
  {
    kecamatan: "Pancoran Mas",
    kota: "Kota Depok",
    wargaKk: 1800,
    sampahTerkumpulTon: 135,
    terpilahDaurUlangTon: 41,
    komposMaggotTon: 32,
    residuTpaTon: 62,
    reduksiKarbonCo2e: 104,
    diversionRatePct: 54.1,
  },
  {
    kecamatan: "Sukmajaya",
    kota: "Kota Depok",
    wargaKk: 2100,
    sampahTerkumpulTon: 158,
    terpilahDaurUlangTon: 49,
    komposMaggotTon: 36,
    residuTpaTon: 73,
    reduksiKarbonCo2e: 121,
    diversionRatePct: 53.8,
  },
  {
    kecamatan: "Cibinong",
    kota: "Kab. Bogor",
    wargaKk: 1500,
    sampahTerkumpulTon: 112,
    terpilahDaurUlangTon: 35,
    komposMaggotTon: 24,
    residuTpaTon: 53,
    reduksiKarbonCo2e: 84,
    diversionRatePct: 52.7,
  },
];

export default function EnvironmentalImpactPage() {
  const [search, setSearch] = useState("");

  const filtered = DISTRICT_DATA.filter((d) =>
    d.kecamatan.toLowerCase().includes(search.toLowerCase()) ||
    d.kota.toLowerCase().includes(search.toLowerCase())
  );

  const totalSampah = DISTRICT_DATA.reduce((a, b) => a + b.sampahTerkumpulTon, 0);
  const totalDaurUlang = DISTRICT_DATA.reduce((a, b) => a + b.terpilahDaurUlangTon, 0);
  const totalKompos = DISTRICT_DATA.reduce((a, b) => a + b.komposMaggotTon, 0);
  const totalResiduTpa = DISTRICT_DATA.reduce((a, b) => a + b.residuTpaTon, 0);
  const totalCo2e = DISTRICT_DATA.reduce((a, b) => a + b.reduksiKarbonCo2e, 0);
  const avgDiversion = Math.round(((totalDaurUlang + totalKompos) / totalSampah) * 100);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>SaaS Control Tower — Government & Environmental Impact</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dampak Lingkungan & Dashboard DLH
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Agregasi tonase sampah terkelola, reduksi beban TPA, dan estimasi pengurangan emisi karbon sesuai standar pelaporan SIPSN Kementerian LHK.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("Mengunduh Format Laporan Resmi Standar SIPSN KLHK (PDF)...")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Laporan DLH / SIPSN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate ESG Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Sampah Terkelola
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalSampah} Ton / Bln
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Diambil dari seluruh jaringan TPS 3R & Bank Sampah
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Waste Diversion Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {avgDiversion}%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Teralihkan dari pembuangan langsung ke TPA
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Produksi Kompos & BSF
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalKompos} Ton
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pengolahan pupuk organik & maggot BSF
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Reduksi Emisi Karbon
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-600 dark:text-sky-400">
            {totalCo2e} Ton CO2e
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pencegahan emisi metana di TPA terbuka
          </p>
        </div>
      </div>

      {/* Breakdown per Kecamatan / Wilayah */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              <span>Neraca Pengelolaan Sampah Tingkat Kecamatan (SIPSN KLHK)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Data terukur dari ritase armada dan jembatan timbang TPS 3R
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kecamatan atau kota..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Kecamatan & Kota</th>
              <th className="px-6 py-4">Total Timbulan</th>
              <th className="px-6 py-4">Daur Ulang</th>
              <th className="px-6 py-4">Kompos & Maggot</th>
              <th className="px-6 py-4">Residu ke TPA</th>
              <th className="px-6 py-4">Diversion Rate</th>
              <th className="px-6 py-4 text-right">Reduksi CO2e</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filtered.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 dark:text-white">{item.kecamatan}</div>
                  <span className="text-xs text-slate-400">{item.kota} • {item.wargaKk} KK</span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                  {item.sampahTerkumpulTon} Ton
                </td>
                <td className="px-6 py-4 text-teal-600 font-semibold">
                  {item.terpilahDaurUlangTon} Ton
                </td>
                <td className="px-6 py-4 text-amber-600 font-semibold">
                  {item.komposMaggotTon} Ton
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {item.residuTpaTon} Ton
                </td>
                <td className="px-6 py-4">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {item.diversionRatePct}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-black text-sky-600 dark:text-sky-400">
                  {item.reduksiKarbonCo2e} Ton
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
