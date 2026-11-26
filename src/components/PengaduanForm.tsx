"use client";

import { useState, useRef, useEffect } from "react";
import { kompresGambar } from "@/lib/foto";
import { toast } from "@/components/Toast";
import { AlertCircle, CheckCircle2, Clock, Search, Send, ShieldAlert, Sparkles, Truck } from "lucide-react";

const JENIS: { value: string; label: string }[] = [
  { value: "tidak_diangkut", label: "Sampah tidak diangkut sesuai jadwal" },
  { value: "sampah_menumpuk", label: "Volume sampah menumpuk melebihi kapasitas" },
  { value: "lainnya", label: "Kendala atau masukan lainnya" },
];

type TiketItem = {
  id: number;
  jenis: string;
  deskripsi: string;
  status: string;
  tanggapan?: string | null;
  createdAt: string;
};

export default function PengaduanForm() {
  const [tab, setTab] = useState<"lapor" | "status">("lapor");
  const [kodePelanggan, setKodePelanggan] = useState("");
  const [jenis, setJenis] = useState("tidak_diangkut");
  const [deskripsi, setDeskripsi] = useState("");
  const [noWa, setNoWa] = useState("");
  const [foto, setFoto] = useState("");
  const [status, setStatus] = useState<"idle" | "kirim" | "ok" | "gagal">("idle");
  const [pesan, setPesan] = useState("");
  const [duplicateTicket, setDuplicateTicket] = useState<{ id: number; status: string } | null>(null);
  const [successTicket, setSuccessTicket] = useState<{ id: number; nama: string; petugas?: string | null } | null>(null);
  const [compressing, setCompressing] = useState(false);

  // State Cek Status
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingStatus, setSearchingStatus] = useState(false);
  const [daftarTiket, setDaftarTiket] = useState<TiketItem[] | null>(null);
  const [pelangganInfo, setPelangganInfo] = useState<{ nama: string; kode: string } | null>(null);

  const kameraInputRef = useRef<HTMLInputElement>(null);
  const galeriInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const k = sp.get("kode") || sp.get("noWa") || sp.get("telp");
      if (k) {
        setKodePelanggan(k);
        setNoWa(k);
        setSearchQuery(k);
      }
    }
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const base64 = await kompresGambar(file);
      setFoto(base64);
    } catch (err: any) {
      toast("Gagal memproses gambar: " + (err?.message || "Format gambar tidak didukung"), "error");
    } finally {
      setCompressing(false);
      if (kameraInputRef.current) kameraInputRef.current.value = "";
      if (galeriInputRef.current) galeriInputRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (compressing) {
      toast("Mohon tunggu, foto sedang dikompresi...", "warning");
      return;
    }
    setStatus("kirim");
    setPesan("");
    setDuplicateTicket(null);
    setSuccessTicket(null);

    try {
      const res = await fetch("/api/publik/pengaduan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodePelanggan, jenis, deskripsi, noWa, foto }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setStatus("ok");
        setSuccessTicket({
          id: data.id,
          nama: data.namaPelanggan,
          petugas: data.assignedPetugas,
        });
        setPesan(
          `Laporan Anda telah berhasil diterbitkan dengan ID Tiket #KMP-${data.id}. Notifikasi disposisi beserta berkas peta GPS & foto rumah telah otomatis dikirimkan ke armada penjemput.`
        );
        setDeskripsi("");
        setFoto("");
      } else if (res.status === 409 || data.isDuplicate) {
        setStatus("gagal");
        setPesan(data.error || "Pengaduan aktif telah tercatat dalam sistem.");
        if (data.activeTicket) {
          setDuplicateTicket({ id: data.activeTicket.id, status: data.activeTicket.status });
        }
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "Gagal mengirimkan pengaduan. Silakan periksa kembali data Anda.");
      }
    } catch {
      setStatus("gagal");
      setPesan("Koneksi bermasalah. Mohon coba beberapa saat lagi.");
    }
  }

  async function handleCekStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchingStatus(true);
    setDaftarTiket(null);
    setPelangganInfo(null);

    try {
      const res = await fetch(`/api/publik/pengaduan?telp=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.komplain) {
        setDaftarTiket(data.komplain);
        setPelangganInfo({ nama: data.nama, kode: data.kodePelanggan });
      } else {
        toast(data.error || "Data pengaduan tidak ditemukan", "error");
      }
    } catch {
      toast("Gagal memuat status pengaduan", "error");
    } finally {
      setSearchingStatus(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setTab("lapor")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            tab === "lapor"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Send size={15} />
          <span>Buat Laporan Baru</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("status");
            if (kodePelanggan && !searchQuery) setSearchQuery(kodePelanggan);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            tab === "status"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Clock size={15} />
          <span>Cek Status Laporan</span>
        </button>
      </div>

      {tab === "lapor" ? (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-extrabold text-base text-slate-900">Formulir Laporan Kendala</h2>
              <p className="text-xs text-slate-500">Auto-disposisi langsung ke WhatsApp driver armada rute Anda</p>
            </div>
            <span className="font-bold text-xs tracking-wide bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles size={12} className="text-rose-600" /> RESIK CEPAT
            </span>
          </div>

          {/* Alert Sukses */}
          {status === "ok" && successTicket && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Laporan Berhasil Diterbitkan (#{`KMP-${successTicket.id}`})</span>
              </div>
              <p className="text-xs text-emerald-800/90 leading-relaxed">
                Halo <strong>{successTicket.nama}</strong>, laporan Anda telah diterima.
                {successTicket.petugas ? (
                  <> Telah otomatis diteruskan ke petugas <strong>{successTicket.petugas}</strong> lengkap dengan titik navigasi GPS dan berkas peta foto rumah Anda.</>
                ) : (
                  <> Tim armada operasional segera menindaklanjuti ke lokasi Anda.</>
                )}
              </p>
            </div>
          )}

          {/* Alert Duplicate Warning */}
          {status === "gagal" && duplicateTicket && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                <span>Laporan Masih Dalam Penanganan (#KMP-{duplicateTicket.id})</span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Anda sudah memiliki laporan pengaduan aktif. Sistem mendeteksi tiket <strong>#KMP-{duplicateTicket.id}</strong> masih dalam proses penanganan oleh armada. Untuk mencegah laporan ganda, silakan pantau status tiket tersebut.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab("status");
                  setSearchQuery(kodePelanggan);
                }}
                className="mt-1 text-xs font-bold text-amber-900 underline hover:text-amber-700 inline-block"
              >
                Lihat Perkembangan Tiket Ini &rarr;
              </button>
            </div>
          )}

          {status === "gagal" && !duplicateTicket && pesan && (
            <div className="p-4 rounded-2xl text-xs font-medium border bg-rose-50 border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{pesan}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700" htmlFor="kode-pelanggan">
              Nomor WhatsApp / ID Pelanggan <span className="text-rose-500">*</span>
            </label>
            <input
              id="kode-pelanggan"
              value={kodePelanggan}
              onChange={(e) => setKodePelanggan(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700" htmlFor="jenis">
              Kategori Masalah
            </label>
            <select
              id="jenis"
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer"
            >
              {JENIS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700" htmlFor="deskripsi">
              Detail Pengaduan <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Sampah di depan rumah belum diangkut sejak jadwal kemarin pagi..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[110px] resize-y placeholder:text-slate-400"
              required
              minLength={10}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Foto Bukti Kendala (Opsional)
              </label>
              <span className="text-xs text-slate-500">Maks. 5MB (JPG/PNG)</span>
            </div>

            {foto ? (
              <div className="relative inline-block rounded-2xl overflow-hidden border border-slate-200 group shadow-xs">
                <img src={foto} alt="Preview Bukti" className="h-36 sm:h-44 w-auto object-cover rounded-2xl" />
                <button
                  type="button"
                  onClick={() => setFoto("")}
                  aria-label="Hapus Foto"
                  className="absolute top-2 right-2 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shadow-md transition-colors"
                >
                  <span aria-hidden="true">✕</span>
                </button>
                <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <span>✓</span> Foto terlampir
                  </span>
                  <button
                    type="button"
                    onClick={() => setFoto("")}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => kameraInputRef.current?.click()}
                    disabled={compressing}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                  >
                    <span>📷 Ambil Foto Kamera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galeriInputRef.current?.click()}
                    disabled={compressing}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                  >
                    <span>🖼️ Pilih dari Galeri</span>
                  </button>
                </div>
                {compressing && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
                    <span>⏳ Mengompres & memproses foto...</span>
                  </p>
                )}
              </div>
            )}

            <input
              ref={kameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galeriInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700" htmlFor="no-wa">
              Nomor Kontak Alternatif (Opsional)
            </label>
            <input
              id="no-wa"
              value={noWa}
              onChange={(e) => setNoWa(e.target.value)}
              placeholder="Nomor telepon lain yang bisa dihubungi"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
              inputMode="tel"
            />
          </div>

          <button
            type="submit"
            disabled={status === "kirim" || compressing}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === "kirim" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengecek & Mengirimkan Laporan...</span>
              </>
            ) : compressing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengompres Foto...</span>
              </>
            ) : (
              <span>Kirim Laporan Pengaduan 📢</span>
            )}
          </button>
        </form>
      ) : (
        /* Tab Cek Status */
        <div className="space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-extrabold text-base text-slate-900">Lacak Status Pengaduan</h2>
            <p className="text-xs text-slate-500">Ketahui perkembangan penanganan laporan Anda oleh tim armada</p>
          </div>

          <form onSubmit={handleCekStatus} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan No. WhatsApp / ID Pelanggan..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
              required
            />
            <button
              type="submit"
              disabled={searchingStatus}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {searchingStatus ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={16} />
              )}
              <span>Lacak</span>
            </button>
          </form>

          {pelangganInfo && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 flex items-center justify-between">
              <span>Warga: <strong>{pelangganInfo.nama}</strong> ({pelangganInfo.kode})</span>
              <span className="text-[11px] text-slate-500">{daftarTiket?.length || 0} riwayat tiket</span>
            </div>
          )}

          {daftarTiket && (
            <div className="space-y-3">
              {daftarTiket.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <p className="text-2xl">🎉</p>
                  <p className="text-sm font-bold text-slate-800">Tidak Ada Laporan Aktif</p>
                  <p className="text-xs text-slate-500">Semua layanan pengangkutan untuk rumah Anda berjalan lancar.</p>
                </div>
              ) : (
                daftarTiket.map((t) => {
                  const isDone = t.status === "selesai";
                  const isProcess = t.status === "proses" || t.status === "diproses";
                  const isDitolak = t.status === "ditolak" || t.status === "batal";
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">#KMP-{t.id}</span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            isDone
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isProcess
                              ? "bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
                              : isDitolak
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {isDone ? "✓ Selesai" : isProcess ? "🚛 Sedang Ditangani" : isDitolak ? "✕ Laporan Ditolak" : "⏳ Menunggu Armada"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">"{t.deskripsi}"</p>
                      {t.tanggapan && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                          <strong>Catatan Petugas:</strong> {t.tanggapan}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">Dilaporkan pada {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
