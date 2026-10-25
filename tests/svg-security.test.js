// Security guard: the SVG is injected with dangerouslySetInnerHTML, so it must have no active content.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterAll } from 'vitest';
import { findActiveContent } from '../scripts/svg-tools.mjs';

const svgPath = fileURLToPath(new URL('../painel_svg.svg', import.meta.url));
const cliPath = fileURLToPath(new URL('../scripts/clean-svg.mjs', import.meta.url));
const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${inner}</svg>`;

const UNSAFE = {
  'script element': '<script>alert(1)</script>',
  'script element (uppercase)': '<SCRIPT src="x.js"></SCRIPT>',
  'onerror handler': '<image href="#a" onerror="alert(1)"/>',
  'onload handler on svg child': '<g onload="alert(1)"/>',
  'onclick handler with spaces': '<rect onclick = "alert(1)"/>',
  'javascript: href': '<a href="javascript:alert(1)"><rect/></a>',
  'javascript: xlink:href': '<a xlink:href="javascript:alert(1)"><rect/></a>',
  'foreignObject': '<foreignObject><div>hi</div></foreignObject>',
  'iframe': '<iframe src="https://evil.example"></iframe>',
  'external image href': '<image href="https://evil.example/x.png"/>',
  'external xlink:href': '<use xlink:href="other.svg#x"/>',
  'svg data URI image': '<image href="data:image/svg+xml;base64,PHN2Zz4="/>',
  'html data URI': '<image href="data:text/html,<script>alert(1)</script>"/>',
  'external url() in attribute': '<rect fill="url(https://evil.example/p.svg#g)"/>',
  'external url() in style': '<style>rect{fill:url(evil.svg#x)}</style>',
  'css @import': '<style>@import "https://evil.example/x.css";</style>',
  'xml entity': '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>',
};

const SAFE = {
  'plain path': '<path fill="rgb(1,2,3)" d="M0,0L10,10Z"/>',
  'embedded png': '<image xlink:href="data:image/png;base64,iVBORw0KGgo="/>',
  'embedded jpeg': '<image href="data:image/jpeg;base64,/9j/4AAQ"/>',
  'internal use reference': '<use href="#shape"/>',
  'internal clip-path url()': '<g clip-path="url(#clip)"><rect/></g>',
  'hotspot with title': '<g id="x" class="clickable"><title>Online Mode</title><rect class="hotspot-rect"/></g>',
};

describe('findActiveContent', () => {
  it('accepts the real painel_svg.svg', () => {
    expect(findActiveContent(readFileSync(svgPath, 'utf8'))).toEqual([]);
  });

  it.each(Object.entries(UNSAFE))('rejects %s', (_, inner) => {
    expect(findActiveContent(wrap(inner)).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(SAFE))('accepts %s', (_, inner) => {
    expect(findActiveContent(wrap(inner))).toEqual([]);
  });

  it('reports the line number of the problem', () => {
    const [problem] = findActiveContent('<svg>\n<g/>\n<rect onclick="x"/>\n</svg>');
    expect(problem).toMatch(/line 3/);
  });
});

describe('clean-svg.mjs --check (CLI used by prebuild)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-guard-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const run = (file) => spawnSync(process.execPath, [cliPath, '--check', file], { encoding: 'utf8' });

  it('exits 0 for the real SVG', () => {
    const r = run(svgPath);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/OK/);
  });

  it('exits 1 and explains why for an unsafe SVG', () => {
    const evil = join(dir, 'evil.svg');
    writeFileSync(evil, wrap('<image href="#a" onerror="alert(1)"/><g id="interactive-hotspots"></g>'));
    const r = run(evil);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/SECURITY/);
    expect(r.stderr).toMatch(/on\*=/);
  });

  it('does not modify the file in --check mode', () => {
    const f = join(dir, 'raw.svg');
    const content = wrap('<g class="com.sun.star.drawing.LineShape"><path d="M 0,0 L 1,1"/></g><g id="interactive-hotspots"></g>');
    writeFileSync(f, content);
    expect(run(f).status).toBe(0);
    expect(readFileSync(f, 'utf8')).toBe(content);
  });
});
