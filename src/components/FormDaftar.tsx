"use client";

import { useEffect, useState } from "react";

const KATEGORI: { value: string; label: string }[] = [
  { value: "rumah_tangga", label: "RUMAH TANGGA / PRIBADI" },
  { value: "bisnis", label: "BISNIS / TOKO / WARUNG" },
  { value: "kost", label: "KOSTAN / KONTRAKAN" },
  { value: "sekolah", label: "SEKOLAHAN / YAYASAN" },
  { value: "rm_makan", label: "RUMAH MAKAN / WARTEG" },
  { value: "perkantoran", label: "KANTOR" },
  { value: "industri", label: "INDUSTRI / PABRIK" },
  { value: "lainnya", label: "LAINNYA DAH" },
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
  const [website, setWebsite] = useState("");

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
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setHasil({ kodePelanggan: data.kodePelanggan, namaPelanggan: data.namaPelanggan });
        setStatus("ok");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "GAGAL NGIRIM COY. COBA LAGI.");
      }
    } catch {
      setStatus("gagal");
      setPesan("KONEKSI BAPUK. COBA LAGI.");
    }
  }

  if (status === "ok" && hasil) {
    return (
      <div className="cyber-box border-[var(--neon-lime)] text-center p-8 bg-[rgba(57,255,20,0.05)]">
        <div className="w-16 h-16 bg-[var(--neon-lime)] flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_var(--neon-lime)]" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)" }}>
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-mono text-[var(--neon-lime)] font-bold uppercase tracking-widest mb-2 text-lg">&gt; DATA_MASUK_COY!</p>
        <h3 className="font-display font-black text-2xl text-white mb-4 uppercase">{hasil.namaPelanggan}</h3>
        <p className="text-xs font-mono text-slate-300 leading-relaxed max-w-md mx-auto uppercase">
          Data lu udah masuk ke server. Tungguin admin kita ngecek. Ntar disurvey bentar, baru deh gas!
        </p>
        {hasil.kodePelanggan && (
          <div className="mt-8 border border-[var(--neon-cyan)] bg-[rgba(0,243,255,0.1)] p-6 inline-block">
            <p className="font-mono text-slate-400 text-[10px] mb-2 uppercase">&gt; KODE_SEMENTARA_LU</p>
            <p className="font-mono font-black text-3xl text-[var(--neon-cyan)] tracking-[0.2em]">{hasil.kodePelanggan}</p>
            <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase">
              // JANGAN ILANG. DIPAKE BUAT LOGIN NTAR //
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="cyber-box border-[var(--neon-cyan)] space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--neon-cyan)] pb-4">
        <span className="font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest text-lg">&gt; FORM_PENDAFTARAN</span>
        <span className="font-mono text-[10px] text-[var(--neon-cyan)] bg-[rgba(0,243,255,0.1)] px-2 py-1 border border-[var(--neon-cyan)]">PUB/02_REG</span>
      </div>
      
      <p className="text-xs font-mono text-slate-400 leading-relaxed uppercase">
        Isi data diri lu di mari. Santai aja coy, gratis kok pendaftarannya.
      </p>

      <div>
        <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-nama">
          &gt; NAMA_LENGKAP_LU <span className="text-red-500">*</span>
        </label>
        <input
          id="d-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="NAMA ASLI LU / NAMA TOKO"
          className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
          required
          minLength={3}
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-telp">
          &gt; NOMER_WA_LU <span className="text-red-500">*</span>
        </label>
        <input
          id="d-telp"
          value={noTelepon}
          onChange={(e) => setNoTelepon(e.target.value)}
          placeholder="08XXXXXXXXXX"
          className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
          required
          inputMode="tel"
        />
        <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase">&gt; BUAT DIKABARIN KALO UDAH AKTIF</p>
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-kategori">
          &gt; KATEGORI_SAMPEL
        </label>
        <div className="relative">
          <select id="d-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all appearance-none outline-none uppercase">
            {KATEGORI.map((k) => (
              <option key={k.value} value={k.value} className="bg-black">
                {k.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--neon-cyan)] pointer-events-none font-mono">▼</div>
        </div>
        {tarifKategori && (
          <p className="text-[10px] text-[var(--neon-yellow)] mt-2 font-mono uppercase bg-[rgba(252,238,10,0.05)] border border-[var(--neon-yellow)] p-2">
            &gt; TARIF STANDAR: RP {tarifKategori.tarif.toLocaleString("id-ID")}/BULAN
            {tarifKategori.deskripsi ? ` (${tarifKategori.deskripsi})` : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-kecamatan">
            &gt; KECAMATAN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kecamatan"
              value={kecamatan}
              onChange={(e) => {
                setKecamatan(e.target.value);
                setKelurahan("");
              }}
              className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all appearance-none outline-none uppercase"
              required
            >
              <option value="" className="bg-black">— PILIH DULU —</option>
              {(opsi?.wilayah ?? []).map((w) => (
                <option key={w.kecamatan} value={w.kecamatan} className="bg-black">
                  {w.kecamatan}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--neon-cyan)] pointer-events-none font-mono">▼</div>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-kelurahan">
            &gt; KELURAHAN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kelurahan"
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
              className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all appearance-none outline-none uppercase disabled:opacity-50"
              required
              disabled={!kecamatan}
            >
              <option value="" className="bg-black">— PILIH KECAMATAN DULU —</option>
              {kelurahanList.map((kel) => (
                <option key={kel} value={kel} className="bg-black">
                  {kel}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--neon-cyan)] pointer-events-none font-mono">▼</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-alamat">
          &gt; ALAMAT_LENGKAP <span className="text-red-500">*</span>
        </label>
        <textarea
          id="d-alamat"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="NAMA JALAN, NOMER RUMAH COY"
          className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] min-h-[80px] resize-y"
          required
          minLength={10}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-rt">
            &gt; RT
          </label>
          <input
            id="d-rt"
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            placeholder="001"
            className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-rw">
            &gt; RW
          </label>
          <input
            id="d-rw"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            placeholder="003"
            className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold text-[var(--neon-cyan)] uppercase tracking-widest mb-2" htmlFor="d-patokan">
          &gt; PATOKAN_RUMAH_LU (OPSIONAL)
        </label>
        <input
          id="d-patokan"
          value={patokanLokasi}
          onChange={(e) => setPatokanLokasi(e.target.value)}
          placeholder="DEPAN WARTEG MAKMUR"
          className="w-full bg-[rgba(0,0,0,0.8)] border border-slate-700 focus:border-[var(--neon-cyan)] px-4 py-3 text-white text-sm font-mono transition-all outline-none uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Honeypot */}
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
        className="cyber-btn w-full justify-center mt-4 text-sm font-bold"
      >
        {status === "kirim" ? "MENGIRIM_DATA..." : "[ DAFTAR SEKARANG_COY ]"}
      </button>
    </form>
  );
}
