// mcp-tools.mjs — Zero-dependency MCP tool definitions, security validators, and JSON-RPC 2.0 handler
// for developing and maintaining the Embraer E2 Cockpit Panel (e2_panel).

import { readFileSync, writeFileSync } from 'node:fs';
import { findActiveContent, hotspotIds, HOTSPOT_MARKER } from './svg-tools.mjs';
import { extractHotspotCenters } from '../src/utils/hotspotCenters.js';

export const SERVER_INFO = {
  name: 'e2-panel-dev-mcp',
  version: '1.0.0',
};

export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-03-26',
  '2024-11-05',
];

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;
const UNSAFE_TEXT_REGEX = /<\s*\/?\s*(?:script|iframe|foreignObject|object|embed)\b|javascript\s*:|\bon[a-z]+\s*=|<!ENTITY\b|@import\b/i;

const PATHS = {
  svg: new URL('../painel_svg.svg', import.meta.url),
  manual: new URL('../src/data/manual.json', import.meta.url),
  flows: new URL('../src/data/flows.json', import.meta.url),
  css: new URL('../src/App.css', import.meta.url),
};

/**
 * Escapes text for safe inclusion inside an XML element body or attribute.
 */
export function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validates a hotspot or flow identifier against injection characters.
 */
export function assertSafeId(id, label = 'id') {
  if (typeof id !== 'string' || !SAFE_ID_REGEX.test(id)) {
    throw new Error(
      `Invalid ${label} "${id}": must match /^[a-zA-Z0-9_-]{1,80}$/ (letters, digits, hyphens, underscores only).`,
    );
  }
}

/**
 * Validates plain-text metadata fields against active/unsafe markup or script patterns.
 */
export function assertSafeText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${label}: must be a non-empty string.`);
  }
  if (UNSAFE_TEXT_REGEX.test(value)) {
    throw new Error(`Security rejection in ${label}: active or unsafe markup/script pattern detected.`);
  }
}

/**
 * Validates a finite numeric coordinate within reasonable SVG coordinate bounds.
 */
export function assertFiniteNumber(value, label, { min = -50000, max = 100000 } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${label}: must be a finite number between ${min} and ${max}.`);
  }
}

/**
 * Creates the default disk-backed project store targeting only the 4 whitelisted project files.
 */
export function createDiskStore() {
  return {
    readSvg: () => readFileSync(PATHS.svg, 'utf8'),
    writeSvg: (content) => writeFileSync(PATHS.svg, content, 'utf8'),
    readManual: () => JSON.parse(readFileSync(PATHS.manual, 'utf8')),
    writeManual: (data) => writeFileSync(PATHS.manual, JSON.stringify(data, null, 2) + '\n', 'utf8'),
    readFlows: () => JSON.parse(readFileSync(PATHS.flows, 'utf8')),
    writeFlows: (data) => writeFileSync(PATHS.flows, JSON.stringify(data, null, 2) + '\n', 'utf8'),
    readCss: () => readFileSync(PATHS.css, 'utf8'),
    writeCss: (content) => writeFileSync(PATHS.css, content, 'utf8'),
  };
}

/**
 * Creates an in-memory project store for unit testing without touching disk.
 */
export function createMemoryStore({ svg, manual, flows, css }) {
  let currentSvg = svg;
  let currentManual = structuredClone(manual);
  let currentFlows = structuredClone(flows);
  let currentCss = css;

  return {
    readSvg: () => currentSvg,
    writeSvg: (content) => {
      currentSvg = content;
    },
    readManual: () => structuredClone(currentManual),
    writeManual: (data) => {
      currentManual = structuredClone(data);
    },
    readFlows: () => structuredClone(currentFlows),
    writeFlows: (data) => {
      currentFlows = structuredClone(data);
    },
    readCss: () => currentCss,
    writeCss: (content) => {
      currentCss = content;
    },
  };
}

/**
 * Parses detailed SVG hotspot metadata (including rx, shape type, and raw <title>) from painel_svg.svg.
 */
