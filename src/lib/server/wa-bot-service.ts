import { prisma } from "@/lib/prisma";
import { extractTail10Digits } from "@/lib/server/wastepay-backend-core-services";
import { formatRupiahSkylite, formatTanggalIndo, BULAN_INDO } from "@/lib/invoice";
import { adminPhone, isWaEnabled, kirimWhatsApp } from "@/lib/wa";
import {
  isTakeoverActive,
  setTakeover,
  releaseTakeover,
  shouldSendFullMenu,
  recordFullMenuSent,
} from "@/lib/server/wa-takeover-service";

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
 * Mendeteksi nama/angka bulan dari teks pesan WhatsApp (misal: "cetak qris november", "bulan 10", "bulan ini").
 */
export function extractTargetMonth(text: string): { bulan: number; tahun?: number; isBulanIni?: boolean } | null {
  const t = text.toLowerCase();
  const now = new Date();

  if (t.includes("bulan ini") || t.includes("bln ini") || t.includes("tagihan ini")) {
    return { bulan: now.getMonth() + 1, tahun: now.getFullYear(), isBulanIni: true };
  }

  if (t.includes("bulan lalu") || t.includes("bln lalu")) {
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { bulan: prevMonth, tahun: prevYear };
  }

  const monthRegexes: Array<{ bulan: number; regex: RegExp }> = [
    { bulan: 1, regex: /\b(januari|jan|bln 1|bulan 1|bulan 01)\b/ },
    { bulan: 2, regex: /\b(februari|feb|bln 2|bulan 2|bulan 02)\b/ },
    { bulan: 3, regex: /\b(maret|mar|bln 3|bulan 3|bulan 03)\b/ },
    { bulan: 4, regex: /\b(april|apr|bln 4|bulan 4|bulan 04)\b/ },
    { bulan: 5, regex: /\b(mei|bln 5|bulan 5|bulan 05)\b/ },
    { bulan: 6, regex: /\b(juni|jun|bln 6|bulan 6|bulan 06)\b/ },
    { bulan: 7, regex: /\b(juli|jul|bln 7|bulan 7|bulan 07)\b/ },
    { bulan: 8, regex: /\b(agustus|agust|agu|ags|bln 8|bulan 8|bulan 08)\b/ },
    { bulan: 9, regex: /\b(september|sept|sep|bln 9|bulan 9|bulan 09)\b/ },
    { bulan: 10, regex: /\b(oktober|okt|bln 10|bulan 10)\b/ },
    { bulan: 11, regex: /\b(november|nov|nopember|nop|bln 11|bulan 11)\b/ },
    { bulan: 12, regex: /\b(desember|des|bln 12|bulan 12)\b/ },
  ];

  for (const m of monthRegexes) {
    if (m.regex.test(t)) {
      const yearMatch = t.match(/\b(202[4-9])\b/);
      const tahun = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
      return { bulan: m.bulan, tahun };
    }
  }

  return null;
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

  // Deteksi digit menu (mendukung format *1*, [1], (1), 1., 1, angka 0-6)
  const menuDigitMatch = strippedMsg.match(/^[(\[]?([0-6])[)\]\.\s]*$/);
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

  // 1a. Perintah Bangunkan Bot Kembali (Wake-Up Command)
  // Memungkinkan warga / admin mengaktifkan kembali bot setelah fase Human Takeover selesai
  const isWakeCommand =
    strippedMsg === "#bot" ||
    strippedMsg === "/bot" ||
    strippedMsg === "!bot" ||
    strippedMsg === "aktifkan bot" ||
    strippedMsg === "buka bot" ||
    strippedMsg === "bot aktif";

  if (isWakeCommand) {
    releaseTakeover(cleanSender);
    recordFullMenuSent(cleanSender);
    const reply = [
      `🤖 *LAYANAN BOT OTOMATIS DIAKTIFKAN KEMBALI*`,
      ``,
      `Halo ${sapaanNama}! 👋 Bot siap melayani Anda kembali.`,
      ...(pelanggan ? [`📍 _Wilayah Layanan: ${namaZona}_\n`] : [``]),
      `Silakan pilih menu bantuan:`,
      `1️⃣ *Cek Tagihan & Bayar Online* (Ketik: 1)`,
      `2️⃣ *Cara Bayar (Panduan QRIS)* (Ketik: 2)`,
      `3️⃣ *Jadwal Penjemputan Sampah* (Ketik: 3)`,
      `4️⃣ *Lapor Sampah Belum Diangkut* (Ketik: 4)`,
      `5️⃣ *Pendaftaran Berlangganan Baru* (Ketik: 5)`,
      `6️⃣ *Info Layanan, Wilayah & Tarif* (Ketik: 6)`,
      `0️⃣ *Bicara dengan Admin / CS* (Ketik: 0)`,
      ``,
      `🌐 Portal Resmi: https://upsheru.com`,
    ].join("\n");

    return { reply, intent: "MENU", pelangganId: pelanggan?.id };
  }

  // 1b. Mode Human Takeover (Bot Tidur)
  // Jika nomor pengirim sedang ditangani admin manusia, bot DIAM sepenuhnya agar tidak menyela obrolan.
  if (isTakeoverActive(cleanSender)) {
    return { reply: "", intent: "NONE", pelangganId: pelanggan?.id };
  }

  // 1c. Penanganan khusus: Foto/Media tanpa teks / pesan singkat
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
          `Foto sampah Anda telah ditambahkan ke tiket aktif:`,
          `🆔 *Tiket: #KMP-${activeKomplain.id}* (${namaZona})`,
          `Status: *${activeKomplain.status === "proses" ? "Sedang ditangani petugas 🚛" : "Dalam antrean armada 📋"}*`,
          ``,
          `Petugas armada rute Anda sedang bergerak menangani. Terima kasih! 🙏`,
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
        `Foto sampah Anda sudah dicatat di sistem:`,
        `🆔 *Tiket Pengaduan: #KMP-${komplain.id}* (${namaZona})`,
        ``,
        `Petugas armada segera cek ke lokasi ya.`,
        `👉 Pantau status: *${linkWebPengaduan}*`,
        ``,
        `Terima kasih telah menjaga kebersihan! 🙏`,
      ].join("\n");

      return { reply, intent: "KOMPLAIN", pelangganId: pelanggan.id, komplainId: komplain.id };
    } else {
      const reply = [
        `Halo! 👋 Foto sudah kami terima. Nomor Anda belum terdaftar pelanggan ya.`,
        ``,
        `Pilihan bantuan cepat:`,
        `1️⃣ *Cek Tagihan* (Ketik: 1)`,
        `2️⃣ *Jadwal Pengangkutan* (Ketik: 2)`,
        `3️⃣ *Form Lapor Sampah*: https://upsheru.com/pengaduan`,
        `4️⃣ *Bicara dengan Admin*: ketik *0*`,
        `👉 Mau langganan angkut sampah rutin? Ketik *DAFTAR* / *5*.`,
      ].join("\n");
      return { reply, intent: "MENU" };
    }
  }

  // 2. Intent Parsing (Klasifikasi Kebutuhan Terpadu 1 s/d 6 dan 0)

  // Intent: TATACARA PEMBAYARAN & CETAK QRIS (Menu 2)
  const cleanFormattedMsg = lowerMsg.replace(/[*_~`]/g, "").trim();
  const isCaraBayarTrigger =
    selectedDigit === "2" ||
    strippedMsg === "2" ||
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
    cleanFormattedMsg.includes("bayar qris") ||
    cleanFormattedMsg.includes("cetak qris") ||
    cleanFormattedMsg.includes("cetak pembayaran") ||
    cleanFormattedMsg.includes("print qris") ||
    cleanFormattedMsg.includes("cetak qr") ||
    cleanFormattedMsg.includes("print qr") ||
    cleanFormattedMsg.includes("cetak barcode") ||
    cleanFormattedMsg.includes("print barcode") ||
    cleanFormattedMsg.includes("cetak invoice") ||
    cleanFormattedMsg.includes("cetak faktur") ||
    cleanFormattedMsg.includes("cetak tagihan") ||
    cleanFormattedMsg.includes("cetak struk") ||
    cleanFormattedMsg.includes("cetak nota") ||
    cleanFormattedMsg.includes("cetak lembar") ||
    cleanFormattedMsg.includes("lembar qris") ||
    cleanFormattedMsg.includes("lembar faktur") ||
    cleanFormattedMsg.includes("lembar tagihan") ||
    cleanFormattedMsg.includes("qris bulan") ||
    cleanFormattedMsg.includes("qris bln") ||
    cleanFormattedMsg === "cara transfer" ||
    cleanFormattedMsg === "cara tf" ||
    cleanFormattedMsg.includes("gimana bayar") ||
    cleanFormattedMsg.includes("bagaimana bayar");

  if (isCaraBayarTrigger) {
    let tagihanList: any[] = [];
    if (pelanggan?.id) {
      try {
        tagihanList = await prisma.tagihan.findMany({
          where: { pelangganId: pelanggan.id, deletedAt: null },
          orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
          select: {
            id: true,
            noInvoice: true,
            status: true,
            bulan: true,
            tahun: true,
            jumlah: true,
            denda: true,
            jatuhTempo: true,
          },
        });
      } catch (e) {
        console.error("Gagal mengambil tagihan untuk cara bayar:", e);
      }
    }

    const unpaid = tagihanList.filter((t: any) => t.status === "belum_bayar" || t.status === "tunggakan");
    const paid = tagihanList.filter((t: any) => t.status === "lunas");
    const unpaidInvoiceNo = unpaid[0]?.noInvoice || null;
    const latestPaidInvoiceNo = paid[0]?.noInvoice || null;

    // Deteksi jika pengguna secara spesifik meminta cetak QRIS bulan tertentu (misal: "cetak qris november", "cetak qris bulan 10", "cetak qris bulan ini")
    const targetMonth = extractTargetMonth(cleanFormattedMsg);
    if (targetMonth && pelanggan?.id && tagihanList.length > 0) {
      const matched = tagihanList.find((t: any) => {
        const matchMonth = t.bulan === targetMonth.bulan;
        const matchYear = targetMonth.tahun ? t.tahun === targetMonth.tahun : true;
        return matchMonth && matchYear;
      });

      if (matched && matched.noInvoice) {
        const namaBulan = BULAN_INDO[matched.bulan - 1] || `Bulan ${matched.bulan}`;
        const isLunas = matched.status === "lunas";
        const statusLabel = isLunas
          ? "✅ *LUNAS*"
          : matched.status === "tunggakan"
          ? "⚠️ *TERTUNGGAK*"
          : "⏳ *BELUM BAYAR*";
        const totalNominal = matched.jumlah + (matched.denda || 0);
        const printUrl = `https://upsheru.com/invoice-tagihan?invoice=${encodeURIComponent(matched.noInvoice)}`;
        const payUrl = `https://upsheru.com/bayar?invoice=${encodeURIComponent(matched.noInvoice)}`;

        const reply = [
          `💳 *PEMBAYARAN TAGIHAN — PERIODE ${namaBulan.toUpperCase()} ${matched.tahun}*`,
          ``,
          `Halo ${sapaanNama},`,
          `Rincian tagihan bulan *${namaBulan} ${matched.tahun}*:`,
          `• Total Tagihan: *${formatRupiahSkylite(totalNominal)}* (${statusLabel})`,
          ``,
          ...(!isLunas
            ? [
                `👉 *Klik untuk Bayar Langsung (QRIS):*`,
                `*${payUrl}*`,
                ``,
                `_Bisa bayar lewat BCA, Mandiri, BRI, DANA, GoPay, dll. Otomatis lunas instan!_`,
              ]
            : [
                `Tagihan sudah lunas ya! 🎉`,
                `🧾 Kuitansi: ${printUrl}`,
              ]),
        ].join("\n");

        return { reply, intent: "CARA_BAYAR", pelangganId: pelanggan.id };
      }
    }

    const paymentLinkStr = unpaidInvoiceNo
      ? `https://upsheru.com/bayar?invoice=${encodeURIComponent(unpaidInvoiceNo)}`
      : (pelanggan?.noTelepon ? `https://upsheru.com/bayar?kode=${pelanggan.noTelepon}` : `https://upsheru.com/bayar`);

    const printInvoiceLinkStr = unpaidInvoiceNo
      ? `https://upsheru.com/invoice-tagihan?invoice=${encodeURIComponent(unpaidInvoiceNo)}`
      : paymentLinkStr;

    // Rincian tautan bayar online per bulan tagihan
    const daftarCetakPerBulan = unpaid.length > 0
      ? [
          `*Pilih bulan tagihan yang ingin Anda bayar:*`,
          ...unpaid.slice(0, 4).map((t: any) => {
            const namaBulan = BULAN_INDO[t.bulan - 1] || `Bulan ${t.bulan}`;
            const statusLabel = t.status === "tunggakan" ? "⚠️ Menunggak" : "⏳ Berjalan";
            const totalNominal = t.jumlah + (t.denda || 0);
            const linkBayar = t.noInvoice
              ? `https://upsheru.com/bayar?invoice=${encodeURIComponent(t.noInvoice)}`
              : paymentLinkStr;
            return `• *Periode ${namaBulan} ${t.tahun}* (${formatRupiahSkylite(totalNominal)} — ${statusLabel}):\n  👉 *${linkBayar}*`;
          }),
        ]
      : [
          `Klik tautan pembayaran resmi berikut:`,
          `👉 *${paymentLinkStr}*`,
        ];

    const reply = [
      `📱 *PANDUAN PRAKTIS CARA BAYAR ONLINE*`,
      ``,
      `Halo ${sapaanNama}! Bayarnya gampang banget lewat m-Banking (BCA, Mandiri, BRI, dll) atau E-Wallet (DANA, GoPay, OVO, ShopeePay):`,
      ``,
      `1️⃣ Buka link tagihan Anda:`,
      `   👉 *${paymentLinkStr}*`,
      `2️⃣ Ambil *Screenshot (Tangkapan Layar)* kode QRIS yang muncul di layar.`,
      `3️⃣ Buka m-Banking / E-Wallet Anda > menu *Scan QRIS* > pilih *Upload Galeri / Foto* lalu pilih foto screenshot tadi.`,
      `4️⃣ Masukkan PIN Anda. *Selesai!* Tagihan langsung lunas otomatis tanpa kirim bukti.`,
      ``,
      ...(unpaid.length > 0 ? [
        ...daftarCetakPerBulan,
        ``,
      ] : []),
      `Butuh bantuan? Ketik *0* untuk hubungi admin.`,
    ].join("\n");

    return { reply, intent: "CARA_BAYAR", pelangganId: pelanggan?.id };
  }

  // Intent C: JADWAL PENGANGKUTAN (Menu 3)
  const isJadwalTrigger =
    selectedDigit === "3" ||
    strippedMsg === "3" ||
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
        `Halo ${sapaanNama}! Nomor ini belum terdaftar di sistem kami ya.`,
        ``,
        `Armada kami rutin melayani area *Kalibaru, Kalimulya, Cilodong & sekitarnya*.`,
        ``,
        `• Mau daftar langganan? Ketik *5* atau buka: https://upsheru.com/daftar`,
        `• Chat admin? Ketik *0*`,
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
        `Halo ${sapaanNama}, ini jadwal armada ke rumah Anda:`,
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
        `Jika ingin memastikan jadwal rute rumah Anda, ketik *0* untuk dibantu admin armada.`,
      ].join("\n");

      return { reply, intent: "JADWAL", pelangganId: pelanggan.id };
    }
  }

  // Intent E: PENGADUAN / KOMPLAIN SAMPAH (Menu 4 - Diprioritaskan sebelum tagihan agar keluhan warga tidak tertukar)
  const isKomplainTrigger =
    !isJadwalTrigger && (
      selectedDigit === "4" ||
      strippedMsg === "4" ||
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

    // Jika pesan hanya pemicu menu (4 / lapor / komplain / pengaduan / keluhan)
    const isSimpleTrigger =
      selectedDigit === "4" ||
      strippedMsg === "4" ||
      strippedMsg === "komplain" ||
      strippedMsg === "komplen" ||
      strippedMsg === "lapor" ||
      strippedMsg === "pengaduan" ||
      strippedMsg === "keluhan" ||
      strippedMsg === "laporan";

    if (isSimpleTrigger || !pelanggan) {
      const reply = [
        `📢 *LAPOR SAMPAH* 🚛`,
        ``,
        `Halo ${sapaanNama}, ada sampah belum diangkut atau menumpuk?`,
        ``,
        `Silakan isi laporan & foto di link ini:`,
        `👉 *${linkWebPengaduan}*`,
        ``,
        `Atau balas pesan ini dengan alamat & foto sampah, nanti kami bantu buatkan laporan untuk petugas armada. Terima kasih! 🙏`,
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
        `Laporan kendala sampah Anda sebelumnya sedang dalam penanganan armada:`,
        `🆔 *Tiket: #KMP-${activeKomplain.id}*`,
        `📍 *Zona Wilayah:* ${namaZona}`,
        `Status: *${statusDesc}*`,
        ``,
        `Petugas rute wilayah kami sedang menuju lokasi. Tidak perlu membuat tiket baru ya.`,
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
      `Laporan Anda telah tercatat di sistem:`,
      `🆔 *Tiket Pengaduan: #KMP-${komplain.id}*`,
      `📍 *Zona Wilayah:* ${namaZona}`,
      ``,
      `Petugas armada telah menerima laporan ini dan akan segera melakukan pengecekan ke lokasi.`,
      `👉 Pantau status & kirim foto: *${linkWebPengaduan}*`,
      ``,
      `Terima kasih atas kerja samanya! 🙏`,
    ].join("\n");

    return {
      reply,
      intent: "KOMPLAIN",
      pelangganId: pelanggan.id,
      komplainId: komplain.id,
    };
  }

  // Intent A: DAFTAR BARU (Menu 5)
  const isDaftarTrigger =
    selectedDigit === "5" ||
    strippedMsg === "5" ||
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
      `Halo ${sapaanNama}! 👋`,
      ``,
      `Mau berlangganan angkut sampah rutin UPS HERU?`,
      `Cukup klik link ini untuk daftar:`,
      `👉 *https://upsheru.com/daftar*`,
      ``,
      `Isi nama & alamat rumah, petugas kami segera survei ke lokasi.`,
      `Butuh dibantu? Ketik *0* untuk chat admin.`,
    ].join("\n");

    return { reply, intent: "DAFTAR", pelangganId: pelanggan?.id };
  }

  // Intent: INFO LAYANAN, WILAYAH & TARIF (Menu 6)
  const isTarifTrigger =
    selectedDigit === "6" ||
    strippedMsg === "6" ||
    strippedMsg === "tarif" ||
    strippedMsg === "layanan" ||
    strippedMsg === "info layanan" ||
    strippedMsg === "coverage" ||
    lowerMsg.includes("tarif") ||
    lowerMsg.includes("biaya") ||
    lowerMsg.includes("harga") ||
    lowerMsg.includes("paket") ||
    lowerMsg.includes("coverage") ||
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

  if (isTarifTrigger) {
    const reply = [
      `📍 *INFORMASI LAYANAN, WILAYAH & TARIF (COVERAGE AREA) — UPS HERU DEPOK* 🚛`,
      ``,
      `Halo ${sapaanNama}! Wilayah layanan kami di Depok:`,
      `• Kelurahan Kalibaru, Kelurahan Kalimulya, Cilodong, Jatimulya & sekitarnya.`,
      ``,
      `💰 *Tarif Iuran Bulanan:*`,
      `• Rumah Standar: Rp35.000 - Rp50.000/bln`,
      `• Rumah Besar: Rp50.000 - Rp75.000/bln`,
      `• Warung / Usaha: Rp50.000 - Rp100.000/bln`,
      `• Ruko / Bisnis: Rp100.000 - Rp250.000/bln`,
      ``,
      `🔍 Peta Rute: https://upsheru.com/peta`,
      `👉 Daftar online: https://upsheru.com/daftar (atau ketik *5*)`,
      `👉 Tanya admin: ketik *0*`,
    ].join("\n");

    return { reply, intent: "COVERAGE", pelangganId: pelanggan?.id };
  }

  // Intent B: BICARA DENGAN ADMIN / CS (Menu 0)
  const isAdminTrigger =
    selectedDigit === "0" ||
    strippedMsg === "0" ||
    strippedMsg === "admin" ||
    strippedMsg === "cs" ||
    strippedMsg === "operator" ||
    lowerMsg.includes("bicara dengan admin") ||
    lowerMsg.includes("hubungi admin") ||
    lowerMsg.includes("manusia");

  if (isAdminTrigger) {
    // Aktifkan Human Takeover selama 12 jam agar chat lanjutan pelanggan tidak dijawab oleh bot
    setTakeover(cleanSender, 12, "requested_admin", rawMessage);

    const reply = [
      `Halo ${sapaanNama}! 👋`,
      ``,
      `Pesan Anda telah diteruskan ke tim *Helpdesk & Admin Pusat UPS HERU* 👨‍💼.`,
      `Silakan ketik pertanyaan atau keperluan Anda di sini ya, petugas kami akan segera membalas.`,
      ``,
      `💡 _Bot otomatis dinonaktifkan sementara untuk percakapan ini agar Anda dapat langsung dilayani oleh petugas kami tanpa gangguan pesan bot. Ketik *#bot* kapan saja untuk mengaktifkan bot kembali._`,
    ].join("\n");

    return { reply, intent: "ADMIN", pelangganId: pelanggan?.id };
  }

  // Intent D: CEK TAGIHAN & PEMBAYARAN (Menu 1)
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
        `Halo ${sapaanNama}! 👋`,
        ``,
        `Nomor WhatsApp Anda saat ini *belum terdaftar* di sistem layanan pengangkutan sampah *UPS HERU*.`,
        ``,
        `👉 *Daftar Langganan Baru:*`,
        `*https://www.upsheru.com/daftar*`,
        ``,
        `_Cukup isi nama & alamat rumah, gampang banget!_`,
        `Sudah langganan tapi nomor HP beda? Balas dengan ketik *0* untuk dibantu Admin.`,
      ].join("\n");
      return { reply, intent: "TAGIHAN" };
    }

    // Read all invoices so old arrears cannot disappear behind a recent-page limit.
    const tagihanList = await prisma.tagihan.findMany({
      where: { pelangganId: pelanggan.id, deletedAt: null },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      select: { id: true, bulan: true, tahun: true, jumlah: true, status: true, noInvoice: true },
    });

    // Jika belum pernah ada tagihan yang diterbitkan (misal calon pelanggan / pendaftar baru)
    if (tagihanList.length === 0) {
      const isCalon = pelanggan.status === "calon";
      const reply = [
        `📋 *INFORMASI STATUS PELANGGAN*`,
        ``,
        `Halo ${sapaanNama},`,
        isCalon
          ? `Status akun Anda masih dalam tahap verifikasi / calon pelanggan, jadi belum ada tagihan iuran yang diterbitkan.`
          : `Saat ini belum ada tagihan iuran yang diterbitkan untuk akun Anda.`,
        ``,
        `ID Pelanggan: *${pelanggan.kodePelanggan || pelanggan.noTelepon}*`,
        `Zona: *${namaZona}*`,
        ``,
        `💡 _Untuk konfirmasi aktivasi layanan atau bantuan, balas pesan ini dengan mengetik *0* (Admin)._ 🙏`,
      ].join("\n");

      return { reply, intent: "TAGIHAN", pelangganId: pelanggan.id };
    }

    const unpaid = tagihanList.filter(
      (t: any) => t.status === "belum_bayar" || t.status === "tunggakan"
    );

    if (unpaid.length === 0) {
      const latestInvoice = tagihanList[0]?.noInvoice;
      const cetakKuitansiStr = latestInvoice
        ? `\n🧾 *Unduh / Cetak Bukti Pembayaran Lunas:*\n👉 *https://upsheru.com/invoice-tagihan?invoice=${encodeURIComponent(latestInvoice)}*\n`
        : "";

      const reply = [
        `✅ *TAGIHAN ANDA LUNAS*`,
        ``,
        `Halo ${sapaanNama},`,
        `Alhamdulillah, saat ini seluruh tagihan iuran sampah Anda sudah *LUNAS*! 🎉`,
        ``,
        `ID Pelanggan: *${pelanggan.kodePelanggan || pelanggan.noTelepon}*`,
        `Zona: *${namaZona}*`,
        cetakKuitansiStr,
        `Terima kasih atas partisipasi aktif Anda dalam menjaga kebersihan lingkungan bersama UPS HERU. 🙏`,
      ].filter(Boolean).join("\n");

      return { reply, intent: "TAGIHAN", pelangganId: pelanggan.id };
    }

    // Ada tagihan yang belum dibayar
    const totalSemua = unpaid.reduce((sum: number, t: any) => sum + t.jumlah, 0);
    const rincianTagihan = unpaid.slice(0, 6).map((t: any) => {
      const statusLabel = t.status === "tunggakan" ? "⚠️ (Menunggak)" : "⏳ (Berjalan)";
      const bayarBulanStr = t.noInvoice
        ? `\n   ↳ 💳 Bayar Online: https://upsheru.com/bayar?invoice=${encodeURIComponent(t.noInvoice)}`
        : "";
      return `• Periode *${t.bulan}/${t.tahun}*: ${formatRupiahSkylite(t.jumlah)} ${statusLabel}${bayarBulanStr}`;
    });

    const reply = [
      `💳 *RINCIAN TAGIHAN RETRIBUSI SAMPAH*`,
      ``,
      `Halo ${sapaanNama},`,
      `Berikut rincian tagihan yang belum diselesaikan:`,
      ...rincianTagihan,
      ...(unpaid.length > 6 ? [`• ${unpaid.length - 6} periode lainnya; seluruh periode tercakup dalam total.`] : []),
      `----------------------------------`,
      `*Total: ${formatRupiahSkylite(totalSemua)}*`,
      ``,
      `💳 *Bayar Langsung Online (QRIS / VA / e-Wallet):*`,
      `👉 *https://upsheru.com/bayar?kode=${pelanggan.noTelepon}*`,
      ``,
      `💡 _Tinggal scan QRIS lewat BCA, Mandiri, BRI, DANA, GoPay, dll. Langsung lunas otomatis!_`,
      `💡 _Ketik *2* untuk melihat panduan cara bayar._`,
    ].filter(Boolean).join("\n");

    return { reply, intent: "TAGIHAN", pelangganId: pelanggan.id };
  }

  // Intent F: MENU UTAMA / BANTUAN SPESIFIK
  // Membalas jika pengguna meminta panduan / menu / salam / sapaan / kata kunci test
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
    strippedMsg === "test" ||
    strippedMsg === "tes" ||
    strippedMsg === "testing" ||
    strippedMsg === "ping" ||
    strippedMsg === "bot" ||
    strippedMsg === "halo" ||
    strippedMsg === "halo bot" ||
    strippedMsg === "hai" ||
    strippedMsg === "hello" ||
    strippedMsg === "assalamualaikum" ||
    strippedMsg === "assalamu'alaikum" ||
    strippedMsg === "selamat pagi" ||
    strippedMsg === "selamat siang" ||
    strippedMsg === "selamat sore" ||
    strippedMsg === "selamat malam" ||
    strippedMsg.startsWith("halo ") ||
    strippedMsg.startsWith("hai ");

  if (isMenuTrigger) {
    const isCasualGreeting =
      strippedMsg === "halo" ||
      strippedMsg === "halo bot" ||
      strippedMsg === "hai" ||
      strippedMsg === "hello" ||
      strippedMsg === "test" ||
      strippedMsg === "tes" ||
      strippedMsg === "testing" ||
      strippedMsg === "ping" ||
      strippedMsg === "bot" ||
      strippedMsg === "assalamualaikum" ||
      strippedMsg === "assalamu'alaikum" ||
      strippedMsg === "selamat pagi" ||
      strippedMsg === "selamat siang" ||
      strippedMsg === "selamat sore" ||
      strippedMsg === "selamat malam" ||
      strippedMsg.startsWith("halo ") ||
      strippedMsg.startsWith("hai ");

    // Frequency Capping: Jika pesan sapaan/tes santai berulang dalam kurun 8 jam,
    // sajikan ringkasan cepat agar tidak membanjiri layar chat pelanggan (anti-spam).
    // Jika warga meminta secara eksplisit ('menu', 'bantuan', 'help', 'panduan', '#menu'), selalu sajikan menu lengkap.
    if (isCasualGreeting && !shouldSendFullMenu(cleanSender, 8)) {
      const compactReply = [
        `Halo ${sapaanNama}! 👋 Ada yang bisa kami bantu?`,
        ``,
        `Ketik angka pilihan kebutuhan Anda:`,
        `1️⃣ *Tagihan* | 2️⃣ *Cara Bayar QRIS* | 3️⃣ *Jadwal* | 4️⃣ *Lapor* | 5️⃣ *Daftar* | 6️⃣ *Tarif* | 0️⃣ *Admin*`,
        ``,
        `💡 _Ketik *#menu* untuk menu lengkap, atau *0* jika ingin dibantu Admin._`,
      ].join("\n");

      return { reply: compactReply, intent: "MENU", pelangganId: pelanggan?.id };
    }

    recordFullMenuSent(cleanSender);

    const reply = [
      `🌿 *PUSAT INFORMASI & LAYANAN RESMI — UPS HERU DEPOK* 🚛`,
      ``,
      `Halo ${sapaanNama}! 👋 Selamat datang di layanan *UPS HERU*.`,
      ...(pelanggan ? [`📍 _Wilayah Layanan: ${namaZona}_\n`] : [``]),
      `Silakan pilih menu dengan mengetik *ANGKA* di bawah ini:`,
      ``,
      `1️⃣ *Cek Tagihan & Bayar Online*`,
      `2️⃣ *Cara Bayar & Cetak QRIS*`,
      `3️⃣ *Jadwal Penjemputan Sampah*`,
      `4️⃣ *Lapor Sampah & Pengaduan*`,
      `5️⃣ *Pendaftaran Berlangganan Baru*`,
      `6️⃣ *Info Layanan, Wilayah & Tarif*`,
      `0️⃣ *Bicara dengan Admin / CS*`,
      ``,
      `🌐 Portal Web: https://upsheru.com`,
    ].join("\n");

    return { reply, intent: "MENU", pelangganId: pelanggan?.id };
  }

  // Pesan obrolan biasa / non-keyword: Diam (silent fallback)
  // Menghindari bot menyela obrolan atau memunculkan saran berulang-ulang saat warga sedang chat santai / chat dengan CS
  return { reply: "", intent: "NONE", pelangganId: pelanggan?.id };
}
