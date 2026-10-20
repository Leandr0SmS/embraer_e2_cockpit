import xml.etree.ElementTree as ET
import re
import json

tree = ET.parse(r'd:\leandro\DEV\remote-repos\e2_panel\overhead_svg.svg')
root = tree.getroot()
g = root.findall('{http://www.w3.org/2000/svg}g')[0]
c1 = g[1]

# Panel bounding boxes defined from previous step
PANELS = [
    {"id": "dvdr", "name": "DVDR CONTROL PANEL", "system": "Recording / Comms", "box": [5.1, 115.4, 5.1, 48.4]},
    {"id": "fire_eng1", "name": "FIRE EXTINGUISHER - ENGINE 1", "system": "Fire Protection", "box": [116.9, 225.3, 6.1, 104.7]},
    {"id": "fire_cargo_apu", "name": "FIRE EXTINGUISHER - CARGO / APU", "system": "Fire Protection", "box": [227.8, 336.1, 6.1, 82.8]},
    {"id": "fire_eng2", "name": "FIRE EXTINGUISHER - ENGINE 2", "system": "Fire Protection", "box": [338.5, 446.8, 6.1, 104.7]},
    {"id": "ice_wshld_heat", "name": "WINDSHIELD HEATING & ICE PROTECTION", "system": "Ice & Rain Protection", "box": [449.2, 557.5, 6.1, 126.3]},
    {"id": "electrical", "name": "ELECTRICAL SYSTEM (AC & DC POWER)", "system": "Electrical", "box": [6.1, 114.4, 49.8, 226.5]},
    {"id": "apu_control", "name": "APU CONTROL", "system": "APU", "box": [227.8, 336.2, 85.2, 133.2]},
    {"id": "hydraulic", "name": "HYDRAULIC SYSTEM", "system": "Hydraulics", "box": [338.4, 447.2, 107.1, 219.1]},
    {"id": "fuel", "name": "FUEL SYSTEM", "system": "Fuel", "box": [116.9, 225.3, 107.7, 227.1]},
    {"id": "pneumatic_air", "name": "AIR CONDITIONING & PNEUMATIC", "system": "Pneumatics & Air Conditioning", "box": [449.2, 557.7, 128.7, 255.8]},
    {"id": "wiper", "name": "WINDSHIELD WIPER", "system": "Ice & Rain Protection", "box": [227.5, 336.2, 135.6, 176.4]},
    {"id": "ext_lights", "name": "EXTERNAL LIGHTS", "system": "Lights", "box": [227.7, 336.1, 178.8, 298.6]},
    {"id": "pressurization", "name": "PRESSURIZATION SYSTEM", "system": "Pneumatics & Air Conditioning", "box": [338.5, 446.9, 221.2, 298.7]},
    {"id": "cockpit_lights", "name": "COCKPIT LIGHTS", "system": "Lights", "box": [6.1, 114.4, 228.9, 298.6]},
    {"id": "passenger_signs", "name": "PASSENGER SIGNS", "system": "Passenger Systems", "box": [116.9, 225.3, 228.9, 298.6]},
    {"id": "passenger_oxygen", "name": "PASSENGER OXYGEN", "system": "Oxygen", "box": [449.2, 557.6, 258.0, 298.7]}
]

# Let's extract all paths and identify distinct control elements
def parse_path_coords(d):
    tokens = re.findall(r'([A-Za-z]|[-+]?[0-9]*\.?[0-9]+)', d)
    curr_x, curr_y = 0.0, 0.0
    xs, ys = [], []
    i = 0
    cmd = ''
    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t
            i += 1
        else:
            if cmd in ('M', 'L'):
                curr_x = float(t); curr_y = float(tokens[i+1])
                xs.append(curr_x); ys.append(curr_y)
                i += 2
            elif cmd in ('m', 'l'):
                curr_x += float(t); curr_y += float(tokens[i+1])
                xs.append(curr_x); ys.append(curr_y)
                i += 2
            elif cmd == 'H':
                curr_x = float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'h':
                curr_x += float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'V':
                curr_y = float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'v':
                curr_y += float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'C':
                curr_x = float(tokens[i+4]); curr_y = float(tokens[i+5])
                xs.append(curr_x); ys.append(curr_y); i += 6
            elif cmd == 'c':
                curr_x += float(tokens[i+4]); curr_y += float(tokens[i+5])
                xs.append(curr_x); ys.append(curr_y); i += 6
            else:
                i += 1
    return xs, ys

elements = []
for idx, el in enumerate(c1):
    d = el.attrib.get('d', '')
    stroke = el.attrib.get('stroke', '')
    fill = el.attrib.get('fill', '')
    xs, ys = parse_path_coords(d)
    if not xs:
        continue
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max_x - min_x
    h = max_y - min_y
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    elements.append({
        'idx': idx,
        'min_x': min_x, 'max_x': max_x,
        'min_y': min_y, 'max_y': max_y,
        'cx': cx, 'cy': cy,
        'w': w, 'h': h,
        'stroke': stroke, 'fill': fill
    })

print(f"Parsed {len(elements)} elements with coordinates.")

# Find elements in each panel
for p in PANELS:
    px1, px2, py1, py2 = p['box']
    panel_els = [e for e in elements if px1 <= e['cx'] <= px2 and py1 <= e['cy'] <= py2]
    # Filter elements that look like buttons/knobs (e.g. circles or squares, or with specific fills/strokes)
    # Buttons often have w between 5 and 35, h between 5 and 35
    buttons = [e for e in panel_els if (5 <= e['w'] <= 35 and 5 <= e['h'] <= 35 and (e['fill'] in ('white', 'rgb(79,79,79)', 'red', 'rgb(255,161,0)', 'yellow') or e['stroke'] in ('red', 'rgb(255,161,0)', 'yellow', 'rgb(64,64,64)')))]
    
    # Cluster by centroid
    clusters = []
    for b in buttons:
        matched = False
        for cl in clusters:
            if abs(cl['cx'] - b['cx']) < 7 and abs(cl['cy'] - b['cy']) < 7:
                cl['items'].append(b)
                cl['min_x'] = min(cl['min_x'], b['min_x'])
                cl['max_x'] = max(cl['max_x'], b['max_x'])
                cl['min_y'] = min(cl['min_y'], b['min_y'])
                cl['max_y'] = max(cl['max_y'], b['max_y'])
                cl['cx'] = (cl['min_x'] + cl['max_x']) / 2
                cl['cy'] = (cl['min_y'] + cl['max_y']) / 2
                matched = True
                break
        if not matched:
            clusters.append({
                'min_x': b['min_x'], 'max_x': b['max_x'],
                'min_y': b['min_y'], 'max_y': b['max_y'],
                'cx': b['cx'], 'cy': b['cy'],
                'items': [b]
            })
    
    print(f"\n--- {p['name']} ({len(clusters)} hotspots) ---")
    for ci, c in enumerate(sorted(clusters, key=lambda x: (x['cy'], x['cx']))):
        cw = c['max_x'] - c['min_x']
        ch = c['max_y'] - c['min_y']
        print(f"  Hotspot {ci+1}: center=({c['cx']:.1f}, {c['cy']:.1f}), size=({cw:.1f}x{ch:.1f}), items={len(c['items'])}")