function parseHotspotSvgDetails(svgText, id) {
  const markerIdx = svgText.indexOf(HOTSPOT_MARKER);
  const section = markerIdx === -1 ? svgText : svgText.slice(markerIdx);
  const centers = extractHotspotCenters(svgText);
  const center = centers[id] ?? null;

  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const groupRegex = new RegExp(`<g\\s+id="${escapedId}"\\s+class="clickable">([\\s\\S]*?)<\\/g>`);
  const match = section.match(groupRegex);
  if (!match) return null;

  const body = match[1];
  const titleMatch = body.match(/<title>([\s\S]*?)<\/title>/);
  const rectMatch = body.match(/<rect\s+class="hotspot-rect"[^>]*>/);
  const pathMatch = body.match(/<path\s+class="hotspot-rect"[^>]*>/);

  let rx = null;
  let shape = 'unknown';
  if (rectMatch) {
    shape = 'rect';
    const rxAttr = rectMatch[0].match(/\brx="([^"]+)"/);
    rx = rxAttr ? Number(rxAttr[1]) : 0;
  } else if (pathMatch) {
    shape = 'path';
  }

  return {
    ...(center ?? { id }),
    rx,
    shape,
    svgTitle: titleMatch ? titleMatch[1] : '',
  };
}

/**
 * Checks whether #<id>:not(:hover) .hotspot-rect is listed in the borderless rule in src/App.css.
 */
function isHotspotBorderless(cssText, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`#${escapedId}:not\\(:hover\\)\\s+\\.hotspot-rect`).test(cssText);
}

/**
 * Updates src/App.css to add or remove #<id>:not(:hover) .hotspot-rect in the borderless selector block.
 */
function setHotspotBorderlessInCss(cssText, id, borderless) {
  assertSafeId(id, 'hotspotId');
  const selector = `#${id}:not(:hover) .hotspot-rect`;
  const currentlyBorderless = isHotspotBorderless(cssText, id);

  if (borderless && !currentlyBorderless) {
    const blockRegex = /(\/\*\s*Side-console[\s\S]*?)(^\s*\{\s*\n\s*fill:\s*transparent;\s*\n\s*stroke:\s*transparent;\s*\n\s*\})/m;
    if (blockRegex.test(cssText)) {
      return cssText.replace(blockRegex, (_, selectorsPart, bodyPart) => {
        const trimmed = selectorsPart.trimEnd();
        return `${trimmed},\n${selector} ${bodyPart.trimStart()}`;
      });
    }
    return `${cssText.trimEnd()}\n\n${selector} {\n  fill: transparent;\n  stroke: transparent;\n}\n`;
  }

  if (!borderless && currentlyBorderless) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return cssText
      .replace(new RegExp(`^\\s*${escapedSelector}\\s*,\\r?\\n`, 'm'), '')
      .replace(new RegExp(`,\\r?\\n\\s*${escapedSelector}(?=\\s*\\{)`, 'm'), '');
  }

  return cssText;
}

/**
 * Tool 1: inspect_hotspot
 */
export function inspectHotspot(args, store) {
  const { id } = args ?? {};
  assertSafeId(id, 'id');

  const svg = store.readSvg();
  const manual = store.readManual();
  const flowsData = store.readFlows();
  const css = store.readCss();

  const svgDetails = parseHotspotSvgDetails(svg, id);
  const manualEntry = manual[id] ?? null;

  if (!svgDetails && !manualEntry) {
    throw new Error(`Hotspot "${id}" not found in painel_svg.svg or src/data/manual.json.`);
  }

  const flowReferences = [];
  for (const flow of flowsData.flows ?? []) {
    for (const step of flow.steps ?? []) {
      if (step.hotspotId === id) {
        flowReferences.push({
          flowId: flow.id,
          flowTitle: flow.title,
          role: step.role,
          step: step.step,
          item: step.item,
          action: step.action,
          dx: step.dx ?? 0,
          dy: step.dy ?? 0,
          ...(step.note ? { note: step.note } : {}),
        });
      }
    }
  }

  return {
    id,
    existsInSvg: Boolean(svgDetails),
    existsInManual: Boolean(manualEntry),
    borderless: isHotspotBorderless(css, id),
    geometry: svgDetails,
    manual: manualEntry,
    flowReferences,
  };
}

