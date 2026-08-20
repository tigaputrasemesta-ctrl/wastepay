"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import CoordinatePicker from "@/components/CoordinatePicker";
import GeotagPhoto from "@/components/GeotagPhoto";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null; kota?: string | null };
type Paket = { id: number; nama: string; harga: number | null; deskripsi?: string };
type KategoriTarif = { id: number; kategori: string; label: string; tarif: number; deskripsi?: string };

const STEPS = [
  { id: 1, label: "DATA DIRI" },
  { id: 2, label: "WILAYAH" },
  { id: 3, label: "LOKASI & FOTO" },
  { id: 4, label: "TARIF & STATUS" },
  { id: 5, label: "KONFIRMASI" },
];

const KATEGORI_OPTIONS = [
  { value: "level_1", label: "Level 1 — Volume Sangat Kecil", icon: "🏠" },
  { value: "level_2", label: "Level 2 — Volume Kecil–Sedang", icon: "🏘️" },
  { value: "level_3", label: "Level 3 — Volume Sedang", icon: "🏪" },
  { value: "level_4", label: "Level 4 — Volume Sedang–Besar", icon: "🏢" },
  { value: "level_5", label: "Level 5 — Volume Besar", icon: "🏨" },
  { value: "level_6", label: "Level 6 — Volume Sangat Besar", icon: "🏭" },
  { value: "level_7", label: "Level 7 — Volume Ekstra Besar", icon: "🏗️" },
  { value: "level_8", label: "Level 8 — Volume Komersial Besar", icon: "🏬" },
  { value: "level_9", label: "Level 9 — Volume Maksimal", icon: "🏥" },
  { value: "level_10", label: "Level 10 — Volume Korporat", icon: "🏙️" },
];

const STATUS_OPTIONS = [
  { value: "aktif", label: "Aktif", desc: "Langganan berjalan — tagihan bulan ini dibuat otomatis", tone: "badge-vest" },
  { value: "calon", label: "Calon", desc: "Belum mulai berlangganan — tidak dibuatkan tagihan", tone: "badge-amber" },
  { value: "nonaktif", label: "Nonaktif", desc: "Berhenti berlangganan — tidak dibuatkan tagihan", tone: "badge-danger" },
  { value: "libur", label: "Libur", desc: "Berhenti sementara — tidak dibuatkan tagihan", tone: "badge-steel" },
];

function JudulSection({ kode, judul, desc }: { kode: string; judul: string; desc: string }) {
  return (
    <div className="mb-6">
      <p className="stencil text-green-600 flex items-center gap-2">
        <span className="w-6 h-1 hazard inline-block" />
        {kode}
      </p>
      <h2 className="font-black uppercase tracking-tighter text-xl text-black font-black tracking-wide mt-2">{judul}</h2>
      <p className="text-sm text-gray-600 font-bold mt-1">{desc}</p>
    </div>
  );
}

