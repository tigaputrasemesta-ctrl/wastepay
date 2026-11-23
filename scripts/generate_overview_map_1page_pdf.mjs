import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';

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

function project(lat, lng, zoom) {
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

// Prominent road corridor definitions with coordinates for explicit labels
const MAJOR_STREETS = [
  { nama: 'JL. RAYA CILODONG', lat: -6.4398, lng: 106.8373, rot: -15, count: '48 KK' },
  { nama: 'AREA BAWAH SMPN 6', lat: -6.4377, lng: 106.8295, rot: 0, count: '140 KK' },
  { nama: 'GG. NIMAN / YKP', lat: -6.4358, lng: 106.8410, rot: 10, count: '70 KK' },
  { nama: 'JL. RAYA BAKUNG', lat: -6.4359, lng: 106.8347, rot: -5, count: '56 KK' },
  { nama: 'SASAK KALIMULYA', lat: -6.4309, lng: 106.8240, rot: 15, count: '69 KK' },
  { nama: 'KP. BULAK / SETU', lat: -6.4453, lng: 106.8379, rot: -10, count: '43 KK' },
  { nama: 'JL. RAYA KP. SAWAH', lat: -6.4485, lng: 106.8271, rot: 0, count: '35 KK' },
  { nama: 'JL. KEBONDUREN', lat: -6.4294, lng: 106.8228, rot: 20, count: '25 KK' },
  { nama: 'JL. ABDUL GANI', lat: -6.4412, lng: 106.8349, rot: 5, count: '30 KK' },
  { nama: 'JL. RAYA BUDEH', lat: -6.4401, lng: 106.8419, rot: -12, count: '23 KK' },
  { nama: 'JL. TABRONI', lat: -6.4302, lng: 106.8208, rot: 0, count: '28 KK' }
];

export async function generateOverviewMapPdf({ isA3 = false, outputPath } = {}) {
  console.log(`[OverviewMap] Menyiapkan Peta Sebaran 1 Halaman (${isA3 ? 'Format A3 Poster Besar' : 'Format A4 Landscape'})...`);

  const querySql = `
    SELECT 
      p.id, 
      p.nama, 
      p."kodePelanggan", 
      p.latitude, 
      p.longitude,
      COALESCE(k.nama, 'Cilodong') as kelurahan,
      COALESCE(z.nama, 'Tanpa Blok') as zona,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM "Tagihan" t 
          WHERE t."pelangganId" = p.id 
            AND t.status IN ('belum_bayar', 'tunggakan') 
            AND t."deletedAt" IS NULL
        ) THEN 'tunggakan'
        ELSE 'lunas'
      END as status_bayar
    FROM "Pelanggan" p
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    LEFT JOIN "Zona" z ON w."zonaId" = z.id
    LEFT JOIN "Kelurahan" k ON p."kelurahanId" = k.id
    WHERE p."deletedAt" IS NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    ORDER BY p.id ASC;
  `;

  const res = await pool.query(querySql);
  const customers = res.rows.map(r => ({
    ...r,
    lat: r.latitude > 0 ? -Number(r.latitude) : Number(r.latitude),
    lng: Number(r.longitude)
  }));

  const totalPoints = customers.length;
  const totalLunas = customers.filter(c => c.status_bayar === 'lunas').length;
  const totalMenunggak = customers.filter(c => c.status_bayar === 'tunggakan').length;

  // Page Dimensions
  // A3 Landscape: 1190.55 x 841.89 pt
  // A4 Landscape: 841.89 x 595.28 pt
  const PAGE_WIDTH = isA3 ? 1190.55 : 841.89;
  const PAGE_HEIGHT = isA3 ? 841.89 : 595.28;
  const MARGIN_LEFT = isA3 ? 24 : 20;
  const MARGIN_RIGHT = isA3 ? 24 : 20;
  const MARGIN_TOP = isA3 ? 20 : 16;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  const doc = new PDFDocument({
    size: isA3 ? 'A3' : 'A4',
    layout: 'landscape',
    margins: { top: MARGIN_TOP, bottom: MARGIN_TOP, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    bufferPages: false,
    autoFirstPage: true
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Colors
  const SLATE_900 = '#0f172a';
  const SLATE_800 = '#1e293b';
  const SLATE_700 = '#334155';
  const EMERALD_600 = '#059669';
  const EMERALD_500 = '#10b981';
  const RED_600 = '#dc2626';
  const RED_500 = '#ef4444';
  const SKY_400 = '#38bdf8';

  let currentY = MARGIN_TOP;

  // ──────────────────────────────────────────────────────────
  // 1. HEADER BAR & METRICS DASHBOARD
  // ──────────────────────────────────────────────────────────
  const headerH = isA3 ? 56 : 46;
  doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, headerH).fill(SLATE_900);
  doc.rect(MARGIN_LEFT, currentY, 5, headerH).fill(EMERALD_500);

  // Logo Badge
  const badgeW = isA3 ? 95 : 80;
  doc.rect(MARGIN_LEFT + 12, currentY + 7, badgeW, headerH - 14).fill('#047857');
  doc.font('Helvetica-Bold').fontSize(isA3 ? 14 : 11.5).fillColor('#ffffff').text('UPS HERU', MARGIN_LEFT + 12, currentY + (isA3 ? 14 : 12), { width: badgeW, align: 'center' });
  doc.font('Helvetica').fontSize(isA3 ? 6.5 : 5.5).fillColor('#a7f3d0').text('GIS MASTER MAP', MARGIN_LEFT + 12, currentY + (isA3 ? 32 : 27), { width: badgeW, align: 'center' });

  // Title
  doc.font('Helvetica-Bold').fontSize(isA3 ? 14 : 12).fillColor('#ffffff')
     .text(`PETA SEBARAN TITIK SELURUH PELANGGAN & JALAN UTAMA (1 HALAMAN)`, MARGIN_LEFT + badgeW + 20, currentY + (isA3 ? 12 : 10));
  doc.font('Helvetica').fontSize(isA3 ? 8.5 : 7.5).fillColor('#94a3b8')
     .text('Nama Jalan & Gang Ditampilkan Jelas untuk Navigasi Armada Kebersihan  •  upsheru.com/peta', MARGIN_LEFT + badgeW + 20, currentY + (isA3 ? 30 : 26));

  // Right Badges
  const chipW = isA3 ? 125 : 105;
  const chipH = headerH - 14;
  let chipX = PAGE_WIDTH - MARGIN_RIGHT - (chipW * 3 + 14);
  const chipY = currentY + 7;

  // Total
  doc.roundedRect(chipX, chipY, chipW, chipH, 4).fill(SLATE_800);
  doc.font('Helvetica').fontSize(isA3 ? 7 : 6).fillColor('#94a3b8').text('TOTAL TERPETAKAN', chipX + 6, chipY + 5);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 12 : 10.5).fillColor('#ffffff').text(`${totalPoints.toLocaleString('id-ID')} Titik`, chipX + 6, chipY + 16);
  chipX += chipW + 6;

  // Lunas
  doc.roundedRect(chipX, chipY, chipW, chipH, 4).fill(SLATE_800);
  doc.font('Helvetica').fontSize(isA3 ? 7 : 6).fillColor('#86efac').text('● LUNAS / TERTIB', chipX + 6, chipY + 5);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 12 : 10.5).fillColor('#4ade80').text(`${totalLunas.toLocaleString('id-ID')} Titik`, chipX + 6, chipY + 16);
  chipX += chipW + 6;

  // Menunggak
  doc.roundedRect(chipX, chipY, chipW, chipH, 4).fill(SLATE_800);
  doc.font('Helvetica').fontSize(isA3 ? 7 : 6).fillColor('#fca5a5').text('● TUNGGAKAN', chipX + 6, chipY + 5);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 12 : 10.5).fillColor('#f87171').text(`${totalMenunggak.toLocaleString('id-ID')} Titik`, chipX + 6, chipY + 16);

  currentY += headerH + 6;

  // ──────────────────────────────────────────────────────────
  // 2. MAIN MAP VIEWPORT (ZOOM 15 HIGH-DETAIL STREET TILES)
  // ──────────────────────────────────────────────────────────
  const footerH = isA3 ? 22 : 18;
  const mapW = USABLE_WIDTH;
  const mapH = PAGE_HEIGHT - currentY - footerH - MARGIN_TOP - 6;
  const mapX = MARGIN_LEFT;
  const mapY = currentY;

  doc.save();
  doc.roundedRect(mapX, mapY, mapW, mapH, 6).fill('#e2e8f0');
  doc.roundedRect(mapX, mapY, mapW, mapH, 6).clip();

  // Projection Parameters
  // Using Zoom 15: Street labels (Jalan, Gang, Blok, RW) are prominent!
  const zoom = 15;
  const centerLat = -6.4385;
  const centerLng = 106.8335;
  const centerPixel = project(centerLat, centerLng, zoom);
  const mapCenterX = mapX + mapW / 2;
  const mapCenterY = mapY + mapH / 2;

  // Scale: At Zoom 15, scale 1.0 or 1.1 ensures street names are big and razor sharp!
  const scale = isA3 ? 1.35 : 1.05;
  const tileSize = 256 * scale;

  // Tile loop covering Zoom 15 Depok: X [26104..26111], Y [16968..16973]
  for (let tx = 26104; tx <= 26111; tx++) {
    for (let ty = 16968; ty <= 16973; ty++) {
      const tileFile = path.join(cacheDir, `${zoom}_${tx}_${ty}.png`);
      if (fs.existsSync(tileFile)) {
        try {
          const tileGlobalPx = tx * 256;
          const tileGlobalPy = ty * 256;
          const offsetPx = tileGlobalPx - centerPixel.px;
          const offsetPy = tileGlobalPy - centerPixel.py;

          const tilePdfX = mapCenterX + offsetPx * scale;
          const tilePdfY = mapCenterY + offsetPy * scale;

          doc.image(tileFile, tilePdfX, tilePdfY, { width: tileSize, height: tileSize });
        } catch {}
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. PLOT ALL CUSTOMER POINTS WITH CLEAR VISIBILITY
  // ──────────────────────────────────────────────────────────
  // Sort: Lunas first, then Menunggak on top
  const sortedCustomers = [...customers].sort((a, b) => {
    if (a.status_bayar === 'lunas' && b.status_bayar === 'tunggakan') return -1;
    if (a.status_bayar === 'tunggakan' && b.status_bayar === 'lunas') return 1;
    return 0;
  });

  const ptRadius = isA3 ? 3.0 : 2.5;
  const haloRadius = isA3 ? 5.5 : 4.5;

  for (const c of sortedCustomers) {
    const cp = project(c.lat, c.lng, zoom);
    const ptX = mapCenterX + (cp.px - centerPixel.px) * scale;
    const ptY = mapCenterY + (cp.py - centerPixel.py) * scale;

    const isInside = ptX >= mapX && ptX <= mapX + mapW && ptY >= mapY && ptY <= mapY + mapH;
    if (isInside) {
      const isLunas = c.status_bayar === 'lunas';
      const colorHalo = isLunas ? '#34d399' : '#f87171';
      const colorSolid = isLunas ? '#059669' : '#dc2626';

      // Soft halo for density
      doc.circle(ptX, ptY, haloRadius).fillOpacity(0.35).fill(colorHalo);

      // Core point
      doc.circle(ptX, ptY, ptRadius).fillOpacity(0.95).fill(colorSolid);
      doc.circle(ptX, ptY, ptRadius).lineWidth(0.4).strokeOpacity(0.9).stroke('#ffffff');
    }
  }

  // ──────────────────────────────────────────────────────────
  // 4. BOLD STREET NAME CALLOUT RIBBONS (AGAR NAMA JALAN TERBACA JELAS!)
  // ──────────────────────────────────────────────────────────
  for (const st of MAJOR_STREETS) {
    const sp = project(st.lat, st.lng, zoom);
    const sx = mapCenterX + (sp.px - centerPixel.px) * scale;
    const sy = mapCenterY + (sp.py - centerPixel.py) * scale;

    if (sx >= mapX + 40 && sx <= mapX + mapW - 60 && sy >= mapY + 25 && sy <= mapY + mapH - 25) {
      doc.save();
      doc.translate(sx, sy);
      if (st.rot) doc.rotate(st.rot);

      const labelTxt = `🛣️ ${st.nama}`;
      const fSize = isA3 ? 9 : 8;
      doc.font('Helvetica-Bold').fontSize(fSize);
      const strW = doc.widthOfString(labelTxt) + (st.count ? 45 : 18);
      const strH = isA3 ? 20 : 17;

      // Drop shadow
      doc.roundedRect(-strW / 2 + 1, -strH / 2 + 1.5, strW, strH, 4).fillOpacity(0.4).fill('#0f172a');

      // Street Badge Background: Bright White with Navy Border
      doc.roundedRect(-strW / 2, -strH / 2, strW, strH, 4).fillOpacity(0.96).fill('#ffffff');
      doc.roundedRect(-strW / 2, -strH / 2, strW, strH, 4).lineWidth(1.2).strokeOpacity(1).stroke('#1e3a8a'); // Royal navy border

      // Text
      doc.font('Helvetica-Bold').fontSize(fSize).fillColor('#0f172a')
         .text(labelTxt, -strW / 2 + 6, -strH / 2 + (isA3 ? 5 : 4.5));

      // Customer count chip
      if (st.count) {
        doc.roundedRect(strW / 2 - 40, -strH / 2 + 2.5, 36, strH - 5, 3).fill('#0284c7');
        doc.font('Helvetica-Bold').fontSize(fSize - 1.5).fillColor('#ffffff')
           .text(st.count, strW / 2 - 40, -strH / 2 + (isA3 ? 5.5 : 4.5), { width: 36, align: 'center' });
      }

      doc.restore();
    }
  }

  // ──────────────────────────────────────────────────────────
  // 5. KELURAHAN REGION BADGES
  // ──────────────────────────────────────────────────────────
  const hubs = [
    { nama: 'KALIBARU', lat: -6.4410, lng: 106.8360, count: '851 Titik', color: '#047857' },
    { nama: 'KALIMULYA', lat: -6.4445, lng: 106.8220, count: '187 Titik', color: '#0284c7' },
    { nama: 'JATIMULYA', lat: -6.4250, lng: 106.8280, count: '108 Titik', color: '#b45309' },
    { nama: 'CILODONG', lat: -6.4380, lng: 106.8480, count: '94 Titik', color: '#7c3aed' }
  ];

  for (const h of hubs) {
    const hp = project(h.lat, h.lng, zoom);
    const hx = mapCenterX + (hp.px - centerPixel.px) * scale;
    const hy = mapCenterY + (hp.py - centerPixel.py) * scale;

    if (hx >= mapX + 30 && hx <= mapX + mapW - 100 && hy >= mapY + 20 && hy <= mapY + mapH - 30) {
      const bW = isA3 ? 110 : 96;
      const bH = isA3 ? 26 : 22;
      doc.roundedRect(hx - bW / 2, hy - bH / 2, bW, bH, 4).fillOpacity(0.94).fill(SLATE_900);
      doc.roundedRect(hx - bW / 2, hy - bH / 2, bW, bH, 4).lineWidth(1.2).strokeOpacity(0.9).stroke(h.color);

      doc.font('Helvetica-Bold').fontSize(isA3 ? 8.5 : 7.5).fillColor('#ffffff').text(`KEL. ${h.nama}`, hx - bW / 2, hy - (isA3 ? 7 : 6), { width: bW, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(isA3 ? 7.5 : 6.5).fillColor(SKY_400).text(h.count, hx - bW / 2, hy + (isA3 ? 4 : 3), { width: bW, align: 'center' });
    }
  }

  // ──────────────────────────────────────────────────────────
  // 6. FLOATING HUD (MODE, COMPASS, LEGENDA, SKALA)
  // ──────────────────────────────────────────────────────────
  // Top-Left: Mode Badge
  doc.roundedRect(mapX + 12, mapY + 12, isA3 ? 240 : 205, isA3 ? 30 : 25, 4).fillOpacity(0.92).fill(SLATE_900);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 9 : 8).fillColor(SKY_400).text('● PETA DETAIL NAMA JALAN & TITIK WARGA', mapX + 18, mapY + (isA3 ? 17 : 15));
  doc.font('Helvetica').fontSize(isA3 ? 7 : 6).fillColor('#94a3b8').text('Nama jalan & gang diperbesar agar mudah dibaca di lapangan', mapX + 18, mapY + (isA3 ? 28 : 24));

  // Top-Right: Compass
  const compassW = isA3 ? 40 : 34;
  const compassH = isA3 ? 40 : 34;
  const compassX = mapX + mapW - compassW - 12;
  const compassY = mapY + 12;
  doc.roundedRect(compassX, compassY, compassW, compassH, 4).fillOpacity(0.92).fill(SLATE_900);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 15 : 13).fillColor('#f8fafc').text('▲', compassX, compassY + 5, { width: compassW, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(isA3 ? 7.5 : 6.5).fillColor(SKY_400).text('UTARA', compassX, compassY + (isA3 ? 24 : 21), { width: compassW, align: 'center' });

  // Bottom-Left: Legend
  const legW = isA3 ? 230 : 205;
  const legH = isA3 ? 82 : 72;
  const legX = mapX + 12;
  const legY = mapY + mapH - legH - 12;

  doc.roundedRect(legX, legY, legW, legH, 5).fillOpacity(0.94).fill(SLATE_900);
  doc.roundedRect(legX, legY, legW, legH, 5).lineWidth(1).strokeOpacity(0.6).stroke(SLATE_700);

  doc.font('Helvetica-Bold').fontSize(isA3 ? 8.5 : 7.5).fillColor('#ffffff').text('LEGENDA STATUS RETRIBUSI PELANGGAN', legX + 10, legY + 8);

  // Legend 1: Lunas
  doc.circle(legX + 16, legY + (isA3 ? 28 : 24), 5).fillOpacity(0.4).fill('#34d399');
  doc.circle(legX + 16, legY + (isA3 ? 28 : 24), 2.8).fillOpacity(1).fill(EMERALD_500);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 8 : 7).fillColor('#e2e8f0').text('Pelanggan Tertib / Lunas', legX + 28, legY + (isA3 ? 24 : 21));
  doc.font('Helvetica').fontSize(isA3 ? 7.5 : 6.5).fillColor('#94a3b8').text(`: ${totalLunas} Titik`, legX + (isA3 ? 140 : 125), legY + (isA3 ? 24 : 21));

  // Legend 2: Menunggak
  doc.circle(legX + 16, legY + (isA3 ? 45 : 39), 5).fillOpacity(0.4).fill('#f87171');
  doc.circle(legX + 16, legY + (isA3 ? 45 : 39), 2.8).fillOpacity(1).fill(RED_500);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 8 : 7).fillColor('#e2e8f0').text('Pelanggan Menunggak', legX + 28, legY + (isA3 ? 41 : 36));
  doc.font('Helvetica').fontSize(isA3 ? 7.5 : 6.5).fillColor('#94a3b8').text(`: ${totalMenunggak} Titik`, legX + (isA3 ? 140 : 125), legY + (isA3 ? 41 : 36));

  // Legend 3: Info Jalan
  doc.font('Helvetica-Oblique').fontSize(isA3 ? 7 : 6).fillColor('#38bdf8')
     .text('🛣️ Label putih menunjukkan koridor jalan & jumlah pelanggan', legX + 10, legY + (isA3 ? 60 : 53), { width: legW - 20 });

  // Bottom-Right: Scale Bar & Attribution
  const scaleBoxW = isA3 ? 220 : 195;
  const scaleBoxH = isA3 ? 34 : 28;
  const scaleBoxX = mapX + mapW - scaleBoxW - 12;
  const scaleBoxY = mapY + mapH - scaleBoxH - 12;

  doc.roundedRect(scaleBoxX, scaleBoxY, scaleBoxW, scaleBoxH, 4).fillOpacity(0.94).fill(SLATE_900);
  const barLen = isA3 ? 80 : 65;
  const barX = scaleBoxX + 12;
  const barY = scaleBoxY + (isA3 ? 14 : 11);

  doc.rect(barX, barY, barLen / 2, 3).fill('#ffffff');
  doc.rect(barX + barLen / 2, barY, barLen / 2, 3).fill(SLATE_700);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 7 : 6).fillColor('#ffffff').text('0', barX - 2, barY - 7);
  doc.font('Helvetica-Bold').fontSize(isA3 ? 7 : 6).fillColor('#ffffff').text('500 M', barX + barLen - 12, barY - 7);

  doc.font('Helvetica').fontSize(isA3 ? 7 : 6).fillColor('#94a3b8')
     .text('© OpenStreetMap contributors', scaleBoxX + 85, scaleBoxY + (isA3 ? 7 : 6), { width: scaleBoxW - 95, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(isA3 ? 7 : 6).fillColor(SKY_400)
     .text('UPS HERU GIS DEPOK', scaleBoxX + 85, scaleBoxY + (isA3 ? 18 : 15), { width: scaleBoxW - 95, align: 'right' });

  doc.restore();

  // Outer Map Stroke
  doc.roundedRect(mapX, mapY, mapW, mapH, 6).lineWidth(1.5).stroke(SLATE_800);

  // ──────────────────────────────────────────────────────────
  // 7. FOOTER
  // ──────────────────────────────────────────────────────────
  currentY += mapH + 6;
  doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, footerH).fill(SLATE_900);
  doc.font('Helvetica').fontSize(isA3 ? 7 : 6.5).fillColor('#94a3b8')
     .text(`Dokumen Resmi Peta Master UPS HERU Kota Depok (Cilodong, Kalibaru, Kalimulya, Jatimulya). 1 Lembar memuat ${totalPoints} titik koordinat pelanggan aktif.`, MARGIN_LEFT + 8, currentY + (isA3 ? 6 : 5), { width: USABLE_WIDTH - 220 });
  doc.font('Helvetica-Bold').fontSize(isA3 ? 7 : 6.5).fillColor(SKY_400)
     .text('Portal GIS: upsheru.com/peta  •  CS: 0857-1625-1003', MARGIN_LEFT + USABLE_WIDTH - 220, currentY + (isA3 ? 6 : 5), { width: 210, align: 'right' });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`[OverviewMap] SUKSES! File tersimpan: ${outputPath} (${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB)`);
      resolve(outputPath);
    });
    writeStream.on('error', reject);
  });
}

// Direct Execution CLI: Generate BOTH A4 High-Legibility & A3 Super-Poster
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = '/data/data/com.termux/files/home/downloads';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const a4Path = path.join(outDir, 'Peta_Sebaran_Seluruh_Pelanggan_UPSHERU_1Halaman.pdf');
  const a3Path = path.join(outDir, 'Peta_Sebaran_Seluruh_Pelanggan_UPSHERU_A3_Besar.pdf');

  (async () => {
    await generateOverviewMapPdf({ isA3: false, outputPath: a4Path });
    await generateOverviewMapPdf({ isA3: true, outputPath: a3Path });
    pool.end();
    process.exit(0);
  })().catch(err => {
    console.error('Fatal error:', err);
    pool.end();
    process.exit(1);
  });
}
