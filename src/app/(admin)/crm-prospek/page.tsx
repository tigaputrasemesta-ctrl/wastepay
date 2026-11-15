"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface Lead {
  id: string;
  namaInstansi: string;
  tipe: "tps3r" | "bank_sampah" | "dlh" | "swasta";
  picName: string;
  phone: string;
  kota: string;
  estimasiKk: number;
  stage: "prospek" | "dihubungi" | "demo" | "negosiasi" | "closing";
  source: string;
  catatan: string;
}

const INITIAL_LEADS: Lead[] = [
  {
    id: "lead-1",
    namaInstansi: "TPS 3R Cibinong Asri",
    tipe: "tps3r",
    picName: "Bpk. Bambang Wijaya",
    phone: "081298765432",
    kota: "Kab. Bogor",
    estimasiKk: 1200,
    stage: "demo",
    source: "Referral UPS HERU",
    catatan: "Tertarik fitur pelacakan GPS armada truk dan integrasi QRIS.",
  },
  {
    id: "lead-2",
    namaInstansi: "Bank Sampah Hijau Lestari",
    tipe: "bank_sampah",
    picName: "Ibu Nurul Aini",
    phone: "081387654321",
    kota: "Kota Bandung",
    estimasiKk: 450,
    stage: "negosiasi",
    source: "Event DLH Jawa Barat",
    catatan: "Meminta diskon starter 6 bulan pertama.",
  },
  {
    id: "lead-3",
    namaInstansi: "KSM Bersih Sejahtera",
    tipe: "tps3r",
    picName: "Bpk. Dedi Supriyadi",
    phone: "081122334455",
    kota: "Kota Bekasi",
    estimasiKk: 800,
    stage: "dihubungi",
    source: "Website O2W HERO",
    catatan: "Follow up jadwal zoom presentasi produk hari Kamis.",
  },
  {
    id: "lead-4",
    namaInstansi: "DLH Kabupaten Tangerang",
    tipe: "dlh",
    picName: "Ibu Maya (Kabid Pengelolaan Sampah)",
    phone: "081599887766",
    kota: "Kab. Tangerang",
    estimasiKk: 15000,
    stage: "prospek",
    source: "CSR BUMN",
    catatan: "Menjajaki lisensi percontohan 5 TPS 3R kelurahan.",
  },
];

export default function CrmProspekPage() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    namaInstansi: "",
    tipe: "tps3r" as Lead["tipe"],
    picName: "",
    phone: "",
    kota: "Kota Depok",
    estimasiKk: 500,
    source: "Referral",
    catatan: "",
  });

  const filteredLeads = leads.filter((l) => {
    const matchStage = filterStage === "all" || l.stage === filterStage;
    const matchSearch =
      l.namaInstansi.toLowerCase().includes(search.toLowerCase()) ||
      l.picName.toLowerCase().includes(search.toLowerCase()) ||
      l.kota.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newL: Lead = {
      id: `lead-${Date.now()}`,
      namaInstansi: form.namaInstansi,
      tipe: form.tipe,
      picName: form.picName,
      phone: form.phone,
      kota: form.kota,
      estimasiKk: Number(form.estimasiKk),
      stage: "prospek",
      source: form.source,
      catatan: form.catatan,
    };
    setLeads([newL, ...leads]);
    setShowModal(false);
  };

  const STAGE_LABELS: Record<Lead["stage"], { label: string; color: string }> = {
    prospek: { label: "1. Prospek Baru", color: "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300" },
    dihubungi: { label: "2. Sudah Dihubungi", color: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300" },
    demo: { label: "3. Demo Terjadwal", color: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300" },
    negosiasi: { label: "4. Negosiasi Kontrak", color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" },
    closing: { label: "5. Won / Onboarded", color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" },
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>SaaS Control Tower — CRM & GTM Expansion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              CRM & Pipeline Calon Mitra O2W HERO
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Mengelola proses akuisisi calon TPS 3R, Bank Sampah, dan Kemitraan DLH menuju target 50 mitra aktif pertama.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Target Bulan ke-6
          </span>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            50 Mitra
          </div>
          <p className="text-xs text-slate-500 mt-2">Target ekspansi regional</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Pipeline Aktif
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {leads.length} Prospek
          </div>
          <p className="text-xs text-slate-500 mt-2">Dalam proses negosiasi & demo</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Estimasi Warga Tambahan
          </span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {leads.reduce((a, b) => a + b.estimasiKk, 0).toLocaleString("id-ID")} KK
          </div>
          <p className="text-xs text-slate-500 mt-2">Potensi perluasan jaringan</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Conversion Rate
          </span>
          <div className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
            28.5%
          </div>
          <p className="text-xs text-slate-500 mt-2">Rasio demo to onboarded</p>
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
            {["all", "prospek", "dihubungi", "demo", "negosiasi", "closing"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStage(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStage === st
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                }`}
              >
                {st === "all" ? "Semua Stage" : st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Nama Instansi / Calon Mitra</th>
              <th className="px-6 py-4">PIC & Kontak</th>
              <th className="px-6 py-4">Wilayah & Nasabah</th>
              <th className="px-6 py-4">Tahapan Pipeline</th>
              <th className="px-6 py-4">Sumber Lead</th>
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
                  <span className="text-xs text-slate-400 capitalize">{item.tipe.replace("_", " ")}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800 dark:text-zinc-200">{item.picName}</div>
                  <a
                    href={`https://wa.me/${item.phone.replace(/^0/, "62")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{item.phone}</span>
                  </a>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 dark:text-zinc-300">
                  <div className="font-bold text-slate-900 dark:text-white">{item.kota}</div>
                  <span className="text-slate-400">~{item.estimasiKk} KK Warga</span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      STAGE_LABELS[item.stage].color
                    }`}
                  >
                    {STAGE_LABELS[item.stage].label}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                  {item.source}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/tenants?onboard=${item.id}&name=${encodeURIComponent(item.namaInstansi)}`}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Onboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Lead */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tambah Prospek Calon Mitra
            </h3>
            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
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
                    value={form.tipe}
                    onChange={(e) => setForm({ ...form, tipe: e.target.value as any })}
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
                    value={form.estimasiKk}
                    onChange={(e) => setForm({ ...form, estimasiKk: Number(e.target.value) })}
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
                    value={form.picName}
                    onChange={(e) => setForm({ ...form, picName: e.target.value })}
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
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  Simpan Prospek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
