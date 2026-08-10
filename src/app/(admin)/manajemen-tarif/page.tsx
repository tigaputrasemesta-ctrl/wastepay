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
  nama: string;
  harga: number;
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
  const [paketForm, setPaketForm] = useState({ nama: "", harga: "", deskripsi: "" });

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
      setPaketForm({ nama: p.nama, harga: p.harga.toString(), deskripsi: p.deskripsi || "" });
    } else {
      setPaketForm({ nama: "", harga: "", deskripsi: "" });
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
        nama: paketForm.nama,
        harga: parseInt(paketForm.harga),
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
    return <div className="p-6 font-black uppercase tracking-widest animate-pulse">Loading Data Tarif...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 border-b-4 border-black pb-4">
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black leading-none mb-1">
          MANAJEMEN TARIF
        </h1>
        <p className="text-xs font-bold uppercase tracking-widest bg-yellow-300 inline-block px-2 border-2 border-black">
          Kelola Harga Kategori Dasar dan Paket Langganan Khusus
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kategori Tarif */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between p-4 border-b-4 border-black bg-blue-300">
            <h2 className="font-black uppercase tracking-widest text-lg">Kategori Dasar</h2>
            <button
              onClick={() => openKat(null)}
              className="bg-white border-2 border-black px-3 py-1 text-xs font-black uppercase hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            >
              + Tambah
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100 text-black font-black uppercase text-[10px] border-b-2 border-black">
                  <th className="px-4 py-3 border-r-2 border-black">Label</th>
                  <th className="px-4 py-3 border-r-2 border-black">Kode ID</th>
                  <th className="px-4 py-3 border-r-2 border-black">Tarif (Rp)</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-black">
                {kategoris.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center font-black uppercase text-gray-400">Belum ada kategori</td>
                  </tr>
                ) : (
                  kategoris.map(k => (
                    <tr key={k.id} className="border-b-2 border-black hover:bg-yellow-50">
                      <td className="px-4 py-3 border-r-2 border-black font-black uppercase text-xs">{k.label}</td>
                      <td className="px-4 py-3 border-r-2 border-black font-bold text-xs"><span className="bg-gray-200 px-1 border border-black">{k.kategori}</span></td>
                      <td className="px-4 py-3 border-r-2 border-black font-black text-green-600">{k.tarif.toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openKat(k)} className="px-2 py-1 bg-yellow-300 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-yellow-400">Edit</button>
                          <button onClick={() => setDeleteKat(k)} className="px-2 py-1 bg-red-400 text-white border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-red-500">Del</button>
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
        <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between p-4 border-b-4 border-black bg-purple-300">
            <h2 className="font-black uppercase tracking-widest text-lg">Paket Khusus</h2>
            <button
              onClick={() => openPaket(null)}
              className="bg-white border-2 border-black px-3 py-1 text-xs font-black uppercase hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            >
              + Tambah
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100 text-black font-black uppercase text-[10px] border-b-2 border-black">
                  <th className="px-4 py-3 border-r-2 border-black">Nama Paket</th>
                  <th className="px-4 py-3 border-r-2 border-black">Deskripsi</th>
                  <th className="px-4 py-3 border-r-2 border-black">Tarif (Rp)</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-black">
                {pakets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center font-black uppercase text-gray-400">Belum ada paket</td>
                  </tr>
                ) : (
                  pakets.map(p => (
                    <tr key={p.id} className="border-b-2 border-black hover:bg-yellow-50">
                      <td className="px-4 py-3 border-r-2 border-black font-black uppercase text-xs">{p.nama}</td>
                      <td className="px-4 py-3 border-r-2 border-black font-bold text-xs truncate max-w-[150px]" title={p.deskripsi || ""}>{p.deskripsi || "-"}</td>
                      <td className="px-4 py-3 border-r-2 border-black font-black text-green-600">{p.harga.toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openPaket(p)} className="px-2 py-1 bg-yellow-300 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-yellow-400">Edit</button>
                          <button onClick={() => setDeletePaket(p)} className="px-2 py-1 bg-red-400 text-white border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-red-500">Del</button>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <div className="p-4 border-b-4 border-black bg-blue-300 flex justify-between items-center">
              <h2 className="font-black uppercase tracking-widest">{katEditing ? "Edit Kategori" : "Tambah Kategori"}</h2>
              <button onClick={() => setShowKatForm(false)} className="font-black text-xl hover:text-white">&times;</button>
            </div>
            <form onSubmit={saveKat} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Kode ID (Tanpa spasi)</label>
                <input type="text" value={katForm.kategori} onChange={e => setKatForm({...katForm, kategori: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" required placeholder="contoh: rumah_tangga" disabled={!!katEditing} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Label Tampilan</label>
                <input type="text" value={katForm.label} onChange={e => setKatForm({...katForm, label: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" required placeholder="contoh: Rumah Tangga Biasa" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Tarif Bulanan (Rp)</label>
                <input type="number" value={katForm.tarif} onChange={e => setKatForm({...katForm, tarif: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Deskripsi</label>
                <textarea value={katForm.deskripsi} onChange={e => setKatForm({...katForm, deskripsi: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" rows={2} />
              </div>
              <button type="submit" className="w-full bg-green-400 border-2 border-black py-3 font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-green-300">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paket */}
      {showPaketForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <div className="p-4 border-b-4 border-black bg-purple-300 flex justify-between items-center">
              <h2 className="font-black uppercase tracking-widest">{paketEditing ? "Edit Paket" : "Tambah Paket"}</h2>
              <button onClick={() => setShowPaketForm(false)} className="font-black text-xl hover:text-white">&times;</button>
            </div>
            <form onSubmit={savePaket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Nama Paket</label>
                <input type="text" value={paketForm.nama} onChange={e => setPaketForm({...paketForm, nama: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Harga Bulanan (Rp)</label>
                <input type="number" value={paketForm.harga} onChange={e => setPaketForm({...paketForm, harga: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Deskripsi</label>
                <textarea value={paketForm.deskripsi} onChange={e => setPaketForm({...paketForm, deskripsi: e.target.value})} className="w-full border-2 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:bg-yellow-100 outline-none" rows={3} />
              </div>
              <button type="submit" className="w-full bg-green-400 border-2 border-black py-3 font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-green-300">Simpan</button>
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
