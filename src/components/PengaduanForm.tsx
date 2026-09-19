"use client";

import { useState } from "react";

const JENIS: { value: string; label: string }[] = [
  { value: "tidak_diangkut", label: "Sampah tidak diangkut sesuai jadwal" },
  { value: "sampah_menumpuk", label: "Volume sampah menumpuk melebihi kapasitas" },
  { value: "lainnya", label: "Kendala atau masukan lainnya" },
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
          `Laporan berhasil dikirim. Terima kasih ${data.namaPelanggan}. Tim reaksi cepat UPS HERU akan segera menindaklanjuti ke lokasi Anda.`
        );
        setDeskripsi("");
        setNoWa("");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "Gagal mengirimkan pengaduan. Silakan coba kembali.");
      }
    } catch {
      setStatus("gagal");
      setPesan("Koneksi bermasalah. Mohon coba beberapa saat lagi.");
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-extrabold text-base text-slate-900">Formulir Laporan Kendala</h2>
          <p className="text-xs text-slate-500">Sampaikan detail kendala pengangkutan sampah Anda</p>
        </div>
        <span className="font-bold text-[10px] tracking-wide bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full">
          BANTUAN
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700" htmlFor="kode-pelanggan">
          Nomor WhatsApp / Kode Pelanggan <span className="text-rose-500">*</span>
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
          placeholder="Contoh: Sampah di depan rumah belum diangkut sejak kemarin jadwal pagi..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[110px] resize-y placeholder:text-slate-400"
          required
          minLength={10}
          maxLength={1000}
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

      {pesan && (
        <div className={`p-4 rounded-2xl text-xs font-medium border ${status === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
          {pesan}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "kirim" ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Mengirimkan Laporan...</span>
          </>
        ) : (
          <span>Kirim Laporan Pengaduan 📢</span>
        )}
      </button>
    </form>
  );
}
