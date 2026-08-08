# Validasi pengaduan live + zoom + WA popup + landing pengaduan
import re, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def zoom_of(pg):
    src = pg.evaluate("() => { const t = document.querySelector('.leaflet-tile'); return t ? t.getAttribute('src') : ''; }")
    m = re.search(r"/(\d+)/", src or "")
    return int(m.group(1)) if m else -1

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ── 1. Landing: submit pengaduan publik ──
    page.goto(BASE + "/")
    page.wait_for_selector("#pengaduan", timeout=15000)
    page.fill("#kode-pelanggan", "P000001")
    page.select_option("#jenis", "sampah_menumpuk")
    page.fill("#deskripsi", "Sampah di depan rumah sudah menumpuk 3 hari belum diambil. Mohon segera diangkut.")
    page.fill("#no-wa", "081234567890")
    page.click('button[type="submit"]')
    page.wait_for_selector('[role="status"]', timeout=15000)
    msg = page.inner_text('[role="status"]')
    print("pengaduan landing:", msg[:120])

    # coba kode invalid
    page.fill("#kode-pelanggan", "P999999")
    page.fill("#deskripsi", "Tes kode salah untuk validasi error handling.")
    page.click('button[type="submit"]')
    page.wait_for_timeout(2500)
    msg2 = page.inner_text('[role="status"]')
    print("kode invalid:", msg2[:100])

    # ── 2. Login admin → peta: cek komplain live ──
    page.goto(BASE + "/login")
    page.fill("#email", "admin@wastepay.id")
    page.fill("#password", "Testing123!")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard", timeout=10000)

    page.goto(BASE + "/peta")
    page.wait_for_selector(".leaflet-container", timeout=15000)
    page.wait_for_timeout(4000)

    # jumlah komplain di panel
    komplain_items = page.locator("div.panel button:has-text('PENGADUAN')").count() if False else None
    live = page.locator("text=PENGADUAN LIVE").count()
    # hitung marker komplain: diamond merah/amber/hijau dengan shadow kuat
    info = page.evaluate("""() => {
      const icons = [...document.querySelectorAll('.leaflet-marker-icon')];
      const komp = icons.filter(m => /box-shadow:0 0 14px #ff5c5c|box-shadow:0 0 14px #f5a524|box-shadow:0 0 14px #b7e13c/.test(m.innerHTML) && m.innerHTML.includes('rotate(45deg)') && m.innerHTML.length > 200);
      return { totalIcons: icons.length, komplainIcons: komp.length };
    }""")
    print("peta: LIVE=%d %s" % (live, info))

    # zoom out/in cepat (cek tidak error & zoom berubah)
    z0 = zoom_of(page)
    page.click(".leaflet-control-zoom-in"); page.wait_for_timeout(600)
    z1 = zoom_of(page)
    page.click(".leaflet-control-zoom-out"); page.wait_for_timeout(600)
    print("zoom: %d -> %d -> %d (ok=%s)" % (z0, z1, zoom_of(page), z1 != z0))

    # WA di popup pelanggan: klik item direktori pertama
    page.locator("div.panel button:has(span.text-bone)").first.click()
    page.wait_for_timeout(2200)
    page.evaluate("""() => { const m = [...document.querySelectorAll('.leaflet-marker-icon')].find(x => !x.innerHTML.includes('<span') && x.innerHTML.includes('rotate(45deg)') && !/14px #ff5c5c/.test(x.innerHTML)); if (m) m.dispatchEvent(new MouseEvent('click', {bubbles:true})); }""")
    page.wait_for_timeout(900)
    popup = page.evaluate("() => (document.querySelector('.leaflet-popup-content')||{}).innerText || 'NONE'")
    print("popup pelanggan:", popup[:150].replace(chr(10), " | "), "| WA-link:", "wa.me" in page.evaluate("() => (document.querySelector('.leaflet-popup-content')||{}).innerHTML || ''"))

    # cek jumlah komplain di list setelah submit (harus >= 4)
    page.wait_for_timeout(2000)
    n = page.evaluate("""() => {
      const btns = [...document.querySelectorAll('div.panel button')];
      return btns.filter(b => b.innerText.includes('Sampah') || b.innerText.includes('Belum diambil') || b.innerText.includes('P000001')).length;
    }""")
    print("komplain list baru (P000001) ada:", n > 0)

    print("console errors:", errors if errors else "none")
    page.screenshot(path="peta-depok-live.png")
    browser.close()
print("done")
