import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cacheDir = '/tmp/osm_tiles_cache';
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function project(lat, lng, zoom = 17) {
  const n = Math.pow(2, zoom);
  const rad = (lat * Math.PI) / 180;
  const px = ((lng + 180) / 360) * n * 256;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  return {
    px,
    py,
    tileX: Math.floor(px / 256),
    tileY: Math.floor(py / 256)
  };
}

function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

const NAMA_BULAN = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export async function generatePelangganMapBook({ mode = 'all', limit = null, outputPath } = {}) {
  const t0 = Date.now();
  console.log(`[MapBook] Memulai pembuatan buku peta pelanggan (mode: ${mode})...`);

  // 1. Fetch Customers - GUARANTEED UNIQUE (NO DUPLICATES)
  let whereClause = `p."deletedAt" IS NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL`;
  if (mode === 'unpaid') {
    whereClause += ` AND EXISTS (SELECT 1 FROM "Tagihan" t WHERE t."pelangganId" = p.id AND t.status IN ('belum_bayar', 'tunggakan') AND t."deletedAt" IS NULL)`;
  }

  const querySql = `
    SELECT 
      p.id, p.nama, p."kodePelanggan", p."noTelepon", p.alamat, p."rtRw",
      p.latitude, p.longitude, p.status, p.kategori, p."patokanLokasi", p."fotoRumah",
      COALESCE(z.nama, 'Tanpa Blok') as zona,
      COALESCE(k.nama, 'Cilodong') as kelurahan,
      COALESCE(w.nama, z.nama, 'Umum') as wilayah,
      rute_info.nama_rute,
      rute_info.nama_petugas
    FROM "Pelanggan" p
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    LEFT JOIN "Zona" z ON w."zonaId" = z.id
    LEFT JOIN "Kelurahan" k ON p."kelurahanId" = k.id
    LEFT JOIN LATERAL (
      SELECT r.nama as nama_rute, pet.nama as nama_petugas
      FROM "Jadwal" j
      JOIN "Rute" r ON j."ruteId" = r.id
      JOIN "Petugas" pet ON r."petugasId" = pet.id
      WHERE j."pelangganId" = p.id
      LIMIT 1
    ) rute_info ON true
    WHERE ${whereClause}
    ORDER BY COALESCE(z.nama, 'Tanpa Blok') ASC, p.nama ASC
    ${limit ? `LIMIT ${limit}` : ''};
  `;

  console.log('[MapBook] Mengambil data pelanggan unik dari database...');
  const custRes = await pool.query(querySql);
  const customers = custRes.rows;
  console.log(`[MapBook] Berhasil mengambil ${customers.length} data pelanggan.`);

  if (customers.length === 0) {
    console.log('[MapBook] Tidak ada data pelanggan untuk dicetak.');
    return null;
  }

  // 2. Fetch Bills in a single batch
  console.log('[MapBook] Mengambil riwayat tagihan seluruh pelanggan...');
  const custIds = customers.map(c => c.id);
  const billsRes = await pool.query(`
    SELECT "pelangganId", id, bulan, tahun, status, jumlah, COALESCE(denda, 0) as denda, "jatuhTempo", "noInvoice"
    FROM "Tagihan"
    WHERE "pelangganId" = ANY($1) AND "deletedAt" IS NULL
    ORDER BY tahun DESC, bulan DESC;
  `, [custIds]);

  const billsMap = new Map();
  for (const b of billsRes.rows) {
    if (!billsMap.has(b.pelangganId)) {
      billsMap.set(b.pelangganId, []);
    }
    const arr = billsMap.get(b.pelangganId);
    if (arr.length < 5) {
      arr.push(b);
    }
  }

  // 3. Initialize Streaming PDF Document
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 22, bottom: 22, left: 25, right: 25 },
    autoFirstPage: false,
    bufferPages: false // Stream to disk, constant low RAM
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // 4. Pre-load openImage for all cached map tiles
  // Reusing PDFKit XObject images drops PDF size from ~300MB to ~15MB!
  console.log('[MapBook] Menyiapkan cache objek peta untuk efisiensi kompresi PDF...');
  const tileImageMap = new Map();
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    for (const f of files) {
      if (f.endsWith('.png')) {
        const full = path.join(cacheDir, f);
        try {
          const imgObj = doc.openImage(full);
          tileImageMap.set(f, imgObj);
        } catch {}
      }
    }
  }
  console.log(`[MapBook] Berhasil menginisialisasi ${tileImageMap.size} objek tile peta.`);

  const PAGE_WIDTH = 595.28;
  const MARGIN_LEFT = 25;
  const MARGIN_RIGHT = 25;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 545.28 pt

  // Colors
  const TEAL_DARK = '#0f766e';
  const TEAL_LIGHT = '#14b8a6';
  const SLATE_900 = '#0f172a';
  const SLATE_800 = '#1e293b';
  const SLATE_700 = '#334155';
  const SLATE_500 = '#64748b';
  const SLATE_100 = '#f1f5f9';
  const RED_EMERGENCY = '#ef4444';

  const docDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const totalCount = customers.length;

  console.log(`[MapBook] Merender ${totalCount} halaman PDF (1 halaman penuh per pelanggan)...`);

  for (let idx = 0; idx < totalCount; idx++) {
    const p = customers[idx];
    const pageNum = idx + 1;

    doc.addPage();
    let currentY = 22;

    const bills = billsMap.get(p.id) || [];
    const unpaidBills = bills.filter(b => b.status === 'belum_bayar' || b.status === 'tunggakan');
    const totalTunggakan = unpaidBills.reduce((acc, b) => acc + Number(b.jumlah) + Number(b.denda), 0);
    const isStopAngkut = unpaidBills.length > 0;

    const lat = Number(p.latitude);
    const lng = Number(p.longitude);

    // ──────────────────────────────────────────────────────────
    // A. HEADER BAR
    // ──────────────────────────────────────────────────────────
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 52).fill(SLATE_900);
    doc.rect(MARGIN_LEFT, currentY, 6, 52).fill(isStopAngkut ? RED_EMERGENCY : TEAL_LIGHT);

    // Logo Badge
    doc.rect(MARGIN_LEFT + 12, currentY + 8, 76, 36).fill(isStopAngkut ? '#991b1b' : '#047857');
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('UPS HERU', MARGIN_LEFT + 14, currentY + 14, { width: 72, align: 'center' });
    doc.font('Helvetica').fontSize(6).fillColor(isStopAngkut ? '#fca5a5' : '#a7f3d0').text('PETA PELANGGAN', MARGIN_LEFT + 14, currentY + 31, { width: 72, align: 'center' });

    // Header Title
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text('LEMBAR PETA & NAVIGASI LOKASI PELANGGAN', MARGIN_LEFT + 98, currentY + 11);
    doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text(`Katalog Lengkap GIS Pengangkutan Sampah — Kota Depok  •  upsheru.com/peta`, MARGIN_LEFT + 98, currentY + 26);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#38bdf8').text(`Blok: ${p.zona}  •  Kelurahan ${p.kelurahan}`, MARGIN_LEFT + 98, currentY + 38);

    // Right Metadata Badge
    doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 115, currentY + 8, 107, 36).fill(SLATE_800);
    doc.font('Helvetica').fontSize(6).fillColor('#94a3b8').text(`HALAMAN ${pageNum} / ${totalCount}`, PAGE_WIDTH - MARGIN_RIGHT - 112, currentY + 12, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#f8fafc').text(docDate, PAGE_WIDTH - MARGIN_RIGHT - 112, currentY + 21, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(7).fillColor(isStopAngkut ? '#fca5a5' : '#86efac').text(isStopAngkut ? 'STATUS: TUNGGAKAN' : 'STATUS: REGULER', PAGE_WIDTH - MARGIN_RIGHT - 112, currentY + 32, { width: 100, align: 'right' });

    currentY += 58;

    // ──────────────────────────────────────────────────────────
    // B. PETA VISUAL (SLIPPY MAP RENDER WITH REUSED TILES)
    // ──────────────────────────────────────────────────────────
    const mapW = USABLE_WIDTH;
    const mapH = 250;
    const mapX = MARGIN_LEFT;
    const mapY = currentY;

    doc.save();
    doc.roundedRect(mapX, mapY, mapW, mapH, 6).fill('#e2e8f0');
    doc.roundedRect(mapX, mapY, mapW, mapH, 6).clip();

    const scale = 0.85;
    const tileSize = 256 * scale;
    const centerX = mapX + mapW / 2;
    const centerY = mapY + mapH / 2;

    const center = project(lat, lng, 17);
    const cx = center.tileX;
    const cy = center.tileY;

    // Place 3x3 tiles using cached XObject
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `17_${tx}_${ty}.png`;
        const imgObj = tileImageMap.get(key);
        if (imgObj) {
          const tileGlobalPx = tx * 256;
          const tileGlobalPy = ty * 256;
          const offsetPx = tileGlobalPx - center.px;
          const offsetPy = tileGlobalPy - center.py;

          const tilePdfX = centerX + offsetPx * scale;
          const tilePdfY = centerY + offsetPy * scale;

          try {
            doc.image(imgObj, tilePdfX, tilePdfY, { width: tileSize, height: tileSize });
          } catch {}
        }
      }
    }

    // Concentric Radar Rings
    doc.circle(centerX, centerY, 80).lineWidth(1).strokeOpacity(0.3).stroke('#0284c7');
    doc.circle(centerX, centerY, 45).lineWidth(1).strokeOpacity(0.45).stroke('#0284c7');
    doc.circle(centerX, centerY, 18).lineWidth(1.5).strokeOpacity(0.6).stroke('#0284c7');
    doc.circle(centerX, centerY, 24).fillOpacity(0.2).fill('#38bdf8');

    // Pin Drop Marker
    doc.save();
    doc.translate(centerX, centerY);
    doc.ellipse(0, 2, 7, 3.5).fillOpacity(0.3).fill('#0f172a');
    doc.fillOpacity(1);
    doc.path('M 0,0 C -4,-6 -10,-12 -10,-18 C -10,-24 -5,-29 0,-29 C 5,-29 10,-24 10,-18 C 10,-12 4,-6 0,0 Z')
       .fill(isStopAngkut ? '#dc2626' : '#059669');
    doc.circle(0, -18, 4).fill('#ffffff');
    doc.restore();

    // Callout Speech Bubble
    const labelText = `${p.nama} (${p.kodePelanggan})`;
    const labelW = Math.min(260, doc.widthOfString(labelText, { font: 'Helvetica-Bold', size: 8.5 }) + 18);
    const labelH = 18;
    const bubbleX = centerX - labelW / 2;
    const bubbleY = centerY - 52;

    doc.roundedRect(bubbleX, bubbleY, labelW, labelH, 4).fillOpacity(0.95).fill(SLATE_900);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
       .text(labelText, bubbleX + 4, bubbleY + 5, { width: labelW - 8, align: 'center', ellipsis: true });

    // HUD Badges
    doc.roundedRect(mapX + 8, mapY + 8, 145, 18, 4).fillOpacity(0.85).fill(SLATE_900);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#38bdf8').text('● PETA PRESISI RT/RW (ZOOM 17)', mapX + 14, mapY + 13);

    doc.roundedRect(mapX + mapW - 36, mapY + 8, 28, 26, 4).fillOpacity(0.85).fill(SLATE_900);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#f8fafc').text('▲', mapX - 36 + mapW, mapY + 11, { width: 28, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#94a3b8').text('UTARA', mapX - 36 + mapW, mapY + 23, { width: 28, align: 'center' });

    doc.rect(mapX, mapY + mapH - 20, mapW, 20).fillOpacity(0.88).fill(SLATE_900);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#38bdf8').text(`GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, mapX + 10, mapY + mapH - 14);
    doc.font('Helvetica').fontSize(6).fillColor('#94a3b8').text('© OpenStreetMap contributors | UPS HERU GIS Fleet Engine', mapX + mapW - 220, mapY + mapH - 14, { width: 210, align: 'right' });

    doc.restore();
    doc.roundedRect(mapX, mapY, mapW, mapH, 6).lineWidth(1.2).stroke(SLATE_800);

    currentY += mapH + 8;

    // ──────────────────────────────────────────────────────────
    // C. IDENTITAS & LOKASI (2 COLUMNS)
    // ──────────────────────────────────────────────────────────
    const colW = (USABLE_WIDTH - 8) / 2;
    const col1X = MARGIN_LEFT;
    const col2X = MARGIN_LEFT + colW + 8;
    const boxH = 130;

    // Box 1: Identitas
    doc.roundedRect(col1X, currentY, colW, boxH, 5).fill(SLATE_100);
    doc.roundedRect(col1X, currentY, colW, boxH, 5).lineWidth(1).stroke('#cbd5e1');
    doc.path(`M ${col1X},${currentY + 5} Q ${col1X},${currentY} ${col1X + 5},${currentY} L ${col1X + colW - 5},${currentY} Q ${col1X + colW},${currentY} ${col1X + colW},${currentY + 5} L ${col1X + colW},${currentY + 20} L ${col1X},${currentY + 20} Z`).fill(TEAL_DARK);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('👤 DATA IDENTITAS PELANGGAN', col1X + 8, currentY + 5.5);

    let py1 = currentY + 25;
    const drawField1 = (label, val, bold = false, col = SLATE_800) => {
      doc.font('Helvetica').fontSize(6.5).fillColor(SLATE_500).text(label, col1X + 8, py1);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(col).text(val || '—', col1X + 8, py1 + 8, { width: colW - 16, ellipsis: true });
      py1 += 20;
    };
    drawField1('NAMA PELANGGAN', p.nama, true, '#0f172a');
    drawField1('KODE PELANGGAN / ID', p.kodePelanggan, true, TEAL_DARK);
    drawField1('NO. TELEPON / WHATSAPP', p.noTelepon ? `${p.noTelepon} (WhatsApp Aktif)` : '—', true, '#0284c7');
    drawField1('KATEGORI & STATUS', `${p.kategori.toUpperCase()}  •  ${p.status.toUpperCase()}`, false, SLATE_700);

    // Box 2: Akses Wilayah
    doc.roundedRect(col2X, currentY, colW, boxH, 5).fill(SLATE_100);
    doc.roundedRect(col2X, currentY, colW, boxH, 5).lineWidth(1).stroke('#cbd5e1');
    doc.path(`M ${col2X},${currentY + 5} Q ${col2X},${currentY} ${col2X + 5},${currentY} L ${col2X + colW - 5},${currentY} Q ${col2X + colW},${currentY} ${col2X + colW},${currentY + 5} L ${col2X + colW},${currentY + 20} L ${col2X},${currentY + 20} Z`).fill(SLATE_800);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('📍 DETAIL WILAYAH & AKSES ARMADA', col2X + 8, currentY + 5.5);

    let py2 = currentY + 25;
    const drawField2 = (label, val, bold = false, col = SLATE_800) => {
      doc.font('Helvetica').fontSize(6.5).fillColor(SLATE_500).text(label, col2X + 8, py2);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(col).text(val || '—', col2X + 8, py2 + 8, { width: colW - 16, ellipsis: true });
      py2 += 20;
    };
    drawField2('BLOK LAYANAN / ZONA', `${p.zona} (Kel. ${p.kelurahan})`, true, '#047857');
    drawField2('ALAMAT LENGKAP & RT/RW', `${p.alamat || 'Jl raya'}${p.rtRw ? ' · RT/RW ' + p.rtRw : ''}`, false, SLATE_900);
    drawField2('PATOKAN LOKASI / RUMAH', p.patokanLokasi || 'Tidak ada catatan patokan khusus', false, p.patokanLokasi ? '#b45309' : SLATE_500);
    drawField2('ARMADA PENJEMPUT / SUPIR', p.nama_petugas ? `${p.nama_petugas} (${p.nama_rute || 'Rute Reguler'})` : 'Reguler Tim Kebersihan Cilodong', false, SLATE_700);

    currentY += boxH + 8;

    // ──────────────────────────────────────────────────────────
    // D. FOTO RUMAH & QR NAVIGASI
    // ──────────────────────────────────────────────────────────
    const mediaH = 95;
    const mediaW = (USABLE_WIDTH - 8) / 2;

    // Card 1: Foto Rumah
    doc.roundedRect(col1X, currentY, mediaW, mediaH, 5).fill(SLATE_100);
    doc.roundedRect(col1X, currentY, mediaW, mediaH, 5).lineWidth(1).stroke('#cbd5e1');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SLATE_700).text('📷 FOTO RUMAH / TITIK JEMPUT', col1X + 8, currentY + 7);

    let hasFoto = false;
    if (p.fotoRumah && p.fotoRumah.startsWith('data:image')) {
      try {
        const match = p.fotoRumah.match(/^data:image\/[a-zA-Z0-9]+;base64,(.+)$/);
        if (match) {
          const fBuf = Buffer.from(match[1], 'base64');
          doc.save();
          doc.roundedRect(col1X + 8, currentY + 20, mediaW - 16, mediaH - 26, 3).clip();
          doc.image(fBuf, col1X + 8, currentY + 20, {
            fit: [mediaW - 16, mediaH - 26],
            align: 'center',
            valign: 'center'
          });
          doc.restore();
          hasFoto = true;
        }
      } catch {}
    }

    if (!hasFoto) {
      doc.roundedRect(col1X + 8, currentY + 20, mediaW - 16, mediaH - 26, 3).fill('#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#94a3b8').text('🏠', col1X + 8, currentY + 34, { align: 'center', width: mediaW - 16 });
      doc.font('Helvetica').fontSize(7).fillColor(SLATE_500).text('Belum ada foto rumah terverifikasi lapangan', col1X + 8, currentY + 58, { align: 'center', width: mediaW - 16 });
    }

    // Card 2: QR Code Google Maps
    doc.roundedRect(col2X, currentY, mediaW, mediaH, 5).fill(SLATE_100);
    doc.roundedRect(col2X, currentY, mediaW, mediaH, 5).lineWidth(1).stroke('#cbd5e1');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SLATE_700).text('📲 PINDAI UNTUK NAVIGASI GOOGLE MAPS', col2X + 8, currentY + 7);

    try {
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const qrBuf = await QRCode.toBuffer(navUrl, { margin: 1, width: 68 });
      doc.image(qrBuf, col2X + 8, currentY + 20, { width: 68, height: 68 });
    } catch {}

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0284c7').text('Google Maps Turn-by-Turn', col2X + 82, currentY + 24);
    doc.font('Helvetica').fontSize(6.5).fillColor(SLATE_700).text('Pindai QR ini dengan kamera HP driver untuk memulai navigasi turn-by-turn ke titik rumah.', col2X + 82, currentY + 35, { width: mediaW - 88 });
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(TEAL_DARK).text(`DESTINASI: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, col2X + 82, currentY + 72, { width: mediaW - 88 });

    currentY += mediaH + 8;

    // ──────────────────────────────────────────────────────────
    // E. RIWAYAT TAGIHAN
    // ──────────────────────────────────────────────────────────
    const billBoxH = 135;
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, billBoxH, 5).fill(SLATE_100);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, billBoxH, 5).lineWidth(1).stroke('#cbd5e1');

    doc.path(`M ${MARGIN_LEFT},${currentY + 5} Q ${MARGIN_LEFT},${currentY} ${MARGIN_LEFT + 5},${currentY} L ${MARGIN_LEFT + USABLE_WIDTH - 5},${currentY} Q ${MARGIN_LEFT + USABLE_WIDTH},${currentY} ${MARGIN_LEFT + USABLE_WIDTH},${currentY + 5} L ${MARGIN_LEFT + USABLE_WIDTH},${currentY + 20} L ${MARGIN_LEFT},${currentY + 20} Z`).fill(SLATE_900);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('💳 STATUS PEMBAYARAN IURAN & RIWAYAT RETRIBUSI', MARGIN_LEFT + 8, currentY + 5.5);

    if (isStopAngkut) {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#fca5a5').text(`⚠️ TOTAL TUNGGAKAN: ${formatRupiah(totalTunggakan)}`, MARGIN_LEFT + USABLE_WIDTH - 210, currentY + 5.5, { width: 200, align: 'right' });
    } else {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#86efac').text('✓ STATUS: LUNAS / TERTIB PEMBAYARAN', MARGIN_LEFT + USABLE_WIDTH - 210, currentY + 5.5, { width: 200, align: 'right' });
    }

    const thY = currentY + 24;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(SLATE_500);
    doc.text('NO. INVOICE', MARGIN_LEFT + 8, thY, { width: 140 });
    doc.text('PERIODE', MARGIN_LEFT + 150, thY, { width: 85 });
    doc.text('TARIF', MARGIN_LEFT + 240, thY, { width: 80, align: 'right' });
    doc.text('DENDA', MARGIN_LEFT + 330, thY, { width: 55, align: 'right' });
    doc.text('STATUS', MARGIN_LEFT + 400, thY, { width: 65, align: 'center' });
    doc.text('JATUH TEMPO', MARGIN_LEFT + 475, thY, { width: 60, align: 'right' });

    doc.moveTo(MARGIN_LEFT + 8, thY + 10).lineTo(MARGIN_LEFT + USABLE_WIDTH - 8, thY + 10).lineWidth(0.5).stroke('#cbd5e1');

    let rowY = thY + 14;
    if (bills.length === 0) {
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE_500).text('Tidak ada catatan tunggakan / riwayat tagihan terdaftar.', MARGIN_LEFT + 8, rowY + 12, { align: 'center', width: USABLE_WIDTH - 16 });
    } else {
      bills.slice(0, 5).forEach((b, bIdx) => {
        const isLunas = b.status === 'lunas';
        const nmBulan = NAMA_BULAN[b.bulan] || b.bulan;
        const jtStr = b.jatuhTempo ? new Date(b.jatuhTempo).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

        if (bIdx % 2 === 1) {
          doc.rect(MARGIN_LEFT + 6, rowY - 2, USABLE_WIDTH - 12, 15).fill('#f8fafc');
        }

        doc.font('Helvetica').fontSize(7).fillColor(SLATE_700).text(b.noInvoice || `INV/${p.kodePelanggan}/${b.tahun}${String(b.bulan).padStart(2, '0')}`, MARGIN_LEFT + 8, rowY, { width: 140, ellipsis: true });
        doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE_900).text(`${nmBulan} ${b.tahun}`, MARGIN_LEFT + 150, rowY, { width: 85 });
        doc.font('Helvetica').fontSize(7).fillColor(SLATE_800).text(formatRupiah(b.jumlah), MARGIN_LEFT + 240, rowY, { width: 80, align: 'right' });
        doc.font('Helvetica').fontSize(7).fillColor(b.denda > 0 ? RED_EMERGENCY : SLATE_500).text(b.denda > 0 ? formatRupiah(b.denda) : '—', MARGIN_LEFT + 330, rowY, { width: 55, align: 'right' });

        const badgeColor = isLunas ? '#059669' : RED_EMERGENCY;
        const badgeBg = isLunas ? '#d1fae5' : '#fee2e2';
        doc.roundedRect(MARGIN_LEFT + 405, rowY - 1, 55, 11, 2).fill(badgeBg);
        doc.font('Helvetica-Bold').fontSize(6).fillColor(badgeColor).text(isLunas ? 'LUNAS' : 'TUNGGAKAN', MARGIN_LEFT + 405, rowY + 1.5, { width: 55, align: 'center' });

        doc.font('Helvetica').fontSize(6.5).fillColor(SLATE_500).text(jtStr, MARGIN_LEFT + 475, rowY, { width: 60, align: 'right' });

        rowY += 16;
      });
    }

    currentY += billBoxH + 8;

    // ──────────────────────────────────────────────────────────
    // F. FOOTER OFFICIAL
    // ──────────────────────────────────────────────────────────
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 22).fill(SLATE_900);
    doc.font('Helvetica').fontSize(6).fillColor('#94a3b8').text(`Dokumen Resmi Sistem Informasi Geografis UPS HERU (upsheru.com/peta). Digunakan untuk armada & verifikasi rute.`, MARGIN_LEFT + 8, currentY + 4, { width: 360 });
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#38bdf8').text('Layanan Pelanggan: 0857-1625-1003  •  www.upsheru.com', MARGIN_LEFT + USABLE_WIDTH - 170, currentY + 4, { width: 160, align: 'right' });
    doc.font('Helvetica').fontSize(5.5).fillColor('#64748b').text(`ID Dokumen: PETA-${p.id}-${Date.now().toString(36).toUpperCase()}  •  Hal. ${pageNum} dari ${totalCount}`, MARGIN_LEFT + 8, currentY + 12);

    if (pageNum % 100 === 0 || pageNum === totalCount) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[MapBook] Progress: ${pageNum}/${totalCount} halaman selesai (${((pageNum / totalCount) * 100).toFixed(1)}%) [${elapsed}s]`);
    }
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`[MapBook] SUKSES! ${totalCount} halaman tersimpan di: ${outputPath} (${sizeMb} MB dalam ${totalTime}s)`);
  return { outputPath, totalCount, sizeMb, totalTime };
}

// Direct Execution CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const isUnpaid = args.includes('--unpaid');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  const outDir = '/data/data/com.termux/files/home/downloads';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileName = isUnpaid 
    ? 'Buku_Peta_Pelanggan_Tertunggak_UPSHERU.pdf'
    : 'Buku_Peta_Navigasi_Semua_Pelanggan_UPSHERU.pdf';
  const outPath = path.join(outDir, fileName);

  generatePelangganMapBook({
    mode: isUnpaid ? 'unpaid' : 'all',
    limit,
    outputPath: outPath
  }).then(res => {
    pool.end();
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    pool.end();
    process.exit(1);
  });
}
