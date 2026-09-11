"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { formatDate, formatRupiah } from "@/lib/utils";

const PetaLokasi = dynamic(() => import("@/components/PetaLokasi"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full border border-slate-200/80 bg-slate-100 rounded-2xl flex items-center justify-center">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Memuat Peta…</p>
    </div>
  ),
});

type Detail = {
  id: number;
  nama: string;
  kodePelanggan: string;
  noTelepon: string;
  kategori: string;
  alamat: string;
  rtRw: string | null;
  patokanLokasi: string | null;
  fotoRumah: string | null;
  latitude: number | null;
  longitude: number | null;
  koordinatSumber: string | null;
  koordinatAkurasi: number | null;
  penanggungjawab: string | null;
  referal: string | null;
  catatan: string | null;
  status: string;
  createdAt: string;
  wilayah: { id: number; nama: string } | null;
  kelurahan: { id: number; nama: string; kecamatan: string | null } | null;
  paket: { id: number; nama: string; harga: number; deskripsi: string | null } | null;
};

const SUMBER_LABEL: Record<string, string> = {
  exif_foto: "Geotag dari Foto",
  gps_perangkat: "GPS Perangkat",
  manual: "Manual",
};

const STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  calon: "Calon",
  nonaktif: "Nonaktif",
  libur: "Libur",
};

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1 break-words">{value || "—"}</p>
    </div>
  );
}

export default function SurveiDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/survei/${params.id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => null);
          throw new Error(d?.error || "Gagal memuat detail");
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message || "Gagal memuat detail"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-10 text-center text-slate-400 font-medium">
        Memuat data survei…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-10 text-center">
        <p className="font-semibold text-xl text-rose-600">{error || "Tidak ditemukan"}</p>
        <Link href="/survei" className="inline-block mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-semibold underline">
          ← Kembali ke Survei
        </Link>
      </div>
    );
  }

  const koordinatSumber = SUMBER_LABEL[data.koordinatSumber || ""] || "Manual";
  const status = STATUS_LABEL[data.status] || data.status;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/survei" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline">
            ← Kembali ke Survei
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2 leading-none">{data.nama}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            <span className="font-mono text-slate-400">{data.kodePelanggan}</span> · daftar {formatDate(data.createdAt)}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
          data.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          {status}
        </span>
      </div>

      {/* Foto + Peta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Foto Rumah</p>
          {data.fotoRumah ? (
            <div className="relative h-64 w-full rounded-xl border border-slate-200/80 bg-slate-100 overflow-hidden">
              <Image src={data.fotoRumah} alt={`Foto rumah ${data.nama}`} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-64 w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-400 font-medium text-sm">
              Belum Ada Foto
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Titik Lokasi (GPS)</p>
          {data.latitude != null && data.longitude != null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    data.koordinatSumber === "manual" ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {koordinatSumber}
                  </span>
                  {data.koordinatAkurasi ? (
                    <span className="ml-2 text-xs text-emerald-600 font-medium">± {Math.round(data.koordinatAkurasi)} m</span>
                  ) : null}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                >
                  Buka Google Maps ↗
                </a>
              </div>
              <p className="font-mono text-xs text-slate-400">
                {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
              </p>
              <div className="h-64 rounded-xl border border-slate-200/80 overflow-hidden">
                <PetaLokasi latitude={data.latitude} longitude={data.longitude} className="h-64 w-full" />
              </div>
            </div>
          ) : (
            <div className="h-64 w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-400 font-medium text-sm">
              Belum Ada Titik Lokasi
            </div>
          )}
        </div>
      </div>

      {/* Informasi pendaftar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="font-bold text-slate-900 text-base mb-4">Informasi Pendaftar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Info label="No. WhatsApp" value={data.noTelepon} />
          <Info label="Kategori" value={data.kategori.replace(/_/g, " ")} />
          <Info label="Status" value={status} />
          <Info
            label="Kelurahan"
            value={data.kelurahan ? `${data.kelurahan.nama}${data.kelurahan.kecamatan ? ` (${data.kelurahan.kecamatan})` : ""}` : data.wilayah?.nama}
          />
          <Info label="Wilayah (RT)" value={data.wilayah?.nama} />
          <Info label="Paket Layanan" value={data.paket ? `${data.paket.nama} — ${formatRupiah(data.paket.harga)}/bln` : "—"} />
        </div>

        <div className="mt-4 space-y-3">
          <Info label="Alamat Lengkap" value={data.alamat} />
          <Info label="RT / RW" value={data.rtRw} />
          <Info label="Patokan Lokasi" value={data.patokanLokasi} />
          <Info label="Penanggung Jawab" value={data.penanggungjawab} />
          <Info label="Referal" value={data.referal} />
          <Info label="Catatan Survei" value={data.catatan} />
        </div>
      </div>
    </div>
  );
}
