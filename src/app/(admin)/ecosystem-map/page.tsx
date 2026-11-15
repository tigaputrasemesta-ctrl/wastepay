"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  MapPin,
  Building2,
  Users,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Truck,
  ExternalLink,
} from "lucide-react";

interface EcosystemRegion {
  id: string;
  name: string;
  island: string;
  totalTenants: number;
  activeTenants: number;
  totalWarga: number;
  tps3rCount: number;
  bankSampahCount: number;
  dlhCount: number;
  cities: string[];
}

const REGION_DATA: EcosystemRegion[] = [
  {
    id: "jawa-barat",
    name: "Jawa Barat & Banten",
    island: "Jawa",
    totalTenants: 14,
    activeTenants: 12,
    totalWarga: 34500,
    tps3rCount: 9,
    bankSampahCount: 4,
    dlhCount: 1,
    cities: ["Kota Depok (UPS HERU)", "Kota Bogor", "Kab. Bogor", "Kota Bekasi", "Kota Bandung", "Kota Tangerang"],
  },
  {
    id: "dki-jakarta",
    name: "DKI Jakarta",
    island: "Jawa",
    totalTenants: 8,
    activeTenants: 7,
    totalWarga: 22800,
    tps3rCount: 5,
    bankSampahCount: 3,
    dlhCount: 0,
    cities: ["Jakarta Selatan", "Jakarta Timur", "Jakarta Barat", "Jakarta Pusat"],
  },
  {
    id: "jawa-tengah",
    name: "Jawa Tengah & DIY",
    island: "Jawa",
    totalTenants: 10,
    activeTenants: 9,
    totalWarga: 21400,
    tps3rCount: 6,
    bankSampahCount: 3,
    dlhCount: 1,
    cities: ["Kota Semarang", "Kota Surakarta", "Kota Yogyakarta", "Kab. Sleman", "Kab. Banyumas"],
  },
  {
    id: "jawa-timur",
    name: "Jawa Timur",
    island: "Jawa",
    totalTenants: 9,
    activeTenants: 8,
    totalWarga: 19500,
    tps3rCount: 5,
    bankSampahCount: 3,
    dlhCount: 1,
    cities: ["Kota Surabaya", "Kota Malang", "Kab. Sidoarjo", "Kab. Gresik"],
  },
  {
    id: "bali-nusa",
    name: "Bali & Nusa Tenggara",
    island: "Kepulauan Nusa Tenggara",
    totalTenants: 5,
    activeTenants: 4,
    totalWarga: 11200,
    tps3rCount: 3,
    bankSampahCount: 2,
    dlhCount: 0,
    cities: ["Kota Denpasar", "Kab. Badung", "Kab. Gianyar", "Kota Mataram"],
  },
  {
    id: "sumatera",
    name: "Sumatera Raya",
    island: "Sumatera",
    totalTenants: 4,
    activeTenants: 3,
    totalWarga: 8700,
    tps3rCount: 2,
    bankSampahCount: 1,
    dlhCount: 1,
    cities: ["Kota Medan", "Kota Palembang", "Kota Pekanbaru"],
  },
];

export default function EcosystemMapPage() {
  const [search, setSearch] = useState("");
  const [selectedIsland, setSelectedIsland] = useState<string>("all");

  const filteredRegions = REGION_DATA.filter((reg) => {
    const matchSearch =
      reg.name.toLowerCase().includes(search.toLowerCase()) ||
      reg.cities.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchIsland = selectedIsland === "all" || reg.island === selectedIsland;
    return matchSearch && matchIsland;
  });

  const totalNasionalTenants = REGION_DATA.reduce((acc, r) => acc + r.totalTenants, 0);
  const totalNasionalWarga = REGION_DATA.reduce((acc, r) => acc + r.totalWarga, 0);
  const totalKota = REGION_DATA.reduce((acc, r) => acc + r.cities.length, 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Sebaran Wilayah</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Peta Persebaran Mitra Ekosistem Indonesia
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Memantau jangkauan operasional TPS 3R, Bank Sampah, dan Kemitraan DLH di seluruh provinsi dan kota di Indonesia dari satu menara kendali.
            </p>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Stats KPI Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total Mitra Tersebar
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalNasionalTenants} Mitra
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 43 Mitra Aktif Beroperasi
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Cakupan Kota / Kab
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalKota} Kota / Kab
          </div>
          <p className="text-xs text-sky-600 dark:text-sky-400 mt-2 font-medium">
            Tersebar di 6 cluster wilayah regional
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Agregat KK Terlayani
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalNasionalWarga.toLocaleString("id-ID")}+
          </div>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 font-medium">
            Warga nasabah di ekosistem terpadu
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Pilot Project Rujukan
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span>UPS HERU Kalibaru</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Percontohan TPS 3R Digital Kota Depok
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari wilayah atau kota..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "Jawa", "Sumatera", "Kepulauan Nusa Tenggara"].map((island) => (
            <button
              key={island}
              onClick={() => setSelectedIsland(island)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedIsland === island
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
            >
              {island === "all" ? "Semua Pulau" : island}
            </button>
          ))}
        </div>
      </div>

      {/* Regional Cluster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegions.map((region) => (
          <div
            key={region.id}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {region.island}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {region.activeTenants} Aktif
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{region.name}</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-zinc-800 text-xs mb-3">
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Total Warga:</span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {region.totalWarga.toLocaleString("id-ID")} KK
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Komposisi:</span>
                  <p className="font-medium text-slate-700 dark:text-zinc-300">
                    {region.tps3rCount} TPS 3R, {region.bankSampahCount} BS
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Cakupan Titik Kota:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {region.cities.map((city, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Total {region.totalTenants} pengelola</span>
              <Link
                href="/tenants"
                className="text-sky-600 dark:text-sky-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>Detail Tenant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
