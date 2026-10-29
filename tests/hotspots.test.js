// Data integrity: hotspots in painel_svg.svg <-> entries in src/data/manual.json
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { hotspotIds, HOTSPOT_MARKER } from '../scripts/svg-tools.mjs';
import manual from '../src/data/manual.json';

const svg = readFileSync(new URL('../painel_svg.svg', import.meta.url), 'utf8');
const ids = hotspotIds(svg);
const keys = Object.keys(manual);
const hotspotSection = svg.slice(svg.indexOf(HOTSPOT_MARKER));

describe('hotspots <-> manual.json', () => {
  it('finds the hotspot group and hotspots in the SVG', () => {
    expect(svg).toContain(HOTSPOT_MARKER);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('every hotspot lives inside <g id="interactive-hotspots">', () => {
    expect(hotspotIds(hotspotSection)).toEqual(ids);
  });

  it('has no duplicate hotspot ids', () => {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('every SVG hotspot has a manual.json entry', () => {
    expect(ids.filter((id) => !(id in manual))).toEqual([]);
  });

  it('every manual.json entry has an SVG hotspot', () => {
    expect(keys.filter((k) => !ids.includes(k))).toEqual([]);
  });

  it('every manual.json entry has non-empty title, system and description', () => {
    const incomplete = keys.filter((k) =>
      ['title', 'system', 'description'].some(
        (f) => typeof manual[k][f] !== 'string' || manual[k][f].trim() === '',
      ),
    );
    expect(incomplete).toEqual([]);
  });

  it('every hotspot group contains a .hotspot-rect shape', () => {
    const groups = [...hotspotSection.matchAll(/<g\s+id="([^"]+)"\s+class="clickable">([\s\S]*?)<\/g>/g)];
    expect(groups.length).toBe(ids.length);
    const missing = groups.filter(([, , body]) => !/class="hotspot-rect"/.test(body)).map(([, id]) => id);
    expect(missing).toEqual([]);
  });

  it('every hotspot group contains a non-empty <title> tooltip', () => {
    const groups = [...hotspotSection.matchAll(/<g\s+id="([^"]+)"\s+class="clickable">([\s\S]*?)<\/g>/g)];
    const missingTitle = groups
      .filter(([, , body]) => {
        const m = body.match(/<title>([\s\S]*?)<\/title>/);
        return !m || m[1].trim() === '';
      })
      .map(([, id]) => id);
    expect(missingTitle).toEqual([]);
  });

  it('every .hotspot-rect has valid geometry (positive width/height or non-empty path d)', () => {
    const groups = [...hotspotSection.matchAll(/<g\s+id="([^"]+)"\s+class="clickable">([\s\S]*?)<\/g>/g)];
    const invalid = groups
      .filter(([, , body]) => {
        const rectMatch = body.match(/<rect\s+class="hotspot-rect"[^>]*>/);
        if (rectMatch) {
          const w = Number(rectMatch[0].match(/\bwidth="([^"]+)"/)?.[1]);
          const h = Number(rectMatch[0].match(/\bheight="([^"]+)"/)?.[1]);
          return !(w > 0 && h > 0);
        }
        const pathMatch = body.match(/<path\s+class="hotspot-rect"[^>]*>/);
        if (pathMatch) {
          const d = pathMatch[0].match(/\bd="([^"]+)"/)?.[1]?.trim();
          return !d;
        }
        return true;
      })
      .map(([, id]) => id);
    expect(invalid).toEqual([]);
  });
});
