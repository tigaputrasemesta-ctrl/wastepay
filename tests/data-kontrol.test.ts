// @ts-nocheck
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';
import {
  normalizePhone,
  formatPhoneIndo,
  detectLocation,
  DEVICE_CONFIG,
  getKontrolContacts,
  sendBlastWaWithRouting,
} from '../src/lib/data-kontrol-service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    pelanggan: {
      findMany: vi.fn(),
    },
    petugas: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe('Data Kontrol Service - Helper Functions', () => {
  it('normalizePhone menormalisasi format nomor HP Indonesia dengan benar', () => {
    expect(normalizePhone('081234567890')).toBe('6281234567890');
    expect(normalizePhone('+62 812-3456-7890')).toBe('6281234567890');
    expect(normalizePhone('81234567890')).toBe('6281234567890');
    expect(normalizePhone('6281234567890')).toBe('6281234567890');
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone('')).toBe('');
  });

  it('formatPhoneIndo mengubah nomor menjadi format 08xx-xxxx-xxxx', () => {
    expect(formatPhoneIndo('6281234567890')).toBe('0812-3456-7890');
    expect(formatPhoneIndo('081234567890')).toBe('0812-3456-7890');
    expect(formatPhoneIndo('')).toBe('-');
  });

  it('detectLocation mengenali klaster/blok dari nama tersimpan di kontak', () => {
    expect(detectLocation('Rmh Putih Tabroni Hadi')).toBe('Blok Tabroni');
    expect(detectLocation('Alexxx Bawa Smp6')).toBe('Blok Bawah Dmiles + SMP 6');
    expect(detectLocation('Yulia Sasak')).toBe('Blok Sasak');
    expect(detectLocation('Prio Ykp')).toBe('Blok YKP Kelapa');
    expect(detectLocation('Pak Riyadi GG.Niman')).toBe('Blok Gg Niman');
    expect(detectLocation('Kontak Umum Tanpa Blok')).toBe('-');
  });

  it('DEVICE_CONFIG memiliki konfigurasi HP Admin dan HP Petugas yang tepat', () => {
    expect(DEVICE_CONFIG.admin.phone).toBe('081400782617');
    expect(DEVICE_CONFIG.admin.isPrimaryAdmin).toBe(true);
    expect(DEVICE_CONFIG.petugas.phone).toBe('089688151473');
    expect(DEVICE_CONFIG.petugas.token).toBe('8n46RV2x9GosQYgtAS1j');
  });
});

