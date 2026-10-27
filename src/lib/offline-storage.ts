/**
 * Client-Side Offline Storage & Delta Sync Engine untuk UPS HERU Admin
 * Menggunakan native browser IndexedDB (tersedia di Android WebView / Chrome / Safari).
 * 
 * Keuntungan:
 * 1. Data ribuan pelanggan & tagihan tersimpan langsung di memori HP.
 * 2. Buka aplikasi / dashboard langsung 0 detik tanpa menunggu Supabase.
 * 3. Bekerja offline saat sinyal seluler drop di lapangan.
 * 4. Update berkala hanya mengunduh data yang berubah (Delta Sync) via /api/sync/delta.
 */

export const DB_NAME = "UPSHERU_ADMIN_CACHE";
export const DB_VERSION = 1;

export interface OfflineMetadata {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface MasterSyncPayload {
  serverTime: string;
  data: {
    pelanggan: Array<Record<string, unknown> & { id: number }>;
    wilayah: Array<Record<string, unknown> & { id: number }>;
    zona: Array<Record<string, unknown> & { id: number }>;
    kelurahan: Array<Record<string, unknown> & { id: number }>;
    paket: Array<Record<string, unknown> & { id: number }>;
    rute: Array<Record<string, unknown> & { id: number }>;
  };
}

export interface DeltaSyncPayload {
  serverTime: string;
  since: string;
  hasChanges: boolean;
  totalChanges: number;
  deltaCounts: Record<string, number>;
  data: Record<string, Array<Record<string, unknown> & { id: number }>>;
  deleted: Array<{ entity: string; id: number }>;
}

let dbInstance: IDBDatabase | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

/**
 * Membuka koneksi IndexedDB dengan migrasi skema tabel
 */
export async function getOfflineDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    throw new Error("IndexedDB tidak didukung pada browser ini");
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Pelanggan Store
      if (!db.objectStoreNames.contains("pelanggan")) {
        const pStore = db.createObjectStore("pelanggan", { keyPath: "id" });
        pStore.createIndex("kodePelanggan", "kodePelanggan", { unique: false });
        pStore.createIndex("nama", "nama", { unique: false });
        pStore.createIndex("noTelepon", "noTelepon", { unique: false });
        pStore.createIndex("status", "status", { unique: false });
        pStore.createIndex("wilayahId", "wilayahId", { unique: false });
        pStore.createIndex("kelurahanId", "kelurahanId", { unique: false });
        pStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 2. Wilayah & Zonasi Store
      if (!db.objectStoreNames.contains("wilayah")) {
        const wStore = db.createObjectStore("wilayah", { keyPath: "id" });
        wStore.createIndex("zonaId", "zonaId", { unique: false });
      }

      if (!db.objectStoreNames.contains("zona")) {
        db.createObjectStore("zona", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("kelurahan")) {
        db.createObjectStore("kelurahan", { keyPath: "id" });
      }

      // 3. Paket & Tarif Store
      if (!db.objectStoreNames.contains("paket")) {
        db.createObjectStore("paket", { keyPath: "id" });
      }

      // 4. Rute Armada Store
      if (!db.objectStoreNames.contains("rute")) {
        db.createObjectStore("rute", { keyPath: "id" });
      }

      // 5. Tagihan Store
      if (!db.objectStoreNames.contains("tagihan")) {
        const tStore = db.createObjectStore("tagihan", { keyPath: "id" });
        tStore.createIndex("pelangganId", "pelangganId", { unique: false });
        tStore.createIndex("status", "status", { unique: false });
      }

      // 6. Komplain Store
      if (!db.objectStoreNames.contains("komplain")) {
        const kStore = db.createObjectStore("komplain", { keyPath: "id" });
        kStore.createIndex("pelangganId", "pelangganId", { unique: false });
        kStore.createIndex("status", "status", { unique: false });
      }

      // 7. Pengangkutan Store
      if (!db.objectStoreNames.contains("pengangkutan")) {
        const pgStore = db.createObjectStore("pengangkutan", { keyPath: "id" });
        pgStore.createIndex("pelangganId", "pelangganId", { unique: false });
        pgStore.createIndex("tanggal", "tanggal", { unique: false });
      }

      // 8. Metadata Store (waktu sinkron, token terakhir, jumlah record)
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Menyimpan seluruh data master ke storage HP (Batch Transaction)
 */
export async function saveMasterToStorage(payload: MasterSyncPayload): Promise<void> {
  const db = await getOfflineDB();

  return new Promise((resolve, reject) => {
    const storeNames = [
      "pelanggan",
      "wilayah",
      "zona",
      "kelurahan",
      "paket",
      "rute",
      "metadata",
    ];
    const tx = db.transaction(storeNames, "readwrite");

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    // 1. Simpan masing-masing store
    const { pelanggan, wilayah, zona, kelurahan, paket, rute } = payload.data;

    const pStore = tx.objectStore("pelanggan");
    pStore.clear();
    pelanggan.forEach((item) => pStore.put(item));

    const wStore = tx.objectStore("wilayah");
    wStore.clear();
    wilayah.forEach((item) => wStore.put(item));

    const zStore = tx.objectStore("zona");
    zStore.clear();
    zona.forEach((item) => zStore.put(item));

    const kStore = tx.objectStore("kelurahan");
    kStore.clear();
    kelurahan.forEach((item) => kStore.put(item));

    const pktStore = tx.objectStore("paket");
    pktStore.clear();
    paket.forEach((item) => pktStore.put(item));

    const rStore = tx.objectStore("rute");
    rStore.clear();
    rute.forEach((item) => rStore.put(item));

    // 2. Perbarui metadata
    const metaStore = tx.objectStore("metadata");
    const now = new Date().toISOString();
    metaStore.put({ key: "lastMasterDownload", value: now, updatedAt: now });
    metaStore.put({ key: "lastSyncToken", value: payload.serverTime, updatedAt: now });
    metaStore.put({ key: "totalPelangganCached", value: pelanggan.length, updatedAt: now });
  });
}

/**
 * Menerapkan pembaruan parsial (Delta Sync) ke IndexedDB
 */
export async function applyDeltaToStorage(delta: DeltaSyncPayload): Promise<void> {
  const db = await getOfflineDB();

  return new Promise((resolve, reject) => {
    const storeNames = [
      "pelanggan",
      "tagihan",
      "komplain",
      "pengangkutan",
      "zona",
      "rute",
      "metadata",
    ];
    const tx = db.transaction(storeNames, "readwrite");

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    // 1. Upsert data yang bertambah / berubah
    if (delta.data) {
      for (const [entityName, items] of Object.entries(delta.data)) {
        if (storeNames.includes(entityName)) {
          const store = tx.objectStore(entityName);
          items.forEach((item) => store.put(item));
        }
      }
    }

    // 2. Hapus data yang di-soft delete
    if (delta.deleted && delta.deleted.length > 0) {
      delta.deleted.forEach(({ entity, id }) => {
        if (storeNames.includes(entity)) {
          tx.objectStore(entity).delete(id);
        }
      });
    }

    // 3. Update token sinkronisasi terbaru
    const metaStore = tx.objectStore("metadata");
    const now = new Date().toISOString();
    metaStore.put({ key: "lastSyncToken", value: delta.serverTime, updatedAt: now });
    metaStore.put({ key: "lastDeltaSync", value: now, updatedAt: now });
  });
}

/**
 * Mengambil semua record dari object store tertentu
 */
export async function getAllCached<T>(storeName: string): Promise<T[]> {
  if (!isIndexedDBSupported()) return [];
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[OfflineStorage] Gagal membaca cache ${storeName}:`, err);
    return [];
  }
}

/**
 * Mengambil status sinkronisasi offline saat ini
 */
export async function getOfflineSyncStatus(): Promise<{
  lastSync: string | null;
  lastMasterDownload: string | null;
  totalPelanggan: number;
  isOfflineReady: boolean;
}> {
  if (!isIndexedDBSupported()) {
    return { lastSync: null, lastMasterDownload: null, totalPelanggan: 0, isOfflineReady: false };
  }

  try {
    const db = await getOfflineDB();
    const metadataList = await new Promise<OfflineMetadata[]>((resolve) => {
      const tx = db.transaction("metadata", "readonly");
      const req = tx.objectStore("metadata").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });

    const metaMap = new Map(metadataList.map((m) => [m.key, m.value]));
    const lastSync = (metaMap.get("lastSyncToken") as string) || null;
    const lastMasterDownload = (metaMap.get("lastMasterDownload") as string) || null;
    const totalPelanggan = (metaMap.get("totalPelangganCached") as number) || 0;

    return {
      lastSync,
      lastMasterDownload,
      totalPelanggan,
      isOfflineReady: totalPelanggan > 0,
    };
  } catch {
    return { lastSync: null, lastMasterDownload: null, totalPelanggan: 0, isOfflineReady: false };
  }
}

/**
 * Melakukan download master snapshot penuh dari server
 */
export async function runFullDownload(): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const res = await fetch("/api/sync/master");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const payload: MasterSyncPayload = await res.json();
    await saveMasterToStorage(payload);

    return {
      ok: true,
      count: payload.data.pelanggan.length,
    };
  } catch (error) {
    console.error("[OfflineStorage] Gagal download master data:", error);
    return {
      ok: false,
      count: 0,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

/**
 * Menjalankan Delta Sync cepat (hanya mengambil data yang berubah)
 */
export async function runDeltaSync(): Promise<{
  ok: boolean;
  hasChanges: boolean;
  totalChanges: number;
  error?: string;
}> {
  try {
    const status = await getOfflineSyncStatus();

    // Jika belum pernah download master sama sekali, lakukan download master
    if (!status.lastSync) {
      const fullRes = await runFullDownload();
      return {
        ok: fullRes.ok,
        hasChanges: fullRes.count > 0,
        totalChanges: fullRes.count,
        error: fullRes.error,
      };
    }

    const since = encodeURIComponent(status.lastSync);
    const res = await fetch(`/api/sync/delta?since=${since}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const delta: DeltaSyncPayload = await res.json();
    if (delta.hasChanges) {
      await applyDeltaToStorage(delta);
    }

    return {
      ok: true,
      hasChanges: delta.hasChanges,
      totalChanges: delta.totalChanges,
    };
  } catch (error) {
    console.error("[OfflineStorage] Gagal menjalankan delta sync:", error);
    return {
      ok: false,
      hasChanges: false,
      totalChanges: 0,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

/**
 * Menghapus seluruh data cache IndexedDB di HP
 */
export async function clearOfflineStorage(): Promise<void> {
  if (!isIndexedDBSupported()) return;

  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
