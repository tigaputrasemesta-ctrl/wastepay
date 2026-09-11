"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook Screen Wake Lock API.
 * Mencegah layar ponsel Android sleep / mati otomatis saat petugas sedang berkendara patroli rute.
 */
export function useWakeLock(enabled: boolean = true) {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let isMounted = true;

    async function requestWakeLock() {
      try {
        if (document.visibilityState === "visible") {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          if (isMounted) setIsActive(true);

          wakeLockRef.current.addEventListener("release", () => {
            if (isMounted) setIsActive(false);
          });
        }
      } catch {
        // Izin wakeLock ditolak atau baterai low-power mode
      }
    }

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);

  return isActive;
}
