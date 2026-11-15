"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Building2,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

interface SaasInvoice {
  id: string;
  invoiceNo: string;
  tenantName: string;
  tenantSlug: string;
  tier: string;
  nominal: number;
  tanggalTerbit: string;
  jatuhTempo: string;
  status: "lunas" | "menunggu" | "overdue";
  metode: string;
}

const INVOICE_DATA: SaasInvoice[] = [
  {
    id: "inv-01",
    invoiceNo: "INV-SAAS/202611/001",
    tenantName: "UPS HERU Kota Depok",
    tenantSlug: "upsheru",
    tier: "Pro",
    nominal: 1250000,
    tanggalTerbit: "01 Nov 2026",
    jatuhTempo: "10 Nov 2026",
    status: "lunas",
    metode: "VA Mandiri (Duitku)",
  },
  {
    id: "inv-02",
    invoiceNo: "INV-SAAS/202611/002",
    tenantName: "Bank Sampah Berkah Mandiri",
    tenantSlug: "bs-berkah",
    tier: "Starter",
    nominal: 349000,
    tanggalTerbit: "05 Nov 2026",
    jatuhTempo: "15 Nov 2026",
    status: "menunggu",
    metode: "QRIS Dinamis",
  },
  {
    id: "inv-03",
    invoiceNo: "INV-SAAS/202611/003",
    tenantName: "TPS 3R Sukamaju Lestari",
    tenantSlug: "tps-sukamaju",
    tier: "Pro",
    nominal: 1250000,
    tanggalTerbit: "28 Okt 2026",
    jatuhTempo: "07 Nov 2026",
    status: "overdue",
    metode: "Transfer Bank",
  },
];

export default function SaasBillingPage() {
  const [invoices, setInvoices] = useState<SaasInvoice[]>(INVOICE_DATA);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    tenantName: "",
    tier: "Pro",
    nominal: 1250000,
    jatuhTempo: "2026-11-25",
  });

  const filteredInvoices = invoices.filter((inv) => {
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    const matchSearch =
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.tenantName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalDitagihkan = invoices.reduce((acc, i) => acc + i.nominal, 0);
  const totalLunas = invoices
    .filter((i) => i.status === "lunas")
    .reduce((acc, i) => acc + i.nominal, 0);
  const totalPiutang = invoices
    .filter((i) => i.status !== "lunas")
    .reduce((acc, i) => acc + i.nominal, 0);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const newInv: SaasInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: `INV-SAAS/202611/${String(invoices.length + 1).padStart(3, "0")}`,
      tenantName: form.tenantName || "Mitra Baru",
      tenantSlug: form.tenantName.toLowerCase().replace(/\s+/g, "-"),
      tier: form.tier,
      nominal: Number(form.nominal),
      tanggalTerbit: "15 Nov 2026",
      jatuhTempo: form.jatuhTempo,
      status: "menunggu",
      metode: "Payment Gateway",
    };
    setInvoices([newInv, ...invoices]);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Invoicing & Billing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Billing & Tagihan Langganan SaaS
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Menerbitkan invoice langganan bulanan kepada TPS 3R dan Bank Sampah, memantau pembayaran otomatis, dan rekonsiliasi piutang platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Invoice Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total Tagihan SaaS Bulan Ini
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Rp {totalDitagihkan.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            {invoices.length} Faktur invoice diterbitkan
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Penerimaan Terverifikasi
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            Rp {totalLunas.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Selesai via QRIS & Virtual Account
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Piutang Tertunda / Overdue
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            Rp {totalPiutang.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Perlu tindak lanjut notifikasi WA
          </p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor invoice atau mitra..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "Semua" },
              { id: "lunas", label: "Lunas" },
              { id: "menunggu", label: "Menunggu" },
              { id: "overdue", label: "Lewat Tempo" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterStatus === tab.id
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Nomor Invoice</th>
              <th className="px-6 py-4">Mitra / Tenant</th>
              <th className="px-6 py-4">Paket & Nominal</th>
              <th className="px-6 py-4">Jatuh Tempo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-6 py-4">
                  <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-600" />
                    <span>{inv.invoiceNo}</span>
                  </div>
                  <span className="text-xs text-slate-400">Terbit: {inv.tanggalTerbit}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                    {inv.tenantName}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">@{inv.tenantSlug}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    Rp {inv.nominal.toLocaleString("id-ID")}
                  </div>
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                    Paket {inv.tier}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-zinc-300">
                  {inv.jatuhTempo}
                </td>
                <td className="px-6 py-4">
                  {inv.status === "lunas" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                    </span>
                  )}
                  {inv.status === "menunggu" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> Menunggu
                    </span>
                  )}
                  {inv.status === "overdue" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      title="Kirim Pengingat WhatsApp"
                      className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      title="Download Kuitansi PDF"
                      className="p-2 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Invoice Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Terbitkan Invoice Langganan SaaS
            </h3>
            <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Mitra / Instansi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: TPS 3R Sukamaju"
                  value={form.tenantName}
                  onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Paket Langganan
                </label>
                <select
                  value={form.tier}
                  onChange={(e) => {
                    const t = e.target.value;
                    const nom = t === "Starter" ? 349000 : t === "Pro" ? 1250000 : 2990000;
                    setForm({ ...form, tier: t, nominal: nom });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                >
                  <option value="Starter">Starter (Rp 349.000)</option>
                  <option value="Pro">Pro (Rp 1.250.000)</option>
                  <option value="Enterprise">Enterprise (Rp 2.990.000)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  required
                  value={form.jatuhTempo}
                  onChange={(e) => setForm({ ...form, jatuhTempo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
                >
                  Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
