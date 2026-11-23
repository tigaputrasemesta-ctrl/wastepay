import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';

// Load environment variables from wastepay
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const formatRupiah = (num) => {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
};

const formatPhoneWA = (phone) => {
  if (!phone) return { display: '-', url: null };
  const cleaned = phone.replace(/[^0-9]/g, '');
  let waNumber = cleaned;
  if (waNumber.startsWith('0')) {
    waNumber = '62' + waNumber.slice(1);
  } else if (!waNumber.startsWith('62')) {
    waNumber = '62' + waNumber;
  }
  return {
    display: phone.trim(),
    url: `https://wa.me/${waNumber}`
  };
};

const NAMA_BULAN_SINGKAT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

async function main() {
  console.log('Connecting to database...');
  
  // 1. Fetch overall statistics
  const statsRes = await pool.query(`
    SELECT 
      COUNT(DISTINCT p.id) as total_pelanggan,
      COUNT(t.id) as total_tagihan,
      SUM(t.jumlah) as total_pokok,
      SUM(COALESCE(t.denda, 0)) as total_denda,
      SUM(t.jumlah + COALESCE(t.denda, 0)) as total_semua
    FROM "Tagihan" t
    JOIN "Pelanggan" p ON t."pelangganId" = p.id
    WHERE t.status IN ('belum_bayar', 'tunggakan')
      AND t."deletedAt" IS NULL
      AND p."deletedAt" IS NULL;
  `);
  const overallStats = statsRes.rows[0];

  // 2. Fetch zone statistics
  const zoneStatsRes = await pool.query(`
    SELECT 
      COALESCE(z.nama, 'Tanpa Zona') as zona,
      COUNT(DISTINCT p.id) as jumlah_pelanggan,
      COUNT(t.id) as jumlah_tagihan,
      SUM(t.jumlah + COALESCE(t.denda, 0)) as total_nominal
    FROM "Tagihan" t
    JOIN "Pelanggan" p ON t."pelangganId" = p.id
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    LEFT JOIN "Zona" z ON w."zonaId" = z.id
    WHERE t.status IN ('belum_bayar', 'tunggakan')
      AND t."deletedAt" IS NULL
      AND p."deletedAt" IS NULL
    GROUP BY z.nama
    ORDER BY total_nominal DESC, z.nama ASC;
  `);
  const zoneStats = zoneStatsRes.rows;

  // 3. Fetch detailed customer list
  const customersRes = await pool.query(`
    SELECT 
      p.id,
      p.nama,
      p."noTelepon",
      p."kodePelanggan",
      p.alamat,
      p."rtRw",
      p.latitude,
      p.longitude,
      COALESCE(z.nama, 'Tanpa Zona') as zona,
      k.nama as kelurahan,
      w.nama as wilayah,
      COUNT(t.id) as total_tagihan,
      SUM(t.jumlah + COALESCE(t.denda, 0)) as total_nominal,
      STRING_AGG(CONCAT(t.bulan, '/', t.tahun, ':', t.status), ',' ORDER BY t.tahun, t.bulan) as raw_tagihan
    FROM "Pelanggan" p
    JOIN "Tagihan" t ON p.id = t."pelangganId"
    LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
    LEFT JOIN "Zona" z ON w."zonaId" = z.id
    LEFT JOIN "Kelurahan" k ON p."kelurahanId" = k.id
    WHERE t.status IN ('belum_bayar', 'tunggakan')
      AND t."deletedAt" IS NULL
      AND p."deletedAt" IS NULL
    GROUP BY p.id, p.nama, p."noTelepon", p."kodePelanggan", p.alamat, p."rtRw", p.latitude, p.longitude, z.nama, k.nama, w.nama
    ORDER BY COALESCE(z.nama, 'Tanpa Zona') ASC, p.nama ASC;
  `);
  const customers = customersRes.rows;
  await pool.end();

  console.log(`Fetched ${customers.length} unpaid customers across ${zoneStats.length} zones.`);

  // Prepare output paths
  const outDir = '/data/data/com.termux/files/home/downloads';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const primaryOutPath = path.join(outDir, 'Laporan_Pelanggan_Tertunggak_UPSHERU.pdf');
  const homeOutPath = '/data/data/com.termux/files/home/Laporan_Pelanggan_Tertunggak_UPSHERU.pdf';
  const sharedStoragePath = '/data/data/com.termux/files/home/storage/downloads/Laporan_Pelanggan_Tertunggak_UPSHERU.pdf';
  const artifactPath = '/home/.gemini/antigravity-cli/brain/b9745c04-65a3-4f5c-aa50-e8b771325713/Laporan_Pelanggan_Tertunggak_UPSHERU.pdf';

  // Create PDF Document (A4 Landscape)
  // Dimensions: 841.89 x 595.28 pt
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 25, bottom: 30, left: 25, right: 25 },
    bufferPages: true,
    autoFirstPage: true
  });

  const writeStream = fs.createWriteStream(primaryOutPath);
  doc.pipe(writeStream);

  const PAGE_WIDTH = 841.89;
  const PAGE_HEIGHT = 595.28;
  const MARGIN_LEFT = 25;
  const MARGIN_RIGHT = 25;
  const MARGIN_TOP = 25;
  const MARGIN_BOTTOM = 30;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 791.89
  const MAX_Y = PAGE_HEIGHT - MARGIN_BOTTOM - 15;

  // Colors
  const COLOR_PRIMARY = '#0f766e'; // Teal 700
  const COLOR_PRIMARY_DARK = '#115e59'; // Teal 800
  const COLOR_HEADER_BG = '#0f172a'; // Slate 900
  const COLOR_ACCENT = '#0284c7'; // Sky 600
  const COLOR_CARD_BG = '#f8fafc'; // Slate 50
  const COLOR_BORDER = '#cbd5e1'; // Slate 300
  const COLOR_BORDER_LIGHT = '#e2e8f0'; // Slate 200
  const COLOR_TEXT = '#0f172a'; // Slate 900
  const COLOR_MUTED = '#64748b'; // Slate 500
  const COLOR_ZEBRA = '#f8fafc';
  const COLOR_ALERT = '#b91c1c'; // Red 700

  // Check logo
  const logoPath = '/data/data/com.termux/files/home/wastepay/public/ups-heru-logo.jpg';
  const hasLogo = fs.existsSync(logoPath);

  // ==========================================
  // PAGE 1: EXECUTIVE DASHBOARD & REKAP ZONA
  // ==========================================
  
  // Header Bar
  doc.rect(MARGIN_LEFT, MARGIN_TOP, USABLE_WIDTH, 58).fill(COLOR_PRIMARY_DARK);

  if (hasLogo) {
    try {
      doc.image(logoPath, MARGIN_LEFT + 8, MARGIN_TOP + 5, { width: 48, height: 48 });
    } catch (e) {
      console.error('Failed to embed logo on page 1:', e.message);
    }
  }

  // Header Title
  const titleX = hasLogo ? MARGIN_LEFT + 65 : MARGIN_LEFT + 15;
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('UPS HERU (upsheru.com)', titleX, MARGIN_TOP + 8);
  doc.fontSize(9).font('Helvetica').text('Sistem Operasional & Manajemen Retribusi Sampah Terpadu', titleX, MARGIN_TOP + 28);
  doc.fontSize(8).fillColor('#99f6e4').text('Jl. Raya H. Dimun / Cilodong - Kalibaru, Depok | Layanan WhatsApp Otomatis', titleX, MARGIN_TOP + 42);

  // Right Header Meta
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(
    'LAPORAN PIUTANG PELANGGAN',
    PAGE_WIDTH - MARGIN_RIGHT - 240,
    MARGIN_TOP + 10,
    { width: 230, align: 'right' }
  );
  doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1').text(
    `Tanggal Ekstraksi: 20 November 2026\nPeriode Tunggakan: Okt - Nov 2026\nStatus: RESMI & OPERASIONAL`,
    PAGE_WIDTH - MARGIN_RIGHT - 240,
    MARGIN_TOP + 24,
    { width: 230, align: 'right' }
  );

  let curY = MARGIN_TOP + 68;

  // KPI STATS CARDS (4 Columns)
  const cardGap = 10;
  const cardW = (USABLE_WIDTH - (cardGap * 3)) / 4;
  const cardH = 52;

  const kpis = [
    {
      title: 'TOTAL PELANGGAN MENUNGGAK',
      value: `${Number(overallStats.total_pelanggan).toLocaleString('id-ID')} Warga`,
      sub: 'Semua berstatus aktif di sistem',
      color: '#dc2626'
    },
    {
      title: 'TOTAL LEMBAR TAGIHAN',
      value: `${Number(overallStats.total_tagihan).toLocaleString('id-ID')} Tagihan`,
      sub: 'Bulan Oktober & November 2026',
      color: '#d97706'
    },
    {
      title: 'TOTAL NOMINAL PIUTANG',
      value: formatRupiah(overallStats.total_semua),
      sub: 'Akumulasi pokok retribusi',
      color: '#b91c1c'
    },
    {
      title: 'KOORDINAT TERVERIFIKASI',
      value: `${customers.filter(c => c.latitude && c.longitude).length} / ${customers.length} (${((customers.filter(c => c.latitude && c.longitude).length / customers.length) * 100).toFixed(1)}%)`,
      sub: 'Siap rute navigasi Google Maps',
      color: '#059669'
    }
  ];

  kpis.forEach((k, idx) => {
    const cx = MARGIN_LEFT + (idx * (cardW + cardGap));
    doc.rect(cx, curY, cardW, cardH).lineWidth(1).strokeColor(COLOR_BORDER).fillAndStroke(COLOR_CARD_BG, COLOR_BORDER);
    
    // Top border colored line
    doc.rect(cx, curY, cardW, 3).fill(k.color);
    
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR_MUTED).text(k.title, cx + 8, curY + 8, { width: cardW - 16 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(k.color).text(k.value, cx + 8, curY + 20, { width: cardW - 16 });
    doc.font('Helvetica').fontSize(7).fillColor(COLOR_MUTED).text(k.sub, cx + 8, curY + 38, { width: cardW - 16 });
  });

  curY += cardH + 12;

  // Title for Zone Breakdown Table
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_TEXT).text('REKAPITULASI PIUTANG BERDASARKAN ZONA OPERASIONAL (18 AREA)', MARGIN_LEFT, curY);
  doc.font('Helvetica').fontSize(8).fillColor(COLOR_MUTED).text(
    'Disusun berdasarkan prioritas akumulasi piutang terbesar untuk memudahkan fokus penagihan kolektif armada & kasir.',
    MARGIN_LEFT,
    curY + 14
  );

  curY += 28;

  // Zone Table Dimensions
  const zColW = {
    no: 28,
    nama: 220,
    pelanggan: 85,
    tagihan: 85,
    nominal: 110,
    persen: 70,
    keterangan: USABLE_WIDTH - (28 + 220 + 85 + 85 + 110 + 70) // ~193.89
  };

  // Header Zone Table
  doc.rect(MARGIN_LEFT, curY, USABLE_WIDTH, 18).fill(COLOR_HEADER_BG);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
  
  let zx = MARGIN_LEFT;
  doc.text('NO', zx, curY + 5, { width: zColW.no, align: 'center' });
  zx += zColW.no;
  doc.text('NAMA ZONA OPERASIONAL', zx + 4, curY + 5, { width: zColW.nama - 8, align: 'left' });
  zx += zColW.nama;
  doc.text('PELANGGAN', zx, curY + 5, { width: zColW.pelanggan - 4, align: 'right' });
  zx += zColW.pelanggan;
  doc.text('JML TAGIHAN', zx, curY + 5, { width: zColW.tagihan - 4, align: 'right' });
  zx += zColW.tagihan;
  doc.text('TOTAL NOMINAL (RP)', zx, curY + 5, { width: zColW.nominal - 4, align: 'right' });
  zx += zColW.nominal;
  doc.text('% PIUTANG', zx, curY + 5, { width: zColW.persen - 4, align: 'right' });
  zx += zColW.persen;
  doc.text('STATUS PRIORITAS & REKOMENDASI TINDAKAN', zx + 6, curY + 5, { width: zColW.keterangan - 10, align: 'left' });

  curY += 18;

  const totalNominalAll = Number(overallStats.total_semua);

  // Render Zone Rows
  zoneStats.forEach((z, i) => {
    const isEven = i % 2 === 0;
    const rowH = 14.5;
    const zNominal = Number(z.total_nominal);
    const pct = ((zNominal / totalNominalAll) * 100).toFixed(1);

    if (isEven) {
      doc.rect(MARGIN_LEFT, curY, USABLE_WIDTH, rowH).fill(COLOR_ZEBRA);
    }

    // Border line bottom
    doc.rect(MARGIN_LEFT, curY + rowH - 0.5, USABLE_WIDTH, 0.5).fill(COLOR_BORDER_LIGHT);

    zx = MARGIN_LEFT;
    doc.font('Helvetica').fontSize(7).fillColor(COLOR_TEXT);
    doc.text(String(i + 1), zx, curY + 3.5, { width: zColW.no, align: 'center' });
    zx += zColW.no;

    doc.font('Helvetica-Bold').fontSize(7).text(z.zona, zx + 4, curY + 3.5, { width: zColW.nama - 8, align: 'left' });
    zx += zColW.nama;

    doc.font('Helvetica').text(`${z.jumlah_pelanggan} warga`, zx, curY + 3.5, { width: zColW.pelanggan - 4, align: 'right' });
    zx += zColW.pelanggan;

    doc.text(`${z.jumlah_tagihan} tagihan`, zx, curY + 3.5, { width: zColW.tagihan - 4, align: 'right' });
    zx += zColW.tagihan;

    doc.font('Helvetica-Bold').text(formatRupiah(zNominal), zx, curY + 3.5, { width: zColW.nominal - 4, align: 'right' });
    zx += zColW.nominal;

    doc.font('Helvetica').text(`${pct}%`, zx, curY + 3.5, { width: zColW.persen - 4, align: 'right' });
    zx += zColW.persen;

    let rekomendasi = 'Follow up penagihan rutin';
    let rekomColor = COLOR_MUTED;
    if (zNominal >= 5000000) {
      rekomendasi = 'SANGAT TINGGI: Prioritas kunjungan tim khusus';
      rekomColor = '#b91c1c';
    } else if (zNominal >= 2000000) {
      rekomendasi = 'TINGGI: Blast WA penagihan serentak';
      rekomColor = '#c2410c';
    } else if (z.zona === 'Tanpa Zona') {
      rekomendasi = 'Perlu penyesuaian zona pada sistem admin';
      rekomColor = '#4338ca';
    }

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(rekomColor).text(rekomendasi, zx + 6, curY + 3.5, { width: zColW.keterangan - 10, align: 'left' });

    curY += rowH;
  });

  // Total Summary Row
  doc.rect(MARGIN_LEFT, curY, USABLE_WIDTH, 17).fill('#e2e8f0');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR_TEXT);
  zx = MARGIN_LEFT;
  doc.text('TOTAL SELURUH ZONA', zx + 4, curY + 4.5, { width: zColW.no + zColW.nama - 8, align: 'left' });
  zx += zColW.no + zColW.nama;
  doc.text(`${overallStats.total_pelanggan} warga`, zx, curY + 4.5, { width: zColW.pelanggan - 4, align: 'right' });
  zx += zColW.pelanggan;
  doc.text(`${overallStats.total_tagihan} tagihan`, zx, curY + 4.5, { width: zColW.tagihan - 4, align: 'right' });
  zx += zColW.tagihan;
  doc.fillColor(COLOR_ALERT).text(formatRupiah(overallStats.total_semua), zx, curY + 4.5, { width: zColW.nominal - 4, align: 'right' });
  zx += zColW.nominal;
  doc.fillColor(COLOR_TEXT).text('100.0%', zx, curY + 4.5, { width: zColW.persen - 4, align: 'right' });
  zx += zColW.persen;
  doc.font('Helvetica-Oblique').fontSize(7).fillColor(COLOR_MUTED).text('Data real-time sinkron dengan database server', zx + 6, curY + 4.5, { width: zColW.keterangan - 10, align: 'left' });

  curY += 24;

  // Instructions Box for Field Staff
  doc.rect(MARGIN_LEFT, curY, USABLE_WIDTH, 36).fillAndStroke('#eff6ff', '#bfdbfe');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e40af').text('PETUNJUK PENGGUNAAN DOKUMEN BAGI PETUGAS PENAGIHAN & KOORDINATOR LAPANGAN:', MARGIN_LEFT + 8, curY + 6);
  doc.font('Helvetica').fontSize(7).fillColor('#1e3a8a').text(
    '• Pada halaman-halaman berikutnya tercantum seluruh 463 pelanggan yang diurutkan per zona dan nama secara detail.\n' +
    '• Kolom "No. WhatsApp" dapat langsung diklik untuk membuka chat WhatsApp resmi warga tanpa perlu menyimpan kontak.\n' +
    '• Kolom "Koordinat GPS" dapat langsung diklik untuk membuka aplikasi Google Maps menuju lokasi rumah pelanggan.',
    MARGIN_LEFT + 8,
    curY + 16,
    { lineGap: 1 }
  );

  // ==========================================
  // PAGES 2+: DETAILED CUSTOMER LIST
  // ==========================================

  // Columns specification for customer table
  // Total width: 791 pt
  const cCols = {
    no: 24,
    nama: 115,
    wa: 90,
    zona: 105,
    alamat: 155,
    koordinat: 125,
    periode: 95,
    total: 82
  };

  const drawTableHeader = (y) => {
    doc.rect(MARGIN_LEFT, y, USABLE_WIDTH, 19).fill(COLOR_HEADER_BG);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');

    let x = MARGIN_LEFT;
    doc.text('NO', x, y + 5.5, { width: cCols.no, align: 'center' });
    x += cCols.no;
    doc.text('NAMA PELANGGAN', x + 4, y + 5.5, { width: cCols.nama - 6, align: 'left' });
    x += cCols.nama;
    doc.text('NO. WHATSAPP', x, y + 5.5, { width: cCols.wa, align: 'center' });
    x += cCols.wa;
    doc.text('ZONA OPERASIONAL', x + 4, y + 5.5, { width: cCols.zona - 6, align: 'left' });
    x += cCols.zona;
    doc.text('ALAMAT / PATOKAN RUMAH', x + 4, y + 5.5, { width: cCols.alamat - 6, align: 'left' });
    x += cCols.alamat;
    doc.text('KOORDINAT GPS (MAPS)', x, y + 5.5, { width: cCols.koordinat, align: 'center' });
    x += cCols.koordinat;
    doc.text('RINCIAN PERIODE', x, y + 5.5, { width: cCols.periode, align: 'center' });
    x += cCols.periode;
    doc.text('TOTAL TAGIHAN', x, y + 5.5, { width: cCols.total - 6, align: 'right' });

    return y + 19;
  };

  const drawPageTopBanner = (pageNum) => {
    doc.rect(MARGIN_LEFT, MARGIN_TOP, USABLE_WIDTH, 22).fill(COLOR_PRIMARY_DARK);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text(
      'UPS HERU (upsheru.com) — DAFTAR DETAIL PELANGGAN BELUM BAYAR & TERTUNGGAK',
      MARGIN_LEFT + 8,
      MARGIN_TOP + 6
    );
    doc.font('Helvetica').fontSize(7.5).fillColor('#99f6e4').text(
      `Tanggal: 20 Nov 2026 | Total Piutang: ${formatRupiah(overallStats.total_semua)} (${overallStats.total_pelanggan} Warga)`,
      PAGE_WIDTH - MARGIN_RIGHT - 280,
      MARGIN_TOP + 6.5,
      { width: 272, align: 'right' }
    );
    return MARGIN_TOP + 28;
  };

  // Add first detail page
  doc.addPage();
  let tableY = drawPageTopBanner();
  tableY = drawTableHeader(tableY);

  let currentZoneName = '';
  const ROW_HEIGHT = 20.5;

  customers.forEach((c, index) => {
    // Check if zone changed -> draw zone banner
    const isNewZone = c.zona !== currentZoneName;
    const neededHeight = isNewZone ? (ROW_HEIGHT + 18) : ROW_HEIGHT;

    if (tableY + neededHeight > MAX_Y) {
      doc.addPage();
      tableY = drawPageTopBanner();
      tableY = drawTableHeader(tableY);
    }

    if (isNewZone) {
      currentZoneName = c.zona;
      // Zone banner row
      doc.rect(MARGIN_LEFT, tableY, USABLE_WIDTH, 16).fill('#e0f2fe');
      doc.rect(MARGIN_LEFT, tableY, 4, 16).fill('#0284c7');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0369a1').text(
        `► ZONA: ${currentZoneName.toUpperCase()}`,
        MARGIN_LEFT + 8,
        tableY + 4
      );

      // Count for this zone
      const zInfo = zoneStats.find(zs => zs.zona === currentZoneName);
      if (zInfo) {
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#0284c7').text(
          `${zInfo.jumlah_pelanggan} Warga Tertunggak  |  Total: ${formatRupiah(zInfo.total_nominal)}`,
          PAGE_WIDTH - MARGIN_RIGHT - 250,
          tableY + 4.5,
          { width: 242, align: 'right' }
        );
      }

      tableY += 16;
    }

    // Check pagination again before drawing row
    if (tableY + ROW_HEIGHT > MAX_Y) {
      doc.addPage();
      tableY = drawPageTopBanner();
      tableY = drawTableHeader(tableY);
    }

    // Alternating zebra
    const isZebra = index % 2 === 0;
    if (isZebra) {
      doc.rect(MARGIN_LEFT, tableY, USABLE_WIDTH, ROW_HEIGHT).fill(COLOR_ZEBRA);
    }

    // Border bottom
    doc.rect(MARGIN_LEFT, tableY + ROW_HEIGHT - 0.5, USABLE_WIDTH, 0.5).fill(COLOR_BORDER_LIGHT);

    let x = MARGIN_LEFT;

    // 1. NO
    doc.font('Helvetica').fontSize(6.5).fillColor(COLOR_MUTED);
    doc.text(String(index + 1), x, tableY + 5.5, { width: cCols.no, align: 'center' });
    x += cCols.no;

    // 2. NAMA PELANGGAN
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR_TEXT);
    const cleanNama = c.nama ? c.nama.trim() : 'Tanpa Nama';
    doc.text(cleanNama, x + 4, tableY + 5.5, {
      width: cCols.nama - 6,
      height: ROW_HEIGHT - 6,
      ellipsis: true
    });
    x += cCols.nama;

    // 3. NO. WHATSAPP (Clickable)
    const phoneObj = formatPhoneWA(c.noTelepon);
    if (phoneObj.url) {
      doc.font('Helvetica').fontSize(7).fillColor(COLOR_ACCENT);
      doc.text(phoneObj.display, x, tableY + 5.5, {
        width: cCols.wa,
        align: 'center',
        link: phoneObj.url,
        underline: true
      });
    } else {
      doc.font('Helvetica').fontSize(6.5).fillColor(COLOR_MUTED);
      doc.text('-', x, tableY + 5.5, { width: cCols.wa, align: 'center' });
    }
    x += cCols.wa;

    // 4. ZONA OPERASIONAL
    doc.font('Helvetica').fontSize(6.5).fillColor(COLOR_TEXT);
    doc.text(c.zona, x + 4, tableY + 5.5, {
      width: cCols.zona - 6,
      height: ROW_HEIGHT - 6,
      ellipsis: true
    });
    x += cCols.zona;

    // 5. ALAMAT
    const cleanAlamat = (c.alamat || '-').trim();
    doc.font('Helvetica').fontSize(6.5).fillColor('#334155');
    doc.text(cleanAlamat, x + 4, tableY + 5.5, {
      width: cCols.alamat - 6,
      height: ROW_HEIGHT - 6,
      ellipsis: true
    });
    x += cCols.alamat;

    // 6. KOORDINAT GPS (Clickable)
    if (c.latitude && c.longitude) {
      const latFixed = Number(c.latitude).toFixed(5);
      const lngFixed = Number(c.longitude).toFixed(5);
      const koorText = `${latFixed}, ${lngFixed}`;
      const mapsUrl = `https://www.google.com/maps?q=${c.latitude},${c.longitude}`;

      doc.font('Helvetica').fontSize(6.5).fillColor('#0284c7');
      doc.text(koorText, x, tableY + 5.5, {
        width: cCols.koordinat,
        align: 'center',
        link: mapsUrl,
        underline: true
      });
    } else {
      doc.font('Helvetica-Oblique').fontSize(6).fillColor('#94a3b8');
      doc.text('Belum Terdata', x, tableY + 5.5, { width: cCols.koordinat, align: 'center' });
    }
    x += cCols.koordinat;

    // 7. RINCIAN PERIODE
    // format raw_tagihan: e.g. "10/2026:tunggakan,11/2026:belum_bayar"
    const periodList = (c.raw_tagihan || '').split(',').map(item => {
      const [blnthn, st] = item.split(':');
      if (!blnthn) return '';
      const [m, y] = blnthn.split('/');
      const mName = NAMA_BULAN_SINGKAT[parseInt(m, 10)] || m;
      const stCode = st === 'tunggakan' ? 'T' : 'B';
      return `${mName}'${y.slice(2)}(${stCode})`;
    }).filter(Boolean);

    const periodeText = periodList.join(', ');
    const isMultiMonth = periodList.length > 1;

    doc.font(isMultiMonth ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(isMultiMonth ? '#b91c1c' : '#b45309');
    doc.text(periodeText, x, tableY + 5.5, {
      width: cCols.periode,
      align: 'center',
      ellipsis: true
    });
    x += cCols.periode;

    // 8. TOTAL TAGIHAN
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR_TEXT);
    doc.text(formatRupiah(c.total_nominal), x, tableY + 5.5, {
      width: cCols.total - 6,
      align: 'right'
    });

    tableY += ROW_HEIGHT;
  });

  // Final Summary Row at table end
  if (tableY + 22 > MAX_Y) {
    doc.addPage();
    tableY = drawPageTopBanner();
    tableY = drawTableHeader(tableY);
  }

  doc.rect(MARGIN_LEFT, tableY, USABLE_WIDTH, 19).fill('#0f172a');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
  let fx = MARGIN_LEFT;
  doc.text('TOTAL KESELURUHAN PELANGGAN TERTUNGGAK', fx + 6, tableY + 5.5, {
    width: cCols.no + cCols.nama + cCols.wa + cCols.zona - 10,
    align: 'left'
  });
  fx += cCols.no + cCols.nama + cCols.wa + cCols.zona;
  doc.text(`${customers.length} Warga Terdaftar`, fx, tableY + 5.5, { width: cCols.alamat, align: 'center' });
  fx += cCols.alamat;
  doc.text(`${customers.filter(c => c.latitude && c.longitude).length} Berkoordinat`, fx, tableY + 5.5, { width: cCols.koordinat, align: 'center' });
  fx += cCols.koordinat;
  doc.text(`${overallStats.total_tagihan} Tagihan`, fx, tableY + 5.5, { width: cCols.periode, align: 'center' });
  fx += cCols.periode;
  doc.fillColor('#fbbf24').text(formatRupiah(overallStats.total_semua), fx, tableY + 5.5, { width: cCols.total - 6, align: 'right' });

  // ==========================================
  // RUNNING FOOTERS (ALL PAGES)
  // ==========================================
  const range = doc.bufferedPageRange();
  console.log(`Rendering footers across ${range.count} pages...`);

  for (let pIdx = range.start; pIdx < range.start + range.count; pIdx++) {
    doc.switchToPage(pIdx);
    
    // Top separator line for footer
    doc.rect(MARGIN_LEFT, PAGE_HEIGHT - 22, USABLE_WIDTH, 0.5).fill('#cbd5e1');

    doc.font('Helvetica').fontSize(6.5).fillColor(COLOR_MUTED);
    doc.text(
      'UPS HERU (upsheru.com) — Laporan Resmi Piutang & Tunggakan Retribusi Sampah | Rahasia & Khusus Operasional',
      MARGIN_LEFT,
      PAGE_HEIGHT - 17,
      { width: 500, align: 'left' }
    );

    doc.font('Helvetica-Bold').text(
      `Halaman ${pIdx + 1} dari ${range.count}`,
      PAGE_WIDTH - MARGIN_RIGHT - 150,
      PAGE_HEIGHT - 17,
      { width: 150, align: 'right' }
    );
  }

  // Finalize PDF
  doc.end();

  writeStream.on('finish', () => {
    const fileSize = fs.statSync(primaryOutPath).size;
    console.log(`PDF successfully generated: ${primaryOutPath} (${(fileSize / 1024).toFixed(1)} KB)`);

    // Copy to home directory
    fs.copyFileSync(primaryOutPath, homeOutPath);
    console.log(`Copied to home: ${homeOutPath}`);

    // Copy to shared storage if available
    try {
      if (fs.existsSync(path.dirname(sharedStoragePath))) {
        fs.copyFileSync(primaryOutPath, sharedStoragePath);
        console.log(`Copied to Android Download: ${sharedStoragePath}`);
      }
    } catch (e) {
      console.warn('Could not copy to shared storage:', e.message);
    }

    // Copy to artifact directory
    try {
      if (fs.existsSync(path.dirname(artifactPath))) {
        fs.copyFileSync(primaryOutPath, artifactPath);
        console.log(`Copied to artifact dir: ${artifactPath}`);
      }
    } catch (e) {
      console.warn('Could not copy to artifact dir:', e.message);
    }

    console.log('ALL DONE!');
  });
}

main().catch(err => {
  console.error('Fatal error in PDF generator:', err);
  process.exit(1);
});
