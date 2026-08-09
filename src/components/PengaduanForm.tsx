"use client";

import { useState } from "react";

const JENIS: { value: string; label: string }[] = [
  { value: "tidak_diangkut", label: "KAGAK DIANGKUT SESUAI JADWAL" },
  { value: "sampah_menumpuk", label: "SAMPAH NUMPUK BAU BANGET" },
  { value: "lainnya", label: "MASALAH LAINNYA DAH" },
];

export default function PengaduanForm() {
  const [kodePelanggan, setKodePelanggan] = useState("");
  const [jenis, setJenis] = useState("tidak_diangkut");
  const [deskripsi, setDeskripsi] = useState("");
  const [noWa, setNoWa] = useState("");
  const [status, setStatus] = useState<"idle" | "kirim" | "ok" | "gagal">("idle");
  const [pesan, setPesan] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("kirim");
    setPesan("");
    try {
      const res = await fetch("/api/publik/pengaduan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodePelanggan, jenis, deskripsi, noWa }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("ok");
        setPesan(
          `Siappp, ngab ${data.namaPelanggan}. Laporan lu (${data.kodePelanggan}) udah nyampe ke terminal kita, langsung disikat sama tim lapangan!`
        );
        setDeskripsi("");
        setNoWa("");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "Gagal ngirim coy. Coba lagi ntar.");
      }
    } catch {
      setStatus("gagal");
      setPesan("Koneksi lu bapuk coy. Coba lagi.");
    }
  }

  return (
    <form onSubmit={submit} className="cyber-box border-red-500 bg-[rgba(255,0,0,0.02)] space-y-6">
      <div className="flex items-center justify-between border-b border-red-500/50 pb-4">
        <span className="font-mono font-bold text-red-500 uppercase tracking-widest text-lg">&gt; FORM_PENGADUAN</span>
        <span className="font-mono text-[10px] text-red-500/50 bg-red-500/10 px-2 py-1 border border-red-500/20">PUB/03_ERROR</span>
      </div>
      
      <p className="text-xs font-mono text-slate-400 leading-relaxed uppercase">
        Tulis keluhan lu di mari. Data bakal masuk secara <span className="text-red-500 font-bold glitch-text">LIVE</span> ke sistem navigasi armada kita.
      </p>

      <div className="space-y-2">
        <label className="block text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest" htmlFor="kode-pelanggan">
          &gt; KODE_ANGGOTA_LU <span className="text-red-500">*</span>
        </label>
        <input
          id="kode-pelanggan"
          value={kodePelanggan}
          onChange={(e) => setKodePelanggan(e.target.value)}
          placeholder="CONTOH: DPK-001"
          className="w-full bg-[rgba(0,0,0,0.8)] border border-red-500/50 focus:border-red-500 px-4 py-3 text-white text-sm font-mono transition-all outline-none shadow-[inset_0_0_10px_rgba(255,0,0,0.1)] uppercase"
          required
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest" htmlFor="jenis">
          &gt; JENIS_ERROR
        </label>
        <div className="relative">
          <select
            id="jenis"
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="w-full bg-[rgba(0,0,0,0.8)] border border-red-500/50 focus:border-red-500 px-4 py-3 text-white text-sm font-mono transition-all appearance-none outline-none uppercase"
          >
            {JENIS.map((j) => (
              <option key={j.value} value={j.value} className="bg-black">
                {j.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none font-mono">▼</div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest" htmlFor="deskripsi">
          &gt; CURHATAN_LU <span className="text-red-500">*</span>
        </label>
        <textarea
          id="deskripsi"
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          placeholder="TULIS DIMARI KELUHAN LU NGAB, MAKIN JELAS MAKIN BAGUS..."
          className="w-full bg-[rgba(0,0,0,0.8)] border border-red-500/50 focus:border-red-500 px-4 py-3 text-white text-sm font-mono transition-all outline-none min-h-[120px] resize-y uppercase shadow-[inset_0_0_10px_rgba(255,0,0,0.1)]"
          required
          minLength={10}
          maxLength={1000}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest" htmlFor="no-wa">
          &gt; NOMER_WA_LU (OPSIONAL)
        </label>
        <input
          id="no-wa"
          value={noWa}
          onChange={(e) => setNoWa(e.target.value)}
          placeholder="08XXXXXXXXXX"
          className="w-full bg-[rgba(0,0,0,0.8)] border border-red-500/50 focus:border-red-500 px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase"
          inputMode="tel"
        />
      </div>

      {pesan && (
        <div
          className={`border px-4 py-3 text-xs font-mono font-bold uppercase ${
            status === "ok"
              ? "border-[var(--neon-lime)] bg-[rgba(57,255,20,0.1)] text-[var(--neon-lime)] shadow-[0_0_10px_rgba(57,255,20,0.2)]"
              : "border-[var(--neon-pink)] bg-[rgba(255,0,234,0.1)] text-[var(--neon-pink)] shadow-[0_0_10px_rgba(255,0,234,0.2)] glitch-text"
          }`}
          role="status"
        >
          {pesan}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className="w-full bg-red-600 hover:bg-red-500 text-black font-mono text-sm font-bold px-8 py-4 uppercase transition-all shadow-[0_0_15px_rgba(255,0,0,0.5)] mt-4"
        style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))" }}
      >
        {status === "kirim" ? "MENGIRIM_DATA..." : "[ KIRIM_KOMPLAIN_SEKARANG ]"}
      </button>
    </form>
  );
}
