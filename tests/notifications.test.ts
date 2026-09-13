import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  NOTIF_ID,
  NOTIF_ID_PENGUMUMAN,
  REPEAT_IDS,
  buildReminderPlan,
  clampJam,
  diffUnseen,
  formatHm,
  notifPengumuman,
  parseHm,
  parsePrefs,
  pruneSeen,
  serializePrefs,
  tanggalLokal,
  type NotifPrefs,
} from "@/lib/notifications";

const prefs = (over: Partial<NotifPrefs> = {}): NotifPrefs => ({
  ...DEFAULT_PREFS,
  jamAbsen: { ...DEFAULT_PREFS.jamAbsen },
  jamJadwal: { ...DEFAULT_PREFS.jamJadwal },
  ...over,
});

describe("ID notifikasi", () => {
  it("tidak saling bertabrakan", () => {
    const semua = [NOTIF_ID.absen, NOTIF_ID.jadwal, NOTIF_ID.tes, ...NOTIF_ID_PENGUMUMAN];
    expect(new Set(semua).size).toBe(semua.length);
  });

  it("hanya pengingat harian yang masuk daftar batalkan", () => {
    expect([...REPEAT_IDS].sort()).toEqual([NOTIF_ID.absen, NOTIF_ID.jadwal].sort());
    expect(REPEAT_IDS).not.toContain(NOTIF_ID.tes);
    for (const id of NOTIF_ID_PENGUMUMAN) expect(REPEAT_IDS).not.toContain(id);
  });

  it("semua id berupa bilangan bulat positif (syarat plugin Android)", () => {
    for (const id of [NOTIF_ID.absen, NOTIF_ID.jadwal, NOTIF_ID.tes, ...NOTIF_ID_PENGUMUMAN]) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    }
  });
});

describe("clampJam", () => {
  it("menerima jam valid", () => {
    expect(clampJam({ hour: 0, minute: 0 }, { hour: 1, minute: 1 })).toEqual({ hour: 0, minute: 0 });
    expect(clampJam({ hour: 23, minute: 59 }, { hour: 1, minute: 1 })).toEqual({ hour: 23, minute: 59 });
  });

  it("menolak nilai di luar rentang dan tipe salah", () => {
    const fb = { hour: 6, minute: 30 };
    expect(clampJam({ hour: 24, minute: 0 }, fb)).toEqual(fb);
    expect(clampJam({ hour: -1, minute: 0 }, fb)).toEqual(fb);
    expect(clampJam({ hour: 6, minute: 60 }, fb)).toEqual(fb);
    expect(clampJam({ hour: 6.5, minute: 0 }, fb)).toEqual(fb);
    expect(clampJam({ hour: "6", minute: "30" }, fb)).toEqual(fb);
    expect(clampJam(null, fb)).toEqual(fb);
    expect(clampJam([], fb)).toEqual(fb);
    expect(clampJam("06:30", fb)).toEqual(fb);
  });
});

describe("parsePrefs", () => {
  it("null / kosong / JSON rusak → default", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("   ")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{rusak")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("null")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("[]")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("42")).toEqual(DEFAULT_PREFS);
  });

  it("default aktif (agar pengingat tidak mati diam-diam)", () => {
    expect(DEFAULT_PREFS.enabled).toBe(true);
    expect(DEFAULT_PREFS.absen).toBe(true);
    expect(DEFAULT_PREFS.jadwal).toBe(true);
    expect(DEFAULT_PREFS.pengumuman).toBe(true);
  });

  it("tidak membagikan referensi objek dengan DEFAULT_PREFS", () => {
    const a = parsePrefs(null);
    a.jamAbsen.hour = 23;
    expect(DEFAULT_PREFS.jamAbsen.hour).toBe(6);
    expect(parsePrefs(null).jamAbsen.hour).toBe(6);
  });

  it("membaca nilai yang valid", () => {
    const raw = serializePrefs(
      prefs({ enabled: false, absen: false, jamAbsen: { hour: 5, minute: 15 }, jamJadwal: { hour: 7, minute: 0 } })
    );
    const hasil = parsePrefs(raw);
    expect(hasil.enabled).toBe(false);
    expect(hasil.absen).toBe(false);
    expect(hasil.jadwal).toBe(true);
    expect(hasil.jamAbsen).toEqual({ hour: 5, minute: 15 });
    expect(hasil.jamJadwal).toEqual({ hour: 7, minute: 0 });
  });

  it("field hilang atau bertipe salah → default per-field (tidak mati total)", () => {
    const hasil = parsePrefs(JSON.stringify({ enabled: "ya", absen: 1, jamAbsen: "06:30", jamJadwal: { hour: 99 } }));
    expect(hasil.enabled).toBe(true);
    expect(hasil.absen).toBe(true);
    expect(hasil.pengumuman).toBe(true);
    expect(hasil.jamAbsen).toEqual(DEFAULT_PREFS.jamAbsen);
    expect(hasil.jamJadwal).toEqual(DEFAULT_PREFS.jamJadwal);
  });

  it("survive round-trip serialize → parse", () => {
    const asli = prefs({ pengumuman: false, jamJadwal: { hour: 4, minute: 5 } });
    expect(parsePrefs(serializePrefs(asli))).toEqual(asli);
  });
});

