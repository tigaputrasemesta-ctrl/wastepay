"use client";

import React, { useState } from "react";

interface GuideItem {
  id: string;
  name: string;
  category: "bank" | "ewallet" | "other";
  icon: string;
  badge?: string;
  steps: string[];
}

const GUIDES: GuideItem[] = [
  {
    id: "bca",
    name: "BCA Mobile",
    category: "bank",
    icon: "🏦",
    badge: "Paling Populer",
    steps: [
      "Buka aplikasi BCA mobile Anda dan login.",
      "Pilih tombol 'QR' / 'QRIS' di bagian tengah bawah menu utama.",
      "Arahkan kamera untuk scan kode QRIS pembayaran (atau pilih ikon Galeri jika bayar di HP yang sama).",
      "Periksa rincian pembayaran (Nama Penerima: HERO ZERO WASTE) dan tekan 'OK'.",
      "Masukkan PIN m-BCA Anda.",
      "Selesai! Transaksi berhasil dan tagihan Anda otomatis LUNAS di sistem tanpa perlu kirim struk."
    ]
  },
  {
    id: "mandiri-bri",
    name: "Mandiri (Livin') & BRI (BRImo)",
    category: "bank",
    icon: "🏦",
    steps: [
      "Buka aplikasi Livin' by Mandiri atau BRImo di smartphone Anda.",
      "Pilih menu 'QR Bayar' / 'QRIS' pada halaman utama.",
      "Lakukan Scan pada kode QR pembayaran yang tertera.",
      "Periksa detail nama merchant (HERO ZERO WASTE) serta nominal tagihan.",
      "Pilih rekening sumber dana lalu masukkan PIN m-Banking Anda.",
      "Pembayaran berhasil diproses dan status tagihan langsung terkonfirmasi otomatis."
    ]
  },
  {
    id: "bni",
    name: "BNI (Wondr & BNI Mobile)",
    category: "bank",
    icon: "🏦",
    steps: [
      "Login ke aplikasi Wondr by BNI atau BNI Mobile Banking.",
      "Klik tombol 'QRIS' pada halaman utama.",
      "Scan QR atau barcode untuk mulai bertransaksi (atau upload gambar screenshot dari galeri).",
      "Pilih rekening sumber dana dan periksa nominal tagihan.",
      "Masukkan PIN transaksi BNI Anda.",
      "Jika transaksi berhasil, muncul status 'Transaksi Berhasil' dan tagihan otomatis Lunas."
    ]
  },
  {
    id: "gopay",
    name: "GoPay / Gojek",
    category: "ewallet",
    icon: "🟢",
    badge: "E-Wallet",
    steps: [
      "Buka aplikasi Gojek di HP Anda.",
      "Pilih menu 'Bayar' / ikon QR di halaman beranda Gojek.",
      "Lakukan Scan pada Barcode / QRIS pembayaran.",
      "Pilih metode pembayaran menggunakan saldo GoPay.",
      "Tekan 'Bayar' dan masukkan PIN GoPay Anda.",
      "Tunggu hingga proses pembayaran berhasil. Transaksi Anda otomatis terkonfirmasi di sistem."
    ]
  },
  {
    id: "dana",
    name: "DANA",
    category: "ewallet",
    icon: "🔵",
    badge: "E-Wallet",
    steps: [
      "Buka aplikasi DANA.",
      "Pilih menu 'Pindai' / 'Pay' di bagian atas beranda DANA.",
      "Lakukan Scan pada Barcode QRIS pembayaran.",
      "Periksa nominal tagihan dan pilih 'Bayar' menggunakan saldo DANA.",
      "Masukkan PIN DANA Anda.",
      "Tunggu notifikasi berhasil. Sistem WastePay akan otomatis mencatat tagihan lunas."
    ]
  },
  {
    id: "shopee",
    name: "ShopeePay / Shopee",
    category: "ewallet",
    icon: "🟠",
    badge: "E-Wallet",
    steps: [
      "Buka aplikasi Shopee.",
      "Pilih menu 'ShopeePay' atau langsung klik ikon 'Scan QR' di pojok kiri atas.",
      "Arahkan kamera ke barcode pembayaran (atau ambil dari galeri foto).",
      "Periksa detail tagihan, lalu pilih 'Bayar Sekarang'.",
      "Masukkan PIN ShopeePay Anda dan tunggu proses selesai.",
      "Transaksi Anda akan otomatis terkonfirmasi di sistem."
    ]
  },
  {
    id: "ovo",
    name: "OVO",
    category: "ewallet",
    icon: "🟣",
    badge: "E-Wallet",
    steps: [
      "Buka aplikasi OVO.",
      "Pilih menu 'Scan' / QRIS di halaman beranda OVO.",
      "Lakukan Scan pada Barcode pembayaran.",
      "Periksa nominal tagihan retribusi sampah, lalu tekan 'Bayar'.",
      "Masukkan PIN OVO Anda.",
      "Tunggu hingga proses berhasil. Tagihan otomatis LUNAS seketika."
    ]
  },
  {
    id: "other",
    name: "Bank Lainnya & E-Wallet (LinkAja, Neobank, Seabank, dll)",
    category: "other",
    icon: "📲",
    steps: [
      "Buka aplikasi bank digital atau e-wallet apa saja (LinkAja, Neobank, Seabank, BSI Mobile, CIMB Octo, PermataMobile, dll).",
      "Cari dan pilih menu 'QRIS' atau 'Scan QR'.",
      "Scan barcode QRIS yang tampil di layar.",
      "Periksa detail penerima (HERO ZERO WASTE) dan selesaikan pembayaran dengan memasukkan PIN.",
      "Pembayaran selesai dan langsung terverifikasi otomatis dalam hitungan detik."
    ]
  }
];

