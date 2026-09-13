/**
 * Keputusan notifikasi APK O2W Lapangan.
 *
 * Modul ini SENGAJA murni (tanpa import Capacitor / DOM) supaya:
 *  - keputusan "notifikasi apa yang dipasang" terpisah dari "cara memasangnya",
 *  - bisa diuji vitest di Node tanpa perangkat Android.
 *
 * Eksekusi native-nya ada di `src/components/mobile/NotificationBridge.tsx`.
 *
 * Perilaku plugin (@capacitor/local-notifications 7.0.7) — dibaca langsung dari
 * sumber Android-nya, bukan diasumsikan:
 *  - `schedule.on = { hour, minute }` MENGULANG SENDIRI tiap hari. Saat alarm
 *    berbunyi, TimedNotificationPublisher menyimpan cron dan menghitung trigger
 *    berikutnya. Jadi `repeats` TIDAK diperlukan untuk jadwal harian —
 *    `repeats` hanya dihormati pada jalur `schedule.at`.
 *  - Alarm dipulihkan otomatis setelah HP restart
 *    (LocalNotificationRestoreReceiver menangani BOOT_COMPLETED).
 *  - Bila izin exact alarm tidak diberikan, plugin turun ke alarm tidak-eksak
 *    (waktu bisa bergeser beberapa menit) — fitur tetap jalan, tidak error.
 */

/** ID tetap agar penjadwalan ulang bersifat idempoten (pasang = batalkan lalu jadwalkan). */
export const NOTIF_ID = {
  /** Pengingat "sudah absen masuk belum?" — harian. */
  absen: 7101,
  /** Ringkasan jumlah pelanggan rute hari ini — harian. */
  jadwal: 7102,
  /** Notifikasi sekali jalan dari tombol "kirim tes". */
  tes: 7199,
} as const;

/**
 * ID untuk pengumuman yang dikirim SEKETIKA (bukan harian). Satu slot per
 * pengumuman baru dalam satu batch supaya tidak saling menimpa.
 */
export const NOTIF_ID_PENGUMUMAN: readonly number[] = [7104, 7105, 7106];

/** ID yang boleh dibatalkan sebelum dijadwalkan ulang (hanya yang berulang). */
export const REPEAT_IDS: readonly number[] = [NOTIF_ID.absen, NOTIF_ID.jadwal];

export const NOTIF_PREFS_KEY = "o2w.notif.prefs.v1";
export const NOTIF_SEEN_KEY = "o2w.notif.seen.v1";
/** Event window yang dipancarkan halaman pengaturan agar bridge langsung memasang ulang jadwal. */
export const NOTIF_PREFS_EVENT = "o2w:notif-prefs";

export type JamMenit = { hour: number; minute: number };

export type NotifPrefs = {
  /** Saklar utama. false = tidak ada notifikasi sama sekali. */
  enabled: boolean;
  /** Pengingat absen masuk (hanya bila belum absen hari ini). */
  absen: boolean;
  /** Ringkasan tugas angkut hari ini (hanya bila ada tugas). */
  jadwal: boolean;
  /** Pengumuman baru dari admin. */
  pengumuman: boolean;
  jamAbsen: JamMenit;
  jamJadwal: JamMenit;
};

/**
 * Default: fitur AKTIF. Izin sistem tetap harus diberikan pengguna lewat
 * dialog Android — default `enabled: true` hanya berarti bridge akan meminta
 * izin sekali, bukan memasang notifikasi diam-diam.
 */
export const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  absen: true,
  jadwal: true,
  pengumuman: true,
  jamAbsen: { hour: 6, minute: 30 },
  jamJadwal: { hour: 6, minute: 0 },
};

export type ReminderItem = {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
  /** Halaman /m yang dibuka saat notifikasi diketuk. */
  page: string;
};

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickBool(data: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof data[key] === "boolean" ? (data[key] as boolean) : fallback;
}

/** Terima nilai apa pun dari localStorage; selalu kembalikan JamMenit yang valid. */
export function clampJam(value: unknown, fallback: JamMenit): JamMenit {
  if (!isObj(value)) return fallback;
  const hour = Number(value.hour);
  const minute = Number(value.minute);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return fallback;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return fallback;
  return { hour, minute };
}

/**
 * Parsing toleran: JSON rusak, nilai null, atau field yang hilang tidak boleh
 * membuat fitur notifikasi mati total — selalu jatuh ke default per-field.
 */
export function parsePrefs(raw: string | null | undefined): NotifPrefs {
  let data: unknown = null;
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  if (!isObj(data)) return { ...DEFAULT_PREFS, jamAbsen: { ...DEFAULT_PREFS.jamAbsen }, jamJadwal: { ...DEFAULT_PREFS.jamJadwal } };
  return {
    enabled: pickBool(data, "enabled", DEFAULT_PREFS.enabled),
    absen: pickBool(data, "absen", DEFAULT_PREFS.absen),
    jadwal: pickBool(data, "jadwal", DEFAULT_PREFS.jadwal),
    pengumuman: pickBool(data, "pengumuman", DEFAULT_PREFS.pengumuman),
    jamAbsen: clampJam(data.jamAbsen, DEFAULT_PREFS.jamAbsen),
    jamJadwal: clampJam(data.jamJadwal, DEFAULT_PREFS.jamJadwal),
  };
}

