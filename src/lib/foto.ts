import exifr from "exifr";

const MAX_DIMENSI = 1024;
const QUALITY = 0.8;

/**
 * Kompres & resize gambar jadi JPEG base64 (maks 1024px) supaya penyimpanan
 * (kolom `fotoRumah`) tidak membengkak. Dipakai form admin dan form publik.
 */
export function kompresGambar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File bukan gambar valid"));
    };
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const scale = Math.min(1, MAX_DIMENSI / Math.max(width, height));
      if (scale < 1) {
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Canvas tidak didukung"));
        return;
      }
      
      // Draw image to canvas to resize it
      ctx.drawImage(img, 0, 0, width, height);
      
      // Extract base64
      resolve(canvas.toDataURL("image/jpeg", QUALITY));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Baca koordinat GPS dari EXIF foto (geotag). Return null bila tidak ada /
 * gagal terbaca.
 */
export async function ekstrakGpsFoto(
  file: File
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && gps.latitude != null && gps.longitude != null) {
      return { latitude: Number(gps.latitude), longitude: Number(gps.longitude) };
    }
  } catch {
    // EXIF tidak terbaca / tidak ada geotag — bukan error fatal.
  }
  return null;
}
