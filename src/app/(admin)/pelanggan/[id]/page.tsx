"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/utils";
import ModalApprovalPelanggan from "@/components/ModalApprovalPelanggan";
import { useToast } from "@/components/Toast";
import { ShieldCheck } from "lucide-react";

const PetaLokasi = dynamic(() => import("@/components/PetaLokasi"), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full border border-slate-200/80 bg-slate-100 rounded-2xl flex items-center justify-center">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Memuat Peta…</p>
    </div>
  ),
});

type Kelurahan = { id: number; nama: string; kecamatan?: string | null };
type Paket = { id: number; nama: string; harga: number | null; deskripsi?: string };
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
  kelurahan?: Kelurahan | null;
  wilayah?: {
    id: number;
    nama: string;
    zonaId?: number | null;
    zona?: { id: number; nama: string; warna?: string | null; keterangan?: string | null } | null;
  } | null;
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
  const { showToast } = useToast();
  const [data, setData] = useState<PelangganDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

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
        <div className="h-8 bg-gray-100 border border-slate-200/80 rounded-xl w-64" />
        <div className="h-48 bg-gray-100 border border-slate-200/80 rounded-2xl" />
        <div className="h-32 bg-gray-100 border border-slate-200/80 rounded-2xl" />
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
          className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition"
        >
          <svg className="w-5 h-5 text-gray-600 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7 7l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">{data.nama}</h1>
          <p className="text-sm text-slate-500 font-medium">Detail pelanggan</p>
        </div>
        <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          data.status === "aktif" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" :
          data.status === "calon" ? "bg-sky-400/10 text-sky-400 border border-sky-500/30" :
          data.status === "libur" ? "bg-amber-400/10 text-amber-400 border border-amber-500/30" :
          "bg-slate-100 border border-slate-200 text-slate-600 font-medium"
        }`}>
          {data.status === "calon" ? "Calon" : data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </span>
        {data.status === "calon" && (
          <button
            onClick={() => setShowApprovalModal(true)}
            className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Approval &amp; Tentukan Zona Pickup</span>
          </button>
        )}
      </div>

      {/* Banner Menunggu Approval & Penentuan Zona */}
      {data.status === "calon" && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Calon Pelanggan Baru — Menunggu Approval &amp; Penentuan Zona Admin Pusat
              </p>
              <p className="text-xs text-slate-600">
                {data.fotoRumah || (data.latitude && data.longitude)
                  ? "Survei lapangan telah dilakukan. Tentukan zona area pickup dan rute armada untuk mengaktifkan pelanggan."
                  : "Menunggu kelengkapan survei lapangan atau lengkapi zona langsung untuk mengaktifkan."}
                {data.referal && ` • Surveyor/Reff: ${data.referal}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowApprovalModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Approval &amp; Tentukan Zona</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informasi Pelanggan */}
        <div className="lg:col-span-1 space-y-6">
          {/* Kode Pelanggan & Barcode */}
          {data.kodePelanggan && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Kode Pelanggan</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight tracking-widest mb-3 font-mono">{data.kodePelanggan}</p>
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
              <p className="text-xs text-gray-400 font-bold mt-2 font-mono">{data.kodePelanggan}</p>
            </div>
          )}

          {/* Foto Depan Rumah (Geotag) */}
          {(data.fotoRumah || (data.latitude && data.longitude)) && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <h2 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full h-52 object-cover rounded-2xl border border-slate-200/80 shadow-sm"
                />
              ) : (
                <div className="w-full h-52 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Belum ada foto</span>
                </div>
              )}
              {data.latitude && data.longitude && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 font-mono">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      data.koordinatSumber === "exif_foto"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : data.koordinatSumber === "gps_perangkat"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 border border-slate-200 text-slate-600"
                    }`}>
                      {{
                        exif_foto: "Geotag dari Foto",
                        gps_perangkat: "GPS Perangkat",
                        manual: "Manual",
                      }[data.koordinatSumber || ""] || "Manual"}
                    </span>
                    {data.koordinatAkurasi ? (
                      <span className="text-xs text-emerald-700 font-medium">± {Math.round(data.koordinatAkurasi)} m</span>
                    ) : null}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-700 font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Buka Google Maps ↗
                  </a>
                  <div className="h-52 rounded-xl border border-slate-200/80 overflow-hidden">
                    <PetaLokasi
                      latitude={data.latitude}
                      longitude={data.longitude}
                      className="h-52 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Informasi</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-medium">No. Telepon</p>
                <p className="font-semibold text-slate-900 text-sm">{data.noTelepon}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Kategori</p>
                <p className="font-semibold text-slate-900 text-sm">
                  {{
                    level_1: "🏠 Level 1 — Volume Sangat Kecil",
                    level_2: "🏘️ Level 2 — Volume Kecil–Sedang",
                    level_3: "🏪 Level 3 — Volume Sedang",
                    level_4: "🏢 Level 4 — Volume Sedang–Besar",
                    level_5: "🏨 Level 5 — Volume Besar",
                    level_6: "🏭 Level 6 — Volume Sangat Besar",
                    level_7: "🏗️ Level 7 — Volume Ekstra Besar",
                    level_8: "🏬 Level 8 — Volume Komersial Besar",
                    level_9: "🏥 Level 9 — Volume Maksimal",
                    level_10: "🏙️ Level 10 — Volume Korporat",
                  }[data.kategori] || data.kategori}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Alamat</p>
                <p className="font-semibold text-slate-900 text-sm">{data.alamat}</p>
              </div>
              {data.rtRw && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">RT/RW</p>
                  <p className="font-semibold text-slate-900 text-sm">{data.rtRw}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 font-medium">Kelurahan &amp; Kecamatan</p>
                <p className="font-semibold text-slate-900 text-sm">
                  {data.kelurahan?.nama ?? "—"}
                  {data.kelurahan?.kecamatan ? ` (Kec. ${data.kelurahan.kecamatan})` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Zona Area Pickup</p>
                {data.wilayah?.zona ? (
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: data.wilayah.zona.warna || "#10b981" }}
                      />
                      <span className="font-bold text-slate-900 text-sm">
                        {data.wilayah.zona.nama}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      Ubah Zona
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-amber-600 font-medium">Belum ditentukan</span>
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      + Tentukan Zona
                    </button>
                  </div>
                )}
              </div>
              {data.wilayah && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Wilayah / RT</p>
                  <p className="font-semibold text-slate-900 text-sm">{data.wilayah.nama}</p>
                </div>
              )}
              {data.patokanLokasi && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Patokan Lokasi</p>
                  <p className="font-semibold text-slate-900 text-sm">{data.patokanLokasi}</p>
                </div>
              )}
              {data.latitude && data.longitude && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Koordinat</p>
                  <p className="font-semibold text-slate-900 font-mono text-xs">
                    {data.latitude}, {data.longitude}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                    target="_blank"
                    className="text-xs text-emerald-700 hover:text-emerald-700 font-medium inline-flex items-center gap-1 mt-1"
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
                  <p className="text-xs text-slate-500 font-medium">Penanggung Jawab</p>
                  <p className="font-semibold text-slate-900 text-sm">{data.penanggungjawab}</p>
                </div>
              )}
              {data.referal && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Referal</p>
                  <p className="font-semibold text-slate-900 text-sm">{data.referal}</p>
                </div>
              )}
              {data.paket && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Paket Langganan</p>
                  <p className="font-semibold text-slate-900 text-sm">{data.paket.nama}</p>
                  <p className="text-xs text-emerald-700 font-semibold">{data.paket.harga != null ? `${formatRupiah(data.paket.harga)}/bln` : "Tarif variabel"}</p>
                </div>
              )}
              {data.customTarif && (
                <div>
                  <p className="text-xs text-slate-500 font-medium">Tarif Kustom</p>
                  <p className="font-semibold text-emerald-700 text-sm">{formatRupiah(data.customTarif)}/bln</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 font-medium">Tanggal Daftar</p>
                <p className="font-semibold text-slate-900 text-sm">{formatDate(data.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Ringkasan Keuangan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Ringkasan Keuangan</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Tagihan</span>
                <span className="font-semibold text-slate-900">{formatRupiah(totalTagihan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Bayar</span>
                <span className="font-semibold text-emerald-700">{formatRupiah(totalBayar)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3">
                <span className="text-slate-500 font-medium">Sisa</span>
                <span className={`font-semibold ${totalTagihan - totalBayar > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  {formatRupiah(totalTagihan - totalBayar)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tagihan Aktif</span>
                <span className="font-semibold text-amber-700">{tagihanAktif.length}</span>
              </div>
            </div>
          </div>

          {/* Jadwal */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Jadwal Pengangkutan</h2>
            {data.jadwal.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">Belum ada jadwal</p>
            ) : (
              <div className="space-y-2">
                {data.jadwal.map((j) => (
                  <div key={j.id} className="bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{j.hari}</span>
                      {j.jam && <span className="text-slate-500 font-normal">• {j.jam}</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">{j.rute.nama}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tagihan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Tagihan</h2>
            {data.tagihan.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">Belum ada tagihan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-semibold">Periode</th>
                      <th className="text-right px-3 py-2 font-semibold">Jumlah</th>
                      <th className="text-left px-3 py-2 font-semibold">Jatuh Tempo</th>
                      <th className="text-center px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tagihan.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          {bulanList[t.bulan - 1]} {t.tahun}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900 tabular-nums">{formatRupiah(t.jumlah)}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{formatDate(t.jatuhTempo)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === "lunas" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            t.status === "tunggakan" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-amber-50 text-amber-700 border border-amber-200"
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Riwayat Pembayaran</h2>
            {data.pembayaran.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">Belum ada pembayaran</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-semibold">Tanggal</th>
                      <th className="text-right px-3 py-2 font-semibold">Jumlah</th>
                      <th className="text-left px-3 py-2 font-semibold">Metode</th>
                      <th className="text-center px-3 py-2 font-semibold">Status</th>
                      <th className="text-center px-3 py-2 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pembayaran.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{formatDate(p.createdAt)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">{formatRupiah(p.jumlah)}</td>
                        <td className="px-3 py-2.5 text-slate-600 capitalize">
                          {p.metode === "duitku" ? "Payment Gateway" : p.metode.charAt(0).toUpperCase() + p.metode.slice(1)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === "terverifikasi" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            p.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {p.status === "terverifikasi" ? "Terverifikasi" : p.status === "pending" ? "Pending" : "Ditolak"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {p.status === "terverifikasi" ? (
                            <Link
                              href={`/kwitansi/${p.id}`}
                              target="_blank"
                              className="text-xs text-emerald-700 underline hover:text-emerald-700 font-semibold"
                            >
                              Kwitansi
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pengangkutan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Riwayat Pengangkutan</h2>
            {data.pengangkutan.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">Belum ada pengangkutan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2 font-semibold">Tanggal</th>
                      <th className="text-left px-3 py-2 font-semibold">Petugas</th>
                      <th className="text-center px-3 py-2 font-semibold">Status</th>
                      <th className="text-left px-3 py-2 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pengangkutan.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{formatDate(p.tanggal)}</td>
                        <td className="px-3 py-2.5 text-slate-900 font-medium">{p.petugas?.nama || "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === "diambil" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            p.status === "terjadwal" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                            "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {p.status === "diambil" ? "Diambil" : p.status === "terjadwal" ? "Terjadwal" : p.status === "kosong" ? "Kosong" : "Tidak Diangkut"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{p.catatan || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Komplain */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 text-base mb-4">Komplain</h2>
            {data.komplain.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">Belum ada komplain</p>
            ) : (
              <div className="space-y-2.5">
                {data.komplain.map((k) => (
                  <div key={k.id} className="bg-slate-50 rounded-xl border border-slate-200/60 p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400 font-medium">{formatDate(k.createdAt)}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        k.status === "baru" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        k.status === "diproses" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 font-normal">{k.deskripsi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Approval & Zona Pickup */}
      <ModalApprovalPelanggan
        pelanggan={data}
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onSuccess={() => {
          setShowApprovalModal(false);
          // Refetch data
          fetch(`/api/pelanggan/${data.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((updated) => {
              if (updated) setData(updated);
            });
        }}
        showToast={showToast}
      />
    </div>
  );
}