/**
 * Tool 2: search_hotspots
 */
export function searchHotspots(args, store) {
  const query = typeof args?.query === 'string' ? args.query.trim().toLowerCase() : '';
  const systemFilter = typeof args?.system === 'string' ? args.system.trim().toLowerCase() : '';
  const limit = typeof args?.limit === 'number' && Number.isFinite(args.limit)
    ? Math.max(1, Math.min(200, Math.trunc(args.limit)))
    : 25;

  const svg = store.readSvg();
  const manual = store.readManual();
  const flowsData = store.readFlows();
  const centers = extractHotspotCenters(svg);

  const flowCounts = {};
  for (const flow of flowsData.flows ?? []) {
    for (const step of flow.steps ?? []) {
      flowCounts[step.hotspotId] = (flowCounts[step.hotspotId] ?? 0) + 1;
    }
  }

  const matches = [];
  for (const [id, entry] of Object.entries(manual)) {
    if (systemFilter && !entry.system.toLowerCase().includes(systemFilter)) {
      continue;
    }
    if (
      query &&
      !id.toLowerCase().includes(query) &&
      !entry.title.toLowerCase().includes(query) &&
      !entry.system.toLowerCase().includes(query) &&
      !entry.description.toLowerCase().includes(query)
    ) {
      continue;
    }
    const c = centers[id] ?? {};
    matches.push({
      id,
      title: entry.title,
      system: entry.system,
      cx: c.cx ?? null,
      cy: c.cy ?? null,
      width: c.width ?? null,
      height: c.height ?? null,
      flowStepCount: flowCounts[id] ?? 0,
    });
  }

  return {
    totalMatches: matches.length,
    returned: Math.min(limit, matches.length),
    results: matches.slice(0, limit),
  };
}

/**
 * Tool 3: find_hotspots_in_region
 */
export function findHotspotsInRegion(args, store) {
  const { x, y, radius = 2500 } = args ?? {};
  assertFiniteNumber(x, 'x', { min: 0, max: 30000 });
  assertFiniteNumber(y, 'y', { min: 0, max: 35000 });
  assertFiniteNumber(radius, 'radius', { min: 10, max: 30000 });

  const svg = store.readSvg();
  const manual = store.readManual();
  const centers = extractHotspotCenters(svg);

  const nearby = [];
  for (const [id, box] of Object.entries(centers)) {
    const dist = Math.round(Math.hypot(box.cx - x, box.cy - y));
    if (dist <= radius) {
      nearby.push({
        id,
        title: manual[id]?.title ?? '',
        distance: dist,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        cx: box.cx,
        cy: box.cy,
      });
    }
  }

  nearby.sort((a, b) => a.distance - b.distance);
  return {
    center: { x, y, radius },
    count: nearby.length,
    hotspots: nearby,
  };
}

/**
 * Tool 4: upsert_hotspot
 */
