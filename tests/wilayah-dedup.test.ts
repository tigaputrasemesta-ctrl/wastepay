import { describe, expect, it } from "vitest";

// Pure normalization helper matching src/app/api/wilayah/dedup/route.ts
function normalizeName(nama: string): string {
  return nama.trim().replace(/\s+/g, " ").toLowerCase();
}

type MockWilayah = {
  id: number;
  nama: string;
  kelurahanId: number | null;
  kelurahanName: string;
  pelangganCount: number;
  petugasCount: number;
  ruteCount: number;
};

function groupAndFindDuplicates(wilayahList: MockWilayah[]) {
  const groups = new Map<string, MockWilayah[]>();

  for (const w of wilayahList) {
    const key = `${w.kelurahanId ?? 0}:::${normalizeName(w.nama)}`;
    const list = groups.get(key) || [];
    list.push(w);
    groups.set(key, list);
  }

  type DuplicateResult = {
    canonical: MockWilayah;
    duplicateIds: number[];
    totalRemoved: number;
  };
  const duplicateGroups: DuplicateResult[] = [];

  for (const [, members] of groups.entries()) {
    if (members.length > 1) {
      const sorted = [...members].sort((a, b) => {
        if (b.pelangganCount !== a.pelangganCount) {
          return b.pelangganCount - a.pelangganCount;
        }
        if (b.petugasCount !== a.petugasCount) {
          return b.petugasCount - a.petugasCount;
        }
        if (b.ruteCount !== a.ruteCount) {
          return b.ruteCount - a.ruteCount;
        }
        return a.id - b.id;
      });

      const canonical = sorted[0];
      const duplicates = sorted.slice(1);

      duplicateGroups.push({
        canonical,
        duplicateIds: duplicates.map((d) => d.id),
        totalRemoved: duplicates.length,
      });
    }
  }

  return duplicateGroups;
}

describe("Wilayah Domain & Deduplication Logic", () => {
  it("normalisasi nama menangani spasi berlebih dan huruf besar/kecil", () => {
    expect(normalizeName("BLOK BAKUNG")).toBe("blok bakung");
    expect(normalizeName("  blok   bakung  ")).toBe("blok bakung");
    expect(normalizeName("BLOK H PUAH")).toBe("blok h puah");
  });

  it("membedakan blok pickup dengan nama sama di kelurahan berbeda", () => {
    const list: MockWilayah[] = [
      {
        id: 1,
        nama: "BLOK BAKUNG",
        kelurahanId: 10, // Kalibaru
        kelurahanName: "Kalibaru",
        pelangganCount: 5,
        petugasCount: 1,
        ruteCount: 1,
      },
      {
        id: 2,
        nama: "BLOK BAKUNG",
        kelurahanId: 20, // Cilodong
        kelurahanName: "Cilodong",
        pelangganCount: 3,
        petugasCount: 1,
        ruteCount: 1,
      },
    ];

    const dupes = groupAndFindDuplicates(list);
    // Tidak boleh dianggap duplikat karena berada di kelurahan berbeda!
    expect(dupes.length).toBe(0);
  });

  it("mendeteksi 11 record BLOK BAKUNG di Kalibaru dan memilih canonical dengan pelanggan terbanyak", () => {
    const list: MockWilayah[] = [
      { id: 101, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 102, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 103, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 8, petugasCount: 1, ruteCount: 1 }, // Paling banyak pelanggan!
      { id: 104, nama: "blok bakung", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 105, nama: " BLOK  BAKUNG ", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 106, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 107, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 108, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 109, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 110, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 111, nama: "BLOK BAKUNG", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
    ];

    const dupes = groupAndFindDuplicates(list);
    expect(dupes.length).toBe(1);
    expect(dupes[0].canonical.id).toBe(103); // Record 103 dipertahankan
    expect(dupes[0].totalRemoved).toBe(10); // 10 record duplikat dihapus
    expect(dupes[0].duplicateIds).toEqual([101, 102, 104, 105, 106, 107, 108, 109, 110, 111]);
  });

  it("jika jumlah pelanggan sama-sama nol, memilih record tertua (ID terkecil)", () => {
    const list: MockWilayah[] = [
      { id: 50, nama: "BLOK H PUAH", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
      { id: 55, nama: "BLOK H PUAH", kelurahanId: 10, kelurahanName: "Kalibaru", pelangganCount: 0, petugasCount: 0, ruteCount: 0 },
    ];

    const dupes = groupAndFindDuplicates(list);
    expect(dupes.length).toBe(1);
    expect(dupes[0].canonical.id).toBe(50);
    expect(dupes[0].duplicateIds).toEqual([55]);
  });
});
