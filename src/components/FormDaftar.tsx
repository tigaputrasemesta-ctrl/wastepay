"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Phone,
  Check,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Home,
  Camera,
  ImageIcon,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import { kompresGambar, ekstrakGpsFoto } from "@/lib/foto";

const PetaLokasi = dynamic(() => import("@/components/PetaLokasi"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-2">
      <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
      <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Memuat peta satelit & rute…</p>
    </div>
  ),
});

type WilayahKec = { kecamatan: string; kelurahan: string[] };
type Paket = { id: number; nama: string; harga: number; deskripsi: string | null };
type KategoriTarif = { kategori: string; label: string; tarif: number; deskripsi: string | null };
type Zona = { id: number; nama: string; kelurahan?: { nama: string } };
type Petugas = { id: number; nama: string };
type Rute = { id: number; nama: string };

const STEPS = [
  { id: 1, label: "Kontak", desc: "Data Diri" },
  { id: 2, label: "Paket", desc: "Tipe Retribusi" },
  { id: 3, label: "Alamat", desc: "Titik Jemput" },
  { id: 4, label: "Validasi", desc: "Foto & Lokasi" },
];

export default function FormDaftar({
  initialReferal = "",
  isPetugas = false,
}: {
  initialReferal?: string;
  isPetugas?: boolean;
}) {
  // Step state for guided wizard (public mode)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [nama, setNama] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [kategori, setKategori] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const [patokanLokasi, setPatokanLokasi] = useState("");
  const [jenisLayanan, setJenisLayanan] = useState<"kategori" | "paket">("kategori");
  const [paketId, setPaketId] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [petugasId, setPetugasId] = useState("");
  const [ruteId, setRuteId] = useState("");
  const [tanggalPenagihanCustom, setTanggalPenagihanCustom] = useState("");
  const [jadwalHari, setJadwalHari] = useState<string[]>([]);
  const [penanggungjawab] = useState("");
  const [referal, setReferal] = useState(initialReferal);
  const [referalFromUrl, setReferalFromUrl] = useState(Boolean(initialReferal));
  const [website, setWebsite] = useState("");
  const [customTarif, setCustomTarif] = useState("");

  // WhatsApp verification state
  const [cekWaLoading, setCekWaLoading] = useState(false);
  const [cekWaPesan, setCekWaPesan] = useState<{ text: string; terdaftar: boolean } | null>(null);

  // GPS & Media state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [koordinatSumber, setKoordinatSumber] = useState<"gps_perangkat" | "manual" | "exif_foto" | "">("");
  const [gpsDenied, setGpsDenied] = useState(false);
  const [fotoRumah, setFotoRumah] = useState("");
  const [fotoLoading, setFotoLoading] = useState(false);
  const [exifNotif, setExifNotif] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const kameraRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);

  // Options fetched from API
  const [opsi, setOpsi] = useState<{
    wilayah: WilayahKec[];
    paket: Paket[];
    kategoriTarif: KategoriTarif[];
    zonas: Zona[];
    petugas: Petugas[];
    rute: Rute[];
  } | null>(null);

  const [status, setStatus] = useState<"idle" | "kirim" | "ok" | "gagal">("idle");
  const [pesan, setPesan] = useState("");
  const [hasil, setHasil] = useState<{ kodePelanggan: string; namaPelanggan: string } | null>(null);

  // Sync Referral from URL query param
  useEffect(() => {
    if (!referal && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const qRef = sp.get("ref") || sp.get("referal");
      if (qRef && qRef.trim()) {
        setReferal(qRef.trim());
        setReferalFromUrl(true);
      }
    }
  }, [referal]);

  // Load registration options
  useEffect(() => {
    fetch("/api/publik/daftar-options")
      .then((r) => r.json())
      .then((d) => {
        setOpsi(d);
        if (d.kategoriTarif && d.kategoriTarif.length > 0) {
          setKategori((prev) => prev || d.kategoriTarif[0].kategori);
        }
      })
      .catch(() => setOpsi({ wilayah: [], paket: [], kategoriTarif: [], zonas: [], petugas: [], rute: [] }));
  }, []);

  const kelurahanList = opsi?.wilayah.find((w) => w.kecamatan === kecamatan)?.kelurahan ?? [];
  const tarifKategori = opsi?.kategoriTarif.find((k) => k.kategori === kategori);
  const zonaList = kelurahan ? (opsi?.zonas ?? []).filter((z) => z.kelurahan?.nama === kelurahan) : [];

  // Debounced auto-check for WhatsApp number
  useEffect(() => {
    setCekWaPesan(null);
    const clean = noTelepon.replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (clean.length >= 10 && (clean.startsWith("08") || clean.startsWith("628"))) {
      const timer = setTimeout(() => {
        handleCekNomor(noTelepon);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [noTelepon]);

  async function handleCekNomor(overrideTelp?: string) {
    const targetTelp = overrideTelp || noTelepon;
    const clean = targetTelp.replace(/[^\d+]/g, "");
    if (!clean || clean.length < 9) {
      setCekWaPesan({ text: "Masukkan nomor telepon minimal 9 digit.", terdaftar: false });
      return false;
    }
    setCekWaLoading(true);
    setCekWaPesan(null);
    try {
      const res = await fetch(`/api/publik/cek-nomor?telp=${encodeURIComponent(targetTelp)}`);
      const data = await res.json();
      if (res.ok) {
        setCekWaPesan({ text: data.pesan, terdaftar: data.terdaftar });
        return !data.terdaftar;
      } else {
        setCekWaPesan({ text: data.error || "Gagal memeriksa nomor.", terdaftar: false });
        return false;
      }
    } catch {
      setCekWaPesan({ text: "Koneksi bermasalah saat mengecek nomor.", terdaftar: false });
      return false;
    } finally {
      setCekWaLoading(false);
    }
  }

  async function getGps() {
    if (!navigator.geolocation) {
      setPesan("Browser Anda tidak mendukung layanan lokasi GPS.");
      return;
    }

    if (navigator.permissions) {
      try {
        const permStatus = await navigator.permissions.query({ name: "geolocation" });
        if (permStatus.state === "denied") {
          setGpsDenied(true);
          setGpsLoading(false);
          setPesan("");
          return;
        }
      } catch {
        // Fallback jika permissions API tidak didukung
      }
    }

    setGpsLoading(true);
    setGpsDenied(false);
    setPesan("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        setKoordinatSumber("gps_perangkat");
        setGpsLoading(false);
        setGpsDenied(false);
        setPesan("");
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsDenied(true);
          setPesan("");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPesan("Sinyal GPS tidak terdeteksi. Pastikan Anda berada di luar ruangan atau aktifkan lokasi di pengaturan HP.");
        } else if (err.code === err.TIMEOUT) {
          setPesan("Waktu habis saat mencari sinyal GPS. Coba lagi atau tentukan pin langsung pada peta.");
        } else {
          setPesan("Gagal mendapatkan lokasi GPS: " + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function handleFoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPesan("File harus berupa gambar (JPG, PNG, atau HEIC).");
      return;
    }
    setFotoLoading(true);
    setPesan("");
    setExifNotif(null);
    try {
      const base64 = await kompresGambar(file);
      setFotoRumah(base64);

      if (!gpsData) {
        const gps = await ekstrakGpsFoto(file);
        if (gps) {
          setGpsData({ lat: gps.latitude, lng: gps.longitude, acc: 0 });
          setKoordinatSumber("exif_foto");
          setExifNotif("Titik lokasi GPS berhasil dideteksi otomatis dari data kamera foto Anda.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses gambar foto.";
      setPesan(msg);
    } finally {
      setFotoLoading(false);
    }
  }

  // Step Validation logic
  function validateCurrentStep(): boolean {
    setPesan("");
    if (currentStep === 1) {
      if (!nama || nama.trim().length < 3) {
        setPesan("Nama lengkap wajib diisi minimal 3 karakter.");
        return false;
      }
      const clean = noTelepon.replace(/[^\d+]/g, "").replace(/^\+/, "");
      if (!clean || clean.length < 9) {
        setPesan("Nomor WhatsApp harus valid minimal 9 digit.");
        return false;
      }
      if (cekWaPesan?.terdaftar) {
        setPesan("Nomor WhatsApp ini sudah terdaftar sebagai pelanggan.");
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (jenisLayanan === "kategori" && !kategori) {
        setPesan("Silakan pilih kategori pelanggan.");
        return false;
      }
      if (jenisLayanan === "paket" && !paketId) {
        setPesan("Silakan pilih paket langganan.");
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (!kecamatan) {
        setPesan("Silakan pilih kecamatan lokasi penjemputan.");
        return false;
      }
      if (!kelurahan) {
        setPesan("Silakan pilih kelurahan lokasi penjemputan.");
        return false;
      }
      if (!alamat || alamat.trim().length < 8) {
        setPesan("Alamat penjemputan wajib diisi dengan jelas (minimal 8 karakter).");
        return false;
      }
      return true;
    }
    return true;
  }

  function handleNext() {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4) as 1 | 2 | 3 | 4);
      setPesan("");
      window.scrollTo({ top: 100, behavior: "smooth" });
    }
  }

  function handlePrev() {
    setPesan("");
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4);
    window.scrollTo({ top: 100, behavior: "smooth" });
  }

  function handleCopy(text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Pastikan validasi nomor WA
    if (!cekWaPesan) {
      const valid = await handleCekNomor();
      if (!valid) {
        setPesan("Silakan selesaikan pengecekan nomor WhatsApp terlebih dahulu.");
        setCurrentStep(1);
        return;
      }
    } else if (cekWaPesan.terdaftar) {
      setPesan("Nomor WhatsApp ini sudah terdaftar. Silakan gunakan nomor lain.");
      setCurrentStep(1);
      return;
    }

    if (!fotoRumah) {
      setPesan("Foto tampak depan rumah wajib diunggah untuk verifikasi rute armada.");
      setCurrentStep(4);
      return;
    }
    if (!gpsData) {
      setPesan("Titik koordinat GPS wajib ditentukan agar armada dapat menjangkau rumah Anda.");
      setCurrentStep(4);
      return;
    }

    setStatus("kirim");
    setPesan("");
    try {
      const res = await fetch("/api/publik/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          noTelepon,
          kategori,
          kecamatan,
          kelurahan,
          alamat,
          rt,
          rw,
          patokanLokasi,
          paketId,
          zonaId,
          petugasId,
          ruteId,
          tanggalPenagihanCustom: tanggalPenagihanCustom || undefined,
          jadwalHari: jadwalHari.length > 0 ? jadwalHari.join(", ") : undefined,
          penanggungjawab,
          referal: referal.trim() || undefined,
          customTarif: customTarif ? customTarif : undefined,
          website,
          fotoRumah: fotoRumah || undefined,
          latitude: gpsData?.lat,
          longitude: gpsData?.lng,
          isPetugas,
          koordinatAkurasi: gpsData?.acc,
          koordinatSumber: gpsData ? koordinatSumber || "gps_perangkat" : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setHasil({ kodePelanggan: data.kodePelanggan, namaPelanggan: data.namaPelanggan });
        setStatus("ok");
        window.scrollTo({ top: 100, behavior: "smooth" });
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "Pendaftaran belum berhasil dikirim. Silakan periksa kembali isian formulir.");
      }
    } catch {
      setStatus("gagal");
      setPesan("Koneksi internet bermasalah. Mohon periksa sinyal Anda dan coba lagi.");
    }
  }

  // ── SUCCESS STATE ──
  if (status === "ok" && hasil) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-emerald-200/90 dark:border-emerald-800/60 p-6 sm:p-10 text-center shadow-lg dark:shadow-none space-y-6 transition-colors animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50 dark:ring-emerald-950/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pendaftaran Berhasil Dikirim</span>
          </span>
          <h3 className="font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Selamat Datang, {hasil.namaPelanggan}!
          </h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Data penjemputan Anda telah masuk ke sistem operasional UPS HERU. Tim survei akan menghubungi WhatsApp Anda untuk konfirmasi jadwal armada.
          </p>
        </div>

        {hasil.kodePelanggan && (
          <div className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl p-5 max-w-md mx-auto text-center space-y-3">
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              ID Pelanggan Resmi (Nomor WhatsApp)
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-wider">
                {hasil.kodePelanggan}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(hasil.kodePelanggan)}
                className="p-2 rounded-xl bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-zinc-200 hover:text-emerald-700 hover:border-emerald-300 transition-all active:scale-95 shadow-xs"
                title="Salin ID Pelanggan"
              >
                {copied ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                ✓ ID Pelanggan berhasil disalin ke clipboard!
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Gunakan nomor ini untuk mengecek tagihan rutin bulanan, memantau posisi truk sampah, atau melakukan konfirmasi pembayaran.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="max-w-md mx-auto pt-2 space-y-3">
          <Link
            href="/bayar"
            className="w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 text-sm sm:text-base transition-all active:scale-[0.98]"
          >
            <span>Cek Status Layanan & Tagihan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={`https://wa.me/6281400782617?text=Halo%20Admin%20UPS%20HERU,%20saya%20baru%20saja%20mendaftar%20dengan%20ID%20${encodeURIComponent(hasil.kodePelanggan || noTelepon)}.%20Mohon%20info%20jadwal%20penjemputan.`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>💬 Hubungi Admin CS</span>
            </a>

            <Link
              href="/"
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Kembali ke Beranda</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM CONTAINER ──
  return (
    <form
      onSubmit={submit}
      className={`bg-white dark:bg-zinc-900 transition-colors shadow-xl shadow-slate-200/50 dark:shadow-none ${
        isPetugas
          ? "p-3 sm:p-4 space-y-3 rounded-2xl border border-slate-200 dark:border-zinc-800"
          : "rounded-[2rem] border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-8 space-y-6"
      }`}
    >
      {/* Header Form */}
      {!isPetugas && (
        <div className="space-y-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                Formulir Pendaftaran Warga
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                Layanan pengangkutan sampah rutin wilayah Kota Depok
              </p>
            </div>
            <span className="self-start sm:self-auto font-bold text-xs tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-full shadow-2xs">
              REG-2026 · Online
            </span>
          </div>

          {/* Stepper Navigation Pills for Public */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
            {STEPS.map((s) => {
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    // Hanya izinkan lompat ke step yang sudah pernah dilewati atau step berikutnya jika valid
                    if (s.id < currentStep) {
                      setCurrentStep(s.id as 1 | 2 | 3 | 4);
                      setPesan("");
                    } else if (s.id === currentStep + 1 && validateCurrentStep()) {
                      setCurrentStep(s.id as 1 | 2 | 3 | 4);
                      setPesan("");
                    }
                  }}
                  className={`text-left p-2 sm:p-2.5 rounded-xl border transition-all text-xs ${
                    isCurrent
                      ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold"
                      : isPassed
                      ? "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-emerald-300"
                      : "bg-slate-50/50 dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isCurrent
                          ? "bg-emerald-700 text-white"
                          : isPassed
                          ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300"
                          : "bg-slate-200 dark:bg-zinc-700 text-slate-500"
                      }`}
                    >
                      {isPassed ? "✓" : s.id}
                    </span>
                    <span className="truncate hidden sm:inline font-bold">{s.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Referral Notification Banner */}
      {referal && !isPetugas && (
        <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0" aria-hidden="true">🤝</span>
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                Kode Referral Aktif
              </span>
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                Direferensikan oleh: <span className="font-extrabold underline underline-offset-2">{referal}</span>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[11px] font-black shrink-0 shadow-xs">
            Terhubung ✓
          </span>
        </div>
      )}

      {/* ── STEP 1: DATA DIRI & KONTAK ── */}
      {(isPetugas || currentStep === 1) && (
        <div className={isPetugas ? "space-y-2" : "space-y-4 animate-in fade-in duration-200"}>
          {!isPetugas && (
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 text-sm sm:text-base">
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black w-6 h-6 text-xs">
                  1
                </span>
                <span>Informasi Kontak & Pemesan</span>
              </h3>
              <span className="text-xs text-slate-400 dark:text-zinc-500">Langkah 1 dari 4</span>
            </div>
          )}

          <div className={`grid ${isPetugas ? "grid-cols-2 gap-2" : "grid-cols-1 gap-4"}`}>
            <div>
              <label
                className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                  isPetugas ? "text-xs mb-0.5" : "text-xs sm:text-sm mb-1.5"
                }`}
                htmlFor="d-nama"
              >
                Nama Lengkap / Tempat Usaha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="d-nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="Contoh: Bpk. Budi Santoso"
                  className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                    isPetugas
                      ? "px-2 py-1.5 text-xs rounded-lg"
                      : "rounded-xl pl-10 pr-4 text-base sm:text-sm py-3 min-h-[46px]"
                  }`}
                  required
                  minLength={3}
                />
                {!isPetugas && (
                  <User className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
            </div>

            <div>
              <label
                className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                  isPetugas ? "text-xs mb-0.5" : "text-xs sm:text-sm mb-1.5"
                }`}
                htmlFor="d-telp"
              >
                Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="d-telp"
                    type="tel"
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="08123456789"
                    className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                      isPetugas
                        ? "px-2 py-1.5 text-xs rounded-lg"
                        : "rounded-xl pl-10 pr-4 text-base sm:text-sm py-3 min-h-[46px]"
                    }`}
                    required
                  />
                  {!isPetugas && (
                    <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCekNomor()}
                  disabled={cekWaLoading || !noTelepon}
                  className={`font-bold transition-all disabled:opacity-50 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                    isPetugas
                      ? "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 px-2 py-1 text-xs"
                      : "bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-xs sm:text-sm rounded-xl min-h-[46px] active:scale-95"
                  }`}
                >
                  {cekWaLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Mengecek...</span>
                    </>
                  ) : (
                    <span>Cek Nomor</span>
                  )}
                </button>
              </div>

              {cekWaPesan && (
                <div
                  className={`text-xs mt-2 p-2.5 rounded-xl border flex items-start gap-2 ${
                    cekWaPesan.terdaftar
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                  }`}
                >
                  {cekWaPesan.terdaftar ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  ) : (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold leading-relaxed">{cekWaPesan.text}</p>
                    {cekWaPesan.terdaftar && (
                      <Link
                        href="/bayar"
                        className="inline-flex items-center gap-1 text-xs font-bold underline mt-1 text-rose-700 dark:text-rose-300 hover:opacity-80"
                      >
                        <span>Cek nomor tagihan / status pelanggan di sini</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {!isPetugas && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  Nomor WhatsApp resmi akan menjadi ID Pelanggan Anda untuk notifikasi jemputan sampah dan pembayaran digital.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: PAKET & LAYANAN ── */}
      {(isPetugas || currentStep === 2) && (
        <div className={isPetugas ? "space-y-2" : "space-y-4 animate-in fade-in duration-200"}>
          {!isPetugas && (
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 text-sm sm:text-base">
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black w-6 h-6 text-xs">
                  2
                </span>
                <span>Pilihan Layanan & Tarif</span>
              </h3>
              <span className="text-xs text-slate-400 dark:text-zinc-500">Langkah 2 dari 4</span>
            </div>
          )}

          <div className="space-y-3">
            <div className={`grid ${isPetugas ? "grid-cols-2 gap-2" : "grid-cols-1 sm:grid-cols-2 gap-3"}`}>
              <label
                className={`flex items-start gap-3 rounded-2xl border cursor-pointer transition-all ${
                  isPetugas ? "p-2" : "p-4 min-h-[56px]"
                } ${
                  jenisLayanan === "kategori"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-600"
                }`}
              >
                <input
                  type="radio"
                  name="jenis_layanan"
                  className="accent-emerald-600 mt-1 w-4 h-4 shrink-0"
                  checked={jenisLayanan === "kategori"}
                  onChange={() => {
                    setJenisLayanan("kategori");
                    setPaketId("");
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="block font-bold text-slate-900 dark:text-white text-sm">
                    Tarif Standar
                  </span>
                  {!isPetugas && (
                    <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Sesuai kategori rumah tangga atau tempat usaha
                    </span>
                  )}
                </div>
              </label>

              {(opsi?.paket ?? []).length > 0 && (
                <label
                  className={`flex items-start gap-3 rounded-2xl border cursor-pointer transition-all ${
                    isPetugas ? "p-2" : "p-4 min-h-[56px]"
                  } ${
                    jenisLayanan === "paket"
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="jenis_layanan"
                    className="accent-emerald-600 mt-1 w-4 h-4 shrink-0"
                    checked={jenisLayanan === "paket"}
                    onChange={() => setJenisLayanan("paket")}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 dark:text-white text-sm">
                      Paket Langganan
                    </span>
                    {!isPetugas && (
                      <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Pilihan paket iuran khusus atau kapasitas ekstra
                      </span>
                    )}
                  </div>
                </label>
              )}
            </div>

            {jenisLayanan === "kategori" ? (
              <div>
                {!isPetugas && (
                  <label
                    className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5"
                    htmlFor="d-kategori"
                  >
                    Kategori Pelanggan
                  </label>
                )}
                <div className="relative">
                  <select
                    id="d-kategori"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10 text-slate-900 dark:text-zinc-100 ${
                      isPetugas
                        ? "px-2 py-1.5 text-xs rounded-lg"
                        : "rounded-xl px-4 text-base sm:text-sm py-3 min-h-[46px]"
                    }`}
                  >
                    {(opsi?.kategoriTarif ?? []).map((k) => {
                      const label =
                        k.kategori === "level_1" && (!k.label || k.label === "Level 1")
                          ? "Level 1 (Rumah Tangga)"
                          : k.label;
                      const tarifDisplay = k.kategori === "level_1" ? 50000 : k.tarif;
                      return (
                        <option key={k.kategori} value={k.kategori} className="dark:bg-zinc-800">
                          {label} — Rp {tarifDisplay.toLocaleString("id-ID")}/bulan
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {tarifKategori && !isPetugas && (
                  <div className="text-xs font-semibold mt-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between flex-wrap gap-2">
                    <span>
                      Tarif Terpilih: <strong>Rp {(tarifKategori.kategori === "level_1" ? 50000 : tarifKategori.tarif).toLocaleString("id-ID")}/bulan</strong>
                    </span>
                    {tarifKategori.deskripsi && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-normal">
                        ({tarifKategori.deskripsi})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {!isPetugas && (
                  <label
                    className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5"
                    htmlFor="d-paket"
                  >
                    Pilih Paket Langganan
                  </label>
                )}
                <div className="relative">
                  <select
                    id="d-paket"
                    value={paketId}
                    onChange={(e) => setPaketId(e.target.value)}
                    className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10 text-slate-900 dark:text-zinc-100 ${
                      isPetugas
                        ? "px-2 py-1.5 text-xs rounded-lg"
                        : "rounded-xl px-4 text-base sm:text-sm py-3 min-h-[46px]"
                    }`}
                  >
                    <option value="" disabled className="dark:bg-zinc-800">
                      — Pilih Paket —
                    </option>
                    {(opsi?.paket ?? []).map((p) => (
                      <option key={p.id} value={p.id} className="dark:bg-zinc-800">
                        {p.nama} {p.harga ? `- Rp ${p.harga.toLocaleString("id-ID")}/bulan` : "(Tarif Fleksibel)"}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {paketId && !isPetugas && (opsi?.paket ?? []).find((p) => p.id.toString() === paketId)?.deskripsi && (
                  <p className="text-xs font-semibold mt-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 leading-relaxed">
                    Keterangan: {(opsi?.paket ?? []).find((p) => p.id.toString() === paketId)?.deskripsi}
                  </p>
                )}
              </div>
            )}

            {isPetugas && (
              <div className="flex items-center gap-2 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2">
                <label className="font-bold text-slate-700 dark:text-zinc-300 text-xs whitespace-nowrap" htmlFor="d-custom-tarif">
                  Tarif Custom:
                </label>
                <input
                  id="d-custom-tarif"
                  type="number"
                  value={customTarif}
                  onChange={(e) => setCustomTarif(e.target.value)}
                  placeholder="Kosongkan jika standar"
                  className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-slate-900 dark:text-zinc-100 text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: ALAMAT LENGKAP ── */}
      {(isPetugas || currentStep === 3) && (
        <div className={isPetugas ? "space-y-2" : "space-y-4 animate-in fade-in duration-200"}>
          {!isPetugas && (
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 text-sm sm:text-base">
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black w-6 h-6 text-xs">
                  3
                </span>
                <span>Detail Alamat Penjemputan</span>
              </h3>
              <span className="text-xs text-slate-400 dark:text-zinc-500">Langkah 3 dari 4</span>
            </div>
          )}

          <div className="space-y-3">
            <div className={`grid ${isPetugas ? "grid-cols-2 gap-2" : "grid-cols-1 sm:grid-cols-2 gap-3"}`}>
              <div>
                <label
                  className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                    isPetugas ? "text-xs mb-0.5" : "text-xs sm:text-sm mb-1.5"
                  }`}
                  htmlFor="d-kecamatan"
                >
                  Kecamatan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="d-kecamatan"
                    value={kecamatan}
                    onChange={(e) => {
                      setKecamatan(e.target.value);
                      setKelurahan("");
                      setZonaId("");
                    }}
                    className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10 text-slate-900 dark:text-zinc-100 ${
                      isPetugas
                        ? "px-2 py-1.5 text-xs rounded-lg"
                        : "rounded-xl px-4 text-base sm:text-sm py-3 min-h-[46px]"
                    }`}
                    required
                  >
                    <option value="" className="dark:bg-zinc-800">
                      — Pilih Kecamatan —
                    </option>
                    {(opsi?.wilayah ?? []).map((w) => (
                      <option key={w.kecamatan} value={w.kecamatan} className="dark:bg-zinc-800">
                        {w.kecamatan}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                    isPetugas ? "text-xs mb-0.5" : "text-xs sm:text-sm mb-1.5"
                  }`}
                  htmlFor="d-kelurahan"
                >
                  Kelurahan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="d-kelurahan"
                    value={kelurahan}
                    onChange={(e) => {
                      setKelurahan(e.target.value);
                      setZonaId("");
                    }}
                    className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer disabled:opacity-50 pr-10 text-slate-900 dark:text-zinc-100 ${
                      isPetugas
                        ? "px-2 py-1.5 text-xs rounded-lg"
                        : "rounded-xl px-4 text-base sm:text-sm py-3 min-h-[46px]"
                    }`}
                    required
                    disabled={!kecamatan}
                  >
                    <option value="" className="dark:bg-zinc-800">
                      — Pilih Kelurahan —
                    </option>
                    {kelurahanList.map((kel) => (
                      <option key={kel} value={kel} className="dark:bg-zinc-800">
                        {kel}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {isPetugas && (
              <div>
                <div className="relative">
                  <select
                    id="d-zona"
                    value={zonaId}
                    onChange={(e) => setZonaId(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-slate-900 dark:text-zinc-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer disabled:opacity-50 pr-8"
                    disabled={!kelurahan}
                  >
                    <option value="" className="dark:bg-zinc-800">
                      {kelurahan ? "— Pilih Zona (Opsional) —" : "— Pilih Zona —"}
                    </option>
                    {zonaList.map((z) => (
                      <option key={z.id} value={z.id} className="dark:bg-zinc-800">
                        {z.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label
                className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                  isPetugas ? "text-xs mb-0.5" : "text-xs sm:text-sm mb-1.5"
                }`}
                htmlFor="d-alamat"
              >
                Alamat Lengkap Rumah / Lokasi <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="d-alamat"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                autoComplete="street-address"
                placeholder="Nama jalan, nomor rumah, nama perumahan, gang, atau blok..."
                className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                  isPetugas
                    ? "px-2 py-1.5 text-xs rounded-lg h-14"
                    : "rounded-xl p-3.5 text-base sm:text-sm min-h-[88px]"
                }`}
                required
                minLength={8}
              />
            </div>

            <div className={`grid ${isPetugas ? "grid-cols-4 gap-2" : "grid-cols-2 sm:grid-cols-4 gap-3"}`}>
              <div>
                <label
                  className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                    isPetugas ? "text-xs mb-0.5" : "text-xs mb-1"
                  }`}
                  htmlFor="d-rt"
                >
                  RT
                </label>
                <input
                  id="d-rt"
                  value={rt}
                  onChange={(e) => setRt(e.target.value)}
                  placeholder="001"
                  maxLength={4}
                  inputMode="numeric"
                  className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                    isPetugas
                      ? "px-2 py-1.5 text-xs rounded-lg"
                      : "rounded-xl px-3.5 text-base sm:text-sm py-2.5 min-h-[44px]"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                    isPetugas ? "text-xs mb-0.5" : "text-xs mb-1"
                  }`}
                  htmlFor="d-rw"
                >
                  RW
                </label>
                <input
                  id="d-rw"
                  value={rw}
                  onChange={(e) => setRw(e.target.value)}
                  placeholder="005"
                  maxLength={4}
                  inputMode="numeric"
                  className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                    isPetugas
                      ? "px-2 py-1.5 text-xs rounded-lg"
                      : "rounded-xl px-3.5 text-base sm:text-sm py-2.5 min-h-[44px]"
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label
                  className={`block font-bold text-slate-700 dark:text-zinc-300 ${
                    isPetugas ? "text-xs mb-0.5" : "text-xs mb-1"
                  }`}
                  htmlFor="d-patokan"
                >
                  Patokan Lokasi
                </label>
                <input
                  id="d-patokan"
                  value={patokanLokasi}
                  onChange={(e) => setPatokanLokasi(e.target.value)}
                  placeholder="Sebelah masjid / pagar hitam / seberang toko"
                  className={`w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 ${
                    isPetugas
                      ? "px-2 py-1.5 text-xs rounded-lg"
                      : "rounded-xl px-3.5 text-base sm:text-sm py-2.5 min-h-[44px]"
                  }`}
                />
              </div>
            </div>

            {isPetugas && (
              <div>
                <input
                  id="d-tgl-penagihan"
                  type="number"
                  min="1"
                  max="31"
                  value={tanggalPenagihanCustom}
                  onChange={(e) => setTanggalPenagihanCustom(e.target.value)}
                  placeholder="Tanggal Penagihan (1-31)"
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-zinc-100"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 4: VALIDASI LAPANGAN (FOTO & GPS) ── */}
      {(isPetugas || currentStep === 4) && (
        <div className={isPetugas ? "space-y-2" : "space-y-5 animate-in fade-in duration-200"}>
          {!isPetugas && (
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-2.5 text-sm sm:text-base">
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black w-6 h-6 text-xs">
                  4
                </span>
                <span>Foto Rumah & Titik Koordinat GPS</span>
              </h3>
              <span className="text-xs text-slate-400 dark:text-zinc-500">Langkah 4 dari 4</span>
            </div>
          )}

          {/* Upload Foto */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 text-xs sm:text-sm mb-1.5">
              Foto Depan Rumah <span className="text-rose-500">*</span>
            </label>
            <input
              ref={kameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={galeriRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {fotoRumah ? (
              <div
                className={`border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 flex items-center ${
                  isPetugas
                    ? "p-2 rounded-xl gap-2.5"
                    : "p-4 rounded-2xl flex-col sm:flex-row gap-4 sm:items-start text-center sm:text-left"
                }`}
              >
                <Image
                  src={fotoRumah}
                  alt="Foto depan rumah"
                  unoptimized
                  width={140}
                  height={140}
                  className={`${
                    isPetugas ? "w-12 h-12" : "w-32 h-32"
                  } object-cover rounded-xl border border-slate-200 dark:border-zinc-700 shrink-0 shadow-xs`}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Foto Rumah Berhasil Disimpan</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Foto telah terkompresi otomatis dan siap diverifikasi oleh petugas rute.
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => kameraRef.current?.click()}
                      disabled={fotoLoading}
                      className="min-h-[40px] px-4 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{fotoLoading ? "Memproses..." : "Ganti Foto"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoRumah("");
                        setExifNotif(null);
                      }}
                      className="min-h-[40px] px-4 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => kameraRef.current?.click()}
                  disabled={fotoLoading}
                  className="w-full border border-emerald-200 dark:border-emerald-800 rounded-2xl font-bold flex items-center justify-center gap-2 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 shadow-xs transition-all disabled:opacity-50 min-h-[48px] py-3 text-xs sm:text-sm active:scale-95"
                >
                  <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{fotoLoading ? "Memproses..." : "Buka Kamera"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => galeriRef.current?.click()}
                  disabled={fotoLoading}
                  className="w-full border border-slate-200 dark:border-zinc-700 rounded-2xl font-bold flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 shadow-xs transition-all disabled:opacity-50 min-h-[48px] py-3 text-xs sm:text-sm active:scale-95"
                >
                  <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>{fotoLoading ? "Memproses..." : "Pilih Galeri"}</span>
                </button>
              </div>
            )}

            {exifNotif && (
              <div className="mt-2.5 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-sky-600" />
                <span>{exifNotif}</span>
              </div>
            )}
          </div>

          {/* Titik Lokasi GPS & Peta */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 text-xs sm:text-sm mb-1.5">
              Titik Lokasi Rumah (GPS) <span className="text-rose-500">*</span>
            </label>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden shadow-xs">
                <PetaLokasi
                  latitude={gpsData?.lat ?? null}
                  longitude={gpsData?.lng ?? null}
                  onChange={(lat, lng) => {
                    setGpsData((prev) => ({ lat, lng, acc: prev?.acc ?? 0 }));
                    setKoordinatSumber("manual");
                  }}
                  className="h-64 sm:h-72 w-full"
                />
              </div>

              {gpsData ? (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Titik Lokasi Tersimpan</span>
                    </p>
                    <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                      {gpsData.lat.toFixed(5)}, {gpsData.lng.toFixed(5)}
                      {gpsData.acc > 0 && ` · Akurasi ±${Math.round(gpsData.acc)}m`}
                    </p>
                    {gpsData.acc > 80 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        💡 Akurasi GPS agak lebar. Anda dapat mengetuk titik pada peta agar presisi di depan pagar rumah.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={getGps}
                    disabled={gpsLoading}
                    className="min-h-[40px] px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? "animate-spin" : ""}`} />
                    <span>{gpsLoading ? "Mencari..." : "Perbarui GPS"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={getGps}
                    disabled={gpsLoading}
                    className="w-full border border-emerald-300 dark:border-emerald-700 rounded-2xl font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50 min-h-[48px] py-3 text-sm active:scale-95"
                  >
                    <MapPin className={`w-4 h-4 shrink-0 ${gpsLoading ? "animate-bounce" : ""}`} />
                    <span>{gpsLoading ? "Mengambil Koordinat GPS..." : "Gunakan Titik GPS Saat Ini"}</span>
                  </button>

                  {gpsDenied && (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 space-y-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm">Izin Lokasi Browser Diblokir</p>
                          <p className="mt-1 leading-relaxed">
                            Browser Anda belum mengizinkan akses lokasi. Untuk mengaktifkannya:
                          </p>
                        </div>
                      </div>
                      <ol className="list-decimal pl-6 space-y-1 text-amber-800 dark:text-amber-300 leading-relaxed">
                        <li>Ketuk ikon gembok 🔒 di samping kolom alamat situs browser Anda</li>
                        <li>Pilih menu <strong>Izin Situs (Permissions)</strong></li>
                        <li>Ubah <strong>Lokasi</strong> menjadi <strong>Izinkan</strong></li>
                      </ol>
                      <p className="font-bold pt-1">
                        💡 Atau ketuk langsung pada peta di atas untuk menandai letak rumah Anda secara manual.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Referral Input (Optional) */}
          {!isPetugas && (
            <div>
              <label
                className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5"
                htmlFor="d-referal"
              >
                Kode / Petugas Referral (Opsional)
              </label>
              <input
                id="d-referal"
                value={referal}
                onChange={(e) => {
                  setReferal(e.target.value);
                  setReferalFromUrl(false);
                }}
                placeholder="Contoh: Nama atau ID Petugas yang merekomendasikan"
                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-900 dark:text-zinc-100 text-base sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 min-h-[46px]"
              />
            </div>
          )}
        </div>
      )}

      {/* Honeypot Spam Protection */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="d-website">Website</label>
        <input
          id="d-website"
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Inline Feedback Banner */}
      {pesan && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border flex items-center gap-2.5 transition-all animate-in fade-in ${
            status === "ok"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{pesan}</span>
        </div>
      )}

      {/* Navigation Buttons */}
      {!isPetugas ? (
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 min-h-[48px] active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-md transition-all flex items-center gap-2 text-xs sm:text-sm min-h-[48px] active:scale-95 ml-auto"
            >
              <span>Lanjutkan ke Langkah {currentStep + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === "kirim"}
              className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 transition-all flex items-center gap-2 text-xs sm:text-sm min-h-[48px] active:scale-95 disabled:opacity-50 ml-auto"
            >
              {status === "kirim" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Pendaftaran...</span>
                </>
              ) : (
                <span>Daftar Sekarang (Gratis) 🚀</span>
              )}
            </button>
          )}
        </div>
      ) : (
        /* Petugas Mode Submit */
        <button
          type="submit"
          disabled={status === "kirim"}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {status === "kirim" ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan Data...</span>
            </>
          ) : (
            <span>Simpan Pendaftaran Warga</span>
          )}
        </button>
      )}
    </form>
  );
}
