"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";


type Klaim = {
  id: number;
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  fotoBukti: string | null;
  status: string;
  catatanAdmin: string | null;
};

const KATEGORI = [
  { value: "bbm", label: "BBM" },
  { value: "perawatan", label: "Perawatan" },
  { value: "gaji_petugas", label: "Gaji Petugas" },
  { value: "lainnya", label: "Lainnya" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  menunggu: { label: "Menunggu", cls: "bg-amber-100 text-amber-800 border border-amber-200" },
  disetujui: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  ditolak: { label: "Ditolak", cls: "bg-rose-100 text-rose-800 border border-rose-200" },
};

export default function MobileKlaim() {
  const [klaim, setKlaim] = useState<Klaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [bukaForm, setBukaForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pesan, setPesan] = useState("");

  const [form, setForm] = useState({
    kategori: "bbm",
    nominal: "",
    keterangan: "",
    fotoBukti: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/klaim");
    if (res.ok) {
      const json = await res.json();
      setKlaim(json.klaim || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function submit() {
    if (!form.nominal || !form.keterangan) {
      setPesan("Nominal dan keterangan wajib diisi.");
      return;
    }
    setSubmitting(true);
    setPesan("");
    try {
      const res = await fetch("/api/klaim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori: form.kategori,
          nominal: form.nominal,
          keterangan: form.keterangan,
          fotoBukti: form.fotoBukti || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setPesan("Pengajuan klaim berhasil dikirim ✓");
        setBukaForm(false);
        setForm({ kategori: "bbm", nominal: "", keterangan: "", fotoBukti: "", latitude: "", longitude: "", koordinatSumber: "", koordinatAkurasi: "" });
        fetchData();
      } else {
        setPesan(d.error || "Gagal mengirim klaim");
      }
    } catch {
      setPesan("Gagal mengirim klaim, periksa koneksi internet");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Reimbursement & Kas Operasional
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Klaim Biaya</h1>
          <p className="text-xs font-medium text-slate-500">Penggantian biaya BBM, servis & pengeluaran tak terduga</p>
        </div>
        <button
          onClick={() => setBukaForm((v) => !v)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all shrink-0"
        >
          {bukaForm ? "Tutup Form" : "+ Buat Klaim"}
        </button>
      </div>

      {pesan && (
        <p className={`text-center text-xs font-semibold p-3.5 rounded-2xl border ${pesan.includes("✓") ? "border-emerald-200 text-emerald-800 bg-emerald-50" : "border-rose-200 text-rose-800 bg-rose-50"}`}>
          {pesan}
        </p>
      )}

      {bukaForm && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Formulir Pengajuan Klaim Baru</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sertakan foto struk / nota sah pembelian</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              >
                {KATEGORI.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nominal (Rp) *</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                placeholder="50000"
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan *</label>
            <textarea
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Contoh: Pembelian bensin 5 liter di SPBU Kalimulya, ganti ban bocor..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
            />
          </div>

          <CameraGps
            label="Foto Bukti (Struk / Nota)"
            foto={form.fotoBukti}
            latitude={form.latitude}
            longitude={form.longitude}
            koordinatSumber={form.koordinatSumber}
            koordinatAkurasi={form.koordinatAkurasi}
            onFotoChange={(fotoBukti) => setForm({ ...form, fotoBukti })}
            onKoordinatChange={(latitude, longitude, koordinatSumber, koordinatAkurasi) =>
              setForm({ ...form, latitude, longitude, koordinatSumber, koordinatAkurasi })
            }
          />

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-sm font-bold shadow-xs transition-all disabled:opacity-50"
          >
            {submitting ? "Mengirim Pengajuan…" : "Kirim Pengajuan Klaim"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : klaim.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <span className="text-3xl block mb-2">🧾</span>
          <p className="text-sm font-bold text-slate-700">Belum Ada Riwayat Klaim</p>
          <p className="text-xs text-slate-400 mt-1">Tekan tombol "+ Buat Klaim" untuk mencatat pengeluaran operasional.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {klaim.map((k) => {
            const meta = STATUS_META[k.status] || STATUS_META.menunggu;
            return (
              <div key={k.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                      {KATEGORI.find((x) => x.value === k.kategori)?.label || k.kategori}
                    </span>
                    <p className="text-xs font-mono text-slate-400">
                      {format(new Date(k.tanggal), "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">
                      Rp {k.nominal.toLocaleString("id-ID")}
                    </p>
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold rounded-full mt-1 ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl">
                  {k.keterangan}
                </p>

                {k.fotoBukti && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={k.fotoBukti} alt="Bukti Struk" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                )}

                {k.catatanAdmin && (
                  <div className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5">
                    <span className="font-bold text-amber-900">Catatan Admin: </span>
                    {k.catatanAdmin}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

