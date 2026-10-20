import xml.etree.ElementTree as ET
import re
import json

tree = ET.parse(r'd:\leandro\DEV\remote-repos\e2_panel\overhead_svg.svg')
root = tree.getroot()
g = root.findall('{http://www.w3.org/2000/svg}g')[0]
c1 = g[1]

def parse_path_coords(d):
    tokens = re.findall(r'([A-Za-z]|[-+]?[0-9]*\.?[0-9]+)', d)
    curr_x, curr_y = 0.0, 0.0
    xs, ys = [], []
    i = 0
    cmd = ''
    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t; i += 1
        else:
            if cmd in ('M', 'L'):
                curr_x = float(t); curr_y = float(tokens[i+1]); xs.append(curr_x); ys.append(curr_y); i += 2
            elif cmd in ('m', 'l'):
                curr_x += float(t); curr_y += float(tokens[i+1]); xs.append(curr_x); ys.append(curr_y); i += 2
            elif cmd == 'H':
                curr_x = float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'h':
                curr_x += float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'V':
                curr_y = float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd == 'v':
                curr_y += float(t); xs.append(curr_x); ys.append(curr_y); i += 1
            elif cmd in ('C', 'c'):
                c_dx = float(tokens[i+4]); c_dy = float(tokens[i+5])
                if cmd == 'c': curr_x += c_dx; curr_y += c_dy
                else: curr_x = c_dx; curr_y = c_dy
                xs.append(curr_x); ys.append(curr_y); i += 6
            else: i += 1
    return xs, ys

elements = []
for idx, el in enumerate(c1):
    d = el.attrib.get('d', '')
    stroke = el.attrib.get('stroke', '')
    fill = el.attrib.get('fill', '')
    xs, ys = parse_path_coords(d)
    if not xs: continue
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    elements.append({
        'idx': idx, 'min_x': min_x, 'max_x': max_x, 'min_y': min_y, 'max_y': max_y,
        'cx': (min_x + max_x) / 2, 'cy': (min_y + max_y) / 2,
        'w': max_x - min_x, 'h': max_y - min_y,
        'stroke': stroke, 'fill': fill
    })

# Let's search by panel region
def get_controls_in_box(x1, x2, y1, y2, min_w=4, max_w=45, min_h=4, max_h=45):
    sub = [e for e in elements if x1 <= e['cx'] <= x2 and y1 <= e['cy'] <= y2 and min_w <= e['w'] <= max_w and min_h <= e['h'] <= max_h]
    # filter out panel corner screws: screws are near panel corners, typically w~8.9, h~8.9 with circular contours
    # cluster nearby
    clusters = []
    for s in sub:
        matched = False
        for cl in clusters:
            if abs(cl['cx'] - s['cx']) < 6 and abs(cl['cy'] - s['cy']) < 6:
                cl['items'].append(s)
                cl['min_x'] = min(cl['min_x'], s['min_x'])
                cl['max_x'] = max(cl['max_x'], s['max_x'])
                cl['min_y'] = min(cl['min_y'], s['min_y'])
                cl['max_y'] = max(cl['max_y'], s['max_y'])
                cl['cx'] = (cl['min_x'] + cl['max_x']) / 2
                cl['cy'] = (cl['min_y'] + cl['max_y']) / 2
                matched = True
                break
        if not matched:
            clusters.append({
                'min_x': s['min_x'], 'max_x': s['max_x'],
                'min_y': s['min_y'], 'max_y': s['max_y'],
                'cx': s['cx'], 'cy': s['cy'],
                'items': [s]
            })
    return clusters

panels_to_inspect = {
    "DVDR": (5, 115, 5, 48),
    "AC_ELEC": (6, 114, 50, 145),
    "DC_ELEC": (6, 114, 145, 227),
    "CKPT_LIGHTS": (6, 114, 229, 299),
    "FIRE_ENG1": (117, 225, 6, 105),
    "FUEL": (117, 225, 108, 227),
    "PAX_SIGNS": (117, 225, 229, 299),
    "FIRE_CARGO_APU": (228, 336, 6, 83),
    "APU_CTRL": (228, 336, 85, 133),
    "WIPER": (228, 336, 136, 176),
    "EXT_LIGHTS": (228, 336, 179, 299),
    "FIRE_ENG2": (338, 447, 6, 105),
    "HYD": (338, 447, 107, 219),
    "PRESS": (338, 447, 221, 299),
    "WSHLD_ICE": (449, 558, 6, 126),
    "PNEUMATIC": (449, 558, 129, 256),
    "OXYGEN": (449, 558, 258, 299)
}

results = {}
for p_name, box in panels_to_inspect.items():
    cls = get_controls_in_box(*box)
    results[p_name] = [
        {
            'cx': round(c['cx'], 1),
            'cy': round(c['cy'], 1),
            'w': round(c['max_x'] - c['min_x'], 1),
            'h': round(c['max_y'] - c['min_y'], 1),
            'min_x': round(c['min_x'], 1),
            'min_y': round(c['min_y'], 1),
            'items_count': len(c['items'])
        }
        for c in sorted(cls, key=lambda x: (x['cy'], x['cx']))
    ]

with open(r'd:\leandro\DEV\remote-repos\e2_panel\scripts\coords_summary.json', 'w') as f:
    json.dump(results, f, indent=2)

print("Saved coords_summary.json successfully.")
