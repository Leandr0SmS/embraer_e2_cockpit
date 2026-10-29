import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Modal from './components/Modal';
import FlowTopBar, { filterFlowStepsByRole } from './components/FlowTopBar';
import FlowOverlaySvg from './components/FlowOverlaySvg';
import FlowBottomDock, { getVisibleFlowSteps } from './components/FlowBottomDock';
import { extractHotspotCenters } from './utils/hotspotCenters';
import manualData from './data/manual.json';
import flowsData from './data/flows.json';
import pkg from '../package.json';
import painelSvgRaw from '../painel_svg.svg?raw';
import './App.css';

// Memoized so opening/closing the modal or stepping through flows does not re-parse the inline SVG
const InlineCockpitSvg = memo(function InlineCockpitSvg({ onSvgClick }) {
  // Sync title dynamically on hover so tooltip always strictly matches manual.json
  const handleSvgMouseOver = (e) => {
    const target = e.target.closest('.clickable');
    if (target && target.id) {
      const systemData = manualData[target.id];
      if (systemData && systemData.title) {
        let titleEl = target.querySelector('title');
        if (!titleEl) {
          titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          target.insertBefore(titleEl, target.firstChild);
        }
        if (titleEl.textContent !== systemData.title) {
          titleEl.textContent = systemData.title;
        }
      }
    }
  };

  return (
    <div
      className="svg-wrapper"
      onClick={onSvgClick}
      onMouseOver={handleSvgMouseOver}
      dangerouslySetInnerHTML={{ __html: painelSvgRaw }}
    />
  );
});

