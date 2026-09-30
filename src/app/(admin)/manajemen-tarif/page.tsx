"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type KategoriTarif = {
  id: number;
  kategori: string;
  label: string;
  tarif: number;
  deskripsi: string | null;
};

type Paket = {
  id: number;
  kode: string | null;
  nama: string;
  harga: number | null;
  deskripsi: string | null;
};

export default function TarifPage() {
  const { showToast } = useToast();
  
  // States
  const [kategoris, setKategoris] = useState<KategoriTarif[]>([]);
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showKatForm, setShowKatForm] = useState(false);
  const [katEditing, setKatEditing] = useState<KategoriTarif | null>(null);
  
  const [showPaketForm, setShowPaketForm] = useState(false);
  const [paketEditing, setPaketEditing] = useState<Paket | null>(null);

  // Form States
  const [katForm, setKatForm] = useState({ kategori: "", label: "", tarif: "", deskripsi: "" });
  const [paketForm, setPaketForm] = useState({ kode: "", nama: "", harga: "", deskripsi: "" });

  // Delete States
  const [deleteKat, setDeleteKat] = useState<KategoriTarif | null>(null);
  const [deletePaket, setDeletePaket] = useState<Paket | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchData() {
    try {
      const [katRes, paketRes] = await Promise.all([
        fetch("/api/kategori-tarif"),
        fetch("/api/paket")
      ]);
      setKategoris(await katRes.json());
      setPakets(await paketRes.json());
    } catch {
      showToast("Gagal memuat data tarif", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Data fetch on mount: setState terjadi setelah await fetch (async), bukan
    // sinkron di body effect — rule ini false-positive untuk pola ini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData stabil, hanya dipanggil sekali saat mount
  }, []);

  // Kategori Handlers
  function openKat(k: KategoriTarif | null = null) {
    setKatEditing(k);
    if (k) {
      setKatForm({ kategori: k.kategori, label: k.label, tarif: k.tarif.toString(), deskripsi: k.deskripsi || "" });
    } else {
      setKatForm({ kategori: "", label: "", tarif: "", deskripsi: "" });
    }
    setShowKatForm(true);
  }

  async function saveKat(e: React.FormEvent) {
    e.preventDefault();
    const url = katEditing ? `/api/kategori-tarif/${katEditing.id}` : "/api/kategori-tarif";
    const method = katEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kategori: katForm.kategori,
        label: katForm.label,
        tarif: parseInt(katForm.tarif),
        deskripsi: katForm.deskripsi
      }),
    });

    if (res.ok) {
      setShowKatForm(false);
      showToast("Kategori Tarif berhasil disimpan!");
      fetchData();
    } else {
      showToast("Gagal menyimpan kategori", "error");
    }
  }

  async function confirmDeleteKat() {
    if (!deleteKat) return;
    setDeleting(true);
    const res = await fetch(`/api/kategori-tarif/${deleteKat.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Kategori berhasil dihapus");
      setDeleteKat(null);
      fetchData();
    } else {
      showToast("Gagal menghapus kategori", "error");
    }
  }

  // Paket Handlers
  function openPaket(p: Paket | null = null) {
    setPaketEditing(p);
    if (p) {
      setPaketForm({ kode: p.kode || "", nama: p.nama, harga: p.harga != null ? p.harga.toString() : "", deskripsi: p.deskripsi || "" });
    } else {
      setPaketForm({ kode: "", nama: "", harga: "", deskripsi: "" });
    }
    setShowPaketForm(true);
  }

  async function savePaket(e: React.FormEvent) {
    e.preventDefault();
    const url = paketEditing ? `/api/paket/${paketEditing.id}` : "/api/paket";
    const method = paketEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kode: paketForm.kode,
        nama: paketForm.nama,
        harga: paketForm.harga.trim() !== "" ? parseInt(paketForm.harga) : null,
        deskripsi: paketForm.deskripsi
      }),
    });

    if (res.ok) {
      setShowPaketForm(false);
      showToast("Paket berhasil disimpan!");
      fetchData();
    } else {
      showToast("Gagal menyimpan paket", "error");
    }
  }

  async function confirmDeletePaket() {
    if (!deletePaket) return;
    setDeleting(true);
    const res = await fetch(`/api/paket/${deletePaket.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      showToast("Paket berhasil dihapus");
      setDeletePaket(null);
      fetchData();
    } else {
      showToast("Gagal menghapus paket", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-8 w-full flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-600 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data tarif...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
          Manajemen Tarif
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Kelola struktur harga kategori dasar dan paket langganan khusus pelanggan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kategori Tarif */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/70">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Kategori Dasar</h2>
              <p className="text-xs text-slate-500">Tarif standar per kategori pelanggan</p>
            </div>
            <button
              onClick={() => openKat(null)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              + Tambah
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-5 py-3">Label</th>
                  <th className="px-5 py-3">Kode ID</th>
                  <th className="px-5 py-3">Tarif (Rp)</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kategoris.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-600 font-medium text-xs">Belum ada kategori</td>
                  </tr>
                ) : (
                  kategoris.map(k => (
                    <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs">{k.label}</td>
                      <td className="px-5 py-3.5"><span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{k.kategori}</span></td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700 text-xs">{k.tarif.toLocaleString("id-ID")}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => openKat(k)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all">Edit</button>
                          <button onClick={() => setDeleteKat(k)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-all">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paket Langganan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/70">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Paket Khusus</h2>
              <p className="text-xs text-slate-500">Opsi langganan khusus atau promosi</p>
            </div>
            <button
              onClick={() => openPaket(null)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              + Tambah
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-5 py-3">Nama Paket</th>
                  <th className="px-5 py-3">Kode ID</th>
                  <th className="px-5 py-3">Deskripsi</th>
                  <th className="px-5 py-3">Tarif (Rp)</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pakets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-600 font-medium text-xs">Belum ada paket</td>
                  </tr>
                ) : (
                  pakets.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs">{p.nama}</td>
                      <td className="px-5 py-3.5"><span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{p.kode || "—"}</span></td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 truncate max-w-[140px]" title={p.deskripsi || ""}>{p.deskripsi || "-"}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700 text-xs">{p.harga != null ? p.harga.toLocaleString("id-ID") : "Variabel"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => openPaket(p)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all">Edit</button>
                          <button onClick={() => setDeletePaket(p)} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-all">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Kategori */}
      {showKatForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-base">{katEditing ? "Edit Kategori" : "Tambah Kategori Baru"}</h2>
                <p className="text-xs text-slate-500">Sesuaikan kode, nama tampilan, dan nominal tarif</p>
              </div>
              <button onClick={() => setShowKatForm(false)} className="text-slate-600 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={saveKat} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kode ID (Tanpa spasi)</label>
                <input type="text" value={katForm.kategori} onChange={e => setKatForm({...katForm, kategori: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required placeholder="contoh: level_1" disabled={!!katEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Label Tampilan</label>
                <input type="text" value={katForm.label} onChange={e => setKatForm({...katForm, label: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required placeholder="contoh: Rumah Tangga Biasa" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tarif Bulanan (Rp)</label>
                <input type="number" value={katForm.tarif} onChange={e => setKatForm({...katForm, tarif: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                <textarea value={katForm.deskripsi} onChange={e => setKatForm({...katForm, deskripsi: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" rows={2} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowKatForm(false)} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold transition-all">Batal</button>
                <button type="submit" className="w-2/3 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all">Simpan Kategori</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paket */}
      {showPaketForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-base">{paketEditing ? "Edit Paket Khusus" : "Tambah Paket Khusus"}</h2>
                <p className="text-xs text-slate-500">Sesuaikan paket berlangganan atau program custom</p>
              </div>
              <button onClick={() => setShowPaketForm(false)} className="text-slate-600 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={savePaket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kode ID (opsional)</label>
                <input type="text" value={paketForm.kode} onChange={e => setPaketForm({...paketForm, kode: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="contoh: paket_event" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Paket</label>
                <input type="text" value={paketForm.nama} onChange={e => setPaketForm({...paketForm, nama: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Harga Bulanan (Rp) — kosongkan jika variabel</label>
                <input type="number" value={paketForm.harga} onChange={e => setPaketForm({...paketForm, harga: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                <textarea value={paketForm.deskripsi} onChange={e => setPaketForm({...paketForm, deskripsi: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" rows={3} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPaketForm(false)} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold transition-all">Batal</button>
                <button type="submit" className="w-2/3 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all">Simpan Paket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals Delete */}
      <ConfirmDialog
        open={!!deleteKat}
        title="Hapus Kategori"
        message={`Hapus kategori tarif ${deleteKat?.label}?`}
        onConfirm={confirmDeleteKat}
        onCancel={() => setDeleteKat(null)}
        loading={deleting}
      />
      <ConfirmDialog
        open={!!deletePaket}
        title="Hapus Paket"
        message={`Hapus paket langganan ${deletePaket?.nama}?`}
        onConfirm={confirmDeletePaket}
        onCancel={() => setDeletePaket(null)}
        loading={deleting}
      />
    </div>
  );
}
