// Data integrity & coordinate resolution tests for Cockpit Flows (src/data/flows.json & src/utils/hotspotCenters.js)
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import flowsData from '../src/data/flows.json';
import manual from '../src/data/manual.json';
import { extractHotspotCenters, resolveStepPoint } from '../src/utils/hotspotCenters.js';

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

