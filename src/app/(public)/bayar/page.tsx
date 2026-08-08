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
  { value: "transfer", label: "Transfer Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "qris", label: "QRIS" },
  { value: "virtual_account", label: "Virtual Account" },
];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "lunas"
      ? "bg-vest/10 text-emerald-800"
      : status === "tunggakan"
        ? "bg-danger/10 text-red-800"
        : "bg-amber/10 text-yellow-800";
  const label =
    status === "lunas" ? "Lunas" : status === "tunggakan" ? "Tunggakan" : "Belum Bayar";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
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
      setError(data.error || "Terjadi kesalahan");
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
      setError("Gagal menghubungi server, coba lagi");
    } finally {
      setMencari(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setKirimError("Ukuran bukti maksimal 2MB");
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
        setKirimError(data.error || "Gagal mengirim");
      }
    } catch {
      setKirimError("Gagal mengirim, coba lagi");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-bone">Bayar Iuran Sampah</h1>
        <p className="text-bone-dim mt-2">
          Masukkan kode pelanggan untuk cek tagihan — bayar online instan atau kirim bukti transfer
        </p>
      </div>

      {sukses && (
        <div className="bg-vest/5 border border-vest/40 text-emerald-800 rounded-xl p-5 mb-6">
          <p className="font-semibold">✓ Berhasil</p>
          <p className="text-sm mt-1">{sukses}</p>
          {sukses.includes("verifikasi") && (
            <p className="text-xs mt-2 text-vest">
              Admin akan memverifikasi bukti Anda. Pantau status via menu ini kembali.
            </p>
          )}
        </div>
      )}

      {/* Step 1: Cek kode */}
      {!hasil && (
        <form onSubmit={cekTagihan} className="panel p-6 shadow-sm">
          <label className="block text-sm font-medium text-bone-dim mb-2">
            Kode Pelanggan
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-asphalt-line rounded-lg focus:outline-none focus:ring-2 focus:ring-vest text-center font-mono uppercase"
              placeholder="contoh: PLG-0001"
              required
            />
            <button
              type="submit"
              disabled={mencari}
              className="chamfer-sm bg-vest hover:bg-vest-bright disabled:opacity-50 text-asphalt-deep px-6 py-2.5 rounded-lg text-sm font-medium transition"
            >
              {mencari ? "Mencari..." : "Cek Tagihan"}
            </button>
          </div>
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
        </form>
      )}

      {/* Step 2: Daftar tagihan */}
      {hasil && !pilih && (
        <div className="space-y-4">
          <div className="panel p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-bone-dim uppercase tracking-wide">Pelanggan</p>
                <h2 className="font-display text-lg text-bone">{hasil.pelanggan.nama}</h2>
                <p className="text-sm text-bone-dim">{hasil.pelanggan.alamat}</p>
              </div>
              <span className="font-mono text-xs bg-asphalt-raised px-2 py-1 rounded">{hasil.pelanggan.kodePelanggan}</span>
            </div>
          </div>

          <h3 className="font-semibold text-bone">Tagihan Anda</h3>
          {hasil.tagihan.length === 0 ? (
            <p className="text-sm text-bone-dim bg-panel border border-asphalt-line rounded-xl p-6 text-center">
              Tidak ada tagihan
            </p>
          ) : (
            <div className="space-y-2">
              {hasil.tagihan.map((t) => (
                <div key={t.id} className="panel p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium text-bone">
                      {BULAN[t.bulan - 1]} {t.tahun}
                    </p>
                    <p className="text-xs text-bone-dim">
                      Jatuh tempo {formatDate(t.jatuhTempo)}
                    </p>
                    {t.denda ? (
                      <p className="text-xs text-danger mt-0.5">
                        + denda {formatRupiah(t.denda)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-bone">{formatRupiah(t.total ?? (t.jumlah + (t.denda || 0)))}</p>
                    <div className="mt-1 flex items-center gap-2 justify-end">
                      <StatusBadge status={t.status} />
                      {t.status !== "lunas" && (
                        <div className="flex gap-2">
                          {t.noInvoice && (
                            <Link
                              href={`/bayar-tagihan?invoice=${encodeURIComponent(t.noInvoice)}`}
                              className="text-xs chamfer-sm chamfer-sm bg-vest text-asphalt-deep px-3 py-1.5 rounded-lg hover:bg-vest-bright transition inline-flex items-center gap-1"
                              title="Bayar online instan via Payment Gateway (QRIS, transfer, e-wallet, dll)"
                            >
                              ⚡ Bayar Online
                            </Link>
                          )}
                          <button
                            onClick={() => setPilih(t.id)}
                            className="text-xs chamfer-sm chamfer-sm bg-vest text-asphalt-deep px-3 py-1.5 rounded-lg hover:bg-vest-bright transition"
                          >
                            Bayar Manual
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setHasil(null)}
            className="text-sm text-bone-dim hover:text-bone-dim underline"
          >
            ← Cek kode lain
          </button>
        </div>
      )}

      {/* Step 3: Kirim bukti */}
      {hasil && pilih && (
        <form onSubmit={kirimBukti} className="panel p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-bone">Kirim Bukti Pembayaran</h2>
            <button type="button" onClick={() => setPilih(null)} className="text-sm text-bone-dim hover:text-bone-dim">
              ← Kembali
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-bone-dim mb-1">Metode Pembayaran</label>
            <select
              value={form.metode}
              onChange={(e) => setForm({ ...form, metode: e.target.value })}
              className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm"
              required
            >
              {METODE.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-bone-dim mb-1">
              Bukti Transfer (foto, opsional tapi disarankan)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="w-full text-sm text-bone-dim file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-vest/5 file:text-vest file:text-sm file:font-medium hover:file:bg-vest/10"
            />
            {bukti && (
              <Image src={bukti} alt="Bukti" width={320} height={160} unoptimized className="mt-3 max-h-40 rounded-lg border border-asphalt-line object-cover" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-bone-dim mb-1">Catatan (opsional)</label>
            <input
              type="text"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm"
              placeholder="contoh: transfer dari BCA"
            />
          </div>

          {kirimError && <p className="text-sm text-danger">{kirimError}</p>}

          <button
            type="submit"
            disabled={mengirim}
            className="w-full chamfer-sm bg-vest hover:bg-vest-bright disabled:opacity-50 text-asphalt-deep py-2.5 rounded-lg text-sm font-medium transition"
          >
            {mengirim ? "Mengirim..." : "Kirim Bukti Pembayaran"}
          </button>
          <p className="text-xs text-bone-faint text-center">
            Bukti akan diverifikasi admin. Setelah terverifikasi, tagihan Anda otomatis lunas.
          </p>
        </form>
      )}
    </div>
  );
}
