import { describe, expect, it, vi, beforeEach } from "vitest";
import { processIncomingWaMessage } from "../src/lib/server/wa-bot-service";
import { prisma } from "../src/lib/prisma";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    pelanggan: {
      findFirst: vi.fn(),
    },
    tagihan: {
      findMany: vi.fn(),
    },
    komplain: {
      create: vi.fn(),
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

  it("7. Meneruskan ke Helpdesk Admin saat pelanggan ketik 'admin'", async () => {
    const res = await processIncomingWaMessage({
      sender: "081299998888",
      message: "4",
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
});
