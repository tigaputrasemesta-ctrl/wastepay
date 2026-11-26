"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Download,
  Scale,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function RevenueIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadFinancials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/control-tower");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat financial intelligence:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancials();
  }, []);

  const fin = data?.financials || {};
  const overview = data?.overview || {};

  const grossGMVEcosystem = fin.grossVerifiedPembayaran || 0;
  const saasSubscriptionRev = overview.realSaaSMrr || 0;
  const transactionMicroFeeRev = fin.platformFeeIncome || 0;
  const domainSetupFeeRev = fin.domainSetupFeeIncome || 0;
  const totalNetO2WRev = saasSubscriptionRev + transactionMicroFeeRev + domainSetupFeeRev;
  const gatewayPaidDuitku = fin.gatewayCostDuitku || 0;
  const escrowHeldForMitra = fin.escrowNetHeldForMitra || 0;
  const recentLedgers = fin.recentLedgers || [];

  const streams = [
    {
      name: "Domain & Onboarding Setup Fee",
      nominal: domainSetupFeeRev,
      color: "bg-indigo-500",
      description: "Biaya aktivasi domain flat Rp 2.000.000 per tenant.",
    },
    {
      name: "SaaS Subscription (MRR)",
      nominal: saasSubscriptionRev,
      color: "bg-emerald-500",
      description: "Pendapatan paket langganan aktif seluruh tenant di database.",
    },
    {
      name: "Transaction Micro-Fee (Nominal + %)",
      nominal: transactionMicroFeeRev,
      color: "bg-sky-500",
      description: `Komisi platform dari ${fin.duitkuTxCount || 0} transaksi digital terverifikasi.`,
    },
    {
      name: "Marketplace Recycling Commission",
      nominal: 0,
      color: "bg-amber-500",
      description: "Komisi agregasi perdagangan daur ulang skala ekosistem.",
    },
    {
      name: "Government / DLH License",
      nominal: 0,
      color: "bg-purple-500",
      description: "Lisensi dashboard pemda / DLH kontrak tahunan.",
    },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>SaaS Control Tower — Real Financial Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pendapatan & Financial Intelligence
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Data agregasi keuangan riil yang dihitung dari transaksi pembayaran warga, gateway Duitku, dan mutasi saldo virtual ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadFinancials}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Architecture Principle Warning */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Pemisahan Ketat Dana Warga vs Pendapatan Platform</p>
          <p className="leading-relaxed opacity-90">
            Sistem secara ketat memisahkan <strong>Gross Ecosystem GMV</strong> (uang iuran retribusi milik mitra), <strong>Biaya Gateway (Duitku)</strong>, dan <strong>Pendapatan Bersih O2W HERO</strong>.
          </p>
        </div>
      </div>

      {/* Finansial Split Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Revenue O2W HERO */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-700/50 rounded-2xl p-5 shadow-sm text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Pendapatan Bersih O2W
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              Omzet Riil
            </span>
          </div>
          <div className="text-3xl font-black text-white">
            {loading ? "..." : `Rp ${totalNetO2WRev.toLocaleString("id-ID")}`}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            SaaS subscription + micro-fee riil
          </p>
        </div>

        {/* Card 2: Ecosystem GMV */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Ecosystem GMV
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
              Uang Warga
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? "..." : `Rp ${grossGMVEcosystem.toLocaleString("id-ID")}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Total pembayaran terverifikasi di database
          </p>
        </div>

        {/* Card 3: Saldo Escrow Mitra */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Kas Escrow Hak Mitra
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 font-bold">
              Virtual Ledger
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? "..." : `Rp ${escrowHeldForMitra.toLocaleString("id-ID")}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Hak dana bersih mitra setelah potongan fee
          </p>
        </div>

        {/* Card 4: Gateway Processing Fee */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Gateway Fee (Duitku)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
              Vendor Cost
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? "..." : `Rp ${gatewayPaidDuitku.toLocaleString("id-ID")}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            {fin.duitkuTxCount || 0} transaksi QRIS &amp; VA sukses
          </p>
        </div>
      </div>

      {/* 4 Revenue Streams Breakdown */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-700" />
          <span>Komposisi Pendapatan O2W HERO</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {streams.map((st, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {st.name}
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                Rp {st.nominal.toLocaleString("id-ID")}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Ledger Mutasi Transaksi Terbaru */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-sky-600" />
              <span>Mutasi Virtual Ledger & Escrow Pool Riil</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Pemisahan otomatis dana hak mitra dan komisi O2W HERO per transaksi di database
            </p>
          </div>
          <Link
            href="/tenants"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Setting Rekening Mitra
          </Link>
        </div>

        {recentLedgers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Scale className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Mutasi Ledger</h3>
            <p className="text-xs mt-1">Mutasi otomatis tercatat ketika ada transaksi lunas di gateway Duitku atau penerbitan invoice.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Mitra & Keterangan</th>
                <th className="px-6 py-4">Gross Transaksi</th>
                <th className="px-6 py-4">Fee Gateway</th>
                <th className="px-6 py-4">Fee O2W</th>
                <th className="px-6 py-4">Kas Bersih Mitra</th>
                <th className="px-6 py-4">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {recentLedgers.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{row.tenant?.namaMitra || "Tenant"}</div>
                    <span className="text-xs text-slate-500">{row.keterangan || "-"}</span>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                    Rp {Number(row.nominalGross).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                    {row.feeGateway > 0 ? `-Rp ${Number(row.feeGateway).toLocaleString("id-ID")}` : "Rp 0"}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {row.feePlatform > 0 ? `+Rp ${Number(row.feePlatform).toLocaleString("id-ID")}` : "Rp 0"}
                  </td>
                  <td className="px-6 py-4 font-black text-sky-600 dark:text-sky-400">
                    Rp {Number(row.nominalNet).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(row.createdAt).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
