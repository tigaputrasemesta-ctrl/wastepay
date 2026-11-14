"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  ShoppingBag,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Truck,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Tag,
} from "lucide-react";
import {
  ProdukSampah,
  KategoriProduk,
  KATEGORI_LABELS,
  formatRupiah,
  getWaOrderUrl,
} from "@/lib/katalog-produk";

interface MarketplaceProdukSectionProps {
  initialProduk: ProdukSampah[];
}

export default function MarketplaceProdukSection({
  initialProduk,
}: MarketplaceProdukSectionProps) {
  const [selectedKategori, setSelectedKategori] = useState<string>("all");

  const activeProduk = useMemo(() => {
    return initialProduk.filter((p) => p.aktif);
  }, [initialProduk]);

  const filteredProduk = useMemo(() => {
    if (selectedKategori === "all") return activeProduk;
    return activeProduk.filter((p) => p.kategori === selectedKategori);
  }, [activeProduk, selectedKategori]);

  const categories = useMemo(() => {
    const list: { key: string; label: string; count: number }[] = [
      { key: "all", label: "Semua Produk", count: activeProduk.length },
    ];
    (Object.keys(KATEGORI_LABELS) as KategoriProduk[]).forEach((kat) => {
      const count = activeProduk.filter((p) => p.kategori === kat).length;
      if (count > 0) {
        list.push({ key: kat, label: KATEGORI_LABELS[kat], count });
      }
    });
    return list;
  }, [activeProduk]);

  if (activeProduk.length === 0) return null;

  return (
    <section id="produk" className="py-16 md:py-24 px-4 sm:px-6 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#0d7a75] border border-emerald-200/60 text-xs font-bold uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ekonomi Sirkular TPS 3R</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Marketplace Produk Olahan & Daur Ulang
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Dari sampah warga yang dipilah dan diolah di fasilitas TPS 3R Kalibaru, kami menghadirkan produk berkualitas tinggi untuk menyuburkan kebun pekarangan, pakan ternak alternatif, dan perlengkapan kebersihan.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium shrink-0">
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-[#0d7a75]" />
              <span>100% Olahan Mandiri</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
              <Truck className="w-4 h-4 text-[#0d7a75]" />
              <span>Kirim Seluruh Depok</span>
            </span>
          </div>
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedKategori(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                selectedKategori === cat.key
                  ? "bg-[#0d7a75] text-white shadow-sm shadow-[#0d7a75]/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedKategori === cat.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Products Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredProduk.map((item) => {
            const waUrl = getWaOrderUrl(item);

            return (
              <div
                key={item.id}
                className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm hover:border-[#0d7a75]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Banner with Aspect Ratio */}
                  <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden border-b border-slate-100">
                    <img
                      src={item.gambar}
                      alt={item.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span className="px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-extrabold uppercase text-white shadow-sm">
                        {KATEGORI_LABELS[item.kategori] || item.kategori}
                      </span>
                      {item.badge && (
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0d7a75] text-[10px] font-extrabold uppercase text-white shadow-sm flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                          <span>{item.badge}</span>
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <span className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white drop-shadow flex items-center gap-1.5 z-10">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.stokTersedia ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span>{item.stokTersedia ? "Stok Siap Kirim" : "Sistem Pre-Order"}</span>
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-[#0d7a75] transition-colors">
                        {item.nama}
                      </h3>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-xl font-extrabold text-[#0d7a75]">
                          {formatRupiah(item.harga)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/ {item.satuan}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal line-clamp-3">
                      {item.deskripsi}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-[#0d7a75] hover:bg-[#0b6460] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 group-hover:shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Pesan via WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Trust & Delivery Banner ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#f8fafb] border border-slate-200/90 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0d7a75] flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="font-extrabold text-slate-900 block text-sm">
                Mendukung Sirkular Ekonomi Warga Kalibaru Kota Depok
              </span>
              <p className="text-xs text-slate-500">
                Setiap pembelian produk daur ulang membantu pembiayaan operasional TPS 3R dan menekan timbunan residu ke TPA Cipayung.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
            <a
              href="https://wa.me/6281400782617?text=Halo%20Admin%20UPS%20HERU,%20saya%20ingin%20konsultasi%20pembelian%20produk%20kompos/maggot%20dalam%20jumlah%20besar"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <span>Konsultasi Pemesanan Partai Besar</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0d7a75]" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
