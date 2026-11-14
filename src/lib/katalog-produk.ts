export type KategoriProduk =
  | "kompos"
  | "maggot"
  | "eco_enzyme"
  | "daur_ulang"
  | "peralatan";

export interface ProdukSampah {
  id: string;
  nama: string;
  kategori: KategoriProduk;
  harga: number;
  satuan: string;
  deskripsi: string;
  gambar: string;
  stokTersedia: boolean;
  badge?: string;
  urutan?: number;
  aktif: boolean;
}

export const KATEGORI_LABELS: Record<KategoriProduk, string> = {
  kompos: "Pupuk & Kompos",
  maggot: "Maggot BSF Pakan",
  eco_enzyme: "Eco-Enzyme Alami",
  daur_ulang: "Kreasi Daur Ulang",
  peralatan: "Peralatan & Wadah",
};

export const DEFAULT_PRODUK_LIST: ProdukSampah[] = [
  {
    id: "prod-kompos-5kg",
    nama: "Pupuk Kompos Super Organik (5 kg)",
    kategori: "kompos",
    harga: 15000,
    satuan: "karung 5 kg",
    deskripsi:
      "Kompos matang teruji hasil olahan sampah organik daun & sayur warga. Siap pakai untuk menyuburkan tanaman hias, cabai, dan sayuran di pekarangan rumah.",
    gambar:
      "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80",
    stokTersedia: true,
    badge: "Paling Laris",
    urutan: 1,
    aktif: true,
  },
  {
    id: "prod-kompos-25kg",
    nama: "Pupuk Kompos Organik Curah (25 kg)",
    kategori: "kompos",
    harga: 55000,
    satuan: "karung 25 kg",
    deskripsi:
      "Kemasan hemat untuk penghijauan perumahan, paguyuban RT/RW, kebun buah, dan area taman komunal di Kota Depok.",
    gambar:
      "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80",
    stokTersedia: true,
    badge: "Hemat 20%",
    urutan: 2,
    aktif: true,
  },
  {
    id: "prod-maggot-fresh",
    nama: "Maggot BSF Hidup Segar (Fresh Larvae)",
    kategori: "maggot",
    harga: 9000,
    satuan: "kg",
    deskripsi:
      "Pakan alternatif berprotein tinggi (42-45%) untuk ikan lele, nila, ayam, bebek, dan burung kicau. Bersih dibudidayakan dari sisa buah segar.",
    gambar:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    stokTersedia: true,
    badge: "Protein 45%",
    urutan: 3,
    aktif: true,
  },
  {
    id: "prod-dried-bsf",
    nama: "Dried BSF - Maggot Kering Panggang (250 gr)",
    kategori: "maggot",
    harga: 28000,
    satuan: "pouch 250 gr",
    deskripsi:
      "Maggot kering higienis dipanggang suhu presisi tanpa minyak. Tahan simpan hingga 12 bulan, wangi gurih menggugah nafsu makan ikan hias & unggas.",
    gambar:
      "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
    stokTersedia: true,
    badge: "Tahan 12 Bulan",
    urutan: 4,
    aktif: true,
  },
  {
    id: "prod-eco-enzyme",
    nama: "Bio Eco-Enzyme Pembersih Alami (1 Liter)",
    kategori: "eco_enzyme",
    harga: 22000,
    satuan: "botol 1 Liter",
    deskripsi:
      "Cairan fermentasi kulit buah 90 hari. Pembersih lantai alami antiseptik, pengurai bau selokan/tong sampah, dan penetralisir pestisida buah.",
    gambar:
      "https://images.unsplash.com/photo-1608248597359-009d7367c336?auto=format&fit=crop&w=800&q=80",
    stokTersedia: true,
    badge: "100% Organik",
    urutan: 5,
    aktif: true,
  },
  {
    id: "prod-tong-pilah",
    nama: "Tong Sampah Pilah Bertutup (40 Liter)",
    kategori: "peralatan",
    harga: 48000,
    satuan: "unit",
    deskripsi:
      "Wadah sampah kuat berbahan plastik tebal daur ulang lengkap dengan pegangan samping dan tutup kedap bau anti-kucing/lalat untuk depan pagar rumah.",
    gambar:
      "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
    stokTersedia: true,
    badge: "Anti Bau & Awet",
    urutan: 6,
    aktif: true,
  },
  {
    id: "prod-paving-block",
    nama: "Paving Block Eco Daur Ulang Plastik",
    kategori: "daur_ulang",
    harga: 4500,
    satuan: "buah",
    deskripsi:
      "Paving ramah lingkungan dari peleburan kantong kresek dan pasir silika. Kuat tekan setara beton K-250, tidak berlumut, ideal untuk jalan taman & carport.",
    gambar:
      "https://images.unsplash.com/photo-1584463699028-5696144e131b?auto=format&fit=crop&w=800&q=80",
    stokTersedia: false,
    badge: "Inovasi Daur Ulang",
    urutan: 7,
    aktif: true,
  },
];

export const SETTING_KEY_KATALOG = "KATALOG_PRODUK_JSON";

/**
 * Format angka ke mata uang Rupiah.
 */
export function formatRupiah(nominal: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nominal);
}

/**
 * Menghasilkan link WhatsApp otomatis untuk pemesanan produk ke CS UPS HERU.
 */
export function getWaOrderUrl(
  produk: ProdukSampah,
  adminPhone: string = "6281400782617"
): string {
  const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
  const pesan = [
    `Halo Admin UPS HERU, saya ingin memesan produk daur ulang dari website:`,
    ``,
    `*Produk:* ${produk.nama}`,
    `*Harga:* ${formatRupiah(produk.harga)} / ${produk.satuan}`,
    `*Kategori:* ${KATEGORI_LABELS[produk.kategori] || produk.kategori}`,
    ``,
    `Mohon info ketersediaan stok & cara pengambilan / pengiriman ke alamat saya. Terima kasih!`,
  ].join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`;
}
