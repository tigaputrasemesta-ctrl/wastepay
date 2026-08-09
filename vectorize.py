import sys
from PIL import Image
import vtracer

def process():
    input_png = sys.argv[1]
    output_svg = sys.argv[2]
    
    print(f"Resizing {input_png}...")
    img = Image.open(input_png)
    
    # Check if image has an alpha channel, if not convert it
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Make background transparent if it's white or light
    # We will try to isolate the logo if possible, but vtracer has options
    
    img.thumbnail((800, 800))
    resized_png = "resized.png"
    img.save(resized_png)

    print(f"Vectorizing to {output_svg}...")
    vtracer.convert_image_to_svg_py(
        resized_png,
        output_svg,
        colormode='color',
        hierarchical='stacked',
        mode='spline',
        filter_speckle=4,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=3
    )
    print("Done!")

if __name__ == '__main__':
    process()
