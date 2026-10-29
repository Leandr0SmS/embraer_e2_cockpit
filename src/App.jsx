import { useState, memo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Modal from './components/Modal';
import manualData from './data/manual.json';
import pkg from '../package.json';
import painelSvgRaw from '../painel_svg.svg?raw';
import './App.css';

// Memoized so opening/closing the modal does not re-parse the inline SVG
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

  return (
    <div className="app-container">
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
          <InlineCockpitSvg onSvgClick={handleSvgClick} />
        </TransformComponent>
      </TransformWrapper>

      {/* System Details Modal */}
      {activeSystem && <Modal data={activeSystem} onClose={closeModal} />}

      {/* App Footer */}
      <footer className="app-footer">
        <span>
          Developed by{' '}
          <a
            href="https://github.com/Leandr0SmS"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leandro Simões
          </a>
        </span>
        <span className="footer-divider">•</span>
        <span className="footer-version">Release v{pkg.version}</span>
      </footer>
    </div>
  );
}
