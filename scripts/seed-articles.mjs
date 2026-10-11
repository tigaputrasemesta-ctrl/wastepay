import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Muat .env jika ada
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const pool = new Pool({
  connectionString,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ARTIKEL_LIST = [
  {
    slug: "jasa-buang-kasur-bekas-puing-sampah-besar-depok",
    judul: "Jasa Buang Kasur Bekas, Puing Bangunan, dan Ranting Pohon di Depok (Layanan Jemput Langsung)",
    kategori: "informasi",
    gambar: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    isi: `Pernahkah Anda bingung membuang kasur busa/springbed tua yang sudah kempes, sofa rusak, puing sisa renovasi rumah, atau tebangan dahan pohon besar di Depok? Masalah ini dialami ribuan warga perumahan setiap minggunya. Truk sampah keliling reguler biasanya menolak mengangkut sampah-sampah berukuran ekstra ini (bulky waste) karena keterbatasan kapasitas bak gerobak.

Akibatnya, barang-barang tersebut kerap menumpuk di depan pagar rumah, mengganggu estetika lingkungan, atau bahkan berakhir dibuang sembarangan di bantaran sungai yang melanggar hukum.

### Mengapa Sampah Besar Tidak Boleh Dibuang Sembarangan?
1. Penyumbatan Aliran Sungai: Kasur bekas dan ranting pohon menjadi penyebab nomor satu banjir di area rawan seperti Sawangan dan Cilodong.
2. Sanksi Tipiring & Denda: Pemerintah Kota Depok menerapkan denda bagi warga yang tertangkap tangan membuang sampah di tempat terlarang.
3. Sarang Hama & Hewan Berbisa: Tumpukan perabot dan puing menjadi sarang tikus, kecoak, serta ular.

### Solusi Praktis: Layanan Angkut Khusus Armada UPS HERU
UPS HERU menghadirkan layanan penjemputan khusus sampah besar (on-demand bulky waste pickup) untuk seluruh warga dan pengurus RT/RW di Kota Depok:

• Armada Fleksibel: Menyediakan armada dump truck dan pickup bak terbuka sesuai volume muatan puing atau kasur Anda.
• Petugas Angkut Profesional: Anda tidak perlu repot mengangkat barang berat; tim kami siap mengangkut langsung dari titik penjemputan.
• Pembuangan Resmi & Ramah Lingkungan: Puing dan kayu diproses di fasilitas TPS 3R dan TPA resmi tanpa mencemari lingkungan.
• Biaya Terjangkau & Transparan: Tarif disesuaikan dengan kapasitas muatan kendaraan tanpa pungli tersembunyi.

### Cara Memesan Layanan Jemput Sampah Besar di Depok
1. Foto barang/puing yang ingin dibuang.
2. Hubungi WhatsApp layanan pelanggan UPS HERU atau buka portal resmi upsheru.com.
3. Tentukan jadwal dan alamat penjemputan.
4. Tim armada kami akan meluncur ke lokasi sesuai waktu yang disepakati!

Hubungi UPS HERU sekarang untuk reservasi jadwal penjemputan sampah besar di rumah Anda!`
  },
  {
    slug: "aturan-denda-buang-sampah-sembarangan-kota-depok",
    judul: "Aturan & Denda Buang Sampah Sembarangan di Kota Depok (Perda Terbaru & Solusi Resmi TPS)",
    kategori: "edukasi",
    gambar: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    isi: `Kebersihan lingkungan di Kota Depok kini semakin diperketat dengan penegakan regulasi daerah. Mengetahui aturan pembuangan sampah bukan hanya kewajiban moral, tetapi juga langkah preventif agar warga dan pengurus lingkungan tidak terjerat sanksi pidana ringan maupun denda finansial.

Berdasarkan peraturan daerah (Perda) Kota Depok tentang Pengelolaan Sampah, setiap individu maupun badan usaha dilarang keras membuang sampah di sembarang tempat, jalan protokol, saluran air, atau tanah kosong milik pihak lain.

### Berapa Besaran Denda Buang Sampah Sembarangan di Depok?
Pemerintah Kota Depok bersama Satpol PP secara berkala menggelar operasi tangkap tangan (OTT) sampah liar. Sanksi yang dapat dikenakan meliputi:

• Denda Administratif: Denda uang tunai hingga jutaan rupiah sesuai tingkat pelanggaran.
• Sanksi Tipiring (Tindak Pidana Ringan): Sidang di tempat dengan ancaman kurungan penjara maksimal 3 bulan bagi pelaku pembuangan sampah liar berulang.
• Penyitaan KTP Sementara: Identitas pelanggar ditahan selama proses penegakan disiplin berlangsung.

### Solusi Bagi Pengurus RT/RW dan Perumahan
Banyak warga terpaksa membuang sampah sembarangan karena ketiadaan jadwal pengangkutan rutin dari dinas. Untuk mencegah tumpukan sampah liar di gerbang komplek, pengurus RT/RW dapat bermitra dengan TPS 3R UPS HERU:

1. Jadwal Pengangkutan Pasti: Penjemputan rutin 2–3 kali seminggu langsung dari tong sampah depan rumah warga.
2. Pemantauan GPS Armada Real-Time: Pengurus lingkungan bisa mengecek posisi truk secara live di peta digital situs upsheru.com.
3. Layanan Pembayaran Transparan: Tagihan retribusi bulanan dikirim otomatis via WhatsApp dan dapat dibayar dengan QRIS perbankan.

Mari wujudkan lingkungan Depok yang bersih, asri, dan tertib hukum bersama UPS HERU!`
  },
  {
    slug: "tarif-retribusi-sampah-rumah-tangga-depok-2026",
    judul: "Biaya Iuran & Tarif Retribusi Sampah Rumah Tangga di Depok 2026: Rincian Lengkap & Cara Bayar Online",
    kategori: "informasi",
    gambar: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    isi: `Bagi warga yang baru saja pindah rumah ke kawasan Kota Depok (seperti Cilodong, Kalibaru, Sukmajaya, Pancoran Mas, Tapos, hingga Sawangan), salah satu pertanyaan paling umum adalah: "Berapa biaya iuran sampah per bulan dan bagaimana cara membayarnya?"

Biaya retribusi sampah di Kota Depok bervariasi bergantung pada tipe hunian, volume timbulan sampah harian, dan pengelola lingkungan setempat.

### Rincian Kategori Tarif Retribusi Sampah UPS HERU
Sistem WastePay UPS HERU menerapkan skema tarif transparan dan berkeadilan:

• Paket Rumah Tangga Sederhana: Cocok untuk rumah kontrakan atau hunian tipe 21–36 dengan volume sampah standar harian.
• Paket Rumah Tangga Menengah & Mewah: Diperuntukkan bagi rumah tinggal keluarga berukuran sedang hingga besar dengan frekuensi angkut 2–3 kali per minggu.
• Paket Ruko & Usaha Kecil: Khusus unit usaha, kantor, atau laundry dengan kapasitas timbulan sampah lebih padat.
• Paket Komersial (Resto / Kafe): Pengangkutan harian dengan armada khusus.

### Mengapa Memilih Pembayaran Digital WastePay UPS HERU?
Zaman bayar iuran sampah dengan uang pas dan kupon kertas sudah berlalu. Bersama WastePay UPS HERU:

1. Tagihan Otomatis via WhatsApp: Notifikasi rincian tagihan dikirim langsung ke nomor ponsel kepala keluarga setiap bulan.
2. Dukungan Pembayaran QRIS Nasional: Cukup scan barcode dengan m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, OVO, Dana, ShopeePay).
3. Kwitansi Digital Resmi: Bukti lunas diterbitkan otomatis detik itu juga tanpa perlu menunggu petugas penagih.
4. Cek Tagihan Kapan Saja: Warga dapat mengecek riwayat pembayaran secara mandiri melalui menu "Cek Tagihan" di upsheru.com/bayar.

Daftarkan rumah atau komplek Anda sekarang untuk menikmati layanan kebersihan modern dan bebas repot!`
  },
  {
    slug: "jasa-angkut-sampah-harian-restoran-kafe-depok",
    judul: "Jasa Pengangkutan Sampah Harian untuk Restoran, Kafe, dan Usaha Kuliner di Depok",
    kategori: "berita",
    gambar: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    isi: `Industri kuliner dan kafe di kawasan Margonda Raya, Grand Depok City (GDC), dan Cinere berkembang sangat pesat. Namun, di balik ramainya pengunjung, pemilik restoran menghadapi tantangan operasional harian yang krusial: pengelolaan limbah sisa makanan (food waste) dan kemasan sekali pakai.

Sampah basah sisa dapur yang tidak diangkut setiap malam akan membusuk dalam hitungan jam, menimbulkan bau menyengat, serta mengundang kecoak dan lalat yang dapat merusak reputasi kebersihan restoran Anda di mata pelanggan.

### Keuntungan Memilih Vendor Sampah Resmi UPS HERU untuk Bisnis Anda
UPS HERU menawarkan kemitraan pengangkutan sampah komersial B2B terpercaya di Depok:

• Pengangkutan Rutin Setiap Malam: Armada kami menjemput limbah restoran setelah jam operasional tutup (pukul 21.00 – 00.00 WIB) sehingga area dapur selalu bersih menyambut hari baru.
• Armada Khusus Anti-Bocor: Truk dan pickup dilengkapi wadah kedap aroma untuk menjaga higienitas dan kenyamanan lingkungan sekitar ruko.
• Dokumen Legalitas & Surat Jalan Lengkap: Setiap pengangkutan dilengkapi surat jalan resmi yang membuktikan usaha Anda taat aturan AMDAL dan lingkungan hidup Kota Depok.
• Invoicing Bulanan B2B Terpadu: Manajemen penagihan rapi dengan faktur digital dan metode transfer rekening perusahaan.

### Komitmen Zero Waste & Daur Ulang Sisa Makanan
Limbah organik dari restoran mitra diolah kembali oleh fasilitas UPS HERU menjadi kompos organik dan budidaya maggot BSF (Black Soldier Fly), sehingga bisnis Anda turut berkontribusi dalam gerakan ekonomi sirkular ramah lingkungan.

Konsultasikan kebutuhan volume sampah restoran atau kafe Anda dengan tim UPS HERU sekarang juga!`
  },
  {
    slug: "daftar-sampah-daur-ulang-bernilai-uang-depok",
    judul: "Daftar Sampah Daur Ulang yang Bernilai Uang: Cara Pilah Sampah Rumah Tangga Jadi Rupiah di Depok",
    kategori: "edukasi",
    gambar: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    diterbitkan: true,
    isi: `Tahukah Anda bahwa hingga 40% isi tong sampah di rumah kita sebenarnya bernilai rupiah jika dipilah dengan benar? Memilah sampah anorganik bukan hanya membantu menyelamatkan TPA Cipayung dari kepunahan lahan, tetapi juga dapat menjadi sumber pemasukan tambahan bagi keluarga maupun kas RT/RW.

Berikut panduan jenis-jenis material sampah daur ulang yang memiliki nilai jual tinggi di pasaran daur ulang Kota Depok:

### 1. Kardus & Kertas Bekas
• Kardus Cokelat Tebal: Kardus paket e-commerce, kemasan TV/elektronik, dan kotak mie instan merupakan primadona daur ulang. Lipat dan ikat rapi agar bernilai maksimal.
• Kertas Duplex & Arsip Putih: Kertas HVS bekas print atau buku tulis bekas yang sudah tidak terpakai.

### 2. Plastik Kemasan & Botol (PET & HDPE)
• Botol Plastik Bening (PET / Kode 1): Botol air mineral, botol minuman soda. Tips: Remas botol hingga pipih dan kumpulkan tutupnya secara terpisah.
• Plastik Tutup Botol & Botol Sabun (HDPE / Kode 2): Botol sampo, wadah detergen cair, dan jeriken minyak. Material ini sangat kokoh dan diminati pabrik daur ulang.

### 3. Logam & Kaleng Minuman
• Kaleng Aluminium: Kaleng minuman bersoda dan minuman sarang burung. Sangat bernilai karena mudah dilebur kembali.
• Besi & Seng Tua: Panci rusak, paku bekas, atau kawat sisa bangunan.

### 4. Minyak Jelantah (Minyak Goreng Bekas)
Jangan pernah membuang minyak goreng bekas ke saluran wastafel karena akan membeku dan menyumbat pipa got perumahan! Kumpulkan minyak jelantah dalam jeriken tertutup; material ini kini laku dijual untuk bahan baku biodiesel ramah lingkungan.

### Dukungan Pemilahan Bersama UPS HERU
TPS 3R UPS HERU Kalibaru aktif mendampingi unit Bank Sampah di lingkungan RT/RW Kota Depok. Mari mulai pilah sampah Anda hari ini: organik jadi pupuk kompos, anorganik jadi tabungan rupiah, dan residu diangkut aman oleh armada UPS HERU!`
  }
];

async function main() {
  console.log("Memulai seeding artikel SEO Page One ke PostgreSQL/Supabase...");

  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["admin", "superadmin"] } },
    select: { id: true, nama: true },
  });

  for (const item of ARTIKEL_LIST) {
    const existing = await prisma.artikel.findUnique({
      where: { slug: item.slug },
    });

    if (existing) {
      await prisma.artikel.update({
        where: { slug: item.slug },
        data: {
          judul: item.judul,
          isi: item.isi,
          kategori: item.kategori,
          gambar: item.gambar,
          diterbitkan: item.diterbitkan,
          penulisId: adminUser?.id ?? null,
        },
      });
      console.log(`✓ Artikel diperbarui: ${item.judul}`);
    } else {
      await prisma.artikel.create({
        data: {
          ...item,
          penulisId: adminUser?.id ?? null,
        },
      });
      console.log(`+ Artikel dibuat: ${item.judul}`);
    }
  }

  console.log("Semua 5 artikel SEO berhasil dimasukkan!");
}

main()
  .catch((e) => {
    console.error("Error seeding artikel:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
