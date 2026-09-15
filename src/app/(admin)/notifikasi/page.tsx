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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Notifikasi WhatsApp</h1>
          <p className="text-sm text-slate-500 font-medium">Kirim pengumuman & pengingat ke pelanggan</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setResult(null); }}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-2"
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
          className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
        >
          <p className="font-bold text-slate-900 text-sm">📋 Pengingat Tagihan</p>
          <p className="text-slate-500 text-xs mt-1">Kirim pengingat pembayaran ke semua pelanggan</p>
        </button>
        <button
          onClick={() => {
            setForm({ tipe: "jadwal_pengangkutan", judul: "Jadwal Pengangkutan", pesan: "Yth. Pelanggan UPS HERU,\n\nPengangkutan sampah akan dilakukan besok sesuai jadwal. Mohon siapkan sampah di depan rumah.\n\nTerima kasih.", pelangganId: "", semuaPelanggan: true });
            setShowForm(true);
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
        >
          <p className="font-bold text-slate-900 text-sm">🗑️ Pengingat Jadwal</p>
          <p className="text-slate-500 text-xs mt-1">Info jadwal pengangkutan besok</p>
        </button>
        <button
          onClick={() => {
            setForm({ tipe: "pengumuman", judul: "Pengumuman Libur", pesan: "Yth. Pelanggan UPS HERU,\n\nDiberitahukan bahwa layanan pengangkutan sampah libur pada hari besar nasional. Jadwal akan kembali normal pada hari berikutnya.\n\nTerima kasih.", pelangganId: "", semuaPelanggan: true });
            setShowForm(true);
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
        >
          <p className="font-bold text-slate-900 text-sm">📢 Pengumuman Libur</p>
          <p className="text-slate-500 text-xs mt-1">Info libur & perubahan jadwal</p>
        </button>
        <button
          onClick={() => {
            setShowForm(true);
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-sm transition-all text-sm shadow-sm"
        >
          <p className="font-bold text-slate-900 text-sm">✏️ Kustom</p>
          <p className="text-slate-500 text-xs mt-1">Buat pesan notifikasi mandiri</p>
        </button>
      </div>

      {/* Riwayat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <h2 className="font-bold text-slate-900 text-sm">Riwayat Notifikasi</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-slate-600 font-medium">Memuat...</div>
          ) : riwayat.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-600 font-medium">Belum ada notifikasi</div>
          ) : (
            riwayat.map((n) => (
              <div key={n.id} className="px-5 py-3.5 hover:bg-slate-50/70 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{n.judul}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        n.tipe === "pengumuman" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        n.tipe === "tagihan_jatuh_tempo" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {TIPE_NOTIF.find((t) => t.value === n.tipe)?.label || n.tipe}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{n.pesan.slice(0, 100)}...</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Ke: {n.pelanggan?.nama || n.penerima} • {formatDate(n.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${
                    n.status === "terkirim" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    n.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    "bg-rose-50 text-rose-700 border border-rose-200"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-0 overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-base">Kirim Notifikasi WhatsApp</h2>
              <button onClick={() => { setShowForm(false); setResult(null); }} className="p-1.5 text-slate-600 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe</label>
                <select
                  value={form.tipe}
                  onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                >
                  {TIPE_NOTIF.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pesan *</label>
                <textarea
                  value={form.pesan}
                  onChange={(e) => setForm({ ...form, pesan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.semuaPelanggan}
                    onChange={(e) => setForm({ ...form, semuaPelanggan: e.target.checked, pelangganId: "" })}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 font-medium">Kirim ke semua pelanggan aktif</span>
                </label>
              </div>
              {!form.semuaPelanggan && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Pelanggan</label>
                  <select
                    value={form.pelangganId}
                    onChange={(e) => setForm({ ...form, pelangganId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="">Pilih pelanggan</option>
                    {pelangganList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama} ({p.noTelepon})</option>
                    ))}
                  </select>
                </div>
              )}

              {result && (
                <div className={`p-4 rounded-2xl text-sm ${
                  result.failures?.length ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                }`}>
                  <p className="font-medium">{result.message}</p>
                  {result.failures && result.failures.length > 0 && (
                    <ul className="mt-1 text-xs list-disc list-inside text-amber-800">
                      {result.failures.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                  {result.links && result.links.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60">
                      <p className="text-xs font-semibold mb-1 text-emerald-800">Link WhatsApp:</p>
                      {result.links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-emerald-700 hover:text-emerald-700 hover:underline truncate py-0.5"
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
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all disabled:opacity-50"
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
