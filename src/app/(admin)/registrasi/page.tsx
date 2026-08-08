"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import CoordinatePicker from "@/components/CoordinatePicker";
import GeotagPhoto from "@/components/GeotagPhoto";

type Wilayah = { id: number; nama: string; rt?: string | null; rw?: string | null; kelurahan?: string | null; kecamatan?: string | null };
type Paket = { id: number; nama: string; harga: number; deskripsi?: string };
type KategoriTarif = { id: number; kategori: string; label: string; tarif: number; deskripsi?: string };

const STEPS = [
  { id: 1, label: "DATA DIRI" },
  { id: 2, label: "WILAYAH" },
  { id: 3, label: "LOKASI & FOTO" },
  { id: 4, label: "TARIF & STATUS" },
  { id: 5, label: "KONFIRMASI" },
];

const KATEGORI_OPTIONS = [
  { value: "rumah_tangga", label: "Rumah Tangga", icon: "🏠" },
  { value: "bisnis", label: "Bisnis/Toko", icon: "🏪" },
  { value: "kost", label: "Kost", icon: "🏘️" },
  { value: "sekolah", label: "Sekolah", icon: "🏫" },
  { value: "rm_makan", label: "Rumah Makan", icon: "🍽️" },
  { value: "perkantoran", label: "Kantor", icon: "🏢" },
  { value: "industri", label: "Industri", icon: "🏭" },
  { value: "lainnya", label: "Lainnya", icon: "📋" },
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
      <p className="stencil text-vest flex items-center gap-2">
        <span className="w-6 h-1 hazard inline-block" />
        {kode}
      </p>
      <h2 className="font-display text-xl text-bone tracking-wide mt-2">{judul}</h2>
      <p className="text-sm text-bone-dim mt-1">{desc}</p>
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
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [paketList, setPaketList] = useState<Paket[]>([]);
  const [kategoriTarifList, setKategoriTarifList] = useState<KategoriTarif[]>([]);
  const [useCustomTarif, setUseCustomTarif] = useState(false);

  const [form, setForm] = useState({
    // Data Diri
    nama: "",
    noTelepon: "",
    kategori: "rumah_tangga",
    penanggungjawab: "",
    // Wilayah & Alamat
    wilayahId: "",
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
  const wilayahTerpilih = wilayahList.find((w) => w.id.toString() === form.wilayahId);
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
        const [wilayahRes, paketRes, tarifRes] = await Promise.all([
          fetch("/api/wilayah"),
          fetch("/api/paket"),
          fetch("/api/kategori-tarif"),
        ]);
        setWilayahList(await wilayahRes.json());
        setPaketList(await paketRes.json());
        setKategoriTarifList(await tarifRes.json());
      } catch {
        setError("Gagal memuat data");
      }
    }
    fetchData();
  }, []);

  function pilihWilayah(wilayahId: string) {
    const w = wilayahList.find((x) => x.id.toString() === wilayahId);
    setForm((f) => ({
      ...f,
      wilayahId,
      rt: w?.rt || f.rt,
      rw: w?.rw || f.rw,
    }));
  }

  function nextStep() {
    setError("");

    if (step === 1) {
      if (!form.nama.trim()) return setError("Nama pelanggan wajib diisi");
      if (!form.noTelepon.trim()) return setError("No. telepon wajib diisi");
    }
    if (step === 2) {
      if (!form.alamat.trim()) return setError("Alamat wajib diisi");
      if (!form.wilayahId) return setError("Pilih wilayah / RT / RW");
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
        wilayahId: form.wilayahId,
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
      nama: "", noTelepon: "", kategori: "rumah_tangga", penanggungjawab: "",
      wilayahId: "", alamat: "", rt: "", rw: "",
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
        <div className="panel chamfer-sm p-8 text-center">
          <div className="w-16 h-16 chamfer-sm bg-vest/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-vest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="stencil text-vest mb-2">PENDAFTARAN BERHASIL</p>
          <h2 className="font-display text-2xl text-bone mb-2">{successData?.nama}</h2>
          <p className="text-sm text-bone-dim mb-6">
            Status: <span className={`badge ${statusLabel === "Aktif" ? "badge-vest" : "badge-amber"}`}>{statusLabel}</span>
            {form.status === "aktif" && " — tagihan bulan ini sudah dibuat otomatis."}
          </p>

          {successData?.kode && (
            <div className="bg-asphalt-deep/40 chamfer-sm p-6 mb-6 inline-block">
              <p className="stencil text-bone-faint text-[10px] mb-2">KODE PELANGGAN</p>
              <p className="font-display text-3xl text-bone tracking-widest mb-3">{successData.kode}</p>
              {/* Barcode SVG */}
              <svg className="mx-auto" width="200" height="50" viewBox="0 0 200 50" aria-hidden>
                {successData.kode.split("").map((char, i) => (
                  <rect key={i} x={4 + i * 16} y="4" width={char === "-" ? 4 : 6} height="36" fill={char === "-" ? "#fff" : "#000"} />
                ))}
                <rect x="0" y="0" width="4" height="44" fill="#000" />
                <rect x="196" y="0" width="4" height="44" fill="#000" />
              </svg>
              <p className="text-xs text-bone-faint mt-2 font-mono">{successData.kode}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/pelanggan")}
              className="btn btn-primary chamfer-sm px-4 py-2 text-sm"
            >
              Lihat Data Pelanggan
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setSuccessData(null);
                resetForm();
              }}
              className="btn chamfer-sm px-4 py-2 text-sm"
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
        <p className="stencil text-vest flex items-center gap-2">
          <span className="w-8 h-1.5 hazard inline-block" />
          REGISTRASI
        </p>
        <h1 className="font-display text-2xl text-bone mt-2">Pendaftaran Pelanggan Baru</h1>
        <p className="text-sm text-bone-dim mt-1">
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
                    className={`chamfer-sm w-9 h-9 flex items-center justify-center font-display text-sm transition ${
                      selesai
                        ? "bg-vest/25 text-vest"
                        : aktif
                        ? "bg-vest text-asphalt-deep shadow-[0_0_18px_rgba(183,225,60,0.35)]"
                        : "bg-asphalt-raised text-bone-faint"
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
                      aktif ? "text-vest" : selesai ? "text-bone-dim" : "text-bone-faint"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${selesai ? "bg-vest" : "bg-asphalt-raised"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel chamfer-sm p-6 md:p-8">
        {/* ═══ STEP 1: DATA DIRI ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <JudulSection
              kode="01 / DATA DIRI"
              judul="Identitas Pelanggan"
              desc="Data utama yang dipakai untuk tagihan, kartu anggota, dan notifikasi"
            />
            <div>
              <label className="label">Nama Lengkap <span className="text-danger">*</span></label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="input"
                placeholder="Nama warga / pemilik usaha"
              />
            </div>
            <div>
              <label className="label">No. Telepon / WhatsApp <span className="text-danger">*</span></label>
              <input
                type="text"
                value={form.noTelepon}
                onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                className="input"
                placeholder="08xxxxxxxxxx"
              />
              <p className="text-xs text-bone-faint mt-1">Notifikasi tagihan & pembayaran dikirim ke nomor ini</p>
            </div>

            <div>
              <label className="label">Kategori Pelanggan <span className="text-danger">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {KATEGORI_OPTIONS.map((k) => (
                  <label
                    key={k.value}
                    className={`chamfer-sm flex flex-col items-center gap-1 px-3 py-3 border cursor-pointer transition ${
                      form.kategori === k.value
                        ? "border-vest bg-vest/10 shadow-[0_0_14px_rgba(183,225,60,0.18)]"
                        : "border-asphalt-line hover:border-asphalt-line bg-asphalt-deep/30"
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
                    <span className="text-xs font-medium text-bone-dim text-center leading-tight">{k.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Penanggung Jawab <span className="text-bone-faint normal-case">(opsional)</span></label>
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
              kode="02 / WILAYAH"
              judul="Wilayah & Alamat"
              desc="Wilayah menentukan rute pengangkutan dan pelaporan per RT/RW"
            />
            <div>
              <label className="label">Wilayah / RT / RW <span className="text-danger">*</span></label>
              <select value={form.wilayahId} onChange={(e) => pilihWilayah(e.target.value)} className="input">
                <option value="">— Pilih Wilayah —</option>
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                    {w.rt ? ` — RT ${w.rt}` : ""}
                    {w.rw ? `/RW ${w.rw}` : ""}
                    {w.kelurahan ? ` · ${w.kelurahan}` : ""}
                  </option>
                ))}
              </select>
              {wilayahTerpilih && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge badge-vest">{wilayahTerpilih.kecamatan || "Kec. —"}</span>
                  <span className="badge badge-steel">{wilayahTerpilih.kelurahan || "Kel. —"}</span>
                  <span className="badge">{wilayahTerpilih.nama}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Alamat Lengkap <span className="text-danger">*</span></label>
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
            <p className="text-xs text-bone-faint">
              RT/RW terisi otomatis dari wilayah terpilih — sesuaikan bila perlu.
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
              <label className="label">Patokan / Tag Lokasi <span className="text-bone-faint normal-case">(opsional)</span></label>
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
            <div className="chamfer-sm bg-vest/5 border border-vest/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label !mb-1 text-vest">TARIF DEFAULT — {kategoriTarifTerpilih?.label ?? form.kategori}</p>
                  <p className="text-xs text-bone-dim">{kategoriTarifTerpilih?.deskripsi ?? "Tarif berdasarkan kategori"}</p>
                </div>
                <p className="font-display text-xl text-vest whitespace-nowrap">{formatRupiah(tarifDefaultKategori)}<span className="text-xs text-bone-faint">/bln</span></p>
              </div>
            </div>

            {/* Pilihan paket */}
            {paketList.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="stencil text-bone-faint text-[10px]">ATAU PILIH PAKET</span>
                  <div className="flex-1 h-px bg-asphalt-raised" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paketList.map((p) => {
                    const dipilih = form.paketId === p.id.toString();
                    return (
                      <label
                        key={p.id}
                        className={`chamfer-sm relative border p-4 cursor-pointer transition ${
                          dipilih
                            ? "border-vest bg-vest/10 shadow-[0_0_14px_rgba(183,225,60,0.18)]"
                            : "border-asphalt-line bg-asphalt-deep/30 hover:border-asphalt-line"
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
                            <h3 className="font-display text-sm text-bone tracking-wide">{p.nama}</h3>
                            {p.deskripsi && <p className="text-xs text-bone-dim mt-1">{p.deskripsi}</p>}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="font-display text-lg text-vest">{formatRupiah(p.harga)}</p>
                            <p className="text-[10px] text-bone-faint">/bulan</p>
                          </div>
                        </div>
                        {dipilih && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 chamfer-sm bg-vest flex items-center justify-center">
                            <svg className="w-4 h-4 text-asphalt-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="text-center py-4 bg-asphalt-deep/40 chamfer-sm">
                <p className="text-bone-faint text-sm mb-2">Belum ada paket tersedia — pakai tarif default kategori</p>
              </div>
            )}

            {/* Tarif kustom */}
            <div className="flex items-center gap-3">
              <span className="stencil text-bone-faint text-[10px]">ATAU TARIF KUSTOM</span>
              <div className="flex-1 h-px bg-asphalt-raised" />
            </div>
            <label className="chamfer-sm flex items-start gap-3 p-4 border border-asphalt-line bg-asphalt-deep/30 cursor-pointer transition">
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
                <p className="text-sm font-medium text-bone">Tarif Kustom</p>
                <p className="text-xs text-bone-dim">Nominal iuran khusus untuk pelanggan ini (mengalahkan paket)</p>
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
                      <p className="text-xs text-vest mt-1 font-mono">= {formatRupiah(parseFloat(form.customTarif))} / bulan</p>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Ringkasan tarif */}
            <div className="chamfer-sm bg-asphalt-deep/40 border border-asphalt-line p-4 flex items-center justify-between">
              <div>
                <p className="label !mb-1">TARIF AKHIR</p>
                <p className="text-xs text-bone-dim">
                  {useCustomTarif
                    ? "Tarif kustom"
                    : paketTerpilih
                    ? `Paket: ${paketTerpilih.nama}`
                    : `Default kategori ${kategoriTarifTerpilih?.label ?? form.kategori}`}
                </p>
              </div>
              <p className="font-display text-2xl text-vest">
                {formatRupiah(tarifAkhir)}
                <span className="text-xs text-bone-faint">/bln</span>
              </p>
            </div>

            {/* Status langganan */}
            <div>
              <label className="label">Status Langganan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <label
                    key={s.value}
                    className={`chamfer-sm flex items-start gap-3 p-3 border cursor-pointer transition ${
                      form.status === s.value
                        ? "border-vest bg-vest/10"
                        : "border-asphalt-line bg-asphalt-deep/30 hover:border-asphalt-line"
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
                      <p className="text-sm font-medium text-bone">{s.label}</p>
                      <p className="text-xs text-bone-dim mt-0.5">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="label">Catatan Internal <span className="text-bone-faint normal-case">(opsional)</span></label>
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
            <div className="chamfer-sm bg-asphalt-deep/40 border border-asphalt-line p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label !mb-1">IDENTITAS</p>
                  <p className="font-medium text-bone">{form.nama}</p>
                  <p className="text-sm text-bone-dim font-mono">{form.noTelepon}</p>
                  <p className="text-sm text-bone-dim mt-1">
                    {KATEGORI_OPTIONS.find((k) => k.value === form.kategori)?.label || form.kategori}
                  </p>
                  {form.penanggungjawab && (
                    <p className="text-sm text-bone-dim mt-1">PJ: {form.penanggungjawab}</p>
                  )}
                </div>
                <div>
                  <p className="label !mb-1">ALAMAT & WILAYAH</p>
                  <p className="font-medium text-bone">{form.alamat}</p>
                  {form.rt && form.rw && <p className="text-sm text-bone-dim">RT {form.rt} / RW {form.rw}</p>}
                  <p className="text-sm text-bone-dim">
                    {wilayahTerpilih?.nama || "-"}
                    {wilayahTerpilih?.kelurahan && ` · ${wilayahTerpilih.kelurahan}`}
                    {wilayahTerpilih?.kecamatan && ` · ${wilayahTerpilih.kecamatan}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label !mb-1">TARIF IURAN</p>
                  <p className="font-display text-lg text-vest">{formatRupiah(tarifAkhir)}<span className="text-xs text-bone-faint">/bln</span></p>
                  <p className="text-xs text-bone-dim">
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
                  <p className="text-xs text-bone-dim mt-1">
                    {form.status === "aktif" ? "Tagihan bulan ini dibuat otomatis" : "Tidak dibuatkan tagihan"}
                  </p>
                </div>
              </div>

              {form.patokanLokasi && (
                <div>
                  <p className="label !mb-1">PATOKAN LOKASI</p>
                  <p className="text-sm text-bone-dim">{form.patokanLokasi}</p>
                </div>
              )}
              {form.latitude && form.longitude && (
                <div>
                  <p className="label !mb-1">KOORDINAT <span className="normal-case">({form.koordinatSumber || "manual"})</span></p>
                  <p className="text-sm text-bone-dim font-mono">{form.latitude}, {form.longitude}</p>
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-vest hover:text-vest-bright mt-1 inline-flex items-center gap-1"
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
                  <p className="text-sm text-bone-dim">{form.catatan}</p>
                </div>
              )}
              {form.fotoRumah && (
                <div>
                  <p className="label !mb-1">FOTO RUMAH</p>
                  <Image src={form.fotoRumah} alt="Foto rumah" width={128} height={128} unoptimized className="mt-1 max-h-32 chamfer-sm object-cover" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 chamfer-sm bg-danger/10 text-danger text-sm px-4 py-3 border border-danger/40 font-mono">
            ⚠ {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-asphalt-line">
          <button
            type="button"
            onClick={step === 1 ? () => router.push("/pelanggan") : prevStep}
            className="btn chamfer-sm px-4 py-2 text-sm"
          >
            {step === 1 ? "Batal" : "← Kembali"}
          </button>

          <div className="stencil text-bone-faint text-[10px]">
            LANGKAH {step} / {STEPS.length}
          </div>

          {step < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn btn-primary chamfer-sm px-6 py-2 text-sm"
            >
              Lanjut →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary chamfer-sm px-6 py-2 text-sm disabled:opacity-50 flex items-center gap-2"
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
