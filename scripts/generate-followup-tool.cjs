const fs = require('fs');
const path = require('path');

const masterData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'followup_197_master.json'), 'utf8'));

function generateHtml(customers) {
  const jsonData = JSON.stringify(customers);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Alat Kerja Follow-Up Pelanggan Bermasalah — UPS HERU</title>
  <style>
    :root {
      --primary: #10b981;
      --primary-dark: #059669;
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
      padding: 10px 10px 95px 10px;
      line-height: 1.35;
      font-size: 13.5px;
    }

    .container {
      max-width: 620px;
      margin: 0 auto;
    }

    /* Sticky Header */
    .header-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(10px);
      padding: 10px 0 12px 0;
      border-bottom: 1px solid #334155;
      margin-bottom: 12px;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .title-row h1 {
      font-size: 15px;
      font-weight: 800;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-domain {
      background: #064e3b;
      color: #6ee7b7;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 10.5px;
      font-weight: 700;
      border: 1px solid #059669;
      text-decoration: none;
    }

    /* KPI Summary */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
      margin-bottom: 8px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 6px 4px;
      text-align: center;
    }

    .kpi-val {
      font-size: 13.5px;
      font-weight: 800;
      color: #fff;
    }

    .kpi-lbl {
      font-size: 9.5px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
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
      background: linear-gradient(90deg, #10b981, #38bdf8);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    /* Category Severity Tabs */
    .category-tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 8px;
      scrollbar-width: none;
    }

    .category-tabs::-webkit-scrollbar {
      display: none;
    }

    .tab-btn {
      flex-shrink: 0;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 5px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }

    .tab-btn.active {
      background: #047857;
      color: #fff;
      border-color: #34d399;
    }

    .tab-btn.tab-c1.active { background: #b91c1c; border-color: #ef4444; }
    .tab-btn.tab-bc.active { background: #c2410c; border-color: #f97316; }
    .tab-btn.tab-gh.active { background: #1d4ed8; border-color: #38bdf8; }
    .tab-btn.tab-c2.active { background: #475569; border-color: #94a3b8; }
    .tab-btn.tab-ar.active { background: #047857; border-color: #10b981; }

    /* Search & Filter row */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }

    .search-input {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 8px 12px;
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
      padding: 7px 8px;
      border-radius: 8px;
      font-size: 11.5px;
      outline: none;
    }

    /* Customer Cards */
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
    }

    .customer-card.status-lunas { border-left: 5px solid var(--primary); background: rgba(16, 185, 129, 0.08); }
    .customer-card.status-janji { border-left: 5px solid var(--accent-amber); background: rgba(245, 158, 11, 0.08); }
    .customer-card.status-chat { border-left: 5px solid var(--accent-blue); background: rgba(56, 189, 248, 0.08); }
    .customer-card.status-salah { border-left: 5px solid var(--accent-red); background: rgba(239, 68, 68, 0.08); }
    .customer-card.status-update { border-left: 5px solid var(--accent-purple); background: rgba(168, 85, 247, 0.08); }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .card-name-group {
      display: flex;
      flex-direction: column;
    }

    .card-name {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    .card-nominal {
      font-size: 13.5px;
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
      gap: 4px;
      margin-bottom: 8px;
      font-size: 11px;
    }

    .meta-tag {
      background: #0f172a;
      padding: 2px 7px;
      border-radius: 4px;
      color: var(--text-muted);
      border: 1px solid #334155;
    }

    .meta-tag.badge-prob {
      font-weight: 700;
    }

    .meta-tag.zona {
      color: #93c5fd;
      border-color: #1e3a8a;
    }

    /* Problem Insight Box */
    .problem-box {
      background: rgba(15, 23, 42, 0.85);
      border-left: 3px solid #f59e0b;
      padding: 6px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 11.5px;
    }

    .problem-box.c1 { border-left-color: #ef4444; }
    .problem-box.bc { border-left-color: #f97316; }
    .problem-box.gh { border-left-color: #38bdf8; }
    .problem-box.ar { border-left-color: #10b981; }

    .problem-title {
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 2px;
    }

    .problem-desc {
      color: #cbd5e1;
      font-size: 11px;
    }

    .card-address {
      font-size: 11.5px;
      color: #cbd5e1;
      margin-bottom: 8px;
      background: rgba(15, 23, 42, 0.6);
      padding: 5px 8px;
      border-radius: 6px;
    }

    /* Neighbor Box */
    .neighbor-box {
      background: #0f172a;
      border: 1px dashed #475569;
      border-radius: 8px;
      padding: 7px;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .neighbor-header {
      font-weight: 700;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
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
      font-size: 10.5px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* Action Buttons Row */
    .action-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.9fr 1fr;
      gap: 5px;
      margin-bottom: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 7px 4px;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      text-align: center;
      border: none;
      touch-action: manipulation;
    }

    .btn-wa { background: #10b981; color: #fff; }
    .btn-maps { background: #2563eb; color: #fff; }
    .btn-call { background: #475569; color: #f1f5f9; }
    .btn-edit { background: #7c3aed; color: #fff; }

    /* Quick Action Chips */
    .quick-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }

    .chip-btn {
      background: #0f172a;
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      cursor: pointer;
      user-select: none;
    }

    .chip-btn:active {
      background: #334155;
      color: #fff;
    }

    /* Status Selector Group */
    .status-group {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 3px;
      margin-bottom: 6px;
    }

    .status-btn {
      padding: 6px 1px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      background: #0f172a;
      border: 1px solid #334155;
      color: var(--text-muted);
      cursor: pointer;
      text-align: center;
    }

    .status-btn.active-belum { background: #334155; color: #fff; border-color: #64748b; }
    .status-btn.active-chat { background: #0284c7; color: #fff; border-color: #38bdf8; }
    .status-btn.active-janji { background: #d97706; color: #fff; border-color: #fbbf24; }
    .status-btn.active-lunas { background: #059669; color: #fff; border-color: #34d399; }
    .status-btn.active-update { background: #7c3aed; color: #fff; border-color: #a855f7; }
    .status-btn.active-salah { background: #dc2626; color: #fff; border-color: #f87171; }

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

    /* Edit Data Panel (Collapsible) */
    .edit-panel {
      display: none;
      background: #0f172a;
      border: 1px solid #7c3aed;
      border-radius: 8px;
      padding: 8px;
      margin-top: 8px;
      font-size: 11.5px;
    }

    .edit-panel.open {
      display: block;
    }

    .form-group {
      margin-bottom: 6px;
    }

    .form-group label {
      display: block;
      color: #a78bfa;
      font-size: 10.5px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .form-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #475569;
      color: #fff;
      padding: 5px 8px;
      border-radius: 5px;
      font-size: 12px;
      outline: none;
    }

    .btn-gps {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .btn-save-edit {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 6px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      margin-top: 4px;
    }

    /* Fixed Bottom Bar */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      border-top: 1px solid #334155;
      padding: 8px 10px;
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.8fr;
      gap: 6px;
      z-index: 100;
      max-width: 620px;
      margin: 0 auto;
    }

    .btn-bar {
      padding: 9px 4px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .btn-sync { background: #0284c7; color: #fff; }
    .btn-wa-report { background: #059669; color: #fff; }
    .btn-export { background: #334155; color: #cbd5e1; }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 70px;
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
      white-space: nowrap;
    }

    .toast.show { opacity: 1; }

    /* PIN Lock Screen */
    .pin-screen {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #090d16;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .pin-card {
      background: #131d31;
      border: 1px solid #1e293b;
      border-radius: 20px;
      width: 100%;
      max-width: 360px;
      padding: 24px 20px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      position: relative;
    }

    .pin-icon-wrap {
      width: 58px;
      height: 58px;
      margin: 0 auto 12px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }

    .pin-badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #059669;
      color: #34d399;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .pin-title {
      font-size: 16.5px;
      font-weight: 800;
      color: #f8fafc;
      margin-bottom: 4px;
    }

    .pin-subtitle {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
      margin-bottom: 16px;
    }

    .pin-dots-row {
      display: flex;
      justify-content: center;
      gap: 14px;
      margin-bottom: 12px;
    }

    .pin-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #334155;
      background: transparent;
      transition: all 0.2s ease;
    }

    .pin-dot.filled {
      background: #10b981;
      border-color: #34d399;
      box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
      transform: scale(1.15);
    }

    .pin-alert {
      min-height: 20px;
      font-size: 11.5px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #f87171;
      transition: all 0.2s ease;
    }

    .numpad-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 4px;
    }

    .numpad-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      font-size: 20px;
      font-weight: 700;
      border-radius: 12px;
      padding: 12px 0;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    .numpad-btn:active {
      background: #10b981;
      color: #0f172a;
      transform: scale(0.95);
    }

    .numpad-btn.numpad-action {
      font-size: 12.5px;
      color: #94a3b8;
      background: #0f172a;
    }

    .pin-footer-hint {
      margin-top: 16px;
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.35;
    }

    .btn-lock-nav {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .btn-lock-nav:active {
      background: #ef4444;
      color: #fff;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }

    .shake { animation: shake 0.4s ease-in-out; }
  </style>
</head>
<body>

<!-- PIN LOCK SCREEN -->
<div id="pinLockScreen" class="pin-screen">
  <div class="pin-card" id="pinCard">
    <div class="pin-icon-wrap">
      🔒
    </div>
    <span class="pin-badge">🛡️ INTERNAL UPS HERU</span>
    <h2 class="pin-title">Akses Khusus Terbatas</h2>
    <p class="pin-subtitle">Portal kerja follow-up ini bersifat internal & sementara.<br>Masukkan 4 digit PIN petugas untuk membuka data:</p>

    <div class="pin-dots-row" id="pinDotsRow">
      <span class="pin-dot" id="dot-0"></span>
      <span class="pin-dot" id="dot-1"></span>
      <span class="pin-dot" id="dot-2"></span>
      <span class="pin-dot" id="dot-3"></span>
    </div>

    <div id="pinAlert" class="pin-alert"></div>

    <!-- Mobile Touch Keypad -->
    <div class="numpad-grid">
      <button type="button" class="numpad-btn" onclick="pressPin('1')">1</button>
      <button type="button" class="numpad-btn" onclick="pressPin('2')">2</button>
      <button type="button" class="numpad-btn" onclick="pressPin('3')">3</button>
      <button type="button" class="numpad-btn" onclick="pressPin('4')">4</button>
      <button type="button" class="numpad-btn" onclick="pressPin('5')">5</button>
      <button type="button" class="numpad-btn" onclick="pressPin('6')">6</button>
      <button type="button" class="numpad-btn" onclick="pressPin('7')">7</button>
      <button type="button" class="numpad-btn" onclick="pressPin('8')">8</button>
      <button type="button" class="numpad-btn" onclick="pressPin('9')">9</button>
      <button type="button" class="numpad-btn numpad-action" onclick="resetPin()">Hapus</button>
      <button type="button" class="numpad-btn" onclick="pressPin('0')">0</button>
      <button type="button" class="numpad-btn numpad-action" onclick="backspacePin()">⌫</button>
    </div>

    <div class="pin-footer-hint">
      🔒 Dilindungi enkripsi sesi internal.<br>
      Ketik langsung di keyboard jika menggunakan PC/Laptop.
    </div>
  </div>
</div>

<div class="container" id="mainAppContainer" style="display:none;">

  <!-- Header -->
  <header class="header-bar">
    <div class="title-row">
      <h1>🛠️ ALAT KERJA FOLLOW-UP</h1>
      <div style="display:flex; align-items:center; gap:6px;">
        <a href="https://upsheru.com" target="_blank" class="badge-domain">🌐 upsheru.com/followup</a>
        <button type="button" class="btn-lock-nav" onclick="lockApp()" title="Kunci Akses">🔒 Kunci</button>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-selesai">0 / 197</div>
        <div class="kpi-lbl">Selesai</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-persen">0%</div>
        <div class="kpi-lbl">Progres</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-nominal">Rp 0</div>
        <div class="kpi-lbl">Tertagih</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" id="kpi-masalah">0 / 62</div>
        <div class="kpi-lbl">Masalah Fix</div>
      </div>
    </div>

    <div class="progress-track">
      <div class="progress-fill" id="progress-fill"></div>
    </div>

    <!-- Severity Filter Tabs -->
    <div class="category-tabs">
      <button class="tab-btn active" onclick="setTab('ALL', this)">⭐ Semua (197)</button>
      <button class="tab-btn tab-c1" onclick="setTab('centang1', this)">🔴 Centang 1 (28)</button>
      <button class="tab-btn tab-bc" onclick="setTab('belum_chat', this)">🟠 Belum Chat (28)</button>
      <button class="tab-btn tab-gh" onclick="setTab('ghosting', this)">🔵 Ghosting (6)</button>
      <button class="tab-btn tab-c2" onclick="setTab('centang2_abu', this)">⚪ Centang 2 Abu (44)</button>
      <button class="tab-btn tab-ar" onclick="setTab('ada_respon', this)">🟢 Janji/Respon (91)</button>
    </div>

    <!-- Search & Filter Controls -->
    <div class="controls">
      <input type="text" id="searchInput" class="search-input" placeholder="🔍 Cari nama, telepon, gang, alamat..." oninput="applyFilters()">
      <div class="filter-row">
        <select id="filterZona" class="select-dropdown" onchange="applyFilters()">
          <option value="ALL">Semua Zona (197)</option>
        </select>
        <select id="filterStatus" class="select-dropdown" onchange="applyFilters()">
          <option value="ALL">Semua Status Lapangan</option>
          <option value="belum">⚪ Belum Dikunjungi</option>
          <option value="chat">🔵 Chat WA Terkirim</option>
          <option value="janji">🟡 Janji Bayar</option>
          <option value="lunas">🟢 Lunas / Bayar</option>
          <option value="update">🟣 Nomor Diperbarui</option>
          <option value="salah">🔴 Tutup / Pindah / Tolak</option>
        </select>
      </div>
    </div>
  </header>

  <!-- Customer Cards -->
  <main class="customer-list" id="customerContainer">
    <!-- Rendered via JS -->
  </main>

  <!-- Toast -->
  <div id="toast" class="toast">Data berhasil disimpan!</div>

  <!-- Bottom Navigation -->
  <footer class="bottom-bar">
    <button class="btn-bar btn-sync" onclick="syncToServer()">
      ☁️ Sinkron Server
    </button>
    <button class="btn-bar btn-wa-report" onclick="copyWhatsAppReport()">
      📋 Rekap WA
    </button>
    <button class="btn-bar btn-export" onclick="exportDataBackup()">
      💾 Unduh Data
    </button>
  </footer>

</div>

<script>
  const rawCustomers = ${jsonData};
  const STORAGE_KEY = 'UPSHERU_FOLLOWUP_197_STATE';
  const API_SYNC_URL = '/api/publik/followup-sync';
  const VALID_PINS = ['2026', '7788'];
  const AUTH_STORAGE_KEY = 'UPSHERU_FOLLOWUP_AUTH_2026';

  let currentTab = 'ALL';
  let enteredPin = '';

  function isUnlocked() {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === '1';
  }

  function pressPin(digit) {
    if (enteredPin.length >= 4) return;
    enteredPin += digit;
    updatePinDots();
    clearPinAlert();
    if (enteredPin.length === 4) {
      setTimeout(verifyPin, 150);
    }
  }

  function backspacePin() {
    if (enteredPin.length > 0) {
      enteredPin = enteredPin.slice(0, -1);
      updatePinDots();
      clearPinAlert();
    }
  }

  function resetPin() {
    enteredPin = '';
    updatePinDots();
    clearPinAlert();
  }

  function updatePinDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('dot-' + i);
      if (dot) {
        if (i < enteredPin.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      }
    }
  }

  function clearPinAlert() {
    const alertEl = document.getElementById('pinAlert');
    if (alertEl) {
      alertEl.textContent = '';
      alertEl.style.color = '#f87171';
    }
  }

  function verifyPin() {
    const alertEl = document.getElementById('pinAlert');
    const cardEl = document.getElementById('pinCard');
    if (VALID_PINS.includes(enteredPin)) {
      if (alertEl) {
        alertEl.style.color = '#34d399';
        alertEl.textContent = '✅ PIN Benar! Membuka data...';
      }
      sessionStorage.setItem(AUTH_STORAGE_KEY, '1');
      setTimeout(() => {
        const lockEl = document.getElementById('pinLockScreen');
        const appEl = document.getElementById('mainAppContainer');
        if (lockEl) lockEl.style.display = 'none';
        if (appEl) appEl.style.display = 'block';
        initApp();
      }, 350);
    } else {
      if (alertEl) {
        alertEl.style.color = '#f87171';
        alertEl.textContent = '⚠️ PIN salah! Hubungi Koordinator Lapangan.';
      }
      if (cardEl) {
        cardEl.classList.add('shake');
        setTimeout(() => cardEl.classList.remove('shake'), 450);
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(200); } catch (e) {}
      }
      setTimeout(resetPin, 650);
    }
  }

  function lockApp() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    location.reload();
  }

  // Keyboard support for desktop / laptop
  document.addEventListener('keydown', (e) => {
    if (isUnlocked()) return;
    if (e.key >= '0' && e.key <= '9') {
      pressPin(e.key);
    } else if (e.key === 'Backspace') {
      backspacePin();
    } else if (e.key === 'Escape') {
      resetPin();
    }
  });

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

  function getEditData(id) {
    return userState[id]?.edit || null;
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
    userState[id].updatedAt = new Date().toISOString();
    saveState();
  }

  function appendQuickChip(id, chipText) {
    const cur = getNote(id);
    const updated = cur ? (cur + '; ' + chipText) : chipText;
    setNote(id, updated);
    renderCards();
    showToast('Catatan ditambahkan: ' + chipText);
  }

  function toggleEdit(id) {
    const el = document.getElementById('edit-panel-' + id);
    if (el) {
      el.classList.toggle('open');
    }
  }

  function saveEditData(id) {
    const newPhone = document.getElementById('edit-phone-' + id).value.trim();
    const newName = document.getElementById('edit-name-' + id).value.trim();
    const newCoord = document.getElementById('edit-coord-' + id).value.trim();

    if (!userState[id]) userState[id] = {};
    userState[id].edit = {
      phone: newPhone,
      name: newName,
      coords: newCoord,
      savedAt: new Date().toISOString()
    };
    userState[id].status = 'update';
    userState[id].updatedAt = new Date().toISOString();
    saveState();
    renderCards();
    showToast('✅ Data kontak baru berhasil disimpan!');
  }

  function captureGPS(id) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const inp = document.getElementById('edit-coord-' + id);
          if (inp) inp.value = lat + ',' + lng;
          showToast('📍 Koordinat GPS berhasil diambil!');
        },
        (err) => {
          alert('Gagal mengambil GPS: ' + err.message + '. Pastikan izin lokasi aktif.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Browser tidak mendukung Geolocation.');
    }
  }

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

  function setTab(tab, btn) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  }

  function updateKPI() {
    let selesaiCount = 0;
    let uangTertagih = 0;
    let masalahFixed = 0;
    const totalCount = rawCustomers.length;

    rawCustomers.forEach(c => {
      const s = getStatus(c.id);
      if (s !== 'belum') selesaiCount++;
      if (s === 'lunas') uangTertagih += (c.nominal || 0);

      // Kategori masalah utama (Centang 1, Belum Chat, Ghosting)
      if (['centang1', 'belum_chat', 'ghosting'].includes(c.catCode)) {
        if (s !== 'belum') masalahFixed++;
      }
    });

    const pct = Math.round((selesaiCount / totalCount) * 100);
    document.getElementById('kpi-selesai').textContent = \`\${selesaiCount} / \${totalCount}\`;
    document.getElementById('kpi-persen').textContent = \`\${pct}%\`;
    document.getElementById('kpi-nominal').textContent = 'Rp ' + uangTertagih.toLocaleString('id-ID');
    document.getElementById('kpi-masalah').textContent = \`\${masalahFixed} / 62\`;
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
      if (currentTab !== 'ALL' && c.catCode !== currentTab) return false;
      if (selZona !== 'ALL' && c.zona !== selZona) return false;
      if (selStatus !== 'ALL' && st !== selStatus) return false;

      if (search) {
        const edit = getEditData(c.id);
        const searchPool = \`\${c.nama} \${c.phone} \${c.zona} \${c.alamat} \${c.patokan} \${edit ? edit.phone + ' ' + edit.name : ''}\`.toLowerCase();
        if (!searchPool.includes(search)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 40px 10px; color:#64748b;">Tidak ada data yang cocok dengan kriteria filter saat ini.</div>';
      return;
    }

    container.innerHTML = filtered.map(c => {
      const st = getStatus(c.id);
      const note = getNote(c.id);
      const edit = getEditData(c.id);

      let cardClass = 'customer-card';
      if (st === 'lunas') cardClass += ' status-lunas';
      else if (st === 'janji') cardClass += ' status-janji';
      else if (st === 'chat') cardClass += ' status-chat';
      else if (st === 'update') cardClass += ' status-update';
      else if (st === 'salah') cardClass += ' status-salah';

      const activePhone = edit && edit.phone ? edit.phone : c.phone;
      const activeClean = activePhone.replace(/\\D/g, '');
      const activeWaPhone = activeClean.startsWith('0') ? '62' + activeClean.slice(1) : activeClean;
      const activeWaUrl = 'https://wa.me/' + activeWaPhone + '?text=' + encodeURIComponent(c.messageText);

      const tetanggaHtml = (c.tetangga && c.tetangga.length > 0) ? \`
        <div class="neighbor-box">
          <div class="neighbor-header">
            <span>👥 Tetangga Terdekat (Gang Sama):</span>
            <span style="color:#64748b;">\${c.tetangga.length} kontak</span>
          </div>
          \${c.tetangga.map(t => \`
            <div class="neighbor-item">
              <div>
                <strong>\${t.nama}</strong> (\${t.jarakMeter}m)<br>
                <span style="color:#64748b">\${t.noHp}</span>
              </div>
              <a href="\${t.waUrl}" target="_blank" class="neighbor-btn">
                💬 Tanya Tetangga
              </a>
            </div>
          \`).join('')}
        </div>
      \` : '';

      return \`
        <div class="\${cardClass}" id="card-\${c.id}">
          <div class="card-top">
            <div class="card-name-group">
              <div class="card-name">#\${c.displayId}. \${c.nama}</div>
              <div class="card-meta">
                <span class="meta-tag badge-prob" style="color:\${c.catColor}; border-color:\${c.catColor};">
                  \${c.catIcon} \${c.catLabel}
                </span>
                <span class="meta-tag zona">📍 \${c.zona}</span>
                <span class="meta-tag">📞 \${activePhone}</span>
              </div>
            </div>
            <div class="card-nominal">Rp \${c.nominal.toLocaleString('id-ID')}</div>
          </div>

          <!-- Insight Kendala -->
          <div class="problem-box \${c.catCode}">
            <div class="problem-title">⚠️ \${c.statusCentang} • \${c.statusJanji}</div>
            <div class="problem-desc">\${c.kendala}</div>
            <div style="margin-top:3px; color:#38bdf8; font-size:10.5px;">💡 <em>Saran: \${c.rekomendasi}</em></div>
          </div>

          <div class="card-address">
            🏡 <strong>Alamat:</strong> \${c.alamat || '-'}<br>
            📄 <strong>Invoice:</strong> \${c.invoiceNo}
          </div>

          \${tetanggaHtml}

          <!-- Quick Action Buttons -->
          <div class="action-row">
            <a href="\${activeWaUrl}" target="_blank" class="btn btn-wa" onclick="markAsChatted(\${c.id})">
              💬 Chat WA
            </a>
            <a href="\${c.gmapsUrl}" target="_blank" class="btn btn-maps">
              📍 Maps
            </a>
            <a href="tel:\${activePhone}" class="btn btn-call">
              📞 Telp
            </a>
            <button class="btn btn-edit" onclick="toggleEdit(\${c.id})">
              ✏️ Update
            </button>
          </div>

          <!-- Edit Panel (Koreksi Data Kontak) -->
          <div class="edit-panel" id="edit-panel-\${c.id}">
            <div style="font-weight:700; color:#c084fc; margin-bottom:6px;">✏️ Form Koreksi & Update Kontak Pelanggan:</div>
            <div class="form-group">
              <label>Nomor HP / WhatsApp Baru:</label>
              <input type="text" id="edit-phone-\${c.id}" class="form-input" placeholder="08xxxxxxxxxx" value="\${escapeHtml(edit?.phone || '')}">
            </div>
            <div class="form-group">
              <label>Nama Kontak Baru / Hubungan:</label>
              <input type="text" id="edit-name-\${c.id}" class="form-input" placeholder="Misal: Suami/Istri/Anak" value="\${escapeHtml(edit?.name || '')}">
            </div>
            <div class="form-group">
              <label>Titik Koordinat GPS Rumah:</label>
              <div style="display:flex; gap:4px;">
                <input type="text" id="edit-coord-\${c.id}" class="form-input" placeholder="-6.4xxxxx, 106.8xxxxx" value="\${escapeHtml(edit?.coords || (c.lat + ',' + c.lng))}">
                <button type="button" class="btn-gps" onclick="captureGPS(\${c.id})">📍 GPS</button>
              </div>
            </div>
            <button type="button" class="btn-save-edit" onclick="saveEditData(\${c.id})">💾 Simpan Perubahan Kontak</button>
          </div>

          <!-- Quick Chips -->
          <div style="font-size:10px; color:#64748b; margin-top:6px; margin-bottom:2px;">Preset Catatan Cepat:</div>
          <div class="quick-chips-row">
            <span class="chip-btn" onclick="appendQuickChip(\${c.id}, 'Rumah Kosong')">+ Rumah Kosong</span>
            <span class="chip-btn" onclick="appendQuickChip(\${c.id}, 'Nomor Sudah Ganti')">+ No. Ganti</span>
            <span class="chip-btn" onclick="appendQuickChip(\${c.id}, 'Janji Bayar 3 Hari')">+ Janji 3 Hari</span>
            <span class="chip-btn" onclick="appendQuickChip(\${c.id}, 'Uang Dititip Tetangga')">+ Titip Tetangga</span>
            <span class="chip-btn" onclick="appendQuickChip(\${c.id}, 'Minta Jemput Sampah')">+ Komplain Jemput</span>
          </div>

          <!-- Status Selector -->
          <div class="status-group">
            <button class="status-btn \${st === 'belum' ? 'active-belum' : ''}" onclick="setStatus(\${c.id}, 'belum')">Belum</button>
            <button class="status-btn \${st === 'chat' ? 'active-chat' : ''}" onclick="setStatus(\${c.id}, 'chat')">Chat WA</button>
            <button class="status-btn \${st === 'janji' ? 'active-janji' : ''}" onclick="setStatus(\${c.id}, 'janji')">Janji</button>
            <button class="status-btn \${st === 'lunas' ? 'active-lunas' : ''}" onclick="setStatus(\${c.id}, 'lunas')">LUNAS</button>
            <button class="status-btn \${st === 'update' ? 'active-update' : ''}" onclick="setStatus(\${c.id}, 'update')">No. Baru</button>
            <button class="status-btn \${st === 'salah' ? 'active-salah' : ''}" onclick="setStatus(\${c.id}, 'salah')">Salah/Tutup</button>
          </div>

          <input type="text" class="note-input" placeholder="Ketik catatan tindak lanjut..." value="\${escapeHtml(note)}" onchange="setNote(\${c.id}, this.value)">
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

  async function syncToServer() {
    showToast('☁️ Menyinkronkan ke server upsheru.com...');
    try {
      const res = await fetch(API_SYNC_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-followup-pin': '2026'
        },
        body: JSON.stringify({ updates: userState, pin: '2026' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Berhasil disinkronkan (' + data.count + ' data)!');
      } else {
        showToast('⚠️ Gagal: ' + (data.error || 'Server tidak merespon'));
      }
    } catch (err) {
      showToast('⚠️ Offline: Data tetap aman tersimpan di HP!');
    }
  }

  function copyWhatsAppReport() {
    let totalLunas = 0;
    let countLunas = 0;
    let countJanji = 0;
    let countChat = 0;
    let countUpdate = 0;
    let countSalah = 0;
    let countBelum = 0;

    let details = [];

    rawCustomers.forEach(c => {
      const s = getStatus(c.id);
      const note = getNote(c.id);
      const edit = getEditData(c.id);
      const noteStr = note ? \` (\${note})\` : '';
      const editStr = edit?.phone ? \` [NO BARU: \${edit.phone}]\` : '';

      if (s === 'lunas') {
        countLunas++;
        totalLunas += c.nominal;
        details.push(\`✅ \${c.nama} - Rp \${c.nominal.toLocaleString('id-ID')} [LUNAS]\${noteStr}\`);
      } else if (s === 'janji') {
        countJanji++;
        details.push(\`🟡 \${c.nama} - [JANJI BAYAR]\${noteStr}\`);
      } else if (s === 'update') {
        countUpdate++;
        details.push(\`🟣 \${c.nama}\${editStr}\${noteStr}\`);
      } else if (s === 'chat') {
        countChat++;
        details.push(\`🔵 \${c.nama} - [CHAT DIKIRIM]\${noteStr}\`);
      } else if (s === 'salah') {
        countSalah++;
        details.push(\`❌ \${c.nama} - [NO SALAH/RUMAH TUTUP]\${noteStr}\`);
      } else {
        countBelum++;
      }
    });

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const reportText = 
\`📊 *LAPORAN FOLLOW-UP PELANGGAN BERMASALAH — UPS HERU*
📅 Waktu: \${nowStr}
🌐 Portal: https://upsheru.com/followup

📈 *RINGKASAN CAPAIAN:*
• Total Pelanggan: 197 Target (Rp 11.315.000)
• ✅ LUNAS       : \${countLunas} warga (Rp \${totalLunas.toLocaleString('id-ID')})
• 🟡 Janji Bayar : \${countJanji} warga
• 🟣 Nomor Baru  : \${countUpdate} nomor terkoreksi
• 🔵 Chat WA     : \${countChat} warga
• ❌ Salah/Tutup : \${countSalah} warga
• ⚪ Belum       : \${countBelum} warga

📝 *DETAIL CATATAN LAPANGAN:*
\${details.length > 0 ? details.slice(0, 30).join('\\n') + (details.length > 30 ? \`\\n...(dan \${details.length - 30} lainnya)\` : '') : '(Belum ada data follow-up baru)'}

Laporan dibuat otomatis via Alat Kerja Lapangan UPS HERU.\`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).then(() => {
        showToast('✅ Laporan disalin ke clipboard! Siap kirim ke WA.');
      }).catch(() => {
        prompt('Salin teks laporan di bawah ini:', reportText);
      });
    } else {
      prompt('Salin teks laporan di bawah ini:', reportText);
    }
  }

  function exportDataBackup() {
    const backupObj = {
      exportedAt: new Date().toISOString(),
      userState: userState,
      totalCustomers: rawCustomers.length
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_followup_upsheru_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 File backup berhasil diunduh!');
  }

  function initApp() {
    populateZonaFilter();
    updateKPI();
    renderCards();
  }

  // Check auth state on load
  if (isUnlocked()) {
    const lockEl = document.getElementById('pinLockScreen');
    const appEl = document.getElementById('mainAppContainer');
    if (lockEl) lockEl.style.display = 'none';
    if (appEl) appEl.style.display = 'block';
    initApp();
  } else {
    const lockEl = document.getElementById('pinLockScreen');
    const appEl = document.getElementById('mainAppContainer');
    if (lockEl) lockEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
  }
</script>
</body>
</html>`;
}

const htmlContent = generateHtml(masterData);

// 1. Save to Desktop (if on Windows)
const desktopPath = 'C:/Users/o2w/Desktop/ALAT_KERJA_FOLLOWUP_UPSHERU.html';
try {
  if (fs.existsSync(path.dirname(desktopPath))) {
    fs.writeFileSync(desktopPath, htmlContent, 'utf8');
    console.log('Saved to Desktop:', desktopPath);
  }
} catch (e) {
  // Ignore on non-Windows
}

// 2. Save to public/followup.html
const publicFollowup = path.join(__dirname, '..', 'public', 'followup.html');
fs.writeFileSync(publicFollowup, htmlContent, 'utf8');
console.log('Saved to public/followup.html:', publicFollowup);

// 3. Save to public/alat-kerja.html
const publicAlatKerja = path.join(__dirname, '..', 'public', 'alat-kerja.html');
fs.writeFileSync(publicAlatKerja, htmlContent, 'utf8');
console.log('Saved to public/alat-kerja.html:', publicAlatKerja);
