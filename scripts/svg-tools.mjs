// svg-tools.mjs — Utilities for SVG security validation and bloat removal.

export const HOTSPOT_MARKER = '<g id="interactive-hotspots">';

/**
 * Validates an SVG for active/unsafe content.
 * Returns an array of problem descriptions with line numbers, or an empty array if clean.
 */
export function findActiveContent(svg) {
  const problems = [];
  const lines = svg.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 1. <script> tags
    if (/<script\b/i.test(line)) {
      problems.push(`<script> element at line ${lineNum}`);
    }

    // 2. on*="" event handlers (e.g. onerror=, onload=, onclick=)
    if (/\bon[a-z]+\s*=/i.test(line)) {
      problems.push(`on*= event handler at line ${lineNum}`);
    }

    // 3. javascript: URIs in href or other attributes
    if (/javascript\s*:/i.test(line)) {
      problems.push(`javascript: URI at line ${lineNum}`);
    }

    // 4. <foreignObject> or <iframe> tags
    if (/<foreignObject\b/i.test(line)) {
      problems.push(`<foreignObject> element at line ${lineNum}`);
    }
    if (/<iframe\b/i.test(line)) {
      problems.push(`<iframe> element at line ${lineNum}`);
    }

    // 5. Unsafe data URIs (svg+xml, text/html)
    if (/data:image\/svg\+xml/i.test(line) || /data:text\/html/i.test(line)) {
      problems.push(`unsafe data: URI at line ${lineNum}`);
    }

    // 6. External href or xlink:href
    const hrefMatches = line.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi);
    for (const match of hrefMatches) {
      const val = match[1].trim();
      if (val.startsWith('#')) continue; // local fragment
      if (/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(val)) continue; // safe embedded raster
      problems.push(`external or unsafe href ("${val}") at line ${lineNum}`);
    }

    // 7. External url() references (must be local #fragment)
    const urlMatches = line.matchAll(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi);
    for (const match of urlMatches) {
      const val = match[1].trim();
      if (val.startsWith('#')) continue; // local fragment url(#id)
      problems.push(`external url() reference ("${val}") at line ${lineNum}`);
    }

    // 8. CSS @import
    if (/@import\b/i.test(line)) {
      problems.push(`CSS @import at line ${lineNum}`);
    }

    // 9. XML entity declarations in DOCTYPE
    if (/<!ENTITY\b/i.test(line)) {
      problems.push(`XML <!ENTITY> declaration at line ${lineNum}`);
    }
  }

  return problems;
}

/**
 * Compacts SVG path data whitespace without altering geometry.
 */
function compactPathData(pathData) {
  return pathData
    .trim()
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*([a-zA-Z])\s*/g, '$1')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts all hotspot IDs from the interactive-hotspots group.
 */
export function hotspotIds(svg) {
  const markerIdx = svg.indexOf(HOTSPOT_MARKER);
  const target = markerIdx === -1 ? svg : svg.slice(markerIdx);
  const matches = [...target.matchAll(/<g\s+id="([^"]+)"\s+class="clickable"/g)];
  return matches.map((m) => m[1]);
}

/**
 * Extracts rendered drawing primitives (paths, embedded images, and non-bounding-box rects
 * outside <defs>) for structural equality comparison.
 */
export function drawingPrimitives(svg) {
  const primitives = [];
  // Strip <defs>...</defs> blocks so non-rendered clipPaths and bullet templates are excluded
  const withoutDefs = svg.replace(/<defs\b[^>]*>[\s\S]*?<\/defs>/gi, '');

  const regex = /<(path|image|rect)\b([^>]*)\/?>/gi;
  let match;
  while ((match = regex.exec(withoutDefs)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];

    // Exclude LibreOffice invisible bounding boxes
    if (tag === 'rect' && /class="BoundingBox"/i.test(attrs)) {
      continue;
    }

    if (tag === 'path') {
      const dMatch = attrs.match(/\bd="([^"]+)"/i);
      const d = dMatch ? compactPathData(dMatch[1]) : '';
      primitives.push({ type: 'path', d });
    } else if (tag === 'image') {
      const hrefMatch = attrs.match(/(?:xlink:)?href="([^"]+)"/i);
      primitives.push({ type: 'image', href: hrefMatch ? hrefMatch[1] : '' });
    } else if (tag === 'rect') {
      const xMatch = attrs.match(/\bx="([^"]+)"/i);
      const yMatch = attrs.match(/\by="([^"]+)"/i);
      const wMatch = attrs.match(/\bwidth="([^"]+)"/i);
      const hMatch = attrs.match(/\bheight="([^"]+)"/i);
      primitives.push({
        type: 'rect',
        x: xMatch ? xMatch[1] : '0',
        y: yMatch ? yMatch[1] : '0',
        w: wMatch ? wMatch[1] : '0',
        h: hMatch ? hMatch[1] : '0',
      });
    }
  }

  return primitives;
}

