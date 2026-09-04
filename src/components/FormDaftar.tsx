"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { kompresGambar, ekstrakGpsFoto } from "@/lib/foto";

const PetaLokasi = dynamic(() => import("@/components/PetaLokasi"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full border-2 border-black bg-[#e8f0e6] flex items-center justify-center">
      <p className="text-xs font-black uppercase animate-pulse">MEMUAT PETA…</p>
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
      <div className="hm-card text-center bg-green-50 border-green-600">
        <div className="w-16 h-16 bg-green-600 border-2 border-black flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-bold uppercase tracking-widest mb-2 text-green-600">PENDAFTARAN BERHASIL</p>
        <h3 className="font-black text-3xl mb-4 uppercase">{hasil.namaPelanggan}</h3>
        <p className="text-sm font-bold uppercase mb-8">
          Data telah masuk ke sistem kami. Mohon tunggu admin untuk verifikasi dan survei lokasi.
        </p>
        {hasil.kodePelanggan && (
          <div className="border-4 border-black bg-white p-6 inline-block">
            <p className="font-bold text-xs mb-2 uppercase">KODE PELANGGAN (NO. WHATSAPP)</p>
            <p className="font-black text-4xl tracking-widest">{hasil.kodePelanggan}</p>
            <p className="text-xs font-bold text-red-600 mt-2 uppercase">
              SIMPAN NOMOR INI UNTUK LOGIN DAN CEK TAGIHAN.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="hm-card space-y-6 bg-[#f4f4f0]">
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <span className="font-black uppercase text-2xl">FORMULIR PENDAFTARAN</span>
        <span className="font-bold text-xs uppercase bg-black text-white px-2 py-1">REG.26</span>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-nama">
          NAMA LENGKAP / TOKO <span className="text-red-600">*</span>
        </label>
        <input
          id="d-nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="CONTOH: BUDI SANTOSO"
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
          required
          minLength={3}
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-telp">
          NOMOR WHATSAPP <span className="text-red-600">*</span>
        </label>
        <input
          id="d-telp"
          value={noTelepon}
          onChange={(e) => setNoTelepon(e.target.value)}
          placeholder="CONTOH: 08123456789"
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
          required
          inputMode="tel"
        />
        <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase">KODE DAN TAGIHAN AKAN DIKIRIM KE NOMOR INI.</p>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2">
          PILIHAN LAYANAN <span className="text-red-600">*</span>
        </label>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <label className={`flex-1 flex items-center gap-3 p-4 border-2 cursor-pointer transition-colors ${jenisLayanan === 'kategori' ? 'border-black bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
            <input 
              type="radio" 
              name="jenis_layanan" 
              className="w-5 h-5 accent-black"
              checked={jenisLayanan === 'kategori'}
              onChange={() => {
                setJenisLayanan('kategori');
                setPaketId("");
              }}
            />
            <div className="flex-1">
              <span className="block font-black uppercase text-sm">TARIF STANDAR</span>
              <span className="block text-[10px] font-bold text-gray-500 uppercase mt-1">Berdasarkan jenis bangunan</span>
            </div>
          </label>
          
          {(opsi?.paket ?? []).length > 0 && (
            <label className={`flex-1 flex items-center gap-3 p-4 border-2 cursor-pointer transition-colors ${jenisLayanan === 'paket' ? 'border-black bg-green-50' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
              <input 
                type="radio" 
                name="jenis_layanan" 
                className="w-5 h-5 accent-black"
                checked={jenisLayanan === 'paket'}
                onChange={() => setJenisLayanan('paket')}
              />
              <div className="flex-1">
                <span className="block font-black uppercase text-sm">PAKET KHUSUS</span>
                <span className="block text-[10px] font-bold text-gray-500 uppercase mt-1">Layanan premium tambahan</span>
              </div>
            </label>
          )}
        </div>

        {jenisLayanan === 'kategori' ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-kategori">
              PILIH KATEGORI PELANGGAN
            </label>
            <div className="relative">
              <select id="d-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 appearance-none uppercase cursor-pointer">
                {(opsi?.kategoriTarif ?? []).map((k) => (
                  <option key={k.kategori} value={k.kategori}>
                    {k.label} — RP {k.tarif.toLocaleString("id-ID")}/BULAN
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-lg">▼</div>
            </div>
            {tarifKategori && (
              <p className="text-[10px] font-bold mt-2 uppercase border-2 border-black p-2 bg-yellow-50 inline-block text-black">
                TARIF: RP {tarifKategori.tarif.toLocaleString("id-ID")}/BULAN
                {tarifKategori.deskripsi ? ` (${tarifKategori.deskripsi})` : ""}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-paket">
              PILIH PAKET KHUSUS
            </label>
            <div className="relative">
              <select id="d-paket" value={paketId} onChange={(e) => setPaketId(e.target.value)} className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 appearance-none uppercase cursor-pointer">
                <option value="" disabled>— PILIH PAKET —</option>
                {(opsi?.paket ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} - RP {p.harga.toLocaleString("id-ID")}/BULAN
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-lg">▼</div>
            </div>
            {paketId && (opsi?.paket ?? []).find(p => p.id.toString() === paketId)?.deskripsi && (
              <p className="text-[10px] font-bold mt-2 uppercase border-2 border-black p-2 bg-green-50 text-green-700 inline-block">
                INFO PAKET: {(opsi?.paket ?? []).find(p => p.id.toString() === paketId)?.deskripsi}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-kecamatan">
            KECAMATAN <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kecamatan"
              value={kecamatan}
              onChange={(e) => {
                setKecamatan(e.target.value);
                setKelurahan("");
              }}
              className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 appearance-none uppercase"
              required
            >
              <option value="">— PILIH KECAMATAN —</option>
              {(opsi?.wilayah ?? []).map((w) => (
                <option key={w.kecamatan} value={w.kecamatan}>
                  {w.kecamatan}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-lg">▼</div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-kelurahan">
            KELURAHAN <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kelurahan"
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
              className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 appearance-none uppercase disabled:opacity-50"
              required
              disabled={!kecamatan}
            >
              <option value="">— PILIH KELURAHAN —</option>
              {kelurahanList.map((kel) => (
                <option key={kel} value={kel}>
                  {kel}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-lg">▼</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-alamat">
          ALAMAT LENGKAP <span className="text-red-600">*</span>
        </label>
        <textarea
          id="d-alamat"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="CONTOH: JALAN MARGONDA RAYA NO. 123"
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase min-h-[80px] resize-y"
          required
          minLength={10}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-rt">
            RT (OPSIONAL)
          </label>
          <input
            id="d-rt"
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            placeholder="001"
            className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-rw">
            RW (OPSIONAL)
          </label>
          <input
            id="d-rw"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            placeholder="002"
            className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="d-patokan">
          PATOKAN LOKASI (OPSIONAL)
        </label>
        <input
          id="d-patokan"
          value={patokanLokasi}
          onChange={(e) => setPatokanLokasi(e.target.value)}
          placeholder="CONTOH: DEPAN WARUNG MAKMUR"
          className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2">
          FOTO DEPAN RUMAH (OPSIONAL)
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
          <div className="p-3 border-2 border-black bg-white flex gap-4 items-start">
            <Image
              src={fotoRumah}
              alt="Foto depan rumah"
              unoptimized
              width={128}
              height={128}
              className="w-32 h-32 object-cover border-2 border-black shrink-0"
            />
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold text-green-600 uppercase">✓ FOTO TERSIMPAN</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => kameraRef.current?.click()}
                  disabled={fotoLoading}
                  className="px-3 py-2 border-2 border-black font-black uppercase text-xs bg-yellow-50 hover:bg-yellow-100 disabled:opacity-50"
                >
                  {fotoLoading ? "Memproses..." : "Ganti Foto"}
                </button>
                <button
                  type="button"
                  onClick={() => setFotoRumah("")}
                  className="px-3 py-2 border-2 border-black font-black uppercase text-xs bg-red-50 text-red-600 hover:bg-red-100"
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
              className="w-full p-4 border-2 border-black font-black uppercase text-sm flex items-center justify-center gap-2 bg-white hover:bg-gray-50 hover:-translate-y-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {fotoLoading ? "MEMPROSES..." : "AMBIL FOTO"}
            </button>
            <button
              type="button"
              onClick={() => galeriRef.current?.click()}
              disabled={fotoLoading}
              className="w-full p-4 border-2 border-black font-black uppercase text-sm flex items-center justify-center gap-2 bg-white hover:bg-gray-50 hover:-translate-y-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              DARI GALERI
            </button>
          </div>
        )}
        <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase">
          FOTO MEMBANTU PETUGAS MENGENALI RUMAH ANDA SAAT SURVEI & ANGKUT. FOTO DIPERKECIL OTOMATIS.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2">
          TITIK LOKASI (GPS)
        </label>
        <div className="space-y-3">
          <PetaLokasi
            latitude={gpsData?.lat ?? null}
            longitude={gpsData?.lng ?? null}
            onChange={(lat, lng) => {
              setGpsData((prev) => ({ lat, lng, acc: prev?.acc ?? 0 }));
              setKoordinatSumber("manual");
            }}
            className="h-64 border-2 border-black"
          />
          {gpsData ? (
            <div className="p-3 border-2 border-black bg-green-50 text-green-700 flex justify-between items-center gap-3">
              <div className="min-w-0">
                <p className="font-black text-xs uppercase">LOKASI TERSIMPAN</p>
                <p className="text-[10px] font-bold uppercase break-all">
                  {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)} · ±{Math.round(gpsData.acc)} m
                  {koordinatSumber === "exif_foto" ? " (DARI FOTO)" : koordinatSumber === "manual" ? " (MANUAL)" : ""}
                </p>
              </div>
              <button type="button" onClick={getGps} className="text-xs font-bold underline shrink-0">PERBARUI</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={getGps}
              disabled={gpsLoading}
              className={`w-full p-4 border-2 border-black font-black uppercase text-sm flex items-center justify-center gap-2 transition-colors ${
                gpsLoading ? "bg-gray-100 text-gray-400" : "bg-white hover:bg-gray-50 hover:-translate-y-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {gpsLoading ? "MENCARI LOKASI..." : "AMBIL TITIK LOKASI SAAT INI"}
            </button>
          )}
        </div>
        <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase">
          SERET PIN DI PETA UNTUK MENYESUAIKAN POSISI RUMAH ANDA. MEMBANTU PETUGAS MENEMUKAN LOKASI DENGAN AKURAT.
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
        <div className={`p-4 border-2 font-bold uppercase text-sm ${status === "ok" ? "bg-green-50 border-green-600 text-green-600" : "bg-red-50 border-red-600 text-red-600"}`}>
          {pesan}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className="hm-btn-red w-full"
      >
        {status === "kirim" ? "MENGIRIM DATA..." : "DAFTAR SEKARANG"}
      </button>
    </form>
  );
}
