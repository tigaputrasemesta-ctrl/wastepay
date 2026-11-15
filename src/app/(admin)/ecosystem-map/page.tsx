"use client";

import React, { useState, useEffect } from "react";
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
  Loader2,
  RefreshCw,
} from "lucide-react";

interface RegionItem {
  provinsi: string;
  kota: string[];
  totalTenants: number;
  activeTenants: number;
  totalWarga: number;
  tenants: Array<{
    id: string;
    nama: string;
    slug: string;
    kota: string;
    tipe: string;
    status: string;
  }>;
}

export default function EcosystemMapPage() {
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [totalTenants, setTotalTenants] = useState(0);
  const [activeTenants, setActiveTenants] = useState(0);
  const [totalWarga, setTotalWarga] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProv, setSelectedProv] = useState<string>("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/control-tower");
      const json = await res.json();
      if (json.success && json.data) {
        setRegions(json.data.regions || []);
        setTotalTenants(json.data.overview.totalTenants || 0);
        setActiveTenants(json.data.overview.activeTenants || 0);
        setTotalWarga(json.data.overview.totalWarga || 0);
      }
    } catch (err) {
      console.error("Gagal memuat data sebaran ekosistem:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRegions = regions.filter((reg) => {
    const matchSearch =
      reg.provinsi.toLowerCase().includes(search.toLowerCase()) ||
      reg.kota.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
      reg.tenants.some((t) => t.nama.toLowerCase().includes(search.toLowerCase()));
    const matchProv = selectedProv === "all" || reg.provinsi === selectedProv;
    return matchSearch && matchProv;
  });

  const allProvinsi = Array.from(new Set(regions.map((r) => r.provinsi)));

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Sebaran Wilayah Riil</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Peta Persebaran Mitra Ekosistem
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Data spasial dan jangkauan operasional mitra terdaftar di database O2W HERO, diperbarui secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Data</span>
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

      {/* Stats KPI Top - Data Riil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total Mitra Terdaftar
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {loading ? "..." : `${totalTenants} Mitra`}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {activeTenants} Mitra Beroperasi
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Provinsi Terjangkau
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {loading ? "..." : `${regions.length} Provinsi`}
          </div>
          <p className="text-xs text-sky-600 dark:text-sky-400 mt-2 font-medium">
            Berdasarkan data database tenant
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total Warga Terlayani
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {loading ? "..." : `${totalWarga.toLocaleString("id-ID")} KK`}
          </div>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 font-medium">
            Data pelanggan aktif di database
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Status Klaster
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span>Operasional Normal</span>
          </div>
          <p className="text-xs text-emerald-600 mt-2">
            Multi-Tenant Zero-Leakage Aktif
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
            placeholder="Cari provinsi, kota, atau nama mitra..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedProv("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedProv === "all"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
            }`}
          >
            Semua Wilayah ({regions.length})
          </button>
          {allProvinsi.map((prov) => (
            <button
              key={prov}
              onClick={() => setSelectedProv(prov)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedProv === prov
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
            >
              {prov}
            </button>
          ))}
        </div>
      </div>

      {/* Regional Cluster Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
          <p className="text-xs">Memuat data sebaran mitra dari database...</p>
        </div>
      ) : filteredRegions.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-slate-500">
          <Globe className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak Ada Data Wilayah</h3>
          <p className="text-xs mt-1">Belum ada tenant yang sesuai dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegions.map((region, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Provinsi
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {region.activeTenants} Aktif
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>{region.provinsi}</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-zinc-800 text-xs mb-3">
                  <div>
                    <span className="text-slate-500 dark:text-zinc-400">Total Warga:</span>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {region.totalWarga > 0 ? `${region.totalWarga.toLocaleString("id-ID")} KK` : "Terhubung"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-zinc-400">Jumlah Tenant:</span>
                    <p className="font-medium text-slate-700 dark:text-zinc-300">
                      {region.totalTenants} Pengelola
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Daftar Mitra Terdaftar:
                  </span>
                  <div className="space-y-1.5">
                    {region.tenants.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{t.nama}</p>
                          <span className="text-[11px] text-slate-400">{t.kota} • {t.tipe}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">{region.kota.join(", ")}</span>
                <Link
                  href="/tenants"
                  className="text-sky-600 dark:text-sky-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Kelola</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
