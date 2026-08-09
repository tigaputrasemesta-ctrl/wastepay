import sys
from PIL import Image

def process():
    input_png = sys.argv[1]
    output_bmp = sys.argv[2]
    
    img = Image.open(input_png)
    
    # Check if image has an alpha channel
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        # Create a white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        # Paste the image on top using the alpha channel as mask
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
        
    # Resize to speed up potrace if it's very large
    img.thumbnail((1200, 1200))
    
    # Convert to grayscale then to binary black/white for potrace
    img = img.convert('L')
    # Use threshold to convert to black and white
    # The logo has some colors, we want the shapes. We might need a threshold.
    # 200 is arbitrary, but white background is 255
    img = img.point(lambda x: 0 if x < 240 else 255, '1')
    
    img.save(output_bmp)

if __name__ == '__main__':
    process()
