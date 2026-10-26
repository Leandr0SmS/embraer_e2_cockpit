#!/usr/bin/env node
/**
 * clean-svg.mjs — Strips LibreOffice/OpenOffice export bloat from painel_svg.svg
 * without changing how the cockpit drawing renders.
 *
 * Usage:
 *   node scripts/clean-svg.mjs [input.svg] [output.svg]
 *   (defaults: painel_svg.svg -> painel_svg.svg, i.e. in-place)
 *
 * What it does (drawing part only — <g id="interactive-hotspots"> is copied verbatim):
 *   - Removes <defs class="TextShapeIndex">, <defs class="EmbeddedBulletChars">,
 *     the unused shrink clip path, the empty Master_Slide group and its <use>.
 *   - Removes invisible <rect class="BoundingBox" stroke="none" fill="none" .../>.
 *   - Removes LibreOffice class names (com.sun.star.*, Slide, Page, Graphic...),
 *     auto-generated ids (idN, container-id1...), ooo:* attributes and unused xmlns.
 *   - Unwraps <g> elements that have no attributes left (they have no rendering effect).
 *   - Compacts path data whitespace and drops indentation.
 *
 * Security guard:
 *   The SVG is injected into the page with dangerouslySetInnerHTML (src/App.jsx), so it
 *   must never contain active content. The script aborts (exit code 1) if the input or
 *   output contains <script>, on*="" event handlers, javascript: URLs, <foreignObject>,
 *   embedded HTML/objects, or any external/non-image href/url().
 *
 *   node scripts/clean-svg.mjs --check [file.svg]   # validate only, no rewrite
 *   (runs automatically before `npm run build` via the "prebuild" script)
 *
 * The logic lives in scripts/svg-tools.mjs (unit-tested in tests/).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { cleanSvg, findActiveContent } from './svg-tools.mjs';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const positional = args.filter((a) => !a.startsWith('--'));
const input = positional[0] ?? 'painel_svg.svg';
const output = positional[1] ?? input;

function assertNoActiveContent(text, label) {
  const problems = findActiveContent(text);
  if (problems.length) {
    console.error(`SECURITY: unsafe content found in ${label}:\n${problems.map((p) => '  - ' + p).join('\n')}`);
    process.exit(1);
  }
}

const src = readFileSync(input, 'utf8');
assertNoActiveContent(src, input);
if (checkOnly) {
  console.log(`${input}: OK (no active content)`);
  process.exit(0);
}

const result = cleanSvg(src);
assertNoActiveContent(result, output);
writeFileSync(output, result);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${input}: ${mb(Buffer.byteLength(src))} -> ${output}: ${mb(Buffer.byteLength(result))}`);