export default function App() {
  const [activeSystem, setActiveSystem] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Cockpit Flows state
  const [activeFlowId, setActiveFlowId] = useState(null);
  const [flowRole, setFlowRole] = useState('ALL');
  const [flowMode, setFlowMode] = useState('step'); // 'step' | 'full'
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Parse hotspot center coordinates from painel_svg.svg once
  const hotspotCenters = useMemo(() => extractHotspotCenters(painelSvgRaw), []);

  const activeFlow = useMemo(
    () => flowsData.flows.find((f) => f.id === activeFlowId) ?? null,
    [activeFlowId]
  );

  const filteredSteps = useMemo(
    () => filterFlowStepsByRole(activeFlow, flowRole),
    [activeFlow, flowRole]
  );

  const visibleSteps = useMemo(
    () => getVisibleFlowSteps(filteredSteps, flowMode, activeStepIndex),
    [filteredSteps, flowMode, activeStepIndex]
  );

  const handleSelectFlow = useCallback((flowId) => {
    setActiveFlowId(flowId);
    setFlowRole('ALL');
    setActiveStepIndex(0);
  }, []);

  const handleChangeRole = useCallback((role) => {
    setFlowRole(role);
    setActiveStepIndex(0);
  }, []);

  const handleChangeMode = useCallback((mode) => {
    setFlowMode(mode);
  }, []);

  const handleNextStep = useCallback(() => {
    setActiveStepIndex((prev) =>
      filteredSteps.length > 0 ? Math.min(prev + 1, filteredSteps.length - 1) : 0
    );
  }, [filteredSteps.length]);

  const handlePrevStep = useCallback(() => {
    setActiveStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleRestartFlow = useCallback(() => {
    setActiveStepIndex(0);
  }, []);

  const handleSelectStep = useCallback(
    (index) => {
      if (flowMode === 'step' && index === activeStepIndex && index < filteredSteps.length - 1) {
        // Clicking the pulsing active badge in Step-by-Step mode advances to the next arrow
        setActiveStepIndex(index + 1);
      } else {
        setActiveStepIndex(index);
      }
    },
    [flowMode, activeStepIndex, filteredSteps.length]
  );

  const handleInspectHotspot = useCallback((hotspotId) => {
    const systemData = manualData[hotspotId];
    if (systemData) {
      setActiveSystem(systemData);
    }
  }, []);

  // Keyboard navigation (Right/Left arrows) when a Cockpit Flow is active
  useEffect(() => {
    if (!activeFlow || activeSystem || showDisclaimer) return undefined;

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (flowMode === 'step') {
          handleNextStep();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (flowMode === 'step') {
          handlePrevStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFlow, activeSystem, showDisclaimer, flowMode, handleNextStep, handlePrevStep]);

  // Event delegation: listens to clicks on any element with class="clickable" inside the SVG
  const handleSvgClick = (e) => {
    const clickedTarget = e.target.closest('.clickable');

    if (clickedTarget) {
      const elementId = clickedTarget.id;
      const systemData = manualData[elementId];

      if (systemData) {
        setActiveSystem(systemData);
      } else {
        console.warn(`No manual data found for ID: ${elementId}`);
      }
    }
  };

  const closeModal = () => {
    setActiveSystem(null);
  };

  const closeDisclaimer = () => {
    setShowDisclaimer(false);
  };

  return (
    <div className={activeFlow ? 'app-container flow-active' : 'app-container'}>
      {/* Upper Cockpit Flows Menu */}
      <FlowTopBar
        flows={flowsData.flows}
        activeFlowId={activeFlowId}
        onSelectFlow={handleSelectFlow}
        flowRole={flowRole}
        onChangeRole={handleChangeRole}
        flowMode={flowMode}
        onChangeMode={handleChangeMode}
      />

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={12}
        centerOnInit={true}
        wheel={{ step: 0.15 }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100vw', height: '100vh' }}
          contentStyle={{ width: '100vw', height: '100vh' }}
        >
          <div className="cockpit-stage">
            <InlineCockpitSvg onSvgClick={handleSvgClick} />
            {activeFlow && (
              <FlowOverlaySvg
                steps={visibleSteps}
                centersMap={hotspotCenters}
                activeStepIndex={activeStepIndex}
                onSelectStep={handleSelectStep}
              />
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Progressive Bottom Checklist Dock for Active Cockpit Flow */}
      {activeFlow && (
        <FlowBottomDock
          flow={activeFlow}
          steps={filteredSteps}
          activeStepIndex={activeStepIndex}
          flowMode={flowMode}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
          onRestart={handleRestartFlow}
          onChangeMode={handleChangeMode}
          onSelectStep={(idx) => setActiveStepIndex(idx)}
          onInspectHotspot={handleInspectHotspot}
        />
      )}

      {/* Initial Welcome & Disclaimer Modal */}
      {showDisclaimer && (
        <div className="modal-overlay" onClick={closeDisclaimer}>
          <div
            className="modal-content welcome-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="modal-badge">Interactive Study Aid</span>
                <h2>Embraer E2 Cockpit Panel</h2>
              </div>
              <button
                type="button"
                className="modal-close-icon"
                onClick={closeDisclaimer}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p className="welcome-intro">
                Welcome to the interactive <strong>Embraer E-Jets E2</strong>{' '}
                cockpit study guide. Explore the Overhead Panel, Glareshield,
                Main Instrument Panel, and Control Pedestal:
              </p>

              <ul className="welcome-list">
                <li>
                  <strong>Pan &amp; Zoom:</strong> Scroll or pinch to zoom in on
                  any panel, and drag to move around the flight deck.
                </li>
                <li>
                  <strong>Inspect Controls:</strong> Click any highlighted
                  switch, button, knob, lever, or display to read its system
                  overview and function.
                </li>
                <li>
                  <strong>Cockpit Flows:</strong> Use the top <em>Flows</em> menu
                  to step through all 11 standard procedures with animated
                  scan-flow arrows and a progressive checklist dock.
                </li>
              </ul>

              <div className="disclaimer-box">
                <div className="disclaimer-title">
                  ⚠️ Disclaimer — For Informational Use Only
                </div>
                <p>
                  This application is an independent educational reference tool
                  and is <strong>not</strong> an official publication. System
                  descriptions may be simplified and can vary by aircraft
                  configuration, serial number, or avionics load.
                </p>
                <p>
                  <strong>
                    Do not use for real-world flight operations. Always consult
                    the official, current approved Airplane Flight Manual (AFM),
                    Aircraft Operating Manual (AOM), QRH, and your operator&apos;s
                    manuals for actual airplane operation.
                  </strong>
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="accept-btn"
                onClick={closeDisclaimer}
              >
                I Understand — Enter Cockpit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Details Modal */}
      {activeSystem && <Modal data={activeSystem} onClose={closeModal} />}

      {/* App Footer */}
      <footer className="app-footer">
        <span>
          Developed by{' '}
          <a
            href="https://leandrosms.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leandro Simões
          </a>
        </span>
        <span className="footer-divider">•</span>
        <span className="footer-version">Release v{pkg.version}</span>
        <span className="footer-divider">•</span>
        <button
          type="button"
          className="footer-info-btn"
          onClick={() => setShowDisclaimer(true)}
        >
          Disclaimer
        </button>
      </footer>
    </div>
  );
}
