"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof (L as any).heatLayer !== "function") return;

    // Inisialisasi heat layer sekali saja saat mount
    const layer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 15,
      max: 1.0,
      gradient: { 0.2: "blue", 0.4: "cyan", 0.6: "lime", 0.8: "yellow", 1.0: "red" },
    }).addTo(map);

    layerRef.current = layer;

    return () => {
      if (layer) {
        map.removeLayer(layer);
      }
      layerRef.current = null;
    };
  }, [map]);

  // Update points secara reaktif saat ada filter atau perubahan data
  useEffect(() => {
    if (layerRef.current && points) {
      layerRef.current.setLatLngs(points);
    }
  }, [points]);

  return null;
}
