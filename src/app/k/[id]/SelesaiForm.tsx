"use client";

import { useState } from "react";
import {
  CheckCircle,
  Truck,
  MapPin,
  Phone,
  MessageSquare,
  Camera,
  ExternalLink,
  AlertCircle,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type PelangganData = {
  id: number;
  nama: string;
  alamat: string;
  noTelepon?: string | null;
  kodePelanggan?: string | null;
  patokanLokasi?: string | null;
  rtRw?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  kelurahan?: { nama: string } | null;
  wilayah?: { nama: string; zona?: { nama: string } | null } | null;
};

type KomplainData = {
  id: number;
  jenis: string;
  deskripsi: string;
  status: string;
  tanggapan?: string | null;
  foto?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  pelanggan: PelangganData;
};

const CHIP_CATATAN = [
  "Sampah sudah bersih terangkut",
  "Tong sampah sudah kosong",
  "Area tempat sampah sudah rapi",
  "Dijemput armada lapangan",
];

export default function SelesaiForm({
  komplain,
  token,
}: {
  komplain: KomplainData;
  token: string;
}) {
  const [status, setStatus] = useState<string>(komplain.status);
  const [tanggapan, setTanggapan] = useState<string>(komplain.tanggapan || "");
  const [catatan, setCatatan] = useState<string>("");
  const [fotoBukti, setFotoBukti] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [showCatatanOpsional, setShowCatatanOpsional] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notifWargaSent, setNotifWargaSent] = useState<boolean>(false);

  const isSudahSelesai = status === "selesai";

  // Google Maps URL
  let mapsUrl = "";
  if (komplain.pelanggan.latitude && komplain.pelanggan.longitude) {
    mapsUrl = `https://www.google.com/maps?q=${komplain.pelanggan.latitude},${komplain.pelanggan.longitude}`;
  } else if (komplain.pelanggan.alamat) {
    const q = `${komplain.pelanggan.alamat}${komplain.pelanggan.kelurahan ? `, ${komplain.pelanggan.kelurahan.nama}` : ""}`;
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  // Kontak Warga
  const cleanPhone = (komplain.pelanggan.noTelepon || "").replace(/\D/g, "");
  const waPhone = cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Ukuran foto maksimal 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFotoBukti(base64);
      setFotoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelesaikan = async () => {
    if (loading || isSudahSelesai) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(100);
      }

      const res = await fetch("/api/publik/pengaduan/selesai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: komplain.id,
          token,
          catatan: catatan.trim() || undefined,
          fotoBukti: fotoBukti || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyelesaikan pengaduan.");
      }

      setStatus("selesai");
      setTanggapan(data.komplain?.tanggapan || catatan.trim() || "Sampah selesai dijemput armada.");
      setNotifWargaSent(data.notifWargaTerkirim ?? true);

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([100, 50, 100]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                #KMP-{komplain.id}
              </span>
              <h1 className="text-lg font-extrabold text-slate-900 mt-1">
                Tugas Penjemputan Sampah
              </h1>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              isSudahSelesai
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSudahSelesai ? "bg-emerald-600" : "bg-amber-600 animate-pulse"
              }`}
            />
            {isSudahSelesai ? "Selesai" : "Perlu Diangkut"}
          </span>
        </div>
      </div>

      {/* SUCCESS BANNER IF COMPLETED */}
      {isSudahSelesai ? (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-500/20 text-center space-y-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto text-white shadow-inner animate-bounce">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Tugas Selesai
            </span>
            <h2 className="text-2xl font-black">Sampah Berhasil Dijemput!</h2>
            <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
              Laporan telah tercatat selesai di sistem operasional.
              {notifWargaSent && (
                <span className="block mt-1 font-semibold text-white">
                  📱 Notifikasi WhatsApp resmi telah otomatis dikirimkan ke warga pelapor.
                </span>
              )}
            </p>
          </div>

          {tanggapan && (
            <div className="bg-white/10 rounded-2xl p-4 text-xs text-emerald-50 text-left border border-white/20">
              <span className="font-bold block text-white mb-1">Catatan Penanganan:</span>
              &ldquo;{tanggapan}&rdquo;
            </div>
          )}

          <div className="text-xs text-emerald-200 pt-2">
            Terima kasih atas kerja keras rekan-rekan armada di lapangan! Tetap semangat dan utamakan keselamatan kerja. 🙏🚛
          </div>
        </div>
      ) : (
        /* BIG 1-CLICK ACTION CARD */
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-emerald-500/80 space-y-4">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Aksi Cepat Driver Lapangan
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Sudah selesai angkut sampah di lokasi?
            </h2>
            <p className="text-xs text-slate-500">
              Cukup tekan tombol hijau di bawah, status pengaduan langsung tuntas dan warga otomatis mendapat WA.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Optional Catatan & Foto Toggle */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/60">
            <button
              type="button"
              onClick={() => setShowCatatanOpsional(!showCatatanOpsional)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-500" />
                Tambah Foto Bukti / Catatan (Opsional)
              </span>
              {showCatatanOpsional ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showCatatanOpsional && (
              <div className="p-3.5 pt-0 space-y-3 border-t border-slate-200/60 bg-white">
                {/* Chip Catatan Cepat */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">
                    Pilih Cepat Catatan:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CHIP_CATATAN.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCatatan(chip)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                          catatan === chip
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Catatan */}
                <div>
                  <textarea
                    rows={2}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Tulis catatan jika ada..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Upload Foto Kamera */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">
                    Foto Bukti Sampah Terangkut:
                  </label>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 cursor-pointer bg-slate-50 text-slate-600 text-xs font-semibold transition-all">
                    <Camera className="w-5 h-5 text-emerald-600" />
                    <span>{fotoPreview ? "Ganti Foto Kamera" : "Ambil Foto Lewat Kamera"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {fotoPreview && (
                    <div className="mt-2 relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-black">
                      <img
                        src={fotoPreview}
                        alt="Preview Foto Bukti"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoBukti(null);
                          setFotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-md font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* THE BIG GREEN BUTTON */}
          <button
            type="button"
            onClick={handleSelesaikan}
            disabled={loading}
            className="w-full min-h-[64px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan & Mengabari Warga...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-center">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <span>✅ SAMPAH SUDAH DIANGKUT</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* INFORMASI PELANGGAN & DETAIL LOKASI */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Detail Lokasi & Pelanggan
        </h3>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-extrabold text-slate-900">
                {komplain.pelanggan.nama}
              </div>
              <div className="text-xs text-slate-500">
                Kode: {komplain.pelanggan.kodePelanggan || "-"}
                {komplain.pelanggan.rtRw && ` • RT/RW ${komplain.pelanggan.rtRw}`}
              </div>
            </div>

            {komplain.pelanggan.noTelepon && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${komplain.pelanggan.noTelepon}`}
                  className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200"
                  title="Telepon Warga"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200"
                  title="Chat WhatsApp Warga"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">
                  {komplain.pelanggan.alamat}
                </span>
                {komplain.pelanggan.patokanLokasi && (
                  <p className="text-slate-500 mt-0.5">
                    🧭 Patokan: <span className="font-semibold text-slate-700">{komplain.pelanggan.patokanLokasi}</span>
                  </p>
                )}
                {komplain.pelanggan.wilayah?.nama && (
                  <p className="text-slate-500">
                    Wilayah: {komplain.pelanggan.wilayah.nama}
                  </p>
                )}
              </div>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 pt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Navigasi di Google Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL KELUHAN WARGA */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Isi Laporan Keluhan
        </h3>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[11px] font-bold">
            {komplain.jenis === "tidak_diangkut"
              ? "Sampah Tidak Diangkut"
              : komplain.jenis === "sampah_menumpuk"
              ? "Sampah Menumpuk"
              : "Kendala Pengangkutan"}
          </div>
          <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
            &ldquo;{komplain.deskripsi}&rdquo;
          </p>
        </div>

        {komplain.foto && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500">
              Foto yang Dilampirkan Warga:
            </span>
            <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={komplain.foto}
                alt="Foto Keluhan"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="text-center py-4 text-xs text-slate-400">
        UPS HERU Sistem Operasional Kebersihan Kota Depok
      </div>
    </div>
  );
}
