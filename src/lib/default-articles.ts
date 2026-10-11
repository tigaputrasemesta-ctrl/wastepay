/**
 * Data artikel & tips edukasi default untuk UPS HERU Kota Depok.
 * Berisi 5 artikel unggulan SEO Page 1 Google untuk menaikkan traffic organik warga Depok,
 * serta panduan edukasi operasional kebersihan.
 * Digunakan sebagai basis data publik dan fallback performa tinggi.
 */

export interface FallbackArticle {
  id: number;
  slug: string;
  judul: string;
  isi: string;
  kategori: "edukasi" | "informasi" | "berita" | "panduan" | string;
  gambar: string | null;
  diterbitkan: boolean;
  penulisNama: string;
  createdAt: Date;
}

export const DEFAULT_ARTIKEL: FallbackArticle[] = [
  {
    id: 1,
    slug: "jasa-buang-kasur-bekas-puing-sampah-besar-depok",
    judul: "Jasa Buang Kasur Bekas, Puing Bangunan & Ranting Pohon di Depok (Layanan Jemput Langsung)",
    kategori: "informasi",
    gambar: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Tim Lapangan UPS HERU",
    createdAt: new Date("2026-10-10T08:00:00Z"),
    isi: `Pernahkah Anda bingung membuang kasur busa atau springbed tua yang sudah rusak, sofa robek, puing sisa renovasi dinding rumah, atau dahan pohon besar hasil tebangan di Kota Depok?

Masalah ini dialami ribuan warga perumahan setiap minggunya. Truk dan gerobak sampah keliling harian biasanya menolak mengangkut sampah berukuran ekstra ini (*bulky waste*) karena keterbatasan kapasitas bak pengangkut. Akibatnya, barang-barang tersebut kerap menumpuk di depan pagar rumah, mengganggu estetika lingkungan, atau bahkan berakhir dibuang sembarangan di tepi jalan dan bantaran kali.

### Mengapa Sampah Besar Tidak Boleh Dibuang Sembarangan di Depok?
1. **Risiko Banjir & Penyumbatan Aliran Kali**: Kasur bekas dan ranting pohon menjadi penyebab utama tersumbatnya aliran sungai di area rawan seperti Sawangan, Cilodong, dan Pancoran Mas.
2. **Sanksi Tipiring & Denda Satpol PP**: Pemerintah Kota Depok menerapkan denda administratif dan pidana ringan bagi siapa saja yang tertangkap membuang sampah sembarangan.
3. **Sarang Hama & Binatang Berbisa**: Tumpukan sofa basah dan kayu lapuk cepat sekali menjadi sarang tikus, kecoak, serta ular berbisa di sekitar permukiman.

### Solusi Praktis: Jasa Angkut On-Demand Armada UPS HERU
UPS HERU menghadirkan layanan penjemputan khusus sampah besar (*bulky waste on-demand*) yang melayani seluruh kecamatan di Kota Depok:

• **Pilihan Armada Lengkap**: Dump truck dan pickup bak terbuka siap dikerahkan sesuai kubikasi sampah Anda.
• **Tenaga Angkut Profesional**: Anda tidak perlu repot mengangkat barang berat; petugas kami siap mengangkut langsung dari depan gerbang atau halaman rumah.
• **Pembuangan Resmi & Berizin**: Seluruh material diarahkan ke fasilitas TPS 3R Kalibaru dan pengolahan resmi tanpa mencemari alam.
• **Tarif Transparan Tanpa Pungli**: Biaya dihitung berdasarkan estimasi muatan armada, tanpa biaya tersembunyi.

### Cara Memesan Layanan Jemput Sampah Besar di Depok
1. Foto kasur, perabot, puing, atau tumpukan ranting yang ingin diangkut.
2. Buka situs resmi **upsheru.com** atau hubungi Customer Service UPS HERU via WhatsApp.
3. Petugas memberikan estimasi armada dan jadwal kedatangan.
4. Tim armada datang tepat waktu dan area rumah Anda kembali bersih rapi!

Jangan biarkan barang bekas merusak kenyamanan rumah Anda. Hubungi tim UPS HERU hari ini untuk jadwal jemput cepat!`,
  },
  {
    id: 2,
    slug: "aturan-denda-buang-sampah-sembarangan-kota-depok",
    judul: "Aturan & Denda Buang Sampah Sembarangan di Kota Depok (Perda Terbaru & Solusi Resmi)",
    kategori: "edukasi",
    gambar: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Divisi Regulasi UPS HERU",
    createdAt: new Date("2026-10-09T09:00:00Z"),
    isi: `Pemerintah Kota Depok semakin memperketat pengawasan terhadap kebersihan kota dan penertiban pembuangan sampah liar. Memahami regulasi daerah ini sangat penting bagi setiap warga dan pengurus RT/RW agar terhindar dari sanksi hukum dan denda finansial yang berat.

Berdasarkan Peraturan Daerah (Perda) Kota Depok tentang Pengelolaan Persampahan, setiap warga dilarang keras membuang sampah di jalan protokol, saluran drainase, sungai, jembatan, maupun tanah kosong tak berpenghuni.

### Besaran Denda & Sanksi Pelanggaran Sampah Liar di Depok
Satpol PP Kota Depok bersama dinas terkait secara rutin menggelar Operasi Tangkap Tangan (OTT) di titik-titik rawan:

• **Denda Administratif Uang Tunai**: Pelanggar dapat dikenakan denda hingga jutaan rupiah sesuai volume pelanggaran.
• **Sidang Tindak Pidana Ringan (Tipiring)**: Warga yang kedapatan membuang sampah sembarangan dapat langsung disidang di tempat dengan ancaman kurungan penjara maksimal 3 bulan.
• **Penyitaan KTP**: Identitas pelaku disita sementara hingga proses denda dan sidang diselesaikan secara resmi.

### Solusi Permanen untuk Pengurus RT/RW dan Kompleks Perumahan
Banyak warga nekat membuang sampah liar karena keterbatasan jadwal atau ketiadaan pengangkutan resmi di lingkungannya. Untuk mengatasi hal ini secara permanen, pengurus RT/RW dapat bermitra langsung dengan UPS HERU:

1. **Jadwal Pengangkutan Rutin Terjamin**: Armada UPS HERU menjemput sampah 2–3 kali per minggu langsung dari depan rumah warga.
2. **Pelacakan Armada Live GPS**: Pengurus dan warga dapat memantau posisi truk pengangkut secara real-time melalui peta digital di situs **upsheru.com**.
3. **Sistem Iuran Digital WastePay**: Penagihan iuran bulanan terintegrasi dengan pesan otomatis WhatsApp dan pembayaran instan via QRIS.

Ciptakan lingkungan rukun tetangga yang asri, bersih, dan bebas dari sanksi hukum bersama UPS HERU!`,
  },
  {
    id: 3,
    slug: "tarif-retribusi-sampah-rumah-tangga-depok-2026",
    judul: "Biaya Iuran & Tarif Retribusi Sampah Rumah Tangga Depok 2026: Rincian Lengkap & Bayar Online",
    kategori: "informasi",
    gambar: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Divisi Keuangan Digital WastePay",
    createdAt: new Date("2026-10-08T10:00:00Z"),
    isi: `Bagi Anda yang baru menempati hunian baru di kawasan Kota Depok (seperti Cilodong, Kalibaru, Sukmajaya, Pancoran Mas, Tapos, Beji, hingga Sawangan), pertanyaan yang paling sering dicari adalah: *"Berapa tarif retribusi sampah per bulan di Depok dan bagaimana cara membayarnya?"*

Biaya retribusi kebersihan di Kota Depok disesuaikan berdasarkan zonasi, tipe bangunan, serta volume sampah yang dihasilkan.

### Skema Kategori Tarif Pengangkutan UPS HERU
Melalui sistem digital terpadu WastePay, UPS HERU menawarkan tarif yang transparan dan kompetitif:

• **Paket Rumah Tangga Sederhana (Tipe 21–36)**: Cocok untuk rumah kontrakan atau keluarga kecil dengan volume timbulan sampah standar harian.
• **Paket Rumah Tangga Menengah & Besar (Tipe 45+)**: Dirancang untuk hunian keluarga aktif dengan frekuensi angkut 2–3 kali seminggu.
• **Paket Ruko & Usaha Mandiri**: Khusus untuk unit kantor, ruko perkantoran, toko kelontong, dan jasa laundry.
• **Paket Komersial & Kuliner**: Skema penjemputan harian khusus resto dan kafe berkapasitas besar.

### Keunggulan Pembayaran Digital via WastePay UPS HERU
Tinggalkan cara lama yang merepotkan dengan kupon kertas atau menunggu petugas datang menagih:

1. **Notifikasi WhatsApp Otomatis**: Setiap periode baru, rincian tagihan dikirim langsung ke WhatsApp kepala keluarga.
2. **Dukungan QRIS Terintegrasi**: Bayar cukup satu kali scan dengan m-Banking (BCA, Mandiri, BRI, BNI, BSI) maupun e-Wallet (GoPay, OVO, ShopeePay, DANA).
3. **Kwitansi Digital Instan**: Bukti pembayaran sah langsung terbit otomatis dan tersimpan rapi di sistem.
4. **Cek Tagihan Mandiri**: Warga dapat mengecek riwayat pembayaran kapan saja di menu **upsheru.com/bayar**.

Daftarkan perumahan Anda sekarang dan nikmati layanan kebersihan yang modern, transparan, dan terpercaya!`,
  },
  {
    id: 4,
    slug: "jasa-angkut-sampah-harian-restoran-kafe-depok",
    judul: "Jasa Pengangkutan Sampah Harian Restoran, Kafe & Bisnis Kuliner di Depok",
    kategori: "berita",
    gambar: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Unit Kemitraan Komersial UPS HERU",
    createdAt: new Date("2026-10-07T11:00:00Z"),
    isi: `Kawasan kuliner Kota Depok seperti Margonda Raya, Grand Depok City (GDC), Cinere, dan Juanda berkembang sangat pesat. Namun, para pengelola resto dan kafe menghadapi tantangan harian yang sama: **pengelolaan limbah sisa makanan (*food waste*) dan kemasan sekali pakai**.

Sampah basah sisa dapur yang tidak segera diangkut setiap malam akan membusuk hanya dalam beberapa jam, memicu bau menyengat, serta mengundang kecoak dan lalat yang membahayakan reputasi higienitas resto Anda di mata pengunjung.

### Mengapa Restoran di Depok Mempercayakan Pengangkutan ke UPS HERU?
UPS HERU menyediakan layanan kemitraan B2B resmi untuk sektor kuliner dan komersial di Depok:

• **Jadwal Pengangkutan Malam Hari**: Penjemputan dilakukan setelah jam operasional resto tutup (pukul 21.00 – 00.00 WIB) sehingga area dapur bersih siap pakai besok pagi.
• **Armada Kedap Bau & Anti-Bocor**: Truk dan pickup dirancang khusus dengan wadah tertutup agar tidak meneteskan air lindi di jalanan ruko.
• **Legalitas Lingkungan Hidup Lengkap**: Setiap pengangkutan dilengkapi manifest dan surat jalan resmi sebagai bukti kepatuhan AMDAL dan standar sanitasi Pemkot Depok.
• **Sistem Invoicing Bulanan Perusahaan**: Pembayaran praktis melalui transfer rekening koran bisnis dengan faktur pajak dan kuitansi resmi.

### Gerakan Zero Waste: Dari Sisa Makanan Jadi Kompos & Maggot BSF
Limbah organik restoran mitra diproses kembali di TPS 3R UPS HERU Kalibaru menjadi pupuk kompos bernutrisi tinggi dan pakan budidaya maggot BSF (*Black Soldier Fly*). Bisnis kuliner Anda secara langsung ikut berkontribusi dalam ekonomi sirkular hijau Depok.

Hubungi tim kemitraan komersial UPS HERU untuk survei lokasi dan uji coba layanan penjemputan gratis!`,
  },
  {
    id: 5,
    slug: "daftar-sampah-daur-ulang-bernilai-uang-depok",
    judul: "Daftar Sampah Daur Ulang Bernilai Uang: Cara Pilah Sampah Rumah Tangga Jadi Rupiah di Depok",
    kategori: "edukasi",
    gambar: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Bank Sampah & TPS 3R Kalibaru",
    createdAt: new Date("2026-10-06T12:00:00Z"),
    isi: `Tahukah Anda bahwa hampir 40% isi tong sampah di rumah kita sebenarnya memiliki nilai rupiah jika dipilah dengan benar? Memilah sampah anorganik bukan hanya membantu mengurangi beban TPA Cipayung, tetapi juga dapat menjadi sumber penghasilan tambahan bagi keluarga maupun kas tabungan RT/RW.

Berikut daftar jenis sampah bernilai ekonomi tinggi yang paling dicari oleh industri daur ulang di Kota Depok:

### 1. Kardus & Kertas Bekas
• **Kardus Cokelat Tebal**: Kardus paket belanja online, kardus mie instan, dan kardus perabot memiliki harga timbang paling stabil. Tips: Lipat pipih dan ikat dengan rapi.
• **Kertas Duplex & Arsip Putih**: Kertas HVS bekas kantor/skripsi, koran, dan buku tulis bekas.

### 2. Plastik Kemasan & Botol Minuman
• **Botol Plastik Bening (PET / Kode 1)**: Botol air mineral dan botol jus. Tips: Lepas tutupnya, injak botol hingga kempes untuk menghemat tempat.
• **Plastik Keras HDPE (Kode 2)**: Botol sampo, wadah sabun cuci piring, jeriken minyak, dan botol detergen cair. Material ini tebal dan bernilai tinggi bagi pabrik daur ulang plastik.

### 3. Kaleng Minuman & Logam
• **Kaleng Aluminium**: Kaleng minuman soda, minuman sarang burung, dan kaleng susu. Mudah didaur ulang dan bernilai tinggi per kilogramnya.
• **Besi Tua & Seng**: Panci rusak, paku bekas, atau potongan pagar besi.

### 4. Minyak Jelantah (Minyak Goreng Bekas)
Jangan buang minyak bekas menggoreng ke wastafel dapur karena akan membeku dan menyumbat pipa saluran air! Tampung minyak jelantah di jeriken bekas; minyak ini kini laku dijual untuk bahan baku biodiesel ramah lingkungan.

### Program Tabungan Bank Sampah UPS HERU
TPS 3R UPS HERU Kalibaru aktif mendampingi unit Bank Sampah di perumahan-perumahan Kota Depok. Pilah sampah Anda dari dapur:
• Organik diolah menjadi kompos tanaman.
• Anorganik disetorkan menjadi tabungan saldo rupiah.
• Residu tak terolah diangkut teratur oleh armada resmi UPS HERU!`,
  },
  {
    id: 6,
    slug: "panduan-memilah-sampah-rumah-tangga",
    judul: "Panduan Memilah Sampah Rumah Tangga: Langkah Menuju Depok Zero Waste",
    kategori: "edukasi",
    gambar: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Tim Edukasi UPS HERU",
    createdAt: new Date("2026-09-01T08:00:00Z"),
    isi: `Memilah sampah dari sumbernya merupakan langkah paling efektif untuk mengurangi volume sampah yang berakhir di TPA Cipayung. Di fasilitas UPS HERU (TPS 3R Kalibaru, Cilodong), sampah yang telah terpilah dapat langsung diolah dan didaur ulang secara optimal.

### 1. Sampah Organik (Mudah Terurai)
Contoh: Sisa sayuran, sisa makanan, kulit buah, daun kering, dan sisa bahan dapur.
Cara Penanganan: Pisahkan dalam wadah tertutup atau ember khusus. Sampah organik ini akan diproses di UPS HERU menjadi kompos berkualitas tinggi untuk penghijauan lingkungan.

### 2. Sampah Anorganik (Dapat Didaur Ulang)
Contoh: Botol plastik, kardus, kertas karton, gelas mineral, kaleng minuman, dan wadah kaca.
Cara Penanganan: Pastikan dalam kondisi bersih dan kering sebelum dimasukkan ke kantong terpisah. Hal ini mempermudah proses pemilahan lanjutan dan menjaga nilai ekonomis material.

### 3. Sampah Residu & B3
Contoh: Popok sekali pakai, tisu bekas, pecahan keramik, baterai bekas, dan kemasan berbahaya.
Cara Penanganan: Bungkus rapat secara terpisah agar aman bagi petugas saat penjemputan.

Dengan memilah sampah setiap hari, Anda telah berkontribusi nyata menjaga kebersihan lingkungan dan kelestarian Kota Depok.`,
  },
  {
    id: 7,
    slug: "jadwal-dan-alur-penjemputan-sampah-depok",
    judul: "Mengenal Jadwal & Alur Penjemputan Armada Sampah UPS HERU",
    kategori: "informasi",
    gambar: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Koordinator Lapangan",
    createdAt: new Date("2026-09-10T09:00:00Z"),
    isi: `Kepastian jadwal penjemputan adalah komitmen utama UPS HERU dalam melayani ribuan warga di berbagai wilayah Kota Depok. Kami mengintegrasikan armada truk dan pickup dengan teknologi pemantauan digital.

### 1. Pola Jadwal Penjemputan
Penjemputan sampah rumah tangga dilakukan secara rutin 2 hingga 3 kali dalam seminggu sesuai penetapan zona rute wilayah masing-masing (Senin/Rabu/Jumat atau Selasa/Kamis/Sabtu).

### 2. Jam Operasional Armada
Petugas armada mulai bergerak pukul 07.00 WIB hingga 17.00 WIB. Warga diimbau meletakkan wadah sampah di titik penjemputan depan rumah sebelum pukul 07.00 WIB.

### 3. Pantau Truk Secara Real-Time (Fitur Lacak Armada)
Kini Anda tidak perlu lagi menebak-nebak posisi truk sampah. Melalui menu "Lacak Armada" di situs upsheru.com, warga dapat melihat posisi GPS kendaraan pengangkut dan estimasi waktu kedatangan di area lingkungan Anda secara langsung.

### 4. Tanggap Pengaduan Cepat
Bila sampah di rumah Anda terlewat karena pintu pagar terkunci atau akses jalan tertutup, segera laporkan lewat menu "Pengaduan" dengan melampirkan foto lokasi agar tim reaksi cepat kami segera menindaklanjuti.`,
  },
  {
    id: 8,
    slug: "cara-bayar-retribusi-sampah-qris",
    judul: "Cara Cepat & Praktis Bayar Retribusi Sampah via QRIS WhatsApp",
    kategori: "panduan",
    gambar: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    penulisNama: "Divisi Keuangan Digital UPS HERU",
    createdAt: new Date("2026-09-18T10:00:00Z"),
    isi: `UPS HERU menghadirkan transformasi digital menyeluruh pada sistem pembayaran retribusi sampah di Kota Depok. Tidak perlu lagi repot menyiapkan uang tunai pas atau menunggu petugas penagih datang ke rumah.

### 1. Notifikasi Tagihan Otomatis via WhatsApp
Setiap awal siklus tagihan, warga terdaftar akan menerima pesan WhatsApp resmi berisi rincian periode retribusi, nomor pelanggan, dan nominal tagihan transparan tanpa biaya tersembunyi.

### 2. Bayar Sekali Scan dengan QRIS
Cukup klik tautan bayar atau scan barcode QRIS yang tercantum. Pembayaran dapat dilakukan melalui seluruh aplikasi mobile banking (BCA, Mandiri, BRI, BNI, BSI, dll) maupun dompet digital ternama (GoPay, OVO, Dana, ShopeePay, LinkAja).

### 3. Verifikasi Otomatis Tanpa Kirim Bukti Transfer
Sistem WastePay terhubung langsung secara real-time dengan payment gateway perbankan. Begitu pembayaran berhasil, status tagihan otomatis berubah menjadi "Lunas" dan kwitansi digital resmi langsung terbit seketika.

### 4. Cek Riwayat Tagihan Kapan Saja
Anda dapat memeriksa status tagihan dan mengunduh bukti bayar kapan saja melalui menu "Cek Tagihan" di upsheru.com dengan memasukkan nomor WhatsApp atau nomor pelanggan.`,
  },
];