export function upsertHotspot(args, store) {
  const { id, x, y, width, height, rx, title, system, description, borderless } = args ?? {};
  assertSafeId(id, 'id');

  const svg = store.readSvg();
  const manual = store.readManual();
  const css = store.readCss();

  const existingSvg = parseHotspotSvgDetails(svg, id);
  const existingManual = manual[id] ?? null;
  const isNew = !existingSvg && !existingManual;

  if (existingSvg?.shape === 'path' && (x !== undefined || y !== undefined || width !== undefined || height !== undefined)) {
    throw new Error(`Hotspot "${id}" uses a <path> shape and cannot be resized with rectangular x/y/width/height.`);
  }

  const nextX = x !== undefined ? x : existingSvg?.x;
  const nextY = y !== undefined ? y : existingSvg?.y;
  const nextWidth = width !== undefined ? width : existingSvg?.width;
  const nextHeight = height !== undefined ? height : existingSvg?.height;
  const nextRx = rx !== undefined ? rx : (existingSvg?.rx ?? 30);

  assertFiniteNumber(nextX, 'x', { min: 0, max: 25000 });
  assertFiniteNumber(nextY, 'y', { min: 0, max: 35000 });
  assertFiniteNumber(nextWidth, 'width', { min: 10, max: 25000 });
  assertFiniteNumber(nextHeight, 'height', { min: 10, max: 25000 });
  assertFiniteNumber(nextRx, 'rx', { min: 0, max: 5000 });

  const nextTitle = title !== undefined ? title.trim() : existingManual?.title;
  const nextSystem = system !== undefined ? system.trim() : existingManual?.system;
  const nextDescription = description !== undefined ? description.trim() : existingManual?.description;

  assertSafeText(nextTitle, 'title');
  assertSafeText(nextSystem, 'system');
  assertSafeText(nextDescription, 'description');

  const groupXml = `  <g id="${id}" class="clickable"><title>${escapeXml(nextTitle)}</title><rect class="hotspot-rect" x="${Math.round(nextX)}" y="${Math.round(nextY)}" width="${Math.round(nextWidth)}" height="${Math.round(nextHeight)}" rx="${Math.round(nextRx)}" /></g>`;

  const markerIdx = svg.indexOf(HOTSPOT_MARKER);
  if (markerIdx === -1) {
    throw new Error(`Missing ${HOTSPOT_MARKER} in painel_svg.svg`);
  }

  let nextSvg;
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingGroupRegex = new RegExp(`^[ \\t]*<g\\s+id="${escapedId}"\\s+class="clickable">[\\s\\S]*?<\\/g>`, 'm');

  if (existingGroupRegex.test(svg)) {
    nextSvg = svg.replace(existingGroupRegex, groupXml);
  } else {
    nextSvg = svg.replace(/\n\s*<\/g>\s*<\/svg>\s*$/, `\n${groupXml}\n </g>\n</svg>`);
  }

  // Mandatory security check before writing SVG
  const problems = findActiveContent(nextSvg);
  if (problems.length > 0) {
    throw new Error(`Security validation failed for painel_svg.svg: ${problems.join('; ')}`);
  }

  const nextManual = {
    ...manual,
    [id]: {
      title: nextTitle,
      system: nextSystem,
      description: nextDescription,
    },
  };

  store.writeSvg(nextSvg);
  store.writeManual(nextManual);

  if (typeof borderless === 'boolean') {
    const nextCss = setHotspotBorderlessInCss(css, id, borderless);
    store.writeCss(nextCss);
  }

  return {
    status: isNew ? 'created' : 'updated',
    hotspot: inspectHotspot({ id }, store),
  };
}

/**
 * Tool 5: rename_hotspot
 */
export function renameHotspot(args, store) {
  const { oldId, newId } = args ?? {};
  assertSafeId(oldId, 'oldId');
  assertSafeId(newId, 'newId');

  if (oldId === newId) {
    throw new Error('oldId and newId must be different.');
  }

  const svg = store.readSvg();
  const manual = store.readManual();
  const flowsData = store.readFlows();
  const css = store.readCss();

  if (!(oldId in manual)) {
    throw new Error(`Hotspot "${oldId}" does not exist in src/data/manual.json.`);
  }
  if (newId in manual || hotspotIds(svg).includes(newId)) {
    throw new Error(`Target hotspot ID "${newId}" already exists.`);
  }

  const escapedOldId = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nextSvg = svg.replace(
    new RegExp(`(<g\\s+id=")${escapedOldId}("\\s+class="clickable">)`),
    `$1${newId}$2`,
  );

  const problems = findActiveContent(nextSvg);
  if (problems.length > 0) {
    throw new Error(`Security validation failed for painel_svg.svg: ${problems.join('; ')}`);
  }

  // Preserve key ordering in manual.json
  const nextManual = {};
  for (const [k, v] of Object.entries(manual)) {
    nextManual[k === oldId ? newId : k] = v;
  }

  // Update references in flows.json
  let updatedFlowSteps = 0;
  for (const flow of flowsData.flows ?? []) {
    for (const step of flow.steps ?? []) {
      if (step.hotspotId === oldId) {
        step.hotspotId = newId;
        updatedFlowSteps++;
      }
    }
  }

  // Update borderless selector in App.css if present
  const nextCss = css.replace(
    new RegExp(`#${escapedOldId}(:not\\(:hover\\)\\s+\\.hotspot-rect)`, 'g'),
    `#${newId}$1`,
  );

  store.writeSvg(nextSvg);
  store.writeManual(nextManual);
  store.writeFlows(flowsData);
  store.writeCss(nextCss);

  return {
    status: 'renamed',
    oldId,
    newId,
    updatedFlowSteps,
  };
}

