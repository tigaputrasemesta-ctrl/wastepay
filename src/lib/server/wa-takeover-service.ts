import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface TakeoverEntry {
  sender: string;
  pausedUntil: number; // Timestamp ms saat bot boleh bangun lagi
  reason: "requested_admin" | "admin_chatting" | "manual_pause";
  lastMessage?: string;
  updatedAt: number;
}

export interface MenuSendEntry {
  sender: string;
  lastFullMenuSentAt: number;
}

interface BotStateStore {
  takeovers: Record<string, TakeoverEntry>;
  menuSends: Record<string, MenuSendEntry>;
}

// In-Memory cache untuk respon ultra-cepat (< 0.1ms)
const takeoverMap = new Map<string, TakeoverEntry>();
const menuSendMap = new Map<string, MenuSendEntry>();

let isInitialized = false;

function getStoreFilePath(): string {
  const dir = join(process.cwd(), "public", "uploads");
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Ignore folder creation error in read-only / test env
  }
  return join(dir, "wa_bot_state.json");
}

function normalizeKey(sender: string): string {
  let digits = String(sender || "").replace(/\D/g, "");
  if (digits.startsWith("62")) {
    digits = "0" + digits.slice(2);
  } else if (digits.length >= 9 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }
  return digits;
}

/**
 * Reset state in-memory (khusus untuk testing agar test suite deterministik).
 */
export function clearTakeoverStateForTest(): void {
  takeoverMap.clear();
  menuSendMap.clear();
  isInitialized = true;
}

/**
 * Muat data persisten dari file jika tersedia (survive Docker restart).
 */
function initFromDisk(): void {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const filePath = getStoreFilePath();
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw) as BotStateStore;
      const now = Date.now();

      if (data.takeovers) {
        for (const [k, v] of Object.entries(data.takeovers)) {
          if (v && v.pausedUntil > now) {
            takeoverMap.set(k, v);
          }
        }
      }

      if (data.menuSends) {
        for (const [k, v] of Object.entries(data.menuSends)) {
          if (v) {
            menuSendMap.set(k, v);
          }
        }
      }
    }
  } catch (err) {
    console.error("Gagal memuat wa_bot_state dari disk:", err);
  }
}

/**
 * Simpan state terkini ke disk secara aman.
 */
function persistToDisk(): void {
  try {
    const filePath = getStoreFilePath();
    const takeovers: Record<string, TakeoverEntry> = {};
    const menuSends: Record<string, MenuSendEntry> = {};

    const now = Date.now();
    for (const [k, v] of takeoverMap.entries()) {
      if (v.pausedUntil > now) {
        takeovers[k] = v;
      }
    }

    for (const [k, v] of menuSendMap.entries()) {
      // Simpan riwayat pengiriman menu maksimal 48 jam
      if (now - v.lastFullMenuSentAt < 48 * 3600 * 1000) {
        menuSends[k] = v;
      }
    }

    const payload: BotStateStore = { takeovers, menuSends };
    writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    // Graceful fallback jika filesystem read-only di serverless
  }
}

/**
 * Memeriksa apakah kontak sedang dalam mode Human Takeover (Bot Tidur).
 */
export function isTakeoverActive(sender: string): boolean {
  initFromDisk();
  const key = normalizeKey(sender);
  if (!key) return false;

  const entry = takeoverMap.get(key);
  if (!entry) return false;

  if (Date.now() >= entry.pausedUntil) {
    takeoverMap.delete(key);
    return false;
  }

  return true;
}

/**
 * Mendapatkan detail status takeover untuk nomor tertentu.
 */
export function getTakeoverInfo(sender: string): {
  active: boolean;
  remainingMinutes: number;
  reason?: string;
  pausedUntilDate?: string;
} {
  initFromDisk();
  const key = normalizeKey(sender);
  const entry = takeoverMap.get(key);

  if (!entry || Date.now() >= entry.pausedUntil) {
    if (entry) takeoverMap.delete(key);
    return { active: false, remainingMinutes: 0 };
  }

  const remainingMs = Math.max(0, entry.pausedUntil - Date.now());
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
  const pausedUntilDate = new Date(entry.pausedUntil).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  return {
    active: true,
    remainingMinutes,
    reason: entry.reason,
    pausedUntilDate,
  };
}

/**
 * Mengaktifkan mode Human Takeover: Bot TIDUR selama durasi jam yang ditentukan.
 * @param sender Nomor telepon pelanggan
 * @param durationHours Lama bot tidur (default 12 jam)
 * @param reason Alasan takeover
 * @param lastMessage Pesan terakhir yang memicu
 */
export function setTakeover(
  sender: string,
  durationHours = 12,
  reason: TakeoverEntry["reason"] = "requested_admin",
  lastMessage?: string
): void {
  initFromDisk();
  const key = normalizeKey(sender);
  if (!key) return;

  const pausedUntil = Date.now() + durationHours * 3600 * 1000;
  const entry: TakeoverEntry = {
    sender: key,
    pausedUntil,
    reason,
    lastMessage: lastMessage ? lastMessage.substring(0, 150) : undefined,
    updatedAt: Date.now(),
  };

  takeoverMap.set(key, entry);
  persistToDisk();
}

/**
 * Membangunkan kembali bot secara manual (misal jika pelanggan kirim '#bot' atau admin klik release).
 */
export function releaseTakeover(sender: string): boolean {
  initFromDisk();
  const key = normalizeKey(sender);
  if (!key) return false;

  const existed = takeoverMap.delete(key);
  if (existed) {
    persistToDisk();
  }
  return existed;
}

/**
 * Memeriksa apakah menu utama lengkap boleh dikirimkan (Frequency Capping).
 * Mencegah bot memuntahkan menu raksasa berkali-kali pada rentang jam yang sama.
 * @param sender Nomor telepon
 * @param cooldownHours Jeda antar menu lengkap (default 8 jam)
 */
export function shouldSendFullMenu(sender: string, cooldownHours = 8): boolean {
  initFromDisk();
  const key = normalizeKey(sender);
  if (!key) return true;

  const entry = menuSendMap.get(key);
  if (!entry) return true;

  const cooldownMs = cooldownHours * 3600 * 1000;
  return Date.now() - entry.lastFullMenuSentAt > cooldownMs;
}

/**
 * Mencatat bahwa menu lengkap baru saja dikirim ke pelanggan.
 */
export function recordFullMenuSent(sender: string): void {
  initFromDisk();
  const key = normalizeKey(sender);
  if (!key) return;

  menuSendMap.set(key, {
    sender: key,
    lastFullMenuSentAt: Date.now(),
  });
  persistToDisk();
}

/**
 * Mendapatkan daftar seluruh kontak yang saat ini dalam status Human Takeover (untuk dashboard admin).
 */
export function getAllActiveTakeovers(): Array<
  TakeoverEntry & { remainingMinutes: number }
> {
  initFromDisk();
  const now = Date.now();
  const result: Array<TakeoverEntry & { remainingMinutes: number }> = [];

  for (const [k, v] of takeoverMap.entries()) {
    if (v.pausedUntil > now) {
      result.push({
        ...v,
        remainingMinutes: Math.ceil((v.pausedUntil - now) / (60 * 1000)),
      });
    } else {
      takeoverMap.delete(k);
    }
  }

  return result.sort((a, b) => b.updatedAt - a.updatedAt);
}
