import { useEffect, useState } from 'react';

// Hook untuk mengambil rute jalan raya dari OSRM
export function useRoadRoute(start?: [number, number], end?: [number, number]) {
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!start || !end) {
      // eslint-disable-next-line
      setRoute([]);
      return;
    }

    // OSRM menggunakan format: longitude,latitude
    const startStr = `${start[1]},${start[0]}`;
    const endStr = `${end[1]},${end[0]}`;
    
    // Panggil OSRM API (gratis)
    const url = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?geometries=geojson&overview=full`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          // OSRM mengembalikan [lng, lat], tapi Leaflet butuh [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoute(coords);
        }
      })
      .catch(err => console.error("OSRM Error:", err));
  }, [start, end]);

  return route;
}