export default function DaftarPelangganPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ nama: string; kode: string } | null>(null);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [paketList, setPaketList] = useState<Paket[]>([]);
  const [kategoriTarifList, setKategoriTarifList] = useState<KategoriTarif[]>([]);
  const [useCustomTarif, setUseCustomTarif] = useState(false);

  const [form, setForm] = useState({
    // Data Diri
    nama: "",
    noTelepon: "",
    kategori: "level_1",
    penanggungjawab: "",
    // Wilayah & Alamat
    kelurahanId: "",
    alamat: "",
    rt: "",
    rw: "",
    // Lokasi & Foto
    patokanLokasi: "",
    latitude: "",
    longitude: "",
    koordinatSumber: "",
    koordinatAkurasi: "",
    fotoRumah: "",
    // Tarif & Status
    paketId: "",
    customTarif: "",
    status: "aktif",
    catatan: "",
  });

  // ── Data turunan ──
  const kelurahanTerpilih = kelurahanList.find((k) => k.id.toString() === form.kelurahanId);
  const kategoriTarifTerpilih = kategoriTarifList.find((k) => k.kategori === form.kategori);
  const tarifDefaultKategori = kategoriTarifTerpilih?.tarif ?? 0;
  const paketTerpilih = paketList.find((p) => p.id.toString() === form.paketId);

  const tarifAkhir =
    useCustomTarif && form.customTarif
      ? parseFloat(form.customTarif) || 0
      : paketTerpilih?.harga ?? tarifDefaultKategori;

  useEffect(() => {
    async function fetchData() {
      try {
        const [kelurahanRes, paketRes, tarifRes] = await Promise.all([
          fetch("/api/kelurahan"),
          fetch("/api/paket"),
          fetch("/api/kategori-tarif"),
        ]);
        setKelurahanList(await kelurahanRes.json());
        setPaketList(await paketRes.json());
        setKategoriTarifList(await tarifRes.json());
      } catch {
        setError("Gagal memuat data");
      }
    }
    fetchData();
  }, []);

  function nextStep() {
    setError("");

    if (step === 1) {
      if (!form.nama.trim()) return setError("Nama pelanggan wajib diisi");
      if (!form.noTelepon.trim()) return setError("No. telepon wajib diisi");
    }
    if (step === 2) {
      if (!form.alamat.trim()) return setError("Alamat wajib diisi");
      if (!form.kelurahanId) return setError("Pilih kelurahan");
    }
    if (step === 4) {
      const punyaTarif = paketTerpilih || (useCustomTarif && parseFloat(form.customTarif) > 0) || tarifDefaultKategori > 0;
      if (!punyaTarif) return setError("Tentukan tarif: pilih paket, isi tarif kustom, atau pastikan tarif kategori tersedia");
      if (useCustomTarif && !(parseFloat(form.customTarif) > 0)) return setError("Isi nominal tarif kustom");
    }

    if (step < 5) setStep(step + 1);
  }

  function prevStep() {
    setError("");
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);

    try {
      const body = {
        nama: form.nama,
        noTelepon: form.noTelepon,
        kategori: form.kategori,
        penanggungjawab: form.penanggungjawab,
        alamat: form.alamat,
        rtRw: form.rt && form.rw ? `${form.rt}/${form.rw}` : form.rt || form.rw || "",
        patokanLokasi: form.patokanLokasi,
        latitude: form.latitude,
        longitude: form.longitude,
        koordinatSumber: form.koordinatSumber,
        koordinatAkurasi: form.koordinatAkurasi,
        fotoRumah: form.fotoRumah,
        kelurahanId: form.kelurahanId,
        paketId: form.paketId,
        customTarif: useCustomTarif ? form.customTarif : "",
        status: form.status,
        catatan: form.catatan,
      };

      const res = await fetch("/api/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mendaftarkan pelanggan");
      }

      const result = await res.json();
      setSuccessData({ nama: form.nama, kode: result.kodePelanggan });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({
      nama: "", noTelepon: "", kategori: "level_1", penanggungjawab: "",
      kelurahanId: "", alamat: "", rt: "", rw: "",
      patokanLokasi: "", latitude: "", longitude: "", koordinatSumber: "", koordinatAkurasi: "", fotoRumah: "",
      paketId: "", customTarif: "", status: "aktif", catatan: "",
    });
    setUseCustomTarif(false);
    setStep(1);
  }

  if (success) {
    const statusLabel = STATUS_OPTIONS.find((s) => s.value === form.status)?.label ?? form.status;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="hm-card bg-white p-0 overflow-hidden shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all p-8 text-center">
          <div className="w-16 h-16 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="stencil text-green-600 mb-2">PENDAFTARAN BERHASIL</p>
          <h2 className="font-black uppercase tracking-tighter text-2xl text-black font-black mb-2">{successData?.nama}</h2>
          <p className="text-sm text-gray-600 font-bold mb-6">
            Status: <span className={`badge ${statusLabel === "Aktif" ? "badge-vest" : "badge-amber"}`}>{statusLabel}</span>
            {form.status === "aktif" && " — tagihan bulan ini sudah dibuat otomatis."}
          </p>

          {successData?.kode && (
            <div className="bg-black text-white font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all p-6 mb-6 inline-block">
              <p className="stencil text-gray-400 font-bold text-[10px] mb-2">KODE PELANGGAN</p>
              <p className="font-black uppercase tracking-tighter text-3xl text-black font-black tracking-widest mb-3">{successData.kode}</p>
              {/* Barcode SVG */}
              <svg className="mx-auto" width="200" height="50" viewBox="0 0 200 50" aria-hidden>
                {successData.kode.split("").map((char, i) => (
                  <rect key={i} x={4 + i * 16} y="4" width={char === "-" ? 4 : 6} height="36" fill={char === "-" ? "#fff" : "#000"} />
                ))}
                <rect x="0" y="0" width="4" height="44" fill="#000" />
                <rect x="196" y="0" width="4" height="44" fill="#000" />
              </svg>
              <p className="text-xs text-gray-400 font-bold mt-2 font-mono">{successData.kode}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/pelanggan")}
              className="btn btn-primary shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all px-4 py-2 text-sm"
            >
              Lihat Data Pelanggan
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setSuccessData(null);
                resetForm();
              }}
              className="btn shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all px-4 py-2 text-sm"
            >
              Daftar Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="stencil text-green-600 flex items-center gap-2">
          <span className="w-8 h-1.5 hazard inline-block" />
          REGISTRASI
        </p>
        <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black mt-2">Pendaftaran Pelanggan Baru</h1>
        <p className="text-sm text-gray-600 font-bold mt-1">
          Pendataan internal — petugas mengisi data pelanggan untuk layanan iuran sampah
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((s, idx) => {
            const selesai = step > s.id;
            const aktif = step === s.id;
            return (
              <div key={s.id} className={`flex items-center ${idx < STEPS.length - 1 ? "flex-1" : ""}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all w-9 h-9 flex items-center justify-center font-black uppercase tracking-tighter text-sm transition ${
                      selesai
                        ? "bg-green-400/25 text-green-600"
                        : aktif
                        ? "bg-green-400 text-black shadow-[0_0_18px_rgba(183,225,60,0.35)]"
                        : "bg-gray-100 border-2 border-black text-gray-400 font-bold"
                    }`}
                  >
                    {selesai ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span
                    className={`stencil text-[10px] hidden sm:inline ${
                      aktif ? "text-green-600" : selesai ? "text-gray-600 font-bold" : "text-gray-400 font-bold"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${selesai ? "bg-green-400" : "bg-gray-100 border-2 border-black"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hm-card bg-white p-0 overflow-hidden shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all p-6 md:p-8">
        {/* ═══ STEP 1: DATA DIRI ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <JudulSection
              kode="01 / DATA DIRI"
              judul="Identitas Pelanggan"
              desc="Data utama yang dipakai untuk tagihan, kartu anggota, dan notifikasi"
            />
            <div>
              <label className="label">Nama Lengkap <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="input"
                placeholder="Nama warga / pemilik usaha"
              />
            </div>
            <div>
              <label className="label">No. Telepon / WhatsApp <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.noTelepon}
                onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                className="input"
                placeholder="08xxxxxxxxxx"
              />
              <p className="text-xs text-gray-400 font-bold mt-1">Notifikasi tagihan & pembayaran dikirim ke nomor ini</p>
            </div>

            <div>
              <label className="label">Kategori Pelanggan <span className="text-red-600">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {KATEGORI_OPTIONS.map((k) => (
                  <label
                    key={k.value}
                    className={`shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col items-center gap-1 px-3 py-3 border cursor-pointer transition ${
                      form.kategori === k.value
                        ? "border-vest bg-green-400/10 shadow-[0_0_14px_rgba(183,225,60,0.18)]"
                        : "border-2 border-black hover:border-2 border-black bg-white/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kategori"
                      value={k.value}
                      checked={form.kategori === k.value}
                      onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                      className="hidden"
                    />
                    <span className="text-lg">{k.icon}</span>
                    <span className="text-xs font-medium text-gray-600 font-bold text-center leading-tight">{k.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Penanggung Jawab <span className="text-gray-400 font-bold normal-case">(opsional)</span></label>
              <input
                type="text"
                value={form.penanggungjawab}
                onChange={(e) => setForm({ ...form, penanggungjawab: e.target.value })}
                className="input"
                placeholder="Kepala keluarga / pemilik usaha"
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 2: WILAYAH & ALAMAT ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <JudulSection
              kode="02 / KELURAHAN"
              judul="Kelurahan & Alamat"
              desc="Kelurahan menentukan area layanan & kode pelanggan"
            />
            <div>
              <label className="label">Kelurahan <span className="text-red-600">*</span></label>
              <select value={form.kelurahanId} onChange={(e) => setForm({ ...form, kelurahanId: e.target.value })} className="input">
                <option value="">— Pilih Kelurahan —</option>
                {kelurahanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}{k.kecamatan ? ` · ${k.kecamatan}` : ""}
                  </option>
                ))}
              </select>
              {kelurahanTerpilih && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge badge-vest">{kelurahanTerpilih.kecamatan || "Kec. —"}</span>
                  <span className="badge badge-steel">{kelurahanTerpilih.nama || "Kel. —"}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Alamat Lengkap <span className="text-red-600">*</span></label>
              <textarea
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="input resize-none"
                rows={2}
                placeholder="Nama jalan, gang, nomor rumah"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">RT</label>
                <input
                  type="text"
                  value={form.rt}
                  onChange={(e) => setForm({ ...form, rt: e.target.value })}
                  className="input"
                  placeholder="001"
                />
              </div>
              <div>
                <label className="label">RW</label>
                <input
                  type="text"
                  value={form.rw}
                  onChange={(e) => setForm({ ...form, rw: e.target.value })}
                  className="input"
                  placeholder="003"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 font-bold">
              Isi RT/RW sesuai data warga (opsional).
            </p>
          </div>
        )}

        {/* ═══ STEP 3: LOKASI & FOTO ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <JudulSection
              kode="03 / LOKASI & FOTO"
              judul="Penanda Lokasi & Foto Rumah"
              desc="Memudahkan petugas lapangan menemukan lokasi dan merencanakan rute"
            />
            <div>
              <label className="label">Patokan / Tag Lokasi <span className="text-gray-400 font-bold normal-case">(opsional)</span></label>
              <input
                type="text"
                value={form.patokanLokasi}
                onChange={(e) => setForm({ ...form, patokanLokasi: e.target.value })}
                className="input"
                placeholder="Contoh: dekat masjid Al-Falah, samping minimarket"
              />
            </div>

            <div>
              <label className="label">Foto Rumah + Titik Koordinat</label>
              <GeotagPhoto
                foto={form.fotoRumah}
                latitude={form.latitude}
                longitude={form.longitude}
                koordinatSumber={form.koordinatSumber}
                koordinatAkurasi={form.koordinatAkurasi}
                onFotoChange={(foto) => setForm({ ...form, fotoRumah: foto })}
                onKoordinatChange={(lat, lng, sumber, akurasi) =>
                  setForm({ ...form, latitude: lat, longitude: lng, koordinatSumber: sumber, koordinatAkurasi: akurasi })
                }
              />
            </div>

            <div>
              <label className="label">Koreksi Koordinat di Peta</label>
              <CoordinatePicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) =>
                  setForm((f) => ({ ...f, latitude: lat, longitude: lng, koordinatSumber: f.koordinatSumber || "manual" }))
                }
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 4: TARIF & STATUS ═══ */}
        {step === 4 && (
          <div className="space-y-6">
            <JudulSection
              kode="04 / TARIF & STATUS"
              judul="Tarif Iuran & Status Langganan"
              desc="Prioritas tarif: paket terpilih → tarif kustom → tarif default kategori"
            />

            {/* Tarif default kategori */}
            <div className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400/5 border border-vest/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label !mb-1 text-green-600">TARIF DEFAULT — {kategoriTarifTerpilih?.label ?? form.kategori}</p>
                  <p className="text-xs text-gray-600 font-bold">{kategoriTarifTerpilih?.deskripsi ?? "Tarif berdasarkan kategori"}</p>
                </div>
                <p className="font-black uppercase tracking-tighter text-xl text-green-600 whitespace-nowrap">{formatRupiah(tarifDefaultKategori)}<span className="text-xs text-gray-400 font-bold">/bln</span></p>
              </div>
            </div>

            {/* Pilihan paket */}
            {paketList.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="stencil text-gray-400 font-bold text-[10px]">ATAU PILIH PAKET</span>
                  <div className="flex-1 h-px bg-gray-100 border-2 border-black" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paketList.map((p) => {
                    const dipilih = form.paketId === p.id.toString();
                    return (
                      <label
                        key={p.id}
                        className={`shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all relative border p-4 cursor-pointer transition ${
                          dipilih
                            ? "border-vest bg-green-400/10 shadow-[0_0_14px_rgba(183,225,60,0.18)]"
                            : "border-2 border-black bg-white/30 hover:border-2 border-black"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paket"
                          value={p.id}
                          checked={dipilih}
                          onChange={(e) => {
                            setForm({ ...form, paketId: e.target.value });
                            setUseCustomTarif(false);
                          }}
                          className="hidden"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-black uppercase tracking-tighter text-sm text-black font-black tracking-wide">{p.nama}</h3>
                            {p.deskripsi && <p className="text-xs text-gray-600 font-bold mt-1">{p.deskripsi}</p>}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="font-black uppercase tracking-tighter text-lg text-green-600">{p.harga != null ? formatRupiah(p.harga) : "Variabel"}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{p.harga != null ? "/bulan" : "sesuai kebutuhan"}</p>
                          </div>
                        </div>
                        {dipilih && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 flex items-center justify-center">
                            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
            {paketList.length === 0 && (
              <div className="text-center py-4 bg-black text-white font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                <p className="text-gray-400 font-bold text-sm mb-2">Belum ada paket tersedia — pakai tarif default kategori</p>
              </div>
            )}

            {/* Tarif kustom */}
            <div className="flex items-center gap-3">
              <span className="stencil text-gray-400 font-bold text-[10px]">ATAU TARIF KUSTOM</span>
              <div className="flex-1 h-px bg-gray-100 border-2 border-black" />
            </div>
            <label className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex items-start gap-3 p-4 border-2 border-black bg-white/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={useCustomTarif}
                onChange={(e) => {
                  setUseCustomTarif(e.target.checked);
                  if (e.target.checked) setForm({ ...form, paketId: "" });
                  else setForm({ ...form, customTarif: "" });
                }}
                className="mt-1 accent-vest"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-black font-black">Tarif Kustom</p>
                <p className="text-xs text-gray-600 font-bold">Nominal iuran khusus untuk pelanggan ini (mengalahkan paket)</p>
                {useCustomTarif && (
                  <div className="mt-3 max-w-xs">
                    <input
                      type="number"
                      value={form.customTarif}
                      onChange={(e) => setForm({ ...form, customTarif: e.target.value })}
                      className="input"
                      placeholder="Contoh: 50000"
                    />
                    {parseFloat(form.customTarif) > 0 && (
                      <p className="text-xs text-green-600 mt-1 font-mono">= {formatRupiah(parseFloat(form.customTarif))} / bulan</p>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Ringkasan tarif */}
            <div className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-black text-white font-black border-2 border-black p-4 flex items-center justify-between">
              <div>
                <p className="label !mb-1">TARIF AKHIR</p>
                <p className="text-xs text-gray-600 font-bold">
                  {useCustomTarif
                    ? "Tarif kustom"
                    : paketTerpilih
                    ? `Paket: ${paketTerpilih.nama}`
                    : `Default kategori ${kategoriTarifTerpilih?.label ?? form.kategori}`}
                </p>
              </div>
              <p className="font-black uppercase tracking-tighter text-2xl text-green-600">
                {formatRupiah(tarifAkhir)}
                <span className="text-xs text-gray-400 font-bold">/bln</span>
              </p>
            </div>

            {/* Status langganan */}
            <div>
              <label className="label">Status Langganan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <label
                    key={s.value}
                    className={`shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex items-start gap-3 p-3 border cursor-pointer transition ${
                      form.status === s.value
                        ? "border-vest bg-green-400/10"
                        : "border-2 border-black bg-white/30 hover:border-2 border-black"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      checked={form.status === s.value}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="mt-0.5 accent-vest"
                    />
                    <div>
                      <p className="text-sm font-medium text-black font-black">{s.label}</p>
                      <p className="text-xs text-gray-600 font-bold mt-0.5">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="label">Catatan Internal <span className="text-gray-400 font-bold normal-case">(opsional)</span></label>
              <textarea
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                className="input resize-none"
                rows={2}
                placeholder="Contoh: perjanjian bayar tiap tanggal 10, diskon khusus, dll."
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 5: KONFIRMASI ═══ */}
        {step === 5 && (
          <div className="space-y-6">
            <JudulSection
              kode="05 / KONFIRMASI"
              judul="Periksa Kembali Data"
              desc="Pastikan seluruh data benar sebelum pelanggan didaftarkan"
            />
            <div className="shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-black text-white font-black border-2 border-black p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label !mb-1">IDENTITAS</p>
                  <p className="font-medium text-black font-black">{form.nama}</p>
                  <p className="text-sm text-gray-600 font-bold font-mono">{form.noTelepon}</p>
                  <p className="text-sm text-gray-600 font-bold mt-1">
                    {KATEGORI_OPTIONS.find((k) => k.value === form.kategori)?.label || form.kategori}
                  </p>
                  {form.penanggungjawab && (
                    <p className="text-sm text-gray-600 font-bold mt-1">PJ: {form.penanggungjawab}</p>
                  )}
                </div>
                <div>
                  <p className="label !mb-1">ALAMAT & WILAYAH</p>
                  <p className="font-medium text-black font-black">{form.alamat}</p>
                  {form.rt && form.rw && <p className="text-sm text-gray-600 font-bold">RT {form.rt} / RW {form.rw}</p>}
                  <p className="text-sm text-gray-600 font-bold">
                    {kelurahanTerpilih?.nama || "-"}
                    {kelurahanTerpilih?.kecamatan && ` · ${kelurahanTerpilih.kecamatan}`}
                    {kelurahanTerpilih?.kota && ` · ${kelurahanTerpilih.kota}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label !mb-1">TARIF IURAN</p>
                  <p className="font-black uppercase tracking-tighter text-lg text-green-600">{formatRupiah(tarifAkhir)}<span className="text-xs text-gray-400 font-bold">/bln</span></p>
                  <p className="text-xs text-gray-600 font-bold">
                    {useCustomTarif
                      ? "Tarif kustom"
                      : paketTerpilih
                      ? `Paket: ${paketTerpilih.nama}`
                      : `Default ${kategoriTarifTerpilih?.label ?? form.kategori}`}
                  </p>
                </div>
                <div>
                  <p className="label !mb-1">STATUS</p>
                  <p className={`badge ${STATUS_OPTIONS.find((s) => s.value === form.status)?.tone ?? "badge-steel"}`}>
                    {STATUS_OPTIONS.find((s) => s.value === form.status)?.label ?? form.status}
                  </p>
                  <p className="text-xs text-gray-600 font-bold mt-1">
                    {form.status === "aktif" ? "Tagihan bulan ini dibuat otomatis" : "Tidak dibuatkan tagihan"}
                  </p>
                </div>
              </div>

              {form.patokanLokasi && (
                <div>
                  <p className="label !mb-1">PATOKAN LOKASI</p>
                  <p className="text-sm text-gray-600 font-bold">{form.patokanLokasi}</p>
                </div>
              )}
              {form.latitude && form.longitude && (
                <div>
                  <p className="label !mb-1">KOORDINAT <span className="normal-case">({form.koordinatSumber || "manual"})</span></p>
                  <p className="text-sm text-gray-600 font-bold font-mono">{form.latitude}, {form.longitude}</p>
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-600-bright mt-1 inline-flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Buka di Google Maps
                  </a>
                </div>
              )}
              {form.catatan && (
                <div>
                  <p className="label !mb-1">CATATAN INTERNAL</p>
                  <p className="text-sm text-gray-600 font-bold">{form.catatan}</p>
                </div>
              )}
              {form.fotoRumah && (
                <div>
                  <p className="label !mb-1">FOTO RUMAH</p>
                  <Image src={form.fotoRumah} alt="Foto rumah" width={128} height={128} unoptimized className="mt-1 max-h-32 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all object-cover" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-danger/10 text-red-600 text-sm px-4 py-3 border border-danger/40 font-mono">
            ⚠ {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-2 border-black">
          <button
            type="button"
            onClick={step === 1 ? () => router.push("/pelanggan") : prevStep}
            className="btn shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all px-4 py-2 text-sm"
          >
            {step === 1 ? "Batal" : "← Kembali"}
          </button>

          <div className="stencil text-gray-400 font-bold text-[10px]">
            LANGKAH {step} / {STEPS.length}
          </div>

          {step < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn btn-primary shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all px-6 py-2 text-sm"
            >
              Lanjut →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all px-6 py-2 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Mendaftarkan...
                </>
              ) : (
                "Daftarkan Pelanggan"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
