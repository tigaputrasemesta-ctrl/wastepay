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
  { value: "transfer", label: "TRANSFER_BANK" },
  { value: "ewallet", label: "DOMPET_DIGITAL" },
  { value: "qris", label: "SCAN_QRIS" },
  { value: "virtual_account", label: "VIRTUAL_ACCOUNT" },
];

function StatusBadge({ status }: { status: string }) {
  const isLunas = status === "lunas";
  const isTunggakan = status === "tunggakan";
  
  const cls = isLunas
    ? "text-[var(--neon-lime)] border-[var(--neon-lime)] bg-[rgba(57,255,20,0.1)] shadow-[0_0_10px_rgba(57,255,20,0.3)]"
    : isTunggakan
    ? "text-[var(--neon-pink)] border-[var(--neon-pink)] bg-[rgba(255,0,234,0.1)] shadow-[0_0_10px_rgba(255,0,234,0.3)] glitch-text"
    : "text-[var(--neon-yellow)] border-[var(--neon-yellow)] bg-[rgba(252,238,10,0.1)] shadow-[0_0_10px_rgba(252,238,10,0.3)] blink";
    
  const label = isLunas ? "[ LUNAS_COY ]" : isTunggakan ? "[ NGUTANG_PARAH ]" : "[ BELOM_BAYAR ]";
  
  return (
    <span className={`inline-block px-3 py-1 text-[10px] font-mono font-bold uppercase border ${cls}`}>
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
      setError(data.error || "GAGAL KONEK KE SERVER, COBA LAGI NGAB");
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 relative z-10">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-white tracking-tighter uppercase">
          <span className="text-[var(--neon-cyan)]">&gt;</span> TERMINAL <span className="text-[var(--neon-pink)] glitch-text">PEMBAYARAN</span>
        </h1>
        <p className="font-mono text-sm text-[var(--neon-cyan)] uppercase tracking-widest border border-[var(--neon-cyan)] bg-[rgba(0,243,255,0.05)] inline-block px-4 py-2">
          // MASUKIN KODE PELANGGAN BUAT CEK TAGIHAN LU
        </p>
      </div>

      {sukses && (
        <div className="cyber-box mb-8" style={{ borderColor: 'var(--neon-lime)' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--neon-lime)] shadow-[0_0_15px_var(--neon-lime)]" />
          <p className="font-bold text-xl text-[var(--neon-lime)] uppercase">&gt; TRANSAKSI_BERHASIL</p>
          <p className="text-sm mt-2 font-mono text-slate-300 uppercase">{sukses}</p>
          {sukses.includes("verifikasi") && (
            <p className="text-[10px] mt-4 font-mono text-slate-500 uppercase border-t border-slate-800 pt-2">
              &gt; ADMIN LAGI CEK BUKTI LU. TUNGGUIN AJA BOT WA NGABARIN.
            </p>
          )}
        </div>
      )}

      {/* Step 1: Cek kode */}
      {!hasil && (
        <form onSubmit={cekTagihan} className="cyber-box max-w-2xl mx-auto">
          <label className="block text-xs font-mono font-bold text-[var(--neon-cyan)] mb-3 uppercase tracking-widest">
            &gt; INPUT_KODE_WARGA :
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              className="flex-1 bg-[rgba(0,0,0,0.5)] border border-slate-700 focus:border-[var(--neon-cyan)] px-5 py-4 text-white text-lg font-mono transition-colors uppercase tracking-widest outline-none shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]"
              placeholder="E.G: DPK-0001"
              required
            />
            <button
              type="submit"
              disabled={mencari}
              className="cyber-btn w-full sm:w-auto text-sm"
            >
              {mencari ? "SCANNING..." : "[ EXECUTE_SEARCH ]"}
            </button>
          </div>
          {error && <p className="text-xs font-mono text-[var(--neon-pink)] mt-4 uppercase glitch-text">&gt; ERROR: {error}</p>}
        </form>
      )}

      {/* Step 2: Daftar tagihan */}
      {hasil && !pilih && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="cyber-box bg-[rgba(0,243,255,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">
                &gt; IDENTITAS_TARGET
              </p>
              <h2 className="font-display text-3xl font-black text-white uppercase">{hasil.pelanggan.nama}</h2>
              <p className="text-xs font-mono text-[var(--neon-cyan)] mt-2 uppercase">{hasil.pelanggan.alamat}</p>
            </div>
            <div className="border border-[var(--neon-cyan)] bg-black px-6 py-3 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
              <span className="text-[10px] font-mono text-slate-500 block mb-1 uppercase">&gt; ID_KODE</span>
              <span className="font-mono text-xl text-white font-bold tracking-widest">{hasil.pelanggan.kodePelanggan}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-mono font-bold text-[var(--neon-yellow)] uppercase tracking-widest">&gt; LOG_TAGIHAN</h3>
            <button
              onClick={() => setHasil(null)}
              className="text-[10px] font-mono text-slate-500 hover:text-[var(--neon-cyan)] transition-colors uppercase"
            >
              [ CARI_KODE_LAIN ]
            </button>
          </div>

          {hasil.tagihan.length === 0 ? (
            <div className="cyber-box text-center border-[var(--neon-lime)]">
              <p className="text-[var(--neon-lime)] font-mono font-bold text-lg uppercase">&gt; CLEAR!</p>
              <p className="text-xs font-mono text-slate-400 mt-2 uppercase">Kagak ada tunggakan. Lu aman coy!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {hasil.tagihan.map((t) => (
                <div key={t.id} className="border border-slate-800 bg-[rgba(0,0,0,0.6)] p-6 hover:border-[var(--neon-cyan)] transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-800 group-hover:bg-[var(--neon-cyan)] transition-colors" />
                  
                  <div className="pl-4">
                    <p className="font-display font-black text-white text-2xl mb-1">
                      {BULAN[t.bulan - 1]} {t.tahun}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">
                      LIMIT: {formatDate(t.jatuhTempo)}
                    </p>
                    {t.denda ? (
                      <p className="text-[10px] font-mono text-[var(--neon-pink)] mt-2 uppercase border border-[var(--neon-pink)] bg-[rgba(255,0,234,0.1)] inline-block px-2 py-0.5">
                        &gt; KENA DENDA TELAT: {formatRupiah(t.denda)}
                      </p>
                    ) : null}
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-4 pl-4 md:pl-0 border-l border-slate-800 md:border-none">
                    <div className="flex flex-col md:items-end gap-2">
                      <StatusBadge status={t.status} />
                      <p className="font-mono font-bold text-white text-2xl">
                        {formatRupiah(t.total ?? (t.jumlah + (t.denda || 0)))}
                      </p>
                    </div>
                    
                    {t.status !== "lunas" && (
                      <div className="flex gap-3 w-full md:w-auto pt-2">
                        {t.noInvoice && (
                          <Link
                            href={`/bayar-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                            className="flex-1 md:flex-none text-center bg-[var(--neon-lime)] hover:bg-white text-black font-mono font-bold text-[10px] px-6 py-2 uppercase transition-all shadow-[0_0_10px_rgba(57,255,20,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                            style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
                          >
                            BAYAR INSTAN_
                          </Link>
                        )}
                        <button
                          onClick={() => setPilih(t.id)}
                          className="flex-1 md:flex-none text-center border border-[var(--neon-cyan)] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)] hover:text-black font-mono font-bold text-[10px] px-6 py-2 uppercase transition-all"
                          style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
                        >
                          UPLOAD BUKTI_
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
        <form onSubmit={kirimBukti} className="cyber-box space-y-8 max-w-2xl mx-auto animate-fade-in">
          
          <div className="flex items-center justify-between border-b border-[var(--neon-cyan)] pb-4">
            <h2 className="font-mono font-bold text-[var(--neon-cyan)] uppercase text-lg">&gt; UPLOAD_BUKTI_MANUAL</h2>
            <button type="button" onClick={() => setPilih(null)} className="text-[10px] font-mono text-[var(--neon-pink)] hover:text-white transition-colors uppercase">
              [ CANCEL_OP ]
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">METODE TRANSAKSI</label>
            <div className="relative">
              <select
                value={form.metode}
                onChange={(e) => setForm({ ...form, metode: e.target.value })}
                className="w-full bg-[rgba(0,0,0,0.8)] border border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono focus:outline-none focus:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all appearance-none uppercase"
                required
              >
                {METODE.map((m) => (
                  <option key={m.value} value={m.value} className="bg-black">{m.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--neon-cyan)] pointer-events-none font-mono">▼</div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              FILE GAMBAR BUKTI (FOTO/SS)
            </label>
            <div className="border-2 border-dashed border-[var(--neon-cyan)] bg-[rgba(0,243,255,0.02)] p-4 text-center hover:bg-[rgba(0,243,255,0.05)] transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="w-full text-xs font-mono text-[var(--neon-cyan)] file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[var(--neon-cyan)] file:text-black hover:file:bg-white cursor-pointer"
              />
            </div>
            {bukti && (
              <div className="mt-4 border border-[var(--neon-lime)] p-2 inline-block">
                <Image src={bukti} alt="Bukti" width={320} height={160} unoptimized className="object-cover max-h-48" />
                <p className="text-[10px] font-mono text-[var(--neon-lime)] text-center mt-2 uppercase">&gt; IMAGE_LOADED</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">CATATAN TAMBAHAN COY (OPSIONAL)</label>
            <input
              type="text"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-yellow)] px-4 py-3 text-white text-sm font-mono transition-all outline-none shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] uppercase"
              placeholder="E.G: TRANSFER DARI BCA BAPAK GUE"
            />
          </div>

          {kirimError && <p className="text-[10px] font-mono text-[var(--neon-pink)] uppercase glitch-text">&gt; ERROR: {kirimError}</p>}

          <button
            type="submit"
            disabled={mengirim}
            className="cyber-btn w-full text-sm mt-4"
          >
            {mengirim ? "UPLOADING_DATA..." : "[ KIRIM_BUKTI_SEKARANG ]"}
          </button>
        </form>
      )}
    </div>
  );
}
