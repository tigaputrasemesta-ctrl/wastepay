"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";

export interface RiwayatPembayaranItem {
  id: number;
  tanggal: string | Date;
  jumlah: number;
  metode: string;
  buktiBayar: string | null;
  catatan: string | null;
  pelanggan: {
    id: number;
    nama: string;
    noTelepon: string | null;
    kodePelanggan: string;
    kelurahan?: { id: number; nama: string } | null;
  };
  tagihan: {
    id: number;
    bulan: number;
    tahun: number;
    jumlah: number;
    denda?: number | null;
    noInvoice: string | null;
  };
  verifiedBy?: { id: number; nama: string } | null;
}

const NAMA_BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export function TabelRiwayatPemasukan({
  data,
  bulanIni,
  tahunIni,
}: {
  data: RiwayatPembayaranItem[];
  bulanIni: number;
  tahunIni: number;
}) {
  const [search, setSearch] = useState("");
  const [filterMetode, setFilterMetode] = useState<string>("semua");
  const [modalFoto, setModalFoto] = useState<{
    url: string;
    nama: string;
    kode: string;
    nominal: number;
    metode: string;
  } | null>(null);

  // Filter list
  const filtered = useMemo(() => {
    return data.filter((item) => {
      // Filter Metode
      if (filterMetode !== "semua") {
        if (filterMetode === "tunai" && item.metode !== "tunai") return false;
        if (filterMetode === "transfer" && item.metode !== "transfer") return false;
        if (
          filterMetode === "gateway" &&
          item.metode !== "duitku" &&
          item.metode !== "qris" &&
          item.metode !== "ewallet" &&
          item.metode !== "virtual_account"
        )
          return false;
      }

      // Filter Pencarian
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const nama = item.pelanggan?.nama?.toLowerCase() || "";
      const kode = item.pelanggan?.kodePelanggan?.toLowerCase() || "";
      const invoice = item.tagihan?.noInvoice?.toLowerCase() || "";
      const kelurahan = item.pelanggan?.kelurahan?.nama?.toLowerCase() || "";

      return nama.includes(q) || kode.includes(q) || invoice.includes(q) || kelurahan.includes(q);
    });
  }, [data, search, filterMetode]);

  const totalFilteredNominal = useMemo(() => {
    return filtered.reduce((sum, item) => sum + item.jumlah, 0);
  }, [filtered]);

  function getMetodeBadge(metode: string) {
    if (metode === "tunai") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span>💵</span> Tunai
        </span>
      );
    }
    if (metode === "transfer") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <span>🏦</span> Transfer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
        <span>📱</span> QRIS / Gateway
      </span>
    );
  }

  function getKategoriPeriode(tBulan: number, tTahun: number) {
    if (tTahun === tahunIni && tBulan === bulanIni) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
          Bulan Ini ({NAMA_BULAN_SINGKAT[tBulan - 1]})
        </span>
      );
    }
    if (tTahun < tahunIni || (tTahun === tahunIni && tBulan < bulanIni)) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
          Tunggakan ({NAMA_BULAN_SINGKAT[tBulan - 1]} {tTahun})
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
        Bayar di Muka ({NAMA_BULAN_SINGKAT[tBulan - 1]} {tTahun})
      </span>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>📋</span> Riwayat Seluruh Transaksi Uang Masuk Bulan Ini
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Menampilkan <span className="font-bold text-slate-800">{filtered.length}</span> dari{" "}
            <span className="font-bold text-slate-800">{data.length}</span> pembayaran terverifikasi · Total:{" "}
            <span className="font-extrabold text-emerald-700">{formatRupiah(totalFilteredNominal)}</span>
          </p>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterMetode("semua")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                filterMetode === "semua" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({data.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMetode("tunai")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                filterMetode === "tunai" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💵 Tunai
            </button>
            <button
              type="button"
              onClick={() => setFilterMetode("transfer")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                filterMetode === "transfer" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🏦 Transfer
            </button>
            <button
              type="button"
              onClick={() => setFilterMetode("gateway")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                filterMetode === "gateway" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📱 QRIS / Gateway
            </button>
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Cari nama, kode, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 pl-8 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>
      </div>

      {/* Tabel */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Tidak ditemukan transaksi pembayaran yang sesuai dengan kriteria filter.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto border border-slate-100 rounded-xl">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr className="text-slate-600 font-bold uppercase text-[10px]">
                <th className="text-left px-3 py-2.5">No</th>
                <th className="text-left px-3 py-2.5">Waktu Masuk</th>
                <th className="text-left px-3 py-2.5">Pelanggan / Warga</th>
                <th className="text-left px-3 py-2.5">Kelurahan</th>
                <th className="text-left px-3 py-2.5">Untuk Tagihan</th>
                <th className="text-left px-3 py-2.5">Jalur Bayar</th>
                <th className="text-right px-3 py-2.5">Nominal (Rp)</th>
                <th className="text-center px-3 py-2.5">Bukti / Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                    {formatDate(item.tanggal)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-bold text-slate-900 block">{item.pelanggan?.nama}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">
                      {item.pelanggan?.kodePelanggan}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 font-medium">
                    {item.pelanggan?.kelurahan?.nama || "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      {getKategoriPeriode(item.tagihan.bulan, item.tagihan.tahun)}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.tagihan.noInvoice || `#${item.tagihan.id}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{getMetodeBadge(item.metode)}</td>
                  <td className="px-3 py-2.5 text-right font-black text-emerald-700 tabular-nums text-sm">
                    {formatRupiah(item.jumlah)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        href={`/kwitansi/${item.id}`}
                        target="_blank"
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] border border-emerald-200 transition"
                        title="Buka Kwitansi Resmi"
                      >
                        Kwitansi
                      </Link>
                      {item.buktiBayar && (
                        <button
                          type="button"
                          onClick={() =>
                            setModalFoto({
                              url: item.buktiBayar!,
                              nama: item.pelanggan?.nama || "Pelanggan",
                              kode: item.pelanggan?.kodePelanggan || "-",
                              nominal: item.jumlah,
                              metode: item.metode,
                            })
                          }
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] border border-indigo-200 transition"
                          title="Lihat Foto Bukti"
                        >
                          📷 Foto
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan={6} className="px-3 py-2.5 text-right uppercase text-[10px]">
                  Total Pemasukan Ditampilkan:
                </td>
                <td className="px-3 py-2.5 text-right text-emerald-800 font-black text-sm">
                  {formatRupiah(totalFilteredNominal)}
                </td>
                <td className="px-3 py-2.5 text-center text-[10px] text-slate-500 font-mono">
                  {filtered.length} transaksi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal Foto Bukti */}
      {modalFoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalFoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Foto Bukti Pembayaran</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {modalFoto.nama} ({modalFoto.kode}) · {formatRupiah(modalFoto.nominal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalFoto(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full h-80 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              <Image
                src={modalFoto.url}
                alt="Bukti pembayaran"
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 capitalize">
                Metode: {modalFoto.metode}
              </span>
              <a
                href={modalFoto.url}
                download={`bukti-bayar-${modalFoto.kode}.jpg`}
                target="_blank"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Unduh Foto Asli
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
