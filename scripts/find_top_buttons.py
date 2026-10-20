import xml.etree.ElementTree as ET
import re

tree = ET.parse(r'd:\leandro\DEV\remote-repos\e2_panel\overhead_svg.svg')
root = tree.getroot()
g = root.findall('{http://www.w3.org/2000/svg}g')[0]
c1 = g[1]

TOP_PANELS = [
    {"id": "dvdr", "name": "DVDR CONTROL PANEL", "box": [5.1, 115.4, 5.1, 48.4]},
    {"id": "fire_eng1", "name": "FIRE EXTINGUISHER - ENGINE 1", "box": [116.9, 225.3, 6.1, 104.7]},
    {"id": "fire_cargo_apu", "name": "FIRE EXTINGUISHER - CARGO / APU", "box": [227.8, 336.1, 6.1, 82.8]},
    {"id": "fire_eng2", "name": "FIRE EXTINGUISHER - ENGINE 2", "box": [338.5, 446.8, 6.1, 104.7]},
    {"id": "ice_wshld_heat", "name": "WINDSHIELD HEATING & ICE PROTECTION", "box": [449.2, 557.5, 6.1, 126.3]}
]

import sys, os
sys.path.insert(0, r'd:\leandro\DEV\remote-repos\e2_panel')
from scripts.find_buttons import elements

for p in TOP_PANELS:
    px1, px2, py1, py2 = p['box']
    panel_els = [e for e in elements if px1 <= e['cx'] <= px2 and py1 <= e['cy'] <= py2]
    buttons = [e for e in panel_els if (5 <= e['w'] <= 50 and 5 <= e['h'] <= 50 and (e['fill'] in ('white', 'rgb(79,79,79)', 'red', 'rgb(255,161,0)', 'yellow') or e['stroke'] in ('red', 'rgb(255,161,0)', 'yellow', 'rgb(64,64,64)')))]
    
    clusters = []
    for b in buttons:
        matched = False
        for cl in clusters:
            if abs(cl['cx'] - b['cx']) < 8 and abs(cl['cy'] - b['cy']) < 8:
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
