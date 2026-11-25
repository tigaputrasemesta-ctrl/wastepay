"use client";

import React, { useState, useEffect } from "react";
import { toast } from "@/components/Toast";
import { TableSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  UserPlus,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Search,
  Filter,
  FileText,
  Target,
  Sparkles,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface RealLead {
  id: number;
  namaLengkap: string;
  namaInstansi: string;
  jenisUsaha: string;
  noWhatsapp: string;
  email: string;
  kota: string;
  estimasiWarga: number;
  status: string;
  catatanAdmin: string | null;
  createdAt: string;
}

export default function CrmProspekPage() {
  const [leads, setLeads] = useState<RealLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    namaInstansi: "",
    namaLengkap: "",
    jenisUsaha: "tps3r",
    noWhatsapp: "",
    email: "",
    kota: "Kota Depok",
    estimasiWarga: 500,
    catatanAdmin: "",
  });

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/crm");
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads || []);
      }
    } catch (err) {
      console.error("Gagal memuat CRM leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/core/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setForm({
          namaInstansi: "",
          namaLengkap: "",
          jenisUsaha: "tps3r",
          noWhatsapp: "",
          email: "",
          kota: "Kota Depok",
          estimasiWarga: 500,
          catatanAdmin: "",
        });
        loadLeads();
      } else {
        toast(data.error || "Gagal menyimpan lead calon mitra", "error");
      }
    } catch (err: any) {
      toast("Terjadi kesalahan: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch("/api/core/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
        );
      }
    } catch (err) {
      console.error("Gagal update status:", err);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchSearch =
      l.namaInstansi.toLowerCase().includes(search.toLowerCase()) ||
      l.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      l.kota.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    menunggu_review: { label: "1. Menunggu Review", color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" },
    dihubungi: { label: "2. Dihubungi", color: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300" },
    demo: { label: "3. Demo Produk", color: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300" },
    disetujui: { label: "4. Disetujui", color: "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300" },
    provisioned: { label: "5. Onboarded", color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" },
    ditolak: { label: "Ditolak", color: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300" },
  };

  const totalPotensiKk = leads.reduce((a, b) => a + (b.estimasiWarga || 0), 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>SaaS Control Tower — Real CRM Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              CRM & Pipeline Calon Mitra O2W HERO
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Data riil pendaftaran dan tindak lanjut kemitraan TPS 3R, Bank Sampah, dan DLH yang tersimpan di database `MitraRegistration`.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLeads}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Calon Mitra</span>
            </button>
          </div>
        </div>
      </div>

      {/* Funnel Target Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Total Prospek di Database
          </span>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {loading ? "..." : `${leads.length} Instansi`}
          </div>
          <p className="text-xs text-slate-500 mt-2">Permohonan kemitraan terdata</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Potensi Perluasan Warga
          </span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {loading ? "..." : `${totalPotensiKk.toLocaleString("id-ID")} KK`}
          </div>
          <p className="text-xs text-slate-500 mt-2">Estimasi nasabah dari calon mitra</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Menunggu Review
          </span>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {loading ? "..." : `${leads.filter((l) => l.status === "menunggu_review").length} Antrean`}
          </div>
          <p className="text-xs text-slate-500 mt-2">Perlu tindak lanjut / verifikasi</p>
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
              placeholder="Cari nama instansi, PIC, kota..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "Semua Status" },
              { id: "menunggu_review", label: "Menunggu Review" },
              { id: "disetujui", label: "Disetujui" },
              { id: "provisioned", label: "Onboarded" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === st.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={6} className="border-none shadow-none" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Prospek Mitra</h3>
            <p className="text-xs mt-1">Daftarkan permohonan kemitraan baru dengan tombol di atas atau melalui form pendaftaran publik.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nama Instansi</th>
                <th className="px-6 py-4">PIC & Kontak</th>
                <th className="px-6 py-4">Wilayah & Estimasi</th>
                <th className="px-6 py-4">Tahapan Pipeline</th>
                <th className="px-6 py-4">Catatan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredLeads.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>{item.namaInstansi}</span>
                    </div>
                    <span className="text-xs text-slate-400 uppercase font-mono">{item.jenisUsaha}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800 dark:text-zinc-200">{item.namaLengkap}</div>
                    <a
                      href={`https://wa.me/${item.noWhatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{item.noWhatsapp}</span>
                    </a>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-zinc-300">
                    <div className="font-bold text-slate-900 dark:text-white">{item.kota}</div>
                    <span className="text-slate-400">~{item.estimasiWarga} KK Warga</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        (STATUS_LABELS[item.status] || STATUS_LABELS["menunggu_review"]).color
                      }`}
                    >
                      {(STATUS_LABELS[item.status] || STATUS_LABELS["menunggu_review"]).label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                    {item.catatanAdmin || "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === "menunggu_review" && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, "disetujui")}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          Setujui
                        </button>
                      )}
                      <Link
                        href={`/tenants?onboard=${item.id}&name=${encodeURIComponent(item.namaInstansi)}`}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Provisioning</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tambah Lead */}
      {/* Modal Tambah Lead */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tambah Calon Mitra ke Database
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddLead} className="flex flex-col flex-1 overflow-hidden min-h-0 text-xs">
              <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama TPS 3R / Bank Sampah / Instansi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: TPS 3R Harapan Jaya"
                  value={form.namaInstansi}
                  onChange={(e) => setForm({ ...form, namaInstansi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Jenis Mitra
                  </label>
                  <select
                    value={form.jenisUsaha}
                    onChange={(e) => setForm({ ...form, jenisUsaha: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                  >
                    <option value="tps3r">TPS 3R</option>
                    <option value="bank_sampah">Bank Sampah</option>
                    <option value="dlh">Dinas Lingkungan Hidup</option>
                    <option value="swasta">Kawasan / Swasta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Estimasi KK
                  </label>
                  <input
                    type="number"
                    value={form.estimasiWarga}
                    onChange={(e) => setForm({ ...form, estimasiWarga: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Nama PIC
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Pengurus"
                    value={form.namaLengkap}
                    onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08xxxxxxxx"
                    value={form.noWhatsapp}
                    onChange={(e) => setForm({ ...form, noWhatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="email@instansi.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Kota / Wilayah
                </label>
                <input
                  type="text"
                  required
                  value={form.kota}
                  onChange={(e) => setForm({ ...form, kota: e.target.value })}
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  {submitting ? "Menyimpan..." : "Simpan Prospek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
