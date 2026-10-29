import { useState, useEffect, useRef } from 'react';

/**
 * Returns the subset of steps visible on the SVG and in the bottom dock list
 * based on the current mode ('step' vs 'full') and activeStepIndex.
 */
export function getVisibleFlowSteps(steps = [], flowMode = 'step', activeStepIndex = 0) {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  if (flowMode === 'full') return steps;
  const clampedIdx = Math.max(0, Math.min(activeStepIndex, steps.length - 1));
  return steps.slice(0, clampedIdx + 1);
}

export default function FlowBottomDock({
  flow,
  steps = [],
  activeStepIndex = 0,
  flowMode = 'step',
  onPrev,
  onNext,
  onRestart,
  onChangeMode,
  onSelectStep,
  onInspectHotspot,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(false);
  const activeRowRef = useRef(null);

  const visibleSteps = getVisibleFlowSteps(steps, flowMode, activeStepIndex);
  const totalSteps = steps.length;
  const isAtStart = activeStepIndex <= 0;
  const isAtEnd = activeStepIndex >= totalSteps - 1;

  // Auto-scroll the bottom list to keep the newly added / active step in view
  useEffect(() => {
    if (!collapsed && activeRowRef.current && typeof activeRowRef.current.scrollIntoView === 'function') {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeStepIndex, flowMode, collapsed]);

  if (!flow || totalSteps === 0) return null;

  return (
    <section
      className={`flow-bottom-dock ${collapsed ? 'collapsed' : ''} ${
        expandedHeight ? 'expanded-height' : ''
      }`}
      aria-label="Cockpit Flow Actions List"
    >
      {/* Dock Header with Flow Progress & Step Controls */}
      <div className="flow-dock-header">
        <div className="flow-dock-title-group">
          <span className="flow-dock-phase">{flow.title}</span>
          <span className="flow-dock-counter">
            {flowMode === 'step'
              ? `Step ${Math.min(activeStepIndex + 1, totalSteps)} of ${totalSteps}`
              : `All ${totalSteps} Actions`}
          </span>
        </div>

        <div className="flow-dock-controls">
          {flowMode === 'step' && (
            <>
              <button
                type="button"
                className="flow-ctrl-btn"
                onClick={onPrev}
                disabled={isAtStart}
                title="Previous Step (Left Arrow)"
              >
                &#9664; Prev
              </button>
              <button
                type="button"
                className="flow-ctrl-btn primary-next"
                onClick={onNext}
                disabled={isAtEnd}
                title="Next Step — Draw next arrow and add action to list (Right Arrow / Space)"
              >
                {isAtEnd ? '✓ Flow Complete' : 'Next Arrow \u25B6'}
              </button>
              <button
                type="button"
                className="flow-ctrl-btn"
                onClick={onRestart}
                disabled={isAtStart}
                title="Restart Flow from Step 1"
              >
                &#8634;
              </button>
            </>
          )}

          <button
            type="button"
            className="flow-ctrl-btn"
            onClick={() => onChangeMode(flowMode === 'step' ? 'full' : 'step')}
          >
            {flowMode === 'step' ? 'Show All' : 'Step-by-Step'}
          </button>

          {!collapsed && (
            <button
              type="button"
              className="flow-ctrl-btn icon-only"
              onClick={() => setExpandedHeight((prev) => !prev)}
              title={expandedHeight ? 'Restore compact list height' : 'Expand list height'}
              aria-label={expandedHeight ? 'Restore compact list height' : 'Expand list height'}
            >
              {expandedHeight ? '⤡' : '⤢'}
            </button>
          )}

          <button
            type="button"
            className="flow-ctrl-btn icon-only"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand action list' : 'Minimize action list'}
            aria-label={collapsed ? 'Expand action list' : 'Minimize action list'}
          >
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Progressive Checklist Body */}
      {!collapsed && (
        <div className="flow-dock-body">
          <ol className="flow-dock-list">
            {visibleSteps.map((step, index) => {
              const isGreen = step.role === 'LSP' || step.role === 'PF';
              const isActive = index === activeStepIndex;
              const prevStep = index > 0 ? visibleSteps[index - 1] : null;
              const showSectionDivider =
                step.section && (!prevStep || prevStep.section !== step.section);

              return (
                <li key={`${step.role}-${step.step}-${index}`} className="flow-dock-item-wrapper">
                  {showSectionDivider && (
                    <div className="flow-section-divider">{step.section}</div>
                  )}

                  <div
                    ref={isActive ? activeRowRef : null}
                    className={`flow-dock-row ${isGreen ? 'role-green' : 'role-yellow'} ${
                      isActive ? 'active' : ''
                    }`}
                    onClick={() => {
                      if (onSelectStep) onSelectStep(index, step);
                    }}
                  >
                    <span className="flow-row-badge-group">
                      {step.asterisk && (
                        <span className="flow-row-asterisk" title="Cold Airplane / First Flight of Day">
                          ★
                        </span>
                      )}
                      <span className={`flow-row-circle ${isGreen ? 'green' : 'yellow'}`}>
                        {step.step}
                      </span>
                      <span className="flow-row-role-tag">{step.role}</span>
                    </span>

                    <span className="flow-row-item">{step.item}</span>
                    <span className="flow-row-dots" aria-hidden="true" />
                    <span className="flow-row-action">{step.action}</span>

                    {step.hotspotId && onInspectHotspot && (
                      <button
                        type="button"
                        className="flow-row-info-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectHotspot(step.hotspotId);
                        }}
                        title={`View system manual for ${step.item}`}
                        aria-label={`View system manual for ${step.item}`}
                      >
                        ℹ️
                      </button>
                    )}

                    {step.note && <div className="flow-row-note">{step.note}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

