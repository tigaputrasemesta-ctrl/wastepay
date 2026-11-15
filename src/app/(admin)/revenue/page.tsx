"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface RevenueStream {
  name: string;
  nominal: number;
  pct: number;
  color: string;
  description: string;
}

const REVENUE_STREAMS: RevenueStream[] = [
  {
    name: "SaaS Subscription",
    nominal: 25000000,
    pct: 55.5,
    color: "bg-emerald-500",
    description: "Pendapatan berulang dari paket Starter, Pro, dan Enterprise mitra.",
  },
  {
    name: "Transaction Fee (QRIS/VA)",
    nominal: 8000000,
    pct: 17.8,
    color: "bg-sky-500",
    description: "Micro-fee platform (Rp 1.000 / transaksi lunas di ekosistem).",
  },
  {
    name: "Marketplace Commission",
    nominal: 5000000,
    pct: 11.1,
    color: "bg-amber-500",
    description: "Komisi 1.5 - 3% dari transaksi agregasi material daur ulang ke off-taker.",
  },
  {
    name: "Government / DLH License",
    nominal: 7000000,
    pct: 15.6,
    color: "bg-purple-500",
    description: "Biaya lisensi dashboard pemantauan wilayah dan pelaporan SIPSN KLHK.",
  },
];

const RECENT_LEDGERS = [
  {
    id: "tx-1",
    mitra: "UPS HERU Kota Depok",
    tipe: "CREDIT_PAYMENT",
    nominalGross: 75000,
    feeGateway: 1500,
    feePlatform: 1000,
    nominalNetMitra: 72500,
    keterangan: "Retribusi 1 KK (QRIS Dinamis)",
    tanggal: "15 Nov 2026 14:12 WIB",
  },
  {
    id: "tx-2",
    mitra: "Bank Sampah Berkah",
    tipe: "CREDIT_PAYMENT",
    nominalGross: 50000,
    feeGateway: 1500,
    feePlatform: 1000,
    nominalNetMitra: 47500,
    keterangan: "Penjualan Tabungan Sampah (VA Mandiri)",
    tanggal: "15 Nov 2026 13:40 WIB",
  },
  {
    id: "tx-3",
    mitra: "TPS 3R Sukamaju",
    tipe: "DEBIT_PAYOUT",
    nominalGross: 2500000,
    feeGateway: 0,
    feePlatform: 0,
    nominalNetMitra: 2500000,
    keterangan: "Pencairan Kas Mingguan Mitra (Transfer BCA)",
    tanggal: "14 Nov 2026 10:00 WIB",
  },
];

export default function RevenueIntelligencePage() {
  const totalNetRevenue = REVENUE_STREAMS.reduce((acc, s) => acc + s.nominal, 0);
  const grossGMVEcosystem = 350000000; // Total perputaran uang warga
  const escrowHeldForMitra = 280000000; // Saldo kas hak milik mitra
  const gatewayPaidDuitku = 9800000; // Biaya payment gateway

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>SaaS Control Tower — Financial Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pendapatan & Financial Intelligence
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Memantau 4 pilar pendapatan platform O2W HERO, memisahkan GMV warga dari omzet riil, dan menjaga virtual ledger escrow seluruh mitra.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("Mengunduh Rekap Finansial O2W HERO format CSV...")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Architecture Principle Warning */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Prinsip Arsitektur Finansial O2W HERO</p>
          <p className="leading-relaxed opacity-90">
            Dashboard ini secara ketat membedakan <strong>Gross Ecosystem GMV</strong> (dana retribusi milik mitra), <strong>Biaya Gateway (Duitku)</strong>, dan <strong>Pendapatan Bersih O2W HERO</strong>. Uang warga yang transit di rekening pool tidak dihitung sebagai omzet platform.
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
            Rp {totalNetRevenue.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Total dari 4 revenue stream bulan ini
          </p>
        </div>

        {/* Card 2: Ecosystem GMV */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Ecosystem GMV
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
              Uang Warga
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Rp {grossGMVEcosystem.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Total perputaran retribusi seluruh tenant
          </p>
        </div>

        {/* Card 3: Saldo Escrow Mitra */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Kas Escrow Hak Mitra
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 font-bold">
              Virtual Ledger
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Rp {escrowHeldForMitra.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Dana siap ditarik oleh TPS 3R & Bank Sampah
          </p>
        </div>

        {/* Card 4: Gateway Processing Fee */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Gateway Fee (Duitku)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold">
              Vendor Cost
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Rp {gatewayPaidDuitku.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Biaya switching QRIS & Virtual Account
          </p>
        </div>
      </div>

      {/* 4 Revenue Streams Breakdown */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span>Komposisi 4 Pilar Pendapatan O2W HERO</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REVENUE_STREAMS.map((st, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {st.name}
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {st.pct}%
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                Rp {st.nominal.toLocaleString("id-ID")}
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${st.color}`}
                  style={{ width: `${st.pct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Ledger Mutasi Transaksi Terbaru */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-sky-600" />
              <span>Mutasi Virtual Ledger & Escrow Pool</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Pemisahan otomatis dana hak mitra dan komisi O2W HERO per transaksi lunas
            </p>
          </div>
          <Link
            href="/tenants"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Setting Payout Rekening Mitra
          </Link>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Mitra & Keterangan</th>
              <th className="px-6 py-4">Gross Transaksi</th>
              <th className="px-6 py-4">Fee Gateway (Duitku)</th>
              <th className="px-6 py-4">Fee O2W HERO</th>
              <th className="px-6 py-4">Kas Bersih Mitra</th>
              <th className="px-6 py-4">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {RECENT_LEDGERS.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 dark:text-white">{row.mitra}</div>
                  <span className="text-xs text-slate-500">{row.keterangan}</span>
                </td>
                <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                  Rp {row.nominalGross.toLocaleString("id-ID")}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                  {row.feeGateway > 0 ? `-Rp ${row.feeGateway.toLocaleString("id-ID")}` : "Rp 0"}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {row.feePlatform > 0 ? `+Rp ${row.feePlatform.toLocaleString("id-ID")}` : "Rp 0"}
                </td>
                <td className="px-6 py-4 font-black text-sky-600 dark:text-sky-400">
                  Rp {row.nominalNetMitra.toLocaleString("id-ID")}
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">
                  {row.tanggal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
