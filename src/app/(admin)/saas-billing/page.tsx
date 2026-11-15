"use client";

import React, { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";

interface SaasLedgerItem {
  id: number;
  tenantId: string;
  tipe: string;
  nominalGross: number;
  feeGateway: number;
  feePlatform: number;
  nominalNet: number;
  keterangan: string | null;
  createdAt: string;
  tenant: {
    namaMitra: string;
    slug: string;
    paketLangganan: string;
  };
}

export default function SaasBillingPage() {
  const [ledgers, setLedgers] = useState<SaasLedgerItem[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    tenantId: "",
    nominalGross: 1250000,
    keterangan: "Tagihan SaaS Paket Pro Periode Berjalan",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resLedgers, resTower] = await Promise.all([
        fetch("/api/core/billing"),
        fetch("/api/core/control-tower"),
      ]);
      const jsonLedgers = await resLedgers.json();
      const jsonTower = await resTower.json();

      if (jsonLedgers.success) {
        setLedgers(jsonLedgers.ledgers || []);
      }
      if (jsonTower.success && jsonTower.data) {
        setTenants(jsonTower.data.tenants || []);
        if (jsonTower.data.tenants.length > 0 && !form.tenantId) {
          setForm((f) => ({ ...f, tenantId: jsonTower.data.tenants[0].id }));
        }
      }
    } catch (err) {
      console.error("Gagal memuat billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/core/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        loadData();
      } else {
        alert(data.error || "Gagal menerbitkan invoice");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = ledgers.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.keterangan || "").toLowerCase().includes(q) ||
      (item.tenant?.namaMitra || "").toLowerCase().includes(q) ||
      (item.tenant?.slug || "").toLowerCase().includes(q)
    );
  });

  const totalTagihanGross = ledgers.reduce((acc, i) => acc + (i.nominalGross || 0), 0);
  const totalPlatformFee = ledgers.reduce((acc, i) => acc + (i.feePlatform || 0), 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
              <span>SaaS Control Tower — Invoicing & Billing Riil</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Billing & Tagihan Langganan SaaS
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Menerbitkan invoice langganan platform kepada mitra dan memantau rekonsiliasi mutasi virtual ledger di database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Invoice Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total Nilai Faktur / Billing
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {loading ? "..." : `Rp ${totalTagihanGross.toLocaleString("id-ID")}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            {ledgers.length} Catatan ledger di database
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Komisi & Fee SaaS Platform
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {loading ? "..." : `Rp ${totalPlatformFee.toLocaleString("id-ID")}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Pendapatan hak platform O2W HERO
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Mitra Aktif Ditagih
          </span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {loading ? "..." : `${tenants.filter((t) => t.status === "aktif").length} Tenant`}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Siap perpanjangan siklus berjalan
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
              placeholder="Cari nama mitra atau invoice..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-sky-600 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sinkronkan Mutasi</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-600" />
            <p className="text-xs">Memuat riwayat billing dari database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Faktur / Invoice Diterbitkan</h3>
            <p className="text-xs mt-1">Gunakan tombol "Terbitkan Invoice Baru" di atas untuk menagih biaya SaaS mitra.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID / Referensi</th>
                <th className="px-6 py-4">Mitra / Tenant</th>
                <th className="px-6 py-4">Tipe & Keterangan</th>
                <th className="px-6 py-4">Nominal Gross</th>
                <th className="px-6 py-4">Fee O2W</th>
                <th className="px-6 py-4">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                    #INV-{inv.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-zinc-200">
                      {inv.tenant?.namaMitra || "Tenant"}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">@{inv.tenant?.slug}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 mr-2">
                      {inv.tipe}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-zinc-300">{inv.keterangan}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                    Rp {Number(inv.nominalGross).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                    Rp {Number(inv.feePlatform).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(inv.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tambah Invoice */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Terbitkan Invoice Langganan SaaS
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="flex flex-col flex-1 overflow-hidden min-h-0 text-xs">
              <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Pilih Mitra / Tenant
                </label>
                <select
                  required
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.namaMitra} ({t.slug}) — Paket {t.paketLangganan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nominal Tagihan (Rp)
                </label>
                <input
                  type="number"
                  required
                  value={form.nominalGross}
                  onChange={(e) => setForm({ ...form, nominalGross: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Keterangan / Deskripsi Tagihan
                </label>
                <input
                  type="text"
                  required
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
                >
                  {submitting ? "Menerbitkan..." : "Terbitkan Tagihan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
