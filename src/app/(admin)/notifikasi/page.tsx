"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Pelanggan = { id: number; nama: string; noTelepon: string };
type Notifikasi = {
  id: number;
  tipe: string;
  judul: string;
  pesan: string;
  penerima: string;
  status: string;
  createdAt: string;
  pelanggan?: { nama: string } | null;
};

type Pengumuman = {
  id: number;
  judul: string;
  isi: string;
  penting: boolean;
  createdAt: string;
  createdBy: { nama: string };
  untukWilayah?: { nama: string } | null;
};

const TIPE_NOTIF = [
  { value: "pengumuman", label: "Pengumuman" },
  { value: "tagihan_jatuh_tempo", label: "Tagihan Jatuh Tempo" },
  { value: "jadwal_pengangkutan", label: "Jadwal Pengangkutan" },
  { value: "komplain_diproses", label: "Komplain Diproses" },
];

export default function NotifikasiPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500 font-medium">Memuat Notifikasi & Pengumuman...</div>}>
      <NotifikasiContent />
    </Suspense>
  );
}

function NotifikasiContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "pengumuman" ? "pengumuman" : "broadcast";
  const [activeTab, setActiveTab] = useState<"broadcast" | "pengumuman" | "riwayat" | "template">(initialTab as any);

  const { user } = useUser();
  const { showToast } = useToast();

  // === STATE NOTIFIKASI WA ===
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [riwayat, setRiwayat] = useState<Notifikasi[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    links?: string[];
    failures?: string[];
  } | null>(null);
  const [form, setForm] = useState({
    tipe: "pengumuman",
    judul: "",
    pesan: "",
    pelangganId: "",
    semuaPelanggan: true,
  });

  // === STATE PENGUMUMAN ===
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [wilayahList, setWilayahList] = useState<{ id: number; nama: string }[]>([]);
  const [loadingPengumuman, setLoadingPengumuman] = useState(true);
  const [showPengumumanForm, setShowPengumumanForm] = useState(false);
  const [deletePengumumanTarget, setDeletePengumumanTarget] = useState<Pengumuman | null>(null);
  const [deletingPengumuman, setDeletingPengumuman] = useState(false);
  const [pengumumanForm, setPengumumanForm] = useState({
    judul: "",
    isi: "",
    penting: false,
    untukWilayahId: "",
  });

  // Sync tab with URL if changed
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pengumuman") {
      setActiveTab("pengumuman");
    } else if (tabParam === "broadcast") {
      setActiveTab("broadcast");
    } else if (tabParam === "riwayat") {
      setActiveTab("riwayat");
    } else if (tabParam === "template") {
      setActiveTab("riwayat");
    }
  }, [searchParams]);

  // Fetch Notifikasi data
  const fetchNotifData = useCallback(async () => {
    try {
      const [pelRes, notifRes] = await Promise.all([
        fetch("/api/pelanggan"),
        fetch("/api/notifikasi"),
      ]);
      setPelangganList(await pelRes.json());
      setRiwayat(await notifRes.json());
    } catch {
      showToast("Gagal memuat notifikasi", "error");
    } finally {
      setLoadingNotif(false);
    }
  }, [showToast]);

  // Fetch Pengumuman data
  const fetchPengumumanData = useCallback(async () => {
    try {
      const [pengumumanRes, wilayahRes] = await Promise.all([
        fetch("/api/pengumuman"),
        fetch("/api/wilayah"),
      ]);
      setPengumuman(await pengumumanRes.json());
      setWilayahList(await wilayahRes.json());
    } catch {
      showToast("Gagal memuat pengumuman", "error");
    } finally {
      setLoadingPengumuman(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNotifData();
    fetchPengumumanData();
  }, [fetchNotifData, fetchPengumumanData]);

  // Handle Kirim Notifikasi WA
  async function handleSubmitNotif(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/notifikasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipe: form.tipe,
          judul: form.judul,
          pesan: form.pesan,
          pelangganId: form.semuaPelanggan ? undefined : form.pelangganId || undefined,
        }),
      });

      const data = await res.json();
      setResult(data);

      if (res.ok) {
        setForm({ tipe: "pengumuman", judul: "", pesan: "", pelangganId: "", semuaPelanggan: true });
        showToast("Notifikasi berhasil disiapkan/dikirim");
        fetchNotifData();
      } else {
        showToast(data.error || "Gagal mengirim notifikasi", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSending(false);
    }
  }

  // Handle Terbitkan Pengumuman
  async function handleSubmitPengumuman(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Silakan login ulang", "error");
      return;
    }

    try {
      const res = await fetch("/api/pengumuman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pengumumanForm,
          penting: pengumumanForm.penting,
          createdById: user.id.toString(),
        }),
      });

      if (res.ok) {
        setShowPengumumanForm(false);
        setPengumumanForm({ judul: "", isi: "", penting: false, untukWilayahId: "" });
        showToast("Pengumuman berhasil dipublikasikan");
        fetchPengumumanData();
      } else {
        showToast("Gagal menyimpan pengumuman", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    }
  }

  // Handle Hapus Pengumuman
  async function confirmDeletePengumuman() {
    if (!deletePengumumanTarget) return;
    setDeletingPengumuman(true);
    try {
      const res = await fetch(`/api/pengumuman/${deletePengumumanTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Pengumuman berhasil dihapus");
        setDeletePengumumanTarget(null);
        fetchPengumumanData();
      } else {
        showToast("Gagal menghapus pengumuman", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDeletingPengumuman(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
            Pusat Notifikasi & Pengumuman
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Kirim broadcast WhatsApp ke warga serta kelola papan pengumuman resmi
          </p>
        </div>

        {activeTab === "broadcast" || activeTab === "riwayat" ? (
          <button
            onClick={() => { setShowForm(true); setResult(null); }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Kirim Notifikasi WA
          </button>
        ) : (
          <button
            onClick={() => setShowPengumumanForm(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Pengumuman Baru
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "broadcast"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>💬 Broadcast WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveTab("pengumuman")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "pengumuman"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>📢 Papan Pengumuman</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "pengumuman" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {pengumuman.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("riwayat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "riwayat"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>📜 Riwayat Notifikasi</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${activeTab === "riwayat" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"}`}>
            {riwayat.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BROADCAST WHATSAPP */}
      {/* ========================================================================= */}
      {activeTab === "broadcast" && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setForm({
                  tipe: "tagihan_jatuh_tempo",
                  judul: "Pengingat Tagihan",
                  pesan: "Yth. Pelanggan UPS HERU,\n\nTagihan bulan ini sudah tersedia. Mohon segera melakukan pembayaran sebelum tanggal 15.\n\nTerima kasih.",
                  pelangganId: "",
                  semuaPelanggan: true,
                });
                setShowForm(true);
              }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
            >
              <p className="font-bold text-slate-900 text-sm">📋 Pengingat Tagihan</p>
              <p className="text-slate-500 text-xs mt-1">Kirim pengingat pembayaran ke semua pelanggan</p>
            </button>

            <button
              onClick={() => {
                setForm({
                  tipe: "jadwal_pengangkutan",
                  judul: "Jadwal Pengangkutan",
                  pesan: "Yth. Pelanggan UPS HERU,\n\nPengangkutan sampah akan dilakukan besok sesuai jadwal. Mohon siapkan sampah di depan rumah.\n\nTerima kasih.",
                  pelangganId: "",
                  semuaPelanggan: true,
                });
                setShowForm(true);
              }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
            >
              <p className="font-bold text-slate-900 text-sm">🗑️ Pengingat Jadwal</p>
              <p className="text-slate-500 text-xs mt-1">Info jadwal pengangkutan besok</p>
            </button>

            <button
              onClick={() => {
                setForm({
                  tipe: "pengumuman",
                  judul: "Pengumuman Libur",
                  pesan: "Yth. Pelanggan UPS HERU,\n\nDiberitahukan bahwa layanan pengangkutan sampah libur pada hari besar nasional. Jadwal akan kembali normal pada hari berikutnya.\n\nTerima kasih.",
                  pelangganId: "",
                  semuaPelanggan: true,
                });
                setShowForm(true);
              }}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
            >
              <p className="font-bold text-slate-900 text-sm">📢 Pengumuman Libur</p>
              <p className="text-slate-500 text-xs mt-1">Info libur & perubahan jadwal</p>
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
            >
              <p className="font-bold text-slate-900 text-sm">✏️ Pesan Kustom</p>
              <p className="text-slate-500 text-xs mt-1">Buat pesan broadcast mandiri</p>
            </button>
          </div>

          {/* Banner Riwayat Terkini */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">5 Notifikasi Terakhir</h3>
              <button
                onClick={() => setActiveTab("riwayat")}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Lihat Semua Riwayat ({riwayat.length}) &rarr;
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {loadingNotif ? (
                <div className="py-4 text-center text-xs text-slate-500">Memuat riwayat...</div>
              ) : riwayat.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">Belum ada riwayat notifikasi</div>
              ) : (
                riwayat.slice(0, 5).map((n) => (
                  <div key={n.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{n.judul}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          {TIPE_NOTIF.find((t) => t.value === n.tipe)?.label || n.tipe}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{n.pesan.slice(0, 80)}...</p>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] shrink-0">{formatDate(n.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAPAN PENGUMUMAN */}
      {/* ========================================================================= */}
      {activeTab === "pengumuman" && (
        <div className="space-y-4">
          {loadingPengumuman ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Memuat pengumuman...
            </div>
          ) : pengumuman.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Belum ada pengumuman yang diterbitkan
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pengumuman.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                    p.penting ? "border-amber-300 bg-amber-50/20" : "border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {p.penting && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          ⚠️ PENTING
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 text-base">{p.judul}</h3>
                    </div>
                    <button
                      onClick={() => setDeletePengumumanTarget(p)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Hapus Pengumuman"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">
                    {p.isi}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                    <span>Oleh: <strong className="text-slate-600">{p.createdBy?.nama || "Admin"}</strong></span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RIWAYAT NOTIFIKASI LENGKAP */}
      {/* ========================================================================= */}

      {/* ========================================================================= */}
      {/* TAB 4: TEMPLATE PESAN */}
      {/* ========================================================================= */}
      {activeTab === "template" && <TemplateSettingsForm showToast={showToast} />}

      {activeTab === "riwayat" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <h2 className="font-bold text-slate-900 text-sm">Riwayat Notifikasi Lengkap</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {loadingNotif ? (
              <div className="px-4 py-8 text-center text-slate-600 font-medium">Memuat...</div>
            ) : riwayat.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-600 font-medium">Belum ada notifikasi</div>
            ) : (
              riwayat.map((n) => (
                <div key={n.id} className="px-5 py-3.5 hover:bg-slate-50/70 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{n.judul}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          n.tipe === "pengumuman" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          n.tipe === "tagihan_jatuh_tempo" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {TIPE_NOTIF.find((t) => t.value === n.tipe)?.label || n.tipe}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{n.pesan}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Penerima: {n.pelanggan?.nama || n.penerima} • {formatDate(n.createdAt)}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      n.status === "terkirim" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600"
                    }`}>
                      {n.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FORM KIRIM NOTIFIKASI WA */}
      {/* ========================================================================= */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-semibold text-slate-900">Kirim Notifikasi WhatsApp</h2>
              <button
                onClick={() => { setShowForm(false); setResult(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitNotif} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe Notifikasi</label>
                <select
                  value={form.tipe}
                  onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                >
                  {TIPE_NOTIF.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                  placeholder="cth: Pengingat Tagihan Bulan Ini"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pesan WhatsApp <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  value={form.pesan}
                  onChange={(e) => setForm({ ...form, pesan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white resize-none"
                  placeholder="Tulis pesan..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Penerima</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="penerima"
                      checked={form.semuaPelanggan}
                      onChange={() => setForm({ ...form, semuaPelanggan: true, pelangganId: "" })}
                      className="text-emerald-700 focus:ring-emerald-500"
                    />
                    Semua Pelanggan Aktif ({pelangganList.length} orang)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="penerima"
                      checked={!form.semuaPelanggan}
                      onChange={() => setForm({ ...form, semuaPelanggan: false })}
                      className="text-emerald-700 focus:ring-emerald-500"
                    />
                    Pilih Satu Pelanggan Tertentu
                  </label>
                </div>

                {!form.semuaPelanggan && (
                  <select
                    value={form.pelangganId}
                    onChange={(e) => setForm({ ...form, pelangganId: e.target.value })}
                    className="w-full mt-2 px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                    required={!form.semuaPelanggan}
                  >
                    <option value="">-- Pilih Pelanggan --</option>
                    {pelangganList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama} ({p.noTelepon})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tampilan Hasil / Link WA */}
              {result && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-emerald-800">{result.message}</p>
                  {result.links && result.links.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-medium text-emerald-700">Tautan Manual WhatsApp:</p>
                      {result.links.slice(0, 3).map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-emerald-600 hover:underline truncate"
                        >
                          🔗 Buka Chat WA #{i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setResult(null); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition"
                >
                  {sending ? "Mengirim..." : "Kirim Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FORM BUAT PENGUMUMAN BARU */}
      {/* ========================================================================= */}
      {showPengumumanForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-semibold text-slate-900">Buat Pengumuman Baru</h2>
              <button
                onClick={() => setShowPengumumanForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitPengumuman} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Pengumuman <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={pengumumanForm.judul}
                  onChange={(e) => setPengumumanForm({ ...pengumumanForm, judul: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                  placeholder="cth: Perubahan Jadwal Libur Lebaran"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Wilayah Spesifik (Opsional)</label>
                <select
                  value={pengumumanForm.untukWilayahId}
                  onChange={(e) => setPengumumanForm({ ...pengumumanForm, untukWilayahId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="">-- Semua Wilayah --</option>
                  {wilayahList.map((w) => (
                    <option key={w.id} value={w.id}>{w.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Isi Pengumuman <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={pengumumanForm.isi}
                  onChange={(e) => setPengumumanForm({ ...pengumumanForm, isi: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white resize-none"
                  placeholder="Tulis rincian pengumuman..."
                  required
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={pengumumanForm.penting}
                  onChange={(e) => setPengumumanForm({ ...pengumumanForm, penting: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                Tandai sebagai Pengumuman Penting (High Priority)
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPengumumanForm(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition"
                >
                  Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Pengumuman */}
      <ConfirmDialog
        open={Boolean(deletePengumumanTarget)}
        title="Hapus Pengumuman"
        message={`Yakin ingin menghapus pengumuman "${deletePengumumanTarget?.judul}"?`}
        confirmText="Hapus"
        variant="danger"
        loading={deletingPengumuman}
        onConfirm={confirmDeletePengumuman}
        onCancel={() => setDeletePengumumanTarget(null)}
      />
    </div>
  );
}



// --- TemplateSettingsForm Component ---
function TemplateSettingsForm({ showToast }: { showToast: (msg: string, type: 'success'|'error') => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/pengaturan/template-pesan')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTemplates(data);
        setLoading(false);
      });
  }, []);

  const handleChange = (key: string, val: string) => setTemplates(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pengaturan/template-pesan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates)
      });
      const data = await res.json();
      if (data.ok) showToast("Template berhasil disimpan", "success");
      else showToast(data.error || "Gagal menyimpan", "error");
    } catch (e: any) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat template...</div>;

  const tpls = [
    { key: "WA_TEMPLATE_TAGIHAN_BARU", label: "Tagihan Baru / Perdana", vars: "[NAMA], [KODE], [PERIODE], [TOTAL], [JATUH_TEMPO], [PAKET], [LINK]" },
    { key: "WA_TEMPLATE_TAGIHAN_JATUH_TEMPO", label: "Pengingat Tagihan (Jatuh Tempo)", vars: "[NAMA], [NO_INVOICE], [PERIODE], [TOTAL], [JATUH_TEMPO], [SISA_HARI], [LINK]" },
    { key: "WA_TEMPLATE_TUNGGAKAN", label: "Tagihan Menunggak (Denda)", vars: "[NAMA], [NO_INVOICE], [PERIODE], [TOTAL], [DENDA], [LINK]" },
    { key: "WA_TEMPLATE_PEMBAYARAN_DITERIMA", label: "Pembayaran Diterima", vars: "[NAMA], [NO_INVOICE], [PERIODE], [TOTAL], [METODE], [LINK]" },
    { key: "WA_TEMPLATE_PEMBAYARAN_GAGAL", label: "Pembayaran Gagal/Kadaluarsa", vars: "[NAMA], [NO_INVOICE], [PERIODE], [TOTAL], [LINK]" },
    { key: "WA_TEMPLATE_PENDAFTARAN_DITERIMA", label: "Pendaftaran Diterima", vars: "[NAMA], [KODE]" },
    { key: "WA_TEMPLATE_PENDAFTARAN_DISETUJUI", label: "Pendaftaran Disetujui", vars: "[NAMA], [KODE]" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Pengaturan Template Pesan Otomatis</h2>
          <p className="text-slate-500 text-sm mt-1">Sesuaikan kalimat untuk berbagai notifikasi WhatsApp otomatis. Kosongkan untuk menggunakan template bawaan sistem.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
        >
          {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tpls.map(t => (
          <div key={t.key} className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">{t.label}</label>
            <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-mono break-all">{t.vars}</p>
            <textarea
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 text-sm h-40 font-mono bg-slate-50"
              value={templates[t.key] || ""}
              onChange={e => handleChange(t.key, e.target.value)}
              placeholder="Kosongkan untuk menggunakan template default sistem..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}
