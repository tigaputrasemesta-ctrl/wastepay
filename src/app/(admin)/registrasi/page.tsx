"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import CoordinatePicker from "@/components/CoordinatePicker";
import GeotagPhoto from "@/components/GeotagPhoto";

type Kelurahan = { id: number; nama: string; kecamatan?: string | null; kota?: string | null };
type Zona = { id: number; nama: string; warna?: string | null; kelurahanId: number };
type Petugas = { id: number; nama: string; jabatan?: string | null; aktif?: boolean };
type Rute = { id: number; nama: string; hari: string; jam?: string | null; kelurahanId?: number | null; zonaId?: number | null; petugasId?: number | null };
type Paket = { id: number; nama: string; harga: number | null; deskripsi?: string };
type KategoriTarif = { id: number; kategori: string; label: string; tarif: number; deskripsi?: string };

const STEPS = [
  { id: 1, label: "DATA DIRI" },
  { id: 2, label: "WILAYAH & ZONASI" },
  { id: 3, label: "LOKASI & FOTO" },
  { id: 4, label: "JADWAL, PETUGAS & TARIF" },
  { id: 5, label: "KONFIRMASI" },
];

const DAFTAR_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

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
  { value: "aktif", label: "Aktif", desc: "Langganan berjalan — tagihan bulan ini dibuat otomatis", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "calon", label: "Calon", desc: "Belum mulai berlangganan — tidak dibuatkan tagihan", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "nonaktif", label: "Nonaktif", desc: "Berhenti berlangganan — tidak dibuatkan tagihan", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "libur", label: "Libur", desc: "Berhenti sementara — tidak dibuatkan tagihan", tone: "bg-slate-100 text-slate-700 border-slate-200" },
];

