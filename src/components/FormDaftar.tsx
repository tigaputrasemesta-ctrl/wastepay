"use client";

import { useEffect, useState } from "react";

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
          latitude: gpsData?.lat,
          longitude: gpsData?.lng,
          koordinatAkurasi: gpsData?.acc,
          koordinatSumber: gpsData ? "gps_pendaftar" : undefined,
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
            <p className="font-bold text-xs mb-2 uppercase">KODE PELANGGAN SEMENTARA</p>
            <p className="font-black text-4xl tracking-widest">{hasil.kodePelanggan}</p>
            <p className="text-xs font-bold text-red-600 mt-2 uppercase">
              SIMPAN KODE INI UNTUK LOGIN.
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
                    {k.label}
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
          TITIK LOKASI (GPS)
        </label>
        {gpsData ? (
          <div className="p-4 border-2 border-black bg-green-50 text-green-700 flex justify-between items-center">
            <div>
              <p className="font-black text-sm uppercase">LOKASI TERSIMPAN</p>
              <p className="text-[10px] font-bold uppercase">Akurasi: {Math.round(gpsData.acc)} meter</p>
            </div>
            <button type="button" onClick={getGps} className="text-xs font-bold underline">PERBARUI</button>
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
        <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase">MEMBANTU PETUGAS MENEMUKAN RUMAH ANDA DENGAN LEBIH CEPAT DAN AKURAT.</p>
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