/**
 * Tool 6: inspect_flow
 */
export function inspectFlow(args, store) {
  const { flowId = 'list', role = 'ALL' } = args ?? {};
  const flowsData = store.readFlows();
  const svg = store.readSvg();
  const centers = extractHotspotCenters(svg);

  if (flowId === 'list') {
    return {
      totalFlows: flowsData.flows.length,
      flows: flowsData.flows.map((f) => ({
        id: f.id,
        title: f.title,
        roles: f.roles,
        stepCount: f.steps.length,
      })),
    };
  }

  assertSafeId(flowId, 'flowId');
  const flow = flowsData.flows.find((f) => f.id === flowId);
  if (!flow) {
    throw new Error(`Flow "${flowId}" not found in src/data/flows.json.`);
  }

  const filteredSteps = (flow.steps ?? [])
    .filter((s) => role === 'ALL' || s.role === role)
    .map((s) => {
      const c = centers[s.hotspotId];
      const dx = s.dx ?? 0;
      const dy = s.dy ?? 0;
      return {
        ...s,
        targetX: c ? c.cx + dx : null,
        targetY: c ? c.cy + dy : null,
      };
    });

  return {
    id: flow.id,
    title: flow.title,
    roles: flow.roles,
    roleFilter: role,
    stepCount: filteredSteps.length,
    steps: filteredSteps,
  };
}

/**
 * Tool 7: update_flow_step
 */
export function updateFlowStep(args, store) {
  const { flowId, role, step, hotspotId, dx, dy, item, action, note } = args ?? {};
  assertSafeId(flowId, 'flowId');
  assertSafeId(role, 'role');
  assertFiniteNumber(step, 'step', { min: 1, max: 200 });

  const flowsData = store.readFlows();
  const manual = store.readManual();
  const svg = store.readSvg();
  const validHotspots = new Set(hotspotIds(svg));

  const flow = flowsData.flows.find((f) => f.id === flowId);
  if (!flow) {
    throw new Error(`Flow "${flowId}" not found.`);
  }

  const targetStep = flow.steps.find((s) => s.role === role && s.step === step);
  if (!targetStep) {
    throw new Error(`Step ${role} #${step} not found in flow "${flowId}".`);
  }

  if (hotspotId !== undefined) {
    assertSafeId(hotspotId, 'hotspotId');
    if (!(hotspotId in manual) || !validHotspots.has(hotspotId)) {
      throw new Error(`Hotspot "${hotspotId}" does not exist in manual.json and painel_svg.svg.`);
    }
    targetStep.hotspotId = hotspotId;
  }

  if (dx !== undefined) {
    if (dx === null || dx === 0) {
      delete targetStep.dx;
    } else {
      assertFiniteNumber(dx, 'dx', { min: -20000, max: 20000 });
      targetStep.dx = Math.round(dx);
    }
  }

  if (dy !== undefined) {
    if (dy === null || dy === 0) {
      delete targetStep.dy;
    } else {
      assertFiniteNumber(dy, 'dy', { min: -20000, max: 20000 });
      targetStep.dy = Math.round(dy);
    }
  }

  if (item !== undefined) {
    assertSafeText(item, 'item');
    targetStep.item = item.trim();
  }

  if (action !== undefined) {
    assertSafeText(action, 'action');
    targetStep.action = action.trim();
  }

  if (note !== undefined) {
    if (note === null || note === '') {
      delete targetStep.note;
    } else {
      assertSafeText(note, 'note');
      targetStep.note = note.trim();
    }
  }

  store.writeFlows(flowsData);
  return {
    status: 'updated',
    flowId,
    updatedStep: targetStep,
  };
}