describe("parseHm / formatHm", () => {
  it("memformat dengan nol di depan", () => {
    expect(formatHm({ hour: 6, minute: 0 })).toBe("06:00");
    expect(formatHm({ hour: 0, minute: 0 })).toBe("00:00");
    expect(formatHm({ hour: 23, minute: 59 })).toBe("23:59");
  });

  it("membaca format dari input time", () => {
    expect(parseHm("06:30")).toEqual({ hour: 6, minute: 30 });
    expect(parseHm("6:30")).toEqual({ hour: 6, minute: 30 });
    expect(parseHm(" 00:00 ")).toEqual({ hour: 0, minute: 0 });
    expect(parseHm("23:59")).toEqual({ hour: 23, minute: 59 });
  });

  it("menolak nilai tidak masuk akal", () => {
    expect(parseHm("")).toBeNull();
    expect(parseHm("abc")).toBeNull();
    expect(parseHm("25:00")).toBeNull();
    expect(parseHm("12:60")).toBeNull();
    expect(parseHm("-1:00")).toBeNull();
    expect(parseHm("6")).toBeNull();
    expect(parseHm("06:30:00")).toBeNull();
  });

  it("round-trip format → parse", () => {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 7, 30, 59]) {
        expect(parseHm(formatHm({ hour: h, minute: m }))).toEqual({ hour: h, minute: m });
      }
    }
  });
});

describe("tanggalLokal", () => {
  it("memakai tanggal lokal, bukan UTC", () => {
    // 1 Jan 2026 pukul 05:00 waktu setempat → tetap 2026-01-01.
    expect(tanggalLokal(new Date(2026, 0, 1, 5, 0, 0))).toBe("2026-01-01");
    expect(tanggalLokal(new Date(2026, 8, 9, 23, 59, 0))).toBe("2026-09-09");
  });

  it("memberi nol di depan bulan dan tanggal", () => {
    expect(tanggalLokal(new Date(2026, 2, 4))).toBe("2026-03-04");
  });

  it("tidak memakai format ISO UTC (bisa meleset 1 hari)", () => {
    // Dibuat dari komponen lokal; bila salah memakai toISOString() hasilnya
    // bergeser untuk zona waktu positif.
    const d = new Date(2026, 0, 1, 0, 30, 0);
    expect(tanggalLokal(d)).toBe("2026-01-01");
  });
});

describe("buildReminderPlan", () => {
  const dasar = { sudahAbsenHariIni: false, tugasHariIni: 5 };

  it("tidak memasang apa pun bila saklar utama mati", () => {
    expect(buildReminderPlan({ prefs: prefs({ enabled: false }), ...dasar })).toEqual([]);
  });

  it("memasang absen + jadwal saat keduanya relevan", () => {
    const plan = buildReminderPlan({ prefs: prefs(), ...dasar });
    expect(plan.map((p) => p.id)).toEqual([NOTIF_ID.jadwal, NOTIF_ID.absen]); // 06:00 sebelum 06:30
    expect(plan[0].page).toBe("/m/angkut");
    expect(plan[1].page).toBe("/m/absen");
  });

  it("melewatkan pengingat absen bila sudah absen hari ini", () => {
    const plan = buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: true, tugasHariIni: 5 });
    expect(plan.map((p) => p.id)).toEqual([NOTIF_ID.jadwal]);
  });

  it("melewatkan ringkasan tugas bila tidak ada tugas (hindari notifikasi kosong)", () => {
    const plan = buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: false, tugasHariIni: 0 });
    expect(plan.map((p) => p.id)).toEqual([NOTIF_ID.absen]);
  });

  it("kosong bila sudah absen dan tidak ada tugas", () => {
    expect(buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: true, tugasHariIni: 0 })).toEqual([]);
  });

  it("menghormati saklar per-jenis", () => {
    expect(buildReminderPlan({ prefs: prefs({ absen: false }), ...dasar }).map((p) => p.id)).toEqual([NOTIF_ID.jadwal]);
    expect(buildReminderPlan({ prefs: prefs({ jadwal: false }), ...dasar }).map((p) => p.id)).toEqual([NOTIF_ID.absen]);
    expect(buildReminderPlan({ prefs: prefs({ absen: false, jadwal: false }), ...dasar })).toEqual([]);
  });

  it("memakai jam yang dikonfigurasi", () => {
    const plan = buildReminderPlan({
      prefs: prefs({ jamAbsen: { hour: 7, minute: 45 }, jamJadwal: { hour: 4, minute: 5 } }),
      ...dasar,
    });
    const jadwal = plan.find((p) => p.id === NOTIF_ID.jadwal);
    const absen = plan.find((p) => p.id === NOTIF_ID.absen);
    expect([jadwal?.hour, jadwal?.minute]).toEqual([4, 5]);
    expect([absen?.hour, absen?.minute]).toEqual([7, 45]);
  });

  it("mengurutkan berdasarkan jam", () => {
    const plan = buildReminderPlan({
      prefs: prefs({ jamAbsen: { hour: 3, minute: 0 }, jamJadwal: { hour: 9, minute: 0 } }),
      ...dasar,
    });
    expect(plan.map((p) => p.id)).toEqual([NOTIF_ID.absen, NOTIF_ID.jadwal]);
  });

  it("menyertakan jumlah pelanggan pada pesan", () => {
    const plan = buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: true, tugasHariIni: 12 });
    expect(plan[0].body).toContain("12");
  });

  it("menyertakan nama armada hanya bila ada isinya", () => {
    const dengan = buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: true, tugasHariIni: 3, namaArmada: "B 1234 XYZ" });
    expect(dengan[0].body).toContain("(B 1234 XYZ)");

    for (const kosong of [null, undefined, "", "   "]) {
      const tanpa = buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: true, tugasHariIni: 3, namaArmada: kosong });
      expect(tanpa[0].body).not.toContain("(");
    }
  });

  it("memangkas spasi nama armada", () => {
    const plan = buildReminderPlan({ prefs: prefs(), sudahAbsenHariIni: true, tugasHariIni: 1, namaArmada: "  B 9 ZZ  " });
    expect(plan[0].body).toContain("(B 9 ZZ)");
  });
});

