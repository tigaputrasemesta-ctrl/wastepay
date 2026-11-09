import { prisma } from "@/lib/prisma";
import { extractTail10Digits } from "@/lib/server/wastepay-backend-core-services";
import { formatRupiahSkylite, formatTanggalIndo } from "@/lib/invoice";
import { adminPhone, isWaEnabled, kirimWhatsApp } from "@/lib/wa";

export interface IncomingWaPayload {
  sender: string;
  message?: string;
  name?: string;
  url?: string; // foto bukti jika ada
}

export interface BotProcessResult {
  reply: string;
  intent: "MENU" | "TAGIHAN" | "JADWAL" | "KOMPLAIN" | "DAFTAR" | "ADMIN" | "COVERAGE" | "FAQ" | "CARA_BAYAR" | "NONE";
  pelangganId?: number;
  komplainId?: number;
}

/**
 * Memproses pesan WhatsApp masuk dari Webhook Fonnte (md.fonnte.com).
 * Menghasilkan jawaban cerdas otomatis berbasis data riil database WastePay.
 */
export async function processIncomingWaMessage(
  payload: IncomingWaPayload
): Promise<BotProcessResult> {
  const rawSender = String(payload.sender || "").trim();
  const baseSender = rawSender.split("@")[0].split(":")[0];
  const cleanSender = baseSender.replace(/\D/g, "");
  const rawMessage = String(payload.message || "").trim();
  const lowerMsg = rawMessage.toLowerCase();
  const strippedMsg = lowerMsg.replace(/[*_~`]/g, "").trim();
  const mediaUrl = payload.url && typeof payload.url === "string" ? payload.url.trim() : undefined;

  // Deteksi digit menu (mendukung format *1*, [1], (1), 1., 1)
  const menuDigitMatch = strippedMsg.match(/^[(\[]?([1-5])[)\]\.\s]*$/);
  const selectedDigit = menuDigitMatch ? menuDigitMatch[1] : null;

  // 1. Identifikasi Pelanggan via Nomor WhatsApp (toleran 08xx / 628xx / +628xx)
  const tail10 = extractTail10Digits(cleanSender);
  let pelanggan: any = null;

  if (tail10.length >= 8) {
    pelanggan = await prisma.pelanggan.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { noTelepon: cleanSender },
          { kodePelanggan: cleanSender },
          { noTelepon: { contains: tail10 } },
        ],
      },
      include: {
        kelurahan: true,
        wilayah: { include: { zona: true } },
        paket: true,
        jadwal: {
          where: { aktif: true },
          include: {
            rute: {
              include: { petugas: { select: { nama: true, noTelepon: true } } },
            },
          },
        },
      },
    });
  }

  const sapaanNama = pelanggan ? `*Bpk/Ibu ${pelanggan.nama}*` : payload.name ? `*Kak ${payload.name}*` : "*Bpk/Ibu*";
  const namaZona = pelanggan?.wilayah?.zona?.nama || pelanggan?.kelurahan?.nama || "Area Layanan Depok";

  // 1b. Penanganan khusus: Foto/Media tanpa teks / pesan singkat
  if (mediaUrl && (!lowerMsg || lowerMsg.length <= 3)) {
    if (pelanggan) {
      const activeKomplain = typeof prisma.komplain.findFirst === "function"
        ? await prisma.komplain.findFirst({
            where: {
              pelangganId: pelanggan.id,
              status: { in: ["baru", "proses"] },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: "desc" },
          })
        : null;

      if (activeKomplain) {
        if (!activeKomplain.foto && typeof prisma.komplain.update === "function") {
          await prisma.komplain.update({
            where: { id: activeKomplain.id },
            data: { foto: mediaUrl },
          });
        }
        const reply = [
          `📸 *FOTO BUKTI PENGADUAN DITERIMA*`,
          ``,
          `Halo ${sapaanNama},`,
          `Foto kondisi sampah Anda telah kami tambahkan ke tiket pengaduan aktif:`,
          `🆔 *Tiket: #KMP-${activeKomplain.id}*`,
          `📍 *Zona Wilayah:* ${namaZona}`,
          `Status: *${activeKomplain.status === "proses" ? "Sedang Ditindaklanjuti Armada Lapangan 🚛" : "Dalam Antrean Armada 📋"}*`,
          ``,
          `Petugas armada rute wilayah Anda sedang bergerak menangani. Terima kasih atas kerja samanya! 🙏`,
        ].join("\n");
        return { reply, intent: "KOMPLAIN", pelangganId: pelanggan.id, komplainId: activeKomplain.id };
      }

      const komplain = await prisma.komplain.create({
        data: {
          jenis: "sampah_menumpuk",
          deskripsi: "Laporan foto sampah via WhatsApp",
          foto: mediaUrl,
          status: "baru",
          pelangganId: pelanggan.id,
        },
      });

      if (isWaEnabled() && adminPhone()) {
        const pesanAdmin = [
          `🚨 *PENGADUAN FOTO SAMPAH (#KMP-${komplain.id})*`,
          `👤 Pelanggan: ${pelanggan.nama}`,
          `📱 Telp: ${pelanggan.noTelepon}`,
          `📍 Zona: ${namaZona}`,
          `🏠 Alamat: ${pelanggan.alamat}`,
          `📸 Media Foto: ${mediaUrl}`,
          `🌐 Link Web: https://upsheru.com/pengaduan`,
        ].join("\n");
        kirimWhatsApp(adminPhone(), pesanAdmin).catch(() => {});
      }

      const linkWebPengaduan = pelanggan.noTelepon
        ? `https://upsheru.com/pengaduan?kode=${pelanggan.noTelepon}`
        : `https://upsheru.com/pengaduan`;

      const reply = [
        `📸 *FOTO SAMPAH BERHASIL DILAPORKAN*`,
        ``,
        `Halo ${sapaanNama},`,
        `Foto kondisi sampah Anda telah kami terima dan tercatat di sistem:`,
        `🆔 *Tiket Pengaduan: #KMP-${komplain.id}*`,
        `📍 *Zona Wilayah:* ${namaZona}`,
        ``,
        `Petugas armada telah menerima laporan ini dan akan segera melakukan pengecekan ke lokasi.`,
        `👉 *${linkWebPengaduan}*`,
        ``,
        `Terima kasih telah membantu menjaga kebersihan lingkungan! 🙏`,
      ].join("\n");

      return { reply, intent: "KOMPLAIN", pelangganId: pelanggan.id, komplainId: komplain.id };
    } else {
      const reply = [
        `Halo! 👋 Kami telah menerima kiriman foto dari Anda.`,
        ``,
        `Nomor Anda belum terdaftar di sistem pelanggan kami. Silakan pilih menu bantuan:`,
        `1️⃣ *Cek Tagihan* (Ketik: 1 / Tagihan)`,
        `2️⃣ *Jadwal Pengangkutan* (Ketik: 2 / Jadwal)`,
        `3️⃣ *Form Pengaduan Sampah* (Akses: https://upsheru.com/pengaduan)`,
        `4️⃣ *Bicara dengan Admin/CS* (Ketik: 4 / Admin)`,
        `👉 Ketik *DAFTAR* untuk registrasi layanan angkut sampah rutin di rumah Anda.`,
      ].join("\n");
      return { reply, intent: "MENU" };
    }
  }

  // 2. Intent Parsing (Klasifikasi Kebutuhan)

  // Intent A: DAFTAR BARU
  const isDaftarTrigger =
    strippedMsg === "daftar" ||
    lowerMsg === "daftar" ||
    lowerMsg.startsWith("daftar ") ||
    lowerMsg.startsWith("daftar-") ||
    lowerMsg.includes("registrasi") ||
    lowerMsg.includes("pasang baru") ||
    lowerMsg.includes("daftar baru") ||
    lowerMsg.includes("mau langganan") ||
    lowerMsg.includes("mau berlangganan") ||
    lowerMsg.includes("cara daftar");

  if (isDaftarTrigger && !lowerMsg.includes("tagihan") && !lowerMsg.includes("jadwal")) {
    const reply = [
      `Halo ${sapaanNama}, selamat datang di layanan pengangkutan sampah resmi *UPS HERU Depok*! 🚛`,
      ``,
      `Untuk pendaftaran pelanggan baru, silakan isi formulir online cepat melalui tautan resmi kami:`,
      `👉 *https://upsheru.com/daftar*`,
      ``,
      `📋 *Keuntungan Berlangganan:*`,
      `• Pengangkutan terjadwal rutin langsung di depan rumah`,
      `• Pembayaran mudah via online (QRIS/VA/e-Wallet)`,
      `• Sistem pemantauan armada dan pelaporan komplain responsif`,
      ``,
      `Setelah mengisi form, petugas survei kami akan segera memverifikasi titik lokasi rumah Anda. Terima kasih! 🙏`,
    ].join("\n");

    return { reply, intent: "DAFTAR", pelangganId: pelanggan?.id };
  }

  // Intent: COVERAGE AREA / JANGKAUAN WILAYAH
  const isCoverageTrigger =
    strippedMsg === "coverage" ||
    lowerMsg === "coverage" ||
    lowerMsg.includes("coverage area") ||
    lowerMsg.includes("jangkauan") ||
    lowerMsg.includes("melayani mana") ||
    lowerMsg.includes("apakah melayani") ||
    lowerMsg.includes("bisa diangkut gak") ||
    lowerMsg.includes("bisa angkut gak") ||
    lowerMsg.includes("area layanan") ||
    lowerMsg.includes("wilayah layanan") ||
    lowerMsg.includes("cakupan area") ||
    lowerMsg.includes("cakupan wilayah") ||
    (lowerMsg.includes("area") && (lowerMsg.includes("mana") || lowerMsg.includes("bisa") || lowerMsg.includes("tercover") || lowerMsg.includes("masuk"))) ||
    (lowerMsg.includes("wilayah") && (lowerMsg.includes("mana") || lowerMsg.includes("bisa") || lowerMsg.includes("tercover") || lowerMsg.includes("masuk")));

  if (isCoverageTrigger) {
    const reply = [
      `📍 *WILAYAH JANGKAUAN LAYANAN (COVERAGE AREA) — UPS HERU DEPOK* 🚛`,
      ``,
      `Halo ${sapaanNama},`,
      `Saat ini armada UPS HERU aktif melayani pengangkutan sampah di wilayah *Kota Depok*, khususnya:`,
      ``,
      `🏙 *Kelurahan Utama Terlayani (Kecamatan Cilodong):*`,
      `• Kelurahan Kalibaru`,
      `• Kelurahan Kalimulya`,
      `• Kelurahan Cilodong`,
      `• Kelurahan Jatimulya`,
      ``,
      `🏘 *Blok & Zona Perumahan Aktif:*`,
      `• Blok Bawah Dmiles + SMP 6`,
      `• Blok H Puah & Blok Gg Niman`,
      `• Blok Bakung & Jl. Raya Bakung`,
      `• Blok Jalan Raya Cilodong`,
      `• Blok Kebon Duren & Kp Bulak`,
      `• Blok Sasak & Gg Umar`,
      `• Blok Setu + Rafael Pete`,
      `• Blok THR & YKP Kelapa`,
      ``,
      `🔍 *Lihat Peta Rute & Titik Live:*`,
      `👉 *https://upsheru.com/peta*`,
      ``,
      `Ingin mendaftar atau memastikan apakah rumah Anda terjangkau?`,
      `Ketik *DAFTAR* untuk registrasi online mandiri, atau ketik *ADMIN* untuk berbicara dengan tim survei kami. 🙏`,
    ].join("\n");

    return { reply, intent: "COVERAGE", pelangganId: pelanggan?.id };
  }

  // Intent B: BICARA DENGAN ADMIN / CS
  const isAdminTrigger =
    selectedDigit === "4" ||
    strippedMsg === "4" ||
    strippedMsg === "admin" ||
    strippedMsg === "cs" ||
    strippedMsg === "operator" ||
    lowerMsg.includes("bicara dengan admin") ||
    lowerMsg.includes("hubungi admin") ||
    lowerMsg.includes("manusia");

  if (isAdminTrigger) {
    const reply = [
      `Halo ${sapaanNama},`,
      ``,
      `Pesan Anda telah diteruskan ke tim *Helpdesk & Admin Pusat UPS HERU* 👨‍💼.`,
      `Petugas kami akan segera membaca dan merespons chat Anda pada jam operasional:`,
      `🕒 *Senin - Sabtu: 08.00 - 17.00 WIB*`,
      ``,
      `Silakan ketikkan pertanyaan atau keperluan Anda secara lengkap di bawah ini ya.`,
      `🌐 Portal Resmi: https://upsheru.com`,
    ].join("\n");

    return { reply, intent: "ADMIN", pelangganId: pelanggan?.id };
  }

  // Intent C: JADWAL PENGANGKUTAN
  const isJadwalTrigger =
    selectedDigit === "2" ||
    strippedMsg === "2" ||
    lowerMsg.includes("jadwal") ||
    lowerMsg.includes("kapan diangkut") ||
    lowerMsg.includes("kapan diambil") ||
    lowerMsg.includes("diambil kapan") ||
    lowerMsg.includes("diangkut kapan") ||
    lowerMsg.includes("hari apa") ||
    lowerMsg.includes("jadwal angkut") ||
    lowerMsg.includes("jadwal sampah");

  if (isJadwalTrigger) {
    if (!pelanggan) {
      const reply = [
        `Halo ${sapaanNama},`,
        ``,
        `Untuk mengecek jadwal penjemputan sampah, nomor WhatsApp Anda belum terdaftar di sistem kami.`,
        ``,
        `📍 Secara umum, penjemputan sampah UPS HERU beroperasi terjadwal di wilayah:`,
        `*Kalibaru, Kalimulya, Cilodong, dan sekitarnya (Kota Depok).*`,
        ``,
        `Ketik *DAFTAR* untuk registrasi rumah Anda, atau ketik *ADMIN* jika nomor Anda sudah terdaftar dengan nomor lain.`,
      ].join("\n");
      return { reply, intent: "JADWAL" };
    }

    const jadwalList = pelanggan.jadwal || [];
    if (jadwalList.length > 0) {
      const barisJadwal = jadwalList.map((j: any) => {
        const petugasNama = j.rute?.petugas?.nama ? ` (Petugas: ${j.rute.petugas.nama})` : "";
        const jamStr = j.jam ? ` [Pukul ${j.jam}]` : "";
        return `• *${j.hari}*${jamStr}${petugasNama}`;
      });

      const reply = [
        `📅 *JADWAL PENGANGKUTAN SAMPAH ANDA*`,
        ``,
        `Halo ${sapaanNama},`,
        `Berikut jadwal penjemputan armada untuk alamat Anda:`,
        `📍 *Wilayah / Zona:* ${namaZona}`,
        `🏠 *Alamat:* ${pelanggan.alamat}`,
        ``,
        `🚛 *Hari Penjemputan:*`,
        ...barisJadwal,
        ``,
        `Mohon letakkan sampah di tempat yang mudah dijangkau armada sebelum jadwal tiba ya. Terima kasih! 🙏`,
      ].join("\n");

      return { reply, intent: "JADWAL", pelangganId: pelanggan.id };
    } else {
      const reply = [
        `📅 *JADWAL PENGANGKUTAN SAMPAH*`,
        ``,
        `Halo ${sapaanNama},`,
        `Alamat Anda terdaftar di *${namaZona}*. Armada kami beroperasi secara berkala 2-3 kali seminggu untuk area ini.`,
        ``,
        `Jika ingin memastikan jadwal spesifik rute rumah Anda, ketik *ADMIN* untuk dibantu konfirmasi penugasan armada petugas.`,
      ].join("\n");

      return { reply, intent: "JADWAL", pelangganId: pelanggan.id };
    }
  }

  // Intent: TATACARA PEMBAYARAN QRIS & M-BANKING
  const cleanFormattedMsg = lowerMsg.replace(/[*_~`]/g, "").trim();
  const isCaraBayarTrigger =
    selectedDigit === "5" ||
    cleanFormattedMsg === "5" ||
    cleanFormattedMsg === "cara bayar" ||
    cleanFormattedMsg.startsWith("cara bayar") ||
    cleanFormattedMsg.includes("cara bayar") ||
    cleanFormattedMsg.includes("carabayar") ||
    cleanFormattedMsg.includes("cara pembayaran") ||
    cleanFormattedMsg.includes("tatacara bayar") ||
    cleanFormattedMsg.includes("tata cara bayar") ||
    cleanFormattedMsg.includes("tata cara pembayaran") ||
    cleanFormattedMsg.includes("tatacara pembayaran") ||
    cleanFormattedMsg.includes("panduan bayar") ||
    cleanFormattedMsg.includes("panduan pembayaran") ||
    cleanFormattedMsg.includes("tutorial bayar") ||
    cleanFormattedMsg.includes("tutorial pembayaran") ||
    cleanFormattedMsg.includes("cara qris") ||
    cleanFormattedMsg.includes("cara scan") ||
    cleanFormattedMsg.includes("panduan qris") ||
    cleanFormattedMsg.includes("tutorial qris") ||
    cleanFormattedMsg === "qris" ||
    cleanFormattedMsg === "cara transfer" ||
    cleanFormattedMsg === "cara tf" ||
    cleanFormattedMsg.includes("gimana bayar") ||
    cleanFormattedMsg.includes("bagaimana bayar") ||
    cleanFormattedMsg.includes("bayar qris");

  if (isCaraBayarTrigger) {
    let directInvoiceUrl: string | null = null;
    if (pelanggan?.id) {
      try {
        const unpaid = await prisma.tagihan.findFirst({
          where: {
            pelangganId: pelanggan.id,
            deletedAt: null,
            status: { in: ["belum_bayar", "tunggakan"] },
          },
          orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
          select: { noInvoice: true },
        });
        if (unpaid?.noInvoice) {
          directInvoiceUrl = `https://upsheru.com/bayar-tagihan?invoice=${encodeURIComponent(unpaid.noInvoice)}`;
        }
      } catch (e) {
        console.error("Gagal mengambil tagihan untuk cara bayar:", e);
      }
    }

    const paymentLinkStr = directInvoiceUrl || (pelanggan?.noTelepon
      ? `https://upsheru.com/bayar?kode=${pelanggan.noTelepon}`
      : `https://upsheru.com/bayar`);

    const reply = [
      `📱 *PANDUAN PRAKTIS CARA BAYAR VIA QRIS*`,
      ``,
      `Halo ${sapaanNama}! 👋`,
      `Pembayaran iuran sampah UPS HERU dapat dilakukan menggunakan *seluruh aplikasi m-Banking* (BCA, Mandiri Livin', BRImo, BNI, Seabank, Jago, dll.) atau *Dompet Digital* (GoPay, OVO, DANA, ShopeePay).`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `▶️ *CARA 1: Bayar Langsung dari 1 HP (Upload Galeri)*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `1️⃣ Buka link tagihan Anda:`,
      `   👉 *${paymentLinkStr}*`,
      `2️⃣ Saat kode QRIS muncul di layar, ambil *Screenshot (Tangkapan Layar)* kode QR tersebut.`,
      `3️⃣ Buka aplikasi m-Banking atau E-Wallet Anda.`,
      `4️⃣ Pilih menu *QRIS / Bayar / Scan*.`,
      `5️⃣ Tekan ikon *Galeri / Foto* (biasanya di samping tombol bidik kamera atau pojok atas layar).`,
      `6️⃣ Pilih gambar hasil *Screenshot* kode QRIS tadi.`,
      `7️⃣ Periksa nama penerima (*UPS HERU*), lalu masukkan PIN Anda.`,
      `8️⃣ *SELESAI!* Sistem otomatis LUNAS dalam hitungan detik tanpa perlu konfirmasi manual.`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `▶️ *CARA 2: Scan Menggunakan HP Lain / Laptop*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `1️⃣ Buka link tagihan di HP keluarga atau laptop/komputer.`,
      `2️⃣ Buka aplikasi m-Banking / E-Wallet di HP Anda, buka menu *Scan QRIS*.`,
      `3️⃣ Arahkan kamera HP ke kode QRIS di layar.`,
      `4️⃣ Masukkan PIN Anda dan pembayaran selesai.`,
      ``,
      `📢 Jika mengalami kendala teknis saat pembayaran, silakan hubungi kami di:`,
      `👉 https://upsheru.com/pengaduan`,
    ].join("\n");

    return { reply, intent: "CARA_BAYAR", pelangganId: pelanggan?.id };
  }

  // Intent E: PENGADUAN / KOMPLAIN SAMPAH (Diprioritaskan sebelum tagihan agar komplain warga tidak keliru dianggap cek tagihan)
  const isKomplainTrigger =
    !isJadwalTrigger && (
      selectedDigit === "3" ||
      strippedMsg === "3" ||
      lowerMsg.startsWith("komplain") ||
      lowerMsg.includes("komplain") ||
      lowerMsg.includes("komplen") ||
      lowerMsg.startsWith("lapor") ||
      lowerMsg.includes("lapor") ||
      lowerMsg.startsWith("pengaduan") ||
      lowerMsg.includes("pengaduan") ||
      lowerMsg.startsWith("keluhan") ||
      lowerMsg.includes("keluhan") ||
      lowerMsg.includes("belum diangkut") ||
      lowerMsg.includes("blm diangkut") ||
      lowerMsg.includes("belum di angkut") ||
      lowerMsg.includes("blm di angkut") ||
      lowerMsg.includes("tidak diangkut") ||
      lowerMsg.includes("gak diangkut") ||
      lowerMsg.includes("ga diangkut") ||
      lowerMsg.includes("belum diambil") ||
      lowerMsg.includes("blm diambil") ||
      lowerMsg.includes("belum di ambil") ||
      lowerMsg.includes("blm di ambil") ||
      lowerMsg.includes("tidak diambil") ||
      lowerMsg.includes("gak diambil") ||
      lowerMsg.includes("ga diambil") ||
      lowerMsg.includes("sampah menumpuk") ||
      lowerMsg.includes("sampah numpuk") ||
      lowerMsg.includes("numpuk") ||
      lowerMsg.includes("menumpuk") ||
      lowerMsg.includes("terlewat") ||
      lowerMsg.includes("bau busuk") ||
      lowerMsg.includes("bau bgt")
    );

  if (isKomplainTrigger) {
    const linkWebPengaduan = pelanggan?.noTelepon
      ? `https://upsheru.com/pengaduan?kode=${pelanggan.noTelepon}`
      : `https://upsheru.com/pengaduan`;

    // Jika pesan hanya pemicu menu (3 / lapor / komplain / pengaduan / keluhan)
    const isSimpleTrigger =
      selectedDigit === "3" ||
      strippedMsg === "3" ||
      strippedMsg === "komplain" ||
      strippedMsg === "komplen" ||
      strippedMsg === "lapor" ||
      strippedMsg === "pengaduan" ||
      strippedMsg === "keluhan" ||
      strippedMsg === "laporan";

    if (isSimpleTrigger || !pelanggan) {
      const reply = [
        `📢 *PUSAT PENGADUAN LAYANAN SAMPAH — UPS HERU* 🚛`,
        ``,
        `Halo ${sapaanNama},`,
        ``,
        `Untuk menyampaikan laporan sampah belum diangkut, sampah menumpuk, atau kendala layanan lainnya, silakan isi formulir pengaduan online resmi kami di:`,
        `👉 *${linkWebPengaduan}*`,
        ``,
        `✨ *Keunggulan Pengaduan Online di Website:*`,
        `• Laporan otomatis terhubung langsung ke tablet navigasi petugas armada yang bertugas hari ini`,
        `• Dapat melampirkan foto bukti kondisi sampah di lokasi`,
        `• Memperoleh nomor tiket resmi untuk memantau status penanganan secara real-time`,
        ``,
        `Silakan klik link di atas untuk menyampaikan laporan Anda. Tim kami siap segera menindaklanjuti ke lokasi. Terima kasih! 🙏`,
      ].join("\n");
      return { reply, intent: "KOMPLAIN", pelangganId: pelanggan?.id };
    }

    // Cek apakah ada komplain aktif dalam 24 jam terakhir (deduplikasi anti-spam / retry)
    const activeKomplain = typeof prisma.komplain.findFirst === "function"
      ? await prisma.komplain.findFirst({
          where: {
            pelangganId: pelanggan.id,
            status: { in: ["baru", "proses"] },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

    if (activeKomplain) {
      if (mediaUrl && !activeKomplain.foto && typeof prisma.komplain.update === "function") {
        await prisma.komplain.update({
          where: { id: activeKomplain.id },
          data: { foto: mediaUrl },
        });
      }

      const statusDesc = activeKomplain.status === "proses"
        ? "Sedang Ditindaklanjuti Armada Lapangan 🚛"
        : "Menunggu Penjadwalan Armada Lapangan 📋";

      const reply = [
        `ℹ️ *LAPORAN ANDA SEDANG DALAM PROSES*`,
        ``,
        `Halo ${sapaanNama},`,
        `Laporan kendala sampah Anda sebelumnya telah tercatat dan sedang dalam penanganan armada:`,
        `🆔 *Tiket: #KMP-${activeKomplain.id}*`,
        `📍 *Zona Wilayah:* ${namaZona}`,
        `Status: *${statusDesc}*`,
        ``,
        `Petugas rute wilayah kami telah menerima informasi ini dan sedang bergerak menuju lokasi. Anda tidak perlu membuat tiket baru ya.`,
        ``,
        `📋 Pantau status penanganan:`,
        `👉 *${linkWebPengaduan}*`,
        ``,
        `Terima kasih atas kesabarannya! 🙏`,
      ].join("\n");

      return {
        reply,
        intent: "KOMPLAIN",
        pelangganId: pelanggan.id,
        komplainId: activeKomplain.id,
      };
    }

    // Jika pelanggan mengetikkan pesan kendala lengkap langsung di WhatsApp:
    // Tetap catat tiket di database agar tidak ada laporan warga yang tercecer
    const jenis =
      lowerMsg.includes("numpuk") || lowerMsg.includes("menumpuk")
        ? "sampah_menumpuk"
        : "tidak_diangkut";

    const komplain = await prisma.komplain.create({
      data: {
        jenis,
        deskripsi: rawMessage,
        foto: mediaUrl || null,
        status: "baru",
        pelangganId: pelanggan.id,
      },
    });

    // Teruskan notifikasi pengaduan ke nomor WA admin bila terkonfigurasi
    if (isWaEnabled() && adminPhone()) {
      const pesanAdmin = [
        `🚨 *PENGADUAN BARU (#KMP-${komplain.id})*`,
        `👤 Pelanggan: ${pelanggan.nama}`,
        `📱 Telp: ${pelanggan.noTelepon}`,
        `📍 Zona: ${namaZona}`,
        `🏠 Alamat: ${pelanggan.alamat}`,
        `📝 Isi: ${rawMessage.slice(0, 200)}`,
        `🌐 Link Web: https://upsheru.com/pengaduan`,
      ].join("\n");
      kirimWhatsApp(adminPhone(), pesanAdmin).catch(() => {});
    }

    const reply = [
      `✅ *PENGADUAN BERHASIL DICATAT*`,
      ``,
      `Halo ${sapaanNama},`,
      `Laporan Anda telah tercatat di sistem dengan nomor tiket:`,
      `🆔 *Tiket Pengaduan: #KMP-${komplain.id}*`,
      `📍 *Zona Wilayah:* ${namaZona}`,
      ``,
      `📋 Untuk melampirkan foto bukti sampah atau memantau status penanganan armada, silakan buka link pengaduan online:`,
      `👉 *${linkWebPengaduan}*`,
      ``,
      `Petugas armada telah menerima laporan ini dan akan segera melakukan pengecekan ke lokasi. Terima kasih atas kerja samanya! 🙏`,
    ].join("\n");

    return {
      reply,
      intent: "KOMPLAIN",
      pelangganId: pelanggan.id,
      komplainId: komplain.id,
    };
  }

  // Intent D: CEK TAGIHAN & PEMBAYARAN
  const isTagihanTrigger =
    selectedDigit === "1" ||
    strippedMsg === "1" ||
    lowerMsg.includes("tagihan") ||
    lowerMsg.includes("bayar") ||
    lowerMsg.includes("iuran") ||
    lowerMsg.includes("invoice") ||
    lowerMsg.includes("rekening") ||
    lowerMsg.includes("transfer");

  if (isTagihanTrigger) {
    if (!pelanggan) {
      const reply = [
        `Halo ${sapaanNama},`,
        ``,
        `Nomor WhatsApp Anda belum terdaftar di sistem kami. Untuk mengecek dan membayar tagihan secara mandiri, silakan akses portal pembayaran resmi:`,
        `👉 *https://upsheru.com/bayar*`,
        ``,
        `Masukkan nomor WhatsApp atau kode pelanggan Anda pada halaman tersebut untuk melihat rincian tagihan.`,
      ].join("\n");
      return { reply, intent: "TAGIHAN" };
    }

    // Read all invoices so old arrears cannot disappear behind a recent-page limit.
    const tagihanList = await prisma.tagihan.findMany({
      where: { pelangganId: pelanggan.id, deletedAt: null },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      select: { id: true, bulan: true, tahun: true, jumlah: true, status: true },
    });

    // Jika belum pernah ada tagihan yang diterbitkan (misal calon pelanggan / pendaftar baru)
    if (tagihanList.length === 0) {
      const isCalon = pelanggan.status === "calon";
      const reply = [
        `📋 *INFORMASI STATUS PELANGGAN*`,
        ``,
        `Halo ${sapaanNama},`,
        isCalon
          ? `Status pendaftaran akun Anda saat ini masih dalam tahap *Verifikasi / Calon Pelanggan* dan belum ada tagihan iuran yang diterbitkan.`
          : `Saat ini belum ada tagihan iuran yang diterbitkan untuk akun Anda.`,
        ``,
        `ID Pelanggan: *${pelanggan.kodePelanggan || pelanggan.noTelepon}*`,
        `Zona: *${namaZona}*`,
        ``,
        `💡 _Untuk konfirmasi aktivasi layanan pengangkutan sampah atau jadwal survei, silakan balas pesan ini dengan mengetik *ADMIN*._ 🙏`,
        `🌐 Portal: https://upsheru.com/bayar?kode=${pelanggan.noTelepon}`,
      ].join("\n");

      return { reply, intent: "TAGIHAN", pelangganId: pelanggan.id };
    }

    const unpaid = tagihanList.filter(
      (t) => t.status === "belum_bayar" || t.status === "tunggakan"
    );

    if (unpaid.length === 0) {
      const reply = [
        `✅ *TAGIHAN ANDA LUNAS*`,
        ``,
        `Halo ${sapaanNama},`,
        `Alhamdulillah, saat ini seluruh tagihan iuran sampah Anda sudah *LUNAS*! 🎉`,
        ``,
        `ID Pelanggan: *${pelanggan.kodePelanggan || pelanggan.noTelepon}*`,
        `Zona: *${namaZona}*`,
        ``,
        `Terima kasih atas partisipasi aktif Anda dalam menjaga kebersihan lingkungan bersama UPS HERU. 🙏`,
        `🌐 Portal: https://upsheru.com/bayar?kode=${pelanggan.noTelepon}`,
      ].join("\n");

      return { reply, intent: "TAGIHAN", pelangganId: pelanggan.id };
    }

    // Ada tagihan yang belum dibayar
    const totalSemua = unpaid.reduce((sum, t) => sum + t.jumlah, 0);
    const rincianTagihan = unpaid.slice(0, 6).map((t) => {
      const statusLabel = t.status === "tunggakan" ? "⚠️ (Menunggak)" : "⏳ (Berjalan)";
      return `• Periode *${t.bulan}/${t.tahun}*: ${formatRupiahSkylite(t.jumlah)} ${statusLabel}`;
    });

    const reply = [
      `💳 *RINCIAN TAGIHAN RETRIBUSI SAMPAH*`,
      ``,
      `Halo ${sapaanNama},`,
      `Berikut rincian tagihan yang belum diselesaikan:`,
      ...rincianTagihan,
      ...(unpaid.length > 6 ? [`• ${unpaid.length - 6} periode lainnya; seluruh periode tercakup dalam total.`] : []),
      `----------------------------------`,
      `*Total yang Harus Dibayar: ${formatRupiahSkylite(totalSemua)}*`,
      ``,
      `💳 *Bayar Online Otomatis (QRIS / VA / e-Wallet):*`,
      `👉 *https://upsheru.com/bayar?kode=${pelanggan.noTelepon}*`,
      ``,
      `💡 _Pembayaran melalui link di atas langsung terverifikasi otomatis oleh sistem dalam hitungan detik tanpa perlu konfirmasi manual._`,
    ].join("\n");

    return { reply, intent: "TAGIHAN", pelangganId: pelanggan.id };
  }

  // Intent F: MENU UTAMA / BANTUAN SPESIFIK
  // Hanya membalas jika pengguna secara eksplisit meminta panduan / menu / salam
  const isMenuTrigger =
    strippedMsg === "menu" ||
    strippedMsg === "#menu" ||
    strippedMsg === "/menu" ||
    strippedMsg === "/help" ||
    strippedMsg === "/start" ||
    strippedMsg === "bantuan" ||
    strippedMsg === "help" ||
    strippedMsg === "panduan" ||
    strippedMsg === "info" ||
    strippedMsg === "pilihan" ||
    strippedMsg === "halo" ||
    strippedMsg === "halo bot" ||
    strippedMsg === "hai" ||
    strippedMsg === "hello" ||
    strippedMsg.startsWith("halo ") ||
    strippedMsg.startsWith("hai ");

  if (isMenuTrigger) {
    const reply = [
      `Halo ${sapaanNama}! 👋`,
      `Selamat datang di Layanan WhatsApp Otomatis *UPS HERU (WastePay Depok)*.`,
      ...(pelanggan ? [`📍 _Terdaftar: ${namaZona}_`] : []),
      ``,
      `Silakan pilih menu bantuan dengan membalas angka atau kata kunci:`,
      `1️⃣ *Cek Tagihan & Bayar Online* (Ketik: 1 / Tagihan)`,
      `2️⃣ *Jadwal Penjemputan Sampah* (Ketik: 2 / Jadwal)`,
      `3️⃣ *Pusat Pengaduan / Lapor Sampah* (Akses: https://upsheru.com/pengaduan)`,
      `4️⃣ *Bicara dengan Admin/CS* (Ketik: 4 / Admin)`,
      `5️⃣ *Panduan Cara Bayar QRIS* (Ketik: 5 / Cara Bayar)`,
      ``,
      `Atau akses langsung portal resmi kami di:`,
      `🌐 *https://upsheru.com*`,
    ].join("\n");

    return { reply, intent: "MENU", pelangganId: pelanggan?.id };
  }

  // Pesan obrolan biasa / non-keyword: Diam (silent fallback)
  // Menghindari bot menyela obrolan atau memunculkan saran berulang-ulang saat warga sedang chat santai / chat dengan CS
  return { reply: "", intent: "NONE", pelangganId: pelanggan?.id };
}
