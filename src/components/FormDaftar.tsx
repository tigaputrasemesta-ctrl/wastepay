"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { kompresGambar, ekstrakGpsFoto } from "@/lib/foto";

const PetaLokasi = dynamic(() => import("@/components/PetaLokasi"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
      <p className="text-xs font-semibold text-slate-500 animate-pulse">Memuat peta…</p>
    </div>
  ),
});

type WilayahKec = { kecamatan: string; kelurahan: string[] };
type Paket = { id: number; nama: string; harga: number; deskripsi: string | null };
type KategoriTarif = { kategori: string; label: string; tarif: number; deskripsi: string | null };

export default function FormDaftar() {
  const [nama, setNama] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [kategori, setKategori] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const [patokanLokasi, setPatokanLokasi] = useState("");
  const [jenisLayanan, setJenisLayanan] = useState<"kategori" | "paket">("kategori");
  const [paketId, setPaketId] = useState("");
  // Nilai penanggungjawab & referal dipakai di payload, tetapi tidak pernah
  // diubah setelah mount — setter sengaja tidak dibuat.
  const [penanggungjawab] = useState("");
  const [referal] = useState("");
  const [website, setWebsite] = useState("");
  
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<{lat: number; lng: number; acc: number} | null>(null);
  const [koordinatSumber, setKoordinatSumber] = useState<"gps_perangkat" | "manual" | "exif_foto" | "">("");
  const [fotoRumah, setFotoRumah] = useState("");
  const [fotoLoading, setFotoLoading] = useState(false);
  const kameraRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);

  const [opsi, setOpsi] = useState<{
    wilayah: WilayahKec[];
    paket: Paket[];
    kategoriTarif: KategoriTarif[];
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "kirim" | "ok" | "gagal">("idle");
  const [pesan, setPesan] = useState("");
  const [hasil, setHasil] = useState<{ kodePelanggan: string; namaPelanggan: string } | null>(null);

  useEffect(() => {
    fetch("/api/publik/daftar-options")
      .then((r) => r.json())
      .then((d) => {
        setOpsi(d);
        if (d.kategoriTarif && d.kategoriTarif.length > 0) {
          // Set default hanya jika belum terpilih — hindari dependensi `kategori`
          // pada efek (refetch saat kategori berubah tidak diinginkan).
          setKategori((prev) => prev || d.kategoriTarif[0].kategori);
        }
      })
      .catch(() => setOpsi({ wilayah: [], paket: [], kategoriTarif: [] }));
  }, []);

  const kelurahanList = opsi?.wilayah.find((w) => w.kecamatan === kecamatan)?.kelurahan ?? [];
  const tarifKategori = opsi?.kategoriTarif.find((k) => k.kategori === kategori);

  function getGps() {
    if (!navigator.geolocation) {
      setPesan("BROWSER TIDAK MENDUKUNG GPS.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        setKoordinatSumber("gps_perangkat");
        setGpsLoading(false);
        setPesan("");
      },
      (err) => {
        setGpsLoading(false);
        setPesan("GAGAL MENDAPATKAN LOKASI: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleFoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPesan("FILE HARUS BERUPA GAMBAR (JPG/PNG/HEIC).");
      return;
    }
    setFotoLoading(true);
    setPesan("");
    try {
      const base64 = await kompresGambar(file);
      setFotoRumah(base64);

      // Isi koordinat dari EXIF foto bila belum ada lokasi sama sekali.
      if (!gpsData) {
        const gps = await ekstrakGpsFoto(file);
        if (gps) {
          setGpsData({ lat: gps.latitude, lng: gps.longitude, acc: 0 });
          setKoordinatSumber("exif_foto");
        }
      }
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "GAGAL MEMPROSES FOTO");
    } finally {
      setFotoLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("kirim");
    setPesan("");
    try {
      const res = await fetch("/api/publik/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          noTelepon,
          kategori,
          kecamatan,
          kelurahan,
          alamat,
          rt,
          rw,
          patokanLokasi,
          paketId,
          penanggungjawab,
          referal,
          website,
          fotoRumah: fotoRumah || undefined,
          latitude: gpsData?.lat,
          longitude: gpsData?.lng,
          koordinatAkurasi: gpsData?.acc,
          koordinatSumber: gpsData ? koordinatSumber || "gps_perangkat" : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setHasil({ kodePelanggan: data.kodePelanggan, namaPelanggan: data.namaPelanggan });
        setStatus("ok");
      } else {
        setStatus("gagal");
        setPesan(data.error ?? "GAGAL MENDAFTAR. SILAKAN COBA LAGI.");
      }
    } catch {
      setStatus("gagal");
      setPesan("KONEKSI BERMASALAH. COBA LAGI NANTI.");
    }
  }

  if (status === "ok" && hasil) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200/80 p-8 sm:p-10 text-center shadow-sm space-y-5">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full mb-2">
            Pendaftaran Berhasil Terkirim
          </span>
          <h3 className="font-extrabold text-2xl text-slate-900">{hasil.namaPelanggan}</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Data Anda telah tersimpan di sistem operasional. Tim survei akan menghubungi Anda untuk verifikasi rute armada.
          </p>
        </div>
        {hasil.kodePelanggan && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto text-center space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID Pelanggan (Nomor WhatsApp)</p>
            <p className="font-extrabold text-2xl text-slate-900 font-mono tracking-wide">{hasil.kodePelanggan}</p>
            <p className="text-[11px] text-emerald-700 font-medium pt-1">
              Simpan nomor ini untuk pengecekan tagihan bulanan dan pelacakan truk sampah.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-extrabold text-lg text-slate-900">Formulir Pendaftaran</h2>
          <p className="text-xs text-slate-500">Isi data lengkap lokasi penjemputan sampah Anda</p>
        </div>
        <span className="font-bold text-[10px] tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
          REG-2026
        </span>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-nama">
          Nama Lengkap / Pemilik Tempat <span className="text-rose-500">*</span>
        </label>
        <input
          id="d-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Bpk. Budi Santoso"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          required
          minLength={3}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-telp">
          Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
        </label>
        <input
          id="d-telp"
          value={noTelepon}
          onChange={(e) => setNoTelepon(e.target.value)}
          placeholder="Contoh: 081234567890"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          required
          inputMode="tel"
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          Nomor ini akan menjadi ID pelanggan Anda untuk cek tagihan, pelacakan live armada, dan notifikasi WhatsApp.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-bold text-slate-700">
          Pilihan Layanan <span className="text-rose-500">*</span>
        </label>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <label className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${jenisLayanan === 'kategori' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <input 
              type="radio" 
              name="jenis_layanan" 
              className="w-4 h-4 accent-emerald-600"
              checked={jenisLayanan === 'kategori'}
              onChange={() => {
                setJenisLayanan('kategori');
                setPaketId("");
              }}
            />
            <div className="flex-1">
              <span className="block font-bold text-xs sm:text-sm text-slate-900">Tarif Standar</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Berdasarkan jenis bangunan / rumah</span>
            </div>
          </label>
          
          {(opsi?.paket ?? []).length > 0 && (
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${jenisLayanan === 'paket' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input 
                type="radio" 
                name="jenis_layanan" 
                className="w-4 h-4 accent-emerald-600"
                checked={jenisLayanan === 'paket'}
                onChange={() => setJenisLayanan('paket')}
              />
              <div className="flex-1">
                <span className="block font-bold text-xs sm:text-sm text-slate-900">Paket Khusus</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Layanan ritase & volume fleksibel</span>
              </div>
            </label>
          )}
        </div>

        {jenisLayanan === 'kategori' ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-kategori">
              Pilih Kategori Pelanggan
            </label>
            <div className="relative">
              <select id="d-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                {(opsi?.kategoriTarif ?? []).map((k) => (
                  <option key={k.kategori} value={k.kategori}>
                    {k.label} — Rp {k.tarif.toLocaleString("id-ID")}/bulan
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
            {tarifKategori && (
              <p className="text-xs font-semibold mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                Tarif: Rp {tarifKategori.tarif.toLocaleString("id-ID")}/bulan
                {tarifKategori.deskripsi ? ` (${tarifKategori.deskripsi})` : ""}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-paket">
              Pilih Paket Khusus
            </label>
            <div className="relative">
              <select id="d-paket" value={paketId} onChange={(e) => setPaketId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                <option value="" disabled>— Pilih Paket —</option>
                {(opsi?.paket ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} - Rp {p.harga.toLocaleString("id-ID")}/bulan
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
            {paketId && (opsi?.paket ?? []).find(p => p.id.toString() === paketId)?.deskripsi && (
              <p className="text-xs font-semibold mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                Info Paket: {(opsi?.paket ?? []).find(p => p.id.toString() === paketId)?.deskripsi}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-kecamatan">
            Kecamatan <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kecamatan"
              value={kecamatan}
              onChange={(e) => {
                setKecamatan(e.target.value);
                setKelurahan("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              required
            >
              <option value="">— Pilih Kecamatan —</option>
              {(opsi?.wilayah ?? []).map((w) => (
                <option key={w.kecamatan} value={w.kecamatan}>
                  {w.kecamatan}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-kelurahan">
            Kelurahan <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kelurahan"
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              required
              disabled={!kecamatan}
            >
              <option value="">— Pilih Kelurahan —</option>
              {kelurahanList.map((kel) => (
                <option key={kel} value={kel}>
                  {kel}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-alamat">
          Alamat Lengkap <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="d-alamat"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Contoh: Jalan Margonda Raya No. 123"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px] resize-y placeholder:text-slate-400"
          required
          minLength={10}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-rt">
            RT (Opsional)
          </label>
          <input
            id="d-rt"
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            placeholder="001"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-rw">
            RW (Opsional)
          </label>
          <input
            id="d-rw"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            placeholder="002"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="d-patokan">
          Patokan Lokasi (Opsional)
        </label>
        <input
          id="d-patokan"
          value={patokanLokasi}
          onChange={(e) => setPatokanLokasi(e.target.value)}
          placeholder="Contoh: Depan Warung Makmur"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Foto Depan Rumah (Opsional)
        </label>
        <input
          ref={kameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFoto(e.target.files?.[0])}
        />
        <input
          ref={galeriRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFoto(e.target.files?.[0])}
        />
        {fotoRumah ? (
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex gap-4 items-start">
            <Image
              src={fotoRumah}
              alt="Foto depan rumah"
              unoptimized
              width={128}
              height={128}
              className="w-28 h-28 object-cover rounded-xl border border-slate-200 shrink-0"
            />
            <div className="flex-1 space-y-2">
              <p className="text-xs font-bold text-emerald-600">✓ Foto Tersimpan</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => kameraRef.current?.click()}
                  disabled={fotoLoading}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-semibold text-xs bg-white hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50"
                >
                  {fotoLoading ? "Memproses..." : "Ganti Foto"}
                </button>
                <button
                  type="button"
                  onClick={() => setFotoRumah("")}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 font-semibold text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => kameraRef.current?.click()}
              disabled={fotoLoading}
              className="w-full py-3.5 border border-slate-200 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {fotoLoading ? "Memproses..." : "Ambil Foto"}
            </button>
            <button
              type="button"
              onClick={() => galeriRef.current?.click()}
              disabled={fotoLoading}
              className="w-full py-3.5 border border-slate-200 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Dari Galeri
            </button>
          </div>
        )}
        <p className="text-[11px] text-slate-500 mt-2">
          Foto membantu petugas mengenali rumah Anda saat survei & jemput sampah. Foto diperkecil otomatis.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Titik Lokasi (GPS)
        </label>
        <div className="space-y-3">
          <PetaLokasi
            latitude={gpsData?.lat ?? null}
            longitude={gpsData?.lng ?? null}
            onChange={(lat, lng) => {
              setGpsData((prev) => ({ lat, lng, acc: prev?.acc ?? 0 }));
              setKoordinatSumber("manual");
            }}
            className="h-64 rounded-2xl border border-slate-200 overflow-hidden"
          />
          {gpsData ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex justify-between items-center gap-3">
              <div className="min-w-0">
                <p className="font-extrabold text-xs">Titik Lokasi Tersimpan</p>
                <p className="text-[11px] text-emerald-700 font-medium break-all mt-0.5">
                  <span className="font-mono tabular-nums">{gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}</span> · ±{Math.round(gpsData.acc)} m
                  {koordinatSumber === "exif_foto" ? " (dari foto)" : koordinatSumber === "manual" ? " (manual)" : ""}
                </p>
              </div>
              <button type="button" onClick={getGps} className="text-xs font-bold text-emerald-700 hover:underline shrink-0">Perbarui</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={getGps}
              disabled={gpsLoading}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                gpsLoading ? "bg-slate-100 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm"
              }`}
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{gpsLoading ? "Mendeteksi Lokasi GPS..." : "Ambil Titik Lokasi Saya Saat Ini"}</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Geser atau ketuk pada peta untuk memastikan titik tepat di depan gerbang / rumah Anda.
        </p>
      </div>

      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="d-website">Website</label>
        <input
          id="d-website"
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {pesan && (
        <div className={`p-4 rounded-2xl text-xs font-medium border ${status === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
          {pesan}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-extrabold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "kirim" ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Mengirimkan Formulir...</span>
          </>
        ) : (
          <span>Kirim Pendaftaran Layanan 🚀</span>
        )}
      </button>
    </form>
  );
}