describe("diffUnseen", () => {
  it("menyaring id yang sudah dilihat", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(diffUnseen(["2"], items).map((i) => i.id)).toEqual([1, 3]);
  });

  it("mengembalikan semua bila daftar seen kosong", () => {
    expect(diffUnseen([], [{ id: 9 }])).toHaveLength(1);
  });

  it("membandingkan sebagai string (id API vs localStorage)", () => {
    expect(diffUnseen(["7"], [{ id: 7 }])).toEqual([]);
  });

  it("mempertahankan urutan masukan", () => {
    const items = [{ id: 10 }, { id: 4 }, { id: 6 }];
    expect(diffUnseen([], items).map((i) => i.id)).toEqual([10, 4, 6]);
  });
});

describe("pruneSeen", () => {
  it("mendahulukan id baru dan tidak menduplikasi", () => {
    expect(pruneSeen(["a", "b"], ["c", "a"])).toEqual(["c", "a", "b"]);
  });

  it("membatasi jumlah simpanan", () => {
    const hasil = pruneSeen(["a", "b", "c"], ["d"], 2);
    expect(hasil).toEqual(["d", "a"]);
    expect(hasil).toHaveLength(2);
  });

  it("tidak menghapus id baru walau melebihi batas", () => {
    expect(pruneSeen([], ["x", "y"], 5)).toEqual(["x", "y"]);
  });

  it("aman untuk daftar kosong", () => {
    expect(pruneSeen([], [])).toEqual([]);
  });

  it("menjaga ukuran wajar saat dipakai berulang", () => {
    let seen: string[] = [];
    for (let i = 0; i < 500; i++) seen = pruneSeen(seen, [String(i)]);
    expect(seen.length).toBe(200);
    expect(seen[0]).toBe("499"); // terbaru di depan
  });
});

describe("notifPengumuman", () => {
  it("memakai judul pengumuman", () => {
    expect(notifPengumuman({ id: 1, judul: "Pemadaman TPA", isi: "Besok tutup." }).title).toBe("Pemadaman TPA");
  });

  it("menandai pengumuman penting", () => {
    expect(notifPengumuman({ id: 1, judul: "Pemadaman TPA", isi: "x", penting: true }).title).toBe("Penting: Pemadaman TPA");
  });

  it("memberi judul cadangan bila judul kosong", () => {
    expect(notifPengumuman({ id: 1, judul: "   ", isi: "x" }).title).toBe("Pengumuman baru");
  });

  it("merapikan spasi & baris baru pada isi", () => {
    expect(notifPengumuman({ id: 1, judul: "A", isi: "baris satu\n\n  baris   dua " }).body).toBe("baris satu baris dua");
  });

  it("memotong isi panjang dengan elipsis", () => {
    const body = notifPengumuman({ id: 1, judul: "A", isi: "x".repeat(400) }).body;
    expect(body.length).toBeLessThanOrEqual(120);
    expect(body.endsWith("…")).toBe(true);
  });

  it("tidak menambah elipsis untuk isi pendek", () => {
    expect(notifPengumuman({ id: 1, judul: "A", isi: "pendek" }).body).toBe("pendek");
  });

  it("aman bila isi kosong / bukan string", () => {
    expect(notifPengumuman({ id: 1, judul: "A", isi: "" }).body).toBe("");
    expect(notifPengumuman({ id: 1, judul: "A", isi: undefined as unknown as string }).body).toBe("");
  });
});