export function serializePrefs(prefs: NotifPrefs): string {
  return JSON.stringify(prefs);
}

export function formatHm(jam: JamMenit): string {
  return `${String(jam.hour).padStart(2, "0")}:${String(jam.minute).padStart(2, "0")}`;
}

/** "06:30" → { 6, 30 }. String kosong / "25:00" / "abc" → null. */
export function parseHm(value: string): JamMenit | null {
  const cocok = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!cocok) return null;
  const hour = Number(cocok[1]);
  const minute = Number(cocok[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Tanggal lokal (bukan UTC) dalam format YYYY-MM-DD — dipakai sebagai query `tanggal`. */
export function tanggalLokal(date: Date): string {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, "0");
  const hari = String(date.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

export type ReminderPlanInput = {
  prefs: NotifPrefs;
  /** true = absen masuk hari ini sudah tercatat → pengingat absen tidak perlu dipasang. */
  sudahAbsenHariIni: boolean;
  /** Jumlah pelanggan pada tugas hari ini. 0 = tidak ada rute → tanpa pengingat jadwal. */
  tugasHariIni: number;
  /** Plat/nama armada untuk memperjelas pesan (opsional). */
  namaArmada?: string | null;
};

/**
 * Susun daftar pengingat harian dari keadaan nyata.
 *
 * Sengaja mengembalikan [] bila tidak ada yang perlu diingatkan (sudah absen,
 * tidak ada tugas) — notifikasi yang tidak relevan membuat pengguna mematikan
 * fitur ini.
 */
export function buildReminderPlan(input: ReminderPlanInput): ReminderItem[] {
  const { prefs, sudahAbsenHariIni, tugasHariIni, namaArmada } = input;
  if (!prefs.enabled) return [];

  const items: ReminderItem[] = [];

  if (prefs.jadwal && tugasHariIni > 0) {
    const armada = typeof namaArmada === "string" && namaArmada.trim() !== "" ? ` (${namaArmada.trim()})` : "";
    items.push({
      id: NOTIF_ID.jadwal,
      title: "Jadwal angkut hari ini",
      body: `Ada ${tugasHariIni} pelanggan${armada}. Ketuk untuk mulai rute.`,
      hour: prefs.jamJadwal.hour,
      minute: prefs.jamJadwal.minute,
      page: "/m/angkut",
    });
  }

  if (prefs.absen && !sudahAbsenHariIni) {
    items.push({
      id: NOTIF_ID.absen,
      title: "Jangan lupa absen masuk",
      body: "Absen masuk hari ini belum tercatat. Ketuk untuk absen sekarang.",
      hour: prefs.jamAbsen.hour,
      minute: prefs.jamAbsen.minute,
      page: "/m/absen",
    });
  }

  return items.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

export type SeenItem = { id: number | string };

/** Item yang belum pernah dilihat. Urutan mengikuti urutan masukan. */
export function diffUnseen<T extends SeenItem>(seenIds: readonly string[], items: readonly T[]): T[] {
  const seen = new Set(seenIds);
  return items.filter((item) => !seen.has(String(item.id)));
}

/**
 * Simpan maksimum `max` id: yang baru didahulukan agar tidak terbuang, lalu id
 * lama, tanpa duplikat. Mencegah localStorage tumbuh tanpa batas.
 */
export function pruneSeen(seenIds: readonly string[], baru: readonly string[], max = 200): string[] {
  const hasil: string[] = [];
  const sudah = new Set<string>();
  for (const id of [...baru, ...seenIds]) {
    if (sudah.has(id)) continue;
    sudah.add(id);
    hasil.push(id);
    if (hasil.length >= max) break;
  }
  return hasil;
}

export type PengumumanRingkas = {
  id: number;
  judul: string;
  isi: string;
  penting?: boolean;
};

const BATAS_ISI = 120;

/** Ringkas pengumuman jadi judul + isi notifikasi yang tidak kepanjangan. */
export function notifPengumuman(item: PengumumanRingkas): { title: string; body: string } {
  const judul = typeof item.judul === "string" && item.judul.trim() !== "" ? item.judul.trim() : "Pengumuman baru";
  const isi = typeof item.isi === "string" ? item.isi.replace(/\s+/g, " ").trim() : "";
  return {
    title: item.penting ? `Penting: ${judul}` : judul,
    body: isi.length > BATAS_ISI ? `${isi.slice(0, BATAS_ISI - 1).trimEnd()}…` : isi,
  };
}
