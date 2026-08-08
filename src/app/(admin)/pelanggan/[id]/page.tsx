"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/utils";

type Wilayah = { id: number; nama: string; rt?: string; rw?: string };
type Paket = { id: number; nama: string; harga: number; deskripsi?: string };
type PelangganDetail = {
  id: number;
  kodePelanggan?: string;
  nama: string;
  noTelepon: string;
  kategori: string;
  alamat: string;
  rtRw?: string;
  fotoRumah?: string;
  patokanLokasi?: string;
  latitude?: number | null;
  longitude?: number | null;
  koordinatSumber?: string;
  koordinatAkurasi?: number | null;
  penanggungjawab?: string;
  referal?: string;
  customTarif?: number | null;
  status: string;
  catatan?: string;
  wilayah: Wilayah;
  paket?: Paket | null;
  createdAt: string;
  jadwal: {
    id: number;
    hari: string;
    jam?: string;
    aktif: boolean;
    rute: { id: number; nama: string; jam?: string };
  }[];
  tagihan: {
    id: number;
    bulan: number;
    tahun: number;
    jumlah: number;
    status: string;
    jatuhTempo: string;
    tanggalLunas?: string;
  }[];
  pembayaran: {
    id: number;
    jumlah: number;
    metode: string;
    status: string;
    createdAt: string;
  }[];
  pengangkutan: {
    id: number;
    tanggal: string;
    status: string;
    catatan?: string;
    petugas?: { nama: string } | null;
  }[];
  komplain: {
    id: number;
    jenis: string;
    deskripsi: string;
    status: string;
    createdAt: string;
  }[];
};

