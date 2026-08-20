"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import CameraGps from "@/components/mobile/CameraGps";

export const dynamic = "force-dynamic";

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
  menunggu: { label: "Menunggu", cls: "bg-amber-400 text-black" },
  disetujui: { label: "Disetujui", cls: "bg-green-600 text-white" },
  ditolak: { label: "Ditolak", cls: "bg-red-600 text-white" },
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
    // fetch on mount: setState terjadi setelah await (async), bukan sinkron di body effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        setPesan("Klaim terkirim ✓");
        setBukaForm(false);
        setForm({ kategori: "bbm", nominal: "", keterangan: "", fotoBukti: "", latitude: "", longitude: "", koordinatSumber: "", koordinatAkurasi: "" });
        fetchData();
      } else {
        setPesan(d.error || "Gagal mengirim klaim");
      }
    } catch {
      setPesan("Gagal mengirim klaim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Klaim</h1>
          <p className="text-xs font-bold text-gray-500">BBM, perawatan, & pengeluaran lain</p>
        </div>
        <button
          onClick={() => setBukaForm((v) => !v)}
          className="px-3 py-2.5 bg-black text-white border-2 border-black text-[11px] font-black uppercase tracking-wide"
        >
          {bukaForm ? "Tutup" : "+ Buat Klaim"}
        </button>
      </div>

      {pesan && (
        <p className={`text-center text-sm font-black p-3 border-2 ${pesan.includes("✓") ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}`}>
          {pesan}
        </p>
      )}

      {bukaForm && (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest">Klaim Baru</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none bg-white"
              >
                {KATEGORI.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nominal (Rp) *</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                placeholder="50000"
                className="w-full px-2 py-2.5 border-2 border-black text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Keterangan *</label>
            <textarea
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="isi bensin 5 liter, ganti ban, dll"
              rows={2}
              className="w-full px-2 py-2 border-2 border-black text-sm font-bold outline-none"
            />
          </div>

          <CameraGps
            label="Foto Bukti (struk/nota)"
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
            className="w-full py-3.5 bg-green-600 text-white border-2 border-black text-sm font-black uppercase tracking-widest shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            {submitting ? "Mengirim…" : "Kirim Klaim"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="font-mono font-bold text-gray-500 text-center py-10">MEMUAT…</p>
      ) : klaim.length === 0 ? (
        <div className="border-2 border-black bg-white p-8 text-center">
          <p className="text-lg font-black uppercase tracking-tight">Belum ada klaim</p>
        </div>
      ) : (
        klaim.map((k) => {
          const meta = STATUS_META[k.status] || STATUS_META.menunggu;
          return (
            <div key={k.id} className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black uppercase tracking-tight">{KATEGORI.find((x) => x.value === k.kategori)?.label || k.kategori}</p>
                  <p className="text-[11px] font-mono font-bold text-gray-400">{format(new Date(k.tanggal), "d MMM yyyy", { locale: id })}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black">Rp {k.nominal.toLocaleString("id-ID")}</p>
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase border-2 border-black ${meta.cls}`}>{meta.label}</span>
                </div>
              </div>
              <p className="text-[11px] font-bold text-gray-600">{k.keterangan}</p>
              {k.fotoBukti && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={k.fotoBukti} alt="Bukti" className="w-20 h-20 object-cover border-2 border-black" />
              )}
              {k.catatanAdmin && (
                <p className="text-[11px] font-bold text-gray-500 border-t border-dashed border-gray-300 pt-2">
                  <span className="uppercase font-black text-gray-600">Admin: </span>
                  {k.catatanAdmin}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
