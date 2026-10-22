import { useEffect, useState, useMemo } from "react";

export type RouteStep = {
  instruction: string;
  maneuverType: string;
  modifier?: string;
  streetName: string;
  distance: number; // in meters
  duration: number; // in seconds
  icon: string; // e.g. "⬅️", "➡️", "⬆️", "🔄", "🏁"
  location?: [number, number]; // [lat, lng]
};

export type RoadRouteDetail = {
  coordinates: [number, number][]; // [lat, lng] array untuk Leaflet Polyline
  distanceMeters: number;
  durationSeconds: number;
  distanceFormatted: string; // e.g. "450 m" atau "1.8 km"
  durationFormatted: string; // e.g. "3 mnt"
  steps: RouteStep[];
  currentStep?: RouteStep;
  isLoading: boolean;
  error: string | null;
};

/**
 * Format jarak meter ke string yang mudah dibaca supir (e.g. "350 m" atau "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (!meters || meters <= 0) return "0 m";
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format durasi detik ke format ringkas (e.g. "< 1 mnt", "4 mnt", "1 j 15 mnt")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "< 1 mnt";
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "< 1 mnt";
  if (mins < 60) return `${mins} mnt`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} j ${remMins} mnt` : `${hours} jam`;
}

/**
 * Rumus Haversine untuk jarak lurus (meter) sebagai fallback offline jika OSRM tidak terjangkau
 */
function haversineDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6371000;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Menerjemahkan instruksi manuver OSRM ke Bahasa Indonesia yang lugas untuk supir armada
 */
function translateManeuver(step: any): { instruction: string; icon: string } {
  const maneuver = step?.maneuver || {};
  const type = maneuver.type || "";
  const modifier = maneuver.modifier || "";
  const street = (step?.name || "").trim();
  const streetSuffix = street ? ` ke ${street}` : "";

  if (type === "depart") {
    return {
      instruction: street ? `Mulai di ${street}` : "Mulai ikuti rute jalan",
      icon: "🚗",
    };
  }
  if (type === "arrive") {
    return {
      instruction: "Tiba di titik lokasi pelanggan",
      icon: "🏁",
    };
  }
  if (modifier === "uturn") {
    return {
      instruction: `Putar balik${streetSuffix}`,
      icon: "🔄",
    };
  }
  if (modifier === "sharp right") {
    return {
      instruction: `Belok tajam ke kanan${streetSuffix}`,
      icon: "↪️",
    };
  }
  if (modifier === "right") {
    return {
      instruction: `Belok kanan${streetSuffix}`,
      icon: "➡️",
    };
  }
  if (modifier === "slight right") {
    return {
      instruction: `Serong kanan${streetSuffix}`,
      icon: "↗️",
    };
  }
  if (modifier === "sharp left") {
    return {
      instruction: `Belok tajam ke kiri${streetSuffix}`,
      icon: "↩️",
    };
  }
  if (modifier === "left") {
    return {
      instruction: `Belok kiri${streetSuffix}`,
      icon: "⬅️",
    };
  }
  if (modifier === "slight left") {
    return {
      instruction: `Serong kiri${streetSuffix}`,
      icon: "↖️",
    };
  }
  if (type === "roundabout" || type === "rotary") {
    return {
      instruction: `Masuk bundaran${streetSuffix}`,
      icon: "🔄",
    };
  }
  if (type === "continue" || type === "new name") {
    return {
      instruction: street ? `Lurus di ${street}` : "Lurus terus ikuti jalan",
      icon: "⬆️",
    };
  }

  return {
    instruction: street ? `Ikuti rute ${street}` : "Lurus terus menuju tujuan",
    icon: "⬆️",
  };
}

/**
 * Hook Rute Mandiri Lengkap (Turn-by-turn steps, distance, duration, dan geometri)
 */
export function useDetailedRoadRoute(
  start?: [number, number],
  end?: [number, number]
): RoadRouteDetail {
  const [detail, setDetail] = useState<RoadRouteDetail>({
    coordinates: [],
    distanceMeters: 0,
    durationSeconds: 0,
    distanceFormatted: "0 m",
    durationFormatted: "< 1 mnt",
    steps: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!start || !end) {
      setDetail({
        coordinates: [],
        distanceMeters: 0,
        durationSeconds: 0,
        distanceFormatted: "0 m",
        durationFormatted: "< 1 mnt",
        steps: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    let isMounted = true;
    setDetail((prev) => ({ ...prev, isLoading: true, error: null }));

    // Format OSRM: longitude,latitude
    const startStr = `${start[1]},${start[0]}`;
    const endStr = `${end[1]},${end[0]}`;

    // Request dengan steps=true untuk panduan belokan
    const url = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?geometries=geojson&overview=full&steps=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // OSRM: [lng, lat] -> Leaflet: [lat, lng]
          const coords: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );

          const distanceMeters = Math.round(route.distance || 0);
          const durationSeconds = Math.round(route.duration || 0);

          // Parse steps
          const rawSteps = route.legs?.[0]?.steps || [];
          const parsedSteps: RouteStep[] = rawSteps.map((s: any) => {
            const { instruction, icon } = translateManeuver(s);
            const loc = s.maneuver?.location;
            return {
              instruction,
              maneuverType: s.maneuver?.type || "",
              modifier: s.maneuver?.modifier,
              streetName: s.name || "",
              distance: Math.round(s.distance || 0),
              duration: Math.round(s.duration || 0),
              icon,
              location: loc ? [loc[1], loc[0]] : undefined,
            };
          });

          // Ambil step terdekat berikutnya (step 1 jika ada, atau step 0 jika baru berangkat)
          const currentStep =
            parsedSteps.length > 1 ? parsedSteps[1] : parsedSteps[0];

          setDetail({
            coordinates: coords,
            distanceMeters,
            durationSeconds,
            distanceFormatted: formatDistance(distanceMeters),
            durationFormatted: formatDuration(durationSeconds),
            steps: parsedSteps,
            currentStep,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error("No route found from OSRM");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // Fallback: Gunakan garis lurus (Haversine) agar navigasi mandiri tetap jalan offline
        const directDist = haversineDistance(start, end);
        const estDuration = Math.round(directDist / 8.33); // Estimasi kec 30km/jam (~8.33 m/s)

        setDetail({
          coordinates: [start, end],
          distanceMeters: Math.round(directDist),
          durationSeconds: estDuration,
          distanceFormatted: formatDistance(directDist),
          durationFormatted: formatDuration(estDuration),
          steps: [
            {
              instruction: "Arahkan armada langsung ke titik tujuan",
              maneuverType: "straight",
              streetName: "",
              distance: Math.round(directDist),
              duration: estDuration,
              icon: "⬆️",
              location: end,
            },
            {
              instruction: "Tiba di titik lokasi pelanggan",
              maneuverType: "arrive",
              streetName: "",
              distance: 0,
              duration: 0,
              icon: "🏁",
              location: end,
            },
          ],
          currentStep: {
            instruction: "Arahkan armada langsung ke titik tujuan",
            maneuverType: "straight",
            streetName: "",
            distance: Math.round(directDist),
            duration: estDuration,
            icon: "⬆️",
            location: end,
          },
          isLoading: false,
          error: String(err?.message || "Fallback offline route"),
        });
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [start?.[0], start?.[1], end?.[0], end?.[1]]);

  return detail;
}

/**
 * Hook Rute Mandiri Sederhana (backward-compatibility mengembalikan array koordinat)
 */
export function useRoadRoute(
  start?: [number, number],
  end?: [number, number]
): [number, number][] {
  const detail = useDetailedRoadRoute(start, end);
  return detail.coordinates;
}
