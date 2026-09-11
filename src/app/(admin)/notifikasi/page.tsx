"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type Pelanggan = { id: number; nama: string; noTelepon: string };
type Notifikasi = {
  id: number;
  tipe: string;
  judul: string;
  pesan: string;
  penerima: string;
  status: string;
  createdAt: string;
  pelanggan?: { nama: string } | null;
};

const TIPE_NOTIF = [
  { value: "pengumuman", label: "Pengumuman" },
  { value: "tagihan_jatuh_tempo", label: "Tagihan Jatuh Tempo" },
  { value: "jadwal_pengangkutan", label: "Jadwal Pengangkutan" },
  { value: "komplain_diproses", label: "Komplain Diproses" },
];

export default function NotifikasiPage() {
  const { showToast } = useToast();
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [riwayat, setRiwayat] = useState<Notifikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    links?: string[];
    failures?: string[];
  } | null>(null);
  const [form, setForm] = useState({
    tipe: "pengumuman",
    judul: "",
    pesan: "",
    pelangganId: "",
    semuaPelanggan: true,
  });

  const fetchData = useCallback(async () => {
    const [pelRes, notifRes] = await Promise.all([
      fetch("/api/pelanggan"),
      fetch("/api/notifikasi"),
    ]);
    setPelangganList(await pelRes.json());
    setRiwayat(await notifRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const res = await fetch("/api/notifikasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipe: form.tipe,
        judul: form.judul,
        pesan: form.pesan,
        pelangganId: form.semuaPelanggan ? undefined : form.pelangganId || undefined,
      }),
    });

    const data = await res.json();
    setResult(data);
    setSending(false);

    if (res.ok) {
      setForm({ tipe: "pengumuman", judul: "", pesan: "", pelangganId: "", semuaPelanggan: true });
      showToast("Notifikasi berhasil dikirim");
      fetchData();
    } else {
      showToast(data.error || "Gagal mengirim notifikasi", "error");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifikasi WhatsApp</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">Kirim pengumuman & pengingat ke pelanggan</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setResult(null); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Kirim Notifikasi
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => {
            setForm({ tipe: "tagihan_jatuh_tempo", judul: "Pengingat Tagihan", pesan: "Yth. Pelanggan UPS HERU,\n\nTagihan bulan ini sudah tersedia. Mohon segera melakukan pembayaran sebelum tanggal 15.\n\nTerima kasih.", pelangganId: "", semuaPelanggan: true });
            setShowForm(true);
          }}
          className="bg-hm-card bg-white p-0 overflow-hidden border border-slate-200/80 rounded-none-xl p-4 text-left hover:border-vest/40 transition text-sm"
        >
          <p className="font-semibold text-black font-black">📋 Pengingat Tagihan</p>
          <p className="text-gray-600 font-bold mt-1">Kirim pengingat pembayaran ke semua pelanggan</p>
        </button>
        <button
          onClick={() => {
            setForm({ tipe: "jadwal_pengangkutan", judul: "Jadwal Pengangkutan", pesan: "Yth. Pelanggan UPS HERU,\n\nPengangkutan sampah akan dilakukan besok sesuai jadwal. Mohon siapkan sampah di depan rumah.\n\nTerima kasih.", pelangganId: "", semuaPelanggan: true });
            setShowForm(true);
          }}
          className="bg-hm-card bg-white p-0 overflow-hidden border border-slate-200/80 rounded-none-xl p-4 text-left hover:border-vest/40 transition text-sm"
        >
          <p className="font-semibold text-black font-black">🗑️ Pengingat Jadwal</p>
          <p className="text-gray-600 font-bold mt-1">Info jadwal pengangkutan besok</p>
        </button>
        <button
          onClick={() => {
            setForm({ tipe: "pengumuman", judul: "Pengumuman Libur", pesan: "Yth. Pelanggan UPS HERU,\n\nDiberitahukan bahwa layanan pengangkutan sampah libur pada hari besar nasional. Jadwal akan kembali normal pada hari berikutnya.\n\nTerima kasih.", pelangganId: "", semuaPelanggan: true });
            setShowForm(true);
          }}
          className="bg-hm-card bg-white p-0 overflow-hidden border border-slate-200/80 rounded-none-xl p-4 text-left hover:border-vest/40 transition text-sm"
        >
          <p className="font-semibold text-black font-black">📢 Pengumuman Libur</p>
          <p className="text-gray-600 font-bold mt-1">Info libur & perubahan jadwal</p>
        </button>
        <button
          onClick={() => {
            setShowForm(true);
          }}
          className="bg-hm-card bg-white p-0 overflow-hidden border border-slate-200/80 rounded-none-xl p-4 text-left hover:border-vest/40 transition text-sm"
        >
          <p className="font-semibold text-black font-black">✏️ Kustom</p>
          <p className="text-gray-600 font-bold mt-1">Buat pesan notifikasi sendiri</p>
        </button>
      </div>

      {/* Riwayat */}
      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-black font-black">Riwayat Notifikasi</h2>
        </div>
        <div className="divide-y divide-asphalt-line">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</div>
          ) : riwayat.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada notifikasi</div>
          ) : (
            riwayat.map((n) => (
              <div key={n.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black font-black">{n.judul}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        n.tipe === "pengumuman" ? "bg-green-400/10 text-green-600 border border-vest/30" :
                        n.tipe === "tagihan_jatuh_tempo" ? "bg-danger/10 text-red-400 border border-red-500/30" :
                        "bg-amber/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {TIPE_NOTIF.find((t) => t.value === n.tipe)?.label || n.tipe}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-bold mt-1">{n.pesan.slice(0, 100)}...</p>
                    <p className="text-xs text-gray-400 font-bold mt-1">
                      Ke: {n.pelanggan?.nama || n.penerima} • {formatDate(n.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    n.status === "terkirim" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" :
                    n.status === "pending" ? "bg-amber/10 text-amber-400 border border-amber-500/30" :
                    "bg-danger/10 text-red-400 border border-red-500/30"
                  }`}>
                    {n.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hm-card bg-white p-0 overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-black font-black">Kirim Notifikasi</h2>
              <button onClick={() => { setShowForm(false); setResult(null); }} className="text-gray-400 font-bold hover:text-gray-600 font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Tipe</label>
                <select
                  value={form.tipe}
                  onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm"
                >
                  {TIPE_NOTIF.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Judul *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Pesan *</label>
                <textarea
                  value={form.pesan}
                  onChange={(e) => setForm({ ...form, pesan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.semuaPelanggan}
                    onChange={(e) => setForm({ ...form, semuaPelanggan: e.target.checked, pelangganId: "" })}
                    className="rounded-none border border-slate-200/80"
                  />
                  <span className="text-sm text-gray-600 font-bold">Kirim ke semua pelanggan aktif</span>
                </label>
              </div>
              {!form.semuaPelanggan && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 font-bold mb-1">Pelanggan</label>
                  <select
                    value={form.pelangganId}
                    onChange={(e) => setForm({ ...form, pelangganId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200/80 rounded-none text-sm"
                  >
                    <option value="">Pilih pelanggan</option>
                    {pelangganList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama} ({p.noTelepon})</option>
                    ))}
                  </select>
                </div>
              )}

              {result && (
                <div className={`p-3 rounded-none text-sm ${
                  result.failures?.length ? "bg-amber-500/10 text-amber-300 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                }`}>
                  <p className="font-medium">{result.message}</p>
                  {result.failures && result.failures.length > 0 && (
                    <ul className="mt-1 text-xs list-disc list-inside">
                      {result.failures.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                  {result.links && result.links.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Link WhatsApp:</p>
                      {result.links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-green-600 hover:underline truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setResult(null); }}
                  className="flex-1 px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm hover:bg-green-300 disabled:opacity-50"
                >
                  {sending ? "Mengirim..." : "Kirim via WA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
