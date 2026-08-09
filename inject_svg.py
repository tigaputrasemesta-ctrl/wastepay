import re

svg_file = 'public/o2w-logo.svg'
tsx_file = 'src/components/O2WVectorLogo.tsx'

with open(svg_file, 'r') as f:
    svg_content = f.read()

# Extract the viewBox
viewbox_match = re.search(r'viewBox="(.*?)"', svg_content)
viewbox = viewbox_match.group(1) if viewbox_match else "0 0 1200 1200"

# Extract the <g>...</g> part
match = re.search(r'(<g.*?</g>)', svg_content, re.DOTALL)
if match:
    g_content = match.group(1)
    
    with open(tsx_file, 'r') as f:
        tsx_content = f.read()
        
    new_svg = f'''<svg
        className="relative z-10 w-full h-full drop-shadow-[0_0_15px_rgba(183,225,60,0.4)]"
        viewBox="{viewbox}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {g_content}
      </svg>'''
      
    tsx_new = re.sub(r'<svg\b[^>]*>.*?</svg>', new_svg, tsx_content, flags=re.DOTALL)
    
    with open(tsx_file, 'w') as f:
        f.write(tsx_new)
    print("Injected TIGHT SVG path into O2WVectorLogo.tsx with viewBox", viewbox)
else:
    print("Could not find <g> tag in SVG")
