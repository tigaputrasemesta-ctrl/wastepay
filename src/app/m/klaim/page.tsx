"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";
import { Receipt, PlusCircle, History, CheckCircle2, AlertCircle } from "lucide-react";

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
  menunggu: { label: "Menunggu", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  disetujui: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ditolak: { label: "Ditolak", cls: "bg-rose-100 text-rose-800 border-rose-200" },
};

export default function MobileKlaim() {
  const [klaim, setKlaim] = useState<Klaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"riwayat" | "baru">("riwayat");
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
        setTab("riwayat");
        setForm({
          kategori: "bbm",
          nominal: "",
          keterangan: "",
          fotoBukti: "",
          latitude: "",
          longitude: "",
          koordinatSumber: "",
          koordinatAkurasi: "",
        });
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
    <div className="space-y-3">
      {/* Header & Segmented Tabs */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Klaim Operasional</h1>
          <p className="text-[10px] text-slate-500">Reimbursement BBM, bengkel & kas</p>
        </div>
        <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setTab("riwayat")}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              tab === "riwayat"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3 h-3" />
            <span>Riwayat ({klaim.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("baru")}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              tab === "baru"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="w-3 h-3" />
            <span>+ Klaim</span>
          </button>
        </div>
      </div>

      {pesan && (
        <div
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold p-2.5 rounded-xl border ${
            pesan.includes("✓")
              ? "border-emerald-200 text-emerald-800 bg-emerald-50"
              : "border-rose-200 text-rose-800 bg-rose-50"
          }`}
        >
          {pesan.includes("✓") ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{pesan}</span>
        </div>
      )}

      {/* Tab 1: Form Buat Klaim Baru */}
      {tab === "baru" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Form Pengajuan Biaya</span>
            <span className="text-[10px] text-slate-400">Sertakan foto struk sah</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Kategori
              </label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              >
                {KATEGORI.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nominal (Rp) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                placeholder="50000"
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Keterangan Pengeluaran *
            </label>
            <textarea
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Contoh: Beli bensin Pertalite 5L armada di SPBU..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50/50 focus:bg-white focus:border-emerald-500"
            />
          </div>

          <CameraGps
            label="Foto Struk / Nota Pembelian"
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

          <div className="flex gap-2 pt-1">
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {submitting ? "Mengirim Data…" : "Kirim Pengajuan Klaim"}
            </button>
            <button
              type="button"
              onClick={() => setTab("riwayat")}
              className="px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Riwayat Klaim */}
      {tab === "riwayat" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : klaim.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-2xs space-y-2">
              <span className="text-2xl block">🧾</span>
              <p className="text-xs font-bold text-slate-800">Belum Ada Pengajuan Klaim</p>
              <p className="text-[10px] text-slate-400">
                Tekan tombol "+ Klaim" di atas untuk mengajukan reimbursement biaya operasional.
              </p>
              <button
                type="button"
                onClick={() => setTab("baru")}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Buat Pengajuan Pertama</span>
              </button>
            </div>
          ) : (
            klaim.map((k) => {
              const meta = STATUS_META[k.status] || STATUS_META.menunggu;
              return (
                <div
                  key={k.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {KATEGORI.find((x) => x.value === k.kategori)?.label || k.kategori}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(k.tanggal), "d MMM yyyy", { locale: id })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-snug break-words">
                        {k.keterangan}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold tabular-nums text-slate-900">
                        Rp {k.nominal.toLocaleString("id-ID")}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full border mt-1 ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {k.fotoBukti && (
                    <div className="pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={k.fotoBukti}
                        alt="Bukti Struk"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  )}

                  {k.catatanAdmin && (
                    <div className="text-[10px] text-slate-600 bg-amber-50/80 border border-amber-200/70 rounded-xl p-2">
                      <span className="font-bold text-amber-900">Catatan Admin: </span>
                      {k.catatanAdmin}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
