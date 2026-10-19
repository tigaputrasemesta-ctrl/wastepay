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
  intent: "MENU" | "TAGIHAN" | "JADWAL" | "KOMPLAIN" | "DAFTAR" | "ADMIN" | "COVERAGE" | "FAQ";
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
  const cleanSender = rawSender.replace(/\D/g, "");
  const rawMessage = String(payload.message || "").trim();
  const lowerMsg = rawMessage.toLowerCase();
  const mediaUrl = payload.url && typeof payload.url === "string" ? payload.url.trim() : undefined;

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

  // 2. Intent Parsing (Klasifikasi Kebutuhan)

  // Intent A: DAFTAR BARU
  if (
    lowerMsg === "daftar" ||
    lowerMsg === "registrasi" ||
    lowerMsg.includes("pasang baru") ||
    lowerMsg.includes("daftar baru") ||
    lowerMsg.includes("mau berlangganan")
  ) {
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
  if (
    lowerMsg.includes("coverage") ||
    lowerMsg.includes("jangkauan") ||
    lowerMsg.includes("area") ||
    lowerMsg.includes("wilayah") ||
    lowerMsg.includes("daerah") ||
    lowerMsg.includes("lokasi") ||
    lowerMsg.includes("bisa diangkut gak") ||
    lowerMsg.includes("melayani mana") ||
    lowerMsg.includes("apakah melayani")
  ) {
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
  if (
    lowerMsg === "4" ||
    lowerMsg === "admin" ||
    lowerMsg === "cs" ||
    lowerMsg === "operator" ||
    lowerMsg.includes("bicara dengan admin") ||
    lowerMsg.includes("hubungi admin") ||
    lowerMsg.includes("manusia")
  ) {
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
  if (
    lowerMsg === "2" ||
    lowerMsg === "jadwal" ||
    lowerMsg.includes("kapan diangkut") ||
    lowerMsg.includes("hari apa") ||
    lowerMsg.includes("jadwal angkut") ||
    lowerMsg.includes("jadwal sampah")
  ) {
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

  // Intent D: CEK TAGIHAN & PEMBAYARAN
  if (
    lowerMsg === "1" ||
    lowerMsg === "tagihan" ||
    lowerMsg === "bayar" ||
    lowerMsg === "iuran" ||
    lowerMsg === "invoice" ||
    lowerMsg.includes("cek tagihan") ||
    lowerMsg.includes("mau bayar") ||
    lowerMsg.includes("rekening") ||
    lowerMsg.includes("transfer")
  ) {
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

    // Ambil tagihan pelanggan
    const tagihanList = await prisma.tagihan.findMany({
      where: { pelangganId: pelanggan.id, deletedAt: null },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: 6,
    });

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
    const totalSemua = unpaid.reduce((sum, t) => sum + t.jumlah + (t.denda || 0), 0);
    const rincianTagihan = unpaid.map((t) => {
      const statusLabel = t.status === "tunggakan" ? "⚠️ (Menunggak)" : "⏳ (Berjalan)";
      return `• Periode *${t.bulan}/${t.tahun}*: ${formatRupiahSkylite(t.jumlah + (t.denda || 0))} ${statusLabel}`;
    });

    const reply = [
      `💳 *RINCIAN TAGIHAN RETRIBUSI SAMPAH*`,
      ``,
      `Halo ${sapaanNama},`,
      `Berikut rincian tagihan yang belum diselesaikan:`,
      ...rincianTagihan,
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

  // Intent E: PENGADUAN / KOMPLAIN SAMPAH
  const isKomplainTrigger =
    lowerMsg === "3" ||
    lowerMsg.startsWith("komplain") ||
    lowerMsg.startsWith("lapor") ||
    lowerMsg.startsWith("keluhan") ||
    lowerMsg.includes("belum diangkut") ||
    lowerMsg.includes("belum diambil") ||
    lowerMsg.includes("sampah menumpuk") ||
    lowerMsg.includes("sampah numpuk") ||
    lowerMsg.includes("terlewat");

  if (isKomplainTrigger) {
    if (!pelanggan) {
      const reply = [
        `Halo ${sapaanNama},`,
        ``,
        `Untuk menyampaikan keluhan/pengaduan layanan sampah, mohon sertakan informasi alamat lengkap dan nomor HP aktif.`,
        `Atau gunakan formulir pengaduan publik resmi kami di:`,
        `👉 *https://upsheru.com/pengaduan*`,
        ``,
        `Petugas kami akan segera menindaklanjuti laporan Anda.`,
      ].join("\n");
      return { reply, intent: "KOMPLAIN" };
    }

    // Jika pesan hanya sekadar "3" atau "komplain" tanpa isi
    if (lowerMsg === "3" || lowerMsg === "komplain" || lowerMsg === "lapor") {
      const reply = [
        `📢 *PUSAT PENGADUAN LAYANAN SAMPAH*`,
        ``,
        `Halo ${sapaanNama},`,
        `Silakan ketikkan detail kendala sampah Anda (misal: *"Sampah di depan rumah terlewat belum diangkut sejak kemarin"*).`,
        ``,
        `📸 Anda juga dapat melampirkan foto tumpukan sampah pada pesan WhatsApp ini agar petugas kami dapat menindaklanjuti dengan cepat.`,
      ].join("\n");
      return { reply, intent: "KOMPLAIN", pelangganId: pelanggan.id };
    }

    // Buat tiket komplain di database
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
      ].join("\n");
      kirimWhatsApp(adminPhone(), pesanAdmin).catch(() => {});
    }

    const reply = [
      `✅ *PENGADUAN BERHASIL DICATAT*`,
      ``,
      `Halo ${sapaanNama},`,
      `Laporan Anda telah resmi masuk ke sistem kami dengan nomor tiket:`,
      `🆔 *Tiket Pengaduan: #KMP-${komplain.id}*`,
      `📍 *Zona Wilayah:* ${namaZona}`,
      ``,
      `Petugas koordinator armada telah menerima laporan ini dan akan segera melakukan pengecekan ke lokasi.`,
      `Terima kasih atas kerja samanya menjaga lingkungan tetap bersih. 🙏`,
    ].join("\n");

    return {
      reply,
      intent: "KOMPLAIN",
      pelangganId: pelanggan.id,
      komplainId: komplain.id,
    };
  }

  // Intent F: MENU UTAMA / GREETING DEFAULT
  const reply = [
    `Halo ${sapaanNama}! 👋`,
    `Selamat datang di Layanan WhatsApp Otomatis *UPS HERU (WastePay Depok)*.`,
    ...(pelanggan ? [`📍 _Terdaftar: ${namaZona}_`] : []),
    ``,
    `Silakan pilih menu bantuan dengan membalas angka atau kata kunci:`,
    `1️⃣ *Cek Tagihan & Bayar Online* (Ketik: 1 / Tagihan)`,
    `2️⃣ *Jadwal Penjemputan Sampah* (Ketik: 2 / Jadwal)`,
    `3️⃣ *Lapor Sampah Belum Diangkut* (Ketik: 3 / Lapor)`,
    `4️⃣ *Bicara dengan Admin/CS* (Ketik: 4 / Admin)`,
    ``,
    `Atau akses langsung portal resmi kami di:`,
    `🌐 *https://upsheru.com*`,
  ].join("\n");

  return { reply, intent: "MENU", pelangganId: pelanggan?.id };
}
