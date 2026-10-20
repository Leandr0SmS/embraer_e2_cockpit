import xml.etree.ElementTree as ET
import re

tree = ET.parse(r'd:\leandro\DEV\remote-repos\e2_panel\overhead_svg.svg')
root = tree.getroot()
g = root.findall('{http://www.w3.org/2000/svg}g')[0]
c1 = g[1]

print(f"Total elements in c1: {len(c1)}")
tag_counts = {}
for el in c1:
    tag = el.tag.split('}')[-1]
    tag_counts[tag] = tag_counts.get(tag, 0) + 1
print("Tag counts:", tag_counts)

# Let's see some samples of paths
for i in range(15):
    el = c1[i]
    print(f"[{i}] {el.attrib.get('stroke')} / {el.attrib.get('fill')} : {el.attrib.get('d')[:60]}")
