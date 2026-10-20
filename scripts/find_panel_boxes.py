import xml.etree.ElementTree as ET
import re

tree = ET.parse(r'd:\leandro\DEV\remote-repos\e2_panel\overhead_svg.svg')
root = tree.getroot()
g = root.findall('{http://www.w3.org/2000/svg}g')[0]
c1 = g[1]

panel_borders = []
for idx, el in enumerate(c1):
    s = el.attrib.get('stroke', '')
    f = el.attrib.get('fill', '')
    if s == 'rgb(150,150,150)' or f == 'rgb(150,150,150)':
        d = el.attrib.get('d', '')
        # extract all numbers (including signs and decimals)
        nums = [float(x) for x in re.findall(r'[-+]?[0-9]*\.?[0-9]+', d)]
        # collect coordinates
        # let's find bounding box by parsing commands or simple min/max
        # to be careful with H and V, let's parse simple commands
        xs = []
        ys = []
        # regex for tokens
        tokens = re.findall(r'([A-Za-z]|[-+]?[0-9]*\.?[0-9]+)', d)
        curr_x, curr_y = 0.0, 0.0
        i = 0
        cmd = ''
        while i < len(tokens):
            t = tokens[i]
            if t.isalpha():
                cmd = t
                i += 1
            else:
                if cmd == 'M' or cmd == 'L':
                    curr_x = float(t)
                    curr_y = float(tokens[i+1])
                    xs.append(curr_x); ys.append(curr_y)
                    i += 2
                elif cmd == 'm' or cmd == 'l':
                    curr_x += float(t)
                    curr_y += float(tokens[i+1])
                    xs.append(curr_x); ys.append(curr_y)
                    i += 2
                elif cmd == 'H':
                    curr_x = float(t)
                    xs.append(curr_x); ys.append(curr_y)
                    i += 1
                elif cmd == 'h':
                    curr_x += float(t)
                    xs.append(curr_x); ys.append(curr_y)
                    i += 1
                elif cmd == 'V':
                    curr_y = float(t)
                    xs.append(curr_x); ys.append(curr_y)
                    i += 1
                elif cmd == 'v':
                    curr_y += float(t)
                    xs.append(curr_x); ys.append(curr_y)
                    i += 1
                elif cmd in ('C', 'c'):
                    # 6 numbers
                    if cmd == 'C':
                        curr_x = float(tokens[i+4])
                        curr_y = float(tokens[i+5])
                    else:
                        curr_x += float(tokens[i+4])
                        curr_y += float(tokens[i+5])
                    xs.append(curr_x); ys.append(curr_y)
                    i += 6
                else:
                    i += 1
        if xs and ys:
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            w = max_x - min_x
            h = max_y - min_y
            if w > 20 and h > 15:
                panel_borders.append((round(min_x, 1), round(max_x, 1), round(min_y, 1), round(max_y, 1), round(w, 1), round(h, 1)))

# Deduplicate
unique_borders = sorted(list(set(panel_borders)), key=lambda b: (b[2], b[0]))
print(f"Found {len(unique_borders)} unique panel boxes:")
for idx, b in enumerate(unique_borders):
    print(f"Panel {idx+1}: X=[{b[0]} -> {b[1]}] (w={b[4]}), Y=[{b[2]} -> {b[3]}] (h={b[5]})")
