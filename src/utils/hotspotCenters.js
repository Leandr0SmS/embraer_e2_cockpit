// Extracts center coordinates (cx, cy) and bounding boxes for all interactive hotspots
// inside <g id="interactive-hotspots"> of painel_svg.svg.

const HOTSPOT_MARKER = '<g id="interactive-hotspots">';

/**
 * Parses all clickable hotspot groups from an SVG string and returns a dictionary:
 * { [hotspotId]: { id, x, y, width, height, cx, cy } }
 */
export function extractHotspotCenters(svgText) {
  const centers = {};
  const markerIdx = svgText.indexOf(HOTSPOT_MARKER);
  const section = markerIdx === -1 ? svgText : svgText.slice(markerIdx);

  const groupRegex = /<g\s+id="([^"]+)"\s+class="clickable">([\s\S]*?)<\/g>/g;
  let match;

  while ((match = groupRegex.exec(section)) !== null) {
    const id = match[1];
    const body = match[2];

    const rectMatch = body.match(/<rect\s+class="hotspot-rect"[^>]*>/);
    if (rectMatch) {
      const tag = rectMatch[0];
      const x = Number(tag.match(/\bx="([^"]+)"/)?.[1] ?? 0);
      const y = Number(tag.match(/\by="([^"]+)"/)?.[1] ?? 0);
      const width = Number(tag.match(/\bwidth="([^"]+)"/)?.[1] ?? 0);
      const height = Number(tag.match(/\bheight="([^"]+)"/)?.[1] ?? 0);
      centers[id] = {
        id,
        x,
        y,
        width,
        height,
        cx: Math.round(x + width / 2),
        cy: Math.round(y + height / 2),
      };
      continue;
    }

    const pathMatch = body.match(/<path\s+class="hotspot-rect"[^>]*>/);
    if (pathMatch) {
      const d = pathMatch[0].match(/\bd="([^"]+)"/)?.[1] ?? '';
      const coords = [...d.matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)];
      if (coords.length > 0) {
        const xs = coords.map((c) => Number(c[1]));
        const ys = coords.map((c) => Number(c[2]));
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = maxX - minX;
        const height = maxY - minY;
        centers[id] = {
          id,
          x: minX,
          y: minY,
          width,
          height,
          cx: Math.round(minX + width / 2),
          cy: Math.round(minY + height / 2),
        };
      }
    }
  }

  return centers;
}

/**
 * Resolves the SVG coordinate { x, y } for a flow step using hotspotCenters and optional dx/dy offsets.
 */
export function resolveStepPoint(step, centersMap) {
  if (typeof step.x === 'number' && typeof step.y === 'number') {
    return { x: step.x, y: step.y };
  }
  const base = centersMap[step.hotspotId];
  if (!base) {
    return null;
  }
  return {
    x: Math.round(base.cx + (step.dx ?? 0)),
    y: Math.round(base.cy + (step.dy ?? 0)),
  };
}