describe('sendBlastWaWithRouting - Smart Device Routing & Safety Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.pelanggan.findMany as any).mockResolvedValue([
      { noTelepon: '081284093225', kodePelanggan: 'PEL-001' },
    ]);
  });

  it('melewati kontak yang merupakan kru atau staff internal', async () => {
    const result = await sendBlastWaWithRouting({
      targets: [
        { phone: '081400782617', name: 'Admin Pusat', wilayah: 'Pusat', source: 'hp_admin' },
        { phone: '089688151473', name: 'Novi Survei', wilayah: 'Survei', source: 'hp_petugas' },
        { phone: '089602950531', name: 'Ago Driver', wilayah: 'Driver', source: 'hp_admin' },
      ],
      messageTemplate: 'Halo {nama}, yuk langganan di {wilayah}',
      dryRun: true,
    });

    expect(result.totalRequested).toBe(3);
    expect(result.totalSkipped).toBe(3);
    expect(result.totalSent).toBe(0);
    expect(result.details[0].reason).toContain('kru');
    expect(result.details[1].reason).toContain('kru');
    expect(result.details[2].reason).toContain('kru');
  });

  it('melewati kontak yang sudah terdaftar di database', async () => {
    const result = await sendBlastWaWithRouting({
      targets: [
        // 0812-8409-3225 adalah pelanggan aktif yang ada di mock DB
        { phone: '6281284093225', name: 'Nurul Hadi', wilayah: 'Tabroni', source: 'hp_admin' },
      ],
      messageTemplate: 'Halo {nama}',
      dryRun: true,
    });

    expect(result.totalRequested).toBe(1);
    expect(result.totalSkipped).toBe(1);
    expect(result.details[0].status).toBe('skipped');
    expect(result.details[0].reason).toContain('terdaftar aktif');
  });

  it('memilih pengirim otomatis (auto) sesuai nomor asal kontak agar konsumen tidak bingung', async () => {
    // 2 nomor fiktif yang tidak ada di DB dan bukan kru
    const targets = [
      { phone: '089900000001', name: 'Calon A', wilayah: 'Blok Tabroni', source: 'hp_admin' as const },
      { phone: '089900000002', name: 'Calon B', wilayah: 'Blok Sasak', source: 'hp_petugas' as const },
    ];

    const result = await sendBlastWaWithRouting({
      targets,
      messageTemplate: 'Halo {nama} di {wilayah}, daftar di {link_daftar}',
      senderMode: 'auto',
      dryRun: true,
    });

    expect(result.totalRequested).toBe(2);
    expect(result.totalSent).toBe(2);
    expect(result.details[0].senderUsed).toBe(DEVICE_CONFIG.admin.phone); // Dari HP Admin
    expect(result.details[1].senderUsed).toBe(DEVICE_CONFIG.petugas.phone); // Dari HP Petugas
  });

  it('memaksa senderMode spesifik jika superadmin memilih HP Admin atau HP Petugas', async () => {
    const target = { phone: '089900000003', name: 'Calon C', wilayah: 'Blok Pete', source: 'hp_petugas' as const };

    const resultAdmin = await sendBlastWaWithRouting({
      targets: [target],
      messageTemplate: 'Halo {nama}',
      senderMode: 'hp_admin',
      dryRun: true,
    });
    expect(resultAdmin.details[0].senderUsed).toBe(DEVICE_CONFIG.admin.phone);

    const resultPetugas = await sendBlastWaWithRouting({
      targets: [target],
      messageTemplate: 'Halo {nama}',
      senderMode: 'hp_petugas',
      dryRun: true,
    });
    expect(resultPetugas.details[0].senderUsed).toBe(DEVICE_CONFIG.petugas.phone);
  });
});

describe('getKontrolContacts - Aggregation and Live Database Matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.pelanggan.findMany as any).mockResolvedValue([
      {
        id: 101,
        nama: 'Nurul Hadi',
        noTelepon: '081284093225',
        kodePelanggan: 'PEL-001',
        status: 'aktif',
        alamat: 'Rmh Putih Tabroni',
        kategori: 'standar',
        customTarif: 50000,
        kelurahan: { nama: 'Jatimulya' },
        wilayah: { nama: 'Blok Tabroni' },
      },
    ]);
    (prisma.petugas.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);
  });

  it('berhasil membaca data kontak dan menyajikan ringkasan kontrol', async () => {
    const data = await getKontrolContacts();
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
    expect(data.contacts.length).toBeGreaterThan(100);

    // Verifikasi ringkasan
    expect(data.summary.totalKontak).toBe(data.contacts.length);
    expect(data.summary.sudahTerdaftar).toBeGreaterThan(0);
    expect(data.summary.belumTerdaftar).toBeGreaterThan(0);
    expect(data.summary.petugasDanKru).toBeGreaterThan(0);

    // Cek properti pada kontak
    const first = data.contacts[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('phone');
    expect(first).toHaveProperty('source');
    expect(first).toHaveProperty('isRegistered');
    expect(first).toHaveProperty('isStaff');

    // Cek bahwa nomor 081284093225 (Nurul Hadi) teridentifikasi sebagai sudah terdaftar
    const nurulHadi = data.contacts.find(c => c.id === '6281284093225');
    expect(nurulHadi).toBeDefined();
    expect(nurulHadi?.isRegistered).toBe(true);
    expect(nurulHadi?.dbInfo?.nama).toBe('Nurul Hadi');
  });
});
