"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  X, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  AlertTriangle, 
  Truck, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Zona = { id: number; nama: string; warna?: string | null; kelurahanId: number };
type Wilayah = { id: number; nama: string; rt?: string | null; rw?: string | null; kelurahanId?: number | null; zonaId?: number | null };
type Rute = { id: number; nama: string; hari: string; kelurahanId?: number | null; zonaId?: number | null };
type Paket = { id: number; nama: string; harga: number | null };

export type ApprovalPelangganTarget = {
  id: number;
  nama: string;
  noTelepon: string;
  kategori?: string;
  alamat: string;
  rtRw?: string | null;
  patokanLokasi?: string | null;
  fotoRumah?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  koordinatSumber?: string | null;
  koordinatAkurasi?: number | null;
  penanggungjawab?: string | null;
  referal?: string | null;
  catatan?: string | null;
  customTarif?: number | null;
  status: string;
  kelurahanId?: number | null;
  wilayahId?: number | null;
  paketId?: number | null;
  kelurahan?: { id: number; nama: string; kecamatan?: string | null } | null;
  wilayah?: { id: number; nama: string; zonaId?: number | null; zona?: { id: number; nama: string } | null } | null;
  paket?: { id: number; nama: string; harga: number | null } | null;
};

type Props = {
  pelanggan: ApprovalPelangganTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
};

const KATEGORI_OPTIONS = [
  { value: "level_1", label: "🏠 Level 1 — Rumah Tangga Kecil" },
  { value: "level_2", label: "🏘️ Level 2 — Rumah Tangga Sedang" },
  { value: "level_3", label: "🏪 Level 3 — Usaha Kecil / Kios" },
  { value: "level_4", label: "🏢 Level 4 — Ruko / Kantor Sedang" },
  { value: "level_5", label: "🏨 Level 5 — Resto / Kafe / Hotel" },
  { value: "level_6", label: "🏭 Level 6 — Industri / Pabrik" },
];

