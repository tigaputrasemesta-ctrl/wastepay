import https from "https";
import pg from "pg";
import { readFile, stat } from "fs/promises";
import path from "path";

const { Pool } = pg;

// Lazy pool singleton to avoid multiple connections across serverless invokes
let poolInstance: pg.Pool | null = null;
function getDbPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return poolInstance;
}

function fetchBuffer(url: string, timeoutMs = 4000): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const req = https.get(
        url,
        {
          headers: {
            "User-Agent": "UPSHERU-GIS-PDF/1.0 (admin@upsheru.com)",
          },
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchBuffer(res.headers.location, timeoutMs).then(resolve);
          }
          if (res.statusCode !== 200) {
            return resolve(null);
          }
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      );
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

function project(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const rad = (lat * Math.PI) / 180;
  const px = ((lng + 180) / 360) * n * 256;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  return {
    px,
    py,
    tileX: Math.floor(px / 256),
    tileY: Math.floor(py / 256),
  };
}

async function fetchMapTiles(lat: number, lng: number, zoom = 17) {
  const center = project(lat, lng, zoom);
  const cx = center.tileX;
  const cy = center.tileY;

  const tilePromises: Promise<Buffer | null>[] = [];
  const tileCoords: { tx: number; ty: number; dx: number; dy: number }[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      tileCoords.push({ tx, ty, dx, dy });
      const osmUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
      tilePromises.push(
        fetchBuffer(osmUrl).then(async (buf) => {
          if (buf && buf.length > 500) return buf;
          // Fallback to Carto Voyager
          const cartoUrl = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`;
          const cartoBuf = await fetchBuffer(cartoUrl);
          if (cartoBuf && cartoBuf.length > 500) return cartoBuf;
          // Fallback to Esri
          const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
          return await fetchBuffer(esriUrl);
        })
      );
    }
  }

  const buffers = await Promise.all(tilePromises);
  const tiles = tileCoords.map((coord, i) => ({
    ...coord,
    buffer: buffers[i],
  }));

  return { center, tiles };
}

function formatRupiah(num: number | string | null | undefined): string {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
}

const NAMA_BULAN = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export async function generateSinglePelangganMapPdfBuffer(pelangganId: number): Promise<{ buffer: Buffer; kodePelanggan: string; nama: string }> {
  const pool = getDbPool();

  // 1. Fetch Customer Data
  const custRes = await pool.query(
    `
    SELECT 
      p.id, p.nama, p."kodePelanggan", p."noTelepon", p.alamat, p."rtRw",
      p.latitude, p.longitude, p.status, p.kategori, p."patokanLokasi", p."fotoRumah",
      COALESCE(z.nama, 'Tanpa Blok') as zona,
      COALESCE(k.nama, 'Cilodong') as kelurahan,
      COALESCE(w.nama, z.nama, 'Umum') as wilayah,
      r.nama as nama_rute,
      pet.nama as nama_petugas
    FROM "Pelanggan" p
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    LEFT JOIN "Zona" z ON w."zonaId" = z.id
    LEFT JOIN "Kelurahan" k ON p."kelurahanId" = k.id
    LEFT JOIN "Jadwal" j ON j."pelangganId" = p.id
    LEFT JOIN "Rute" r ON j."ruteId" = r.id
    LEFT JOIN "Petugas" pet ON r."petugasId" = pet.id
    WHERE p.id = $1 AND p."deletedAt" IS NULL
    LIMIT 1;
  `,
    [pelangganId]
  );

  if (custRes.rows.length === 0) {
    throw new Error(`Pelanggan dengan ID ${pelangganId} tidak ditemukan.`);
  }

  const p = custRes.rows[0];

  // 2. Fetch Billing History
  const billsRes = await pool.query(
    `
    SELECT id, bulan, tahun, status, jumlah, COALESCE(denda, 0) as denda, "jatuhTempo", "noInvoice"
    FROM "Tagihan"
    WHERE "pelangganId" = $1 AND "deletedAt" IS NULL
    ORDER BY tahun DESC, bulan DESC
    LIMIT 6;
  `,
    [pelangganId]
  );

  const bills = billsRes.rows;

  // Unpaid check
  const unpaidBills = bills.filter((b) => b.status === "belum_bayar" || b.status === "tunggakan");
  const totalTunggakan = unpaidBills.reduce((acc, b) => acc + Number(b.jumlah) + Number(b.denda), 0);
  const isStopAngkut = unpaidBills.length > 0;

  // Coordinates
  const lat = p.latitude != null ? Number(p.latitude) : -6.4421133;
  const lng = p.longitude != null ? Number(p.longitude) : 106.835465;

  const [mapData, qrBuffer] = await Promise.all([
    fetchMapTiles(lat, lng, 17),
    fetchBuffer(
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      )}`
    ),
  ]);

  // Decode Foto Rumah if available
  let fotoBuffer: Buffer | null = null;
  if (p.fotoRumah) {
    const rawFoto = p.fotoRumah.trim();
    if (rawFoto.startsWith("/uploads/") || rawFoto.startsWith("uploads/")) {
      try {
        const cleanRel = rawFoto.replace(/^\/?uploads\/?/, "");
        const baseUploadsDir = path.resolve(process.cwd(), "public", "uploads");
        const fullPath = path.resolve(baseUploadsDir, cleanRel);
        if (fullPath.startsWith(baseUploadsDir)) {
          const fileStat = await stat(fullPath);
          if (fileStat.isFile()) {
            fotoBuffer = await readFile(fullPath);
          }
        }
      } catch {}
    } else if (rawFoto.startsWith("data:image")) {
      try {
        const match = rawFoto.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,([A-Za-z0-9+/=]+)$/);
        if (match) {
          fotoBuffer = Buffer.from(match[1], "base64");
        }
      } catch {}
    } else if (!rawFoto.startsWith("/") && !rawFoto.startsWith("http") && rawFoto.length > 50) {
      try {
        fotoBuffer = Buffer.from(rawFoto, "base64");
      } catch {}
    }
  }

  const PDFDocumentModule = await import("pdfkit");
  const PDFDocument = (PDFDocumentModule.default || PDFDocumentModule) as unknown as typeof import("pdfkit");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 25, bottom: 25, left: 25, right: 25 },
      bufferPages: true,
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      resolve({
        buffer: Buffer.concat(chunks),
        kodePelanggan: p.kodePelanggan,
        nama: p.nama,
      });
    });
    doc.on("error", reject);

    const PAGE_WIDTH = 595.28;
    const MARGIN_LEFT = 25;
    const MARGIN_RIGHT = 25;
    const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 545.28 pt

    // Colors
    const TEAL_DARK = "#0f766e";
    const TEAL_LIGHT = "#14b8a6";
    const SLATE_900 = "#0f172a";
    const SLATE_800 = "#1e293b";
    const SLATE_700 = "#334155";
    const SLATE_500 = "#64748b";
    const SLATE_100 = "#f1f5f9";
    const RED_EMERGENCY = "#ef4444";

    let currentY = 25;

    // ──────────────────────────────────────────────────────────
    // A. HEADER BAR
    // ──────────────────────────────────────────────────────────
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 56).fill(SLATE_900);
    doc.rect(MARGIN_LEFT, currentY, 6, 56).fill(TEAL_LIGHT);

    // Logo Badge
    doc.rect(MARGIN_LEFT + 14, currentY + 10, 80, 36).fill("#047857");
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff").text("UPS HERU", MARGIN_LEFT + 18, currentY + 16, { width: 72, align: "center" });
    doc.font("Helvetica").fontSize(6.5).fillColor("#a7f3d0").text("GIS & FLEET MAP", MARGIN_LEFT + 18, currentY + 34, { width: 72, align: "center" });

    // Title
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#ffffff").text("LEMBAR PETA & NAVIGASI LOKASI PELANGGAN", MARGIN_LEFT + 102, currentY + 13);
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text("Sistem Informasi Geografis & Manajemen Pengangkutan Sampah — Kota Depok", MARGIN_LEFT + 102, currentY + 30);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#38bdf8").text("upsheru.com/peta", MARGIN_LEFT + 102, currentY + 42);

    // Right Badges
    const docDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 120, currentY + 10, 112, 36).fill(SLATE_800);
    doc.font("Helvetica").fontSize(6.5).fillColor("#94a3b8").text("TANGGAL CETAK", PAGE_WIDTH - MARGIN_RIGHT - 116, currentY + 14, { width: 104, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#f8fafc").text(docDate, PAGE_WIDTH - MARGIN_RIGHT - 116, currentY + 23, { width: 104, align: "right" });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(isStopAngkut ? "#fca5a5" : "#86efac").text(isStopAngkut ? "STATUS: TUNGGAKAN" : "STATUS: REGULER", PAGE_WIDTH - MARGIN_RIGHT - 116, currentY + 34, { width: 104, align: "right" });

    currentY += 62;

    // ──────────────────────────────────────────────────────────
    // B. PETA VISUAL (INTERACTIVE MAP CANVAS)
    // ──────────────────────────────────────────────────────────
    const mapW = USABLE_WIDTH;
    const mapH = 250;
    const mapX = MARGIN_LEFT;
    const mapY = currentY;

    doc.save();
    doc.roundedRect(mapX, mapY, mapW, mapH, 8).fill("#e2e8f0");
    doc.roundedRect(mapX, mapY, mapW, mapH, 8).clip();

    const scale = 0.85;
    const tileSize = 256 * scale;
    const centerX = mapX + mapW / 2;
    const centerY = mapY + mapH / 2;

    const { center, tiles } = mapData;

    for (const t of tiles) {
      if (!t.buffer) continue;
      const tileGlobalPx = t.tx * 256;
      const tileGlobalPy = t.ty * 256;
      const offsetPx = tileGlobalPx - center.px;
      const offsetPy = tileGlobalPy - center.py;

      const tilePdfX = centerX + offsetPx * scale;
      const tilePdfY = centerY + offsetPy * scale;

      try {
        doc.image(t.buffer, tilePdfX, tilePdfY, { width: tileSize, height: tileSize });
      } catch {}
    }

    // Concentric Rings
    doc.circle(centerX, centerY, 80).lineWidth(1).strokeOpacity(0.3).stroke("#0284c7");
    doc.circle(centerX, centerY, 45).lineWidth(1).strokeOpacity(0.45).stroke("#0284c7");
    doc.circle(centerX, centerY, 18).lineWidth(1.5).strokeOpacity(0.6).stroke("#0284c7");
    doc.circle(centerX, centerY, 24).fillOpacity(0.2).fill("#38bdf8");

    // Pin
    doc.save();
    doc.translate(centerX, centerY);
    doc.ellipse(0, 2, 7, 3.5).fillOpacity(0.3).fill("#0f172a");
    doc.fillOpacity(1);
    doc.path("M 0,0 C -4,-6 -10,-12 -10,-18 C -10,-24 -5,-29 0,-29 C 5,-29 10,-24 10,-18 C 10,-12 4,-6 0,0 Z")
      .fill(isStopAngkut ? "#dc2626" : "#059669");
    doc.circle(0, -18, 4).fill("#ffffff");
    doc.restore();

    // Callout Label
    const labelText = `${p.nama} (${p.kodePelanggan})`;
    doc.font("Helvetica-Bold").fontSize(9);
    const labelW = Math.min(260, doc.widthOfString(labelText) + 20);
    const labelH = 20;
    const bubbleX = centerX - labelW / 2;
    const bubbleY = centerY - 55;

    doc.roundedRect(bubbleX, bubbleY, labelW, labelH, 4).fillOpacity(0.95).fill(SLATE_900);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff")
      .text(labelText, bubbleX + 5, bubbleY + 5.5, { width: labelW - 10, align: "center", ellipsis: true });

    // HUD overlays
    doc.roundedRect(mapX + 10, mapY + 10, 150, 20, 4).fillOpacity(0.85).fill(SLATE_900);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#38bdf8").text("● PETA PRESISI RT/RW (ZOOM 17)", mapX + 16, mapY + 16);

    doc.roundedRect(mapX + mapW - 40, mapY + 10, 30, 28, 4).fillOpacity(0.85).fill(SLATE_900);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#f8fafc").text("▲", mapX + mapW - 40, mapY + 13, { width: 30, align: "center" });
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#94a3b8").text("UTARA", mapX + mapW - 40, mapY + 26, { width: 30, align: "center" });

    doc.rect(mapX, mapY + mapH - 22, mapW, 22).fillOpacity(0.88).fill(SLATE_900);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#38bdf8").text(`KOORDINAT GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, mapX + 12, mapY + mapH - 16);
    doc.font("Helvetica").fontSize(6.5).fillColor("#94a3b8").text("© OpenStreetMap contributors | Peta Navigasi UPS HERU", mapX + mapW - 220, mapY + mapH - 15, { width: 210, align: "right" });

    doc.restore();

    doc.roundedRect(mapX, mapY, mapW, mapH, 8).lineWidth(1.5).stroke(SLATE_800);
    currentY += mapH + 10;

    // ──────────────────────────────────────────────────────────
    // C. IDENTITAS & AKSES (2 COLUMNS)
    // ──────────────────────────────────────────────────────────
    const colW = (USABLE_WIDTH - 10) / 2;
    const col1X = MARGIN_LEFT;
    const col2X = MARGIN_LEFT + colW + 10;
    const boxH = 135;

    // Col 1
    doc.roundedRect(col1X, currentY, colW, boxH, 6).fill(SLATE_100);
    doc.roundedRect(col1X, currentY, colW, boxH, 6).lineWidth(1).stroke("#cbd5e1");
    doc.path(`M ${col1X},${currentY + 6} Q ${col1X},${currentY} ${col1X + 6},${currentY} L ${col1X + colW - 6},${currentY} Q ${col1X + colW},${currentY} ${col1X + colW},${currentY + 6} L ${col1X + colW},${currentY + 22} L ${col1X},${currentY + 22} Z`).fill(TEAL_DARK);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff").text("👤 DATA IDENTITAS PELANGGAN", col1X + 10, currentY + 6);

    let py1 = currentY + 28;
    const drawField = (label: string, value: string, isBold = false, valColor = SLATE_800) => {
      doc.font("Helvetica").fontSize(7).fillColor(SLATE_500).text(label, col1X + 10, py1);
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(valColor).text(value || "—", col1X + 10, py1 + 8, { width: colW - 20, ellipsis: true });
      py1 += 21;
    };
    drawField("NAMA PELANGGAN", p.nama, true, "#0f172a");
    drawField("KODE PELANGGAN / ID", p.kodePelanggan, true, TEAL_DARK);
    drawField("NO. TELEPON / WHATSAPP", p.noTelepon ? `${p.noTelepon} (WhatsApp Aktif)` : "—", true, "#0284c7");
    drawField("KATEGORI & STATUS", `${p.kategori.toUpperCase()}  •  ${p.status.toUpperCase()}`, false, SLATE_700);

    // Col 2
    doc.roundedRect(col2X, currentY, colW, boxH, 6).fill(SLATE_100);
    doc.roundedRect(col2X, currentY, colW, boxH, 6).lineWidth(1).stroke("#cbd5e1");
    doc.path(`M ${col2X},${currentY + 6} Q ${col2X},${currentY} ${col2X + 6},${currentY} L ${col2X + colW - 6},${currentY} Q ${col2X + colW},${currentY} ${col2X + colW},${currentY + 6} L ${col2X + colW},${currentY + 22} L ${col2X},${currentY + 22} Z`).fill(SLATE_800);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff").text("📍 DETAIL WILAYAH & AKSES ARMADA", col2X + 10, currentY + 6);

    let py2 = currentY + 28;
    const drawField2 = (label: string, value: string, isBold = false, valColor = SLATE_800) => {
      doc.font("Helvetica").fontSize(7).fillColor(SLATE_500).text(label, col2X + 10, py2);
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(valColor).text(value || "—", col2X + 10, py2 + 8, { width: colW - 20, ellipsis: true });
      py2 += 21;
    };
    drawField2("BLOK LAYANAN / ZONA", `${p.zona} (Kel. ${p.kelurahan})`, true, "#047857");
    drawField2("ALAMAT LENGKAP & RT/RW", `${p.alamat || "Jl raya"}${p.rtRw ? " · RT/RW " + p.rtRw : ""}`, false, SLATE_900);
    drawField2("PATOKAN LOKASI / RUMAH", p.patokanLokasi || "Tidak ada catatan patokan khusus", false, p.patokanLokasi ? "#b45309" : SLATE_500);
    drawField2("ARMADA PENJEMPUT / SUPIR", p.nama_petugas ? `${p.nama_petugas} (${p.nama_rute || "Rute Reguler"})` : "Reguler Tim Kebersihan Cilodong", false, SLATE_700);

    currentY += boxH + 10;

    // ──────────────────────────────────────────────────────────
    // D. FOTO RUMAH & QR NAVIGASI
    // ──────────────────────────────────────────────────────────
    const mediaH = 100;
    const mediaW = (USABLE_WIDTH - 10) / 2;

    // Foto Rumah
    doc.roundedRect(col1X, currentY, mediaW, mediaH, 6).fill(SLATE_100);
    doc.roundedRect(col1X, currentY, mediaW, mediaH, 6).lineWidth(1).stroke("#cbd5e1");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(SLATE_700).text("📷 FOTO RUMAH / TITIK PENJEMPUTAN", col1X + 10, currentY + 8);

    if (fotoBuffer) {
      try {
        doc.save();
        doc.roundedRect(col1X + 10, currentY + 22, mediaW - 20, mediaH - 30, 4).clip();
        doc.image(fotoBuffer, col1X + 10, currentY + 22, {
          fit: [mediaW - 20, mediaH - 30],
          align: "center",
          valign: "center",
        });
        doc.restore();
      } catch {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(SLATE_500).text("Foto tersedia dalam database", col1X + 10, currentY + 45, { align: "center", width: mediaW - 20 });
      }
    } else {
      doc.roundedRect(col1X + 10, currentY + 22, mediaW - 20, mediaH - 30, 4).fill("#e2e8f0");
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#94a3b8").text("🏠", col1X + 10, currentY + 36, { align: "center", width: mediaW - 20 });
      doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_500).text("Belum ada foto rumah terverifikasi lapangan", col1X + 10, currentY + 62, { align: "center", width: mediaW - 20 });
    }

    // QR Code
    doc.roundedRect(col2X, currentY, mediaW, mediaH, 6).fill(SLATE_100);
    doc.roundedRect(col2X, currentY, mediaW, mediaH, 6).lineWidth(1).stroke("#cbd5e1");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(SLATE_700).text("📲 PINDAI UNTUK NAVIGASI GOOGLE MAPS", col2X + 10, currentY + 8);

    if (qrBuffer) {
      try {
        doc.image(qrBuffer, col2X + 10, currentY + 22, { width: 70, height: 70 });
      } catch {}
    }

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0284c7").text("Google Maps Turn-by-Turn", col2X + 88, currentY + 25);
    doc.font("Helvetica").fontSize(7).fillColor(SLATE_700).text("Arahkan kamera HP ke kode QR untuk membuka rute penjemputan langsung di aplikasi GPS driver.", col2X + 88, currentY + 37, { width: mediaW - 96 });
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(TEAL_DARK).text(`DESTINASI: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, col2X + 88, currentY + 75, { width: mediaW - 96 });

    currentY += mediaH + 10;

    // ──────────────────────────────────────────────────────────
    // E. RIWAYAT TAGIHAN & RETRIBUSI
    // ──────────────────────────────────────────────────────────
    const billBoxH = 140;
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, billBoxH, 6).fill(SLATE_100);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, billBoxH, 6).lineWidth(1).stroke("#cbd5e1");

    doc.path(`M ${MARGIN_LEFT},${currentY + 6} Q ${MARGIN_LEFT},${currentY} ${MARGIN_LEFT + 6},${currentY} L ${MARGIN_LEFT + USABLE_WIDTH - 6},${currentY} Q ${MARGIN_LEFT + USABLE_WIDTH},${currentY} ${MARGIN_LEFT + USABLE_WIDTH},${currentY + 6} L ${MARGIN_LEFT + USABLE_WIDTH},${currentY + 22} L ${MARGIN_LEFT},${currentY + 22} Z`).fill(SLATE_900);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff").text("💳 STATUS PEMBAYARAN IURAN & RIWAYAT RETRIBUSI", MARGIN_LEFT + 10, currentY + 6);

    if (isStopAngkut) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#fca5a5").text(`⚠️ TOTAL TUNGGAKAN: ${formatRupiah(totalTunggakan)}`, MARGIN_LEFT + USABLE_WIDTH - 220, currentY + 6, { width: 210, align: "right" });
    } else {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#86efac").text("✓ STATUS: LUNAS / TERTIB PEMBAYARAN", MARGIN_LEFT + USABLE_WIDTH - 220, currentY + 6, { width: 210, align: "right" });
    }

    const thY = currentY + 26;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(SLATE_500);
    doc.text("NO. INVOICE", MARGIN_LEFT + 10, thY, { width: 140 });
    doc.text("PERIODE BULAN", MARGIN_LEFT + 155, thY, { width: 90 });
    doc.text("TARIF IURAN", MARGIN_LEFT + 250, thY, { width: 85, align: "right" });
    doc.text("DENDA", MARGIN_LEFT + 345, thY, { width: 55, align: "right" });
    doc.text("STATUS", MARGIN_LEFT + 415, thY, { width: 65, align: "center" });
    doc.text("JATUH TEMPO", MARGIN_LEFT + 485, thY, { width: 50, align: "right" });

    doc.moveTo(MARGIN_LEFT + 10, thY + 11).lineTo(MARGIN_LEFT + USABLE_WIDTH - 10, thY + 11).lineWidth(0.5).stroke("#cbd5e1");

    let rowY = thY + 15;
    if (bills.length === 0) {
      doc.font("Helvetica").fontSize(8).fillColor(SLATE_500).text("Tidak ada riwayat tagihan terdaftar.", MARGIN_LEFT + 10, rowY + 15, { align: "center", width: USABLE_WIDTH - 20 });
    } else {
      bills.slice(0, 5).forEach((b, idx) => {
        const isLunas = b.status === "lunas";
        const nmBulan = NAMA_BULAN[b.bulan] || b.bulan;
        const jtStr = b.jatuhTempo ? new Date(b.jatuhTempo).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

        if (idx % 2 === 1) {
          doc.rect(MARGIN_LEFT + 8, rowY - 2, USABLE_WIDTH - 16, 16).fill("#f8fafc");
        }

        doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_700).text(b.noInvoice || `INV/${p.kodePelanggan}/${b.tahun}${String(b.bulan).padStart(2, "0")}`, MARGIN_LEFT + 10, rowY, { width: 140, ellipsis: true });
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(SLATE_900).text(`${nmBulan} ${b.tahun}`, MARGIN_LEFT + 155, rowY, { width: 90 });
        doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_800).text(formatRupiah(b.jumlah), MARGIN_LEFT + 250, rowY, { width: 85, align: "right" });
        doc.font("Helvetica").fontSize(7.5).fillColor(b.denda > 0 ? RED_EMERGENCY : SLATE_500).text(b.denda > 0 ? formatRupiah(b.denda) : "—", MARGIN_LEFT + 345, rowY, { width: 55, align: "right" });

        const badgeColor = isLunas ? "#059669" : RED_EMERGENCY;
        const badgeBg = isLunas ? "#d1fae5" : "#fee2e2";
        doc.roundedRect(MARGIN_LEFT + 420, rowY - 1, 55, 12, 3).fill(badgeBg);
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor(badgeColor).text(isLunas ? "LUNAS" : "TUNGGAKAN", MARGIN_LEFT + 420, rowY + 1.5, { width: 55, align: "center" });

        doc.font("Helvetica").fontSize(7).fillColor(SLATE_500).text(jtStr, MARGIN_LEFT + 485, rowY, { width: 50, align: "right" });

        rowY += 17;
      });
    }

    currentY += billBoxH + 10;

    // ──────────────────────────────────────────────────────────
    // F. FOOTER OFFICIAL
    // ──────────────────────────────────────────────────────────
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 26).fill(SLATE_900);
    doc.font("Helvetica").fontSize(6.5).fillColor("#94a3b8").text("Dokumen ini dicetak otomatis dari Sistem Informasi Geografis UPS HERU (upsheru.com/peta). Digunakan sebagai panduan penjemputan armada & validasi rute.", MARGIN_LEFT + 10, currentY + 5, { width: 360 });
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#38bdf8").text("Layanan Pelanggan: 0857-1625-1003  •  www.upsheru.com", MARGIN_LEFT + USABLE_WIDTH - 170, currentY + 5, { width: 160, align: "right" });
    doc.font("Helvetica").fontSize(6).fillColor("#64748b").text(`ID Dokumen: PETA-${p.id}-${Date.now().toString(36).toUpperCase()}`, MARGIN_LEFT + 10, currentY + 15);

    doc.end();
  });
}
