"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import {
  Truck,
  Hammer,
  Trees,
  Armchair,
  PartyPopper,
  Tv,
  MapPin,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Phone,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface KategoriPickup {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  satuanMuatan: string;
  tarifDasar: number;
  tarifPerUnit: number | null;
  armadaStandar: string | null;
  icon: string | null;
}

const KATEGORI_ICONS: Record<string, any> = {
  puing: Hammer,
  ranting: Trees,
  bulky: Armchair,
  event: PartyPopper,
  ewaste: Tv,
};

export default function PickupSekaliAngkutPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<KategoriPickup[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Form State
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [jumlahUnit, setJumlahUnit] = useState(1);
  const [estimasiMuatan, setEstimasiMuatan] = useState("");
  const [fotoSampah, setFotoSampah] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Lokasi
  const [alamat, setAlamat] = useState("");
  const [patokan, setPatokan] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("Beji");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  // Jadwal
  const todayStr = new Date().toISOString().split("T")[0];
  const [tanggalJemput, setTanggalJemput] = useState(todayStr);
  const [waktuJemput, setWaktuJemput] = useState("pagi");

  // Pemesan
  const [namaPemesan, setNamaPemesan] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("cod");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load Kategori
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/pickup/kategori");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setCategories(json.data);
          if (json.data.length > 0) {
            setSelectedCatId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal load kategori pickup:", err);
      } finally {
        setLoadingCats(false);
      }
    }
    fetchCategories();
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCatId);

  // Perhitungan Estimasi Biaya
  const baseCost = selectedCategory ? selectedCategory.tarifDasar : 0;
  const unitCost = selectedCategory?.tarifPerUnit || 0;
  const totalEstimasi = baseCost + Math.max(jumlahUnit - 1, 0) * unitCost;

  // Handle GPS Auto-detect
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung deteksi lokasi otomatis");
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocatingGps(false);
      },
      (err) => {
        console.warn("Gagal deteksi GPS:", err.message);
        setLocatingGps(false);
        alert("Gagal membaca titik GPS. Silakan pastikan izin lokasi telah aktif.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Upload Foto Sampah
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran foto maksimal 5MB");
      return;
    }

    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.url) {
        setFotoSampah(data.url);
      } else {
        alert(data.error || "Gagal mengunggah foto");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setUploadingFoto(false);
    }
  };

  // Submit Order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedCatId) {
      setErrorMsg("Pilih kategori sampah yang ingin dijemput");
      return;
    }
    if (!namaPemesan.trim()) {
      setErrorMsg("Nama pemesan wajib diisi");
      return;
    }
    if (!noTelepon.trim() || noTelepon.length < 9) {
      setErrorMsg("Nomor WhatsApp yang valid wajib diisi");
      return;
    }
    if (!alamat.trim()) {
      setErrorMsg("Alamat penjemputan lengkap wajib diisi");
      return;
    }
    if (!tanggalJemput) {
      setErrorMsg("Pilih tanggal penjemputan");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        namaPemesan: namaPemesan.trim(),
        noTelepon: noTelepon.trim(),
        alamat: alamat.trim(),
        patokan: patokan.trim() || null,
        kelurahan: kelurahan.trim() || null,
        kecamatan: kecamatan.trim() || null,
        latitude,
        longitude,
        kategoriPickupId: selectedCatId,
        jumlahUnit,
        estimasiMuatan: estimasiMuatan.trim() || `${jumlahUnit} ${selectedCategory?.satuanMuatan || "muatan"}`,
        fotoSampah: fotoSampah || null,
        tanggalJemput,
        waktuJemput,
        metodeBayar,
      };

      const res = await fetch("/api/pickup/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok && json.order) {
        router.push(`/pickup/order/${encodeURIComponent(json.order.noOrder)}`);
      } else {
        setErrorMsg(json.error || "Gagal membuat pesanan pickup");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setErrorMsg("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 text-white py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-4 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Layanan On-Demand Khusus Kota Depok
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Jemput Sampah Sekali Angkut
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Pusing membuang sisa puing renovasi, tebangan dahan pohon, kasur, lemari, atau sampah hajatan? Tim armada UPS HERU siap jemput langsung ke depan rumah Anda.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 mb-16 relative z-20 w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold">Mohon periksa data Anda:</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* LANGKAH 1: PILIH KATEGORI SAMPAH */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-zinc-100">
                Pilih Kategori Sampah yang Ingin Diangkut
              </h2>
            </div>

            {loadingCats ? (
              <div className="py-8 text-center text-slate-400 text-sm animate-pulse">
                Memuat kategori armada penjemputan...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const Icon = KATEGORI_ICONS[cat.kode] || Truck;
                  const isSelected = selectedCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`p-2.5 rounded-lg ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-zinc-100 mb-1">
                          {cat.nama}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mb-3 line-clamp-2">
                          {cat.deskripsi}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-baseline justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400">Mulai dari:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          Rp {cat.tarifDasar.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ESTIMASI JUMLAH / MUATAN */}
            {selectedCategory && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                      Estimasi Jumlah / Volume ({selectedCategory.satuanMuatan}):
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Tambahan {selectedCategory.tarifPerUnit ? `+Rp ${selectedCategory.tarifPerUnit.toLocaleString("id-ID")} per unit tambahan` : "sesuai kubikasi"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setJumlahUnit((prev) => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-base text-slate-900 dark:text-zinc-100">
                      {jumlahUnit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setJumlahUnit((prev) => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    value={estimasiMuatan}
                    onChange={(e) => setEstimasiMuatan(e.target.value)}
                    placeholder={`Rincian barang (cth: "1 springbed uk. 160x200 + 1 sofa 2 seater" atau "${jumlahUnit} karung semen")`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* LANGKAH 2: LOKASI PENJEMPUTAN */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-zinc-100">
                  Lokasi & Akses Penjemputan
                </h2>
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locatingGps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {locatingGps ? "Membaca GPS..." : latitude ? "GPS Terpasang ✓" : "Gunakan GPS Saya"}
              </button>
            </div>

            <div className="space-y-4">
              {latitude && longitude && (
                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>
                    Titik Koordinat: <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong>
                  </span>
                  <a
                    href={`https://maps.google.com/?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[11px] font-semibold"
                  >
                    Buka di Peta
                  </a>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Alamat Lengkap Penjemputan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, RT/RW, nama perumahan (contoh: Jl. Margonda Raya No. 45, RT 02/05, Kel. Kemirimuka)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Kecamatan di Depok
                  </label>
                  <select
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Beji">Beji</option>
                    <option value="Pancoran Mas">Pancoran Mas</option>
                    <option value="Cilodong">Cilodong</option>
                    <option value="Sukmajaya">Sukmajaya</option>
                    <option value="Sawangan">Sawangan</option>
                    <option value="Bojongsari">Bojongsari</option>
                    <option value="Cimanggis">Cimanggis</option>
                    <option value="Tapos">Tapos</option>
                    <option value="Cinere">Cinere</option>
                    <option value="Limo">Limo</option>
                    <option value="Cipayung">Cipayung</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Kelurahan
                  </label>
                  <input
                    type="text"
                    value={kelurahan}
                    onChange={(e) => setKelurahan(e.target.value)}
                    placeholder="Contoh: Kalibaru, Kukusan"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Patokan Rumah / Akses Jalan
                  </label>
                  <input
                    type="text"
                    value={patokan}
                    onChange={(e) => setPatokan(e.target.value)}
                    placeholder="Pagar hitam / gang muat truk"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LANGKAH 3: FOTO SAMPAH & JADWAL */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-zinc-100">
                Foto Sampah & Waktu Penjemputan
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Upload Foto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Foto Sampah (Sangat disarankan untuk estimasi armada)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-zinc-800/30">
                  {fotoSampah ? (
                    <div className="relative inline-block">
                      <img
                        src={fotoSampah}
                        alt="Foto Sampah"
                        className="w-full max-h-40 object-cover rounded-lg shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setFotoSampah("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white text-xs px-2 py-1 rounded-md shadow"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                        {uploadingFoto ? "Sedang mengunggah foto..." : "Ambil foto langsung atau pilih dari galeri"}
                      </p>
                      <label className="inline-block px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer hover:bg-emerald-700">
                        Pilih File Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFoto}
                          disabled={uploadingFoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Tanggal & Shift */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Tanggal Penjemputan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={tanggalJemput}
                      onChange={(e) => setTanggalJemput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Pilihan Waktu / Shift Kedatangan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "pagi", label: "Pagi", sub: "08:00 - 12:00" },
                      { id: "siang", label: "Siang", sub: "13:00 - 17:00" },
                      { id: "fleksibel", label: "Bebas", sub: "Kapan Saja" },
                    ].map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => setWaktuJemput(shift.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          waktuJemput === shift.id
                            ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold"
                            : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400"
                        }`}
                      >
                        <div className="text-xs font-bold">{shift.label}</div>
                        <div className="text-[10px] opacity-80">{shift.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LANGKAH 4: DATA PEMESAN & METODE BAYAR */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-zinc-100">
                Data Pemesan & Pembayaran
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Lengkap Pemesan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaPemesan}
                  onChange={(e) => setNamaPemesan(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Pilihan Cara Pembayaran
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setMetodeBayar("cod")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                    metodeBayar === "cod"
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                        Bayar di Tempat (COD)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Bayar tunai / QRIS langsung ke supir saat muatan terangkut
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="metodeBayar"
                    checked={metodeBayar === "cod"}
                    onChange={() => setMetodeBayar("cod")}
                    className="text-emerald-600"
                  />
                </div>

                <div
                  onClick={() => setMetodeBayar("qris")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                    metodeBayar === "qris"
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                        Transfer / QRIS Online
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Bayar di awal melalui QRIS / transfer rekening resmi
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="metodeBayar"
                    checked={metodeBayar === "qris"}
                    onChange={() => setMetodeBayar("qris")}
                    className="text-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RINGKASAN BIAYA & SUBMIT */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">Estimasi Total Biaya Penjemputan:</p>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  Rp {totalEstimasi.toLocaleString("id-ID")}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Termasuk tenaga angkut & pembuangan resmi ke TPS 3R/TPA Depok.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition-all text-sm disabled:opacity-50"
              >
                {submitting ? "Memproses Order..." : "Pesan Penjemputan Sekarang"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* FAQ Section */}
        <section className="mt-12 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6">
          <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            Pertanyaan Umum Layanan Sampah Sekali Angkut
          </h3>
          <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            <div>
              <p className="font-semibold text-slate-800 dark:text-zinc-200">
                1. Apakah saya perlu membantu mengangkat barang berat?
              </p>
              <p className="text-xs mt-0.5">
                Tidak perlu. Tim kru angkut UPS HERU sudah dilengkapi tenaga pengangkut profesional untuk mengangkut kasur, puing, atau kayu dari halaman/garasi Anda.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-zinc-200">
                2. Ke mana sampah saya akan dibuang?
              </p>
              <p className="text-xs mt-0.5">
                Semua sampah diolah secara resmi di fasilitas TPS 3R binaan DLHK Kota Depok atau TPA Cipayung. Kami menolak keras pembuangan liar di bantaran kali atau tanah kosong.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-zinc-200">
                3. Bagaimana jika volume riil di lapangan lebih banyak dari perkiraan?
              </p>
              <p className="text-xs mt-0.5">
                Kru supir akan melakukan estimasi ulang di tempat dan mengonfirmasi penyesuaian biaya secara transparan kepada Anda sebelum proses muat dimulai.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
