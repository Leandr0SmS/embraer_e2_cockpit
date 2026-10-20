import xml.etree.ElementTree as ET
import re

tree = ET.parse(r'd:\leandro\DEV\remote-repos\e2_panel\overhead_svg.svg')
root = tree.getroot()
g = root.findall('{http://www.w3.org/2000/svg}g')[0]
c1 = g[1]

# Let's find distinct elements with dark fills (pushbuttons, knobs, etc.)
controls = []
for idx, el in enumerate(c1):
    f = el.attrib.get('fill', '')
    s = el.attrib.get('stroke', '')
    d = el.attrib.get('d', '')
    coords = [float(x) for x in re.findall(r'([0-9]+\.[0-9]+)', d)]
    if len(coords) >= 4:
        xs = coords[0::2]
        ys = coords[1::2]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        w = max_x - min_x
        h = max_y - min_y
        # Look for buttons/switches: roughly 4px to 50px wide/tall
        if 4 <= w <= 50 and 4 <= h <= 50:
            controls.append({
                'idx': idx,
                'min_x': min_x, 'max_x': max_x,
                'min_y': min_y, 'max_y': max_y,
                'cx': (min_x + max_x) / 2,
                'cy': (min_y + max_y) / 2,
                'w': w, 'h': h,
                'fill': f, 'stroke': s
            })

print(f"Total potential control elements found: {len(controls)}")

# Group overlapping or nearby elements into hotspots
hotspots = []
for c in controls:
    matched = False
    for h in hotspots:
        if abs(h['cx'] - c['cx']) < 8 and abs(h['cy'] - c['cy']) < 8:
            h['items'].append(c)
            h['min_x'] = min(h['min_x'], c['min_x'])
            h['max_x'] = max(h['max_x'], c['max_x'])
            h['min_y'] = min(h['min_y'], c['min_y'])
            h['max_y'] = max(h['max_y'], c['max_y'])
            h['cx'] = (h['min_x'] + h['max_x']) / 2
            h['cy'] = (h['min_y'] + h['max_y']) / 2
            matched = True
            break
    if not matched:
        hotspots.append({
            'min_x': c['min_x'], 'max_x': c['max_x'],
            'min_y': c['min_y'], 'max_y': c['max_y'],
            'cx': c['cx'], 'cy': c['cy'],
            'items': [c]
        })

print(f"Grouped into {len(hotspots)} hotspots")
for i, h in enumerate(sorted(hotspots, key=lambda x: (x['cy'], x['cx']))):
    w = h['max_x'] - h['min_x']
    height = h['max_y'] - h['min_y']
    if w >= 5 and height >= 5:
        print(f"Hotspot {i+1}: center=({h['cx']:.1f}, {h['cy']:.1f}), size=({w:.1f}x{height:.1f}), items={len(h['items'])}")
