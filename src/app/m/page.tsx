"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayLocalISO } from "@/lib/utils";
import { 
  MapPin, 
  ClipboardList, 
  Clock, 
  Receipt, 
  CheckCircle2, 
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Truck,
  Bell,
  Share2,
  Copy,
  Check,
  Users,
  FileText,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";

type Profil = {
  id: number;
  nama: string;
  jabatan: string | null;
  kelurahan: string | null;
  aktif: boolean;
};

type StatusAbsen = { id: number; waktuMasuk: string | null; waktuSelesai: string | null; status: string } | null;

type ReferralData = {
  nama: string;
  referralUrl: string;
  stats: { totalSemua: number; totalAktif: number; totalCalon: number };
  daftarTerbaru: { id: number; nama: string; alamat: string; status: string; createdAt: string }[];
} | null;

type KendaraanItem = {
  id: number;
  nama: string;
  platNomor: string;
  jenis: string;
  kapasitas?: number;
};

type ArmadaReportData = {
  allKendaraan: KendaraanItem[];
  kendaraan: KendaraanItem;
  hari: string;
  activeRute: {
    id: number;
    nama: string;
    hari: string;
  } | null;
  cakupanZonas: string[];
  summary: {
    totalTugas: number;
    selesai: number;
    kosong: number;
    terlewat: number;
    belum: number;
    persentase: number;
    totalVolumeM3: number;
    ritCount: number;
  };
};

export default function MobileHome() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [absen, setAbsen] = useState<StatusAbsen>(null);
  const [jumlahTugas, setJumlahTugas] = useState<number | null>(null);
  const [jumlahCalon, setJumlahCalon] = useState<number | null>(null);
  const [referralData, setReferralData] = useState<ReferralData>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Khusus Armada & Rute Operasional
  const [kendaraanList, setKendaraanList] = useState<KendaraanItem[]>([]);
  const [selectedKendaraanId, setSelectedKendaraanId] = useState<number | null>(null);
  const [armadaData, setArmadaData] = useState<ArmadaReportData | null>(null);
  const [openKomplainCount, setOpenKomplainCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/petugas/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfil)
      .catch(() => {});
    fetch("/api/absensi")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAbsen(d?.statusHariIni ?? null))
      .catch(() => {});
    fetch("/api/petugas/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then(setReferralData)
      .catch(() => {});
  }, []);

  const jabatan = (profil?.jabatan || "").split(",").filter(Boolean);
  const isAngkut = jabatan.includes("angkut");
  const isSurvei = jabatan.includes("survei");

  useEffect(() => {
    if (isAngkut) {
      const today = todayLocalISO();
      fetch(`/api/pengangkutan?saya=1&tanggal=${today}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setJumlahTugas(Array.isArray(d) ? d.length : 0))
        .catch(() => setJumlahTugas(0));
    }
    if (isSurvei) {
      fetch("/api/pelanggan?status=calon")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setJumlahCalon(Array.isArray(d) ? d.length : 0))
        .catch(() => setJumlahCalon(0));
    }
  }, [isAngkut, isSurvei]);

  // Inisialisasi ID Armada dari LocalStorage atau default
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("o2w_kendaraan_id");
      if (saved) {
        setSelectedKendaraanId(parseInt(saved, 10));
      }
    }
  }, []);

  // Fetch data armada & komplain rute
  useEffect(() => {
    if (!isAngkut) return;

    const urlReport = selectedKendaraanId
      ? `/api/m/report-armada?kendaraanId=${selectedKendaraanId}`
      : "/api/m/report-armada";

    fetch(urlReport)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ArmadaReportData | null) => {
        if (!data) return;
        setArmadaData(data);
        if (data.allKendaraan) {
          setKendaraanList(data.allKendaraan);
        }
        if (!selectedKendaraanId && data.kendaraan) {
          setSelectedKendaraanId(data.kendaraan.id);
          if (typeof window !== "undefined") {
            localStorage.setItem("o2w_kendaraan_id", String(data.kendaraan.id));
          }
        }
      })
      .catch(() => {});

    const urlKomplain = selectedKendaraanId
      ? `/api/m/komplain-armada?kendaraanId=${selectedKendaraanId}&status=aktif`
      : "/api/m/komplain-armada?status=aktif";

    fetch(urlKomplain)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.totalAktif === "number") {
          setOpenKomplainCount(data.totalAktif);
        }
      })
      .catch(() => {});
  }, [isAngkut, selectedKendaraanId]);

  function handleSelectKendaraan(id: number) {
    setSelectedKendaraanId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("o2w_kendaraan_id", String(id));
    }
  }

  const sudahMasuk = Boolean(absen?.waktuMasuk);
  const sudahSelesai = Boolean(absen?.waktuSelesai);

  function handleCopyReferral() {
    if (!referralData?.referralUrl) return;
    navigator.clipboard.writeText(referralData.referralUrl);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  }

  function handleShareWhatsApp() {
    if (!referralData?.referralUrl) return;
    const text = `Halo Bapak/Ibu! Yuk daftar layanan angkut & pengelolaan sampah resmi UPS HERU Kota Depok. Terjadwal, bersih, dan bisa pantau posisi armada langsung dari HP.\n\nKlik link pendaftaran resmi di sini:\n${referralData.referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-3">
      {/* Attendance & Shift Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-3.5 shadow-sm border border-emerald-700/50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider block">
              Status Operasional
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  sudahSelesai ? "bg-sky-400" : sudahMasuk ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <p className="text-sm font-bold text-white truncate">
                {sudahSelesai ? "Shift Selesai" : sudahMasuk ? "Sedang Bertugas" : "Belum Absen Masuk"}
              </p>
            </div>
            <p className="text-[10px] text-emerald-200/80 mt-0.5 truncate">
              {profil?.kelurahan ? `Wilayah Kel. ${profil.kelurahan}` : "Armada Kota Depok"}
            </p>
          </div>

          <Link
            href="/m/absen"
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              sudahSelesai
                ? "bg-white/20 text-white hover:bg-white/30"
                : sudahMasuk
                ? "bg-amber-500 hover:bg-amber-600 text-slate-900"
                : "bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95"
            }`}
          >
            {sudahSelesai ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Rekap</span>
              </>
            ) : sudahMasuk ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Akhiri Shift</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mulai Shift</span>
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Kartu Khusus Armada & Rute Operasional Hari Ini */}
      {isAngkut && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-sm space-y-3">
          {/* Header & Kendaraan Selector */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Armada Operasional
                </span>
                <span className="text-xs font-black text-slate-900 truncate block">
                  {armadaData?.kendaraan ? `${armadaData.kendaraan.platNomor} (${armadaData.kendaraan.nama})` : "Pilih Armada"}
                </span>
              </div>
            </div>

            {/* Selector Dropdown */}
            {kendaraanList.length > 0 && (
              <select
                value={selectedKendaraanId || ""}
                onChange={(e) => handleSelectKendaraan(Number(e.target.value))}
                className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
              >
                {kendaraanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.platNomor} - {k.nama.split(" ")[0]}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Info Rute & Cakupan Hari Ini */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Jadwal Rute {armadaData?.hari ? `(${armadaData.hari})` : ""}:
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                armadaData?.activeRute ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}>
                {armadaData?.activeRute ? "Rute Aktif" : "Libur / Off"}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-800">
              {armadaData?.activeRute ? armadaData.activeRute.nama : "Tidak ada jadwal rute untuk armada ini pada hari ini"}
            </p>

            {armadaData?.cakupanZonas && armadaData.cakupanZonas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {armadaData.cakupanZonas.map((z, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                    {z}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Progress Angkut Hari Ini */}
          {armadaData?.summary && (
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-slate-600">Progress Penjemputan</span>
                <span className="text-xs font-black text-emerald-700">
                  {armadaData.summary.selesai} / {armadaData.summary.totalTugas} Titik ({armadaData.summary.persentase}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${armadaData.summary.persentase}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                <span>Rit: <strong className="text-slate-800">{armadaData.summary.ritCount} rit</strong></span>
                <span>Volume: <strong className="text-slate-800">{armadaData.summary.totalVolumeM3.toFixed(1)} m³</strong></span>
                <span>Lewat: <strong className="text-slate-800">{armadaData.summary.terlewat}</strong></span>
              </div>
            </div>
          )}

          {/* 3 Quick Action Buttons for Armada */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Link
              href={selectedKendaraanId ? `/m/angkut?kendaraanId=${selectedKendaraanId}` : "/m/angkut"}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-700 text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition-all"
            >
              <Truck className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-extrabold leading-tight text-center">Jemput Rute</span>
            </Link>

            <Link
              href="/m/report"
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/80 hover:bg-sky-100 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4 mb-1 text-sky-700" />
              <span className="text-[10px] font-extrabold leading-tight text-center">Report Rit</span>
            </Link>

            <Link
              href="/m/pengaduan"
              className={`flex flex-col items-center justify-center p-2 rounded-xl border relative transition-all active:scale-95 ${
                openKomplainCount > 0
                  ? "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {openKomplainCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs animate-bounce">
                  {openKomplainCount}
                </span>
              )}
              <AlertCircle className={`w-4 h-4 mb-1 ${openKomplainCount > 0 ? "text-rose-600" : "text-slate-600"}`} />
              <span className="text-[10px] font-extrabold leading-tight text-center">Aduan Warga</span>
            </Link>
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {isAngkut && (
          <Link
            href="/m/angkut"
            className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-sm hover:border-emerald-300 transition-all flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 block truncate">Tugas Angkut</span>
              <span className="text-base font-extrabold text-slate-900 tabular-nums">
                {jumlahTugas !== null ? jumlahTugas : "-"}
              </span>
            </div>
          </Link>
        )}

        {isSurvei && (
          <Link
            href="/m/survei"
            className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-sm hover:border-indigo-300 transition-all flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 block truncate">Survei Calon</span>
              <span className="text-base font-extrabold text-slate-900 tabular-nums">
                {jumlahCalon !== null ? jumlahCalon : "-"}
              </span>
            </div>
          </Link>
        )}

        <Link
          href="/m/absen"
          className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-sm hover:border-sky-300 transition-all flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-medium text-slate-500 block truncate">Jam Masuk</span>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {sudahMasuk && absen?.waktuMasuk ? absen.waktuMasuk.slice(11, 16) : "--:--"}
            </span>
          </div>
        </Link>
      </div>

      {/* Main Apps Menu (Grid 2 Columns) */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1">
          Menu Lapangan
        </p>

        <div className="grid grid-cols-2 gap-2">
          {isAngkut && (
            <Link
              href="/m/angkut"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-emerald-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Tugas Angkut</p>
                <p className="text-[10px] text-slate-500 truncate">Rute jemputan & radar</p>
              </div>
            </Link>
          )}

          {isAngkut && (
            <Link
              href="/m/report"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-sky-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                  <FileText className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Report Rit</p>
                <p className="text-[10px] text-slate-500 truncate">Rekap harian & volume</p>
              </div>
            </Link>
          )}

          {isAngkut && (
            <Link
              href="/m/pengaduan"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-rose-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1">
                  {openKomplainCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                      {openKomplainCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Pengaduan Rute</p>
                <p className="text-[10px] text-slate-500 truncate">Aduan warga jalur ini</p>
              </div>
            </Link>
          )}

          {isAngkut && (
            <Link
              href="/m/lapor"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-amber-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Lapor Cepat</p>
                <p className="text-[10px] text-slate-500 truncate">Catat jemputan & kendala</p>
              </div>
            </Link>
          )}

          {isSurvei && (
            <Link
              href="/m/survei"
              className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-indigo-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Survei Warga</p>
                <p className="text-[10px] text-slate-500 truncate">Verifikasi calon pelanggan</p>
              </div>
            </Link>
          )}

          <Link
            href="/m/absen"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-sky-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                <Clock className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Presensi GPS</p>
              <p className="text-[10px] text-slate-500 truncate">Jam masuk & pulang</p>
            </div>
          </Link>

          <Link
            href="/m/klaim"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-rose-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                <Receipt className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Klaim Biaya</p>
              <p className="text-[10px] text-slate-500 truncate">BBM, servis, & kas</p>
            </div>
          </Link>

          <Link
            href="/m/chat"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-violet-400 hover:shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
                <MessageSquare className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Chat Admin</p>
              <p className="text-[10px] text-slate-500 truncate">Koordinasi & bantuan</p>
            </div>
          </Link>

          <Link
            href="/m/notifikasi"
            className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm hover:border-amber-400 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between h-[84px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                <Bell className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Notifikasi</p>
              <p className="text-[10px] text-slate-500 truncate">Pengingat absen & tugas</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Referral Program Card for Officers */}
      {referralData && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white rounded-2xl p-3.5 shadow-md space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm font-bold shrink-0">
                🤝
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white">Link Referral Saya</h4>
                <p className="text-[10px] text-slate-400 truncate">
                  Ajak warga baru mendaftar dengan akun Anda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700/80">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono font-black text-emerald-300">
                {referralData.stats.totalSemua} Warga
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-slate-300 truncate max-w-[200px] sm:max-w-xs">
              {referralData.referralUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyReferral}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 ${
                copiedRef
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
              title="Salin tautan referral"
            >
              {copiedRef ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-slate-300" />}
              <span>{copiedRef ? "Tersalin!" : "Salin"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-2 px-3 bg-[#00AA13] hover:bg-[#00880C] active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan Link via WhatsApp</span>
            </button>
          </div>

          {referralData.daftarTerbaru.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Terakhir Mendaftar via Anda:
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {referralData.daftarTerbaru.slice(0, 3).map((w) => (
                  <div key={w.id} className="text-[10px] flex items-center justify-between py-0.5 px-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <span className="font-bold text-slate-200 truncate max-w-[150px]">{w.nama}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold ${
                      w.status === "aktif" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {w.status === "aktif" ? "Aktif" : "Calon"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fast Helpdesk Banner */}
      <div className="bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <p className="text-[10px] font-semibold text-slate-600 truncate">
            GPS armada aktif terhubung ke Command Center
          </p>
        </div>
        <Link
          href="/m/chat"
          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 shrink-0"
        >
          Hubungi Admin →
        </Link>
      </div>
    </div>
  );
}
