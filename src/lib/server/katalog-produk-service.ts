import { getPengaturanString, setPengaturan } from "@/lib/pengaturan";
import { ProdukSampah, DEFAULT_PRODUK_LIST, SETTING_KEY_KATALOG } from "@/lib/katalog-produk";

/**
 * Mengambil daftar produk aktif dari database setting (JSON format).
 * Fallback ke DEFAULT_PRODUK_LIST jika belum disetting di database.
 */
export async function getKatalogProduk(): Promise<ProdukSampah[]> {
  try {
    const raw = await getPengaturanString(SETTING_KEY_KATALOG, "");
    if (!raw) {
      return DEFAULT_PRODUK_LIST;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error("[katalog-produk] Gagal parse katalog produk:", error);
  }
  return DEFAULT_PRODUK_LIST;
}

/**
 * Menyimpan daftar produk ke database.
 */
export async function saveKatalogProduk(produkList: ProdukSampah[]): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(produkList, null, 2);
    await setPengaturan(SETTING_KEY_KATALOG, jsonString);
    return true;
  } catch (error) {
    console.error("[katalog-produk] Gagal simpan katalog produk:", error);
    return false;
  }
}
