export interface MarketplaceProductItem {
  id: number;
  nama: string;
  slug: string;
  kategori: string;
  harga: number;
  stok: number;
  satuan: string;
  beratGram: number;
  deskripsi: string;
  foto: string;
  aktif: boolean;
  tenantId?: string | null;
}

export const DEFAULT_MARKETPLACE_PRODUCTS: MarketplaceProductItem[] = [
  {
    id: 1,
    nama: "Pupuk Kompos Organik TPS 3R (5 kg)",
    slug: "pupuk-kompos-organik-5kg",
    kategori: "pupuk_kompos",
    harga: 25000,
    stok: 150,
    satuan: "sak",
    beratGram: 5000,
    deskripsi:
      "Pupuk organik kaya unsur hara makro & mikro hasil fermentasi sampah organik rumah tangga terpilah di TPS 3R Kalibaru. Menggemburkan tanah, menjaga kelembapan, dan menyuburkan tanaman bunga, buah, serta sayuran pekarangan.",
    foto: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80",
    aktif: true,
    tenantId: "tenant-pilot-upsheru",
  },
  {
    id: 2,
    nama: "Pupuk Kompos Super Curah (20 kg)",
    slug: "pupuk-kompos-super-20kg",
    kategori: "pupuk_kompos",
    harga: 75000,
    stok: 80,
    satuan: "sak",
    beratGram: 20000,
    deskripsi:
      "Kemasan curah hemat 20 kg untuk kebutuhan taman perumahan, penghijauan fasilitas umum, kebun sayur, dan paguyuban lingkungan RT/RW.",
    foto: "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80",
    aktif: true,
    tenantId: "tenant-pilot-upsheru",
  },
  {
    id: 3,
    nama: "Pupuk Organik Cair POC (1 Liter)",
    slug: "poc-nutrisi-tanaman-1l",
    kategori: "pupuk_cair",
    harga: 35000,
    stok: 100,
    satuan: "botol",
    beratGram: 1000,
    deskripsi:
      "Konsentrat nutrisi cair siap pakai hasil fermentasi mikroorganisme lokal (MOL). Mempercepat pertumbuhan tunas, menguatkan akar, dan mencegah kerontokan bunga.",
    foto: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80",
    aktif: true,
    tenantId: "tenant-pilot-upsheru",
  },
  {
    id: 4,
    nama: "Maggot BSF Kering Panggang (500 gr)",
    slug: "maggot-bsf-kering-500g",
    kategori: "maggot",
    harga: 45000,
    stok: 60,
    satuan: "pouch",
    beratGram: 500,
    deskripsi:
      "Pakan alternatif kaya protein tinggi (40-45%) untuk unggas, ikan hias, kura-kura, dan burung kicau. Bersih, higienis, dan tahan simpan lama.",
    foto: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
    aktif: true,
    tenantId: "tenant-pilot-upsheru",
  },
  {
    id: 5,
    nama: "Tempat Sampah Pilah 2 in 1 (40 Liter)",
    slug: "tempat-sampah-pilah-2in1",
    kategori: "tempat_sampah",
    harga: 85000,
    stok: 40,
    satuan: "set",
    beratGram: 3000,
    deskripsi:
      "Set dua tempat sampah bertutup (Organik & Anorganik) berbahan plastik tebal tahan panas dan hujan. Memudahkan pemilahan dari dapur dan teras rumah.",
    foto: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
    aktif: true,
    tenantId: "tenant-pilot-upsheru",
  },
  {
    id: 6,
    nama: "Kantong Sampah Biodegradable Ramah Lingkungan",
    slug: "kantong-sampah-biodegradable-roll",
    kategori: "kantong_sampah",
    harga: 20000,
    stok: 200,
    satuan: "roll",
    beratGram: 300,
    deskripsi:
      "Kantong sampah ramah lingkungan berbahan pati singkong (cassava bag) yang mudah terurai hayati di tanah dalam 3-6 bulan. Kapasitas 25 liter per lembar.",
    foto: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
    aktif: true,
    tenantId: "tenant-pilot-upsheru",
  },
];
