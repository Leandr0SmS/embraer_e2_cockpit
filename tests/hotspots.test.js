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
});
