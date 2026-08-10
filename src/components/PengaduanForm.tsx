"use client";

import { useState } from "react";

const JENIS: { value: string; label: string }[] = [
  { value: "tidak_diangkut", label: "SAMPAH TIDAK DIANGKUT SESUAI JADWAL" },
  { value: "sampah_menumpuk", label: "SAMPAH MENUMPUK TERLALU LAMA" },
  { value: "lainnya", label: "KELUHAN LAINNYA" },
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
          `LAPORAN BERHASIL. TERIMA KASIH ${data.namaPelanggan}. LAPORAN (${data.kodePelanggan}) SEGERA DITINDAKLANJUTI.`
        );
        setDeskripsi("");
        setNoWa("");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "GAGAL MENGIRIM LAPORAN. COBA LAGI.");
      }
    } catch {
      setStatus("gagal");
      setPesan("KONEKSI BERMASALAH. COBA LAGI NANTI.");
    }
  }

  return (
    <form onSubmit={submit} className="hm-card space-y-6 bg-[#f4f4f0]">
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <span className="font-black uppercase text-2xl">FORMULIR PENGADUAN</span>
        <span className="font-bold text-xs uppercase bg-black text-white px-2 py-1">LAPOR.02</span>
      </div>
      
      <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
        TULIS KELUHAN ANDA DI BAWAH. DATA AKAN MASUK SECARA <span className="text-red-600">LIVE</span> KE SISTEM NAVIGASI ARMADA KAMI.
      </p>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="kode-pelanggan">
          KODE PELANGGAN <span className="text-red-600">*</span>
        </label>
        <input
          id="kode-pelanggan"
          value={kodePelanggan}
          onChange={(e) => setKodePelanggan(e.target.value)}
          placeholder="CONTOH: DPK-001"
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
          required
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="jenis">
          KATEGORI MASALAH
        </label>
        <div className="relative">
          <select
            id="jenis"
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 appearance-none uppercase"
          >
            {JENIS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-lg">▼</div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="deskripsi">
          DESKRIPSI KELUHAN <span className="text-red-600">*</span>
        </label>
        <textarea
          id="deskripsi"
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          placeholder="CERITAKAN DETAIL KELUHAN ANDA DI SINI..."
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 min-h-[120px] resize-y uppercase"
          required
          minLength={10}
          maxLength={1000}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="no-wa">
          NOMOR WHATSAPP (OPSIONAL)
        </label>
        <input
          id="no-wa"
          value={noWa}
          onChange={(e) => setNoWa(e.target.value)}
          placeholder="CONTOH: 08123456789"
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
          inputMode="tel"
        />
      </div>

      {pesan && (
        <div className={`p-4 border-2 font-bold uppercase text-sm ${status === "ok" ? "bg-green-50 border-green-600 text-green-600" : "bg-red-50 border-red-600 text-red-600"}`}>
          {pesan}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className="hm-btn-red w-full mt-4"
      >
        {status === "kirim" ? "MENGIRIM LAPORAN..." : "KIRIM PENGADUAN"}
      </button>
    </form>
  );
}
