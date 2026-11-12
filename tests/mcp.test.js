// Unit, protocol, and security tests for the e2_panel development MCP server (scripts/mcp-tools.mjs)
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  createDiskStore,
  createMemoryStore,
  handleJsonRpcMessage,
  inspectHotspot,
  searchHotspots,
  findHotspotsInRegion,
  upsertHotspot,
  renameHotspot,
  inspectFlow,
  updateFlowStep,
  validateProject,
} from '../scripts/mcp-tools.mjs';

const realSvg = readFileSync(new URL('../painel_svg.svg', import.meta.url), 'utf8');
const realManual = JSON.parse(readFileSync(new URL('../src/data/manual.json', import.meta.url), 'utf8'));
const realFlows = JSON.parse(readFileSync(new URL('../src/data/flows.json', import.meta.url), 'utf8'));
const realCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');

function makeSandboxStore() {
  return createMemoryStore({
    svg: realSvg,
    manual: realManual,
    flows: realFlows,
    css: realCss,
  });
}

describe('MCP JSON-RPC 2.0 protocol handling', () => {
  it('responds to initialize with capabilities and serverInfo', () => {
    const res = handleJsonRpcMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26' },
    });
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(1);
    expect(res.result.protocolVersion).toBe('2025-03-26');
    expect(res.result.serverInfo.name).toBe('e2-panel-dev-mcp');
    expect(res.result.capabilities).toHaveProperty('tools');
  });

  it('returns null for JSON-RPC notifications (no id)', () => {
    const res = handleJsonRpcMessage({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    expect(res).toBeNull();
  });

  it('lists all 8 development tools in tools/list', () => {
    const res = handleJsonRpcMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    const names = res.result.tools.map((t) => t.name);
    expect(names).toEqual([
      'inspect_hotspot',
      'search_hotspots',
      'find_hotspots_in_region',
      'upsert_hotspot',
      'rename_hotspot',
      'inspect_flow',
      'update_flow_step',
      'validate_project',
    ]);
  });

  it('executes tools/call and returns structured JSON content', () => {
    const res = handleJsonRpcMessage(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'inspect_hotspot',
          arguments: { id: 'maintenance-logbook' },
        },
      },
      createDiskStore(),
    );
    expect(res.result.isError).toBeUndefined();
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.id).toBe('maintenance-logbook');
    expect(payload.borderless).toBe(true);
    expect(payload.geometry.cx).toBeGreaterThan(0);
    expect(payload.flowReferences.length).toBeGreaterThanOrEqual(2);
  });
});

describe('MCP read & validation tools against live repository data', () => {
  const diskStore = createDiskStore();

  it('validate_project reports valid=true and 0 security/sync issues on the repo', () => {
    const report = validateProject({}, diskStore);
    expect(report.valid).toBe(true);
    expect(report.securityIssues).toEqual([]);
    expect(report.missingInManual).toEqual([]);
    expect(report.missingInSvg).toEqual([]);
    expect(report.brokenFlowSteps).toEqual([]);
    expect(report.totalFlows).toBe(11);
  });

  it('search_hotspots filters by keyword and system', () => {
    const res = searchHotspots({ query: 'circuit breakers' }, diskStore);
    expect(res.totalMatches).toBeGreaterThanOrEqual(2);
    const ids = res.results.map((r) => r.id);
    expect(ids).toContain('cb_panel_capt');
    expect(ids).toContain('cb_panel_fo');
  });

  it('find_hotspots_in_region locates nearby controls sorted by distance', () => {
    const res = findHotspotsInRegion({ x: 1800, y: 23500, radius: 2000 }, diskStore);
    expect(res.count).toBeGreaterThanOrEqual(2);
    const ids = res.hotspots.map((h) => h.id);
    expect(ids).toContain('oxygen_mask_capt');
    expect(ids).toContain('cb_panel_capt');
  });

  it('inspect_flow lists all 11 flows and resolves step coordinates for a specific flow', () => {
    const list = inspectFlow({ flowId: 'list' }, diskStore);
    expect(list.totalFlows).toBe(11);

    const safety = inspectFlow({ flowId: 'internal-safety-inspection', role: 'LSP' }, diskStore);
    expect(safety.stepCount).toBe(1);
    expect(safety.steps[0].hotspotId).toBe('maintenance-logbook');
    expect(safety.steps[0].targetX).toBeTypeOf('number');
    expect(safety.steps[0].targetY).toBeTypeOf('number');
  });
});

