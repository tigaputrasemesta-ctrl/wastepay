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
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];

const METODE = [
  { value: "transfer", label: "TRANSFER BANK" },
  { value: "ewallet", label: "DOMPET DIGITAL" },
  { value: "qris", label: "SCAN QRIS" },
  { value: "virtual_account", label: "VIRTUAL ACCOUNT" },
];

function StatusBadge({ status }: { status: string }) {
  const isLunas = status === "lunas";
  const isTunggakan = status === "tunggakan";
  
  const cls = isLunas
    ? "bg-green-600 text-white"
    : isTunggakan
    ? "bg-red-600 text-white"
    : "bg-yellow-400 text-black";
    
  const label = isLunas ? "LUNAS" : isTunggakan ? "TUNGGAKAN" : "BELUM BAYAR";
  
  return (
    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase hm-border ${cls}`}>
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
      setError(data.error || "GAGAL KONEK KE SERVER");
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
      setError("SERVER DOWN COY, COBA LAGI BENTARAN");
    } finally {
      setMencari(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setKirimError("FILE KEGEDEAN NGAB, MAKS 2MB AJA");
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
        setKirimError(data.error || "GAGAL KIRIM COY");
      }
    } catch {
      setKirimError("GAGAL KIRIM, JARINGAN AMPAS");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 hm-border font-bold uppercase text-xs mb-2 bg-[#f4f4f0]">
          O2W / LOKET PEMBAYARAN
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
          CEK <span className="text-red-600">TAGIHAN.</span>
        </h1>
        <p className="font-bold uppercase tracking-widest text-sm max-w-lg mx-auto">
          MASUKKAN NOMOR WHATSAPP ANDA (SEBAGAI KODE PELANGGAN) UNTUK MELIHAT TAGIHAN ATAU TUNGGAKAN.
        </p>
      </div>

      {sukses && (
        <div className="hm-card bg-green-50 flex flex-col items-center text-center">
          <p className="font-black text-2xl uppercase text-green-600">TRANSAKSI BERHASIL!</p>
          <p className="text-sm font-bold uppercase mt-2">{sukses}</p>
          {sukses.includes("verifikasi") && (
            <p className="text-xs font-bold uppercase mt-4 border-t-2 border-black pt-4 w-full">
              ADMIN SEDANG MENGECEK BUKTI. TUNGGU NOTIFIKASI WA DARI KAMI.
            </p>
          )}
        </div>
      )}

      {/* Step 1: Cek kode */}
      {!hasil && (
        <form onSubmit={cekTagihan} className="hm-card max-w-2xl mx-auto bg-[#f4f4f0]">
          <label className="block text-sm font-bold mb-3 uppercase tracking-widest">
            KODE PELANGGAN (NO. WHATSAPP)
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              className="flex-1 bg-white hm-border px-5 py-4 text-black text-lg font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
              placeholder="CONTOH: 081234567890"
              required
            />
            <button
              type="submit"
              disabled={mencari}
              className="hm-btn-red"
            >
              {mencari ? "MENCARI..." : "CARI DATA"}
            </button>
          </div>
          {error && <p className="text-sm font-bold text-red-600 mt-4 uppercase">{error}</p>}
        </form>
      )}

      {/* Step 2: Daftar tagihan */}
      {hasil && !pilih && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
          
          <div className="hm-card flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2">IDENTITAS PELANGGAN</p>
              <h2 className="text-3xl font-black uppercase">{hasil.pelanggan.nama}</h2>
              <p className="font-medium text-sm mt-2">{hasil.pelanggan.alamat}</p>
            </div>
            <div className="bg-[#f4f4f0] hm-border px-6 py-4 text-center">
              <span className="text-xs font-bold block mb-1 uppercase">ID KODE</span>
              <span className="text-2xl font-black">{hasil.pelanggan.kodePelanggan}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <h3 className="font-black text-2xl uppercase">RIWAYAT TAGIHAN</h3>
            <button
              onClick={() => setHasil(null)}
              className="text-sm font-bold hover:text-red-600 transition-colors uppercase border-b-2 border-transparent hover:border-red-600"
            >
              CARI KODE LAIN
            </button>
          </div>

          {hasil.tagihan.length === 0 ? (
            <div className="hm-card text-center bg-green-50">
              <p className="text-green-600 font-black text-2xl uppercase">BERSIH!</p>
              <p className="font-bold mt-2 uppercase">TIDAK ADA TAGIHAN ATAU TUNGGAKAN.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {hasil.tagihan.map((t) => (
                <div key={t.id} className="hm-card p-0 flex flex-col md:flex-row md:items-center justify-between group overflow-hidden">
                  
                  <div className="p-6 md:p-8 flex-1 border-b-2 md:border-b-0 md:border-r-2 border-black">
                    <p className="text-3xl font-black mb-1">
                      {BULAN[t.bulan - 1]} {t.tahun}
                    </p>
                    <p className="text-xs font-bold uppercase">
                      JATUH TEMPO: {formatDate(t.jatuhTempo)}
                    </p>
                    {t.denda ? (
                      <p className="text-xs font-bold text-red-600 mt-2 uppercase inline-block border-2 border-red-600 px-2 py-1 bg-red-50">
                        DENDA KETERLAMBATAN: {formatRupiah(t.denda)}
                      </p>
                    ) : null}
                  </div>
                  
                  <div className="p-6 md:p-8 flex flex-col md:items-end gap-4 bg-[#f4f4f0]">
                    <div className="flex flex-col md:items-end gap-2">
                      <StatusBadge status={t.status} />
                      <p className="font-black text-3xl">
                        {formatRupiah(t.total ?? (t.jumlah + (t.denda || 0)))}
                      </p>
                    </div>
                    
                    {t.status !== "lunas" && (
                      <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
                        {t.noInvoice && (
                          <Link
                            href={`/bayar-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                            className="hm-btn-green px-5 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
                          >
                            <span>⚡</span>
                            <span>BAYAR INSTAN</span>
                          </Link>
                        )}
                        <button
                          onClick={() => setPilih(t.id)}
                          className="hm-btn px-5 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
                        >
                          <span>📤</span>
                          <span>UPLOAD BUKTI</span>
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

      {/* Step 3: Kirim bukti */}
      {hasil && pilih && (
        <form onSubmit={kirimBukti} className="hm-card space-y-8 max-w-2xl mx-auto bg-[#f4f4f0] animate-in fade-in slide-in-from-bottom-4">
          
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <h2 className="font-black uppercase text-xl sm:text-2xl">UPLOAD BUKTI PEMBAYARAN</h2>
            <button
              type="button"
              onClick={() => {
                setPilih(null);
                setBukti("");
                setKirimError("");
                setForm({ metode: "transfer", catatan: "" });
              }}
              className="hm-btn px-3.5 py-1.5 text-xs font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5"
            >
              ✕ BATAL
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest">METODE TRANSAKSI</label>
            <div className="relative">
              <select
                value={form.metode}
                onChange={(e) => setForm({ ...form, metode: e.target.value })}
                className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 appearance-none uppercase"
                required
              >
                {METODE.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-lg">▼</div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest">
              FILE GAMBAR BUKTI
            </label>
            <div className="border-4 border-dashed border-black bg-white p-6 text-center hover:bg-gray-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="w-full text-xs font-bold file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-black hover:file:text-white cursor-pointer transition-colors"
              />
            </div>
            {bukti && (
              <div className="mt-4 hm-border p-2 inline-block bg-white">
                <Image src={bukti} alt="Bukti" width={320} height={160} unoptimized className="object-cover max-h-48" />
                <p className="text-xs font-bold text-center mt-2 uppercase">GAMBAR DIMUAT</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest">CATATAN TAMBAHAN (OPSIONAL)</label>
            <input
              type="text"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
              placeholder="CONTOH: TRANSFER DARI BCA"
            />
          </div>

          {kirimError && <p className="text-sm font-bold text-red-600 uppercase">{kirimError}</p>}

          <button
            type="submit"
            disabled={mengirim}
            className="hm-btn-red w-full py-4 text-base font-black flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
          >
            {mengirim ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span>MENGIRIM BUKTI...</span>
              </>
            ) : (
              <>
                <span>KIRIM BUKTI SEKARANG</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
