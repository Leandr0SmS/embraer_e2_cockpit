import re
import xml.etree.ElementTree as ET

svg_path = r'd:\leandro\DEV\remote-repos\e2_panel\painel_svg.svg'
with open(svg_path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<g id="interactive-hotspots">')
if idx != -1:
    text = text[:idx] + '</svg>'

root = ET.fromstring(text)

for el in root.iter():
    tag = el.tag.split('}')[-1]
    if tag == 'rect' and el.attrib.get('class') == 'BoundingBox':
        rx = float(el.attrib.get('x', 0))
        ry = float(el.attrib.get('y', 0))
        rw = float(el.attrib.get('width', 0))
        rh = float(el.attrib.get('height', 0))
        if 11100 <= rx <= 11800 and 21500 <= ry <= 24000 and rw > 100 and rh > 100:
            print(f"Rect: x={rx:.0f}, y={ry:.0f}, w={rw:.0f}, h={rh:.0f} (x2={rx+rw:.0f}, y2={ry+rh:.0f})")
        if 10000 <= rx <= 10700 and 18200 <= ry <= 19000 and rw > 100 and rh > 50:
            print(f"Panel10040: x={rx:.0f}, y={ry:.0f}, w={rw:.0f}, h={rh:.0f} (x2={rx+rw:.0f}, y2={ry+rh:.0f})")
