"""Generate placeholder logo (100x100) & background (1920x1080) untuk proyek Duitku WASTEPAY."""
from PIL import Image, ImageDraw, ImageFont

OUT = "public/duitku"

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# ---------- Logo 100x100 ----------
img = Image.new("RGB", (100, 100), hex_to_rgb("#059669"))  # emerald-600
d = ImageDraw.Draw(img)
# lingkaran putih tipis + huruf W
d.ellipse([6, 6, 94, 94], outline=(255, 255, 255), width=4)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 56)
except Exception:
    font = ImageFont.load_default()
bbox = d.textbbox((0, 0), "W", font=font)
w = bbox[2] - bbox[0]
d.text(((100 - w) / 2, 16), "W", fill=(255, 255, 255), font=font)
img.save(f"{OUT}/logo.png")
print("logo.png OK")

# ---------- Background 1920x1080 ----------
bg = Image.new("RGB", (1920, 1080), hex_to_rgb("#065f46"))  # emerald-800
d = ImageDraw.Draw(bg)
# gradasi sederhana: beberapa strip vertikal
for x in range(1920):
    t = x / 1920
    r = int(5 + (6 - 5) * t)
    g = int(95 + (88 - 95) * t)
    b = int(70 + (66 - 70) * t)
    d.line([(x, 0), (x, 1080)], fill=(r, g, b))
# lingkaran dekoratif
d.ellipse([1400, 600, 1900, 1100], outline=(255, 255, 255), width=6)
d.ellipse([100, -200, 700, 400], outline=(255, 255, 255), width=6)
# teks
try:
    font_big = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 110)
    font_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 48)
except Exception:
    font_big = font_small = ImageFont.load_default()
d.text((160, 380), "WASTEPAY", fill=(255, 255, 255), font=font_big)
d.text((160, 530), "Sistem Retribusi Sampah Digital", fill=(209, 250, 229), font=font_small)
bg.save(f"{OUT}/background.png")
print("background.png OK")
