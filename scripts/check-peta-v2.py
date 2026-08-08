# Validasi peta baru: cluster, batas kecamatan, voronoi, rute, auto-zonasi
import re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def zoom_of(page):
    src = page.evaluate("""() => {
      const t = document.querySelector('.leaflet-tile');
      return t ? t.getAttribute('src') : '';
    }""")
    m = re.search(r"/(\d+)/(\d+)/(\d+)", src or "")
    return int(m.group(1)) if m else -1

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE + "/login")
    page.fill("#email", "admin@wastepay.id")
    page.fill("#password", "Testing123!")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard", timeout=10000)
    print("login OK")

    page.goto(BASE + "/peta")
    page.wait_for_selector(".leaflet-container", timeout=15000)
    page.wait_for_timeout(4000)

    info = page.evaluate("""() => {
      const paths = [...document.querySelectorAll('.leaflet-overlay-pane path')];
      const ds = paths.map(pp => pp.getAttribute('d') || '');
      const poly = ds.filter(d => /z$/i.test(d)).length;
      return {
        clusterMarkers: document.querySelectorAll('.marker-cluster').length,
        pinMarkers: document.querySelectorAll('.leaflet-marker-icon:not(.marker-cluster)').length,
        kecLabels: document.querySelectorAll('.leaflet-tooltip.kec-label').length,
        paths: paths.length, polygonPaths: poly,
        panelBtn: !!document.querySelector('button[aria-label="Ciutkan panel"]'),
      };
    }""")
    print("kota: zoom=%d %s" % (zoom_of(page), info))

    # zoom in via tombol kontrol
    for _ in range(2):
        page.click(".leaflet-control-zoom-in")
        page.wait_for_timeout(700)
    print("zoom+2 ->", zoom_of(page))
    dots = page.evaluate("() => [...document.querySelectorAll('.leaflet-overlay-pane path')].filter(d => (d.getAttribute('d')||'').match(/[Aa]/)).length")
    print("RT dots:", dots)

    # pilih rute pertama
    page.select_option("select >> nth=2", index=1)
    page.wait_for_timeout(1800)
    dash = page.evaluate("() => [...document.querySelectorAll('.leaflet-overlay-pane path')].filter(d => (d.getAttribute('stroke-dasharray')||'').includes('8')).length")
    print("rute polyline (dash):", dash, "| zoom:", zoom_of(page))

    # buka popup: klik pelanggan pertama di direktori -> peta terbang -> klik pin
    page.locator("div.panel button").first.click()
    page.wait_for_timeout(1800)
    page.evaluate("() => { const mk = [...document.querySelectorAll('.leaflet-marker-icon')].find(m => !m.closest('.marker-cluster')); if (mk) mk.dispatchEvent(new MouseEvent('click', {bubbles: true})); }")
    page.wait_for_timeout(900)
    popup = page.evaluate("() => (document.querySelector('.leaflet-popup-content')||{}).innerText || 'NONE'")
    print("popup:", popup[:200].replace(chr(10), " | "))

    print("console errors:", errors if errors else "none")
    page.screenshot(path="peta-depok-v2.png")
    browser.close()
print("done")