export default function DetailPelangganPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<PelangganDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/pelanggan/${params.id}`);
        if (!res.ok) {
          router.push("/pelanggan");
          return;
        }
        setData(await res.json());
      } catch {
        router.push("/pelanggan");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-asphalt-raised rounded w-64" />
        <div className="h-48 bg-asphalt-raised rounded-xl" />
        <div className="h-32 bg-asphalt-raised rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const bulanList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const tagihanAktif = data.tagihan.filter((t) => t.status !== "lunas");
  const totalTagihan = data.tagihan.reduce((sum, t) => sum + t.jumlah, 0);
  const totalBayar = data.pembayaran.reduce((sum, p) => sum + p.jumlah, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/pelanggan")}
          className="p-2 hover:bg-asphalt-raised rounded-lg transition"
        >
          <svg className="w-5 h-5 text-bone-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7 7l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-display text-2xl text-bone">{data.nama}</h1>
          <p className="text-sm text-bone-dim">Detail pelanggan</p>
        </div>
        <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          data.status === "aktif" ? "bg-vest/10 text-emerald-800" :
          data.status === "calon" ? "bg-vest/10 text-blue-800" :
          data.status === "libur" ? "bg-amber/10 text-yellow-800" :
          "bg-asphalt-raised text-bone"
        }`}>
          {data.status === "calon" ? "Calon" : data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </span>
        {data.status === "calon" && (
          <button
            onClick={async () => {
              const res = await fetch(`/api/pelanggan/${data.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "aktif" }),
              });
              if (res.ok) {
                setData({ ...data, status: "aktif" });
              } else {
                const d = await res.json().catch(() => ({}));
                alert(d.error || "Gagal menyetujui pendaftaran");
              }
            }}
            className="ml-2 inline-flex items-center gap-1.5 px-4 py-1.5 chamfer-sm chamfer-sm bg-vest text-asphalt-deep rounded-lg text-sm font-medium hover:bg-vest-bright transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Setujui & Aktifkan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informasi Pelanggan */}
        <div className="lg:col-span-1 space-y-6">
          {/* Kode Pelanggan & Barcode */}
          {data.kodePelanggan && (
            <div className="panel p-5 text-center">
              <p className="text-xs text-bone-faint uppercase tracking-wide mb-2">Kode Pelanggan</p>
              <p className="font-display text-2xl text-bone tracking-widest mb-3">{data.kodePelanggan}</p>
              {/* Barcode visual */}
              <svg className="mx-auto" width="220" height="50" viewBox="0 0 220 50">
                <rect x="0" y="0" width="4" height="44" fill="#000" />
                {data.kodePelanggan.split("").map((char, i) => (
                  <rect
                    key={i}
                    x={6 + i * 14}
                    y="4"
                    width={char === "-" ? 3 : 5}
                    height="36"
                    fill={char === "-" ? "#fff" : "#000"}
                  />
                ))}
                <rect x="216" y="0" width="4" height="44" fill="#000" />
              </svg>
              <p className="text-xs text-bone-faint mt-2 font-mono">{data.kodePelanggan}</p>
            </div>
          )}

          {/* Foto Depan Rumah (Geotag) */}
          {(data.fotoRumah || (data.latitude && data.longitude)) && (
            <div className="panel p-5">
              <h2 className="font-semibold text-bone mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-vest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Foto Depan Rumah
              </h2>
              {data.fotoRumah ? (
                <Image
                  src={data.fotoRumah}
                  alt={`Foto depan rumah ${data.nama}`}
                  unoptimized
                  width={800}
                  height={400}
                  className="w-full h-52 object-cover rounded-lg border border-asphalt-line"
                />
              ) : (
                <div className="w-full h-52 rounded-lg border-2 border-dashed border-asphalt-line flex flex-col items-center justify-center text-bone-faint">
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">Belum ada foto</span>
                </div>
              )}
              {data.latitude && data.longitude && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-vest">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      data.koordinatSumber === "exif_foto"
                        ? "bg-vest/10 text-vest"
                        : data.koordinatSumber === "gps_perangkat"
                        ? "bg-vest/10 text-vest"
                        : "bg-asphalt-raised text-bone-dim"
                    }`}>
                      {{
                        exif_foto: "Geotag dari Foto",
                        gps_perangkat: "GPS Perangkat",
                        manual: "Manual",
                      }[data.koordinatSumber || ""] || "Manual"}
                    </span>
                    {data.koordinatAkurasi ? (
                      <span className="text-xs text-vest">± {Math.round(data.koordinatAkurasi)} m</span>
                    ) : null}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-vest hover:text-blue-800 font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Buka Google Maps
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Informasi</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-bone-dim">No. Telepon</p>
                <p className="font-medium text-bone">{data.noTelepon}</p>
              </div>
              <div>
                <p className="text-bone-dim">Kategori</p>
                <p className="font-medium text-bone">
                  {{
                    rumah_tangga: "🏠 Rumah Tangga",
                    bisnis: "🏪 Bisnis / Toko",
                    kost: "🏘️ Kost / Kontrakan",
                    sekolah: "🏫 Sekolah",
                    rm_makan: "🍽️ Rumah Makan",
                    perkantoran: "🏢 Perkantoran",
                    industri: "🏭 Industri",
                    lainnya: "📋 Lainnya",
                  }[data.kategori] || data.kategori}
                </p>
              </div>
              <div>
                <p className="text-bone-dim">Alamat</p>
                <p className="font-medium text-bone">{data.alamat}</p>
              </div>
              {data.rtRw && (
                <div>
                  <p className="text-bone-dim">RT/RW</p>
                  <p className="font-medium text-bone">{data.rtRw}</p>
                </div>
              )}
              <div>
                <p className="text-bone-dim">Wilayah</p>
                <p className="font-medium text-bone">{data.wilayah.nama}</p>
              </div>
              {data.patokanLokasi && (
                <div>
                  <p className="text-bone-dim">Patokan Lokasi</p>
                  <p className="font-medium text-bone">{data.patokanLokasi}</p>
                </div>
              )}
              {data.latitude && data.longitude && (
                <div>
                  <p className="text-bone-dim">Koordinat</p>
                  <p className="font-medium text-bone text-xs">
                    {data.latitude}, {data.longitude}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                    target="_blank"
                    className="text-xs text-vest hover:text-blue-800 inline-flex items-center gap-1 mt-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Buka Google Maps
                  </a>
                </div>
              )}
              {data.penanggungjawab && (
                <div>
                  <p className="text-bone-dim">Penanggung Jawab</p>
                  <p className="font-medium text-bone">{data.penanggungjawab}</p>
                </div>
              )}
              {data.referal && (
                <div>
                  <p className="text-bone-dim">Referal</p>
                  <p className="font-medium text-bone">{data.referal}</p>
                </div>
              )}
              {data.paket && (
                <div>
                  <p className="text-bone-dim">Paket Langganan</p>
                  <p className="font-medium text-bone">{data.paket.nama}</p>
                  <p className="text-xs text-vest font-medium">{formatRupiah(data.paket.harga)}/bln</p>
                </div>
              )}
              {data.customTarif && (
                <div>
                  <p className="text-bone-dim">Tarif Kustom</p>
                  <p className="font-medium text-bone">{formatRupiah(data.customTarif)}/bln</p>
                </div>
              )}
              <div>
                <p className="text-bone-dim">Tanggal Daftar</p>
                <p className="font-medium text-bone">{formatDate(data.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Ringkasan Keuangan */}
          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Ringkasan Keuangan</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-bone-dim">Total Tagihan</span>
                <span className="font-medium">{formatRupiah(totalTagihan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bone-dim">Total Bayar</span>
                <span className="font-medium text-vest">{formatRupiah(totalBayar)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-bone-dim">Sisa</span>
                <span className={`font-medium ${totalTagihan - totalBayar > 0 ? "text-danger" : "text-vest"}`}>
                  {formatRupiah(totalTagihan - totalBayar)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-bone-dim">Tagihan Aktif</span>
                <span className="font-medium text-amber">{tagihanAktif.length}</span>
              </div>
            </div>
          </div>

          {/* Jadwal */}
          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Jadwal Pengangkutan</h2>
            {data.jadwal.length === 0 ? (
              <p className="text-sm text-bone-faint">Belum ada jadwal</p>
            ) : (
              <div className="space-y-2">
                {data.jadwal.map((j) => (
                  <div key={j.id} className="bg-asphalt-deep/40 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-bone">{j.hari}</span>
                      {j.jam && <span className="text-bone-dim">• {j.jam}</span>}
                    </div>
                    <p className="text-xs text-bone-dim mt-0.5">{j.rute.nama}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tagihan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Tagihan</h2>
            {data.tagihan.length === 0 ? (
              <p className="text-sm text-bone-faint">Belum ada tagihan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Periode</th>
                      <th className="text-right px-3 py-2 font-medium text-bone-dim">Jumlah</th>
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Jatuh Tempo</th>
                      <th className="text-center px-3 py-2 font-medium text-bone-dim">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tagihan.map((t) => (
                      <tr key={t.id} className="border-b border-asphalt-line">
                        <td className="px-3 py-2 text-bone">
                          {bulanList[t.bulan - 1]} {t.tahun}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatRupiah(t.jumlah)}</td>
                        <td className="px-3 py-2 text-bone-dim text-xs">{formatDate(t.jatuhTempo)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === "lunas" ? "bg-vest/10 text-emerald-800" :
                            t.status === "tunggakan" ? "bg-danger/10 text-red-800" :
                            "bg-amber/10 text-yellow-800"
                          }`}>
                            {t.status === "belum_bayar" ? "Belum Bayar" : t.status === "lunas" ? "Lunas" : "Tunggakan"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pembayaran */}
          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Riwayat Pembayaran</h2>
            {data.pembayaran.length === 0 ? (
              <p className="text-sm text-bone-faint">Belum ada pembayaran</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Tanggal</th>
                      <th className="text-right px-3 py-2 font-medium text-bone-dim">Jumlah</th>
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Metode</th>
                      <th className="text-center px-3 py-2 font-medium text-bone-dim">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pembayaran.map((p) => (
                      <tr key={p.id} className="border-b border-asphalt-line">
                        <td className="px-3 py-2 text-bone-dim text-xs">{formatDate(p.createdAt)}</td>
                        <td className="px-3 py-2 text-right font-medium text-vest">{formatRupiah(p.jumlah)}</td>
                        <td className="px-3 py-2 text-bone-dim">
                          {p.metode === "duitku" ? "Payment Gateway" : p.metode.charAt(0).toUpperCase() + p.metode.slice(1)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === "terverifikasi" ? "bg-vest/10 text-emerald-800" :
                            p.status === "pending" ? "bg-amber/10 text-yellow-800" :
                            "bg-danger/10 text-red-800"
                          }`}>
                            {p.status === "terverifikasi" ? "Terverifikasi" : p.status === "pending" ? "Pending" : "Ditolak"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pengangkutan */}
          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Riwayat Pengangkutan</h2>
            {data.pengangkutan.length === 0 ? (
              <p className="text-sm text-bone-faint">Belum ada pengangkutan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Tanggal</th>
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Petugas</th>
                      <th className="text-center px-3 py-2 font-medium text-bone-dim">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-bone-dim">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pengangkutan.map((p) => (
                      <tr key={p.id} className="border-b border-asphalt-line">
                        <td className="px-3 py-2 text-bone-dim text-xs">{formatDate(p.tanggal)}</td>
                        <td className="px-3 py-2 text-bone-dim">{p.petugas?.nama || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === "diambil" ? "bg-vest/10 text-emerald-800" :
                            p.status === "terjadwal" ? "bg-vest/10 text-blue-800" :
                            "bg-danger/10 text-red-800"
                          }`}>
                            {p.status === "diambil" ? "Diambil" : p.status === "terjadwal" ? "Terjadwal" : p.status === "kosong" ? "Kosong" : "Tidak Diangkut"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-bone-dim text-xs">{p.catatan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Komplain */}
          <div className="panel p-5">
            <h2 className="font-semibold text-bone mb-4">Komplain</h2>
            {data.komplain.length === 0 ? (
              <p className="text-sm text-bone-faint">Belum ada komplain</p>
            ) : (
              <div className="space-y-2">
                {data.komplain.map((k) => (
                  <div key={k.id} className="bg-asphalt-deep/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-bone-faint">{formatDate(k.createdAt)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        k.status === "baru" ? "bg-danger/10 text-red-800" :
                        k.status === "diproses" ? "bg-amber/10 text-yellow-800" :
                        "bg-vest/10 text-emerald-800"
                      }`}>
                        {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-bone-dim">{k.deskripsi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
