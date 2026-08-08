# Validasi peta Depok via Python Playwright
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE + "/login")
    page.fill('#email', "admin@wastepay.id")
    page.fill('#password', "Testing123!")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard", timeout=10000)
    print("login OK")

    page.goto(BASE + "/peta")
    page.wait_for_selector(".leaflet-container", timeout=15000)
    page.wait_for_timeout(3500)

    markers = page.locator(".leaflet-marker-icon").count()
    paths = page.locator(".leaflet-overlay-pane path").count()
    cells = page.locator(".leaflet-overlay-pane path").count()
    tiles = page.locator(".leaflet-tile-loaded").count()
    legend = page.locator("text=ZONASI").count()
    kel = page.locator("text=CILODONG").count()

    print("markers=%d paths=%d tiles=%d legend=%d kel=%d" % (markers, paths, tiles, legend, kel))
    print("console errors:", errors if errors else "none")

    page.screenshot(path="peta-depok-kota.png")
    browser.close()
print("done")
