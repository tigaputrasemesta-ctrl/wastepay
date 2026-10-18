import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:3000'
    : 'https://upsheru.com');

/**
 * 1. Wrapper Fetch API Universal (Web & APK Native)
 * Menggantikan fetch('/api/...') agar otomatis memanggil URL penuh saat berjalan di dalam APK.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const isNative = Capacitor.isNativePlatform();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${isNative ? API_BASE_URL : ''}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 2. Handler Tombol Fisik Back Android
 * Panggil fungsi ini satu kali di dalam useEffect pada root layout (src/app/layout.tsx).
 */
export function registerAndroidBackButton(): void {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('backButton', ({ canGoBack }) => {
    // Cek apakah ada modal yang sedang terbuka
    const activeModal = document.querySelector('[data-modal-open="true"]');
    if (activeModal) {
      activeModal.dispatchEvent(new CustomEvent('close-modal'));
      return;
    }

    if (canGoBack || window.history.length > 1) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}

/**
 * 3. Akuisisi Lokasi GPS Native untuk Navigasi Rute Driver OSRM & Titik Pelanggan
 */
export async function getNativeHighAccuracyLocation(): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
}> {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted') {
        throw new Error('Izin lokasi GPS ditolak. Aktifkan GPS untuk memuat rute pengangkutan OSRM.');
      }
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  }

  // Fallback untuk browser Web
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung pada browser ini.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

/**
 * 4. Kamera Native + Kompresi WebP Otomatis (Solusi Anti-Overquota Egress Supabase)
 * Menghasilkan Blob WebP berukuran ~35-50 KB (lebar maks 800px) untuk diunggah ke Supabase Storage Bucket,
 * BUKAN disimpan sebagai string Base64 di kolom tabel database.
 */
export async function captureAndCompressPhoto(
  source: 'CAMERA' | 'PROMPT' = 'CAMERA',
  maxWidth = 800,
  quality = 0.72
): Promise<Blob> {
  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: source === 'CAMERA' ? CameraSource.Camera : CameraSource.Prompt,
    width: maxWidth,
    correctOrientation: true,
  });

  if (!photo.webPath) {
    throw new Error('Gagal mengambil gambar dari kamera perangkat.');
  }

  const response = await fetch(photo.webPath);
  const rawBlob = await response.blob();

  // Kompresi ulang ke format WebP via HTML5 Offscreen/Canvas
  if (typeof createImageBitmap !== 'undefined' && typeof document !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(rawBlob);
      const scale = Math.min(1, maxWidth / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve) => {
          canvas.toBlob(
            (compressed) => resolve(compressed || rawBlob),
            'image/webp',
            quality
          );
        });
      }
    } catch (e) {
      console.warn('Gagal kompresi canvas WebP, fallback ke raw blob:', e);
    }
  }

  return rawBlob;
}

/**
 * 5. Ekspor File Excel (.xlsx) Native untuk Modul Admin Pelanggan
 * Mengatasi masalah blob download yang gagal di dalam Android WebView.
 */
export async function exportExcelFileNative(filename: string, base64Data: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const savedFile = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  });

  await Share.share({
    title: `Ekspor Data ${filename}`,
    text: 'Data Pelanggan WastePay',
    url: savedFile.uri,
    dialogTitle: 'Simpan atau Bagikan File Excel',
  });
}