/**
 * Unwraps <g> elements that have no attributes left, preserving <g ...> elements with attributes.
 */
function unwrapBareGroups(svgFragment) {
  const keepStack = [];
  return svgFragment.replace(/<\/?g\b[^>]*>/gi, (tag) => {
    if (tag.startsWith('</')) {
      const keep = keepStack.pop();
      return keep ? tag : '';
    }
    const isSelfClosing = tag.endsWith('/>');
    const isBare = /^<g\s*\/?>$/i.test(tag);
    if (isSelfClosing) {
      return isBare ? '' : tag;
    }
    keepStack.push(!isBare);
    return isBare ? '' : tag;
  });
}

/**
 * Strips LibreOffice / OpenOffice bloat from an SVG string, preserving drawing and hotspots.
 */
export function cleanSvg(svg) {
  const markerIdx = svg.indexOf(HOTSPOT_MARKER);
  if (markerIdx === -1) {
    throw new Error(`interactive-hotspots group missing: could not find ${HOTSPOT_MARKER}`);
  }

  const normalized = svg.replace(/\r\n/g, '\n');
  let drawing = normalized.slice(0, markerIdx);
  const hotspots = normalized.slice(markerIdx);

  // Remove DOCTYPE
  drawing = drawing.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Remove unused definitions & templates
  drawing = drawing.replace(/<defs class="TextShapeIndex">[\s\S]*?<\/defs>/gi, '');
  drawing = drawing.replace(/<defs class="EmbeddedBulletChars">[\s\S]*?<\/defs>/gi, '');
  drawing = drawing.replace(/<clipPath id="presentation_clip_path_shrink"[\s\S]*?<\/clipPath>/gi, '');
  drawing = drawing.replace(/<g>\s*<g id="id2" class="Master_Slide">[\s\S]*?<\/defs>\s*<\/g>\s*<\/g>/gi, '');
  drawing = drawing.replace(/<use href="#bo-id2"\s*\/?>/gi, '');

  // Remove BoundingBox rects
  drawing = drawing.replace(/<rect class="BoundingBox"[^>]*\/>/gi, '');

  // Remove LibreOffice namespace declarations and attributes
  drawing = drawing.replace(/\s*xmlns:ooo="[^"]*"/gi, '');
  drawing = drawing.replace(/\s*xmlns:presentation="[^"]*"/gi, '');
  drawing = drawing.replace(/\s*ooo:[a-z0-9-]+="[^"]*"/gi, '');

  // Remove LibreOffice classes
  drawing = drawing.replace(
    /\s*class="(?:com\.sun\.star\.[^"]+|ClipPathGroup|SlideGroup|Slide|Page|Graphic|Master_Slide|Background|BackgroundObjects)"/gi,
    '',
  );

  // Remove auto-generated id attributes
  drawing = drawing.replace(/\s*id="container-id\d+"/gi, '');
  drawing = drawing.replace(/\s*id="id[0-9]+"/gi, '');

  // Unwrap bare <g>...</g> tags that have no attributes left
  drawing = unwrapBareGroups(drawing);

  // Compact path data whitespace
  drawing = drawing.replace(/\bd="([^"]+)"/g, (_, pathData) => `d="${compactPathData(pathData)}"`);

  // Clean empty or whitespace-only lines and drop indentation
  const lines = drawing
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.join('\n') + '\n' + hotspots;
}
