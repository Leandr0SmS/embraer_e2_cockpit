// SVG cleanup: removes LibreOffice bloat without changing what is rendered.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { cleanSvg, drawingPrimitives, hotspotIds, HOTSPOT_MARKER } from '../scripts/svg-tools.mjs';

// Minimal LibreOffice-style export with every kind of bloat clean-svg.mjs handles
const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.2" viewBox="0 0 100 100" stroke-width="28.222" xmlns="http://www.w3.org/2000/svg" xmlns:ooo="http://xml.openoffice.org/svg/export" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:presentation="http://sun.com/xmlns/staroffice/presentation">
 <defs class="ClipPathGroup">
  <clipPath id="presentation_clip_path" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="100" height="100"/></clipPath>
  <clipPath id="presentation_clip_path_shrink" clipPathUnits="userSpaceOnUse"><rect x="1" y="1" width="98" height="98"/></clipPath>
 </defs>
 <defs class="TextShapeIndex">
  <g ooo:slide="id1" ooo:id-list="id3 id4 id5"/>
 </defs>
 <defs class="EmbeddedBulletChars">
  <g id="bullet-char-template-57356" transform="scale(0.00048828125,-0.00048828125)"><path d="M 580,1141 L 1163,571 Z"/></g>
 </defs>
 <g>
  <g id="id2" class="Master_Slide">
   <g id="bg-id2" class="Background"/>
   <defs>
    <g id="bo-id2" class="BackgroundObjects"/>
   </defs>
  </g>
 </g>
 <g class="SlideGroup">
  <g>
   <g id="container-id1">
    <g id="id1" class="Slide" clip-path="url(#presentation_clip_path)">
     <g class="Page">
      <use href="#bo-id2"/>
      <g class="com.sun.star.drawing.ClosedBezierShape">
       <g id="id3">
        <rect class="BoundingBox" stroke="none" fill="none" x="1" y="1" width="10" height="10"/>
        <path fill="rgb(171,171,171)" stroke="none" d="M 1,1 C 2,2 3,3 4,4 L 10,10 Z "/>
       </g>
      </g>
      <g class="com.sun.star.drawing.LineShape">
       <g id="id4" transform="rotate(5)">
        <path fill="none" stroke="rgb(0,0,0)" d="M 20,20 L 30,30"/>
       </g>
      </g>
      <g class="Graphic">
       <g>
        <rect class="BoundingBox" stroke="none" fill="none" x="40" y="40" width="5" height="5"/>
        <image x="40" y="40" width="5" height="5" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgo="/>
       </g>
      </g>
     </g>
    </g>
   </g>
  </g>
 </g>
 <g id="interactive-hotspots">
  <g id="pfd-left" class="clickable"><title>Left PFD</title><rect class="hotspot-rect" x="3" y="3" width="9" height="9" rx="1" /></g>
 </g>
</svg>
`;

describe('cleanSvg (fixture)', () => {
  const out = cleanSvg(FIXTURE);

  it('removes LibreOffice bloat', () => {
    for (const bloat of [
      '<!DOCTYPE', 'TextShapeIndex', 'EmbeddedBulletChars', 'bullet-char-template',
      'presentation_clip_path_shrink', 'Master_Slide', 'bo-id2', '<use', 'BoundingBox',
      'com.sun.star', 'class="Slide"', 'class="Page"', 'class="Graphic"', 'ooo:',
      'xmlns:ooo', 'xmlns:presentation', 'id="id3"', 'container-id1',
    ]) {
      expect(out, `should not contain ${bloat}`).not.toContain(bloat);
    }
  });

  it('keeps everything needed to render', () => {
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(out).toContain('<clipPath id="presentation_clip_path"');
    expect(out).toContain('clip-path="url(#presentation_clip_path)"');
    expect(out).toContain('transform="rotate(5)"');
    expect(out).toContain('xlink:href="data:image/png;base64,iVBORw0KGgo="');
  });

  it('compacts path data', () => {
    expect(out).toContain('d="M1,1C2,2 3,3 4,4L10,10Z"');
  });

  it('renders the same primitives as the original', () => {
    expect(drawingPrimitives(out)).toEqual(drawingPrimitives(FIXTURE));
    expect(drawingPrimitives(out)).toHaveLength(4); // 2 paths + image + hotspot rect
  });

  it('copies the interactive-hotspots group verbatim', () => {
    expect(out.slice(out.indexOf(HOTSPOT_MARKER))).toBe(FIXTURE.slice(FIXTURE.indexOf(HOTSPOT_MARKER)));
    expect(hotspotIds(out)).toEqual(['pfd-left']);
  });

  it('produces balanced <g> tags', () => {
    const opens = (out.match(/<g[\s>]/g) || []).length;
    const closes = (out.match(/<\/g>/g) || []).length;
    expect(opens).toBe(closes);
  });

  it('throws when the hotspot group is missing', () => {
    expect(() => cleanSvg('<svg><path d="M0,0"/></svg>')).toThrow(/interactive-hotspots/);
  });
});

describe('painel_svg.svg (committed file)', () => {
  const svg = readFileSync(new URL('../painel_svg.svg', import.meta.url), 'utf8');

  it('is already clean (re-running clean-svg.mjs changes nothing)', () => {
    expect(cleanSvg(svg) === svg.replace(/\r\n/g, '\n')).toBe(true);
  });

  it('contains no LibreOffice bloat', () => {
    for (const bloat of ['TextShapeIndex', 'BoundingBox', 'com.sun.star', 'ooo:', 'EmbeddedBulletChars']) {
      expect(svg.includes(bloat), `should not contain ${bloat}`).toBe(false);
    }
  });

  it('still contains the cockpit drawing', () => {
    // ~17,800 drawing paths + 7 images + hotspot rects; guards against the drawing being deleted
    expect(drawingPrimitives(svg).length).toBeGreaterThan(17500);
    expect((svg.match(/<image\b/g) || []).length).toBe(7);
  });
});
