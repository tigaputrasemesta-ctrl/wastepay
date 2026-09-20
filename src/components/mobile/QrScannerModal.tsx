"use client";

import { useEffect, useRef, useState } from "react";
import { playSound, vibrate } from "@/lib/mobile-feedback";

type QrScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
};

/**
 * Ekstraksi kode pelanggan dari QR Code / URL / Barcode sticker.
 * Contoh format:
 * - "0101-0001" -> "0101-0001"
 * - "https://o2whero.com/invoice-tagihan?invoice=INV%2F0101-0001%2F202609" -> "0101-0001"
 * - "INV/0101-0001/202609" -> "0101-0001"
 * - "UPS-001" -> "UPS-001"
 */
export function extractCustomerCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Cek apakah format URL invoice
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const invoice = url.searchParams.get("invoice");
      if (invoice) {
        const parts = invoice.split("/");
        if (parts.length >= 2 && parts[1]) {
          return parts[1];
        }
      }
      const p = url.searchParams.get("p") || url.searchParams.get("kode");
      if (p) return p;
    }
  } catch {
    // bukan URL valid, lanjutkan parsing regex
  }

  // Cek format INV/{kode}/{bulan}
  const invMatch = trimmed.match(/^INV\/([^/]+)\//i);
  if (invMatch && invMatch[1]) {
    return invMatch[1];
  }

  return trimmed;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Pindai Barcode / QR Pelanggan",
  subtitle = "Arahkan kamera ke stiker QR atau barcode rumah warga",
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Matikan kamera saat modal ditutup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      // eslint-disable-next-line
      setIsScanning(false);
      return;
    }

    let active = true;
    setCameraError(null);
    setIsScanning(true);

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser tidak mendukung akses kamera langsung.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Jalankan barcode detector jika didukung native oleh browser (Chrome/Android/Safari 17+)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        if (BarcodeDetectorClass) {
          try {
            const detector = new BarcodeDetectorClass({
              formats: ["qr_code", "code_128", "code_39", "ean_13", "data_matrix"],
            });

            const scanLoop = async () => {
              if (!active || !videoRef.current) return;
              try {
                if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      const cleanCode = extractCustomerCode(rawValue);
                      playSound("success");
                      vibrate("success");
                      active = false;
                      onScan(cleanCode);
                      onClose();
                      return;
                    }
                  }
                }
              } catch {
                // deteksi frame dilewati
              }
              if (active) {
                requestAnimationFrame(scanLoop);
              }
            };
            requestAnimationFrame(scanLoop);
          } catch {
            // detector init fallback
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Tidak dapat membuka kamera.";
        setCameraError(msg);
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  function handleSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    const clean = extractCustomerCode(manualCode);
    if (!clean) return;
    playSound("success");
    vibrate("success");
    onScan(clean);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base"
            >
              📷
            </span>
            <div>
              <h2 className="text-sm font-black text-white">{title}</h2>
              <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[360px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-2">
              <span className="text-3xl block">📷⚠️</span>
              <p className="text-xs text-rose-300 font-bold">Kamera Tidak Tersedia</p>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                {cameraError}. Jangan khawatir, Anda tetap bisa memasukkan kode pelanggan di bawah.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Box with Green Corners */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-56 h-56 border-2 border-emerald-400/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                  {/* Laser Scanning Line */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-bounce" />

                  {/* Corner Guides */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                </div>
              </div>

              {/* Status Hint */}
              <div className="absolute bottom-3 inset-x-4 text-center pointer-events-none">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/30 shadow-lg">
                  {isScanning ? "⚡ Mengintai Barcode / QR..." : "Menyiapkan Kamera..."}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
            <span>Atau Masukkan Kode Pelanggan:</span>
            <span className="text-[10px] text-slate-500 font-mono">Misal: 0101-0001</span>
          </p>

          <form onSubmit={handleSubmitManual} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik kode pelanggan / no invoice..."
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
            >
              Cari 🚀
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
