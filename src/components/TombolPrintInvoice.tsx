"use client";

export default function TombolPrintInvoice({ label = "Unduh Tagihan" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-invoice-btn"
    >
      {label}
    </button>
  );
}