/**
 * Tool 8: validate_project
 */
export function validateProject(_args, store) {
  const svg = store.readSvg();
  const manual = store.readManual();
  const flowsData = store.readFlows();

  const securityIssues = findActiveContent(svg);
  const svgIds = hotspotIds(svg);
  const manualKeys = Object.keys(manual);
  const centers = extractHotspotCenters(svg);

  const duplicateSvgIds = svgIds.filter((id, idx) => svgIds.indexOf(id) !== idx);
  const missingInManual = svgIds.filter((id) => !(id in manual));
  const missingInSvg = manualKeys.filter((k) => !svgIds.includes(k));

  const incompleteManualEntries = manualKeys.filter((k) =>
    ['title', 'system', 'description'].some(
      (f) => typeof manual[k]?.[f] !== 'string' || manual[k][f].trim() === '',
    ),
  );

  const invalidGeometryIds = svgIds.filter((id) => {
    const c = centers[id];
    return !c || !(c.width > 0 && c.height > 0);
  });

  const brokenFlowSteps = [];
  for (const flow of flowsData.flows ?? []) {
    for (const s of flow.steps ?? []) {
      if (!(s.hotspotId in manual) || !centers[s.hotspotId]) {
        brokenFlowSteps.push({
          flowId: flow.id,
          role: s.role,
          step: s.step,
          hotspotId: s.hotspotId,
        });
      }
    }
  }

  const valid =
    securityIssues.length === 0 &&
    duplicateSvgIds.length === 0 &&
    missingInManual.length === 0 &&
    missingInSvg.length === 0 &&
    incompleteManualEntries.length === 0 &&
    invalidGeometryIds.length === 0 &&
    brokenFlowSteps.length === 0;

  return {
    valid,
    totalHotspots: svgIds.length,
    totalFlows: (flowsData.flows ?? []).length,
    securityIssues,
    duplicateSvgIds,
    missingInManual,
    missingInSvg,
    incompleteManualEntries,
    invalidGeometryIds,
    brokenFlowSteps,
  };
}

