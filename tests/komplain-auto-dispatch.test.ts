import { describe, expect, it } from "vitest";
import {
  templateDisposisiKomplainPetugas,
  templateKonfirmasiPengaduanPelanggan,
} from "@/lib/wa";

describe("Pengaduan & Auto-Dispatch Driver Lifecycle", () => {
  type PelangganMock = {
    id: number;
    nama: string;
    noTelepon: string;
    kodePelanggan: string;
    jadwal?: Array<{
      aktif: boolean;
      rute?: {
        nama: string;
        petugas?: { id: number; nama: string; noTelepon: string; aktif: boolean } | null;
        kendaraan?: { nama: string; platNomor: string } | null;
      } | null;
    }>;
    wilayah?: {
      zona?: {
        petugas?: Array<{
          petugas?: { id: number; nama: string; noTelepon: string; aktif: boolean } | null;
        }>;
      } | null;
    } | null;
  };

  type KomplainMock = {
    id: number;
    pelangganId: number;
    jenis: string;
    deskripsi: string;
    status: string;
    createdAt: Date;
  };

  function checkAntiDoubleComplaint(
    existingKomplains: KomplainMock[],
    pelangganId: number,
    jenis: string,
    deskripsi: string,
    now: Date = new Date()
  ): { allowed: boolean; reason?: string; activeTicketId?: number } {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Cek tiket aktif (baru / proses)
    const active = existingKomplains.find(
      (k) =>
        k.pelangganId === pelangganId &&
        ["baru", "proses", "diproses"].includes(k.status) &&
        k.createdAt >= twentyFourHoursAgo
    );
    if (active) {
      return {
        allowed: false,
        reason: `Tiket aktif #KMP-${active.id} masih dalam penanganan`,
        activeTicketId: active.id,
      };
    }

    // 2. Cek duplikasi isi laporan
    const duplicate = existingKomplains.find(
      (k) =>
        k.pelangganId === pelangganId &&
        k.jenis === jenis &&
        k.deskripsi === deskripsi &&
        k.createdAt >= twentyFourHoursAgo
    );
    if (duplicate) {
      return {
        allowed: false,
        reason: `Pengaduan yang sama persis telah terdaftar sebelumnya (#KMP-${duplicate.id})`,
        activeTicketId: duplicate.id,
      };
    }

    return { allowed: true };
  }

  function resolveDriverForPelanggan(p: PelangganMock): {
    assignedPetugas: { id: number; nama: string; noTelepon: string } | null;
    namaArmada: string | null;
  } {
    let assignedPetugas: { id: number; nama: string; noTelepon: string } | null = null;
    let namaArmada: string | null = null;

    // Prioritas 1: Petugas rute aktif
    const rutePetugas = p.jadwal?.[0]?.rute?.petugas;
    if (rutePetugas && rutePetugas.aktif && rutePetugas.noTelepon) {
      assignedPetugas = rutePetugas;
      namaArmada = p.jadwal?.[0]?.rute?.kendaraan?.nama || p.jadwal?.[0]?.rute?.nama || null;
      return { assignedPetugas, namaArmada };
    }

    // Prioritas 2: Petugas zona
    const zonaList = p.wilayah?.zona?.petugas;
    const zp = zonaList?.find((item) => item.petugas?.aktif && item.petugas?.noTelepon)?.petugas;
    if (zp) {
      assignedPetugas = zp;
      return { assignedPetugas, namaArmada: null };
    }

    return { assignedPetugas: null, namaArmada: null };
  }

  it("mencegah pengaduan ganda jika warga masih memiliki tiket aktif berstatus baru atau proses", () => {
    const now = new Date("2026-11-26T10:00:00Z");
    const existing: KomplainMock[] = [
      {
        id: 101,
        pelangganId: 5,
        jenis: "tidak_diangkut",
        deskripsi: "Sampah belum diangkut dari tadi pagi",
        status: "proses",
        createdAt: new Date("2026-11-26T08:00:00Z"),
      },
    ];

    const result = checkAntiDoubleComplaint(
      existing,
      5,
      "sampah_menumpuk",
      "Sampah bau menyengat",
      now
    );

    expect(result.allowed).toBe(false);
    expect(result.activeTicketId).toBe(101);
    expect(result.reason).toContain("#KMP-101");
  });

  it("mengizinkan pengaduan baru jika tiket sebelumnya sudah berstatus selesai", () => {
    const now = new Date("2026-11-26T14:00:00Z");
    const existing: KomplainMock[] = [
      {
        id: 99,
        pelangganId: 5,
        jenis: "tidak_diangkut",
        deskripsi: "Laporan lama kemarin",
        status: "selesai",
        createdAt: new Date("2026-11-25T08:00:00Z"),
      },
    ];

    const result = checkAntiDoubleComplaint(
      existing,
      5,
      "tidak_diangkut",
      "Laporan baru hari ini",
      now
    );

    expect(result.allowed).toBe(true);
  });

  it("berhasil melakukan resolusi petugas/driver armada penanggung jawab rute secara otomatis", () => {
    const pelanggan: PelangganMock = {
      id: 12,
      nama: "Pak Joko",
      noTelepon: "081234567890",
      kodePelanggan: "081234567890",
      jadwal: [
        {
          aktif: true,
          rute: {
            nama: "Rute Kalibaru 01",
            petugas: {
              id: 7,
              nama: "Bang Supri",
              noTelepon: "085712345678",
              aktif: true,
            },
            kendaraan: {
              nama: "Armada Dump Truck 03",
              platNomor: "B 1234 HER",
            },
          },
        },
      ],
    };

    const resolved = resolveDriverForPelanggan(pelanggan);
    expect(resolved.assignedPetugas?.nama).toBe("Bang Supri");
    expect(resolved.assignedPetugas?.noTelepon).toBe("085712345678");
    expect(resolved.namaArmada).toBe("Armada Dump Truck 03");
  });

  it("membuat template pesan disposisi lengkap dengan Google Maps dan tautan PDF peta/foto rumah", () => {
    const payload = {
      idKomplain: 142,
      namaPetugas: "Bang Supri",
      namaPelanggan: "Ibu Siti",
      kodePelanggan: "081299887766",
      noTeleponPelanggan: "081299887766",
      alamatPelanggan: "Jl. Kandang Ayam RT 02 / RW 05",
      patokanLokasi: "Rumah pagar hitam samping warung",
      zonaWilayah: "Zona Kalibaru",
      googleMapsUrl: "https://www.google.com/maps?q=-6.4248,106.8326",
      petaPdfUrl: "https://upsheru.com/api/pelanggan/12/peta-pdf?t=valid_token",
      fotoKeluhanUrl: "https://upsheru.com/uploads/bukti123.jpg",
      jenisKomplain: "Sampah Tidak Diangkut",
      deskripsi: "Tong sampah depan rumah belum terangkut",
      catatanAdmin: "Armada Penjemput: Armada 03",
      waktuKomplain: new Date("2026-11-26T09:00:00Z"),
    };

    const t = templateDisposisiKomplainPetugas(payload);

    expect(t.judul).toContain("#KMP-142");
    expect(t.pesan).toContain("Bang Supri");
    expect(t.pesan).toContain("Ibu Siti");
    expect(t.pesan).toContain("https://www.google.com/maps?q=-6.4248,106.8326");
    expect(t.pesan).toContain("https://upsheru.com/api/pelanggan/12/peta-pdf?t=valid_token");
    expect(t.pesan).toContain("https://upsheru.com/uploads/bukti123.jpg");
  });

  it("membuat template pesan konfirmasi penerimaan tiket kepada warga pelapor", () => {
    const t = templateKonfirmasiPengaduanPelanggan({
      tiketId: 142,
      namaPelanggan: "Ibu Siti",
      jenisPengaduan: "Sampah Tidak Diangkut",
      deskripsi: "Tong sampah depan rumah belum terangkut",
      namaPetugas: "Bang Supri (Armada 03)",
      namaMitra: "UPS HERU",
    });

    expect(t.judul).toContain("#KMP-142");
    expect(t.pesan).toContain("Ibu Siti");
    expect(t.pesan).toContain("#KMP-142");
    expect(t.pesan).toContain("Bang Supri (Armada 03)");
    expect(t.pesan).toContain("/pengaduan");
  });
});
