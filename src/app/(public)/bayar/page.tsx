"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";

type TagihanPublik = {
  id: number;
  noInvoice?: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda?: number;
  total?: number;
  status: string;
  jatuhTempo: string;
};

type HasilCek = {
  pelanggan: { nama: string; kodePelanggan: string; alamat: string };
  tagihan: TagihanPublik[];
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const METODE = [
  { value: "transfer", label: "Transfer Bank Manual" },
  { value: "ewallet", label: "Dompet Digital (GoPay / OVO / DANA)" },
  { value: "qris", label: "Scan QRIS Nasional" },
  { value: "virtual_account", label: "Virtual Account (BCA / Mandiri / BRI)" },
];

function StatusBadge({ status }: { status: string }) {
  const isLunas = status === "lunas";
  const isTunggakan = status === "tunggakan";
  
  const cls = isLunas
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isTunggakan
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
    
  const label = isLunas ? "Lunas" : isTunggakan ? "Tunggakan" : "Belum Dibayar";
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLunas ? "bg-emerald-500" : isTunggakan ? "bg-rose-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

export default function BayarPage() {
  const [kode, setKode] = useState("");
  const [mencari, setMencari] = useState(false);
  const [hasil, setHasil] = useState<HasilCek | null>(null);
  const [error, setError] = useState("");

  const [pilih, setPilih] = useState<number | null>(null);
  const [form, setForm] = useState({ metode: "transfer", catatan: "" });
  const [bukti, setBukti] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [sukses, setSukses] = useState("");
  const [kirimError, setKirimError] = useState("");

  async function muatTagihan(kodePelanggan: string) {
    const res = await fetch(`/api/publik/tagihan?kode=${encodeURIComponent(kodePelanggan)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Data pelanggan tidak ditemukan. Pastikan nomor WhatsApp atau kode pelanggan sudah benar.");
      setHasil(null);
    } else {
      setHasil(data);
    }
  }

  async function cekTagihan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setHasil(null);
    setPilih(null);
    setMencari(true);
    try {
      await muatTagihan(kode.trim());
    } catch {
      setError("Gagal terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.");
    } finally {
      setMencari(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setKirimError("Ukuran file terlalu besar. Maksimal ukuran gambar bukti transfer adalah 2MB.");
      return;
    }
    setKirimError("");
    const reader = new FileReader();
    reader.onload = () => setBukti(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function kirimBukti(e: React.FormEvent) {
    e.preventDefault();
    if (!hasil || !pilih) return;
    setKirimError("");
    setMengirim(true);
    try {
      const res = await fetch("/api/publik/bayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: hasil.pelanggan.kodePelanggan,
          tagihanId: pilih,
          metode: form.metode,
          buktiBayar: bukti || undefined,
          catatan: form.catatan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSukses(data.message);
        setHasil(null);
        setKode("");
      } else {
        setKirimError(data.error || "Gagal mengirim bukti pembayaran.");
      }
    } catch {
      setKirimError("Terjadi kendala jaringan saat mengirim bukti pembayaran. Silakan coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="py-6 sm:py-10 space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <span>💳</span>
          <span>Portal Resmi Retribusi Sampah UPS HERU</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Cek & Bayar Tagihan Retribusi
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Masukkan nomor WhatsApp atau kode pelanggan Anda untuk melihat rincian iuran sampah bulanan, riwayat pembayaran, dan tagihan aktif.
        </p>
      </div>

      {sukses && (
        <div className="bg-white rounded-3xl border border-emerald-200 p-6 text-center shadow-sm space-y-2">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-2xl">
            ✅
          </div>
          <p className="font-extrabold text-lg text-emerald-800">Pembayaran Berhasil Dicatat!</p>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{sukses}</p>
          {sukses.includes("verifikasi") && (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Tim admin kasir kami sedang memverifikasi mutasi Anda. Bukti tanda terima / kwitansi resmi akan dikirimkan otomatis via WhatsApp.
            </p>
          )}
        </div>
      )}

      {/* Step 1: Form Pencarian Cepat */}
      {!hasil && (
        <form onSubmit={cekTagihan} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-xl mx-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Nomor WhatsApp / Kode Pelanggan
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">📱</span>
                <input
                  type="text"
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                  placeholder="Contoh: 081234567890"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={mencari}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-sm active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {mencari ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <span>Cek Tagihan 🔍</span>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium">
              {error}
            </div>
          )}
        </form>
      )}

      {/* Step 2: Daftar tagihan pelanggan */}
      {hasil && !pilih && (
        <div className="space-y-6">
          {/* Kartu Profil Pelanggan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg shrink-0">
                {hasil.pelanggan.nama.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 truncate">{hasil.pelanggan.nama}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-700">
                    {hasil.pelanggan.kodePelanggan}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{hasil.pelanggan.alamat}</p>
              </div>
            </div>

            <button
              onClick={() => setHasil(null)}
              className="shrink-0 text-xs font-bold text-slate-600 hover:text-emerald-700 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all self-start sm:self-auto"
            >
              Ganti Nomor / Akun
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Daftar Tagihan & Iuran Bulanan
            </h3>
            <span className="text-xs text-slate-400 font-medium">{hasil.tagihan.length} tagihan tercatat</span>
          </div>

          {hasil.tagihan.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl">
                ✨
              </div>
              <p className="text-base font-bold text-slate-900">Tidak Ada Tagihan Tertunggak</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Semua iuran retribusi sampah Anda sudah lunas. Terima kasih atas kepedulian Anda menjaga kebersihan Kota Depok!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {hasil.tagihan.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900">
                        {BULAN[t.bulan - 1]} {t.tahun}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Jatuh Tempo: <span className="font-semibold text-slate-700">{formatDate(t.jatuhTempo)}</span>
                    </p>
                    {t.denda ? (
                      <p className="text-xs font-bold text-rose-600">
                        + Denda Keterlambatan (2%): {formatRupiah(t.denda)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Pembayaran</p>
                      <p className="text-xl font-extrabold text-slate-900">
                        {formatRupiah(t.total ?? (t.jumlah + (t.denda || 0)))}
                      </p>
                    </div>

                    {t.status !== "lunas" && (
                      <div className="flex items-center gap-2">
                        {t.noInvoice && (
                          <Link
                            href={`/bayar-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>⚡</span>
                            <span>Bayar Instan</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setPilih(t.id)}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>📤</span>
                          <span>Upload Bukti</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Konfirmasi Transfer & Upload Bukti */}
      {hasil && pilih && (
        <form onSubmit={kirimBukti} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5 max-w-xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Konfirmasi Bukti Transfer</h2>
              <p className="text-xs text-slate-500">Kirimkan foto atau screenshot bukti transfer bank Anda</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPilih(null);
                setBukti("");
                setKirimError("");
                setForm({ metode: "transfer", catatan: "" });
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-100"
            >
              Batal ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Metode Pembayaran</label>
            <select
              value={form.metode}
              onChange={(e) => setForm({ ...form, metode: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            >
              {METODE.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Foto / Screenshot Bukti Transfer</label>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="w-full text-xs text-slate-600 font-medium file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
              />
            </div>
            {bukti && (
              <div className="mt-2 p-2 rounded-2xl border border-slate-200 bg-slate-50 inline-block">
                <Image src={bukti} alt="Bukti Pembayaran" width={320} height={160} unoptimized className="rounded-xl object-cover max-h-40" />
                <p className="text-[10px] font-bold text-center text-emerald-700 mt-1">✓ Bukti siap dikirim</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Contoh: Transfer via m-BCA a.n Bpk. Bambang"
            />
          </div>

          {kirimError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
              {kirimError}
            </div>
          )}

          <button
            type="submit"
            disabled={mengirim}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mengirim ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengirim Konfirmasi...</span>
              </>
            ) : (
              <span>Kirim Bukti Pembayaran 🚀</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
