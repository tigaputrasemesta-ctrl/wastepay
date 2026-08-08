"use client";

import { useEffect, useState } from "react";

const KATEGORI: { value: string; label: string }[] = [
  { value: "rumah_tangga", label: "Rumah Tangga" },
  { value: "bisnis", label: "Bisnis / Toko" },
  { value: "kost", label: "Kost / Kontrakan" },
  { value: "sekolah", label: "Sekolah / Lembaga" },
  { value: "rm_makan", label: "Rumah Makan" },
  { value: "perkantoran", label: "Kantor" },
  { value: "industri", label: "Industri" },
  { value: "lainnya", label: "Lainnya" },
];

type WilayahKec = { kecamatan: string; kelurahan: string[] };
type Paket = { id: number; nama: string; harga: number; deskripsi: string | null };
type KategoriTarif = { kategori: string; label: string; tarif: number; deskripsi: string | null };

export default function FormDaftar() {
  const [nama, setNama] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [kategori, setKategori] = useState("rumah_tangga");
  const [kecamatan, setKecamatan] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const [patokanLokasi, setPatokanLokasi] = useState("");
  const [paketId, setPaketId] = useState("");
  const [penanggungjawab, setPenanggungjawab] = useState("");
  const [referal, setReferal] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — jangan diisi manusia

  const [opsi, setOpsi] = useState<{
    wilayah: WilayahKec[];
    paket: Paket[];
    kategoriTarif: KategoriTarif[];
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "kirim" | "ok" | "gagal">("idle");
  const [pesan, setPesan] = useState("");
  const [hasil, setHasil] = useState<{ kodePelanggan: string; namaPelanggan: string } | null>(null);

  useEffect(() => {
    fetch("/api/publik/daftar-options")
      .then((r) => r.json())
      .then((d) => setOpsi(d))
      .catch(() => setOpsi({ wilayah: [], paket: [], kategoriTarif: [] }));
  }, []);

  const kelurahanList = opsi?.wilayah.find((w) => w.kecamatan === kecamatan)?.kelurahan ?? [];
  const tarifKategori = opsi?.kategoriTarif.find((k) => k.kategori === kategori);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          penanggungjawab,
          referal,
          website, // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setHasil({ kodePelanggan: data.kodePelanggan, namaPelanggan: data.namaPelanggan });
        setStatus("ok");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setStatus("gagal");
      setPesan("Koneksi bermasalah. Coba lagi.");
    }
  }

  if (status === "ok" && hasil) {
    return (
      <div className="panel p-5 sm:p-6 text-center">
        <div className="w-14 h-14 chamfer-sm bg-vest/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-vest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="stencil text-vest mb-2">PENDAFTARAN DITERIMA</p>
        <h3 className="font-display text-xl text-bone mb-2">{hasil.namaPelanggan}</h3>
        <p className="text-sm text-bone-dim leading-relaxed">
          Data Anda sudah kami terima dan sedang menunggu konfirmasi pengelola.
          Petugas akan menghubungi Anda untuk survei & aktivasi layanan.
        </p>
        {hasil.kodePelanggan && (
          <div className="mt-5 bg-asphalt-deep/40 chamfer-sm p-4 inline-block">
            <p className="stencil text-bone-faint text-[10px] mb-1.5">KODE PELANGGAN SEMENTARA</p>
            <p className="font-display text-2xl text-vest tracking-widest">{hasil.kodePelanggan}</p>
            <p className="text-[11px] text-bone-faint mt-1 font-mono">
              Simpan — dipakai saat pendaftaran disetujui
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="stencil text-vest">FORM PENDAFTARAN</span>
        <span className="font-mono text-[10px] text-bone-faint">PUB/02</span>
      </div>
      <p className="text-sm text-bone-faint leading-relaxed">
        Isi data di bawah — petugas kami akan menghubungi Anda untuk survei lokasi
        dan aktivasi layanan.
      </p>

      <div>
        <label className="label" htmlFor="d-nama">
          Nama Lengkap <span className="text-danger">*</span>
        </label>
        <input
          id="d-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama Anda / pemilik usaha"
          className="input"
          required
          minLength={3}
        />
      </div>

      <div>
        <label className="label" htmlFor="d-telp">
          No. WhatsApp <span className="text-danger">*</span>
        </label>
        <input
          id="d-telp"
          value={noTelepon}
          onChange={(e) => setNoTelepon(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="input"
          required
          inputMode="tel"
        />
        <p className="text-xs text-bone-faint mt-1">Konfirmasi pendaftaran dikirim ke nomor ini</p>
      </div>

      <div>
        <label className="label" htmlFor="d-kategori">
          Kategori Layanan
        </label>
        <select id="d-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="input">
          {KATEGORI.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        {tarifKategori && (
          <p className="text-xs text-bone-faint mt-1 font-mono">
            Tarif dasar {tarifKategori.label.toLowerCase()}:{" "}
            <span className="text-vest">Rp {tarifKategori.tarif.toLocaleString("id-ID")}/bulan</span>
            {tarifKategori.deskripsi ? ` — ${tarifKategori.deskripsi}` : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="d-kecamatan">
            Kecamatan <span className="text-danger">*</span>
          </label>
          <select
            id="d-kecamatan"
            value={kecamatan}
            onChange={(e) => {
              setKecamatan(e.target.value);
              setKelurahan("");
            }}
            className="input"
            required
          >
            <option value="">— Pilih —</option>
            {(opsi?.wilayah ?? []).map((w) => (
              <option key={w.kecamatan} value={w.kecamatan}>
                {w.kecamatan}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="d-kelurahan">
            Kelurahan <span className="text-danger">*</span>
          </label>
          <select
            id="d-kelurahan"
            value={kelurahan}
            onChange={(e) => setKelurahan(e.target.value)}
            className="input"
            required
            disabled={!kecamatan}
          >
            <option value="">— Pilih —</option>
            {kelurahanList.map((kel) => (
              <option key={kel} value={kel}>
                {kel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="d-alamat">
          Alamat Lengkap <span className="text-danger">*</span>
        </label>
        <textarea
          id="d-alamat"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Nama jalan, gang, nomor rumah"
          className="input min-h-[72px] resize-y"
          required
          minLength={10}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="d-rt">
            RT <span className="text-bone-faint normal-case">(opsional)</span>
          </label>
          <input
            id="d-rt"
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            placeholder="001"
            className="input"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="label" htmlFor="d-rw">
            RW <span className="text-bone-faint normal-case">(opsional)</span>
          </label>
          <input
            id="d-rw"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            placeholder="003"
            className="input"
            inputMode="numeric"
          />
        </div>
      </div>
      <p className="text-[11px] text-bone-faint -mt-2 font-mono">
        RT/RW membantu petugas menemukan lokasi Anda lebih cepat
      </p>

      <div>
        <label className="label" htmlFor="d-patokan">
          Patokan Lokasi <span className="text-bone-faint normal-case">(opsional)</span>
        </label>
        <input
          id="d-patokan"
          value={patokanLokasi}
          onChange={(e) => setPatokanLokasi(e.target.value)}
          placeholder="Contoh: dekat masjid, samping minimarket"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="d-paket">
          Paket Layanan <span className="text-bone-faint normal-case">(opsional)</span>
        </label>
        <select id="d-paket" value={paketId} onChange={(e) => setPaketId(e.target.value)} className="input">
          <option value="">— Pilih paket (opsional) —</option>
          {(opsi?.paket ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} — Rp {p.harga.toLocaleString("id-ID")}/bulan{p.deskripsi ? ` (${p.deskripsi})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="d-pj">
          Penanggung Jawab <span className="text-bone-faint normal-case">(opsional)</span>
        </label>
        <input
          id="d-pj"
          value={penanggungjawab}
          onChange={(e) => setPenanggungjawab(e.target.value)}
          placeholder="Kepala keluarga / pemilik usaha"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="d-referal">
          Referal <span className="text-bone-faint normal-case">(opsional — siapa yang merekomendasikan)</span>
        </label>
        <input
          id="d-referal"
          value={referal}
          onChange={(e) => setReferal(e.target.value)}
          placeholder="Nama warga/petugas yang merekomendasikan"
          className="input"
        />
      </div>

      {/* Honeypot — disembunyikan, hanya bot yang mengisi */}
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
        {status === "kirim" ? "MENGIRIM…" : "DAFTAR SEKARANG"}
      </button>
      <p className="text-[11px] text-bone-faint text-center font-mono">
        Gratis, tanpa biaya pendaftaran · ditindaklanjuti petugas wilayah
      </p>
    </form>
  );
}
