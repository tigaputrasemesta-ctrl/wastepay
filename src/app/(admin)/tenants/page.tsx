"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Database,
  Globe,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Server,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Settings,
  Phone,
  CreditCard,
  MessageCircle,
  Percent,
  Save,
  Loader2,
  DollarSign,
  Wallet,
} from "lucide-react";

interface TenantItem {
  id: string;
  slug: string;
  namaMitra: string;
  tipe: string;
  primaryDomain: string;
  domains: string[];
  status: string;
  dbType: string;
  isBuiltin: boolean;
}

function TenantsContent() {
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    slug: "",
    namaMitra: "",
    penanggungJawab: "",
    noTelepon: "",
    email: "",
    alamat: "",
    kota: "Kota Depok",
    tipePengelola: "tps3r",
    paketLangganan: "pro",
    customDomain: "",
    dbConnectionString: "",
  });

  // State Pengaturan WhatsApp (2 Nomor Mitra) & Payment Gateway / Komisi
  const [selectedTenantForConfig, setSelectedTenantForConfig] = useState<TenantItem | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<"wa" | "payment">("wa");
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  const [waConfig, setWaConfig] = useState({
    gatewayMode: "dedicated_mitra",
    provider: "fonnte",
    waNumber1: "",
    waApiKey1: "",
    waLabel1: "Nomor Utama (Bot & Tagihan)",
    waNumber2: "",
    waApiKey2: "",
    waLabel2: "Nomor CS & Pengaduan",
    adminPhone: "",
    ownerPhone: "",
    waGroupTagihan: "",
    waGroupPengaduan: "",
    blastDelayMs: 1500,
    autoSendEnabled: true,
  });

  const [quotaUsage, setQuotaUsage] = useState({
    kuotaBulanan: 1000,
    kuotaTopup: 0,
    pesanTerkirim: 0,
    biayaPerPesanOverage: 150,
  });

  const [paymentConfig, setPaymentConfig] = useState({
    gatewayMode: "centralized_pool",
    merchantCode: "",
    apiKey: "",
    feeBearerPolicy: "hybrid",
    adminFeeQris: 1500,
    adminFeeVa: 3500,
    adminFeeEwallet: 2000,
    platformFeeNominal: 1000,
    bankName: "BCA",
    bankAccountNumber: "",
    bankAccountHolder: "",
    payoutSchedule: "weekly",
  });

  const handleOpenSettings = async (tenant: TenantItem) => {
    setSelectedTenantForConfig(tenant);
    setConfigLoading(true);
    setActiveConfigTab("wa");
    try {
      const res = await fetch(`/api/core/tenants/${tenant.id}/settings`);
      const data = await res.json();
      if (data.success) {
        if (data.waConfig) setWaConfig(data.waConfig);
        if (data.quotaUsage) setQuotaUsage(data.quotaUsage);
        if (data.paymentConfig) setPaymentConfig(data.paymentConfig);
      }
    } catch (e) {
      console.error("Gagal load config tenant:", e);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForConfig) return;
    setConfigSaving(true);
    try {
      const res = await fetch(`/api/core/tenants/${selectedTenantForConfig.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waConfig,
          quotaUsage,
          paymentConfig,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: data.message || "Pengaturan berhasil disimpan!" });
        setSelectedTenantForConfig(null);
      } else {
        setMsg({ type: "error", text: data.error || "Gagal menyimpan pengaturan." });
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Gagal menyimpan pengaturan." });
    } finally {
      setConfigSaving(false);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/tenants");
      const data = await res.json();
      if (data.success && Array.isArray(data.tenants)) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error("Gagal memuat tenant:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Tangkap query param dari Core Dashboard jika admin mengklik "Buat Tenant Otomatis" dari calon mitra
  useEffect(() => {
    if (searchParams && searchParams.get("action") === "create") {
      const namaMitra = searchParams.get("namaMitra") || "";
      const penanggungJawab = searchParams.get("penanggungJawab") || "";
      const noTelepon = searchParams.get("noTelepon") || "";
      const email = searchParams.get("email") || "";
      const kota = searchParams.get("kota") || "Kota Depok";
      const slugAuto = namaMitra
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      setForm((prev) => ({
        ...prev,
        namaMitra,
        penanggungJawab,
        noTelepon,
        email,
        kota,
        slug: slugAuto,
      }));
      setShowModal(true);
    }
  }, [searchParams]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/core/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat tenant baru.");
      }

      setMsg({ type: "success", text: data.message });
      setShowModal(false);
      setForm({
        slug: "",
        namaMitra: "",
        penanggungJawab: "",
        noTelepon: "",
        email: "",
        alamat: "",
        kota: "Kota Depok",
        tipePengelola: "tps3r",
        paketLangganan: "pro",
        customDomain: "",
        dbConnectionString: "",
      });
      fetchTenants();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Kesalahan server." });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = tenants.filter(
    (t) =>
      t.namaMitra.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.primaryDomain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-2 border border-sky-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            O2W Hero Core Control Plane
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Manajemen Mitra & Database Pengelola Sampah
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola konfigurasi multi-tenant, pemetaan custom domain, dan isolasi database-per-tenant.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTenants}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Mitra Baru
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Mitra Terdaftar
            </p>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{tenants.length}</h2>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Database Dedicated (Terisolasi)
            </p>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {tenants.filter((t) => t.dbType === "dedicated_db").length}
            </h2>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Custom Domains Aktif
            </p>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {tenants.filter((t) => !t.primaryDomain.includes(".vercel.app")).length}
            </h2>
          </div>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan nama mitra, slug, atau domain..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Mitra / Pengelola</th>
                <th className="px-6 py-4">Tipe & Lisensi</th>
                <th className="px-6 py-4">Domain Utama</th>
                <th className="px-6 py-4">Arsitektur Database</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                        {t.namaMitra.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {t.namaMitra}
                          {t.slug === "upsheru" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                              Pilot Showcase
                            </span>
                          )}
                          {t.slug === "o2w-core" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-bold border border-sky-500/20">
                              Core Hub
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">slug: {t.slug}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                      {t.tipe.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <a
                      href={`https://${t.primaryDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-mono text-xs font-semibold"
                    >
                      {t.primaryDomain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>

                  <td className="px-6 py-4">
                    {t.dbType === "dedicated_db" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <Database className="w-3 h-3" /> Dedicated DB (Per Tenant)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        <Server className="w-3 h-3" /> Central DB
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSettings(t)}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        title="Pengaturan WhatsApp (2 Nomor) & Payment Gateway"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Pengaturan</span>
                      </button>

                      <a
                        href={`https://${t.primaryDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors"
                      >
                        Buka Web
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Mitra */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tambah Mitra Tenant Baru</h3>
                <p className="text-xs text-slate-500">Konfigurasi instansi dan database terisolasi mitra.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Mitra *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.namaMitra}
                    onChange={(e) => setForm({ ...form, namaMitra: e.target.value })}
                    placeholder="Contoh: TPS 3R Sukatani"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Slug ID Unik *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="contoh: tps-sukatani"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Domain (Opsional)
                  </label>
                  <input
                    type="text"
                    value={form.customDomain}
                    onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                    placeholder="contoh: tps-sukatani.id"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kota / Wilayah
                  </label>
                  <input
                    type="text"
                    value={form.kota}
                    onChange={(e) => setForm({ ...form, kota: e.target.value })}
                    placeholder="Kota Depok"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Database Connection String (Dedicated Database-per-Tenant)
                </label>
                <input
                  type="text"
                  value={form.dbConnectionString}
                  onChange={(e) => setForm({ ...form, dbConnectionString: e.target.value })}
                  placeholder="postgresql://user:password@host:5432/db_tenant_xxx?sslmode=require"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Kosongkan jika mitra menggunakan shared database instance cluster.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/25 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Mitra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Layanan Mitra (WhatsApp 2 Nomor & Payment Gateway / Komisi) */}
      {selectedTenantForConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[11px] font-bold uppercase tracking-wider mb-1 border border-sky-200 dark:border-sky-800">
                  <Settings className="w-3.5 h-3.5" />
                  Konfigurasi Layanan Multi-Tenant
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Pengaturan: {selectedTenantForConfig.namaMitra}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Domain: <span className="font-mono text-sky-600 dark:text-sky-400">{selectedTenantForConfig.primaryDomain}</span> • Paket: <span className="uppercase font-bold text-slate-700 dark:text-slate-300">{selectedTenantForConfig.tipe}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedTenantForConfig(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveConfigTab("wa")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeConfigTab === "wa"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>WhatsApp (2 Nomor) &amp; Kuota</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab("payment")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeConfigTab === "payment"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Payment Gateway &amp; Komisi</span>
              </button>
            </div>

            {configLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Memuat konfigurasi layanan mitra...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* TAB 1: WHATSAPP DUA NOMOR & KUOTA */}
                {activeConfigTab === "wa" && (
                  <div className="space-y-6">
                    {/* Mode Gateway Toggle */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Mode Operasional WhatsApp Gateway
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                            waConfig.gatewayMode === "dedicated_mitra"
                              ? "bg-emerald-500/10 border-emerald-500 text-slate-900 dark:text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="waMode"
                            checked={waConfig.gatewayMode === "dedicated_mitra"}
                            onChange={() => setWaConfig({ ...waConfig, gatewayMode: "dedicated_mitra" })}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Nomor Mitra Mandiri (Dedicated)
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Mitra memiliki 2 nomor WhatsApp sendiri (Bot Tagihan &amp; CS). Bebas kuota platform O2W.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                            waConfig.gatewayMode === "shared_pool"
                              ? "bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="waMode"
                            checked={waConfig.gatewayMode === "shared_pool"}
                            onChange={() => setWaConfig({ ...waConfig, gatewayMode: "shared_pool" })}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                              Shared Platform Gateway (O2W Pool)
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Menggunakan nomor gateway bersama O2W HERO. Kuota pesan dipotong dari jatah paket bulanan.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* DUA NOMOR WHATSAPP MITRA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Device 1: Nomor WhatsApp Utama (Bot & Tagihan) */}
                      <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                            <Phone className="w-3.5 h-3.5" /> Nomor WhatsApp 1 (Utama)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                            Bot &amp; Tagihan
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Nomor WhatsApp 1 (Format 08xx / 628xx)
                          </label>
                          <input
                            type="text"
                            value={waConfig.waNumber1 || ""}
                            onChange={(e) => setWaConfig({ ...waConfig, waNumber1: e.target.value })}
                            placeholder="Contoh: 081400782617"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            API Token Device 1 (Fonnte / Provider)
                          </label>
                          <input
                            type="password"
                            value={waConfig.waApiKey1 || ""}
                            onChange={(e) => setWaConfig({ ...waConfig, waApiKey1: e.target.value })}
                            placeholder="Ketik token API device 1..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono focus:outline-none focus:border-emerald-500"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            UPS HERU Pilot Token: <code className="text-emerald-400">yZeWGJymbrnTpub2x5rL</code>
                          </p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Label Device 1</label>
                          <input
                            type="text"
                            value={waConfig.waLabel1 || ""}
                            onChange={(e) => setWaConfig({ ...waConfig, waLabel1: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Device 2: Nomor WhatsApp CS & Pengaduan */}
                      <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase">
                            <MessageCircle className="w-3.5 h-3.5" /> Nomor WhatsApp 2 (CS)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                            CS &amp; Pengaduan
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Nomor WhatsApp 2 (Format 08xx / 628xx)
                          </label>
                          <input
                            type="text"
                            value={waConfig.waNumber2 || ""}
                            onChange={(e) => setWaConfig({ ...waConfig, waNumber2: e.target.value })}
                            placeholder="Contoh: 085716251003"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            API Token Device 2 (Jika Menggunakan Device Berbeda)
                          </label>
                          <input
                            type="password"
                            value={waConfig.waApiKey2 || ""}
                            onChange={(e) => setWaConfig({ ...waConfig, waApiKey2: e.target.value })}
                            placeholder="Opsional jika memakai 1 token multi-device..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono focus:outline-none focus:border-sky-500"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Kosongkan jika nomor 2 memakai gateway sama.</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Label Device 2</label>
                          <input
                            type="text"
                            value={waConfig.waLabel2 || ""}
                            onChange={(e) => setWaConfig({ ...waConfig, waLabel2: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Grup & Kontak Laporan Internal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          JID Grup WA Laporan Pembayaran (@g.us)
                        </label>
                        <input
                          type="text"
                          value={waConfig.waGroupTagihan || ""}
                          onChange={(e) => setWaConfig({ ...waConfig, waGroupTagihan: e.target.value })}
                          placeholder="Contoh: 120363432695009362@g.us"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          JID Grup WA Laporan Pengaduan (@g.us)
                        </label>
                        <input
                          type="text"
                          value={waConfig.waGroupPengaduan || ""}
                          onChange={(e) => setWaConfig({ ...waConfig, waGroupPengaduan: e.target.value })}
                          placeholder="Contoh: 120363430666363149@g.us"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Manajemen Kuota Bulanan & Biaya Layanan Tambahan */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5" /> Kuota Pesan &amp; Biaya Layanan WhatsApp
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                          {quotaUsage.pesanTerkirim.toLocaleString("id-ID")} Pesan Terkirim Bulan Ini
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Kuota Bulanan Gratis (Paket)
                          </label>
                          <input
                            type="number"
                            value={quotaUsage.kuotaBulanan}
                            onChange={(e) => setQuotaUsage({ ...quotaUsage, kuotaBulanan: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Starter: 1.000 • Pro: 5.000 • Enterprise: 20.000</p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Saldo Kuota Top-Up (Rollover)
                          </label>
                          <input
                            type="number"
                            value={quotaUsage.kuotaTopup}
                            onChange={(e) => setQuotaUsage({ ...quotaUsage, kuotaTopup: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-emerald-600"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Tidak pernah hangus</p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Biaya Tambahan / Pesan (Overage)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={quotaUsage.biayaPerPesanOverage}
                              onChange={(e) => setQuotaUsage({ ...quotaUsage, biayaPerPesanOverage: Number(e.target.value) })}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Standar O2W: Rp 150 - Rp 200</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PAYMENT GATEWAY & KOMISI O2W HERO */}
                {activeConfigTab === "payment" && (
                  <div className="space-y-6">
                    {/* Mode Gateway Toggle */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Arsitektur Akun Payment Gateway
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                            paymentConfig.gatewayMode === "centralized_pool"
                              ? "bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payMode"
                            checked={paymentConfig.gatewayMode === "centralized_pool"}
                            onChange={() => setPaymentConfig({ ...paymentConfig, gatewayMode: "centralized_pool" })}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                              Centralized Pool O2W HERO (Default)
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Mitra langsung aktif instan 5 menit tanpa syarat legalitas PT. Uang masuk pool O2W dan dicairkan berkala.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                            paymentConfig.gatewayMode === "dedicated"
                              ? "bg-purple-500/10 border-purple-500 text-slate-900 dark:text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payMode"
                            checked={paymentConfig.gatewayMode === "dedicated"}
                            onChange={() => setPaymentConfig({ ...paymentConfig, gatewayMode: "dedicated" })}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                              Dedicated Merchant ID Mandiri
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Khusus mitra DLH / Korporasi besar yang memiliki akun Duitku sendiri. Uang langsung masuk kas mitra.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Kebijakan Fee Bearer & Komisi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kebijakan Pembebanan Biaya */}
                      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Kebijakan Pembebanan Biaya (Fee Bearer)
                        </label>
                        <select
                          value={paymentConfig.feeBearerPolicy}
                          onChange={(e) => setPaymentConfig({ ...paymentConfig, feeBearerPolicy: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold focus:outline-none focus:border-sky-500"
                        >
                          <option value="hybrid">Hybrid (QRIS Fleksibel, VA Beban Warga) [Rekomendasi]</option>
                          <option value="customer">Customer Bearer (Semua Admin Ditambah ke Warga)</option>
                          <option value="tenant">Tenant Bearer (Bebas Biaya Admin - Disubsidi Mitra)</option>
                        </select>
                        <p className="text-[11px] text-slate-500">
                          {paymentConfig.feeBearerPolicy === "customer"
                            ? "Warga membayar tagihan pokok + biaya admin. Kas penerimaan mitra utuh 100%."
                            : paymentConfig.feeBearerPolicy === "tenant"
                            ? "Warga membayar nominal pokok murni. Biaya gateway & komisi dipotong dari saldo kas mitra."
                            : "Kombinasi paling adil: QRIS tetap terjangkau bagi warga, Virtual Account dibebankan penuh."}
                        </p>
                      </div>

                      {/* Komisi Platform O2W HERO */}
                      <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" /> Komisi Platform O2W HERO
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                            Pendapatan Bersih
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Komisi per Transaksi Lunas (Flat)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={paymentConfig.platformFeeNominal}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, platformFeeNominal: Number(e.target.value) })}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-sky-400"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Standar O2W HERO: Rp 1.000 per tagihan warga lunas
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Struktur Biaya Admin ke Warga */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                        Biaya Admin yang Ditagihkan ke Warga per Channel
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Admin Fee QRIS (Dinamis)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={paymentConfig.adminFeeQris}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, adminFeeQris: Number(e.target.value) })}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                            />
                          </div>
                          <p className="text-[10px] text-emerald-600 mt-1">MDR Duitku 0.7% (~Rp 210)</p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Admin Fee Virtual Account
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={paymentConfig.adminFeeVa}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, adminFeeVa: Number(e.target.value) })}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">BCA/Mandiri/BRI (~Rp 3.000)</p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Admin Fee E-Wallet
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={paymentConfig.adminFeeEwallet}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, adminFeeEwallet: Number(e.target.value) })}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">OVO / DANA / ShopeePay</p>
                        </div>
                      </div>
                    </div>

                    {/* Rekening Pencairan Kas Mitra (Settlement) */}
                    <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5" /> Rekening Pencairan Kas Mitra (Disbursement Payout)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold capitalize">
                          Jadwal: {paymentConfig.payoutSchedule}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Bank</label>
                          <select
                            value={paymentConfig.bankName || "BCA"}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, bankName: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                          >
                            <option value="BCA">Bank BCA</option>
                            <option value="MANDIRI">Bank Mandiri</option>
                            <option value="BRI">Bank BRI</option>
                            <option value="BNI">Bank BNI</option>
                            <option value="BJB">Bank BJB</option>
                            <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nomor Rekening</label>
                          <input
                            type="text"
                            value={paymentConfig.bankAccountNumber || ""}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, bankAccountNumber: e.target.value })}
                            placeholder="Nomor rekening mitra..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Atas Nama Pemilik</label>
                          <input
                            type="text"
                            value={paymentConfig.bankAccountHolder || ""}
                            onChange={(e) => setPaymentConfig({ ...paymentConfig, bankAccountHolder: e.target.value })}
                            placeholder="Nama pemilik rekening..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForConfig(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={configSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{configSaving ? "Menyimpan..." : "Simpan Pengaturan Mitra"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
          Memuat data tenant...
        </div>
      }
    >
      <TenantsContent />
    </Suspense>
  );
}
