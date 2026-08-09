from PIL import Image

img = Image.open('public/o2w-logo-v3.png')
img = img.convert("RGBA")
width, height = img.size

# Check corners
corners = [
    img.getpixel((0, 0)),
    img.getpixel((width-1, 0)),
    img.getpixel((0, height-1)),
    img.getpixel((width-1, height-1))
]

print("Image mode:", img.mode)
print("Corners (R, G, B, A):", corners)
