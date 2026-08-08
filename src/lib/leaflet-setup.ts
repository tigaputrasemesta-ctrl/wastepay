import L from "leaflet";

// leaflet.markercluster (versi CJS lama) membaca `window.L` global,
// sedangkan bundler Next memberi modul `leaflet` secara ekspor — pasang global dulu.
(globalThis as { L?: typeof L }).L = L;