function JudulSection({ kode, judul, desc }: { kode: string; judul: string; desc: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
        {kode}
      </p>
      <h2 className="text-xl font-bold text-slate-900 mt-1">{judul}</h2>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
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
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [ruteList, setRuteList] = useState<Rute[]>([]);
  const [paketList, setPaketList] = useState<Paket[]>([]);
  const [kategoriTarifList, setKategoriTarifList] = useState<KategoriTarif[]>([]);
  const [useCustomTarif, setUseCustomTarif] = useState(false);

  const [form, setForm] = useState({
    // Data Diri
    nama: "",
    noTelepon: "",
    kategori: "level_1",
    penanggungjawab: "",
    // Wilayah, Zonasi & Alamat
    kelurahanId: "",
    zonaId: "",
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
    // Jadwal, Petugas & Operasional
    petugasId: "",
    ruteId: "",
    hari: ["Senin", "Kamis"] as string[],
    jam: "08:00",
    // Tarif & Status
    paketId: "",
    customTarif: "",
    status: "aktif",
    catatan: "",
  });

  // ── Data turunan ──
  const kelurahanTerpilih = kelurahanList.find((k) => k.id.toString() === form.kelurahanId);
  const zonaTerpilih = zonaList.find((z) => z.id.toString() === form.zonaId);
  const petugasTerpilih = petugasList.find((p) => p.id.toString() === form.petugasId);
  const ruteTerpilih = ruteList.find((r) => r.id.toString() === form.ruteId);
  const kategoriTarifTerpilih = kategoriTarifList.find((k) => k.kategori === form.kategori);
  const tarifDefaultKategori = kategoriTarifTerpilih?.tarif ?? 0;
  const paketTerpilih = paketList.find((p) => p.id.toString() === form.paketId);

  const availableZonas = zonaList.filter(
    (z) => !form.kelurahanId || z.kelurahanId === parseInt(form.kelurahanId)
  );
  const availableRutes = ruteList.filter((r) => {
    if (form.zonaId && r.zonaId) return r.zonaId === parseInt(form.zonaId);
    if (form.kelurahanId && r.kelurahanId) return r.kelurahanId === parseInt(form.kelurahanId);
    return true;
  });

  const tarifAkhir =
    useCustomTarif && form.customTarif
      ? parseFloat(form.customTarif) || 0
      : paketTerpilih?.harga ?? tarifDefaultKategori;

  useEffect(() => {
    async function fetchData() {
      try {
        const [kelurahanRes, zonaRes, petugasRes, ruteRes, paketRes, tarifRes] = await Promise.all([
          fetch("/api/kelurahan"),
          fetch("/api/zona"),
          fetch("/api/petugas"),
          fetch("/api/rute"),
          fetch("/api/paket"),
          fetch("/api/kategori-tarif"),
        ]);
        setKelurahanList(await kelurahanRes.json());
        setZonaList(await zonaRes.json());
        const rawPetugas = await petugasRes.json();
        setPetugasList(Array.isArray(rawPetugas) ? rawPetugas : []);
        setRuteList(await ruteRes.json());
        setPaketList(await paketRes.json());
        setKategoriTarifList(await tarifRes.json());
      } catch {
        setError("Gagal memuat data");
      }
    }
    fetchData();
  }, []);

  const toggleHari = (h: string) => {
    setForm((f) => ({
      ...f,
      hari: f.hari.includes(h) ? f.hari.filter((d) => d !== h) : [...f.hari, h],
    }));
  };

  const handleRuteChange = (rid: string) => {
    setForm((f) => {
      const updated = { ...f, ruteId: rid };
      if (!rid) return updated;
      const r = ruteList.find((item) => item.id.toString() === rid);
      if (r) {
        if (r.petugasId) updated.petugasId = r.petugasId.toString();
        if (r.hari) {
          const days = r.hari
            .split(",")
            .map((s) => s.trim())
            .filter((s) => DAFTAR_HARI.includes(s));
          if (days.length > 0) updated.hari = days;
        }
        if (r.jam) updated.jam = r.jam;
      }
      return updated;
    });
  };

  function nextStep() {
    setError("");

    if (step === 1) {
      if (!form.nama.trim()) return setError("Nama pelanggan wajib diisi");
      if (!form.noTelepon.trim()) return setError("No. telepon wajib diisi");
    }
    if (step === 2) {
      if (!form.alamat.trim()) return setError("Alamat wajib diisi");
      if (!form.kelurahanId) return setError("Pilih kelurahan");
      if (availableZonas.length > 0 && !form.zonaId) {
        return setError("Pilih Zona Area Pickup");
      }
    }
    if (step === 4) {
      if (form.hari.length === 0) {
        return setError("Pilih minimal satu hari penjemputan sampah");
      }
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
        zonaId: form.zonaId,
        petugasId: form.petugasId,
        ruteId: form.ruteId,
        hari: form.hari,
        jam: form.jam,
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
      kelurahanId: "", zonaId: "", alamat: "", rt: "", rw: "",
      patokanLokasi: "", latitude: "", longitude: "", koordinatSumber: "", koordinatAkurasi: "", fotoRumah: "",
      petugasId: "", ruteId: "", hari: ["Senin", "Kamis"], jam: "08:00",
      paketId: "", customTarif: "", status: "aktif", catatan: "",
    });
    setUseCustomTarif(false);
    setStep(1);
  }

  if (success) {
    const statusLabel = STATUS_OPTIONS.find((s) => s.value === form.status)?.label ?? form.status;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Pendaftaran Berhasil</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{successData?.nama}</h2>
          <p className="text-sm text-slate-500 mb-6">
            Status: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{statusLabel}</span>
            {form.status === "aktif" && " — tagihan bulan ini sudah dibuat otomatis."}
          </p>

          {successData?.kode && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 mb-6 inline-block">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Kode Pelanggan</p>
              <p className="font-bold text-3xl text-slate-900 tracking-widest mb-3">{successData.kode}</p>
              {/* Barcode SVG */}
              <svg className="mx-auto" width="200" height="50" viewBox="0 0 200 50" aria-hidden>
                {successData.kode.split("").map((char, i) => (
                  <rect key={i} x={4 + i * 16} y="4" width={char === "-" ? 4 : 6} height="36" fill={char === "-" ? "#fff" : "#000"} />
                ))}
                <rect x="0" y="0" width="4" height="44" fill="#000" />
                <rect x="196" y="0" width="4" height="44" fill="#000" />
              </svg>
              <p className="text-xs text-slate-600 font-mono mt-2">{successData.kode}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/pelanggan")}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all"
            >
              Lihat Data Pelanggan
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setSuccessData(null);
                resetForm();
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
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
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
          REGISTRASI
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Pendaftaran Pelanggan Baru</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
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
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      selesai
                        ? "bg-emerald-700 text-white"
                        : aktif
                        ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
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
                    className={`text-xs font-medium hidden sm:inline ${
                      aktif ? "text-slate-900 font-semibold" : selesai ? "text-slate-600" : "text-slate-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${selesai ? "bg-emerald-500" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8">
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
              <p className="text-xs text-slate-600 font-bold mt-1">Notifikasi tagihan & pembayaran dikirim ke nomor ini</p>
            </div>

            <div>
              <label className="label">Kategori Pelanggan <span className="text-red-600">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {KATEGORI_OPTIONS.map((k) => (
                  <label
                    key={k.value}
                    className={`rounded-2xl flex flex-col items-center gap-1.5 px-3 py-3.5 border cursor-pointer transition-all ${
                      form.kategori === k.value
                        ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
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
                    <span className="text-xl">{k.icon}</span>
                    <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{k.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Penanggung Jawab <span className="text-slate-600 font-bold normal-case">(opsional)</span></label>
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

        {/* ═══ STEP 2: WILAYAH & ZONASI ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <JudulSection
              kode="02 / WILAYAH & ZONASI"
              judul="Kelurahan, Zonasi & Alamat"
              desc="Kelurahan dan Zona Area Pickup menentukan plotting wilayah penjemputan armada"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Kelurahan <span className="text-red-600">*</span></label>
                <select
                  value={form.kelurahanId}
                  onChange={(e) => setForm({ ...form, kelurahanId: e.target.value, zonaId: "", ruteId: "" })}
                  className="input"
                >
                  <option value="">— Pilih Kelurahan —</option>
                  {kelurahanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}{k.kecamatan ? ` · ${k.kecamatan}` : ""}
                    </option>
                  ))}
                </select>
                {kelurahanTerpilih && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{kelurahanTerpilih.kecamatan || "Kec. —"}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{kelurahanTerpilih.nama || "Kel. —"}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label flex items-center justify-between">
                  <span className="text-emerald-800 font-bold">📍 Zona Area Pickup <span className="text-red-600">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">Sesuai Kelurahan</span>
                </label>
                <select
                  value={form.zonaId}
                  onChange={(e) => setForm({ ...form, zonaId: e.target.value, ruteId: "" })}
                  className="input border-2 border-emerald-500 font-bold text-emerald-950 shadow-xs"
                >
                  <option value="">— Pilih Zona Area Pickup —</option>
                  {availableZonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nama}
                    </option>
                  ))}
                </select>
                {availableZonas.length === 0 && form.kelurahanId && (
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    Kelurahan ini belum memiliki zona. Anda dapat mengaturnya di menu Zona Angkut.
                  </p>
                )}
                {zonaTerpilih && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: zonaTerpilih.warna || "#10b981" }}
                    />
                    <span className="text-xs font-bold text-emerald-800">
                      Terpilih: {zonaTerpilih.nama}
                    </span>
                  </div>
                )}
              </div>
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
            <p className="text-xs text-slate-600 font-bold">
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
              <label className="label">Patokan / Tag Lokasi <span className="text-slate-600 font-bold normal-case">(opsional)</span></label>
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

        {/* ═══ STEP 4: JADWAL, PETUGAS & TARIF ═══ */}
        {step === 4 && (
          <div className="space-y-6">
            <JudulSection
              kode="04 / JADWAL & TARIF"
              judul="Jadwal Pickup, Petugas & Tarif Iuran"
              desc="Tentukan petugas armada, hari penjemputan (bisa lebih dari satu hari), dan skema tarif"
            />

            {/* Bagian Operasional & Jadwal Multi-Hari */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-600/20 bg-emerald-50/20 space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-900/10 pb-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-700 text-white text-sm flex items-center justify-center font-black shadow-xs">
                  🚚
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Operasional Penjemputan Sampah</h3>
                  <p className="text-xs text-slate-500">Pilih petugas pickup armada dan jadwal penjemputan warga (bisa multi-hari)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Petugas Pickup */}
                <div>
                  <label className="label">Petugas Pickup / Supir</label>
                  <select
                    value={form.petugasId}
                    onChange={(e) => setForm({ ...form, petugasId: e.target.value })}
                    className="input bg-white font-semibold text-slate-800"
                  >
                    <option value="">— Pilih Petugas —</option>
                    {petugasList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} {p.jabatan ? `(${p.jabatan})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rute Armada */}
                <div>
                  <label className="label">Rute Armada (Opsional)</label>
                  <select
                    value={form.ruteId}
                    onChange={(e) => handleRuteChange(e.target.value)}
                    className="input bg-white"
                  >
                    <option value="">— Hubungkan ke Rute —</option>
                    {availableRutes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} ({r.hari})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jam Estimasi */}
                <div>
                  <label className="label">Jam Penjemputan</label>
                  <input
                    type="time"
                    value={form.jam}
                    onChange={(e) => setForm({ ...form, jam: e.target.value })}
                    className="input bg-white"
                  />
                </div>
              </div>

              {/* Multi-Select Hari Pengangkutan */}
              <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    Pilih Hari Penjemputan <span className="text-slate-500 font-normal">(Bisa memilih lebih dari satu hari)</span>
                  </label>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, hari: ["Senin", "Kamis"] }))}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
                    >
                      Senin &amp; Kamis
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, hari: ["Senin", "Rabu", "Jumat"] }))}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
                    >
                      Senin, Rabu, Jumat
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, hari: ["Selasa", "Kamis", "Sabtu"] }))}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
                    >
                      Selasa, Kamis, Sabtu
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, hari: [...DAFTAR_HARI] }))}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
                    >
                      Semua Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, hari: [] }))}
                      className="px-2 py-0.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Day Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                  {DAFTAR_HARI.map((h) => {
                    const isSelected = form.hari.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => toggleHari(h)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-700 text-white shadow-xs scale-[1.02]"
                            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <span>{isSelected ? "✓" : "+"}</span>
                        <span>{h}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selection status */}
                <div className="text-[11px] font-medium pt-0.5">
                  {form.hari.length > 0 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span>✓</span>
                      <span>{form.hari.length} hari penjemputan dipilih: <strong>{form.hari.join(", ")}</strong></span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      ⚠️ Belum ada hari penjemputan yang dipilih. Silakan pilih minimal 1 hari.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tarif default kategori */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider !mb-1">TARIF DEFAULT — {kategoriTarifTerpilih?.label ?? form.kategori}</p>
                  <p className="text-xs text-slate-600 font-medium">{kategoriTarifTerpilih?.deskripsi ?? "Tarif berdasarkan kategori"}</p>
                </div>
                <p className="font-bold tracking-tight text-xl text-emerald-700 whitespace-nowrap">{formatRupiah(tarifDefaultKategori)}<span className="text-xs text-slate-600 font-normal">/bln</span></p>
              </div>
            </div>

            {/* Pilihan paket */}
            {paketList.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Atau Pilih Paket</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paketList.map((p) => {
                    const dipilih = form.paketId === p.id.toString();
                    return (
                      <label
                        key={p.id}
                        className={`rounded-2xl relative border p-4 cursor-pointer transition-all ${
                          dipilih
                            ? "border-emerald-500 bg-emerald-50/40 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
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
                            <h3 className="font-semibold text-sm text-slate-900">{p.nama}</h3>
                            {p.deskripsi && <p className="text-xs text-slate-500 mt-1">{p.deskripsi}</p>}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="font-bold text-lg text-emerald-700">{p.harga != null ? formatRupiah(p.harga) : "Variabel"}</p>
                            <p className="text-[10px] text-slate-600">{p.harga != null ? "/bulan" : "sesuai kebutuhan"}</p>
                          </div>
                        </div>
                        {dipilih && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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
              <div className="text-center py-4 bg-slate-50 text-slate-500 rounded-2xl border border-slate-200/80">
                <p className="text-slate-600 font-medium text-sm">Belum ada paket tersedia — pakai tarif default kategori</p>
              </div>
            )}

            {/* Tarif kustom */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Atau Tarif Kustom</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <label className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-start gap-3 cursor-pointer hover:border-slate-300 transition-all shadow-sm">
              <input
                type="checkbox"
                checked={useCustomTarif}
                onChange={(e) => {
                  setUseCustomTarif(e.target.checked);
                  if (e.target.checked) setForm({ ...form, paketId: "" });
                  else setForm({ ...form, customTarif: "" });
                }}
                className="mt-1 accent-emerald-600 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Tarif Kustom</p>
                <p className="text-xs text-slate-500 font-normal">Nominal iuran khusus untuk pelanggan ini (mengalahkan paket)</p>
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
                      <p className="text-xs text-emerald-700 mt-1 font-semibold">= {formatRupiah(parseFloat(form.customTarif))} / bulan</p>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Ringkasan tarif */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider !mb-1">TARIF AKHIR</p>
                <p className="text-xs text-slate-600 font-medium">
                  {useCustomTarif
                    ? "Tarif kustom"
                    : paketTerpilih
                    ? `Paket: ${paketTerpilih.nama}`
                    : `Default kategori ${kategoriTarifTerpilih?.label ?? form.kategori}`}
                </p>
              </div>
              <p className="font-bold tracking-tight text-2xl text-emerald-700">
                {formatRupiah(tarifAkhir)}
                <span className="text-xs text-slate-600 font-normal">/bln</span>
              </p>
            </div>

            {/* Status langganan */}
            <div>
              <label className="label">Status Langganan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <label
                    key={s.value}
                    className={`rounded-2xl flex items-start gap-3 p-3.5 border cursor-pointer transition-all ${
                      form.status === s.value
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      checked={form.status === s.value}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="label">Catatan Internal <span className="text-slate-600 font-bold normal-case">(opsional)</span></label>
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
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label !mb-1 text-xs font-semibold text-slate-500">IDENTITAS</p>
                  <p className="font-semibold text-slate-900 text-base">{form.nama}</p>
                  <p className="text-sm text-slate-600">{form.noTelepon}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {KATEGORI_OPTIONS.find((k) => k.value === form.kategori)?.label || form.kategori}
                  </p>
                  {form.penanggungjawab && (
                    <p className="text-sm text-slate-600 mt-1">PJ: {form.penanggungjawab}</p>
                  )}
                </div>
                <div>
                  <p className="label !mb-1 text-xs font-semibold text-slate-500">ALAMAT &amp; ZONASI</p>
                  <p className="font-semibold text-slate-900 text-base">{form.alamat}</p>
                  {form.rt && form.rw && <p className="text-sm text-slate-600">RT {form.rt} / RW {form.rw}</p>}
                  <p className="text-sm text-slate-600">
                    {kelurahanTerpilih?.nama || "-"}
                    {kelurahanTerpilih?.kecamatan && ` · ${kelurahanTerpilih.kecamatan}`}
                    {kelurahanTerpilih?.kota && ` · ${kelurahanTerpilih.kota}`}
                  </p>
                  {zonaTerpilih && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                      <span>📍 Zona:</span>
                      <span>{zonaTerpilih.nama}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Konfirmasi Operasional Penjemputan */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <p className="label !mb-2 text-xs font-semibold text-slate-500">OPERASIONAL &amp; PENJEMPUTAN</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-600 font-bold block text-[11px]">Petugas Pickup:</span>
                    <span className="font-bold text-slate-800">
                      {petugasTerpilih ? `${petugasTerpilih.nama} ${petugasTerpilih.jabatan ? `(${petugasTerpilih.jabatan})` : ""}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold block text-[11px]">Hari Penjemputan:</span>
                    <span className="font-bold text-emerald-700">
                      {form.hari.length > 0 ? form.hari.join(", ") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold block text-[11px]">Jam Estimasi / Rute:</span>
                    <span className="font-medium text-slate-800">
                      {form.jam} {ruteTerpilih ? `· ${ruteTerpilih.nama}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label !mb-1 text-xs font-semibold text-slate-500">TARIF IURAN</p>
                  <p className="font-bold tracking-tight text-lg text-emerald-700">{formatRupiah(tarifAkhir)}<span className="text-xs text-slate-600 font-normal">/bln</span></p>
                  <p className="text-xs text-slate-500">
                    {useCustomTarif
                      ? "Tarif kustom"
                      : paketTerpilih
                      ? `Paket: ${paketTerpilih.nama}`
                      : `Default ${kategoriTarifTerpilih?.label ?? form.kategori}`}
                  </p>
                </div>
                <div>
                  <p className="label !mb-1 text-xs font-semibold text-slate-500">STATUS</p>
                  <p className={`badge ${STATUS_OPTIONS.find((s) => s.value === form.status)?.tone ?? "badge-steel"}`}>
                    {STATUS_OPTIONS.find((s) => s.value === form.status)?.label ?? form.status}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.status === "aktif" ? "Tagihan bulan ini dibuat otomatis" : "Tidak dibuatkan tagihan"}
                  </p>
                </div>
              </div>

              {form.patokanLokasi && (
                <div>
                  <p className="label !mb-1 text-xs font-semibold text-slate-500">PATOKAN LOKASI</p>
                  <p className="text-sm text-slate-600">{form.patokanLokasi}</p>
                </div>
              )}
              {form.latitude && form.longitude && (
                <div>
                  <p className="label !mb-1 text-xs font-semibold text-slate-500">KOORDINAT <span className="normal-case">({form.koordinatSumber || "manual"})</span></p>
                  <p className="text-sm text-slate-600 font-mono">{form.latitude}, {form.longitude}</p>
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-700 font-medium mt-1 inline-flex items-center gap-1"
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
                  <p className="text-sm text-slate-600 font-medium">{form.catatan}</p>
                </div>
              )}
              {form.fotoRumah && (
                <div>
                  <p className="label !mb-1">FOTO RUMAH</p>
                  <Image src={form.fotoRumah} alt="Foto rumah" width={128} height={128} unoptimized className="mt-1 max-h-32 shadow-sm hover:shadow-md active:scale-[0.98] transition-all object-cover" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-2xl border border-rose-200 font-medium">
            ⚠ {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={step === 1 ? () => router.push("/pelanggan") : prevStep}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all"
          >
            {step === 1 ? "Batal" : "← Kembali"}
          </button>

          <div className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            Langkah {step} dari {STEPS.length}
          </div>

          {step < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm hover:shadow active:scale-95 transition-all"
            >
              Lanjut →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
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
