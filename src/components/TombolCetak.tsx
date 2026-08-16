"use client";

/**
 * Tombol cetak generik — memanggil window.print().
 * Dipakai di dokumen printable (kwitansi, surat jalan, dll).
 * Styling via kelas `.print-btn` (sembunyi otomatis saat print).
 */
export default function TombolCetak({ label = "Cetak / Unduh PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="print-btn">
      {label}
    </button>
  );
}
