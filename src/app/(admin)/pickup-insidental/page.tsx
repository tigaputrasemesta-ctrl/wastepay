"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Truck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  MessageCircle,
  Eye,
  Edit3,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface PetugasItem {
  id: number;
  nama: string;
  noTelepon?: string | null;
}

interface KendaraanItem {
  id: number;
  nama: string;
  platNomor: string | null;
  jenis: string;
}

interface KategoriPickup {
  id: number;
  kode: string;
  nama: string;
  satuanMuatan: string;
  tarifDasar: number;
  tarifPerUnit: number | null;
}

interface PesananPickup {
  id: number;
  noOrder: string;
  namaPemesan: string;
  noTelepon: string;
  alamat: string;
  patokan: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  latitude: number | null;
  longitude: number | null;
  estimasiMuatan: string;
  fotoSampah: string | null;
  tanggalJemput: string;
  waktuJemput: string | null;
  estimasiBiaya: number;
  biayaFinal: number | null;
  metodeBayar: string;
  statusBayar: string;
  buktiBayar: string | null;
  status: string;
  catatanPetugas: string | null;
  fotoSelesai: string | null;
  petugasId: number | null;
  kendaraanId: number | null;
  createdAt: string;
  kategoriPickup: KategoriPickup;
  petugas: { id: number; nama: string; noTelepon?: string | null } | null;
  kendaraan: { id: number; nama: string; platNomor: string | null; jenis: string } | null;
}

