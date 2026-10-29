// Data integrity & coordinate resolution tests for Cockpit Flows (src/data/flows.json, src/utils/hotspotCenters.js, src/components/FlowOverlaySvg.jsx)
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import flowsData from '../src/data/flows.json';
import manual from '../src/data/manual.json';
import { extractHotspotCenters, resolveStepPoint } from '../src/utils/hotspotCenters.js';
import { shortenSegment, buildFlowGeometry, BADGE_RADIUS } from '../src/components/FlowOverlaySvg.jsx';
import { filterFlowStepsByRole } from '../src/components/FlowTopBar.jsx';
import { getVisibleFlowSteps } from '../src/components/FlowBottomDock.jsx';

const svg = readFileSync(new URL('../painel_svg.svg', import.meta.url), 'utf8');
const centers = extractHotspotCenters(svg);
const { flows } = flowsData;

const EXPECTED_FLOW_TITLES = [
  'INTERNAL SAFETY INSPECTION',
  'Power up',
  'Before Start (to the line)',
  'Before Start (Below the line)',
  'After Start',
  'Before Takeoff',
  'After Takeoff',
  'FL100 - Climb',
  'FL100 - Descent',
  'After Landing',
  'Shutdown',
];

describe('flows.json & hotspotCenters.js', () => {
  it('extracts center coordinates for every hotspot in painel_svg.svg (including path hotspots)', () => {
    const manualKeys = Object.keys(manual);
    expect(Object.keys(centers).length).toBe(manualKeys.length);
    expect(centers['fire-eng1-handle']).toBeDefined();
    expect(centers['fire-eng2-handle']).toBeDefined();
    expect(centers['pfd-left'].cx).toBeGreaterThan(0);
  });

  it('contains all 11 flight phase flows in the exact expected order', () => {
    expect(flows.map((f) => f.title)).toEqual(EXPECTED_FLOW_TITLES);
  });

  it('every flow has a unique id, valid roles array, and non-empty steps', () => {
    const ids = flows.map((f) => f.id);
    expect(new Set(ids).size).toBe(flows.length);

    for (const flow of flows) {
      expect(Array.isArray(flow.roles)).toBe(true);
      expect(flow.roles.length).toBeGreaterThan(0);
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
    }
  });

  it('every flow step has valid role, positive step number, item, action, and valid hotspotId in manual.json', () => {
    for (const flow of flows) {
      for (const step of flow.steps) {
        expect(flow.roles).toContain(step.role);
        expect(typeof step.step).toBe('number');
        expect(step.step).toBeGreaterThan(0);
        expect(typeof step.item).toBe('string');
        expect(step.item.trim().length).toBeGreaterThan(0);
        expect(typeof step.action).toBe('string');
        expect(step.action.trim().length).toBeGreaterThan(0);
        expect(step.hotspotId in manual, `${flow.id} step ${step.step} missing hotspotId "${step.hotspotId}"`).toBe(
          true,
        );
      }
    }
  });

  it('resolves valid SVG coordinates within the cockpit viewBox for every step of all 11 flows', () => {
    for (const flow of flows) {
      for (const step of flow.steps) {
        const pt = resolveStepPoint(step, centers);
        expect(pt, `${flow.id} (${step.role} #${step.step}) failed to resolve point`).not.toBeNull();
        expect(pt.x).toBeGreaterThanOrEqual(400);
        expect(pt.x).toBeLessThanOrEqual(21000);
        expect(pt.y).toBeGreaterThanOrEqual(8700);
        expect(pt.y).toBeLessThanOrEqual(28800);
      }
    }
  });
});

describe('FlowOverlaySvg geometry helpers', () => {
  it('shortens arrow segments so start and end points sit outside BADGE_RADIUS', () => {
    const p1 = { x: 1000, y: 1000 };
    const p2 = { x: 2000, y: 1000 };
    const seg = shortenSegment(p1, p2);
    expect(seg).not.toBeNull();
    expect(seg.x1).toBeGreaterThan(p1.x + BADGE_RADIUS);
    expect(seg.x2).toBeLessThan(p2.x - BADGE_RADIUS);
    expect(seg.y1).toBe(1000);
    expect(seg.y2).toBe(1000);
  });

  it('returns null when two points are identical', () => {
    expect(shortenSegment({ x: 500, y: 500 }, { x: 500, y: 500 })).toBeNull();
  });

  it('builds role-grouped arrow sequences and marks the active step & latest arrow', () => {
    const powerUpFlow = flows.find((f) => f.id === 'power-up');
    const { nodes, arrows } = buildFlowGeometry(powerUpFlow.steps, centers, 3);

    expect(nodes).toHaveLength(powerUpFlow.steps.length);
    // 2 LSP steps (1 arrow) + 17 RSP steps (16 arrows) = 17 arrows total
    expect(arrows).toHaveLength(17);

    // Active step index 3 should be marked active and its incoming arrow marked isLatest
    expect(nodes[3].isActive).toBe(true);
    const latestArrows = arrows.filter((a) => a.isLatest);
    expect(latestArrows).toHaveLength(1);
    expect(latestArrows[0].toIndex).toBe(3);
  });
});

describe('FlowTopBar role filtering', () => {
  it('returns all steps when roleFilter is ALL or not in flow.roles', () => {
    const powerUp = flows.find((f) => f.id === 'power-up');
    expect(filterFlowStepsByRole(powerUp, 'ALL')).toHaveLength(19);
    expect(filterFlowStepsByRole(powerUp, 'PM')).toHaveLength(19);
  });

  it('filters steps accurately by LSP or RSP role', () => {
    const powerUp = flows.find((f) => f.id === 'power-up');
    const lspSteps = filterFlowStepsByRole(powerUp, 'LSP');
    const rspSteps = filterFlowStepsByRole(powerUp, 'RSP');
    expect(lspSteps).toHaveLength(2);
    expect(lspSteps.every((s) => s.role === 'LSP')).toBe(true);
    expect(rspSteps).toHaveLength(17);
    expect(rspSteps.every((s) => s.role === 'RSP')).toBe(true);
  });
});

describe('FlowBottomDock progressive step visibility', () => {
  const shutdownSteps = flows.find((f) => f.id === 'shutdown').steps;

  it('progressively reveals steps 0..activeStepIndex in step mode', () => {
    expect(getVisibleFlowSteps(shutdownSteps, 'step', 0)).toHaveLength(1);
    expect(getVisibleFlowSteps(shutdownSteps, 'step', 2)).toHaveLength(3);
    expect(getVisibleFlowSteps(shutdownSteps, 'step', 99)).toHaveLength(shutdownSteps.length);
  });

  it('reveals all steps immediately in full mode', () => {
    expect(getVisibleFlowSteps(shutdownSteps, 'full', 0)).toHaveLength(shutdownSteps.length);
  });
});
