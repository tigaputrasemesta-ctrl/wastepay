import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DAFTAR_HARI,
  tetapkanJadwalDanPetugasPelanggan,
} from "../src/lib/penugasan-jadwal";
import { prisma } from "../src/lib/prisma";

vi.mock("../src/lib/prisma", () => {
  return {
    prisma: {
      rute: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      kendaraan: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      petugas: {
        findUnique: vi.fn(),
      },
      zona: {
        findUnique: vi.fn(),
      },
      kelurahan: {
        findUnique: vi.fn(),
      },
      jadwal: {
        updateMany: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

describe("penugasan-jadwal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DAFTAR_HARI: berisi 7 hari baku dalam bahasa Indonesia", () => {
    expect(DAFTAR_HARI).toEqual([
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
      "Minggu",
    ]);
  });

  it("tetapkanJadwalDanPetugasPelanggan: tidak melakukan aksi bila tidak ada hari dan petugas/rute", async () => {
    await tetapkanJadwalDanPetugasPelanggan({
      pelangganId: 10,
      hari: [],
    });
    expect(prisma.jadwal.upsert).not.toHaveBeenCalled();
    expect(prisma.jadwal.updateMany).not.toHaveBeenCalled();
  });

  it("tetapkanJadwalDanPetugasPelanggan: berhasil menetapkan jadwal multi-hari dengan ruteId yang ada", async () => {
    (prisma.rute.findUnique as any).mockResolvedValue({
      id: 5,
      nama: "Rute Armada 1",
      hari: "Senin, Kamis",
      petugasId: 2,
    });

    await tetapkanJadwalDanPetugasPelanggan({
      pelangganId: 10,
      ruteId: 5,
      petugasId: 2,
      hari: ["Senin", "Rabu", "Jumat"],
      jam: "08:30",
    });

    // Harus menonaktifkan jadwal lama yang bukan hari terpilih
    expect(prisma.jadwal.updateMany).toHaveBeenCalledWith({
      where: {
        pelangganId: 10,
        OR: [
          { ruteId: { not: 5 } },
          { hari: { notIn: ["Senin", "Rabu", "Jumat"] } },
        ],
      },
      data: { aktif: false },
    });

    // Harus melakukan upsert untuk masing-masing 3 hari yang dipilih
    expect(prisma.jadwal.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.jadwal.upsert).toHaveBeenCalledWith({
      where: {
        pelangganId_ruteId_hari: {
          pelangganId: 10,
          ruteId: 5,
          hari: "Senin",
        },
      },
      create: {
        pelangganId: 10,
        ruteId: 5,
        hari: "Senin",
        jam: "08:30",
        aktif: true,
      },
      update: {
        aktif: true,
        jam: "08:30",
      },
    });
  });

  it("tetapkanJadwalDanPetugasPelanggan: auto-link rute bila hanya petugasId yang dipilih", async () => {
    (prisma.rute.findFirst as any).mockResolvedValue({
      id: 8,
      nama: "Rute Petugas Budi",
      hari: "Selasa, Sabtu",
      petugasId: 3,
    });

    await tetapkanJadwalDanPetugasPelanggan({
      pelangganId: 15,
      petugasId: 3,
      zonaId: 2,
      hari: ["Selasa", "Kamis"],
    });

    expect(prisma.jadwal.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.jadwal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          pelangganId_ruteId_hari: {
            pelangganId: 15,
            ruteId: 8,
            hari: "Selasa",
          },
        },
      })
    );
  });

  it("tetapkanJadwalDanPetugasPelanggan: berhasil auto-link ke rute armada mobil bila kendaraanId dipilih", async () => {
    (prisma.rute.findFirst as any).mockResolvedValue({
      id: 12,
      nama: "Rute Armada Dump Truck 01",
      hari: "Senin, Kamis",
      kendaraanId: 7,
    });

    await tetapkanJadwalDanPetugasPelanggan({
      pelangganId: 20,
      kendaraanId: 7,
      zonaId: 1,
      hari: ["Senin", "Kamis"],
    });

    expect(prisma.jadwal.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.jadwal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          pelangganId_ruteId_hari: {
            pelangganId: 20,
            ruteId: 12,
            hari: "Senin",
          },
        },
      })
    );
  });

  it("tetapkanJadwalDanPetugasPelanggan: auto-generate rute armada baru jika armada belum memiliki rute", async () => {
    (prisma.rute.findFirst as any).mockResolvedValue(null);
    (prisma.kendaraan.findUnique as any).mockResolvedValue({
      id: 9,
      nama: "Pickup 02",
      platNomor: "B 1234 CD",
      petugasId: 4,
    });
    (prisma.zona.findUnique as any).mockResolvedValue({
      id: 3,
      nama: "Zona Beji Barat",
    });
    (prisma.rute.create as any).mockResolvedValue({
      id: 99,
      nama: "Rute Armada Pickup 02 (B 1234 CD) - Zona Beji Barat",
      kendaraanId: 9,
      hari: "Rabu, Sabtu",
    });

    await tetapkanJadwalDanPetugasPelanggan({
      pelangganId: 25,
      kendaraanId: 9,
      zonaId: 3,
      hari: ["Rabu", "Sabtu"],
    });

    expect(prisma.rute.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kendaraanId: 9,
          nama: expect.stringContaining("Pickup 02 (B 1234 CD) - Zona Beji Barat"),
        }),
      })
    );
    expect(prisma.jadwal.upsert).toHaveBeenCalledTimes(2);
  });
});