const STATUS_TABS = [
  { id: "semua", label: "Semua" },
  { id: "menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
  { id: "dikonfirmasi", label: "Dikonfirmasi" },
  { id: "ditugaskan", label: "Ditugaskan" },
  { id: "otw", label: "OTW" },
  { id: "dijemput", label: "Dijemput" },
  { id: "selesai", label: "Selesai" },
  { id: "dibatalkan", label: "Dibatalkan" },
];

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  menunggu_konfirmasi: {
    label: "Menunggu Konfirmasi",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  dikonfirmasi: {
    label: "Dikonfirmasi",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  ditugaskan: {
    label: "Ditugaskan",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  otw: {
    label: "Armada OTW",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  dijemput: {
    label: "Sedang Dimuat",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
  },
  selesai: {
    label: "Selesai",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  dibatalkan: {
    label: "Dibatalkan",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
};

export default function PickupInsidentalPage() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<PesananPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Resource dropdowns
  const [petugasList, setPetugasList] = useState<PetugasItem[]>([]);
  const [kendaraanList, setKendaraanList] = useState<KendaraanItem[]>([]);

  // Modal Detail / Edit
  const [selectedOrder, setSelectedOrder] = useState<PesananPickup | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPetugasId, setEditPetugasId] = useState<number | string>("");
  const [editKendaraanId, setEditKendaraanId] = useState<number | string>("");
  const [editBiayaFinal, setEditBiayaFinal] = useState<number | string>("");
  const [editStatusBayar, setEditStatusBayar] = useState("");
  const [editCatatan, setEditCatatan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Foto Preview
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Fetch Petugas & Kendaraan
  useEffect(() => {
    async function fetchResources() {
      try {
        const [resPetugas, resKendaraan] = await Promise.all([
          fetch("/api/petugas"),
          fetch("/api/kendaraan"),
        ]);
        if (resPetugas.ok) {
          const data = await resPetugas.json();
          setPetugasList(Array.isArray(data) ? data : []);
        }
        if (resKendaraan.ok) {
          const data = await resKendaraan.json();
          setKendaraanList(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Gagal load petugas / armada:", err);
      }
    }
    fetchResources();
  }, []);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      setRefreshing(true);
      const q = new URLSearchParams();
      if (activeStatus !== "semua") q.set("status", activeStatus);
      if (searchQuery.trim()) q.set("search", searchQuery.trim());
      q.set("limit", "100");

      const res = await fetch(`/api/admin/pickup/orders?${q.toString()}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setOrders(json.data);
      } else {
        showToast(json.error || "Gagal memuat daftar pesanan pickup", "error");
      }
    } catch {
      showToast("Gagal memuat pesanan pickup", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatus, searchQuery, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Open Edit Modal
  const openEditModal = (order: PesananPickup) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditPetugasId(order.petugasId ?? "");
    setEditKendaraanId(order.kendaraanId ?? "");
    setEditBiayaFinal(order.biayaFinal !== null ? order.biayaFinal : order.estimasiBiaya);
    setEditStatusBayar(order.statusBayar);
    setEditCatatan(order.catatanPetugas ?? "");
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/pickup/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          petugasId: editPetugasId ? Number(editPetugasId) : null,
          kendaraanId: editKendaraanId ? Number(editKendaraanId) : null,
          biayaFinal: editBiayaFinal !== "" ? Number(editBiayaFinal) : null,
          statusBayar: editStatusBayar,
          catatanPetugas: editCatatan,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("Perubahan pesanan berhasil disimpan", "success");
        setSelectedOrder(null);
        fetchOrders();
      } else {
        showToast(json.error || "Gagal menyimpan perubahan", "error");
      }
    } catch {
      showToast("Gagal menyimpan perubahan ke server", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Summary Metrics
  const totalCount = orders.length;
  const menungguCount = orders.filter((o) => o.status === "menunggu_konfirmasi").length;
  const aktifCount = orders.filter((o) => ["dikonfirmasi", "ditugaskan", "otw", "dijemput"].includes(o.status)).length;
  const selesaiCount = orders.filter((o) => o.status === "selesai").length;
  const totalNominal = orders.reduce((sum, o) => sum + (o.biayaFinal ?? o.estimasiBiaya ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Pickup Sampah Sekali Angkut
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
                Layanan on-demand puing bangunan, dahan pohon, bulky waste & penugasan armada driver.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 active:scale-95 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-teal-600" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pesanan</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums">
            {totalCount}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 block">Di filter saat ini</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Menunggu</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block tabular-nums">
            {menungguCount}
          </span>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 block">Perlu konfirmasi</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Dalam Proses</span>
          <span className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 block tabular-nums">
            {aktifCount}
          </span>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5 block">Ditugaskan / OTW</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Selesai Angkut</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block tabular-nums">
            {selesaiCount}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block">Berhasil dijemput</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Nilai Layanan</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums text-teal-600 dark:text-teal-400 truncate">
            Rp {totalNominal.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 block">Estimasi & final</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Cari No Order, Nama Pemesan, No WA, atau Alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Status Horizontal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const active = activeStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Memuat pesanan penjemputan...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6">
          <PackageCheck className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">Tidak ada pesanan pickup</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Belum ada data pesanan penjemputan sampah untuk filter status atau pencarian ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => {
            const badge = STATUS_BADGES[order.status] || {
              label: order.status,
              bg: "bg-slate-100",
              text: "text-slate-700",
              border: "border-slate-200",
            };

            const waPhone = order.noTelepon.replace(/^0/, "62").replace(/[^0-9]/g, "");

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-teal-400/70 transition-all space-y-4"
              >
                {/* Header Card */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-wider block">
                        {order.noOrder}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {order.kategoriPickup?.nama || "Pickup Sampah"}
                      </h4>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${badge.bg} ${badge.text} ${badge.border} shrink-0`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Jadwal Jemput */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{order.tanggalJemput.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="capitalize">{order.waktuJemput || "Fleksibel"}</span>
                    </div>
                  </div>

                  {/* Detail Pemesan */}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">{order.namaPemesan}</p>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{order.alamat}</span>
                    </div>
                    {order.patokan && (
                      <p className="text-[10px] text-slate-400 italic pl-5">Patokan: {order.patokan}</p>
                    )}
                  </div>

                  {/* Muatan & Estimasi */}
                  <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-xl p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-teal-800 dark:text-teal-300 font-bold">
                        Estimasi Muatan:
                      </span>
                      <span className="font-extrabold text-teal-900 dark:text-teal-200">
                        {order.estimasiMuatan}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-teal-100 dark:border-teal-900/40">
                      <span className="text-[11px] text-slate-500">Biaya Tagihan:</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        Rp {(order.biayaFinal ?? order.estimasiBiaya).toLocaleString("id-ID")}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">
                          ({order.statusBayar === "lunas" ? "Lunas" : "Belum Bayar"})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Penugasan Lapangan */}
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Petugas:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {order.petugas?.nama || "Belum Ditugaskan"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> Armada:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {order.kendaraan ? `${order.kendaraan.nama} (${order.kendaraan.platNomor || "-"})` : "Belum Ditugaskan"}
                      </span>
                    </div>
                  </div>

                  {/* Foto Sampah Preview Button */}
                  {order.fotoSampah && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewFoto(order.fotoSampah)}
                        className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Foto Sampah Pemesan</span>
                      </button>
                    </div>
                  )}

                  {/* Foto Bukti Selesai Preview Button */}
                  {order.fotoSelesai && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewFoto(order.fotoSelesai)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lihat Foto Bukti Selesai Muat</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Chat WhatsApp */}
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                        `Halo Kak ${order.namaPemesan}, kami dari Layanan Pickup Sekali Angkut UPS HERU mengenai jadwal jemput No Order: ${order.noOrder}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all border border-emerald-200 dark:border-emerald-800"
                      title="Hubungi via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    {/* Google Maps Link */}
                    {order.latitude && order.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 transition-all border border-slate-200 dark:border-zinc-700"
                        title="Buka Peta GPS"
                      >
                        <MapPin className="w-4 h-4 text-rose-500" />
                      </a>
                    )}
                  </div>

                  {/* Kelola Button */}
                  <button
                    onClick={() => openEditModal(order)}
                    className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Kelola & Assign</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL KELOLA / ASSIGN ORDER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-mono font-black text-slate-400 block">
                  {selectedOrder.noOrder}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Kelola Pesanan Pickup
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Info Ringkas */}
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-2xl space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.namaPemesan}</p>
                <p className="text-slate-500 dark:text-zinc-400">{selectedOrder.alamat}</p>
                <p className="text-teal-700 dark:text-teal-300 font-semibold">
                  {selectedOrder.kategoriPickup?.nama} • {selectedOrder.estimasiMuatan}
                </p>
              </div>

              {/* Status Order */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Status Penjemputan
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
                  <option value="dikonfirmasi">Dikonfirmasi (Siap Jadwal)</option>
                  <option value="ditugaskan">Ditugaskan ke Driver</option>
                  <option value="otw">Armada Sedang OTW</option>
                  <option value="dijemput">Sedang Dimuat / Dijemput</option>
                  <option value="selesai">Selesai (Sampah Terangkut)</option>
                  <option value="dibatalkan">Dibatalkan</option>
                </select>
              </div>

              {/* Penugasan Petugas */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Pilih Supir / Petugas Lapangan
                </label>
                <select
                  value={editPetugasId}
                  onChange={(e) => setEditPetugasId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {petugasList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} {p.noTelepon ? `(${p.noTelepon})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Penugasan Kendaraan */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Pilih Armada Kendaraan
                </label>
                <select
                  value={editKendaraanId}
                  onChange={(e) => setEditKendaraanId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {kendaraanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.platNomor || k.nama} - {k.nama} ({k.jenis})
                    </option>
                  ))}
                </select>
              </div>

              {/* Biaya Final & Status Bayar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Biaya Final (Rp)
                  </label>
                  <input
                    type="number"
                    value={editBiayaFinal}
                    onChange={(e) => setEditBiayaFinal(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Estimasi awal: Rp {selectedOrder.estimasiBiaya.toLocaleString("id-ID")}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Status Bayar
                  </label>
                  <select
                    value={editStatusBayar}
                    onChange={(e) => setEditStatusBayar(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="belum_bayar">Belum Bayar</option>
                    <option value="lunas">Lunas</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block capitalize">
                    Metode: {selectedOrder.metodeBayar}
                  </span>
                </div>
              </div>

              {/* Catatan Admin / Petugas */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Catatan untuk Driver / Warga
                </label>
                <textarea
                  rows={2}
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Instruksi khusus muatan, akses jalan masuk gang, dll..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOTO PREVIEW */}
      {previewFoto && (
        <div
          onClick={() => setPreviewFoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="relative max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden p-3 shadow-2xl">
            <button
              onClick={() => setPreviewFoto(null)}
              className="absolute top-5 right-5 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewFoto}
              alt="Foto Preview"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