export const MCP_TOOLS = [
  {
    name: 'inspect_hotspot',
    description:
      'Get complete details for a cockpit hotspot ID: SVG bounding box and center coordinates (x, y, width, height, cx, cy, rx), borderless CSS state, manual.json entry, and all flows.json steps referencing it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Hotspot ID (e.g. "apu-master", "mfd-left", "maintenance-logbook")',
        },
      },
      required: ['id'],
    },
    handler: inspectHotspot,
  },
  {
    name: 'search_hotspots',
    description:
      'Search cockpit hotspots by keyword (matches id, title, system, or description) and/or system filter without loading manual.json or painel_svg.svg into context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword to search (e.g. "hydraulic", "oxygen", "trim", "fire")',
        },
        system: {
          type: 'string',
          description: 'Optional system name substring filter',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 25, max 200)',
        },
      },
    },
    handler: searchHotspots,
  },
  {
    name: 'find_hotspots_in_region',
    description:
      'Find all hotspots within a given radius of (x, y) in SVG viewBox coordinates (400 8700 20600 20100), sorted by distance.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'SVG X coordinate' },
        y: { type: 'number', description: 'SVG Y coordinate' },
        radius: { type: 'number', description: 'Search radius in SVG units (default 2500)' },
      },
      required: ['x', 'y'],
    },
    handler: findHotspotsInRegion,
  },
  {
    name: 'upsert_hotspot',
    description:
      'Create or update a hotspot atomically across painel_svg.svg, src/data/manual.json, and src/App.css with automatic XML escaping and SVG security validation.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Hotspot ID (/^[a-zA-Z0-9_-]{1,80}$/)' },
        x: { type: 'number', description: 'SVG rect X coordinate' },
        y: { type: 'number', description: 'SVG rect Y coordinate' },
        width: { type: 'number', description: 'SVG rect width (> 0)' },
        height: { type: 'number', description: 'SVG rect height (> 0)' },
        rx: { type: 'number', description: 'SVG rect corner radius (default 30)' },
        title: { type: 'string', description: 'Control title for manual.json and SVG <title>' },
        system: { type: 'string', description: 'Aircraft system / panel category for manual.json' },
        description: { type: 'string', description: 'Operational description for manual.json' },
        borderless: {
          type: 'boolean',
          description: 'If true, keeps hotspot transparent/borderless at rest in src/App.css until hovered',
        },
      },
      required: ['id'],
    },
    handler: upsertHotspot,
  },
  {
    name: 'rename_hotspot',
    description:
      'Rename a hotspot ID atomically across painel_svg.svg, src/data/manual.json, src/data/flows.json, and src/App.css.',
    inputSchema: {
      type: 'object',
      properties: {
        oldId: { type: 'string', description: 'Existing hotspot ID' },
        newId: { type: 'string', description: 'New hotspot ID (/^[a-zA-Z0-9_-]{1,80}$/)' },
      },
      required: ['oldId', 'newId'],
    },
    handler: renameHotspot,
  },
  {
    name: 'inspect_flow',
    description:
      'List all 11 Embraer E195-E2 cockpit flows (flowId="list") or retrieve a specific flow with resolved SVG target coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        flowId: {
          type: 'string',
          description: 'Flow ID (e.g. "internal-safety-inspection", "power-up", "before-start-to-line") or "list"',
        },
        role: {
          type: 'string',
          enum: ['ALL', 'LSP', 'RSP', 'PF', 'PM'],
          description: 'Optional crew role filter (default "ALL")',
        },
      },
    },
    handler: inspectFlow,
  },
  {
    name: 'update_flow_step',
    description:
      'Update a step in src/data/flows.json (hotspotId, dx, dy, item, action, note) with validation that hotspotId exists in manual.json and painel_svg.svg.',
    inputSchema: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'Flow ID in src/data/flows.json' },
        role: { type: 'string', description: 'Crew role of the step (LSP, RSP, PF, PM)' },
        step: { type: 'number', description: '1-based step number within that role' },
        hotspotId: { type: 'string', description: 'Target hotspot ID' },
        dx: { type: ['number', 'null'], description: 'Optional horizontal offset (0 or null to remove)' },
        dy: { type: ['number', 'null'], description: 'Optional vertical offset (0 or null to remove)' },
        item: { type: 'string', description: 'Checklist item label' },
        action: { type: 'string', description: 'Checklist action text' },
        note: { type: ['string', 'null'], description: 'Optional procedural note (empty/null to remove)' },
      },
      required: ['flowId', 'role', 'step'],
    },
    handler: updateFlowStep,
  },
  {
    name: 'validate_project',
    description:
      'Validate SVG security (findActiveContent), 1:1 sync between painel_svg.svg and manual.json, hotspot geometry, and flows.json integrity.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: validateProject,
  },
];

/**
 * Handles a single JSON-RPC 2.0 message according to the Model Context Protocol specification.
 * Returns a JSON-RPC response object, or null for notifications.
 */
export function handleJsonRpcMessage(message, store = createDiskStore()) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: message?.id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
    };
  }

  // Notifications have no id and expect no response
  if (message.id === undefined) {
    return null;
  }

  const { id, method, params } = message;

  try {
    switch (method) {
      case 'initialize': {
        const requestedVersion = params?.protocolVersion;
        const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
          ? requestedVersion
          : SUPPORTED_PROTOCOL_VERSIONS[0];

        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion,
            capabilities: {
              tools: {},
            },
            serverInfo: SERVER_INFO,
          },
        };
      }

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({
              name,
              description,
              inputSchema,
            })),
          },
        };

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments ?? {};
        const tool = MCP_TOOLS.find((t) => t.name === toolName);
        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Unknown tool: "${toolName}"` },
          };
        }

        try {
          const output = tool.handler(toolArgs, store);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(output, null, 2),
                },
              ],
            },
          };
        } catch (toolError) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: toolError instanceof Error ? toolError.message : String(toolError),
                },
              ],
            },
          };
        }
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: "${method}"` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : 'Internal error',
      },
    };
  }
}
