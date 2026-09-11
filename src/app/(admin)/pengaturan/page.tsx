"use client";

import { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

type Wilayah = { id: number; nama: string; rt?: string; rw?: string; kelurahanRef?: { nama: string; kecamatan?: string | null } | null };
type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Zona = { id: number; nama: string; kelurahanId: number };
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
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [showWilayahForm, setShowWilayahForm] = useState(false);
  const [form, setForm] = useState({ nama: "", rt: "", rw: "", kelurahanId: "", zonaId: "" });
  const [duitkuStatus, setDuitkuStatus] = useState<DuitkuStatus | null>(null);
  const { showToast } = useToast();
  
  // Hapus wilayah
  const [deleteTarget, setDeleteTarget] = useState<Wilayah | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    (async () => { await fetchWilayah(); })();
    (async () => {
      const [zonaRes, kelurahanRes] = await Promise.all([
        fetch("/api/zona"),
        fetch("/api/kelurahan"),
      ]);
      setZonaList(await zonaRes.json());
      setKelurahanList(await kelurahanRes.json());
    })();

    // Status konfigurasi Duitku
    (async () => {
      try {
        const res = await fetch("/api/duitku/status");
        if (res.ok) setDuitkuStatus(await res.json());
      } catch { /* abaikan */ }
    })();
  }, [fetchWilayah]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama: form.nama,
        rt: form.rt,
        rw: form.rw,
        kelurahanId: form.kelurahanId || null,
        zonaId: form.zonaId || null,
      }),
    });
    if (res.ok) {
      setShowWilayahForm(false);
      setForm({ nama: "", rt: "", rw: "", kelurahanId: "", zonaId: "" });
      fetchWilayah();
      showToast("Wilayah berhasil ditambahkan");
    } else {
      showToast("Gagal menambahkan wilayah", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wilayah/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Wilayah berhasil dihapus");
        setDeleteTarget(null);
        fetchWilayah();
      } else {
        showToast(data.error || "Gagal menghapus wilayah", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan</h1>
        <p className="text-sm text-gray-600 font-bold mt-1">Kelola pengaturan aplikasi</p>
      </div>

      {/* Pembayaran Online (Duitku) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">💳 Pembayaran Online (Duitku)</h2>
          {duitkuStatus && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              duitkuStatus.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600"
            }`}>
              {duitkuStatus.enabled ? "✓ Aktif" : "Belum dikonfigurasi"}
            </span>
          )}
        </div>
        {!duitkuStatus ? (
          <p className="text-sm text-slate-400">Memuat status...</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Mode</p>
                <p className="font-semibold text-slate-900">
                  {duitkuStatus.production ? "Production" : "Sandbox (uji coba)"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Merchant Code</p>
                <p className={`font-semibold ${duitkuStatus.merchantCodeSet ? "text-emerald-600" : "text-rose-600"}`}>
                  {duitkuStatus.merchantCodeSet ? "✓ Terisi" : "✗ Kosong"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">API Key</p>
                <p className={`font-semibold ${duitkuStatus.apiKeySet ? "text-emerald-600" : "text-rose-600"}`}>
                  {duitkuStatus.apiKeySet ? "✓ Terisi" : "✗ Kosong"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">API</p>
                <p className="font-semibold text-slate-900">{duitkuStatus.baseUrl}</p>
              </div>
            </div>

            <div className="bg-sky-50 rounded-xl p-3.5 border border-sky-200">
              <p className="text-xs font-semibold text-sky-900 mb-1">🔗 URL Callback (isi di Dashboard Duitku → Settings → Callback URL)</p>
              <code className="text-xs text-sky-800 break-all bg-white px-2.5 py-1 rounded-lg border border-sky-100 font-mono block">{duitkuStatus.webhookUrl}</code>
            </div>

            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <li>Daftar di <b>member.duitku.com</b> (mode Sandbox untuk uji coba).</li>
              <li>Salin <b>Merchant Code</b> & <b>API Key</b> (menu Settings).</li>
              <li>Isi di file <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">.env</code>: <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">DUITKU_MERCHANT_CODE</code>, <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">DUITKU_API_KEY</code> (dan <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">DUITKU_IS_PRODUCTION</code> untuk production).</li>
              <li>Restart server, lalu tombol <b>⚡ Bayar Online</b> otomatis muncul di halaman publik /bayar & /bayar-tagihan.</li>
              <li>Pembayaran yang sukses diverifikasi otomatis via callback Duitku (tanpa perlu verifikasi admin).</li>
            </ol>
          </div>
        )}
      </div>

      {/* Manajemen Wilayah */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Wilayah / RT / RW</h2>
          <button onClick={() => setShowWilayahForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all">
            + Tambah Wilayah
          </button>
        </div>
        {wilayahList.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada wilayah. Tambah wilayah terlebih dahulu.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {wilayahList.map((w) => (
              <div key={w.id} className="relative bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs group hover:border-slate-300 transition-all">
                <p className="font-semibold text-slate-900 pr-8">{w.nama}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {[w.rt && `RT ${w.rt}`, w.rw && `RW ${w.rw}`, w.kelurahanRef?.nama].filter(Boolean).join(", ") || "-"}
                </p>
                <button
                  onClick={() => setDeleteTarget(w)}
                  className="absolute top-3 right-3 text-rose-500 opacity-60 hover:opacity-100 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                  title="Hapus Wilayah"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keamanan Akun */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-1">Keamanan Akun</h2>
        <p className="text-sm text-slate-500 mb-4">Ganti password akun Anda</p>
        <form onSubmit={handleGantiPassword} className="space-y-3.5 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Lama</label>
            <input
              type="password"
              value={pwForm.passwordLama}
              onChange={(e) => setPwForm({ ...pwForm, passwordLama: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru (min. 8 karakter)</label>
            <input
              type="password"
              value={pwForm.passwordBaru}
              onChange={(e) => setPwForm({ ...pwForm, passwordBaru: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={pwForm.konfirmasi}
              onChange={(e) => setPwForm({ ...pwForm, konfirmasi: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              minLength={8}
              required
            />
          </div>
          {pwError && <p className="text-sm text-rose-600">{pwError}</p>}
          {pwMessage && <p className="text-sm text-emerald-600">✓ {pwMessage}</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all"
          >
            {pwLoading ? "Menyimpan..." : "Ganti Password"}
          </button>
        </form>
      </div>

      {/* Informasi default */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Informasi Sistem</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <p>Dashboard ini adalah aplikasi manajemen operasional & iuran sampah mandiri (WastePay).</p>
          <p>Fitur yang tersedia:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 text-slate-500">
            <li>Manajemen pelanggan per wilayah</li>
            <li>Generate tagihan bulanan otomatis</li>
            <li>Catat pembayaran (tunai, transfer, Duitku payment gateway)</li>
            <li>Manajemen petugas dan rute</li>
            <li>Tracking pengangkutan harian</li>
            <li>Manajemen komplain warga</li>
            <li>Laporan keuangan pemasukan & pengeluaran</li>
            <li>Broadcast pengumuman via WhatsApp</li>
          </ul>
        </div>
      </div>

      {showWilayahForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-base">Tambah Wilayah</h2>
              <button onClick={() => setShowWilayahForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Wilayah *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="RT 01" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">RT</label>
                  <input type="text" value={form.rt} onChange={(e) => setForm({ ...form, rt: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">RW</label>
                  <input type="text" value={form.rw} onChange={(e) => setForm({ ...form, rw: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="003" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelurahan *</label>
                <select
                  value={form.kelurahanId}
                  onChange={(e) => setForm({ ...form, kelurahanId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                >
                  <option value="">Pilih Kelurahan</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}{k.kecamatan ? ` · ${k.kecamatan}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Zona Angkut</label>
                <select
                  value={form.zonaId}
                  onChange={(e) => setForm({ ...form, zonaId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="">Tanpa zona</option>
                  {zonaList.map((z) => (
                    <option key={z.id} value={z.id}>{z.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowWilayahForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Wilayah */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Wilayah"
        message={`Yakin ingin menghapus wilayah ${deleteTarget?.nama}? Penghapusan bisa gagal jika wilayah ini masih memiliki pelanggan atau petugas yang terdaftar.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
