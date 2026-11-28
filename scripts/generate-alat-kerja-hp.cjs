const fs = require('fs');
const path = require('path');

const targetData = JSON.parse(fs.readFileSync('C:/Users/o2w/.gemini/antigravity-cli/brain/02c0a6c5-53db-4754-bf29-27d344164ffa/scratch/target_28_data.json', 'utf8'));

function generateHtml(data) {
  const jsonData = JSON.stringify(data);
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Alat Kerja Penagihan Lapangan — UPS HERU</title>
  <style>
    :root {
      --primary: #10b981;
      --primary-dark: #059669;
      --primary-light: #d1fae5;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-blue: #38bdf8;
      --accent-amber: #f59e0b;
      --accent-red: #ef4444;
      --accent-purple: #a855f7;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      background-color: var(--bg);
      color: var(--text-main);
      padding: 12px 12px 90px 12px;
      line-height: 1.4;
      font-size: 14px;
    }

    /* Sticky Header Summary */
    .header-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      padding: 10px 0 12px 0;
      border-bottom: 1px solid #334155;
      margin-bottom: 12px;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .title-row h1 {
      font-size: 16px;
      font-weight: 700;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-total {
      background: #064e3b;
      color: #6ee7b7;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #059669;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 6px 8px;
      text-align: center;
    }

    .kpi-val {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    .kpi-lbl {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Progress bar */
    .progress-track {
      background: #334155;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress-fill {
      background: linear-gradient(90deg, #10b981, #34d399);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    /* Controls (Search & Filter) */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .search-input {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }

    .search-input:focus {
      border-color: #34d399;
    }

    .filter-row {
      display: flex;
      gap: 6px;
    }

    .select-dropdown {
      flex: 1;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      outline: none;
    }

    /* Customer List */
    .customer-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .customer-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px;
      position: relative;
      transition: border-color 0.2s;
    }

    .customer-card.status-lunas {
      border-left: 5px solid var(--primary);
      background: rgba(16, 185, 129, 0.08);
    }

    .customer-card.status-janji {
      border-left: 5px solid var(--accent-amber);
      background: rgba(245, 158, 11, 0.08);
    }

    .customer-card.status-chat {
      border-left: 5px solid var(--accent-blue);
      background: rgba(56, 189, 248, 0.08);
    }

    .customer-card.status-salah {
      border-left: 5px solid var(--accent-red);
      background: rgba(239, 68, 68, 0.08);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .card-name {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    .card-nominal {
      font-size: 14px;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.12);
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid rgba(251, 191, 36, 0.3);
      white-space: nowrap;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      font-size: 12px;
    }

    .meta-tag {
      background: #0f172a;
      padding: 2px 8px;
      border-radius: 4px;
      color: var(--text-muted);
      border: 1px solid #334155;
    }

    .meta-tag.zona {
      color: #93c5fd;
      border-color: #1e3a8a;
    }

    .card-address {
      font-size: 12px;
      color: #cbd5e1;
      margin-bottom: 10px;
      line-height: 1.35;
      background: rgba(15, 23, 42, 0.6);
      padding: 6px 8px;
      border-radius: 6px;
      border-left: 2px solid #64748b;
    }

    /* Neighbor Box */
    .neighbor-box {
      background: #0f172a;
      border: 1px dashed #475569;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 10px;
      font-size: 11.5px;
    }

    .neighbor-title {
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .neighbor-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      border-bottom: 1px solid #1e293b;
    }

    .neighbor-item:last-child {
      border-bottom: none;
    }

    .neighbor-btn {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #38bdf8;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    /* Action Buttons Row */
    .action-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 6px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      text-align: center;
      border: none;
      touch-action: manipulation;
    }

    .btn-wa {
      background: #10b981;
      color: #fff;
    }

    .btn-wa:active {
      background: #059669;
    }

    .btn-maps {
      background: #2563eb;
      color: #fff;
    }

    .btn-maps:active {
      background: #1d4ed8;
    }

    .btn-call {
      background: #475569;
      color: #f1f5f9;
    }

    .btn-call:active {
      background: #334155;
    }

    /* Status Selector Group */
    .status-group {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }

    .status-btn {
      padding: 6px 2px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 600;
      background: #0f172a;
      border: 1px solid #334155;
      color: var(--text-muted);
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }

    .status-btn.active-belum {
      background: #334155;
      color: #fff;
      border-color: #64748b;
    }

    .status-btn.active-chat {
      background: #0284c7;
      color: #fff;
      border-color: #38bdf8;
    }

    .status-btn.active-janji {
      background: #d97706;
      color: #fff;
      border-color: #fbbf24;
    }

    .status-btn.active-lunas {
      background: #059669;
      color: #fff;
      border-color: #34d399;
    }

    .status-btn.active-salah {
      background: #dc2626;
      color: #fff;
      border-color: #f87171;
    }

    .note-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      outline: none;
    }

    .note-input:focus {
      border-color: #64748b;
    }

    /* Fixed Bottom Bar */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      border-top: 1px solid #334155;
      padding: 10px 12px;
      display: flex;
      gap: 8px;
      z-index: 100;
      max-width: 600px;
      margin: 0 auto;
    }

    .btn-copy-report {
      flex: 1;
      background: #059669;
      color: #fff;
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-reset {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 75px;
      left: 50%;
      transform: translateX(-50%);
      background: #047857;
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    .toast.show {
      opacity: 1;
    }

    /* Container constraint for tablets / desktop preview */
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
<div class="container">

  <!-- Header & KPI -->
  <header class="header-bar">
    <div class="title-row">
      <h1>🛠️ ALAT KERJA LAPANGAN</h1>
      <span class="badge-total">28 Pelanggan</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-selesai">0 / 28</div>
        <div class="kpi-lbl">Selesai</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-persen">0%</div>
        <div class="kpi-lbl">Progress</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-nominal">Rp 0</div>
        <div class="kpi-lbl">Tertagih</div>
      </div>
    </div>

    <div class="progress-track">
      <div class="progress-fill" id="progress-fill"></div>
    </div>

    <!-- Search & Filters -->
    <div class="controls">
      <input type="text" id="searchInput" class="search-input" placeholder="🔍 Cari nama, jalan, no HP..." oninput="applyFilters()">
      <div class="filter-row">
        <select id="filterZona" class="select-dropdown" onchange="applyFilters()">
          <option value="ALL">Semua Zona (28)</option>
        </select>
        <select id="filterStatus" class="select-dropdown" onchange="applyFilters()">
          <option value="ALL">Semua Status</option>
          <option value="belum">⚪ Belum (28)</option>
          <option value="chat">🔵 Sudah Chat WA</option>
          <option value="janji">🟡 Janji Bayar</option>
          <option value="lunas">🟢 Lunas / Bayar</option>
          <option value="salah">🔴 No. Salah / Pindah</option>
        </select>
      </div>
    </div>
  </header>

  <!-- Customer Cards Container -->
  <main class="customer-list" id="customerContainer">
    <!-- Rendered via JS -->
  </main>

  <!-- Toast -->
  <div id="toast" class="toast">Laporan berhasil disalin ke clipboard!</div>

  <!-- Bottom Navigation / Action -->
  <footer class="bottom-bar">
    <button class="btn-copy-report" onclick="copyProgressReport()">
      📋 Salin Laporan ke WA
    </button>
    <button class="btn-reset" onclick="resetAllState()">
      🔄 Reset
    </button>
  </footer>

</div>

<script>
  // Master Data embedded directly
  const rawCustomers = ${jsonData};
  const STORAGE_KEY = 'UPSHERU_ALAT_KERJA_28_STATE';

  // Load state from localStorage or initialize
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  let userState = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
    } catch (e) {
      console.error(e);
    }
    updateKPI();
  }

  function getStatus(id) {
    return userState[id]?.status || 'belum';
  }

  function getNote(id) {
    return userState[id]?.note || '';
  }

  function setStatus(id, newStatus) {
    if (!userState[id]) userState[id] = {};
    userState[id].status = newStatus;
    userState[id].updatedAt = new Date().toISOString();
    saveState();
    renderCards();
  }

  function setNote(id, noteText) {
    if (!userState[id]) userState[id] = {};
    userState[id].note = noteText;
    saveState();
  }

  // Populate Zona Filter dropdown
  function populateZonaFilter() {
    const select = document.getElementById('filterZona');
    const zonas = {};
    rawCustomers.forEach(c => {
      zonas[c.zona] = (zonas[c.zona] || 0) + 1;
    });

    Object.keys(zonas).sort().forEach(z => {
      const opt = document.createElement('option');
      opt.value = z;
      opt.textContent = \`\${z} (\${zonas[z]})\`;
      select.appendChild(opt);
    });
  }

  function updateKPI() {
    let selesaiCount = 0;
    let uangTertagih = 0;
    const totalCount = rawCustomers.length;

    rawCustomers.forEach(c => {
      const s = getStatus(c.id);
      if (s !== 'belum') selesaiCount++;
      if (s === 'lunas') uangTertagih += (c.nominal || 0);
    });

    const pct = Math.round((selesaiCount / totalCount) * 100);
    document.getElementById('kpi-selesai').textContent = \`\${selesaiCount} / \${totalCount}\`;
    document.getElementById('kpi-persen').textContent = \`\${pct}%\`;
    document.getElementById('kpi-nominal').textContent = 'Rp ' + uangTertagih.toLocaleString('id-ID');
    document.getElementById('progress-fill').style.width = pct + '%';
  }

  function applyFilters() {
    renderCards();
  }

  function renderCards() {
    const container = document.getElementById('customerContainer');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const selZona = document.getElementById('filterZona').value;
    const selStatus = document.getElementById('filterStatus').value;

    const filtered = rawCustomers.filter(c => {
      const st = getStatus(c.id);
      if (selZona !== 'ALL' && c.zona !== selZona) return false;
      if (selStatus !== 'ALL' && st !== selStatus) return false;
      if (search) {
        const text = \`\${c.nama} \${c.phone} \${c.zona} \${c.alamat} \${c.patokan}\`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 40px 10px; color:#64748b;">Tidak ada data yang cocok dengan filter.</div>';
      return;
    }

    container.innerHTML = filtered.map(c => {
      const st = getStatus(c.id);
      const note = getNote(c.id);

      let cardClass = 'customer-card';
      if (st === 'lunas') cardClass += ' status-lunas';
      else if (st === 'janji') cardClass += ' status-janji';
      else if (st === 'chat') cardClass += ' status-chat';
      else if (st === 'salah') cardClass += ' status-salah';

      const tetanggaHtml = (c.tetangga && c.tetangga.length > 0) ? \`
        <div class="neighbor-box">
          <div class="neighbor-title">👥 Rekomendasi Tetangga Terdekat:</div>
          \${c.tetangga.map(t => \`
            <div class="neighbor-item">
              <div>
                <strong>\${t.nama}</strong> (\${t.jarakMeter}m)<br>
                <span style="color:#64748b">\${t.noHp}</span>
              </div>
              <a href="\${t.waUrl}" target="_blank" class="neighbor-btn">
                💬 WA Tetangga
              </a>
            </div>
          \`).join('')}
        </div>
      \` : '';

      return \`
        <div class="\${cardClass}" id="card-\${c.id}">
          <div class="card-top">
            <div>
              <div class="card-name">#\${c.id}. \${c.nama}</div>
              <div class="card-meta">
                <span class="meta-tag zona">📍 \${c.zona}</span>
                <span class="meta-tag">📞 \${c.phone}</span>
              </div>
            </div>
            <div class="card-nominal">Rp \${c.nominal.toLocaleString('id-ID')}</div>
          </div>

          <div class="card-address">
            🏡 <strong>Alamat:</strong> \${c.alamat || '-'}<br>
            📄 <strong>Invoice:</strong> \${c.invoiceNo}
          </div>

          \${tetanggaHtml}

          <!-- Quick Action Buttons -->
          <div class="action-row">
            <a href="\${c.waUrl}" target="_blank" class="btn btn-wa" onclick="markAsChatted(\${c.id})">
              💬 Chat WA
            </a>
            <a href="\${c.gmapsUrl}" target="_blank" class="btn btn-maps">
              📍 Maps
            </a>
            <a href="tel:\${c.phone}" class="btn btn-call">
              📞 Telp
            </a>
          </div>

          <!-- Status Selector -->
          <div style="font-size:11px; font-weight:600; color:#94a3b8; margin-bottom:4px;">Status Lapangan:</div>
          <div class="status-group">
            <button class="status-btn \${st === 'belum' ? 'active-belum' : ''}" onclick="setStatus(\${c.id}, 'belum')">Belum</button>
            <button class="status-btn \${st === 'chat' ? 'active-chat' : ''}" onclick="setStatus(\${c.id}, 'chat')">Chat WA</button>
            <button class="status-btn \${st === 'janji' ? 'active-janji' : ''}" onclick="setStatus(\${c.id}, 'janji')">Janji</button>
            <button class="status-btn \${st === 'lunas' ? 'active-lunas' : ''}" onclick="setStatus(\${c.id}, 'lunas')">LUNAS</button>
            <button class="status-btn \${st === 'salah' ? 'active-salah' : ''}" onclick="setStatus(\${c.id}, 'salah')">Salah/Tutup</button>
          </div>

          <input type="text" class="note-input" placeholder="Tulis catatan (misal: janji tgl 10, uang dititip...)" value="\${escapeHtml(note)}" onchange="setNote(\${c.id}, this.value)">
        </div>
      \`;
    }).join('');
  }

  function markAsChatted(id) {
    if (getStatus(id) === 'belum') {
      setStatus(id, 'chat');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 2500);
  }

  function copyProgressReport() {
    let totalLunas = 0;
    let countLunas = 0;
    let countJanji = 0;
    let countChat = 0;
    let countSalah = 0;
    let countBelum = 0;

    let details = [];

    rawCustomers.forEach((c, idx) => {
      const s = getStatus(c.id);
      const note = getNote(c.id);
      const noteStr = note ? \` (\${note})\` : '';

      if (s === 'lunas') {
        countLunas++;
        totalLunas += c.nominal;
        details.push(\`✅ \${c.nama} - Rp \${c.nominal.toLocaleString('id-ID')} [LUNAS]\${noteStr}\`);
      } else if (s === 'janji') {
        countJanji++;
        details.push(\`🟡 \${c.nama} - [JANJI BAYAR]\${noteStr}\`);
      } else if (s === 'chat') {
        countChat++;
        details.push(\`🔵 \${c.nama} - [CHAT TERKIRIM]\${noteStr}\`);
      } else if (s === 'salah') {
        countSalah++;
        details.push(\`❌ \${c.nama} - [NO SALAH/RUMAH TUTUP]\${noteStr}\`);
      } else {
        countBelum++;
      }
    });

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const reportText = 
\`📊 *LAPORAN PENAGIHAN LAPANGAN (28 TARGET) — UPS HERU*
📅 Waktu: \${nowStr}

📈 *RINGKASAN PROGRES:*
• Total Target    : 28 Pelanggan (Rp 1.510.000)
• ✅ Lunas        : \${countLunas} warga (Rp \${totalLunas.toLocaleString('id-ID')})
• 🟡 Janji Bayar  : \${countJanji} warga
• 🔵 Chat WA      : \${countChat} warga
• ❌ Salah/Tutup  : \${countSalah} warga
• ⚪ Belum Kontak : \${countBelum} warga

📝 *DETAIL CATATAN:*
\${details.length > 0 ? details.join('\\n') : '(Belum ada pembaruan)'}

Dibuat otomatis via Alat Kerja Lapangan UPS HERU.\`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).then(() => {
        showToast('✅ Laporan disalin! Siap dipaste ke WA.');
      }).catch(() => {
        prompt('Salin teks laporan di bawah ini:', reportText);
      });
    } else {
      prompt('Salin teks laporan di bawah ini:', reportText);
    }
  }

  function resetAllState() {
    if (confirm('Apakah Anda yakin ingin mereset semua tanda centang dan catatan di HP ini?')) {
      localStorage.removeItem(STORAGE_KEY);
      userState = {};
      updateKPI();
      renderCards();
      showToast('Status berhasil direset.');
    }
  }

  // Init
  populateZonaFilter();
  updateKPI();
  renderCards();
</script>
</body>
</html>`;
}

const htmlContent = generateHtml(targetData);

// Save to Desktop
const desktopPath = 'C:/Users/o2w/Desktop/ALAT_KERJA_PELANGGAN_HP.html';
fs.writeFileSync(desktopPath, htmlContent, 'utf8');
console.log('Saved to Desktop:', desktopPath);

// Save to public
const publicPath = path.join(__dirname, '..', 'public', 'alat-kerja.html');
fs.writeFileSync(publicPath, htmlContent, 'utf8');
console.log('Saved to public directory:', publicPath);
