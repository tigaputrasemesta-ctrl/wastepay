/**
 * Data artikel & tips edukasi default untuk UPS HERU Kota Depok.
 * Digunakan sebagai fallback edukatif saat database belum memiliki artikel publikasi
 * agar landing page dan halaman /artikel tetap informatif, berwibawa, dan bernilai SEO tinggi.
 */

export interface FallbackArticle {
  id: number;
  slug: string;
  judul: string;
  isi: string;
  kategori: "edukasi" | "informasi" | "panduan";
  gambar: string | null;
  diterbitkan: boolean;
  penulisNama: string;
  createdAt: Date;
}

export const DEFAULT_ARTIKEL: FallbackArticle[] = [
  {
    id: 101,
    slug: "panduan-memilah-sampah-rumah-tangga",
    judul: "Panduan Memilah Sampah Rumah Tangga: Langkah Menuju Depok Zero Waste",
    isi: `Memilah sampah dari sumbernya merupakan langkah paling efektif untuk mengurangi volume sampah yang berakhir di TPA Cipayung. Di fasilitas UPS HERU (TPS 3R Kalibaru, Cilodong), sampah yang telah terpilah dapat langsung diolah dan didaur ulang secara optimal.

1. Sampah Organik (Mudah Terurai)
Contoh: Sisa sayuran, sisa makanan, kulit buah, daun kering, dan sisa bahan dapur.
Cara Penanganan: Pisahkan dalam wadah tertutup atau ember khusus. Sampah organik ini akan diproses di UPS HERU menjadi kompos berkualitas tinggi untuk penghijauan lingkungan.

2. Sampah Anorganik (Dapat Didaur Ulang)
Contoh: Botol plastik, kardus, kertas karton, gelas mineral, kaleng minuman, dan wadah kaca.
Cara Penanganan: Pastikan dalam kondisi bersih dan kering sebelum dimasukkan ke kantong terpisah. Hal ini mempermudah proses pemilahan lanjutan dan menjaga nilai ekonomis material.

3. Sampah Residu & B3
Contoh: Popok sekali pakai, tisu bekas, pecahan keramik, baterai bekas, dan kemasan berbahaya.
Cara Penanganan: Bungkus rapat secara terpisah agar aman bagi petugas saat penjemputan.

Dengan memilah sampah setiap hari, Anda telah berkontribusi nyata menjaga kebersihan lingkungan dan kelestarian Kota Depok.`,
    kategori: "edukasi",
    gambar: null,
    diterbitkan: true,
    penulisNama: "Tim Edukasi UPS HERU",
    createdAt: new Date("2026-09-01T08:00:00Z"),
  },
  {
    id: 102,
    slug: "jadwal-dan-alur-penjemputan-sampah-depok",
    judul: "Mengenal Jadwal & Alur Penjemputan Armada Sampah UPS HERU",
    isi: `Kepastian jadwal penjemputan adalah komitmen utama UPS HERU dalam melayani ribuan warga di berbagai wilayah Kota Depok. Kami mengintegrasikan armada truk dan pickup dengan teknologi pemantauan digital.

1. Pola Jadwal Penjemputan
Penjemputan sampah rumah tangga dilakukan secara rutin 2 hingga 3 kali dalam seminggu sesuai penetapan zona rute wilayah masing-masing (Senin/Rabu/Jumat atau Selasa/Kamis/Sabtu).

2. Jam Operasional Armada
Petugas armada mulai bergerak pukul 07.00 WIB hingga 17.00 WIB. Warga diimbau meletakkan wadah sampah di titik penjemputan depan rumah sebelum pukul 07.00 WIB.

3. Pantau Truk Secara Real-Time (Fitur Lacak Armada)
Kini Anda tidak perlu lagi menebak-nebak posisi truk sampah. Melalui menu "Lacak Armada" di situs upsheru.com, warga dapat melihat posisi GPS kendaraan pengangkut dan estimasi waktu kedatangan di area lingkungan Anda secara langsung.

4. Tanggap Pengaduan Cepat
Bila sampah di rumah Anda terlewat karena pintu pagar terkunci atau akses jalan tertutup, segera laporkan lewat menu "Pengaduan" dengan melampirkan foto lokasi agar tim reaksi cepat kami segera menindaklanjuti.`,
    kategori: "informasi",
    gambar: null,
    diterbitkan: true,
    penulisNama: "Koordinator Operasional Lapangan",
    createdAt: new Date("2026-09-10T09:00:00Z"),
  },
  {
    id: 103,
    slug: "cara-bayar-retribusi-sampah-qris",
    judul: "Cara Cepat & Praktis Bayar Retribusi Sampah via QRIS WhatsApp",
    isi: `UPS HERU menghadirkan transformasi digital menyeluruh pada sistem pembayaran retribusi sampah di Kota Depok. Tidak perlu lagi repot menyiapkan uang tunai pas atau menunggu petugas penagih datang ke rumah.

1. Notifikasi Tagihan Otomatis via WhatsApp
Setiap awal siklus tagihan, warga terdaftar akan menerima pesan WhatsApp resmi berisi rincian periode retribusi, nomor pelanggan, dan nominal tagihan transparan tanpa biaya tersembunyi.

2. Bayar Sekali Scan dengan QRIS
Cukup klik tautan bayar atau scan barcode QRIS yang tercantum. Pembayaran dapat dilakukan melalui seluruh aplikasi mobile banking (BCA, Mandiri, BRI, BNI, BSI, dll) maupun dompet digital ternama (GoPay, OVO, Dana, ShopeePay, LinkAja).

3. Verifikasi Otomatis Tanpa Kirim Bukti Transfer
Sistem WastePay terhubung langsung secara real-time dengan payment gateway perbankan. Begitu pembayaran berhasil, status tagihan otomatis berubah menjadi "Lunas" dan kwitansi digital resmi langsung terbit seketika.

4. Cek Riwayat Tagihan Kapan Saja
Anda dapat memeriksa status tagihan dan mengunduh bukti bayar kapan saja melalui menu "Cek Tagihan" di upsheru.com dengan memasukkan nomor WhatsApp atau nomor pelanggan.`,
    kategori: "panduan",
    gambar: null,
    diterbitkan: true,
    penulisNama: "Divisi Keuangan Digital UPS HERU",
    createdAt: new Date("2026-09-18T10:00:00Z"),
  },
];
