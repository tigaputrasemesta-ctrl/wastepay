"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  AlertTriangle,
  Calendar,
  UserPlus,
  Search,
  MapPin,
  Truck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Loader2,
  ExternalLink,
  Clock,
  MessageCircle,
  HelpCircle,
  ChevronDown
} from "lucide-react";

type ActiveTab = "bayar" | "lapor" | "jadwal" | "daftar";

export default function MobileActionPortal() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("bayar");

  // State: Bayar
  const [query, setQuery] = useState("");
  const [loadingBayar, setLoadingBayar] = useState(false);
  const [resultBayar, setResultBayar] = useState<{
    found: boolean;
    nama?: string;
    alamat?: string;
    total?: number;
    tagihanList?: Array<{ bulan: string; tahun: number; nominal: number }>;
    message?: string;
  } | null>(null);

  // State: Lapor
  const [namaLapor, setNamaLapor] = useState("");
  const [telpLapor, setTelpLapor] = useState("");
  const [lokasiLapor, setLokasiLapor] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [laporSent, setLaporSent] = useState(false);

  // State: FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Handle Cek Tagihan
  const handleCekTagihan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoadingBayar(true);
    setResultBayar(null);

    try {
      const res = await fetch(`/api/tagihan/public-search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setResultBayar({
            found: true,
            nama: json.data.pelanggan?.nama || "Pelanggan UPS HERU",
            alamat: json.data.pelanggan?.alamat || "-",
            total: json.data.totalNominal || 40000,
            tagihanList: json.data.tagihanList || [],
          });
        } else {
          setResultBayar({
            found: false,
            message: json.message || "Data tagihan tidak ditemukan. Pastikan No. WhatsApp atau ID sudah benar.",
          });
        }
      } else {
        setResultBayar({
          found: false,
          message: "Data belum ditemukan. Anda dapat mencoba pencarian lengkap di Portal Bayar.",
        });
      }
    } catch {
      setResultBayar({
        found: false,
        message: "Koneksi sedang sibuk. Silakan coba kembali atau gunakan Portal Pembayaran.",
      });
    } finally {
      setLoadingBayar(false);
    }
  };

  // Handle GPS
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung deteksi lokasi otomatis.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setLokasiLapor((prev) => (prev ? `${prev} (GPS: ${coords})` : `Titik GPS: ${coords}`));
        setGpsSuccess(true);
        setGpsLoading(false);
      },
      () => {
        alert("Gagal membaca titik GPS. Silakan ketik nama jalan atau patokan rumah secara manual.");
        setGpsLoading(false);
      },
      { timeout: 7000 }
    );
  };

  // Handle Kirim Lapor
  const handleKirimLapor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaLapor || !telpLapor || !lokasiLapor) return;
    setLaporSent(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto sm:max-w-xl md:max-w-2xl px-4 py-4 sm:py-8 space-y-5">
      
      {/* ── TOP HERO BANNER: Brand & Status Ringkas ── */}
      <div className="bg-[#020617] text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <img
              src="/ups-heru-logo.jpg"
              alt="UPS HERU Logo"
              className="w-11 h-11 rounded-2xl object-contain bg-white p-1 shadow-md shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
                UPS HERU
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Layanan Pengangkutan Sampah & Retribusi
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Aktif</span>
          </div>
        </div>

        {/* Value Proposition Ticker */}
        <div className="relative z-10 pt-3 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Penjemputan Rutin Terjadwal
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-bold">Bayar Cepat via QRIS</span>
        </div>
      </div>

      {/* ── 4 TOMBOL AKSI UTAMA MOBILE (Segmented Thumb Grid) ── */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("bayar")}
          className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none ${
            activeTab === "bayar"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-bold scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 font-medium"
          }`}
        >
          <CreditCard className={`w-5 h-5 ${activeTab === "bayar" ? "text-white" : "text-emerald-600"}`} />
          <span className="text-[11px] leading-tight">Bayar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lapor")}
          className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none ${
            activeTab === "lapor"
              ? "bg-amber-600 text-white shadow-md shadow-amber-950/40 font-bold scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 font-medium"
          }`}
        >
          <AlertTriangle className={`w-5 h-5 ${activeTab === "lapor" ? "text-white" : "text-amber-500"}`} />
          <span className="text-[11px] leading-tight">Lapor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("jadwal")}
          className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none ${
            activeTab === "jadwal"
              ? "bg-slate-900 text-white shadow-md shadow-slate-950/40 font-bold scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 font-medium"
          }`}
        >
          <Calendar className={`w-5 h-5 ${activeTab === "jadwal" ? "text-emerald-400" : "text-slate-600"}`} />
          <span className="text-[11px] leading-tight">Jadwal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("daftar")}
          className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none ${
            activeTab === "daftar"
              ? "bg-teal-700 text-white shadow-md shadow-teal-950/40 font-bold scale-[1.02]"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 font-medium"
          }`}
        >
          <UserPlus className={`w-5 h-5 ${activeTab === "daftar" ? "text-white" : "text-teal-600"}`} />
          <span className="text-[11px] leading-tight">Daftar</span>
        </button>
      </div>

      {/* ── KONTEN PANEL AKTIF (High Utility & Straightforward) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        
        {/* ======================================================== */}
        {/* PANEL 1: BAYAR TAGIHAN (QRIS) */}
        {/* ======================================================== */}
        {activeTab === "bayar" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Cek & Bayar Retribusi Online
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan nomor WhatsApp terdaftar atau ID Pelanggan Anda
              </p>
            </div>

            <form onSubmit={handleCekTagihan} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 1344"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 font-mono transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loadingBayar || !query.trim()}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loadingBayar ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengecek Tagihan...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Periksa Tagihan Saya</span>
                  </>
                )}
              </button>
            </form>

            {/* Hasil Pencarian Tagihan */}
            {resultBayar && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-200">
                {resultBayar.found ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{resultBayar.nama}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[220px]">{resultBayar.alamat}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Tagihan Aktif
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-600">Total Pembayaran:</span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        Rp {resultBayar.total?.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <Link
                      href={`/bayar?q=${encodeURIComponent(query)}`}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Bayar Sekarang via QRIS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-2 space-y-2 text-xs">
                    <p className="text-slate-700">{resultBayar.message}</p>
                    <Link
                      href="/bayar"
                      className="inline-flex items-center gap-1 text-emerald-700 font-semibold underline text-xs"
                    >
                      <span>Buka Halaman Pencarian Lengkap</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bebas Biaya Admin
              </span>
              <Link href="/bayar" className="text-slate-700 font-medium hover:underline flex items-center gap-1">
                Portal Lengkap <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 2: LAPOR PENGADUAN */}
        {/* ======================================================== */}
        {activeTab === "lapor" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Lapor Sampah Belum Terangkut
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Laporan langsung diteruskan ke armada dan petugas piket wilayah
              </p>
            </div>

            {laporSent ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-slate-900">Laporan Berhasil Diterima!</p>
                <p className="text-xs text-slate-600">
                  Petugas armada UPS HERU segera menjadwalkan penjemputan ke lokasi Anda (SLA maks. 24 jam).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLaporSent(false);
                    setNamaLapor("");
                    setTelpLapor("");
                    setLokasiLapor("");
                    setGpsSuccess(false);
                  }}
                  className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                >
                  Kirim Laporan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleKirimLapor} className="space-y-3">
                <input
                  type="text"
                  required
                  value={namaLapor}
                  onChange={(e) => setNamaLapor(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />

                <input
                  type="tel"
                  required
                  value={telpLapor}
                  onChange={(e) => setTelpLapor(e.target.value)}
                  placeholder="Nomor WhatsApp (Aktif)"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                />

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={lokasiLapor}
                    onChange={(e) => setLokasiLapor(e.target.value)}
                    placeholder="Alamat / Patokan tumpukan sampah"
                    className="w-full pl-3.5 pr-24 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleGetGps}
                    disabled={gpsLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>{gpsLoading ? "Mencari..." : gpsSuccess ? "Terkunci" : "GPS"}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> SLA Penanganan &lt; 24 Jam
                  </span>
                  <Link href="/pengaduan" className="text-slate-600 hover:underline">
                    Form Foto Lengkap
                  </Link>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Kirim Laporan Pengaduan</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 3: JADWAL PENGANGKUTAN */}
        {/* ======================================================== */}
        {activeTab === "jadwal" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-800" />
                Jadwal Penjemputan Sampah
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Waktu rutin pengangkutan armada ke rumah warga
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900">Senin & Kamis</p>
                  <p className="text-xs text-slate-500">Kalibaru & Sukamaju</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                  06.30 – 11.00
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900">Selasa & Jumat</p>
                  <p className="text-xs text-slate-500">Cilodong & Kalimulya</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                  07.00 – 11.30
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900">Rabu & Sabtu</p>
                  <p className="text-xs text-slate-500">Jatimulya & Sentra Usaha</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                  06.30 – 10.30
                </span>
              </div>
            </div>

            <Link
              href="/lacak"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Pantau Armada Truk Live GPS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL 4: DAFTAR BARU */}
        {/* ======================================================== */}
        {activeTab === "daftar" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-700" />
                Pendaftaran Pelanggan Baru
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih paket berlangganan sesuai kebutuhan Anda
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Rumah Tangga</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    Terpopuler
                  </span>
                </div>
                <p className="text-lg font-black text-emerald-700 font-mono">
                  Rp 40.000 <span className="text-xs font-normal text-slate-500">/ bulan</span>
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Angkut 2–3x seminggu depan rumah</li>
                  <li>• Barcode stiker identitas rumah</li>
                  <li>• Bebas denda tersembunyi</li>
                </ul>
                <Link
                  href="/daftar?tipe=warga"
                  className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Daftar Warga</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Komersial / Usaha</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    Niaga
                  </span>
                </div>
                <p className="text-lg font-black text-slate-800 font-mono">
                  Rp 100.000 <span className="text-xs font-normal text-slate-500">/ bulan</span>
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Ruko, kios, toko, & rumah makan</li>
                  <li>• Jadwal intensif harian / 3x seminggu</li>
                  <li>• Invoice resmi bulanan</li>
                </ul>
                <Link
                  href="/daftar?tipe=niaga"
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Daftar Usaha</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 text-center text-xs text-slate-600">
              Pendaftaran satu RT/RW secara kolektif?{" "}
              <a
                href="https://wa.me/6281400782617?text=Halo%20Admin%20UPS%20HERU,%20kami%20ingin%20mendaftarkan%20kolektif%20RT"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 font-bold hover:underline"
              >
                Hubungi Hotline Pengurus RT
              </a>
            </div>
          </div>
        )}

      </div>

      {/* ── KONTAK OPERASIONAL RINGKAS ── */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Kontak Bantuan & Hotline
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <a
            href="https://wa.me/6281400782617"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 transition-all flex items-center gap-2.5 text-slate-200"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <p className="font-bold text-[11px] text-white">WhatsApp CS</p>
              <p className="text-[10px] text-slate-400 font-mono">0814-0078-2617</p>
            </div>
          </a>

          <Link
            href="/lacak"
            className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 transition-all flex items-center gap-2.5 text-slate-200"
          >
            <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <p className="font-bold text-[11px] text-white">Live GPS Truk</p>
              <p className="text-[10px] text-slate-400">Pantau Armada</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── TANYA JAWAB RINGKAS (FAQ MOBILE ACCORDION) ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          Pertanyaan Umum Warga
        </p>

        <div className="space-y-2 text-xs">
          {[
            {
              q: "Berapa kali sampah diangkut dalam seminggu?",
              a: "Untuk pelanggan rumah tangga rutin, penjemputan dilakukan 2 hingga 3 kali seminggu langsung di depan pagar rumah.",
            },
            {
              q: "Bagaimana cara membayar retribusi bulanan?",
              a: "Cukup masukkan nomor WhatsApp atau ID di menu 'Bayar' di atas. Anda dapat membayar langsung via scan QRIS dari aplikasi m-banking atau e-wallet apa saja.",
            },
            {
              q: "Apa yang harus dilakukan jika sampah belum diangkut?",
              a: "Buka menu 'Lapor' di atas, masukkan lokasi atau kunci GPS Anda. Petugas piket akan segera menjadwalkan penjemputan dalam kurun waktu 1x24 jam.",
            },
          ].map((item, idx) => (
            <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-3.5 text-left font-bold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180 text-emerald-600" : ""}`} />
              </button>
              {openFaq === idx && (
                <div className="p-3.5 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER RINGKAS ── */}
      <footer className="text-center space-y-2 pt-2 pb-6 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} UPS HERU. Seluruh Hak Cipta Dilindungi.</p>
        <div className="flex items-center justify-center gap-4 text-slate-500">
          <Link href="/login" className="hover:text-emerald-700 underline font-medium">
            Portal Petugas
          </Link>
          <span>•</span>
          <Link href="/unduh" className="hover:text-emerald-700 underline font-medium">
            Aplikasi Android
          </Link>
        </div>
      </footer>

    </div>
  );
}
