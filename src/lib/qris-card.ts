import { formatRupiah } from "./utils";

export interface QrisCardParams {
  qrDataUrl: string;
  amount: number;
  orderId: string;
  noInvoice?: string;
  namaPelanggan?: string;
  brandName?: string;
  city?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/**
 * Menghasilkan gambar voucher pembayaran QRIS lengkap (Canvas)
 * Berisi header UPS HERU, total pembayaran, QRIS scannable, info pelanggan, dan panduan upload.
 * Dapat di-upload langsung dari galeri di aplikasi m-Banking/e-wallet.
 */
export async function downloadQrisVoucherCard(params: QrisCardParams): Promise<void> {
  const {
    qrDataUrl,
    amount,
    orderId,
    noInvoice = "-",
    namaPelanggan = "-",
    brandName = "UPS HERU",
    city = "KOTA DEPOK",
  } = params;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const width = 680;
  const height = 950;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Gagal menginisialisasi canvas untuk gambar QRIS");
  }

  // 1. Background putih bersih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // 2. Header Emerald
  const grad = ctx.createLinearGradient(0, 0, width, 115);
  grad.addColorStop(0, "#047857");
  grad.addColorStop(1, "#065f46");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 115);

  // Brand header text
  ctx.fillStyle = "#a7f3d0";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${brandName.toUpperCase()} • ${city.toUpperCase()}`, width / 2, 32);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("PEMBAYARAN QRIS RESMI", width / 2, 62);

  // Subtitle
  ctx.fillStyle = "#ecfdf5";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText("NusaPay / Duitku Payment Gateway · Verifikasi Otomatis", width / 2, 88);

  // 3. Total Pembayaran
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("TOTAL PEMBAYARAN", width / 2, 142);

  ctx.fillStyle = "#047857";
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  ctx.fillText(formatRupiah(amount), width / 2, 178);

  // 4. Frame Box QR Code
  const frameX = 160;
  const frameY = 205;
  const frameSize = 360;
  drawRoundedRect(ctx, frameX, frameY, frameSize, frameSize, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  // Load and draw QR Code
  const qrImg = new Image();
  qrImg.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => reject(new Error("Gagal merender QR Code"));
    qrImg.src = qrDataUrl;
  });

  const qrSize = 320;
  const qrX = frameX + (frameSize - qrSize) / 2;
  const qrY = frameY + (frameSize - qrSize) / 2;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Label di bawah QR
  ctx.fillStyle = "#64748b";
  ctx.font = "500 12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Scan via BCA · Mandiri · BRI · BNI · GoPay · OVO · Dana · ShopeePay", width / 2, 588);

  // 5. Rincian Info Box
  const infoX = 40;
  const infoY = 612;
  const infoW = 600;
  const infoH = 150;
  drawRoundedRect(ctx, infoX, infoY, infoW, infoH, 16);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  // Row 1: No. Tagihan
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("No. Tagihan / Invoice", infoX + 24, infoY + 36);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px monospace, -apple-system, sans-serif";
  const safeInvoice = truncateText(ctx, noInvoice, 320);
  ctx.fillText(safeInvoice, infoX + infoW - 24, infoY + 36);

  // Line separator
  ctx.beginPath();
  ctx.moveTo(infoX + 20, infoY + 54);
  ctx.lineTo(infoX + infoW - 20, infoY + 54);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Row 2: Nama Pelanggan
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("Nama Pelanggan", infoX + 24, infoY + 82);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  const safeNama = truncateText(ctx, namaPelanggan, 320);
  ctx.fillText(safeNama, infoX + infoW - 24, infoY + 82);

  // Line separator
  ctx.beginPath();
  ctx.moveTo(infoX + 20, infoY + 100);
  ctx.lineTo(infoX + infoW - 20, infoY + 100);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Row 3: Order ID
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("Order ID Gateway", infoX + 24, infoY + 128);

  ctx.textAlign = "right";
  ctx.fillStyle = "#475569";
  ctx.font = "bold 13px monospace, -apple-system, sans-serif";
  ctx.fillText(`#${orderId}`, infoX + infoW - 24, infoY + 128);

  // 6. Panduan Bayar 1 HP Box
  const tipX = 40;
  const tipY = 778;
  const tipW = 600;
  const tipH = 112;
  drawRoundedRect(ctx, tipX, tipY, tipW, tipH, 16);
  ctx.fillStyle = "#fef3c7";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#fde68a";
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#92400e";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("💡 PANDUAN BAYAR DENGAN 1 HP:", tipX + 20, tipY + 28);

  ctx.fillStyle = "#78350f";
  ctx.font = "500 11.5px system-ui, -apple-system, sans-serif";
  ctx.fillText("1. Buka aplikasi m-Banking atau e-Wallet (BCA, Mandiri, BRI, GoPay, Dana, dll).", tipX + 20, tipY + 52);
  ctx.fillText("2. Pilih menu Scan QRIS, lalu tekan ikon Galeri dan upload gambar voucher ini.", tipX + 20, tipY + 74);
  ctx.fillText("3. Konfirmasi nominal & PIN. Halaman pembayaran otomatis mendeteksi saat lunas.", tipX + 20, tipY + 95);

  // 7. Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.fillText("Layanan Pengelolaan Sampah Terpadu & Retribusi TPS 3R · https://upsheru.com", width / 2, 922);

  // 8. Outer subtle border
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // 9. Download trigger
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  const sanitizedInvoice = (noInvoice || orderId).replace(/[^a-zA-Z0-9]/g, "-");
  a.download = `QRIS-UPSHERU-${sanitizedInvoice}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
