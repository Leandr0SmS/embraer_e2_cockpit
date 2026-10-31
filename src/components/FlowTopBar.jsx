// Upper floating menu bar for selecting any of the 11 Embraer E2 Cockpit Flows,
// filtering by crew role (LSP/PF vs RSP/PM), and switching between Step-by-Step and Full Flow modes.

/**
 * Filters a flow's steps by the selected crew role ('ALL' or a specific role like 'LSP', 'RSP', 'PF', 'PM').
 */
export function filterFlowStepsByRole(flow, roleFilter = 'ALL') {
  if (!flow || !Array.isArray(flow.steps)) return [];
  if (!roleFilter || roleFilter === 'ALL' || !flow.roles.includes(roleFilter)) {
    return flow.steps;
  }
  return flow.steps.filter((s) => s.role === roleFilter);
}

export default function FlowTopBar({
  flows = [],
  activeFlowId = null,
  onSelectFlow,
  flowRole = 'ALL',
  onChangeRole,
  flowMode = 'step',
  onChangeMode,
  followStep = true,
  onToggleFollowStep,
}) {
  const activeFlow = flows.find((f) => f.id === activeFlowId) ?? null;

  return (
    <header className="flow-top-bar" aria-label="Cockpit Flows Menu">
      <div className="flow-selector-group">
        <label htmlFor="cockpit-flow-select" className="flow-selector-label">
          Flows
        </label>
        <select
          id="cockpit-flow-select"
          className="flow-select"
          value={activeFlowId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onSelectFlow(val ? val : null);
          }}
        >
          <option value="">Select Cockpit Flow</option>
          {flows.map((flow, idx) => (
            <option key={flow.id} value={flow.id}>
              {idx + 1}. {flow.title}
            </option>
          ))}
        </select>
      </div>

      {activeFlow && (
        <>
          {/* Crew Role Filter (LSP/PF in Green, RSP/PM in Yellow) */}
          <div className="flow-role-group" role="group" aria-label="Crew Role Filter">
            {activeFlow.roles.length > 1 && (
              <button
                type="button"
                className={flowRole === 'ALL' ? 'flow-pill active' : 'flow-pill'}
                onClick={() => onChangeRole('ALL')}
              >
                All
              </button>
            )}
            {activeFlow.roles.map((role) => {
              const isGreen = role === 'LSP' || role === 'PF';
              const isSelected =
                activeFlow.roles.length === 1 || flowRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  className={`flow-pill ${isGreen ? 'role-green' : 'role-yellow'} ${
                    isSelected ? 'active' : ''
                  }`}
                  onClick={() => onChangeRole(role)}
                >
                  <span className="role-dot" />
                  {role} Actions
                </button>
              );
            })}
          </div>

          {/* Viewing Mode Switcher */}
          <div className="flow-mode-group" role="group" aria-label="Flow Display Mode">
            <button
              type="button"
              className={flowMode === 'step' ? 'flow-pill mode-pill active' : 'flow-pill mode-pill'}
              onClick={() => onChangeMode('step')}
              title="Click step-by-step to follow each arrow and build the action list"
            >
              Step-by-Step
            </button>
            <button
              type="button"
              className={flowMode === 'full' ? 'flow-pill mode-pill active' : 'flow-pill mode-pill'}
              onClick={() => onChangeMode('full')}
              title="Show the entire flow and full action list at once"
            >
              Entire Flow
            </button>
          </div>

          {/* Auto-Center / Follow Active Step Toggle */}
          {onToggleFollowStep && (
            <button
              type="button"
              className={followStep ? 'flow-pill follow-pill active' : 'flow-pill follow-pill'}
              onClick={onToggleFollowStep}
              aria-pressed={followStep}
              title={
                followStep
                  ? 'Follow Step is ON — Camera automatically centers the active step'
                  : 'Follow Step is OFF — Camera stays where you place it'
              }
            >
              ⌖ Follow: {followStep ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Exit Flow Mode */}
          <button
            type="button"
            className="flow-exit-btn"
            onClick={() => onSelectFlow(null)}
            aria-label="Exit Flow Mode"
            title="Exit Flow Mode"
          >
            &times; Exit
          </button>
        </>
      )}
    </header>
  );
}

