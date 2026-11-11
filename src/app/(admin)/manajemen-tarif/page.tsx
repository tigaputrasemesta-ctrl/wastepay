"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Truck,
  Layers,
  Package,
  Tags,
  CheckCircle2,
  AlertCircle,
  Hammer,
  Trees,
  Armchair,
  PartyPopper,
  Tv,
  Boxes,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type KategoriTarif = {
  id: number;
  kategori: string;
  label: string;
  tarif: number;
  deskripsi: string | null;
};

type Paket = {
  id: number;
  kode: string | null;
  nama: string;
  harga: number | null;
  deskripsi: string | null;
};

interface KategoriPickupItem {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  satuanMuatan: string;
  tarifDasar: number;
  tarifPerUnit: number | null;
  armadaStandar: string | null;
  icon: string | null;
  aktif: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    pesananPickup: number;
  };
}

const PICKUP_ICONS: Record<string, any> = {
  Hammer,
  Trees,
  Armchair,
  PartyPopper,
  Tv,
  Trash2,
  Package,
  Boxes,
  Truck,
};

function getPickupIconComponent(iconName?: string | null) {
  if (!iconName) return Truck;
  return PICKUP_ICONS[iconName] || Truck;
}

type TabType = "retribusi" | "paket" | "pickup";

function TarifContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam === "pickup" ? "pickup" : tabParam === "paket" ? "paket" : "retribusi"
  );

  const { showToast } = useToast();

  // States
  const [kategoris, setKategoris] = useState<KategoriTarif[]>([]);
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [pickupCats, setPickupCats] = useState<KategoriPickupItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showKatForm, setShowKatForm] = useState(false);
  const [katEditing, setKatEditing] = useState<KategoriTarif | null>(null);

  const [showPaketForm, setShowPaketForm] = useState(false);
  const [paketEditing, setPaketEditing] = useState<Paket | null>(null);

  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupEditing, setPickupEditing] = useState<KategoriPickupItem | null>(null);

  // Form States
  const [katForm, setKatForm] = useState({ kategori: "", label: "", tarif: "", deskripsi: "" });
  const [paketForm, setPaketForm] = useState({ kode: "", nama: "", harga: "", deskripsi: "" });
  const [pickupForm, setPickupForm] = useState({
    kode: "",
    nama: "",
    deskripsi: "",
    satuanMuatan: "karung / rit",
    tarifDasar: "",
    tarifPerUnit: "",
    armadaStandar: "pickup",
    icon: "Hammer",
    aktif: true,
  });

  // Delete States
  const [deleteKat, setDeleteKat] = useState<KategoriTarif | null>(null);
  const [deletePaket, setDeletePaket] = useState<Paket | null>(null);
  const [deletePickup, setDeletePickup] = useState<KategoriPickupItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [katRes, paketRes, pickupRes] = await Promise.all([
        fetch("/api/kategori-tarif"),
        fetch("/api/paket"),
        fetch("/api/admin/pickup/kategori"),
      ]);

      if (katRes.ok) setKategoris(await katRes.json());
      if (paketRes.ok) setPakets(await paketRes.json());
      if (pickupRes.ok) {
        const pickupData = await pickupRes.json();
        if (pickupData.ok && Array.isArray(pickupData.data)) {
          setPickupCats(pickupData.data);
        }
      }
    } catch {
      showToast("Gagal memuat data tarif", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update active tab if query param changes
  useEffect(() => {
    if (tabParam === "pickup" || tabParam === "paket" || tabParam === "retribusi") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // === KATEGORI RETRIBUSI BULANAN ===
  function openKat(k: KategoriTarif | null = null) {
    setKatEditing(k);
    if (k) {
      setKatForm({ kategori: k.kategori, label: k.label, tarif: k.tarif.toString(), deskripsi: k.deskripsi || "" });
    } else {
      setKatForm({ kategori: "", label: "", tarif: "", deskripsi: "" });
    }
    setShowKatForm(true);
  }

  async function saveKat(e: React.FormEvent) {
    e.preventDefault();
    const url = katEditing ? `/api/kategori-tarif/${katEditing.id}` : "/api/kategori-tarif";
    const method = katEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kategori: katForm.kategori,
        label: katForm.label,
        tarif: parseInt(katForm.tarif),
        deskripsi: katForm.deskripsi,
      }),
    });

    if (res.ok) {
      setShowKatForm(false);
      showToast("Kategori Tarif berhasil disimpan!");
      fetchData();
    } else {
      showToast("Gagal menyimpan kategori", "error");
    }
  }

  async function confirmDeleteKat() {
    if (!deleteKat) return;
    setDeleting(true);
    const res = await fetch(`/api/kategori-tarif/${deleteKat.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Kategori berhasil dihapus");
      setDeleteKat(null);
      fetchData();
    } else {
      showToast("Gagal menghapus kategori", "error");
    }
  }

  // === PAKET KHUSUS ===
  function openPaket(p: Paket | null = null) {
    setPaketEditing(p);
    if (p) {
      setPaketForm({ kode: p.kode || "", nama: p.nama, harga: p.harga != null ? p.harga.toString() : "", deskripsi: p.deskripsi || "" });
    } else {
      setPaketForm({ kode: "", nama: "", harga: "", deskripsi: "" });
    }
    setShowPaketForm(true);
  }

  async function savePaket(e: React.FormEvent) {
    e.preventDefault();
    const url = paketEditing ? `/api/paket/${paketEditing.id}` : "/api/paket";
    const method = paketEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kode: paketForm.kode,
        nama: paketForm.nama,
        harga: paketForm.harga.trim() !== "" ? parseInt(paketForm.harga) : null,
        deskripsi: paketForm.deskripsi,
      }),
    });

    if (res.ok) {
      setShowPaketForm(false);
      showToast("Paket berhasil disimpan!");
      fetchData();
    } else {
      showToast("Gagal menyimpan paket", "error");
    }
  }

  async function confirmDeletePaket() {
    if (!deletePaket) return;
    setDeleting(true);
    const res = await fetch(`/api/paket/${deletePaket.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Paket berhasil dihapus");
      setDeletePaket(null);
      fetchData();
    } else {
      showToast("Gagal menghapus paket", "error");
    }
  }

  // === KATEGORI PICKUP INSIDENTAL ===
  function openPickup(k: KategoriPickupItem | null = null) {
    setPickupEditing(k);
    if (k) {
      setPickupForm({
        kode: k.kode,
        nama: k.nama,
        deskripsi: k.deskripsi || "",
        satuanMuatan: k.satuanMuatan,
        tarifDasar: k.tarifDasar.toString(),
        tarifPerUnit: k.tarifPerUnit !== null && k.tarifPerUnit !== undefined ? k.tarifPerUnit.toString() : "",
        armadaStandar: k.armadaStandar || "pickup",
        icon: k.icon || "Hammer",
        aktif: k.aktif,
      });
    } else {
      setPickupForm({
        kode: "",
        nama: "",
        deskripsi: "",
        satuanMuatan: "karung / rit",
        tarifDasar: "",
        tarifPerUnit: "",
        armadaStandar: "pickup",
        icon: "Hammer",
        aktif: true,
      });
    }
    setShowPickupForm(true);
  }

  async function savePickup(e: React.FormEvent) {
    e.preventDefault();
    const url = pickupEditing
      ? `/api/admin/pickup/kategori/${pickupEditing.id}`
      : "/api/admin/pickup/kategori";
    const method = pickupEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: pickupForm.kode,
          nama: pickupForm.nama,
          deskripsi: pickupForm.deskripsi,
          satuanMuatan: pickupForm.satuanMuatan,
          tarifDasar: parseFloat(pickupForm.tarifDasar) || 0,
          tarifPerUnit: pickupForm.tarifPerUnit.trim() !== "" ? parseFloat(pickupForm.tarifPerUnit) : null,
          armadaStandar: pickupForm.armadaStandar,
          icon: pickupForm.icon,
          aktif: pickupForm.aktif,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok !== false) {
        setShowPickupForm(false);
        showToast(
          pickupEditing
            ? "Tarif kategori pickup berhasil diperbarui!"
            : "Kategori pickup baru berhasil ditambahkan!"
        );
        fetchData();
      } else {
        showToast(data.error || "Gagal menyimpan kategori pickup", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
  }

  async function togglePickupAktif(k: KategoriPickupItem) {
    try {
      const res = await fetch(`/api/admin/pickup/kategori/${k.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !k.aktif }),
      });
      const data = await res.json();
      if (res.ok && data.ok !== false) {
        showToast(`Status ${k.nama} diubah menjadi ${!k.aktif ? "Aktif" : "Nonaktif"}`);
        fetchData();
      } else {
        showToast(data.error || "Gagal mengubah status kategori", "error");
      }
    } catch {
      showToast("Gagal mengubah status kategori", "error");
    }
  }

  async function confirmDeletePickup() {
    if (!deletePickup) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pickup/kategori/${deletePickup.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok !== false) {
        showToast("Kategori pickup berhasil dihapus");
        setDeletePickup(null);
        fetchData();
      } else {
        showToast(data.error || "Gagal menghapus kategori pickup", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 w-full flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-400 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data tarif...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none mb-1">
            Manajemen Tarif & Layanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
            Kelola struktur tarif retribusi bulanan, paket khusus, dan tarif penjemputan sampah on-demand.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-zinc-800 w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("retribusi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "retribusi"
              ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Retribusi Warga Bulanan</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-mono">
            {kategoris.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("paket")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "paket"
              ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Paket Langganan Khusus</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-mono">
            {pakets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("pickup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "pickup"
              ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Tarif Pickup Insidental</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
            {pickupCats.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: KATEGORI RETRIBUSI BULANAN */}
      {/* ======================================================== */}
      {activeTab === "retribusi" && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Kategori Tarif Pelanggan</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Tarif iuran retribusi bulanan standar berdasarkan tipe hunian / usaha</p>
            </div>
            <button
              onClick={() => openKat(null)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-semibold text-xs border-b border-slate-200 dark:border-zinc-800 uppercase tracking-wider">
                  <th className="px-5 py-3">Label</th>
                  <th className="px-5 py-3">Kode ID</th>
                  <th className="px-5 py-3">Deskripsi</th>
                  <th className="px-5 py-3">Tarif / Bulan</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {kategoris.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-400 font-medium text-xs">
                      Belum ada kategori retribusi
                    </td>
                  </tr>
                ) : (
                  kategoris.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-zinc-100 text-xs">{k.label}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                          {k.kategori}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-zinc-400 max-w-[200px] truncate" title={k.deskripsi || ""}>
                        {k.deskripsi || "—"}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        Rp {k.tarif.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => openKat(k)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteKat(k)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium transition-all"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {kategoris.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400 font-medium">Belum ada kategori</div>
            ) : (
              kategoris.map((k) => (
                <div key={k.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{k.label}</p>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700 mt-1 inline-block">
                        {k.kategori}
                      </span>
                    </div>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                      Rp {k.tarif.toLocaleString("id-ID")}
                    </p>
                  </div>
                  {k.deskripsi && <p className="text-xs text-slate-500 dark:text-zinc-400">{k.deskripsi}</p>}
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-50 dark:border-zinc-800">
                    <button
                      onClick={() => openKat(k)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteKat(k)}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PAKET KHUSUS */}
      {/* ======================================================== */}
      {activeTab === "paket" && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Paket Khusus & Promosi</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Opsi langganan khusus atau paket program tambahan pelanggan</p>
            </div>
            <button
              onClick={() => openPaket(null)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Paket</span>
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-semibold text-xs border-b border-slate-200 dark:border-zinc-800 uppercase tracking-wider">
                  <th className="px-5 py-3">Nama Paket</th>
                  <th className="px-5 py-3">Kode ID</th>
                  <th className="px-5 py-3">Deskripsi</th>
                  <th className="px-5 py-3">Tarif (Rp)</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {pakets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-400 font-medium text-xs">
                      Belum ada paket khusus
                    </td>
                  </tr>
                ) : (
                  pakets.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-zinc-100 text-xs">{p.nama}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                          {p.kode || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[200px]" title={p.deskripsi || ""}>
                        {p.deskripsi || "—"}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {p.harga != null ? `Rp ${p.harga.toLocaleString("id-ID")}` : "Variabel / Custom"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => openPaket(p)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletePaket(p)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium transition-all"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {pakets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400 font-medium">Belum ada paket</div>
            ) : (
              pakets.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{p.nama}</p>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700 mt-1 inline-block">
                        {p.kode || "—"}
                      </span>
                    </div>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                      {p.harga != null ? `Rp ${p.harga.toLocaleString("id-ID")}` : "Variabel"}
                    </p>
                  </div>
                  {p.deskripsi && <p className="text-xs text-slate-500 dark:text-zinc-400">{p.deskripsi}</p>}
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-50 dark:border-zinc-800">
                    <button
                      onClick={() => openPaket(p)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletePaket(p)}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: TARIF PICKUP INSIDENTAL (ON-DEMAND) */}
      {/* ======================================================== */}
      {activeTab === "pickup" && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Tarif Kategori Pickup Sekali Angkut</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Layanan /pickup
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Tarif dasar penjemputan, biaya per unit tambahan, dan armada rekomendasi untuk pesanan di https://upsheru.com/pickup
              </p>
            </div>
            <button
              onClick={() => openPickup(null)}
              className="self-start sm:self-auto bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori Pickup</span>
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-semibold text-xs border-b border-slate-200 dark:border-zinc-800 uppercase tracking-wider">
                  <th className="px-5 py-3">Kategori & Icon</th>
                  <th className="px-5 py-3">Kode ID</th>
                  <th className="px-5 py-3">Satuan Muatan</th>
                  <th className="px-5 py-3">Tarif Dasar</th>
                  <th className="px-5 py-3">Tambahan / Unit</th>
                  <th className="px-5 py-3">Armada Rekomendasi</th>
                  <th className="px-5 py-3 text-center">Status Form</th>
                  <th className="px-5 py-3 text-center">Pesanan</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {pickupCats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-400 font-medium text-xs">
                      Belum ada kategori pickup terdaftar
                    </td>
                  </tr>
                ) : (
                  pickupCats.map((k) => {
                    const IconComp = getPickupIconComponent(k.icon);
                    return (
                      <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-zinc-100 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-zinc-100">{k.nama}</p>
                              {k.deskripsi && (
                                <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-[220px]" title={k.deskripsi}>
                                  {k.deskripsi}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                            {k.kode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-zinc-300">
                          {k.satuanMuatan}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs tabular-nums">
                          Rp {k.tarifDasar.toLocaleString("id-ID")}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-zinc-300 tabular-nums">
                          {k.tarifPerUnit ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              +Rp {k.tarifPerUnit.toLocaleString("id-ID")}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {k.armadaStandar === "dump_truck" ? "🚛 Dump Truck" : k.armadaStandar === "tossa" ? "🛞 Tossa" : "🛺 Mobil Pickup"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => togglePickupAktif(k)}
                            title="Klik untuk mengubah status aktif/nonaktif"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              k.aktif
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${k.aktif ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                            {k.aktif ? "Aktif di Form" : "Nonaktif"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-mono text-xs text-slate-500 dark:text-zinc-400">
                            {k._count?.pesananPickup || 0} order
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => openPickup(k)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletePickup(k)}
                              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium transition-all"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {pickupCats.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Belum ada kategori pickup
              </div>
            ) : (
              pickupCats.map((k) => {
                const IconComp = getPickupIconComponent(k.icon);
                return (
                  <div key={k.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{k.nama}</p>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                            {k.kode}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePickupAktif(k)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          k.aktif
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700"
                        }`}
                      >
                        {k.aktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Tarif Dasar:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          Rp {k.tarifDasar.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Per Unit Tambahan:</span>
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                          {k.tarifPerUnit ? `+Rp ${k.tarifPerUnit.toLocaleString("id-ID")}` : "—"}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>Satuan: {k.satuanMuatan}</span>
                        <span>{k.armadaStandar === "dump_truck" ? "🚛 Dump Truck" : k.armadaStandar === "tossa" ? "🛞 Tossa" : "🛺 Pickup"}</span>
                      </div>
                    </div>

                    {k.deskripsi && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{k.deskripsi}</p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {k._count?.pesananPickup || 0} pesanan tercatat
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPickup(k)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletePickup(k)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: KATEGORI RETRIBUSI BULANAN */}
      {/* ======================================================== */}
      {showKatForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {katEditing ? "Edit Kategori Tarif" : "Tambah Kategori Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Atur tarif retribusi bulanan per kategori pelanggan</p>
              </div>
              <button
                onClick={() => setShowKatForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveKat} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Kode ID Kategori</label>
                <input
                  type="text"
                  value={katForm.kategori}
                  onChange={(e) => setKatForm({ ...katForm, kategori: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors font-mono"
                  placeholder="contoh: rumah_tangga"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Nama / Label</label>
                <input
                  type="text"
                  value={katForm.label}
                  onChange={(e) => setKatForm({ ...katForm, label: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  placeholder="contoh: Rumah Tangga Standar"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Tarif Bulanan (Rp)</label>
                <input
                  type="number"
                  value={katForm.tarif}
                  onChange={(e) => setKatForm({ ...katForm, tarif: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  placeholder="contoh: 30000"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={katForm.deskripsi}
                  onChange={(e) => setKatForm({ ...katForm, deskripsi: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  rows={3}
                  placeholder="Keterangan peruntukan kategori ini..."
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowKatForm(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PAKET KHUSUS */}
      {/* ======================================================== */}
      {showPaketForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {paketEditing ? "Edit Paket Khusus" : "Tambah Paket Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Sesuaikan paket berlangganan atau program custom</p>
              </div>
              <button
                onClick={() => setShowPaketForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={savePaket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Kode ID (opsional)</label>
                <input
                  type="text"
                  value={paketForm.kode}
                  onChange={(e) => setPaketForm({ ...paketForm, kode: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors font-mono"
                  placeholder="contoh: paket_event"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Nama Paket</label>
                <input
                  type="text"
                  value={paketForm.nama}
                  onChange={(e) => setPaketForm({ ...paketForm, nama: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Harga Bulanan (Rp) — kosongkan jika variabel
                </label>
                <input
                  type="number"
                  value={paketForm.harga}
                  onChange={(e) => setPaketForm({ ...paketForm, harga: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={paketForm.deskripsi}
                  onChange={(e) => setPaketForm({ ...paketForm, deskripsi: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  rows={3}
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPaketForm(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: KATEGORI PICKUP INSIDENTAL */}
      {/* ======================================================== */}
      {showPickupForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {pickupEditing ? "Edit Kategori & Tarif Pickup" : "Tambah Kategori Pickup Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Formulir penentuan tarif dasar, satuan, dan armada penjemputan warga
                </p>
              </div>
              <button
                onClick={() => setShowPickupForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={savePickup} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Nama Kategori Sampah *
                  </label>
                  <input
                    type="text"
                    value={pickupForm.nama}
                    onChange={(e) => setPickupForm({ ...pickupForm, nama: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    placeholder="misal: Puing Bangunan & Renovasi"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Kode Unik (Slug) *
                  </label>
                  <input
                    type="text"
                    value={pickupForm.kode}
                    disabled={!!pickupEditing}
                    onChange={(e) => setPickupForm({ ...pickupForm, kode: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors font-mono disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-zinc-900"
                    placeholder="misal: puing, ranting, bulky"
                    required
                  />
                  {pickupEditing && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Kode tidak dapat diubah setelah dibuat.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Tarif Dasar (Rp) *
                  </label>
                  <input
                    type="number"
                    value={pickupForm.tarifDasar}
                    onChange={(e) => setPickupForm({ ...pickupForm, tarifDasar: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors tabular-nums font-bold text-emerald-700 dark:text-emerald-400"
                    placeholder="contoh: 100000"
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Tarif minimal untuk 1 unit pertama.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Tambahan per Unit (Rp)
                  </label>
                  <input
                    type="number"
                    value={pickupForm.tarifPerUnit}
                    onChange={(e) => setPickupForm({ ...pickupForm, tarifPerUnit: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors tabular-nums"
                    placeholder="contoh: 15000"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Kosongkan jika flat / tidak ada tambahan.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Satuan Muatan *
                  </label>
                  <input
                    type="text"
                    value={pickupForm.satuanMuatan}
                    onChange={(e) => setPickupForm({ ...pickupForm, satuanMuatan: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    placeholder="karung / rit"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Armada Rekomendasi
                  </label>
                  <select
                    value={pickupForm.armadaStandar}
                    onChange={(e) => setPickupForm({ ...pickupForm, armadaStandar: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  >
                    <option value="pickup">🛺 Mobil Pickup</option>
                    <option value="dump_truck">🚛 Dump Truck</option>
                    <option value="tossa">🛞 Motor Tossa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Ikon Tampilan
                  </label>
                  <select
                    value={pickupForm.icon}
                    onChange={(e) => setPickupForm({ ...pickupForm, icon: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  >
                    <option value="Hammer">Hammer (Puing & Bangunan)</option>
                    <option value="Trees">Trees (Ranting & Kebun)</option>
                    <option value="Armchair">Armchair (Kasur/Sofa/Bulky)</option>
                    <option value="PartyPopper">PartyPopper (Pesta & Acara)</option>
                    <option value="Tv">Tv (Elektronik / E-Waste)</option>
                    <option value="Package">Package (Daur Ulang/Kardus)</option>
                    <option value="Boxes">Boxes (Pindahan/Barang)</option>
                    <option value="Trash2">Trash2 (Sampah Campur)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Deskripsi Sampah (Ditampilkan ke Warga)
                </label>
                <textarea
                  value={pickupForm.deskripsi}
                  onChange={(e) => setPickupForm({ ...pickupForm, deskripsi: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  rows={2}
                  placeholder="Contoh: Puing sisa pecahan semen, batu bata, keramik, dan genteng renovasi rumah..."
                />
              </div>

              {/* Status Aktif Checkbox */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Status Aktif di Halaman Publik</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Jika nonaktif, opsi kategori ini akan disembunyikan dari formulir /pickup.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pickupForm.aktif}
                    onChange={(e) => setPickupForm({ ...pickupForm, aktif: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPickupForm(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  Simpan Kategori Pickup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRM DELETE DIALOGS */}
      {/* ======================================================== */}
      <ConfirmDialog
        open={!!deleteKat}
        title="Hapus Kategori Retribusi"
        message={`Hapus kategori tarif "${deleteKat?.label}"?`}
        onConfirm={confirmDeleteKat}
        onCancel={() => setDeleteKat(null)}
        loading={deleting}
      />
      <ConfirmDialog
        open={!!deletePaket}
        title="Hapus Paket Khusus"
        message={`Hapus paket langganan "${deletePaket?.nama}"?`}
        onConfirm={confirmDeletePaket}
        onCancel={() => setDeletePaket(null)}
        loading={deleting}
      />
      <ConfirmDialog
        open={!!deletePickup}
        title="Hapus Kategori Pickup"
        message={`Yakin ingin menghapus kategori pickup "${deletePickup?.nama}"? Jika kategori ini sudah memiliki pesanan riwayat, Anda cukup mengubah statusnya menjadi Nonaktif.`}
        onConfirm={confirmDeletePickup}
        onCancel={() => setDeletePickup(null)}
        loading={deleting}
      />
    </div>
  );
}

export default function TarifPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 w-full flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-400 font-medium text-sm">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data tarif & layanan...</span>
          </div>
        </div>
      }
    >
      <TarifContent />
    </Suspense>
  );
}
