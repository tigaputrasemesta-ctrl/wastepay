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
    
    // Titik array: [lat, lng, intensity]
    layerRef.current = (L as any).heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 15,
      max: 1.0,
      gradient: { 0.2: "blue", 0.4: "cyan", 0.6: "lime", 0.8: "yellow", 1.0: "red" }
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, points]);

  // Update points when they change
  useEffect(() => {
    if (layerRef.current && points) {
      layerRef.current.setLatLngs(points);
    }
  }, [points]);

  return null;
}
