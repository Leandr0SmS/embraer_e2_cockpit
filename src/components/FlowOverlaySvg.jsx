import { memo } from 'react';
import { resolveStepPoint } from '../utils/hotspotCenters';

export const BADGE_RADIUS = 175;

export const ROLE_COLORS = {
  LSP: { fill: '#2ecc71', stroke: '#145a32', text: '#071f10', marker: 'url(#flow-arrow-green)' },
  PF: { fill: '#2ecc71', stroke: '#145a32', text: '#071f10', marker: 'url(#flow-arrow-green)' },
  RSP: { fill: '#f1c40f', stroke: '#7d6608', text: '#1c1404', marker: 'url(#flow-arrow-yellow)' },
  PM: { fill: '#f1c40f', stroke: '#7d6608', text: '#1c1404', marker: 'url(#flow-arrow-yellow)' },
};

/**
 * Shortens a line segment (p1 -> p2) at both ends so the arrow starts and ends
 * cleanly on the outer rim of the circular badges instead of overlapping the numbers.
 */
export function shortenSegment(p1, p2, startPad = BADGE_RADIUS + 20, endPad = BADGE_RADIUS + 45) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 1) {
    return null;
  }

  const ux = dx / dist;
  const uy = dy / dist;

  // If two badges are very close (e.g. offset on the same switch), scale padding proportionally
  const totalPad = startPad + endPad;
  const scale = dist <= totalPad ? (dist * 0.6) / totalPad : 1;
  const sPad = startPad * scale;
  const ePad = endPad * scale;

  return {
    x1: Math.round(p1.x + ux * sPad),
    y1: Math.round(p1.y + uy * sPad),
    x2: Math.round(p2.x - ux * ePad),
    y2: Math.round(p2.y - uy * ePad),
  };
}

/**
 * Builds the list of resolved nodes and role-grouped arrow segments for the visible steps.
 */
export function buildFlowGeometry(steps, centersMap, activeStepIndex = -1) {
  const nodes = [];
  const lastNodeByRole = {};
  const arrows = [];

  steps.forEach((step, index) => {
    const pt = resolveStepPoint(step, centersMap);
    if (!pt) return;

    const palette = ROLE_COLORS[step.role] ?? ROLE_COLORS.RSP;
    const node = {
      index,
      step,
      x: pt.x,
      y: pt.y,
      palette,
      isActive: index === activeStepIndex,
    };
    nodes.push(node);

    const prevNode = lastNodeByRole[step.role];
    if (prevNode) {
      const seg = shortenSegment(prevNode, node);
      if (seg) {
        arrows.push({
          id: `${step.role}-${prevNode.step.step}-to-${step.step}-${index}`,
          role: step.role,
          fromIndex: prevNode.index,
          toIndex: index,
          ...seg,
          palette,
          isLatest: index === activeStepIndex,
        });
      }
    }
    lastNodeByRole[step.role] = node;
  });

  return { nodes, arrows };
}

const FlowOverlaySvg = memo(function FlowOverlaySvg({
  steps = [],
  centersMap = {},
  activeStepIndex = -1,
  onSelectStep,
}) {
  if (!steps.length) return null;

  const { nodes, arrows } = buildFlowGeometry(steps, centersMap, activeStepIndex);

  return (
    <svg
      className="flow-overlay-svg"
      viewBox="400 8700 20600 20100"
      preserveAspectRatio="xMidYMid"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="flow-arrow-green"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#2ecc71" stroke="#0b1e13" strokeWidth="0.8" />
        </marker>
        <marker
          id="flow-arrow-yellow"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f1c40f" stroke="#1c1404" strokeWidth="0.8" />
        </marker>
      </defs>

      {/* Directional Arrow Lines */}
      <g className="flow-arrows-layer">
        {arrows.map((arrow) => (
          <g key={arrow.id} className={arrow.isLatest ? 'flow-arrow-group latest' : 'flow-arrow-group'}>
            {/* Dark outline under the arrow line for high contrast over the cockpit drawing */}
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke="rgba(0, 0, 0, 0.85)"
              strokeWidth={arrow.isLatest ? 95 : 75}
              strokeLinecap="round"
            />
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke={arrow.palette.fill}
              strokeWidth={arrow.isLatest ? 55 : 42}
              strokeLinecap="round"
              markerEnd={arrow.palette.marker}
              className={arrow.isLatest ? 'flow-arrow-line latest' : 'flow-arrow-line'}
            />
          </g>
        ))}
      </g>

      {/* Numbered Step Badges */}
      <g className="flow-badges-layer">
        {nodes.map((node) => (
          <g
            key={`${node.step.role}-${node.step.step}-${node.index}`}
            className={node.isActive ? 'flow-badge active' : 'flow-badge'}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectStep) {
                onSelectStep(node.index, node.step);
              }
            }}
          >
            <title>
              {`${node.step.role} #${node.step.step}: ${node.step.item} — ${node.step.action}`}
            </title>

            {/* Pulsing outer ring on the active step */}
            {node.isActive && (
              <circle
                className="flow-badge-pulse"
                r={BADGE_RADIUS + 80}
                fill="none"
                stroke={node.palette.fill}
                strokeWidth="32"
              />
            )}

            {/* Contrast backdrop circle */}
            <circle r={BADGE_RADIUS + 22} fill="rgba(0, 0, 0, 0.85)" />

            {/* Main colored step circle */}
            <circle
              r={BADGE_RADIUS}
              fill={node.palette.fill}
              stroke={node.palette.stroke}
              strokeWidth="20"
            />

            {/* Step number */}
            <text
              x="0"
              y="62"
              textAnchor="middle"
              fill={node.palette.text}
              fontSize="185"
              fontWeight="800"
              fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            >
              {node.step.step}
            </text>

            {/* Optional Cold Airplane / First Flight asterisk indicator */}
            {node.step.asterisk && (
              <text
                x={-BADGE_RADIUS - 70}
                y="55"
                textAnchor="middle"
                fill={node.palette.fill}
                stroke="#000000"
                strokeWidth="12"
                paintOrder="stroke"
                fontSize="210"
                fontWeight="900"
              >
                ★
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
});

export default FlowOverlaySvg;

