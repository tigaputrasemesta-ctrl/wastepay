"use client";

import { useState } from "react";

const JENIS: { value: string; label: string }[] = [
  { value: "tidak_diangkut", label: "Sampah tidak diangkut sesuai jadwal" },
  { value: "sampah_menumpuk", label: "Sampah menumpuk / tidak diambil" },
  { value: "lainnya", label: "Keluhan lainnya" },
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
          `Terima kasih, ${data.namaPelanggan}. Pengaduan Anda (${data.kodePelanggan}) sudah tercatat dan diteruskan ke tim lapangan.`
        );
        setDeskripsi("");
        setNoWa("");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setStatus("gagal");
      setPesan("Koneksi bermasalah. Coba lagi.");
    }
  }

  return (
    <form onSubmit={submit} className="panel p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="stencil text-danger">PENGADUAN WARGA</span>
        <span className="font-mono text-[10px] text-bone-faint">PUB/03</span>
      </div>
      <p className="text-sm text-bone-faint leading-relaxed">
        Sampah tidak diangkut atau menumpuk? Laporkan di sini — pengaduan masuk{" "}
        <span className="text-vest font-mono text-xs">LIVE</span> ke peta petugas dan
        langsung kami tindaklanjuti.
      </p>

      <div>
        <label className="label" htmlFor="kode-pelanggan">
          Kode Pelanggan <span className="text-danger">*</span>
        </label>
        <input
          id="kode-pelanggan"
          value={kodePelanggan}
          onChange={(e) => setKodePelanggan(e.target.value)}
          placeholder="contoh: P000001 (ada di kartu/barcode)"
          className="input"
          required
          autoComplete="off"
        />
      </div>

      <div>
        <label className="label" htmlFor="jenis">
          Jenis Keluhan
        </label>
        <select
          id="jenis"
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          className="input"
        >
          {JENIS.map((j) => (
            <option key={j.value} value={j.value}>
              {j.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="deskripsi">
          Uraian Keluhan <span className="text-danger">*</span>
        </label>
        <textarea
          id="deskripsi"
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          placeholder="Contoh: Sampah di depan rumah belum diambil sejak 2 hari lalu, sudah menumpuk."
          className="input min-h-[96px] resize-y"
          required
          minLength={10}
          maxLength={1000}
        />
      </div>

      <div>
        <label className="label" htmlFor="no-wa">
          No. WhatsApp (opsional, untuk kabar tindak lanjut)
        </label>
        <input
          id="no-wa"
          value={noWa}
          onChange={(e) => setNoWa(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="input"
          inputMode="tel"
        />
      </div>

      {pesan && (
        <div
          className={`border px-3 py-2.5 text-sm font-mono text-xs ${
            status === "ok"
              ? "border-vest/40 bg-vest/10 text-vest"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
          role="status"
        >
          {pesan}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className="btn btn-primary w-full justify-center"
      >
        {status === "kirim" ? "MENGIRIM…" : "KIRIM PENGADUAN"}
      </button>
    </form>
  );
}
