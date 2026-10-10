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
type Zona = { id: number; nama: string; kelurahan?: { nama: string } };
type Petugas = { id: number; nama: string };
type Rute = { id: number; nama: string };

export default function FormDaftar({ initialReferal = "", isPetugas = false }: { initialReferal?: string; isPetugas?: boolean }) {
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
  const [zonaId, setZonaId] = useState("");
  const [petugasId, setPetugasId] = useState("");
  const [ruteId, setRuteId] = useState("");
  const [tanggalPenagihanCustom, setTanggalPenagihanCustom] = useState("");
  const [jadwalHari, setJadwalHari] = useState<string[]>([]);
  const [penanggungjawab] = useState("");
  const [referal, setReferal] = useState(initialReferal);
  const [referalFromUrl, setReferalFromUrl] = useState(Boolean(initialReferal));
  const [website, setWebsite] = useState("");
  const [customTarif, setCustomTarif] = useState("");
  const [cekWaLoading, setCekWaLoading] = useState(false);
  const [cekWaPesan, setCekWaPesan] = useState<{ text: string; terdaftar: boolean } | null>(null);
  
  useEffect(() => {
    if (!referal && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const qRef = sp.get("ref") || sp.get("referal");
      if (qRef && qRef.trim()) {
        setReferal(qRef.trim());
        setReferalFromUrl(true);
      }
    }
  }, [referal]);
  
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
    zonas: Zona[];
    petugas: Petugas[];
    rute: Rute[];
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
      .catch(() => setOpsi({ wilayah: [], paket: [], kategoriTarif: [], zonas: [], petugas: [], rute: [] }));
  }, []);

  const kelurahanList = opsi?.wilayah.find((w) => w.kecamatan === kecamatan)?.kelurahan ?? [];
  const tarifKategori = opsi?.kategoriTarif.find((k) => k.kategori === kategori);
  // Perbaikan: Kosongkan zonaList jika kelurahan belum dipilih agar tidak global
  const zonaList = kelurahan ? (opsi?.zonas ?? []).filter((z) => z.kelurahan?.nama === kelurahan) : [];

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
      
      // Upload ke server
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");
      
      setFotoRumah(data.url);

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

  useEffect(() => {
    setCekWaPesan(null);
  }, [noTelepon]);

  async function handleCekNomor() {
    if (!noTelepon || noTelepon.length < 9) {
      setCekWaPesan({ text: "Masukkan nomor telepon yang valid.", terdaftar: false });
      return false;
    }
    setCekWaLoading(true);
    setCekWaPesan(null);
    try {
      const res = await fetch(`/api/publik/cek-nomor?telp=${encodeURIComponent(noTelepon)}`);
      const data = await res.json();
      if (res.ok) {
        setCekWaPesan({ text: data.pesan, terdaftar: data.terdaftar });
        return !data.terdaftar;
      } else {
        setCekWaPesan({ text: data.error || "Gagal mengecek nomor.", terdaftar: false });
        return false;
      }
    } catch {
      setCekWaPesan({ text: "Koneksi bermasalah.", terdaftar: false });
      return false;
    } finally {
      setCekWaLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cekWaPesan) {
      const valid = await handleCekNomor();
      if (!valid) {
        setPesan("Silakan selesaikan pengecekan nomor WhatsApp terlebih dahulu.");
        return;
      }
    } else if (cekWaPesan.terdaftar) {
      setPesan("Nomor WhatsApp ini sudah terdaftar. Gunakan nomor lain.");
      return;
    }

    if (!fotoRumah) {
      setPesan("FOTO DEPAN RUMAH WAJIB DIISI.");
      return;
    }
    if (!gpsData) {
      setPesan("TITIK LOKASI (GPS) WAJIB DIISI.");
      return;
    }

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
          zonaId,
          petugasId,
          ruteId,
          tanggalPenagihanCustom: tanggalPenagihanCustom || undefined,
          jadwalHari: jadwalHari.length > 0 ? jadwalHari.join(", ") : undefined,
          penanggungjawab,
          referal: referal.trim() || undefined,
          customTarif: customTarif ? customTarif : undefined,
          website,
          fotoRumah: fotoRumah || undefined,
          latitude: gpsData?.lat,
          longitude: gpsData?.lng,
          isPetugas,
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID Pelanggan (Nomor WhatsApp)</p>
            <p className="font-extrabold text-2xl text-slate-900 font-mono tracking-wide">{hasil.kodePelanggan}</p>
            <p className="text-xs text-emerald-700 font-medium pt-1">
              Simpan nomor ini untuk pengecekan tagihan bulanan dan pelacakan truk sampah.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`bg-white shadow-xl shadow-slate-200/50 ${isPetugas ? 'p-2 space-y-2 rounded-xl' : 'rounded-[2rem] border border-slate-200/80 p-5 sm:p-8 space-y-6 sm:space-y-8'}`}>
      
      {!isPetugas && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3 sm:gap-0">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900">Formulir Pendaftaran</h2>
            <p className="text-xs text-slate-500">Isi data lengkap lokasi penjemputan sampah Anda</p>
          </div>
          <span className="font-bold text-[10px] tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
            REG-2026
          </span>
        </div>
      )}

      {/* Referral Notification Banner if present */}
      {referal && !isPetugas && (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-2.5 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0" aria-hidden="true">🤝</span>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                Kode Referral Terhubung
              </span>
              <p className="text-xs font-bold text-emerald-950 truncate">
                Direferensikan oleh: <span className="font-extrabold underline underline-offset-2">{referal}</span>
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black shrink-0 shadow-xs">
            Terhubung ✓
          </span>
        </div>
      )}

      {/* --- SECTION 1: DATA DIRI --- */}
      <div className={isPetugas ? 'space-y-1' : 'bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/60 space-y-4 sm:space-y-5'}>
        {!isPetugas && (
          <h3 className="font-extrabold text-slate-800 flex items-center gap-3 border-b border-slate-200/60 text-base pb-3 sm:pb-4 mb-3 sm:mb-4">
            <span className="rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold w-6 h-6 text-[10px]">1</span>
            Informasi Kontak & Pemesan
          </h3>
        )}
      <div className={isPetugas ? 'grid grid-cols-2 gap-2' : ''}>
        <div>
          <label className={`block font-bold text-slate-700 ${isPetugas ? 'text-[10px] mb-0.5' : 'text-sm mb-1.5'}`} htmlFor="d-nama">
            Nama / Tempat <span className="text-rose-500">*</span>
          </label>
          <input
            id="d-nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Bpk. Budi Santoso"
            className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
            required
            minLength={3}
          />
        </div>

        <div>
          <label className={`block font-bold text-slate-700 ${isPetugas ? 'text-[10px] mb-0.5' : 'text-sm mb-1.5'}`} htmlFor="d-telp">
            No WhatsApp <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-1 sm:gap-2">
            <input
              id="d-telp"
              value={noTelepon}
              onChange={(e) => setNoTelepon(e.target.value)}
              placeholder="0812..."
              className={`flex-1 bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
              required
              inputMode="tel"
            />
            <button
              type="button"
              onClick={handleCekNomor}
              disabled={cekWaLoading || !noTelepon}
              className={`bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all disabled:opacity-50 whitespace-nowrap ${isPetugas ? 'px-2 py-1 text-[10px]' : 'px-4 py-3 text-xs rounded-xl'}`}
            >
              {cekWaLoading ? "..." : "Cek"}
            </button>
          </div>
          {cekWaPesan && (
            <p className={`text-[10px] mt-0.5 font-medium ${cekWaPesan.terdaftar ? "text-rose-600" : "text-emerald-600"}`}>
              {cekWaPesan.text}
            </p>
          )}
          {!isPetugas && (
            <p className="text-xs text-slate-500 mt-1.5">
              Nomor ini akan menjadi ID pelanggan Anda untuk cek tagihan, pelacakan live armada, dan notifikasi WhatsApp.
            </p>
          )}
        </div>
      </div>
      </div>

      {/* --- SECTION 2: LAYANAN --- */}
      <div className={isPetugas ? 'space-y-1' : 'bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/60 space-y-4 sm:space-y-5'}>
        {!isPetugas && (
          <h3 className="font-extrabold text-slate-800 flex items-center gap-3 border-b border-slate-200/60 text-base pb-3 sm:pb-4 mb-3 sm:mb-4">
            <span className="rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold w-6 h-6 text-[10px]">2</span>
            Paket & Layanan
          </h3>
        )}
      <div className={isPetugas ? 'space-y-1' : 'space-y-4'}>
        {!isPetugas && (
          <label className="block text-sm font-bold text-slate-700">
            Pilihan Layanan <span className="text-rose-500">*</span>
          </label>
        )}
        
        <div className={`flex gap-2 ${isPetugas ? 'mb-1' : 'flex-col sm:flex-row gap-4 mb-4'}`}>
          <label className={`flex-1 flex items-center gap-2 rounded-xl border cursor-pointer transition-all ${isPetugas ? 'p-1.5' : 'p-4 rounded-2xl'} ${jenisLayanan === 'kategori' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <input 
              type="radio" 
              name="jenis_layanan" 
              className={`accent-emerald-600 ${isPetugas ? 'w-3 h-3' : 'w-4 h-4'}`}
              checked={jenisLayanan === 'kategori'}
              onChange={() => {
                setJenisLayanan('kategori');
                setPaketId("");
              }}
            />
            <div className="flex-1">
              <span className={`block font-bold text-slate-900 ${isPetugas ? 'text-[11px]' : 'text-sm'}`}>Tarif Standar</span>
              {!isPetugas && <span className="block text-xs text-slate-500 mt-0.5">Berdasarkan jenis bangunan / rumah</span>}
            </div>
          </label>
          
          {(opsi?.paket ?? []).length > 0 && (
            <label className={`flex-1 flex items-center gap-2 rounded-xl border cursor-pointer transition-all ${isPetugas ? 'p-1.5' : 'p-4 rounded-2xl'} ${jenisLayanan === 'paket' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input 
                type="radio" 
                name="jenis_layanan" 
                className={`accent-emerald-600 ${isPetugas ? 'w-3 h-3' : 'w-4 h-4'}`}
                checked={jenisLayanan === 'paket'}
                onChange={() => setJenisLayanan('paket')}
              />
              <div className="flex-1">
                <span className={`block font-bold text-slate-900 ${isPetugas ? 'text-[11px]' : 'text-sm'}`}>Paket Khusus</span>
                {!isPetugas && <span className="block text-xs text-slate-500 mt-0.5">Layanan ritase & volume fleksibel</span>}
              </div>
            </label>
          )}
        </div>

        {jenisLayanan === 'kategori' ? (
          <div>
            {!isPetugas && (
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-kategori">
                Pilih Kategori Pelanggan
              </label>
            )}
            <div className="relative">
              <select id="d-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}>
                {(opsi?.kategoriTarif ?? []).map((k) => (
                  <option key={k.kategori} value={k.kategori}>
                    {k.label} — Rp {k.tarif.toLocaleString("id-ID")}/bulan
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
            {tarifKategori && !isPetugas && (
              <p className="text-xs font-semibold mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                Tarif: Rp {tarifKategori.tarif.toLocaleString("id-ID")}/bulan
                {tarifKategori.deskripsi ? ` (${tarifKategori.deskripsi})` : ""}
              </p>
            )}
          </div>
        ) : (
          <div>
            {!isPetugas && (
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-paket">
                Pilih Paket Khusus
              </label>
            )}
            <div className="relative">
              <select id="d-paket" value={paketId} onChange={(e) => setPaketId(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}>
                <option value="" disabled>— Pilih Paket —</option>
                {(opsi?.paket ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} - Rp {p.harga.toLocaleString("id-ID")}/bulan
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
            {paketId && !isPetugas && (opsi?.paket ?? []).find(p => p.id.toString() === paketId)?.deskripsi && (
              <p className="text-xs font-semibold mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                Info Paket: {(opsi?.paket ?? []).find(p => p.id.toString() === paketId)?.deskripsi}
              </p>
            )}
          </div>
        )}

        {isPetugas && (
          <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg p-1.5">
            <label className="font-bold text-slate-700 text-[10px] whitespace-nowrap" htmlFor="d-custom-tarif">
              Tarif Custom:
            </label>
            <input
              id="d-custom-tarif"
              type="number"
              value={customTarif}
              onChange={(e) => setCustomTarif(e.target.value)}
              placeholder="Kosongkan jika standar"
              className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-900 text-[11px] font-medium outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>
      </div>


      {/* --- SECTION 3: ALAMAT --- */}
      <div className={isPetugas ? 'space-y-1' : 'bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/60 space-y-4 sm:space-y-5'}>
        {!isPetugas && (
          <h3 className="font-extrabold text-slate-800 flex items-center gap-3 border-b border-slate-200/60 text-base pb-3 sm:pb-4 mb-3 sm:mb-4">
            <span className="rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold w-6 h-6 text-[10px]">3</span>
            Detail Alamat Penjemputan
          </h3>
        )}
      <div className={`grid ${isPetugas ? 'grid-cols-2 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        <div>
          <label className={`block font-bold text-slate-700 ${isPetugas ? 'text-[10px] mb-0.5' : 'text-sm mb-1.5'}`} htmlFor="d-kecamatan">
            Kecamatan <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kecamatan"
              value={kecamatan}
              onChange={(e) => {
                setKecamatan(e.target.value);
                setKelurahan("");
                setZonaId("");
              }}
              className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
              required
            >
              <option value="">— Pilih —</option>
              {(opsi?.wilayah ?? []).map((w) => (
                <option key={w.kecamatan} value={w.kecamatan}>
                  {w.kecamatan}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>
        </div>
        <div>
          <label className={`block font-bold text-slate-700 ${isPetugas ? 'text-[10px] mb-0.5' : 'text-sm mb-1.5'}`} htmlFor="d-kelurahan">
            Kelurahan <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="d-kelurahan"
              value={kelurahan}
              onChange={(e) => {
                setKelurahan(e.target.value);
                setZonaId("");
              }}
              className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer disabled:opacity-50 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
              required
              disabled={!kecamatan}
            >
              <option value="">— Pilih —</option>
              {kelurahanList.map((kel) => (
                <option key={kel} value={kel}>
                  {kel}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>
        </div>
      </div>

      {isPetugas && (
        <div>
          <div className="relative">
            <select
              id="d-zona"
              value={zonaId}
              onChange={(e) => setZonaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-[11px] font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
              disabled={!kelurahan}
            >
              <option value="">{kelurahan ? "— Pilih Zona (Opsional) —" : "— Pilih Zona —"}</option>
              {zonaList.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nama}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>
        </div>
      )}

      <div>
        {!isPetugas && (
          <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-alamat">
            Alamat Lengkap <span className="text-rose-500">*</span>
          </label>
        )}
        <textarea
          id="d-alamat"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Alamat lengkap (Jalan, Blok, No) *"
          className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none placeholder:text-slate-400 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg h-12' : 'rounded-xl px-4 text-slate-900 text-sm py-3 min-h-[80px]'}`}
          required
          minLength={10}
        />
      </div>

      <div className={`grid ${isPetugas ? 'grid-cols-4 gap-2' : 'grid-cols-2 gap-4'}`}>
        <div className={isPetugas ? 'col-span-1' : ''}>
          {!isPetugas && <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-rt">RT</label>}
          <input
            id="d-rt"
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            placeholder="RT"
            className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
            inputMode="numeric"
          />
        </div>
        <div className={isPetugas ? 'col-span-1' : ''}>
          {!isPetugas && <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-rw">RW</label>}
          <input
            id="d-rw"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            placeholder="RW"
            className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
            inputMode="numeric"
          />
        </div>
        <div className={isPetugas ? 'col-span-2' : 'col-span-2'}>
          {!isPetugas && <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-patokan">Patokan Lokasi</label>}
          <input
            id="d-patokan"
            value={patokanLokasi}
            onChange={(e) => setPatokanLokasi(e.target.value)}
            placeholder={isPetugas ? "Patokan Lokasi" : "Contoh: Depan Warung"}
            className={`w-full bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 ${isPetugas ? 'px-2 py-1 text-[11px] rounded-lg' : 'rounded-xl px-4 text-slate-900 text-sm py-3'}`}
          />
        </div>
      </div>

      {isPetugas && (
        <div>
          <input
            id="d-tgl-penagihan"
            type="number"
            min="1"
            max="31"
            value={tanggalPenagihanCustom}
            onChange={(e) => setTanggalPenagihanCustom(e.target.value)}
            placeholder="Tanggal Penagihan (1-31)"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>
      )}
      </div>

      {/* --- SECTION 4: VALIDASI LOKASI --- */}
      <div className={`bg-slate-50/50 border border-slate-200/60 ${isPetugas ? 'p-2 rounded-xl space-y-2' : 'p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5'}`}>
        {!isPetugas && (
          <h3 className="font-extrabold text-slate-800 flex items-center gap-3 border-b border-slate-200/60 text-base pb-3 sm:pb-4 mb-3 sm:mb-4">
            <span className="rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold w-6 h-6 text-[10px]">4</span>
            Validasi Lapangan
          </h3>
        )}
      <div>
        <label className={`block font-bold text-slate-700 ${isPetugas ? 'text-[10px] mb-0.5' : 'text-sm mb-1.5'}`}>
          Foto Depan Rumah <span className="text-rose-500">*</span>
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
          <div className={`border border-slate-200 bg-slate-50 flex items-center ${isPetugas ? 'p-1.5 rounded-lg gap-2' : 'p-3.5 rounded-2xl flex-col sm:flex-row gap-4 sm:items-start text-center sm:text-left'}`}>
            <Image
              src={fotoRumah}
              alt="Foto depan rumah"
              unoptimized
              width={128}
              height={128}
              className={`${isPetugas ? 'w-10 h-10' : 'w-28 h-28'} object-cover rounded-lg border border-slate-200 shrink-0`}
            />
            <div className="flex-1 space-y-1">
              {!isPetugas && <p className="text-xs font-bold text-emerald-700">✓ Foto Tersimpan</p>}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => kameraRef.current?.click()}
                  disabled={fotoLoading}
                  className={`px-3 py-1 rounded-lg border border-slate-200 font-semibold bg-white hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50 ${isPetugas ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}
                >
                  {fotoLoading ? "..." : "Ganti"}
                </button>
                <button
                  type="button"
                  onClick={() => setFotoRumah("")}
                  className={`px-3 py-1 rounded-lg border border-rose-200 font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors ${isPetugas ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`grid ${isPetugas ? 'grid-cols-2 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-3'}`}>
            <button
              type="button"
              onClick={() => kameraRef.current?.click()}
              disabled={fotoLoading}
              className={`w-full border border-slate-200 rounded-lg font-bold flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm transition-all disabled:opacity-50 ${isPetugas ? 'py-1.5 text-[10px]' : 'py-3.5 text-sm rounded-2xl'}`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {fotoLoading ? "..." : "Kamera"}
            </button>
            <button
              type="button"
              onClick={() => galeriRef.current?.click()}
              disabled={fotoLoading}
              className={`w-full border border-slate-200 rounded-lg font-bold flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm transition-all disabled:opacity-50 ${isPetugas ? 'py-1.5 text-[10px]' : 'py-3.5 text-sm rounded-2xl'}`}
            >
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Galeri
            </button>
          </div>
        )}
        {!isPetugas && (
          <p className="text-xs text-slate-500 mt-2">
            Foto membantu petugas mengenali rumah Anda saat survei & jemput sampah. Foto diperkecil otomatis.
          </p>
        )}
      </div>

      {!isPetugas && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="d-referal">
            Kode / Petugas Referral (Opsional)
          </label>
          <input
            id="d-referal"
            value={referal}
            onChange={(e) => {
              setReferal(e.target.value);
              setReferalFromUrl(false);
            }}
            placeholder="Contoh: Nama atau ID Petugas yang mengajak Anda"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
          <p className="text-xs text-slate-500 mt-1">
            Bila Anda diajak atau didaftarkan oleh petugas lapangan kami, pastikan nama petugas terisi agar tercatat secara akurat.
          </p>
        </div>
      )}

      <div>
        <label className={`block font-bold text-slate-700 ${isPetugas ? 'text-[10px] mb-0.5' : 'text-sm mb-1.5'}`}>
          Titik Lokasi (GPS) <span className="text-rose-500">*</span>
        </label>
        <div className={isPetugas ? 'space-y-1' : 'space-y-3'}>
          <div className={isPetugas ? 'hidden' : 'block'}>
            <PetaLokasi
              latitude={gpsData?.lat ?? null}
              longitude={gpsData?.lng ?? null}
              onChange={(lat, lng) => {
                setGpsData((prev) => ({ lat, lng, acc: prev?.acc ?? 0 }));
                setKoordinatSumber("manual");
              }}
              className="h-64 rounded-xl border border-slate-200 overflow-hidden"
            />
          </div>
          {gpsData ? (
            <div className={`rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex justify-between items-center gap-2 ${isPetugas ? 'p-1.5' : 'p-3.5 flex-col sm:flex-row items-start sm:items-center gap-3'}`}>
              <div className="min-w-0">
                {!isPetugas && <p className="font-extrabold text-[10px] sm:text-xs">Titik Lokasi Tersimpan</p>}
                <p className={`font-medium break-all ${isPetugas ? 'text-[9px] mt-0' : 'text-[10px] sm:text-xs text-emerald-700 mt-0.5'}`}>
                  <span className="font-mono tabular-nums">{gpsData.lat.toFixed(5)}, {gpsData.lng.toFixed(5)}</span> · ±{Math.round(gpsData.acc)}m
                </p>
              </div>
              <button type="button" onClick={getGps} className={`font-bold text-emerald-700 hover:underline shrink-0 border border-emerald-200 rounded bg-white ${isPetugas ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] sm:text-xs px-2 py-1'}`}>Perbarui</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={getGps}
              disabled={gpsLoading}
              className={`w-full border border-slate-200 rounded-lg font-bold flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm transition-all disabled:opacity-50 ${isPetugas ? 'py-1.5 text-[10px]' : 'py-3.5 text-sm rounded-2xl'}`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{gpsLoading ? "..." : "Gunakan GPS"}</span>
            </button>
          )}
        </div>
        {!isPetugas && (
          <p className="text-xs text-slate-500 mt-2">
            Geser atau ketuk pada peta untuk memastikan titik tepat di depan gerbang / rumah Anda.
          </p>
        )}
      </div>
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

      {isPetugas && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5 flex gap-1.5 text-amber-900 shadow-sm mt-2">
          <svg className="w-3.5 h-3.5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-bold text-[9px] self-center">Pastikan Foto & GPS Tepat!</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "kirim"}
        className={`w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isPetugas ? 'py-2 rounded-lg text-xs mt-2' : 'py-4 rounded-2xl text-sm'}`}
      >
        {status === "kirim" ? (
          <>
            <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${isPetugas ? 'w-3 h-3' : 'w-4 h-4'}`} />
            <span>Mengirim...</span>
          </>
        ) : (
          <span>Kirim Data 🚀</span>
        )}
      </button>
    </form>
  );
}
