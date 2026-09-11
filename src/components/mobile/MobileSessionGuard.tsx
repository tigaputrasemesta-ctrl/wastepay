"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "wp_mobile_token";
const STORAGE_USER = "wp_mobile_user";

/**
 * Menyimpan token sesi mobile ke storage lokal untuk persistensi anti-logout.
 * Dipanggil saat login sukses atau restore sukses.
 */
export function persistMobileToken(token: string, user?: { id: number; nama: string; email: string; role: string }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, token);
    if (user) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    }
  } catch {
    // localStorage full / private browsing
  }
}

/** Mengambil token sesi mobile yang tersimpan */
export function getPersistedMobileToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Menghapus token sesi hanya saat logout manual */
export function clearMobileSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_USER);
  } catch {
    // ignore
  }
}

/**
 * Komponen Penjaga Sesi Mobile (Anti-Logout Guard).
 * Otomatis me-restore cookie sesi jika proses WebView Android ter-suspend atau cookie hilang,
 * sehingga petugas tidak pernah terlempar ke layar login di tengah operasional rute.
 */
export default function MobileSessionGuard() {
  const router = useRouter();
  const checkingRef = useRef(false);

  useEffect(() => {
    async function verifyAndRestoreSession() {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        // Cek apakah sesi saat ini masih valid
        const meRes = await fetch("/api/petugas/me");
        if (meRes.ok) {
          // Sesi aktif dan valid
          checkingRef.current = false;
          return;
        }

        // Jika 401 atau cookie hilang, cek apakah ada token tersimpan di storage
        const savedToken = getPersistedMobileToken();
        if (savedToken) {
          const restoreRes = await fetch("/api/auth/mobile-restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: savedToken }),
          });

          if (restoreRes.ok) {
            const data = await restoreRes.json();
            if (data.token) {
              persistMobileToken(data.token, data.user);
            }
            // Sesi berhasil dipulihkan secara silent
            checkingRef.current = false;
            return;
          }
        }
      } catch {
        // Offline / gangguan jaringan sementara — jangan logout otomatis!
      } finally {
        checkingRef.current = false;
      }
    }

    // Jalankan pengecekan saat mount
    verifyAndRestoreSession();

    // Jalankan pengecekan saat aplikasi kembali ke foreground (visibilitychange)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyAndRestoreSession();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, [router]);

  return null;
}
