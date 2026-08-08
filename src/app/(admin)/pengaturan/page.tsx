"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRupiah } from "@/lib/utils";

type Wilayah = { id: number; nama: string; rt?: string; rw?: string; kelurahan?: string; kecamatan?: string; kota?: string };
type KategoriTarif = { id: number; kategori: string; label: string; tarif: number; deskripsi?: string };
type DuitkuStatus = {
  enabled: boolean;
  merchantCodeSet: boolean;
  apiKeySet: boolean;
  production: boolean;
  baseUrl: string;
  webhookUrl: string;
};

export default function PengaturanPage() {
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [kategoriTarifList, setKategoriTarifList] = useState<KategoriTarif[]>([]);
  const [showWilayahForm, setShowWilayahForm] = useState(false);
  const [editingTarif, setEditingTarif] = useState<{ id: number; tarif: string } | null>(null);
  const [form, setForm] = useState({ nama: "", rt: "", rw: "", kelurahan: "", kecamatan: "", kota: "" });
  const [duitkuStatus, setDuitkuStatus] = useState<DuitkuStatus | null>(null);

  // Ganti password
  const [pwForm, setPwForm] = useState({ passwordLama: "", passwordBaru: "", konfirmasi: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  async function handleGantiPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage("");
    setPwError("");
    if (pwForm.passwordBaru !== pwForm.konfirmasi) {
      setPwError("Konfirmasi password tidak cocok");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordLama: pwForm.passwordLama,
          passwordBaru: pwForm.passwordBaru,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMessage(data.message || "Password berhasil diganti");
        setPwForm({ passwordLama: "", passwordBaru: "", konfirmasi: "" });
      } else {
        setPwError(data.error || "Gagal mengganti password");
      }
    } catch {
      setPwError("Terjadi kesalahan, coba lagi");
    } finally {
      setPwLoading(false);
    }
  }

  const fetchWilayah = useCallback(async () => {
    const res = await fetch("/api/wilayah");
    setWilayahList(await res.json());
  }, []);

  const fetchKategoriTarif = useCallback(async () => {
    const res = await fetch("/api/kategori-tarif");
    setKategoriTarifList(await res.json());
  }, []);

  useEffect(() => {
    (async () => { await fetchWilayah(); await fetchKategoriTarif(); })();

    // Status konfigurasi Duitku
    (async () => {
      try {
        const res = await fetch("/api/duitku/status");
        if (res.ok) setDuitkuStatus(await res.json());
      } catch { /* abaikan */ }
    })();
  }, [fetchWilayah, fetchKategoriTarif]);

  async function updateTarif(id: number, tarif: number) {
    await fetch(`/api/kategori-tarif/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tarif }),
    });
    setEditingTarif(null);
    fetchKategoriTarif();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowWilayahForm(false);
      setForm({ nama: "", rt: "", rw: "", kelurahan: "", kecamatan: "", kota: "" });
      fetchWilayah();
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-bone">Pengaturan</h1>
        <p className="text-sm text-bone-dim mt-1">Kelola pengaturan aplikasi</p>
      </div>

      {/* Pembayaran Online (Duitku) */}
      <div className="panel p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-bone">💳 Pembayaran Online (Duitku)</h2>
          {duitkuStatus && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              duitkuStatus.enabled ? "bg-vest/10 text-emerald-800" : "bg-asphalt-raised text-bone-dim"
            }`}>
              {duitkuStatus.enabled ? "✓ Aktif" : "Belum dikonfigurasi"}
            </span>
          )}
        </div>
        {!duitkuStatus ? (
          <p className="text-sm text-bone-faint">Memuat status...</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-asphalt-deep/40 rounded-lg p-3 border border-asphalt-line">
                <p className="text-xs text-bone-dim mb-1">Mode</p>
                <p className="font-medium text-bone">
                  {duitkuStatus.production ? "Production" : "Sandbox (uji coba)"}
                </p>
              </div>
              <div className="bg-asphalt-deep/40 rounded-lg p-3 border border-asphalt-line">
                <p className="text-xs text-bone-dim mb-1">Merchant Code</p>
                <p className={`font-medium ${duitkuStatus.merchantCodeSet ? "text-vest" : "text-danger"}`}>
                  {duitkuStatus.merchantCodeSet ? "✓ Terisi" : "✗ Kosong"}
                </p>
              </div>
              <div className="bg-asphalt-deep/40 rounded-lg p-3 border border-asphalt-line">
                <p className="text-xs text-bone-dim mb-1">API Key</p>
                <p className={`font-medium ${duitkuStatus.apiKeySet ? "text-vest" : "text-danger"}`}>
                  {duitkuStatus.apiKeySet ? "✓ Terisi" : "✗ Kosong"}
                </p>
              </div>
              <div className="bg-asphalt-deep/40 rounded-lg p-3 border border-asphalt-line">
                <p className="text-xs text-bone-dim mb-1">API</p>
                <p className="font-medium text-bone">{duitkuStatus.baseUrl}</p>
              </div>
            </div>

            <div className="bg-vest/5 rounded-lg p-3 border border-vest/40">
              <p className="text-xs font-medium text-blue-800 mb-1">🔗 URL Callback (isi di Dashboard Duitku → Settings → Callback URL)</p>
              <code className="text-xs text-vest break-all bg-asphalt-deep/80 px-2 py-1 rounded block">{duitkuStatus.webhookUrl}</code>
            </div>

            <ol className="text-xs text-bone-dim space-y-1 list-decimal list-inside">
              <li>Daftar di <b>member.duitku.com</b> (mode Sandbox untuk uji coba).</li>
              <li>Salin <b>Merchant Code</b> & <b>API Key</b> (menu Settings).</li>
              <li>Isi di file <code className="bg-asphalt-raised px-1 rounded">.env</code>: <code className="bg-asphalt-raised px-1 rounded">DUITKU_MERCHANT_CODE</code>, <code className="bg-asphalt-raised px-1 rounded">DUITKU_API_KEY</code> (dan <code className="bg-asphalt-raised px-1 rounded">DUITKU_IS_PRODUCTION</code> untuk production).</li>
              <li>Restart server, lalu tombol <b>⚡ Bayar Online</b> otomatis muncul di halaman publik /bayar & /bayar-tagihan.</li>
              <li>Pembayaran yang sukses diverifikasi otomatis via callback Duitku (tanpa perlu verifikasi admin).</li>
            </ol>
          </div>
        )}
      </div>

      {/* Manajemen Wilayah */}
      <div className="panel p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-bone">Wilayah / RT / RW</h2>
          <button onClick={() => setShowWilayahForm(true)} className="chamfer-sm bg-vest hover:bg-vest-bright text-asphalt-deep px-3 py-1.5 rounded-lg text-xs font-medium transition">
            + Tambah Wilayah
          </button>
        </div>
        {wilayahList.length === 0 ? (
          <p className="text-sm text-bone-faint">Belum ada wilayah. Tambah wilayah terlebih dahulu.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {wilayahList.map((w) => (
              <div key={w.id} className="bg-asphalt-deep/40 rounded-lg p-3 border border-asphalt-line">
                <p className="font-medium text-bone">{w.nama}</p>
                <p className="text-xs text-bone-dim mt-1">
                  {[w.rt && `RT ${w.rt}`, w.rw && `RW ${w.rw}`, w.kelurahan, w.kecamatan, w.kota].filter(Boolean).join(", ") || "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tarif per Kategori */}
      <div className="panel p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-bone">Tarif Default per Kategori</h2>
          <p className="text-xs text-bone-faint">Tarif otomatis saat daftar baru</p>
        </div>
        {kategoriTarifList.length === 0 ? (
          <p className="text-sm text-bone-faint">Belum ada data tarif</p>
        ) : (
          <div className="space-y-2">
            {kategoriTarifList.map((kt) => (
              <div key={kt.id} className="flex items-center justify-between bg-asphalt-deep/40 rounded-lg p-3 border border-asphalt-line">
                <div>
                  <p className="font-medium text-bone text-sm">{kt.label}</p>
                  {kt.deskripsi && <p className="text-xs text-bone-dim">{kt.deskripsi}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {editingTarif?.id === kt.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editingTarif.tarif}
                        onChange={(e) => setEditingTarif({ ...editingTarif, tarif: e.target.value })}
                        className="w-24 px-2 py-1 border border-asphalt-line rounded text-sm text-right"
                      />
                      <button
                        onClick={() => updateTarif(kt.id, parseFloat(editingTarif.tarif))}
                        className="text-xs chamfer-sm chamfer-sm bg-vest text-asphalt-deep px-2 py-1 rounded hover:bg-vest-bright"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => setEditingTarif(null)}
                        className="text-xs text-bone-dim hover:text-bone-dim"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-vest text-sm">{formatRupiah(kt.tarif)}</span>
                      <button
                        onClick={() => setEditingTarif({ id: kt.id, tarif: kt.tarif.toString() })}
                        className="text-xs text-bone-dim hover:text-indigo-800"
                      >
                        Ubah
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keamanan Akun */}
      <div className="panel p-5 mb-6">
        <h2 className="font-semibold text-bone mb-1">Keamanan Akun</h2>
        <p className="text-sm text-bone-dim mb-4">Ganti password akun Anda</p>
        <form onSubmit={handleGantiPassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm font-medium text-bone-dim mb-1">Password Lama</label>
            <input
              type="password"
              value={pwForm.passwordLama}
              onChange={(e) => setPwForm({ ...pwForm, passwordLama: e.target.value })}
              className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vest"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bone-dim mb-1">Password Baru (min. 8 karakter)</label>
            <input
              type="password"
              value={pwForm.passwordBaru}
              onChange={(e) => setPwForm({ ...pwForm, passwordBaru: e.target.value })}
              className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vest"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bone-dim mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={pwForm.konfirmasi}
              onChange={(e) => setPwForm({ ...pwForm, konfirmasi: e.target.value })}
              className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vest"
              minLength={8}
              required
            />
          </div>
          {pwError && <p className="text-sm text-danger">{pwError}</p>}
          {pwMessage && <p className="text-sm text-vest">✓ {pwMessage}</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 chamfer-sm bg-vest hover:bg-vest-bright disabled:opacity-50 text-asphalt-deep rounded-lg text-sm font-medium transition"
          >
            {pwLoading ? "Menyimpan..." : "Ganti Password"}
          </button>
        </form>
      </div>

      {/* Informasi default */}
      <div className="panel p-5">
        <h2 className="font-semibold text-bone mb-4">Informasi</h2>
        <div className="space-y-2 text-sm text-bone-dim">
          <p>Dashboard ini adalah aplikasi manajemen iuran sampah untuk pengelola.</p>
          <p>Fitur yang tersedia:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Manajemen pelanggan per wilayah</li>
            <li>Generate tagihan bulanan otomatis</li>
            <li>Catat pembayaran (tunai, transfer, dll)</li>
            <li>Manajemen petugas dan rute</li>
            <li>Tracking pengangkutan harian</li>
            <li>Manajemen komplain warga</li>
            <li>Laporan keuangan pemasukan & pengeluaran</li>
            <li>Broadcast pengumuman</li>
          </ul>
        </div>
      </div>

      {showWilayahForm && (
        <div className="fixed inset-0 bg-asphalt-deep/70 flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-asphalt-line">
              <h2 className="font-semibold text-bone">Tambah Wilayah</h2>
              <button onClick={() => setShowWilayahForm(false)} className="text-bone-faint hover:text-bone-dim">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Nama Wilayah *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" placeholder="RT 01" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">RT</label>
                  <input type="text" value={form.rt} onChange={(e) => setForm({ ...form, rt: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" placeholder="001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">RW</label>
                  <input type="text" value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" placeholder="003" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bone-dim mb-1">Kelurahan</label>
                <input type="text" value={form.kelurahan} onChange={(e) => setForm({ ...form, kelurahan: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Kecamatan</label>
                  <input type="text" value={form.kecamatan} onChange={(e) => setForm({ ...form, kecamatan: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bone-dim mb-1">Kota</label>
                  <input type="text" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} className="w-full px-3 py-2 border border-asphalt-line rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowWilayahForm(false)} className="flex-1 px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm hover:bg-vest-bright">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
