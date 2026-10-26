"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type Petugas = {
  id: number;
  nama: string;
  noTelepon: string;
  jabatan?: string | null;
  kelurahan?: { nama: string } | null;
  wilayah?: { nama: string } | null;
};

type Komplain = {
  id: number;
  jenis: string;
  deskripsi: string;
  foto?: string;
  status: string;
  tanggapan?: string;
  createdAt: string;
  pelanggan: {
    id: number;
    nama: string;
    alamat: string;
    noTelepon: string;
    kodePelanggan?: string;
    latitude?: number | null;
    longitude?: number | null;
    patokanLokasi?: string | null;
    rtRw?: string | null;
    kelurahan?: { id?: number; nama: string } | null;
    wilayah?: { id?: number; nama: string; zona?: { id?: number; nama: string } | null } | null;
    jadwal?: Array<{
      hari: string;
      rute?: {
        id: number;
        nama: string;
        petugas?: { id: number; nama: string; noTelepon: string } | null;
      } | null;
    }>;
  };
  resolvedBy?: { id: number; nama: string };
};

const GRUP_PENGADUAN_ID = "120363430666363149@g.us";
const GRUP_PENGADUAN_NAMA = "Grup WhatsApp UPS HERU PENGADUAN";

export default function KomplainPage() {
  const { showToast } = useToast();
  const [komplain, setKomplain] = useState<Komplain[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("semua");

  // State Resolve Modal
  const [showResolve, setShowResolve] = useState<Komplain | null>(null);
  const [formResolve, setFormResolve] = useState({ tanggapan: "", status: "selesai" });

  // State Forward to WhatsApp Modal
  const [showForward, setShowForward] = useState<Komplain | null>(null);
  const [targetType, setTargetType] = useState<"petugas" | "grup" | "custom">("petugas");
  const [selectedPetugasId, setSelectedPetugasId] = useState<number | null>(null);
  const [customPhone, setCustomPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [catatanAdmin, setCatatanAdmin] = useState("");
  const [autoUpdateStatus, setAutoUpdateStatus] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [resK, resP] = await Promise.all([
        fetch("/api/komplain"),
        fetch("/api/petugas"),
      ]);
      if (resK.ok) setKomplain(await resK.json());
      if (resP.ok) {
        const dataP: Petugas[] = await resP.json();
        setPetugasList(dataP.filter((p) => Boolean(p.noTelepon)));
      }
    } catch {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cari petugas rekomendasi berdasarkan rute jadwal rumah pelanggan
  const recommendedPetugas = useMemo(() => {
    if (!showForward) return null;
    const rutePetugas = showForward.pelanggan.jadwal?.[0]?.rute?.petugas;
    if (rutePetugas && rutePetugas.noTelepon) {
      return rutePetugas;
    }
    return null;
  }, [showForward]);

  // Buka modal forward dan pre-select petugas rekomendasi jika ada
  function openForwardModal(k: Komplain) {
    setShowForward(k);
    setCatatanAdmin("");
    setAutoUpdateStatus(k.status === "baru");

    const rutePetugas = k.pelanggan.jadwal?.[0]?.rute?.petugas;
    if (rutePetugas && rutePetugas.noTelepon) {
      setTargetType("petugas");
      setSelectedPetugasId(rutePetugas.id);
    } else if (petugasList.length > 0) {
      setTargetType("petugas");
      setSelectedPetugasId(petugasList[0].id);
    } else {
      setTargetType("grup");
    }
  }

  // Target aktif saat ini (nama & nomor telepon)
  const currentTarget = useMemo(() => {
    if (targetType === "grup") {
      return {
        nama: GRUP_PENGADUAN_NAMA,
        phone: GRUP_PENGADUAN_ID,
        isGroup: true,
      };
    }
    if (targetType === "custom") {
      return {
        nama: customName.trim() || "Petugas Tambahan",
        phone: customPhone.trim(),
        isGroup: false,
      };
    }
    // targetType === "petugas"
    const p = petugasList.find((item) => item.id === selectedPetugasId);
    if (p) {
      return {
        nama: p.nama,
        phone: p.noTelepon,
        isGroup: false,
      };
    }
    return {
      nama: "Petugas Lapangan",
      phone: "",
      isGroup: false,
    };
  }, [targetType, selectedPetugasId, petugasList, customName, customPhone]);

  // Bangun pesan teks WhatsApp yang akan dikirim
  const previewPesanWa = useMemo(() => {
    if (!showForward) return "";
    const p = showForward.pelanggan;
    const labelJenis =
      showForward.jenis === "tidak_diangkut"
        ? "Sampah Tidak Diangkut"
        : showForward.jenis === "sampah_menumpuk"
        ? "Sampah Menumpuk"
        : "Kendala / Lainnya";

    const googleMapsUrl =
      p.latitude && p.longitude
        ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}`
        : null;

    const zonaWilayah =
      p.wilayah?.zona?.nama ||
      (p.wilayah?.nama ? `${p.wilayah.nama} (${p.kelurahan?.nama || ""})` : null) ||
      p.kelurahan?.nama ||
      p.rtRw ||
      "-";

    const lines = [
      `🚨 *DISPOSISI PENGADUAN SAMPAH — UPS HERU*`,
      `ID Tiket: *#KMP-${showForward.id}*`,
      ``,
      `Kepada Yth. Petugas: *${currentTarget.nama}*`,
      `Mohon segera ditindaklanjuti laporan kendala sampah warga berikut:`,
      ``,
      `👤 *Pelanggan* : ${p.nama}${p.kodePelanggan ? ` (${p.kodePelanggan})` : ""}`,
    ];

    if (p.noTelepon) {
      const cleanNo = p.noTelepon.replace(/[^\d]/g, "").replace(/^0/, "62");
      lines.push(`📱 *Kontak Warga* : https://wa.me/${cleanNo}`);
    }
    lines.push(`📍 *Alamat* : ${p.alamat}`);
    if (p.patokanLokasi) {
      lines.push(`🧭 *Patokan* : ${p.patokanLokasi}`);
    }
    if (zonaWilayah && zonaWilayah !== "-") {
      lines.push(`🚛 *Zona / Wilayah* : ${zonaWilayah}`);
    }
    if (googleMapsUrl) {
      lines.push(`🗺️ *Titik Navigasi Maps* : ${googleMapsUrl}`);
    }

    lines.push(
      ``,
      `⚠️ *Jenis Masalah* : ${labelJenis}`,
      `📝 *Isi Keluhan Warga*:`,
      `"${showForward.deskripsi}"`
    );

    if (catatanAdmin && catatanAdmin.trim()) {
      lines.push(
        ``,
        `💬 *Instruksi Khusus Admin*:`,
        `*${catatanAdmin.trim()}*`
      );
    }

    lines.push(
      ``,
      `🗓️ *Waktu Lapor* : ${formatDate(showForward.createdAt)}`,
      ``,
      `Mohon kirimkan foto bukti atau update status setelah penanganan selesai di lokasi. Terima kasih! 🙏`,
      `— *Operasional UPS HERU*`
    );

    return lines.join("\n");
  }, [showForward, currentTarget, catatanAdmin]);

  // 1. Eksekusi Kirim Otomatis via Gateway API
  async function handleSendGateway() {
    if (!showForward) return;
    if (!currentTarget.phone) {
      showToast("Nomor tujuan WhatsApp belum valid", "error");
      return;
    }

    setForwarding(true);
    try {
      const res = await fetch("/api/komplain/teruskan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          komplainId: showForward.id,
          targetPhone: currentTarget.phone,
          targetName: currentTarget.nama,
          catatanAdmin: catatanAdmin.trim() || undefined,
          sendViaGateway: true,
          autoUpdateStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(
          data.statusGateway === "terkirim"
            ? `Berhasil diteruskan ke ${currentTarget.nama} via WhatsApp Gateway! 🚀`
            : `Pesan tercatat (${data.statusGateway}), diteruskan ke ${currentTarget.nama}`
        );
        setShowForward(null);
        fetchData();
      } else {
        showToast(data.error || "Gagal meneruskan komplain", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setForwarding(false);
    }
  }

  // 2. Buka Langsung di WhatsApp (wa.me)
  async function handleOpenWaMe() {
    if (!showForward) return;
    if (currentTarget.isGroup) {
      showToast("Untuk WhatsApp Group, gunakan tombol 'Kirim via Gateway' atau salin pesan.", "error");
      return;
    }
    if (!currentTarget.phone) {
      showToast("Nomor WhatsApp belum dipilih", "error");
      return;
    }

    const cleanPhone = currentTarget.phone.replace(/[^\d]/g, "").replace(/^0/, "62");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(previewPesanWa)}`;

    // Update status di background jika autoUpdateStatus aktif
    if (autoUpdateStatus && showForward.status === "baru") {
      fetch("/api/komplain/teruskan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          komplainId: showForward.id,
          targetPhone: currentTarget.phone,
          targetName: currentTarget.nama,
          catatanAdmin: catatanAdmin.trim() || undefined,
          sendViaGateway: false,
          autoUpdateStatus: true,
        }),
      }).then(() => fetchData()).catch(() => {});
    }

    window.open(waUrl, "_blank");
    showToast(`Membuka WhatsApp untuk ${currentTarget.nama}...`);
    setShowForward(null);
  }

  // 3. Salin Pesan ke Clipboard
  function handleCopyText() {
    if (!previewPesanWa) return;
    navigator.clipboard.writeText(previewPesanWa);
    showToast("Format pesan WhatsApp berhasil disalin ke clipboard! 📋");
  }

  // Eksekusi Resolve Status
  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!showResolve) return;
    const res = await fetch(`/api/komplain/${showResolve.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formResolve),
    });
    if (res.ok) {
      setShowResolve(null);
      setFormResolve({ tanggapan: "", status: "selesai" });
      showToast("Status komplain berhasil diperbarui");
      fetchData();
    }
  }

  const filteredKomplain = useMemo(() => {
    if (statusFilter === "semua") return komplain;
    return komplain.filter((k) => k.status === statusFilter);
  }, [komplain, statusFilter]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1.5">
            Pusat Pengaduan & Komplain
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Pantau laporan warga dan teruskan langsung instruksi penanganan ke WhatsApp Petugas Lapangan
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/70 self-start sm:self-auto overflow-x-auto">
          {[
            { id: "semua", label: "Semua", count: komplain.length },
            { id: "baru", label: "Baru", count: komplain.filter((k) => k.status === "baru").length },
            { id: "diproses", label: "Diproses", count: komplain.filter((k) => k.status === "diproses").length },
            { id: "selesai", label: "Selesai", count: komplain.filter((k) => k.status === "selesai").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-white text-emerald-800 shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.id
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        {/* Desktop Table View (>= md: 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                <th className="text-left px-5 py-4 whitespace-nowrap">ID & Tanggal</th>
                <th className="text-left px-5 py-4 whitespace-nowrap">Pelanggan & Lokasi</th>
                <th className="text-left px-5 py-4 whitespace-nowrap">Jenis</th>
                <th className="text-left px-5 py-4">Isi Keluhan</th>
                <th className="text-center px-4 py-4 whitespace-nowrap">Status</th>
                <th className="text-right px-5 py-4 whitespace-nowrap">Aksi Penanganan</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-xs font-medium">
                    Memuat data pengaduan...
                  </td>
                </tr>
              ) : filteredKomplain.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-xs font-medium">
                    Tidak ada pengaduan dengan status ini.
                  </td>
                </tr>
              ) : (
                filteredKomplain.map((k) => {
                  const rutePetugas = k.pelanggan.jadwal?.[0]?.rute?.petugas;
                  return (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          #KMP-{k.id}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">{formatDate(k.createdAt)}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{k.pelanggan.nama}</div>
                        <div className="text-xs text-slate-500 font-mono">{k.pelanggan.noTelepon}</div>
                        <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          📍 {k.pelanggan.alamat}
                        </div>
                        {rutePetugas && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md font-medium">
                            🚛 Rute: <b>{rutePetugas.nama}</b>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {k.jenis === "tidak_diangkut"
                            ? "Tidak Diangkut"
                            : k.jenis === "sampah_menumpuk"
                            ? "Sampah Menumpuk"
                            : "Lainnya"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-700 text-xs max-w-xs">
                        <div className="flex items-start gap-1.5">
                          {k.foto && (
                            <span className="text-emerald-600 text-sm mt-0.5" title="Ada Foto Bukti">
                              📷
                            </span>
                          )}
                          <div>
                            <p className="line-clamp-2 leading-relaxed">{k.deskripsi}</p>
                            {k.tanggapan && (
                              <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-100 p-1 rounded">
                                💬 {k.tanggapan}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            k.status === "baru"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : k.status === "diproses"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Tombol Teruskan ke WhatsApp Petugas */}
                          <button
                            onClick={() => openForwardModal(k)}
                            className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm transition"
                            title="Teruskan laporan pengaduan ini ke WhatsApp Petugas"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.771.814 2.791.814 3.18 0 5.766-2.587 5.767-5.767.001-3.18-2.585-5.766-5.767-5.767zm7.502 5.766c-.001 4.14-3.364 7.503-7.502 7.503-1.282 0-2.482-.323-3.539-.893l-4.492 1.178 1.198-4.377c-.636-1.096-.97-2.355-.97-3.411 0-4.14 3.363-7.503 7.503-7.503 4.139 0 7.502 3.363 7.502 7.502z" />
                            </svg>
                            <span>Teruskan WA</span>
                          </button>

                          {/* Tombol Proses / Selesaikan */}
                          {k.status !== "selesai" && (
                            <button
                              onClick={() => setShowResolve(k)}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 px-3 py-1.5 rounded-xl font-bold transition shadow-sm"
                            >
                              Selesaikan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Smart Cards View (< md: 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-xs font-medium">Memuat pengaduan...</div>
          ) : filteredKomplain.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs font-medium">Belum ada pengaduan</div>
          ) : (
            filteredKomplain.map((k) => {
              const rutePetugas = k.pelanggan.jadwal?.[0]?.rute?.petugas;
              return (
                <div key={k.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        #KMP-{k.id}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {k.jenis === "tidak_diangkut"
                          ? "Tidak Diangkut"
                          : k.jenis === "sampah_menumpuk"
                          ? "Sampah Menumpuk"
                          : "Lainnya"}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        k.status === "baru"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : k.status === "diproses"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-sm text-slate-900">{k.pelanggan.nama}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{k.pelanggan.noTelepon}</div>
                    <div className="text-xs text-slate-600 mt-0.5">📍 {k.pelanggan.alamat}</div>

                    {rutePetugas && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md font-medium">
                        🚛 Petugas Rute: <b>{rutePetugas.nama}</b>
                      </div>
                    )}

                    <div className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                      {k.deskripsi}
                    </div>

                    {k.foto && (
                      <div className="mt-2">
                        <img
                          src={k.foto}
                          alt="Bukti Komplain"
                          className="w-full max-h-48 object-cover rounded-2xl border border-slate-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <span className="text-[11px] text-slate-400">{formatDate(k.createdAt)}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openForwardModal(k)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.771.814 2.791.814 3.18 0 5.766-2.587 5.767-5.767.001-3.18-2.585-5.766-5.767-5.767zm7.502 5.766c-.001 4.14-3.364 7.503-7.502 7.503-1.282 0-2.482-.323-3.539-.893l-4.492 1.178 1.198-4.377c-.636-1.096-.97-2.355-.97-3.411 0-4.14 3.363-7.503 7.503-7.503 4.139 0 7.502 3.363 7.502 7.502z" />
                        </svg>
                        <span>Teruskan WA</span>
                      </button>

                      {k.status !== "selesai" && (
                        <button
                          onClick={() => setShowResolve(k)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition"
                        >
                          Selesaikan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: TERUSKAN KE PETUGAS FORMAT WHATSAPP                    */}
      {/* ============================================================== */}
      {showForward && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden w-full max-w-2xl my-6">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.771.814 2.791.814 3.18 0 5.766-2.587 5.767-5.767.001-3.18-2.585-5.766-5.767-5.767zm7.502 5.766c-.001 4.14-3.364 7.503-7.502 7.503-1.282 0-2.482-.323-3.539-.893l-4.492 1.178 1.198-4.377c-.636-1.096-.97-2.355-.97-3.411 0-4.14 3.363-7.503 7.503-7.503 4.139 0 7.502 3.363 7.502 7.502z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight">Teruskan Pengaduan ke Petugas</h2>
                  <p className="text-[11px] text-emerald-200 font-mono">Tiket #KMP-{showForward.id} • {showForward.pelanggan.nama}</p>
                </div>
              </div>
              <button
                onClick={() => setShowForward(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-700/80 hover:bg-emerald-700 text-emerald-100 hover:text-white transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Petugas Rekomendasi Badge jika ada */}
              {recommendedPetugas && (
                <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <div>
                      <span className="font-bold">Petugas Rute Terkait: </span>
                      <span className="font-medium">{recommendedPetugas.nama} ({recommendedPetugas.noTelepon})</span>
                    </div>
                  </div>
                  {targetType !== "petugas" || selectedPetugasId !== recommendedPetugas.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType("petugas");
                        setSelectedPetugasId(recommendedPetugas.id);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition"
                    >
                      Pilih Petugas Ini
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Terpilih</span>
                  )}
                </div>
              )}

              {/* Pilihan Target Penerima */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-2">Tujuan Pengiriman Disposisi</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTargetType("petugas")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      targetType === "petugas"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div className="text-sm">👤 Petugas Lapangan</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Japri langsung ke driver</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("grup")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      targetType === "grup"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div className="text-sm">👥 Grup Pengaduan</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Broadcast tim operasional</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("custom")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      targetType === "custom"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div className="text-sm">📱 Nomor Kustom</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Ketik nomor HP lain</div>
                  </button>
                </div>

                {/* Dropdown Petugas jika targetType === "petugas" */}
                {targetType === "petugas" && (
                  <div>
                    <select
                      value={selectedPetugasId || ""}
                      onChange={(e) => setSelectedPetugasId(parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-900"
                    >
                      {petugasList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} • {p.noTelepon} {p.kelurahan ? `(${p.kelurahan.nama})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Input jika targetType === "custom" */}
                {targetType === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nama Penerima (mis. Pak Budi)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Nomor WhatsApp (08xxxx / 628xxxx)"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Catatan Admin Khusus */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Instruksi Khusus untuk Petugas (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tolong segera jemput sebelum dzuhur ya mas / bawa karung cadangan..."
                  value={catatanAdmin}
                  onChange={(e) => setCatatanAdmin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-slate-900 font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Checkbox Otomatis Update Status */}
              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 p-3 rounded-2xl border border-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={autoUpdateStatus}
                  onChange={(e) => setAutoUpdateStatus(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Otomatis tandai status komplain ini menjadi <b>&quot;Diproses&quot;</b> setelah diteruskan
                </span>
              </label>

              {/* Live Preview Pesan WhatsApp Bubble */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>Pratinjau Format Pesan WhatsApp</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Tujuan: {currentTarget.nama}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <span>📋 Salin Teks</span>
                  </button>
                </div>

                <div className="bg-[#E5DDD5] p-3.5 rounded-2xl border border-slate-300/80 shadow-inner">
                  <div className="bg-[#DCF8C6] p-3 rounded-xl shadow-sm text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap border border-[#c4e8aa] max-h-56 overflow-y-auto font-mono text-[11px]">
                    {previewPesanWa}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForward(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>

                <div className="w-full sm:w-auto flex-1 flex flex-col sm:flex-row items-center gap-2 justify-end">
                  {/* Tombol 1: Buka WhatsApp Langsung (wa.me) */}
                  {!currentTarget.isGroup && (
                    <button
                      type="button"
                      onClick={handleOpenWaMe}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white border border-emerald-600 hover:bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.771.814 2.791.814 3.18 0 5.766-2.587 5.767-5.767.001-3.18-2.585-5.766-5.767-5.767zm7.502 5.766c-.001 4.14-3.364 7.503-7.502 7.503-1.282 0-2.482-.323-3.539-.893l-4.492 1.178 1.198-4.377c-.636-1.096-.97-2.355-.97-3.411 0-4.14 3.363-7.503 7.503-7.503 4.139 0 7.502 3.363 7.502 7.502z" />
                      </svg>
                      <span>Buka di WhatsApp (wa.me)</span>
                    </button>
                  )}

                  {/* Tombol 2: Kirim Otomatis via Bot Gateway Fonnte */}
                  <button
                    type="button"
                    disabled={forwarding}
                    onClick={handleSendGateway}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    {forwarding ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengirim Pesan...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀 Kirim Otomatis (Gateway)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: SELESAIKAN STATUS KOMPLAIN                            */}
      {/* ============================================================== */}
      {showResolve && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white">
              <h2 className="font-bold text-base tracking-wide">Update Status Pengaduan</h2>
              <button
                onClick={() => setShowResolve(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2">
                <p className="font-bold text-slate-900 text-sm">{showResolve.pelanggan.nama}</p>
                <p className="text-slate-600 font-normal leading-relaxed">{showResolve.deskripsi}</p>
                {showResolve.foto && (
                  <div className="mt-2">
                    <img
                      src={showResolve.foto}
                      alt="Dokumentasi komplain"
                      className="w-full max-h-48 object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Penyelesaian</label>
                <select
                  value={formResolve.status}
                  onChange={(e) => setFormResolve({ ...formResolve, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900"
                >
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggapan / Catatan Penyelesaian</label>
                <textarea
                  value={formResolve.tanggapan}
                  onChange={(e) => setFormResolve({ ...formResolve, tanggapan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  rows={3}
                  placeholder="Berikan tanggapan untuk warga atau catatan armada..."
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowResolve(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