export function PanduanCaraBayarQris({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<string>("bca");

  const currentGuide = GUIDES.find((g) => g.id === activeTab) || GUIDES[0];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 hover:bg-slate-100/60 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            QR
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>Panduan Cara Bayar QRIS (How to Pay)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hidden sm:inline-block">
                Semua Bank & E-Wallet
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              BCA, Mandiri, BRI, BNI, GoPay, DANA, ShopeePay, OVO & m-Banking lainnya
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 shrink-0">
          <span className="hidden sm:inline">{isOpen ? "Tutup Panduan" : "Lihat Cara Bayar"}</span>
          <span className={`transform transition-transform text-base ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Konten Panduan */}
      {isOpen && (
        <div className="p-5 sm:p-6 space-y-6 border-t border-slate-100 animate-in fade-in duration-200">
          {/* TIPS EMAS: Bayar di 1 HP yang sama */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
              <span className="text-base">💡</span>
              <span>Tips Praktis: Cara Bayar Jika Hanya Menggunakan 1 HP Saja</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              Bila Anda membuka web ini langsung di HP Anda:
            </p>
            <ol className="text-xs text-amber-900/90 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
              <li>Klik tombol <strong>&quot;Bayar Sekarang&quot;</strong> sampai barcode QRIS muncul di layar.</li>
              <li>Ambil tangkapan layar (<strong>Screenshot</strong>) kode QRIS tersebut.</li>
              <li>Buka aplikasi m-Banking atau E-Wallet Anda (BCA, DANA, GoPay, Mandiri, dll).</li>
              <li>Pilih menu <strong>Scan QRIS</strong>, lalu ketuk ikon <strong>&quot;Galeri Foto&quot;</strong> (biasanya di pojok layar scan).</li>
              <li>Pilih gambar screenshot QRIS tadi. Sistem m-Banking Anda akan langsung memproses pembayaran!</li>
            </ol>
          </div>

          {/* Opsi Cetak QRIS */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-950 flex items-start gap-3 text-xs">
            <span className="text-base shrink-0">🖨️</span>
            <div>
              <p className="font-bold text-sky-900">Mau Cetak QRIS ke Kertas / Dibayar via Kasir?</p>
              <p className="text-sky-900/80 mt-0.5 leading-relaxed">
                Pada halaman pembayaran QRIS, Anda dapat mendownload gambar QRIS atau mencetaknya langsung untuk diberikan kepada kasir, minimarket, atau anggota keluarga lainnya untuk di-scan.
              </p>
            </div>
          </div>

          {/* Tab Pilihan Aplikasi */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pilih Aplikasi Pembayaran Anda:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GUIDES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveTab(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === g.id
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{g.icon}</span>
                  <span>{g.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Langkah-langkah Detail Per Aplikasi Terpilih */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">{currentGuide.icon}</span>
                <h4 className="font-bold text-slate-900 text-sm">{currentGuide.name}</h4>
              </div>
              {currentGuide.badge && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentGuide.badge}
                </span>
              )}
            </div>

            <ol className="space-y-2 text-xs text-slate-700">
              {currentGuide.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