describe('MCP authoring tools & security guards (in-memory sandbox)', () => {
  it('upsert_hotspot creates a new borderless hotspot and passes validate_project', () => {
    const store = makeSandboxStore();
    const res = upsertHotspot(
      {
        id: 'jump_seat_oxy',
        x: 4200,
        y: 9100,
        width: 500,
        height: 400,
        rx: 30,
        title: 'Observer Jump Seat Oxygen & Audio Panel',
        system: 'Oxygen System / Crew Oxygen',
        description: 'Third-occupant oxygen mask regulator & audio selector.',
        borderless: true,
      },
      store,
    );

    expect(res.status).toBe('created');
    expect(res.hotspot.geometry.cx).toBe(4450);
    expect(res.hotspot.geometry.cy).toBe(9300);
    expect(res.hotspot.borderless).toBe(true);
    // Ensure & in title was XML-escaped in painel_svg.svg
    expect(store.readSvg()).toContain('<title>Observer Jump Seat Oxygen &amp; Audio Panel</title>');
    expect(validateProject({}, store).valid).toBe(true);
  });

  it('rename_hotspot updates painel_svg.svg, manual.json, flows.json, and App.css atomically', () => {
    const store = makeSandboxStore();
    const res = renameHotspot(
      {
        oldId: 'cb_panel_fo',
        newId: 'circuit_breaker_fo',
      },
      store,
    );

    expect(res.status).toBe('renamed');
    expect(res.updatedFlowSteps).toBeGreaterThanOrEqual(1);
    expect(validateProject({}, store).valid).toBe(true);

    const inspected = inspectHotspot({ id: 'circuit_breaker_fo' }, store);
    expect(inspected.borderless).toBe(true);
    expect(inspected.flowReferences.length).toBeGreaterThanOrEqual(1);
  });

  it('update_flow_step updates a step and rejects non-existent hotspotIds', () => {
    const store = makeSandboxStore();
    const updated = updateFlowStep(
      {
        flowId: 'internal-safety-inspection',
        role: 'RSP',
        step: 16,
        hotspotId: 'cb_panel_capt',
        dx: 0,
        dy: 0,
      },
      store,
    );
    expect(updated.updatedStep.hotspotId).toBe('cb_panel_capt');

    expect(() =>
      updateFlowStep(
        {
          flowId: 'internal-safety-inspection',
          role: 'RSP',
          step: 16,
          hotspotId: 'non_existent_hotspot',
        },
        store,
      ),
    ).toThrow(/does not exist/);
  });

  it('rejects unsafe hotspot IDs (quotes, spaces, CSS/XML injection characters)', () => {
    const store = makeSandboxStore();
    for (const badId of ['bad id', 'bad"id', 'bad<id>', '../traversal', 'id{fill:red}', '']) {
      expect(() =>
        upsertHotspot(
          {
            id: badId,
            x: 1000,
            y: 1000,
            width: 200,
            height: 200,
            title: 'Test',
            system: 'Test',
            description: 'Test',
          },
          store,
        ),
      ).toThrow(/Invalid id/);
    }
  });

  it('rejects active/unsafe markup or script patterns in title, system, description, or flow text', () => {
    const store = makeSandboxStore();
    const payloads = [
      '<script>alert(1)</script>',
      ' Normal text <iframe src="https://evil.example">',
      'Click me onerror=alert(1)',
      'javascript:alert(1)',
    ];

    for (const payload of payloads) {
      expect(() =>
        upsertHotspot(
          {
            id: 'safe_id',
            x: 1000,
            y: 1000,
            width: 200,
            height: 200,
            title: payload,
            system: 'System',
            description: 'Desc',
          },
          store,
        ),
      ).toThrow(/Security rejection/);
    }
  });
});
