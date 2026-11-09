import { describe, expect, it, vi, beforeEach } from "vitest";
import { processIncomingWaMessage, extractTargetMonth } from "../src/lib/server/wa-bot-service";
import { prisma } from "../src/lib/prisma";
import {
  clearTakeoverStateForTest,
  isTakeoverActive,
  setTakeover,
  releaseTakeover,
  getTakeoverInfo,
  getAllActiveTakeovers,
} from "../src/lib/server/wa-takeover-service";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    pelanggan: {
      findFirst: vi.fn(),
    },
    tagihan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    komplain: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../src/lib/wa", () => ({
  adminPhone: vi.fn(() => "08123456789"),
  isWaEnabled: vi.fn(() => true),
  kirimWhatsApp: vi.fn(async () => ({ ok: true })),
}));

describe("WhatsApp Bot Service (Fonnte Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTakeoverStateForTest();
  });

  it("1. Menyajikan Menu Utama jika pengguna mengetik 'menu' atau 'halo'", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue(null);

    const res = await processIncomingWaMessage({
      sender: "6289912345678",
      message: "halo",
      name: "Budi",
    });

    expect(res.intent).toBe("MENU");
    expect(res.reply).toContain("Layanan WhatsApp Otomatis");
    expect(res.reply).toContain("Cek Tagihan & Bayar Online");
    expect(res.reply).toContain("Jadwal Penjemputan Sampah");
  });

  it("2. Menampilkan rincian tagihan belum bayar dan link pembayaran jika intent TAGIHAN", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 101,
      nama: "Siti Aminah",
      noTelepon: "081234567890",
      kodePelanggan: "081234567890",
      alamat: "Jl. Dahlia No. 12",
      wilayah: { zona: { nama: "Zona Bakung" } },
    });

    (prisma.tagihan.findMany as any).mockResolvedValue([
      {
        id: 501,
        bulan: 11,
        tahun: 2026,
        jumlah: 50000,
        denda: 0,
        status: "belum_bayar",
      },
    ]);

    const res = await processIncomingWaMessage({
      sender: "081234567890",
      message: "tagihan",
    });

    expect(res.intent).toBe("TAGIHAN");
    expect(res.pelangganId).toBe(101);
    expect(res.reply).toContain("RINCIAN TAGIHAN RETRIBUSI SAMPAH");
    expect(res.reply).toContain("Siti Aminah");
    expect(res.reply).toContain("50.000");
    expect(res.reply).toContain("https://upsheru.com/bayar?kode=081234567890");
  });

  it("includes old arrears beyond six recent paid invoices", async () => {
    vi.mocked(prisma.pelanggan.findFirst).mockResolvedValue({
      id: 102, nama: "Test", noTelepon: "081398765432",
    } as never);
    vi.mocked(prisma.tagihan.findMany).mockResolvedValue([
      ...Array.from({ length: 6 }, (_, i) => ({ id: i + 1, bulan: 11 - i, tahun: 2026, jumlah: 50000, status: "lunas" })),
      { id: 7, bulan: 1, tahun: 2026, jumlah: 50000, status: "tunggakan" },
    ] as never);
    const result = await processIncomingWaMessage({ sender: "081398765432", message: "tagihan" });
    expect(result.reply).not.toContain("TAGIHAN ANDA LUNAS");
    expect(result.reply).toContain("50.000");
    expect(vi.mocked(prisma.tagihan.findMany).mock.calls[0][0]).not.toHaveProperty("take");
  });

  it("3. Menginformasikan tagihan LUNAS jika pelanggan tidak memiliki tunggakan", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 102,
      nama: "Ahmad Dahlan",
      noTelepon: "081398765432",
      kodePelanggan: "081398765432",
      alamat: "Jl. Mawar No. 4",
      wilayah: { zona: { nama: "Zona Anggrek" } },
    });

    (prisma.tagihan.findMany as any).mockResolvedValue([
      {
        id: 502,
        bulan: 10,
        tahun: 2026,
        jumlah: 50000,
        denda: 0,
        status: "lunas",
      },
    ]);

    const res = await processIncomingWaMessage({
      sender: "081398765432",
      message: "cek tagihan saya dong min",
    });

    expect(res.intent).toBe("TAGIHAN");
    expect(res.reply).toContain("TAGIHAN ANDA LUNAS");
    expect(res.reply).toContain("Ahmad Dahlan");
  });

  it("4. Menampilkan jadwal pengangkutan untuk pelanggan terdaftar", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 103,
      nama: "Rudi Hartono",
      noTelepon: "085678901234",
      alamat: "Blok YKP No. 8",
      wilayah: { zona: { nama: "Zona YKP Kelapa" } },
      jadwal: [
        {
          hari: "Senin",
          jam: "08.00 - 10.00",
          rute: { petugas: { nama: "Pak Bambang" } },
        },
        {
          hari: "Kamis",
          jam: "08.00 - 10.00",
          rute: { petugas: { nama: "Pak Bambang" } },
        },
      ],
    });

    const res = await processIncomingWaMessage({
      sender: "085678901234",
      message: "jadwal",
    });

    expect(res.intent).toBe("JADWAL");
    expect(res.reply).toContain("JADWAL PENGANGKUTAN SAMPAH ANDA");
    expect(res.reply).toContain("Senin");
    expect(res.reply).toContain("Kamis");
    expect(res.reply).toContain("Pak Bambang");
  });

  it("5. Otomatis membuat tiket komplain di DB saat pelanggan melaporkan sampah belum diangkut", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 104,
      nama: "Ibu Nurul",
      noTelepon: "087812345678",
      alamat: "Perum GDC Sektor 1",
      wilayah: { zona: { nama: "Zona GDC" } },
    });

    (prisma.komplain.create as any).mockResolvedValue({
      id: 88,
      jenis: "tidak_diangkut",
      deskripsi: "Tolong min sampah depan rumah belum diangkut dari kemarin",
      status: "baru",
    });

    const res = await processIncomingWaMessage({
      sender: "087812345678",
      message: "Tolong min sampah depan rumah belum diangkut dari kemarin",
    });

    expect(res.intent).toBe("KOMPLAIN");
    expect(res.komplainId).toBe(88);
    expect(res.reply).toContain("PENGADUAN BERHASIL DICATAT");
    expect(res.reply).toContain("#KMP-88");
    expect(prisma.komplain.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pelangganId: 104,
          jenis: "tidak_diangkut",
        }),
      })
    );
  });

  it("6. Memberikan panduan link pendaftaran mandiri saat diminta 'daftar'", async () => {
    const res = await processIncomingWaMessage({
      sender: "089599988877",
      message: "daftar baru",
    });

    expect(res.intent).toBe("DAFTAR");
    expect(res.reply).toContain("https://upsheru.com/daftar");
  });

  it("7. Meneruskan ke Helpdesk Admin saat pelanggan ketik 'admin' atau '0'", async () => {
    const res = await processIncomingWaMessage({
      sender: "081299998888",
      message: "admin",
    });

    expect(res.intent).toBe("ADMIN");
    expect(res.reply).toContain("Helpdesk & Admin Pusat");
  });

  it("8. Menampilkan daftar coverage area saat pengguna menanyakan jangkauan/wilayah", async () => {
    const res = await processIncomingWaMessage({
      sender: "081299997777",
      message: "apakah melayani area kalibaru?",
    });

    expect(res.intent).toBe("COVERAGE");
    expect(res.reply).toContain("COVERAGE AREA");
    expect(res.reply).toContain("Kelurahan Kalibaru");
    expect(res.reply).toContain("Kelurahan Kalimulya");
    expect(res.reply).toContain("https://upsheru.com/peta");
  });

  it("9. Menangani variasi kalimat natural seperti 'Tagihan saya berapa ha'", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 105,
      nama: "Rohmat Eko",
      noTelepon: "6285716251003",
      kodePelanggan: "6285716251003",
      alamat: "Cilodong",
    });

    (prisma.tagihan.findMany as any).mockResolvedValue([]);

    const res = await processIncomingWaMessage({
      sender: "6285716251003",
      message: "Tagihan saya berapa ha",
    });

    expect(res.intent).toBe("TAGIHAN");
    expect(res.pelangganId).toBe(105);
  });

  it("10. Menangani pertanyaan jadwal natural 'om sampah diambil kapan,, dah numpuk'", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 106,
      nama: "A.P.A",
      noTelepon: "6285220289917",
      alamat: "Kalibaru",
      jadwal: [],
    });

    const res = await processIncomingWaMessage({
      sender: "6285220289917",
      message: "om sampah diambil kapan,, dah numpuk",
    });

    expect(res.intent).toBe("JADWAL");
  });

  it("11. Diam (silent fallback / intent NONE) jika pesan obrolan umum biasa atau non-keyword", async () => {
    const obrolanBiasa = [
      "terima kasih pak",
      "oke siap makasih",
      "p",
      "selamat siang pak eko",
      "lokasi rumah saya di seberang masjid ya",
      "ini fotonya pak",
    ];

    for (const msg of obrolanBiasa) {
      const res = await processIncomingWaMessage({
        sender: "081299995555",
        message: msg,
      });
      expect(res.intent).toBe("NONE");
      expect(res.reply).toBe("");
    }
  });

  it("12. Tetap menyajikan Menu Utama jika secara eksplisit meminta 'menu' atau 'bantuan'", async () => {
    const perintahMenu = ["menu", "#menu", "/menu", "bantuan", "help", "panduan"];

    for (const cmd of perintahMenu) {
      const res = await processIncomingWaMessage({
        sender: "081299994444",
        message: cmd,
      });
      expect(res.intent).toBe("MENU");
      expect(res.reply).toContain("Silakan pilih menu bantuan");
    }
  });

  it("13. Merespons panduan pembayaran QRIS jika pengguna mengetik 'cara bayar' atau 'qris' atau '2'", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 201,
      nama: "Pak RT Heru",
      noTelepon: "087881536978",
    });

    const variations = ["cara bayar", "CARA BAYAR", "qris", "panduan bayar", "tutorial bayar", "tata cara pembayaran", "2", "cetak qris"];

    for (const msg of variations) {
      const res = await processIncomingWaMessage({
        sender: "087881536978",
        message: msg,
      });
      expect(res.intent).toBe("CARA_BAYAR");
      expect(res.reply).toContain("PANDUAN PRAKTIS CARA BAYAR");
      expect(res.reply).toContain("Screenshot (Tangkapan Layar)");
      expect(res.reply).toContain("Upload Galeri");
      expect(res.reply).toContain("https://upsheru.com/bayar");
    }
  });

  it("14. Mencegah duplikasi komplain aktif dalam 24 jam terakhir (deduplikasi anti-spam/retry)", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 301,
      nama: "Ibu Fatimah",
      noTelepon: "081299991111",
      alamat: "Kalibaru RT 02",
      wilayah: { zona: { nama: "Zona Kalibaru" } },
    });

    (prisma.komplain.findFirst as any).mockResolvedValue({
      id: 99,
      status: "proses",
      pelangganId: 301,
      createdAt: new Date(),
    });

    const res = await processIncomingWaMessage({
      sender: "081299991111",
      message: "sampah belum diangkut min tolong ya",
    });

    expect(res.intent).toBe("KOMPLAIN");
    expect(res.komplainId).toBe(99);
    expect(res.reply).toContain("LAPORAN ANDA SEDANG DALAM PROSES");
    expect(res.reply).toContain("#KMP-99");
    expect(prisma.komplain.create).not.toHaveBeenCalled();
  });

  it("15. Otomatis membuat tiket komplain jika warga mengirim foto tanpa teks", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 302,
      nama: "Pak Joko",
      noTelepon: "081388882222",
      alamat: "Cilodong Blok C",
      wilayah: { zona: { nama: "Zona Cilodong" } },
    });

    (prisma.komplain.findFirst as any).mockResolvedValue(null);
    (prisma.komplain.create as any).mockResolvedValue({
      id: 105,
      jenis: "sampah_menumpuk",
      foto: "https://media.fonnte.com/photo-sampah.jpg",
      status: "baru",
    });

    const res = await processIncomingWaMessage({
      sender: "081388882222",
      message: "",
      url: "https://media.fonnte.com/photo-sampah.jpg",
    });

    expect(res.intent).toBe("KOMPLAIN");
    expect(res.komplainId).toBe(105);
    expect(res.reply).toContain("FOTO SAMPAH BERHASIL DILAPORKAN");
    expect(res.reply).toContain("#KMP-105");
  });

  it("16. Mendukung input angka dengan format markdown WhatsApp (*2*, *4*, *6*, *0*)", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 303,
      nama: "Bpk Hendra",
      noTelepon: "081577773333",
    });

    const res1 = await processIncomingWaMessage({
      sender: "081577773333",
      message: "*2*",
    });
    expect(res1.intent).toBe("CARA_BAYAR");

    const res2 = await processIncomingWaMessage({
      sender: "081577773333",
      message: "*0*",
    });
    expect(res2.intent).toBe("ADMIN");

    // Release takeover dari trigger menu 0 agar pengujian digit *6* berikutnya dapat diproses
    releaseTakeover("081577773333");

    const res3 = await processIncomingWaMessage({
      sender: "081577773333",
      message: "*6*",
    });
    expect(res3.intent).toBe("COVERAGE");
    expect(res3.reply).toContain("INFORMASI LAYANAN, WILAYAH & TARIF");
  });

  it("17. Menangani variasi slang dan typo warga (komplen, blm diangkut, gak diangkut)", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 304,
      nama: "Pak RT",
      noTelepon: "081766664444",
      alamat: "Kalimulya No 9",
      wilayah: { zona: { nama: "Zona Kalimulya" } },
    });
    (prisma.komplain.findFirst as any).mockResolvedValue(null);
    (prisma.komplain.create as any).mockResolvedValue({ id: 110, status: "baru" });

    const slangs = [
      "komplen dong min",
      "sampah blm diangkut ya",
      "kenapa sampah gak diangkut",
      "sampah bau busuk tolong ambil",
    ];

    for (const slang of slangs) {
      const res = await processIncomingWaMessage({
        sender: "081766664444",
        message: slang,
      });
      expect(res.intent).toBe("KOMPLAIN");
    }
  });

  it("18. Memprioritaskan komplain saat warga komplain sampah belum diangkut meski menyebut kata tagihan", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 305,
      nama: "Ibu Desi",
      noTelepon: "081855555555",
      alamat: "Jatimulya",
      wilayah: { zona: { nama: "Zona Jatimulya" } },
    });
    (prisma.komplain.findFirst as any).mockResolvedValue(null);
    (prisma.komplain.create as any).mockResolvedValue({ id: 115, status: "baru" });

    const res = await processIncomingWaMessage({
      sender: "081855555555",
      message: "Min tagihan saya sudah lunas tapi kok sampah belum diangkut?",
    });

    expect(res.intent).toBe("KOMPLAIN");
    expect(res.komplainId).toBe(115);
  });

  it("19. Berhasil membersihkan suffix JID WhatsApp Multi-Device (:1 / @s.whatsapp.net)", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 306,
      nama: "Bpk Rahmat",
      noTelepon: "08123456789",
    });

    const res = await processIncomingWaMessage({
      sender: "628123456789:1@s.whatsapp.net",
      message: "halo",
    });

    expect(res.intent).toBe("MENU");
    expect(prisma.pelanggan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { noTelepon: "628123456789" },
            { kodePelanggan: "628123456789" },
          ]),
        }),
      })
    );
  });

  it("20. Menu 0 (Admin Trigger) mengaktifkan Human Takeover dan memberitahu pelanggan", async () => {
    const sender = "081299998888";
    expect(isTakeoverActive(sender)).toBe(false);

    const res = await processIncomingWaMessage({
      sender,
      message: "0",
    });

    expect(res.intent).toBe("ADMIN");
    expect(res.reply).toContain("Helpdesk & Admin Pusat UPS HERU");
    expect(res.reply).toContain("Bot otomatis dinonaktifkan sementara");
    expect(res.reply).toContain("#bot");
    expect(isTakeoverActive(sender)).toBe(true);

    const info = getTakeoverInfo(sender);
    expect(info.active).toBe(true);
    expect(info.reason).toBe("requested_admin");
    expect(info.remainingMinutes).toBeGreaterThan(0);
  });

  it("21. Bot DIAM sepenuhnya (reply kosong) saat mode Human Takeover aktif", async () => {
    const sender = "081299997777";
    setTakeover(sender, 12, "requested_admin");
    expect(isTakeoverActive(sender)).toBe(true);

    // Chat kata kunci tagihan
    const res1 = await processIncomingWaMessage({
      sender,
      message: "tagihan",
    });
    expect(res1.reply).toBe("");
    expect(res1.intent).toBe("NONE");

    // Chat kata kunci menu
    const res2 = await processIncomingWaMessage({
      sender,
      message: "menu",
    });
    expect(res2.reply).toBe("");
    expect(res2.intent).toBe("NONE");

    // Chat digit 1
    const res3 = await processIncomingWaMessage({
      sender,
      message: "1",
    });
    expect(res3.reply).toBe("");
    expect(res3.intent).toBe("NONE");
  });

  it("22. Perintah #bot, /bot, atau 'aktifkan bot' membangunkan bot kembali dari mode Takeover", async () => {
    const sender = "081299996666";
    setTakeover(sender, 12, "admin_chatting");
    expect(isTakeoverActive(sender)).toBe(true);

    const wakeCommands = ["#bot", "/bot", "aktifkan bot"];
    for (const cmd of wakeCommands) {
      setTakeover(sender, 12, "admin_chatting");
      expect(isTakeoverActive(sender)).toBe(true);

      const res = await processIncomingWaMessage({
        sender,
        message: cmd,
      });

      expect(isTakeoverActive(sender)).toBe(false);
      expect(res.intent).toBe("MENU");
      expect(res.reply).toContain("LAYANAN BOT OTOMATIS DIAKTIFKAN KEMBALI");
      expect(res.reply).toContain("Cek Tagihan & Bayar Online");
    }
  });

  it("23. Anti-Spam Menu (Frequency Capping): sapaan berulang menyajikan compact menu, #menu menyajikan full menu", async () => {
    const sender = "081299995555";

    // Kirim pertama kali: menu lengkap
    const res1 = await processIncomingWaMessage({
      sender,
      message: "halo",
    });
    expect(res1.intent).toBe("MENU");
    expect(res1.reply).toContain("PUSAT INFORMASI & LAYANAN RESMI");
    expect(res1.reply).toContain("Cek Tagihan & Bayar Online");

    // Kirim kedua kali dalam waktu dekat: compact quick menu
    const res2 = await processIncomingWaMessage({
      sender,
      message: "halo",
    });
    expect(res2.intent).toBe("MENU");
    expect(res2.reply).toContain("Ada yang bisa kami bantu?");
    expect(res2.reply).toContain("1️⃣ *Tagihan* | 2️⃣ *Cara Bayar QRIS*");
    expect(res2.reply).not.toContain("PUSAT INFORMASI & LAYANAN RESMI");

    // Kirim eksplisit '#menu': selalu menu lengkap
    const res3 = await processIncomingWaMessage({
      sender,
      message: "#menu",
    });
    expect(res3.intent).toBe("MENU");
    expect(res3.reply).toContain("PUSAT INFORMASI & LAYANAN RESMI");
  });

  it("24. Unit test wa-takeover-service: releaseTakeover & getAllActiveTakeovers", () => {
    const phone1 = "081111111111";
    const phone2 = "628222222222";

    setTakeover(phone1, 5, "manual_pause", "pause test 1");
    setTakeover(phone2, 10, "admin_chatting", "pause test 2");

    expect(isTakeoverActive(phone1)).toBe(true);
    expect(isTakeoverActive(phone2)).toBe(true);

    const activeList = getAllActiveTakeovers();
    expect(activeList.length).toBeGreaterThanOrEqual(2);
    expect(activeList.some((e) => e.sender === phone1)).toBe(true);

    const released = releaseTakeover(phone1);
    expect(released).toBe(true);
    expect(isTakeoverActive(phone1)).toBe(false);
  });

  it("25. Unit test extractTargetMonth: deteksi bulan nama, angka berawalan 'bulan', bulan ini/lalu, dan toleransi non-bulan", () => {
    expect(extractTargetMonth("cetak qris november")).toEqual({ bulan: 11, tahun: undefined });
    expect(extractTargetMonth("cetak qris nov 2026")).toEqual({ bulan: 11, tahun: 2026 });
    expect(extractTargetMonth("cetak qris bulan 10")).toEqual({ bulan: 10, tahun: undefined });
    expect(extractTargetMonth("cetak qris bln 5")).toEqual({ bulan: 5, tahun: undefined });
    expect(extractTargetMonth("cetak qris januari")).toEqual({ bulan: 1, tahun: undefined });
    expect(extractTargetMonth("cetak qris des")).toEqual({ bulan: 12, tahun: undefined });

    const now = new Date();
    const blnIni = extractTargetMonth("cetak qris bulan ini");
    expect(blnIni?.bulan).toBe(now.getMonth() + 1);
    expect(blnIni?.isBulanIni).toBe(true);

    // Pastikan angka menu tunggal "2" atau kalimat umum tidak salah dideteksi sebagai bulan
    expect(extractTargetMonth("2")).toBeNull();
    expect(extractTargetMonth("cara bayar")).toBeNull();
    expect(extractTargetMonth("qris")).toBeNull();
  });

  it("26. Cetak QRIS bulan spesifik: mengembalikan link faktur QRIS bulan yang diminta secara langsung", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 501,
      nama: "Pak Hendra Wijaya",
      noTelepon: "081288776655",
      kodePelanggan: "081288776655",
    });

    (prisma.tagihan.findMany as any).mockResolvedValue([
      {
        id: 701,
        noInvoice: "INV/081288776655/202611",
        status: "belum_bayar",
        bulan: 11,
        tahun: 2026,
        jumlah: 50000,
        denda: 0,
        jatuhTempo: new Date("2026-11-20"),
      },
      {
        id: 702,
        noInvoice: "INV/081288776655/202610",
        status: "tunggakan",
        bulan: 10,
        tahun: 2026,
        jumlah: 50000,
        denda: 1000,
        jatuhTempo: new Date("2026-10-20"),
      },
    ]);

    const resNov = await processIncomingWaMessage({
      sender: "081288776655",
      message: "cetak qris november",
    });

    expect(resNov.intent).toBe("CARA_BAYAR");
    expect(resNov.reply).toContain("LEMBAR CETAK QRIS — PERIODE NOVEMBER 2026");
    expect(resNov.reply).toContain("INV%2F081288776655%2F202611");
    expect(resNov.reply).toContain("https://upsheru.com/invoice-tagihan?invoice=");
    expect(resNov.reply).toContain("Total Tagihan: *Rp50.000,-*");

    // Request untuk bulan Oktober (tunggakan)
    const resOkt = await processIncomingWaMessage({
      sender: "081288776655",
      message: "cetak qris bulan 10",
    });
    expect(resOkt.intent).toBe("CARA_BAYAR");
    expect(resOkt.reply).toContain("LEMBAR CETAK QRIS — PERIODE OKTOBER 2026");
    expect(resOkt.reply).toContain("INV%2F081288776655%2F202610");
    expect(resOkt.reply).toContain("TERTUNGGAK");
    expect(resOkt.reply).toContain("Rp51.000,-"); // 50000 + 1000 denda
  });

  it("27. Panduan Cara Bayar umum (Menu 2) menyajikan daftar link cetak QRIS per bulan tagihan yang belum lunas", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 502,
      nama: "Ibu Nurhayati",
      noTelepon: "081377889900",
      kodePelanggan: "081377889900",
    });

    (prisma.tagihan.findMany as any).mockResolvedValue([
      {
        id: 703,
        noInvoice: "INV/081377889900/202611",
        status: "belum_bayar",
        bulan: 11,
        tahun: 2026,
        jumlah: 45000,
        denda: 0,
        jatuhTempo: new Date("2026-11-20"),
      },
      {
        id: 704,
        noInvoice: "INV/081377889900/202610",
        status: "tunggakan",
        bulan: 10,
        tahun: 2026,
        jumlah: 45000,
        denda: 900,
        jatuhTempo: new Date("2026-10-20"),
      },
    ]);

    const res = await processIncomingWaMessage({
      sender: "081377889900",
      message: "2",
    });

    expect(res.intent).toBe("CARA_BAYAR");
    expect(res.reply).toContain("PANDUAN PRAKTIS CARA BAYAR & CETAK QRIS");
    expect(res.reply).toContain("Pilih bulan tagihan yang ingin Anda cetak:");
    expect(res.reply).toContain("Periode November 2026");
    expect(res.reply).toContain("Periode Oktober 2026");
    expect(res.reply).toContain("invoice-tagihan?invoice=INV%2F081377889900%2F202611");
    expect(res.reply).toContain("invoice-tagihan?invoice=INV%2F081377889900%2F202610");
  });

  it("28. Menu Cek Tagihan (Menu 1) menyajikan link 🖨️ Cetak QRIS di setiap baris periode tagihan", async () => {
    (prisma.pelanggan.findFirst as any).mockResolvedValue({
      id: 503,
      nama: "Bpk Slamet",
      noTelepon: "081512345678",
      kodePelanggan: "081512345678",
      alamat: "Jl. Dahlia 5",
      wilayah: { zona: { nama: "Zona Kalimulya" } },
    });

    (prisma.tagihan.findMany as any).mockResolvedValue([
      {
        id: 705,
        noInvoice: "INV/081512345678/202611",
        status: "belum_bayar",
        bulan: 11,
        tahun: 2026,
        jumlah: 50000,
        denda: 0,
      },
    ]);

    const res = await processIncomingWaMessage({
      sender: "081512345678",
      message: "1",
    });

    expect(res.intent).toBe("TAGIHAN");
    expect(res.reply).toContain("RINCIAN TAGIHAN RETRIBUSI SAMPAH");
    expect(res.reply).toContain("Periode *11/2026*: Rp50.000,-");
    expect(res.reply).toContain("↳ 🖨️ Cetak QRIS: https://upsheru.com/invoice-tagihan?invoice=INV%2F081512345678%2F202611");
    expect(res.reply).toContain("Cetak / Download Faktur Tagihan QRIS:");
  });
});
