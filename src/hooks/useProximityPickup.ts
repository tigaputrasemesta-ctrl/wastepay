"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { jarakMeter } from "@/lib/geo";
import { playSound, speakText, vibrate } from "@/lib/mobile-feedback";

export type ProximityTugas = {
  id: number;
  status: string;
  pelanggan: {
    id: number;
    nama: string;
    alamat: string;
    kodePelanggan: string;
    latitude?: number | null;
    longitude?: number | null;
    patokanLokasi?: string | null;
    noTelepon?: string | null;
    fotoRumah?: string | null;
  };
  tunggakan?: {
    isMenunggak: boolean;
    jumlahBulan: number;
    totalNominal: number;
    daftarBulan: string[];
    bolehPickup: boolean;
  };
};

type ProximityOptions = {
  driverPos: { lat: number; lng: number; akurasi?: number } | null;
  tugasList: ProximityTugas[];
  radiusMeter?: number; // 10 atau 20 meter
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
};

export function useProximityPickup({
  driverPos,
  tugasList,
  radiusMeter = 20,
  soundEnabled = true,
  voiceEnabled = true,
}: ProximityOptions) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const dismissedRef = useRef<Map<number, number>>(new Map()); // id -> timestamp
  const lastAnnouncedIdRef = useRef<number | null>(null);

  // Filter tugas yang belum selesai dan memiliki koordinat
  const candidateTasks = useMemo(() => {
    return tugasList.filter(
      (t) =>
        t.status === "terjadwal" &&
        typeof t.pelanggan.latitude === "number" &&
        typeof t.pelanggan.longitude === "number"
    );
  }, [tugasList]);

  // Hitung jarak ke setiap kandidat
  const calculatedCandidates = useMemo(() => {
    if (!driverPos) return [];
    const pDriver: [number, number] = [driverPos.lat, driverPos.lng];

    return candidateTasks
      .map((t) => {
        const pCust: [number, number] = [t.pelanggan.latitude!, t.pelanggan.longitude!];
        const jarak = Math.round(jarakMeter(pDriver, pCust));
        return { task: t, jarak };
      })
      .sort((a, b) => a.jarak - b.jarak);
  }, [candidateTasks, driverPos]);

  // Titik terdekat dari posisi saat ini (bisa di dalam atau di luar radius)
  const closestEntry = calculatedCandidates.length > 0 ? calculatedCandidates[0] : null;

  // Evaluasi proximity trigger saat posisi atau daftar berubah
  useEffect(() => {
    if (!driverPos || calculatedCandidates.length === 0) {
      return;
    }

    const now = Date.now();
    // Cari kandidat terdekat yang berada di dalam radius dan tidak dalam masa cooldown dismiss
    const insideRadius = calculatedCandidates.find((c) => {
      if (c.jarak > radiusMeter) return false;
      const dismissedAt = dismissedRef.current.get(c.task.id);
      // Cooldown 60 detik jika ditutup manual
      if (dismissedAt && now - dismissedAt < 60000) return false;
      return true;
    });

    if (insideRadius) {
      const currentTarget = insideRadius.task;
      setActiveTaskId(currentTarget.id);

      // Hanya beri feedback suara jika belum pernah diumumkan untuk ID tugas ini
      if (lastAnnouncedIdRef.current !== currentTarget.id) {
        lastAnnouncedIdRef.current = currentTarget.id;
        const isMenunggak = currentTarget.tunggakan?.isMenunggak ?? false;

        if (soundEnabled) {
          if (isMenunggak) {
            playSound("warning");
            vibrate("warning");
          } else {
            playSound("pickup");
            vibrate("pickup");
          }
        }

        if (voiceEnabled) {
          const nama = currentTarget.pelanggan.nama;
          if (isMenunggak) {
            const bulan = currentTarget.tunggakan?.jumlahBulan || 1;
            speakText(`Peringatan! Rumah ${nama} menunggak ${bulan} bulan. Jangan diangkut.`);
          } else {
            speakText(`Mendekati rumah ${nama}. Siap angkut.`);
          }
        }
      }
    } else {
      // Jika driver bergerak menjauhi titik (> radius + 10m buffer), reset activeTaskId
      if (activeTaskId) {
        const activeEntry = calculatedCandidates.find((c) => c.task.id === activeTaskId);
        if (!activeEntry || activeEntry.jarak > radiusMeter + 10) {
          setActiveTaskId(null);
        }
      }
    }
  }, [driverPos, calculatedCandidates, radiusMeter, soundEnabled, voiceEnabled, activeTaskId]);

  const activeTaskEntry = calculatedCandidates.find((c) => c.task.id === activeTaskId) || null;

  const dismissActiveTask = useCallback(() => {
    if (activeTaskId) {
      dismissedRef.current.set(activeTaskId, Date.now());
      setActiveTaskId(null);
    }
  }, [activeTaskId]);

  const forceOpenTask = useCallback((taskId: number) => {
    setActiveTaskId(taskId);
    dismissedRef.current.delete(taskId);
  }, []);

  return {
    activeTask: activeTaskEntry ? activeTaskEntry.task : null,
    activeDistance: activeTaskEntry ? activeTaskEntry.jarak : null,
    closestTask: closestEntry ? closestEntry.task : null,
    closestDistance: closestEntry ? closestEntry.jarak : null,
    dismissActiveTask,
    forceOpenTask,
    totalScheduled: candidateTasks.length,
  };
}