export default function ModalApprovalPelanggan({
  pelanggan,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: Props) {
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [ruteList, setRuteList] = useState<Rute[]>([]);
  const [paketList, setPaketList] = useState<Paket[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Form states
  const [selectedKelurahan, setSelectedKelurahan] = useState("");
  const [selectedZona, setSelectedZona] = useState("");
  const [selectedWilayah, setSelectedWilayah] = useState("");
  const [selectedRute, setSelectedRute] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("level_1");
  const [selectedPaket, setSelectedPaket] = useState("");
  const [customTarif, setCustomTarif] = useState("");

  // Load auxiliary data
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadResources() {
      setLoadingData(true);
      try {
        const [kelRes, zonaRes, wilRes, ruteRes, pakRes] = await Promise.all([
          fetch("/api/kelurahan"),
          fetch("/api/zona"),
          fetch("/api/wilayah"),
          fetch("/api/rute"),
          fetch("/api/paket"),
        ]);
        if (cancelled) return;
        setKelurahanList(await kelRes.json());
        setZonaList(await zonaRes.json());
        setWilayahList(await wilRes.json());
        setRuteList(await ruteRes.json());
        setPaketList(await pakRes.json());
      } catch (err) {
        console.error("Gagal memuat master data approval:", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadResources();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Sync initial form values from pelanggan
  useEffect(() => {
    if (!pelanggan) return;

    const initialKelId = pelanggan.kelurahan?.id
      ? pelanggan.kelurahan.id.toString()
      : pelanggan.kelurahanId
      ? pelanggan.kelurahanId.toString()
      : "";

    const initialWilId = pelanggan.wilayah?.id
      ? pelanggan.wilayah.id.toString()
      : pelanggan.wilayahId
      ? pelanggan.wilayahId.toString()
      : "";

    const initialZonaId = pelanggan.wilayah?.zonaId
      ? pelanggan.wilayah.zonaId.toString()
      : pelanggan.wilayah?.zona?.id
      ? pelanggan.wilayah.zona.id.toString()
      : "";

    const initialPaketId = pelanggan.paket?.id
      ? pelanggan.paket.id.toString()
      : pelanggan.paketId
      ? pelanggan.paketId.toString()
      : "";

    setSelectedKelurahan(initialKelId);
    setSelectedZona(initialZonaId);
    setSelectedWilayah(initialWilId);
    setSelectedRute("");
    setSelectedKategori(pelanggan.kategori || "level_1");
    setSelectedPaket(initialPaketId);
    setCustomTarif(pelanggan.customTarif ? pelanggan.customTarif.toString() : "");
  }, [pelanggan]);

  // Filter options based on selected Kelurahan
  const availableZonas = zonaList.filter(
    (z) => !selectedKelurahan || z.kelurahanId === parseInt(selectedKelurahan)
  );
  const availableWilayahs = wilayahList.filter(
    (w) => !selectedKelurahan || w.kelurahanId === parseInt(selectedKelurahan)
  );
  const availableRutes = ruteList.filter((r) => {
    if (selectedZona && r.zonaId) return r.zonaId === parseInt(selectedZona);
    if (selectedKelurahan && r.kelurahanId) return r.kelurahanId === parseInt(selectedKelurahan);
    return true;
  });

  const handleApprove = async () => {
    if (!pelanggan) return;

    if (!selectedKelurahan) {
      showToast("Kelurahan wajib dipilih", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: "aktif",
        kelurahanId: selectedKelurahan ? parseInt(selectedKelurahan) : null,
        zonaId: selectedZona ? parseInt(selectedZona) : null,
        wilayahId: selectedWilayah ? parseInt(selectedWilayah) : null,
        ruteId: selectedRute ? parseInt(selectedRute) : null,
        kategori: selectedKategori,
        paketId: selectedPaket ? parseInt(selectedPaket) : null,
        customTarif: customTarif ? parseFloat(customTarif) : null,
      };

      const res = await fetch(`/api/pelanggan/${pelanggan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const zonaNama = availableZonas.find((z) => z.id.toString() === selectedZona)?.nama;
        showToast(
          `${pelanggan.nama} berhasil diapprove & diaktifkan${zonaNama ? ` di ${zonaNama}` : ""}!`,
          "success"
        );
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || "Gagal menyetujui pelanggan", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!pelanggan) return;
    if (!confirm(`Yakin ingin menolak dan menghapus pendaftaran ${pelanggan.nama}?`)) return;

    setRejecting(true);
    try {
      const res = await fetch(`/api/pelanggan/${pelanggan.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Pendaftaran ${pelanggan.nama} telah ditolak & dihapus.`);
        onSuccess();
        onClose();
      } else {
        showToast("Gagal menolak pendaftaran", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setRejecting(false);
    }
  };

  if (!isOpen || !pelanggan) return null;

  const hasPhoto = Boolean(pelanggan.fotoRumah);
  const hasGps = Boolean(pelanggan.latitude && pelanggan.longitude);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600/10 text-emerald-700 border border-emerald-600/20 flex items-center justify-center text-base font-black">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Approval &amp; Penentuan Zona Pickup
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Persetujuan Admin Pusat sebelum layanan &amp; penagihan diaktifkan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Ringkasan Pendaftar & Referral */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Warga / Calon Pelanggan
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{pelanggan.nama}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                  <a
                    href={`https://wa.me/${pelanggan.noTelepon.replace(/^0/, "62")}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{pelanggan.noTelepon}</span>
                  </a>
                  <span>•</span>
                  <span>{pelanggan.alamat}</span>
                  {pelanggan.rtRw && <span>(RT/RW: {pelanggan.rtRw})</span>}
                </div>
              </div>

              {/* Badge Referral */}
              <div className="shrink-0">
                {pelanggan.referal ? (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                    <span>🤝</span>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider block text-emerald-600">
                        Referral / Petugas
                      </span>
                      <span>{pelanggan.referal}</span>
                    </div>
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-medium">
                    Tanpa Referral (Mandiri)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Hasil Survei Lapangan */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span>
                <span>Hasil Cek Survei Lapangan</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    hasPhoto && hasGps
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {hasPhoto && hasGps ? "✓ Survei Lengkap" : "⏳ Menunggu Lengkap"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Foto Rumah */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Foto Rumah Pendaftar:
                </span>
                {pelanggan.fotoRumah ? (
                  <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <Image
                      src={pelanggan.fotoRumah}
                      alt={pelanggan.nama}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-28 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center text-center p-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="text-xs font-semibold text-amber-800">Foto Belum Diambil</span>
                    <span className="text-[10px] text-amber-600">Survei petugas belum upload foto</span>
                  </div>
                )}
              </div>

              {/* Titik GPS & Koordinat */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Koordinat Lokasi (GPS):
                  </span>
                  {hasGps ? (
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-bold text-slate-800">
                        {pelanggan.latitude?.toFixed(6)}, {pelanggan.longitude?.toFixed(6)}
                      </p>
                      {pelanggan.koordinatAkurasi && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Akurasi GPS: ± {Math.round(pelanggan.koordinatAkurasi)} meter
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${pelanggan.latitude},${pelanggan.longitude}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline font-semibold mt-1"
                      >
                        <span>Buka Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <MapPin className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-amber-800 block">
                        Titik Belum Ditandai
                      </span>
                      <span className="text-[10px] text-amber-600">
                        Koordinat GPS belum dimasukkan petugas
                      </span>
                    </div>
                  )}
                </div>

                {pelanggan.catatan && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                    <strong>Catatan:</strong> {pelanggan.catatan}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Konfigurasi Admin Pusat */}
          <div className="p-4 rounded-2xl border-2 border-emerald-600/20 bg-emerald-50/20 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-black">
                ⚙️
              </span>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Pengaturan Operasional oleh Admin Pusat
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Kelurahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelurahan *
                </label>
                <select
                  value={selectedKelurahan}
                  onChange={(e) => {
                    setSelectedKelurahan(e.target.value);
                    setSelectedZona("");
                    setSelectedWilayah("");
                    setSelectedRute("");
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih Kelurahan</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} {k.kecamatan ? `· ${k.kecamatan}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zona Area Pickup */}
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                  <span>📍 Zona Area Pickup *</span>
                  <span className="text-[10px] text-emerald-600 font-normal">(Wajib)</span>
                </label>
                <select
                  value={selectedZona}
                  onChange={(e) => setSelectedZona(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-emerald-500 rounded-xl text-xs font-bold bg-white text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                >
                  <option value="">— Pilih Zona Angkut Pelanggan —</option>
                  {availableZonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nama}
                    </option>
                  ))}
                </select>
                {availableZonas.length === 0 && selectedKelurahan && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Kelurahan ini belum memiliki zona. Atur di menu Zona Angkut.
                  </p>
                )}
              </div>

              {/* Wilayah / RT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wilayah / RT (Opsional)
                </label>
                <select
                  value={selectedWilayah}
                  onChange={(e) => setSelectedWilayah(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Hubungkan ke RT Wilayah —</option>
                  {availableWilayahs.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama} {w.rt ? `(RT ${w.rt})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rute Armada Penjemputan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-slate-500" />
                  <span>Jadwalkan ke Rute Armada</span>
                </label>
                <select
                  value={selectedRute}
                  onChange={(e) => setSelectedRute(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Hubungkan ke Rute Armada —</option>
                  {availableRutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} ({r.hari})
                    </option>
                  ))}
                </select>
              </div>

              {/* Kategori Tarif */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Pelanggan
                </label>
                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {KATEGORI_OPTIONS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paket Layanan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paket Layanan
                </label>
                <select
                  value={selectedPaket}
                  onChange={(e) => setSelectedPaket(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Default Kategori</option>
                  {paketList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} {p.harga ? `· ${formatRupiah(p.harga)}/bln` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReject}
            disabled={rejecting || submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{rejecting ? "Menolak…" : "Tolak Pendaftaran"}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting || rejecting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? "Memproses Approval…" : "✓ Setujui & Aktifkan Layanan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
